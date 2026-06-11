import test from "node:test";
import assert from "node:assert/strict";
import { normalizeDriver } from "../src/core/driver.js";
import { logFrequencyVector, nearestFrequencyValue } from "../src/core/frequency.js";
import { closedAlignment, simulateSealed, targetClosedVolumeLiters } from "../src/core/sealedBox.js";
import { portLengthFromTuning, simulateVented } from "../src/core/ventedBox.js";
import { simulatePassiveRadiator } from "../src/core/passiveRadiatorBox.js";
import { normalizeEnclosureOptions, validateEnclosureOptions } from "../src/core/enclosure.js";
import { extractDriverData } from "../src/core/driverScraper.js";
import { knownPassiveRadiators, sampleProject } from "../src/state.js";

const driver = normalizeDriver(sampleProject.driver);
const frequencies = logFrequencyVector(10, 200, 260);

test("Qts is derived from Qms and Qes", () => {
  const expected = (sampleProject.driver.qms * sampleProject.driver.qes) / (sampleProject.driver.qms + sampleProject.driver.qes);
  assert.equal(driver.qts.toFixed(6), expected.toFixed(6));
});

test("closed alignment follows Thiele-Small alpha equations", () => {
  const alignment = closedAlignment(driver, 48);
  const alpha = driver.vas / 0.048;
  assert.equal(alignment.alpha.toFixed(6), alpha.toFixed(6));
  assert.equal(alignment.fc.toFixed(6), (driver.fs * Math.sqrt(1 + alpha)).toFixed(6));
  assert.equal(alignment.qtc.toFixed(6), (driver.qts * Math.sqrt(1 + alpha)).toFixed(6));
});

test("target closed volume inverts target Qtc", () => {
  const volume = targetClosedVolumeLiters(driver, 0.707);
  const alignment = closedAlignment(driver, volume);
  assert.ok(Math.abs(alignment.qtc - 0.707) < 1e-6);
});

test("sealed impedance peak appears near Fc", () => {
  const result = simulateSealed(driver, sampleProject.box, frequencies);
  const peakIndex = result.impedance.reduce((best, value, index, values) => (value > values[best] ? index : best), 0);
  const peakFrequency = frequencies[peakIndex];
  assert.ok(Math.abs(peakFrequency - result.alignment.fc) / result.alignment.fc < 0.12);
});

test("fill increases effective volume and lowers sealed resonance", () => {
  const empty = closedAlignment(driver, 48, 0);
  const filled = closedAlignment(driver, 48, 100);
  const options = normalizeEnclosureOptions({ volumeL: 48, fillPercent: 100 });
  assert.ok(options.effectiveVolumeL > 48);
  assert.ok(filled.fc < empty.fc);
});

test("series resistance lowers acoustic output for the same nominal drive power", () => {
  const baseline = simulateSealed(driver, { ...sampleProject.box, seriesResistanceOhm: 0 }, frequencies);
  const withResistance = simulateSealed(driver, { ...sampleProject.box, seriesResistanceOhm: 1 }, frequencies);
  const baselineAt80 = nearestFrequencyValue(frequencies, baseline.spl, 80);
  const resistedAt80 = nearestFrequencyValue(frequencies, withResistance.spl, 80);
  assert.ok(resistedAt80 < baselineAt80);
});

test("port length formula retunes to the requested Fb", () => {
  const port = portLengthFromTuning(48, 34, 8);
  const volume = 0.048;
  const area = Math.PI * (0.08 / 2) ** 2;
  const c = 343;
  const fb = (c / (2 * Math.PI)) * Math.sqrt(area / (volume * port.effectiveLength));
  assert.ok(Math.abs(fb - 34) < 1e-9);
});

test("port end correction only changes the physical cut length", () => {
  const standard = portLengthFromTuning(48, 34, 8, 1.46);
  const flanged = portLengthFromTuning(48, 34, 8, 1.9);
  assert.equal(standard.effectiveLength.toFixed(9), flanged.effectiveLength.toFixed(9));
  assert.ok(flanged.physicalLength < standard.physicalLength);
});

