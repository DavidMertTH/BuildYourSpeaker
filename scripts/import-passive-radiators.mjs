import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { scrapePartsExpressPassiveRadiators, serializePassiveRadiatorModule } from "../src/core/passiveRadiatorImporter.js";

const concurrencyArg = process.argv.find((arg) => arg.startsWith("--concurrency="));
const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
const concurrency = concurrencyArg ? Number(concurrencyArg.split("=")[1]) : 4;
const output = resolve(outputArg ? outputArg.split("=")[1] : "src/data/passiveRadiators.js");

const result = await scrapePartsExpressPassiveRadiators({
  concurrency,
  onProgress(progress) {
    console.log(`scanned=${progress.scanned}/${progress.total} matched=${progress.matched} ${progress.error ? `error=${progress.error}` : ""}`);
  },
});

await mkdir(dirname(output), { recursive: true });
await writeFile(output, serializePassiveRadiatorModule(result), "utf8");
console.log(`Wrote ${result.passiveRadiators.length} passive radiators to ${output}`);
