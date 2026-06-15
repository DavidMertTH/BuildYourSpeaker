import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { searchDrivers, searchPassiveRadiators } from "./src/core/driverScraper.js";

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
        const result = await searchDrivers(url.searchParams.get("q"));
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

    const requested = url.pathname === "/" ? "/index.html" : url.pathname;
    const filePath = normalize(join(root, requested));

    if (!filePath.startsWith(root)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    const body = await readFile(filePath);
    res.writeHead(200, { "Content-Type": mime[extname(filePath)] ?? "application/octet-stream" });
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
