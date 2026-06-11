import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { scrapePartsExpressDrivers, serializeDriverModule } from "../src/core/partsExpressImporter.js";

const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const offsetArg = process.argv.find((arg) => arg.startsWith("--offset="));
const concurrencyArg = process.argv.find((arg) => arg.startsWith("--concurrency="));
const outputArg = process.argv.find((arg) => arg.startsWith("--output="));

const limit = limitArg ? Number(limitArg.split("=")[1]) : Number.POSITIVE_INFINITY;
const offset = offsetArg ? Number(offsetArg.split("=")[1]) : 0;
const concurrency = concurrencyArg ? Number(concurrencyArg.split("=")[1]) : 4;
const output = resolve(outputArg ? outputArg.split("=")[1] : "src/data/partsExpressDrivers.js");

let lastLog = Date.now();
const result = await scrapePartsExpressDrivers({
  limit,
  offset,
  concurrency,
  onProgress(progress) {
    const now = Date.now();
    if (now - lastLog > 1500 || progress.scanned === progress.total) {
      lastLog = now;
      console.log(`scanned=${progress.scanned}/${progress.total} matched=${progress.matched} ${progress.error ? `error=${progress.error}` : ""}`);
    }
  },
});

await mkdir(dirname(output), { recursive: true });
await writeFile(output, serializeDriverModule(result), "utf8");
console.log(`Wrote ${result.drivers.length} Parts Express drivers to ${output}`);
