import { createServer as createHttpServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { searchDrivers, searchPassiveRadiators } from "./src/core/driverScraper.js";
import { searchFrequencyResponses } from "./src/core/frequencyResponseScraper.js";

const root = process.cwd();
const port = Number(process.env.PORT ?? 4173);
const host = process.env.HOST ?? "0.0.0.0";
const production = process.env.NODE_ENV === "production";
const staticRoot = production ? join(root, "dist") : root;
const vite = production ? null : await createViteMiddleware();

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

createHttpServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

    if (await handleApiRequest(url, res)) return;

    if (vite) {
      vite.middlewares(req, res, () => {
        if (!res.writableEnded) {
          res.writeHead(404);
          res.end("Not found");
        }
      });
      return;
    }

    await serveStaticFile(url, res);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}).listen(port, host, () => {
  console.log(`AudioSim running at http://localhost:${port}`);
  if (host === "0.0.0.0" || host === "::") {
    console.log(`AudioSim also accepts LAN connections on port ${port}`);
  }
});

async function createViteMiddleware() {
  const { createServer } = await import("vite");
  return createServer({
    root,
    appType: "spa",
    server: {
      middlewareMode: true,
      hmr: {
        server: null,
      },
    },
  });
}

async function handleApiRequest(url, res) {
  if (url.pathname === "/api/driver-search") {
    try {
      const query = url.searchParams.get("q");
      const [driverSearch, responseSearch] = await Promise.allSettled([
        searchDrivers(query),
        searchFrequencyResponses(query),
      ]);
      if (driverSearch.status === "rejected") throw driverSearch.reason;
      const result = attachFrequencyResponsesToDrivers(
        driverSearch.value,
        responseSearch.status === "fulfilled" ? responseSearch.value : { results: [] },
        query,
      );
      if (responseSearch.status === "rejected") {
        result.frequencyResponseError = responseSearch.reason?.message || "Frequency response search failed";
      }
      writeJson(res, 200, result);
    } catch (error) {
      writeJson(res, error.statusCode || 502, { error: error.message || "Driver search failed", directUrl: Boolean(error.directUrl) });
    }
    return true;
  }

  if (url.pathname === "/api/passive-radiator-search") {
    try {
      writeJson(res, 200, await searchPassiveRadiators(url.searchParams.get("q")));
    } catch (error) {
      writeJson(res, error.statusCode || 502, { error: error.message || "P-Radiator search failed", directUrl: Boolean(error.directUrl) });
    }
    return true;
  }

  if (url.pathname === "/api/frequency-response-search") {
    try {
      writeJson(res, 200, await searchFrequencyResponses(url.searchParams.get("q")));
    } catch (error) {
      writeJson(res, error.statusCode || 502, { error: error.message || "Frequency response search failed" });
    }
    return true;
  }

  return false;
}

function writeJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

async function serveStaticFile(url, res) {
  const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = normalize(join(staticRoot, requested));

  if (!filePath.startsWith(staticRoot)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  const resolvedPath = await resolveStaticPath(filePath, requested);
  const body = await readFile(resolvedPath);
  res.writeHead(200, {
    "Content-Type": mime[extname(resolvedPath)] ?? "application/octet-stream",
    "Cache-Control": cacheControlForPath(resolvedPath),
  });
  res.end(body);
}

async function resolveStaticPath(filePath, requested) {
  if (await isReadableFile(filePath)) return filePath;
  const hasExtension = Boolean(extname(requested));
  if (!hasExtension && production) {
    const indexPath = join(staticRoot, "index.html");
    if (await isReadableFile(indexPath)) return indexPath;
  }
  return filePath;
}

async function isReadableFile(filePath) {
  try {
    const fileStat = await stat(filePath);
    return fileStat.isFile();
  } catch {
    return false;
  }
}

function cacheControlForPath(filePath) {
  if (production && filePath.includes(`${join("dist", "assets")}`)) {
    return "public, max-age=31536000, immutable";
  }
  return "no-store";
}

function attachFrequencyResponsesToDrivers(driverPayload = {}, responsePayload = {}, query = "") {
  const frequencyResponses = Array.isArray(responsePayload.results) ? responsePayload.results : [];
  return {
    ...driverPayload,
    frequencyResponses,
    results: Array.isArray(driverPayload.results)
      ? driverPayload.results.map((driver) => ({
        ...driver,
        frequencyResponseMatches: matchingFrequencyResponsesForDriver(driver, frequencyResponses, query),
      }))
      : [],
  };
}

function matchingFrequencyResponsesForDriver(driver, frequencyResponses = [], query = "") {
  if (!frequencyResponses.length) return [];
  const queryTokens = modelTokens(query);
  const driverTokens = modelTokens(`${driver?.title || ""} ${driver?.url || ""}`);
  const tokens = [...new Set([...queryTokens, ...driverTokens])];
  if (!tokens.length) return frequencyResponses;

  const matches = frequencyResponses.filter((response) => {
    const haystack = normalizeMatchText(`${response?.title || ""} ${response?.url || ""} ${response?.source || ""}`);
    return tokens.some((token) => haystack.includes(token));
  });
  if (matches.length) return matches;

  const driverText = normalizeMatchText(`${driver?.title || ""} ${driver?.url || ""}`);
  if (queryTokens.some((token) => driverText.includes(token))) return frequencyResponses;
  return frequencyResponses;
}

function modelTokens(value) {
  const text = String(value || "");
  return [...new Set([
    ...(text.match(/[A-Z0-9]+(?:[-_][A-Z0-9]+)+/gi) || []),
    ...(text.match(/\b(?=[A-Z0-9-]*\d)(?=[A-Z0-9-]*[A-Z])[A-Z0-9-]{4,}\b/gi) || []),
  ].map(normalizeMatchText))]
    .filter((token) => token.length >= 4 && /\d/.test(token))
    .slice(0, 8);
}

function normalizeMatchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}