test("vented system has excursion minimum near Fb", () => {
  const result = simulateVented(driver, sampleProject.box, frequencies);
  const windowed = frequencies
    .map((frequency, index) => ({ frequency, value: result.excursionMm[index] }))
    .filter((item) => item.frequency > 20 && item.frequency < 60);
  const minimum = windowed.reduce((best, item) => (item.value < best.value ? item : best), windowed[0]);
  assert.ok(Math.abs(minimum.frequency - sampleProject.box.fb) / sampleProject.box.fb < 0.2);
});

test("port velocity is high near Fb for the sample vented design", () => {
  const result = simulateVented(driver, sampleProject.box, frequencies);
  const atFb = nearestFrequencyValue(frequencies, result.portVelocity, sampleProject.box.fb);
  const at120 = nearestFrequencyValue(frequencies, result.portVelocity, 120);
  assert.ok(atFb > at120);
});

test("driver scraper extracts common Thiele-Small fields and units", () => {
  const html = `
    <html><title>Example Woofer</title>
    <table>
      <tr><td>Re</td><td>5.7 ohms</td></tr>
      <tr><td>Le</td><td>1100 uH</td></tr>
      <tr><td>Fs</td><td>28 Hz</td></tr>
      <tr><td>Qms</td><td>5.3</td></tr>
      <tr><td>Qes</td><td>0.42</td></tr>
      <tr><td>Vas</td><td>2.54 ft3</td></tr>
      <tr><td>Sd</td><td>346 cm2</td></tr>
      <tr><td>Xmax</td><td>0.236 in</td></tr>
      <tr><td>Mms</td><td>96 g</td></tr>
      <tr><td>BL</td><td>15.1 Tm</td></tr>
    </table></html>`;
  const result = extractDriverData(html, { url: "https://example.test/woofer" });
  assert.equal(result.driver.re, 5.7);
  assert.equal(result.driver.leMh, 1.1);
  assert.equal(result.driver.fs, 28);
  assert.equal(result.driver.qms, 5.3);
  assert.equal(result.driver.qes, 0.42);
  assert.equal(result.driver.vasL, 71.92);
  assert.equal(result.driver.sdCm2, 346);
  assert.equal(result.driver.xmaxMm, 5.994);
  assert.equal(result.driver.mmsG, 96);
  assert.equal(result.driver.bl, 15.1);
});

test("passive radiator library includes imported radiators", () => {
  assert.ok(knownPassiveRadiators.length >= 2);
  assert.ok(knownPassiveRadiators.some((entry) => entry.id.startsWith("parts-express-pr-")));
});

test("sample project includes comparable enclosure designs", () => {
  assert.ok(sampleProject.designs.length >= 2);
  assert.ok(sampleProject.designs.some((design) => design.mode === "vented"));
  assert.ok(sampleProject.designs.some((design) => design.mode === "sealed"));
});

test("passive radiator simulation returns finite response arrays", () => {
  const project = structuredClone(sampleProject);
  project.mode = "passive";
  project.box.passiveRadiator = { ...knownPassiveRadiators[0].passiveRadiator, count: 1 };
  const result = simulatePassiveRadiator(driver, project.box, frequencies);
  assert.equal(result.kind, "passive");
  assert.equal(result.spl.length, frequencies.length);
  assert.equal(result.passiveRadiatorExcursionMm.length, frequencies.length);
  assert.ok(result.spl.every(Number.isFinite));
  assert.ok(Math.max(...result.passiveRadiatorExcursionMm) > 0);
});

test("enclosure validation reports extreme losses", () => {
  const warnings = validateEnclosureOptions({ volumeL: 20, seriesResistanceOhm: 1.2, fillPercent: 90, qa: 10, ql: 3, portEndCorrection: 2.5 }, "vented");
  assert.ok(warnings.length >= 4);
});
