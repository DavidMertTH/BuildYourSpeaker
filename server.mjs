import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { searchDrivers, searchPassiveRadiators } from "./src/core/driverScraper.js";
import { searchFrequencyResponses } from "./src/core/frequencyResponseScraper.js";

const root = process.cwd();
const port = Number(process.env.PORT ?? 4173);
const host = process.env.HOST ?? "0.0.0.0";

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

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
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify(result));
      } catch (error) {
        res.writeHead(error.statusCode || 502, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: error.message || "Driver search failed", directUrl: Boolean(error.directUrl) }));
      }
      return;
    }

    if (url.pathname === "/api/passive-radiator-search") {
      try {
        const result = await searchPassiveRadiators(url.searchParams.get("q"));
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify(result));
      } catch (error) {
        res.writeHead(error.statusCode || 502, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: error.message || "P-Radiator search failed", directUrl: Boolean(error.directUrl) }));
      }
      return;
    }

    if (url.pathname === "/api/frequency-response-search") {
      try {
        const result = await searchFrequencyResponses(url.searchParams.get("q"));
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify(result));
      } catch (error) {
        res.writeHead(error.statusCode || 502, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: error.message || "Frequency response search failed" }));
      }
      return;
    }

    const requested = url.pathname === "/" ? "/index.html" : url.pathname;
    const filePath = normalize(join(root, requested));

    if (!filePath.startsWith(root)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    const body = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": mime[extname(filePath)] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(body);
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
