import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { deflateRawSync } from "node:zlib";
import { analyzeDriverParameters, combineDriverGroups, combineIdenticalDrivers, deriveDriverParameters, normalizeDriver } from "../src/core/driver.js";
import { logFrequencyVector, nearestFrequencyValue } from "../src/core/frequency.js";
import { closedAlignment, simulateSealed, targetClosedVolumeLiters } from "../src/core/sealedBox.js";
import {
  portArea,
  portDiameterFromTuningAndLength,
  portLengthFromTuning,
  portLengthFromTuningOptions,
  rectangularPortArea,
  simulateVented,
  tuningFromPortLength,
  tuningFromPortLengthOptions,
} from "../src/core/ventedBox.js";
import { simulatePassiveRadiator } from "../src/core/passiveRadiatorBox.js";
import { simulateBandpass } from "../src/core/bandpassBox.js";
import { normalizeEnclosureOptions, validateEnclosureOptions } from "../src/core/enclosure.js";
import { filterChainResponse, highPassResponse, linkwitzTransformResponse, lowPassResponse, parametricEqResponse, shelvingEqResponse, subsonicResponse } from "../src/core/filters.js";
import { inferAngleFromName, normalizeMeasurements, parseFrequencyResponseText } from "../src/core/measurements.js";
import { buildGoldenLayoutConfig } from "../src/app/goldenLayoutConfig.js";
import { crossoverCircuitComponentPortId, crossoverCircuitDesignNodeId, hasActiveCrossoverDesign, normalizeCrossoverCircuit, normalizeGroupCrossover } from "../src/app/crossoverModel.js";
import { crossoverCircuitResponses } from "../src/app/crossoverCircuitSolver.js";
import { excursionLimitedSpl, excursionLimitedValues, maxExcursionRatio, maxLinearSpl, recommendedLowFrequencyLimit } from "../src/core/realism.js";
import { extractDriverData, extractPassiveRadiatorData, findDatasheetPdfLinks, searchDrivers, searchPassiveRadiators } from "../src/core/driverScraper.js";
import { fetchUrl } from "../src/core/fetch.js";
import { extractFrequencyResponseLinks, extractZipTextEntries, parseEmbeddedFrequencyResponse, partsExpressFrequencyResponseCandidatesFromItem } from "../src/core/frequencyResponseScraper.js";
import { maxBuildableVolumeLiters, normalizeInventory } from "../src/core/planner/componentInventory.js";
import { planDesigns } from "../src/core/planner/designPlanner.js";
import { AIR_DENSITY } from "../src/core/constants.js";
import { knownPassiveRadiators, sampleProject } from "../src/state.js";

const driver = normalizeDriver(sampleProject.driver);
const frequencies = logFrequencyVector(10, 200, 260);

test("recording preset gives the recording panel the main workspace", () => {
  const config = buildGoldenLayoutConfig(["recordingPanel", "onAxisResponsePlot", "offAxisResponsePlot", "horizontalPolarPlot", "splPlot"]);

  assert.equal(config.root.type, "row");
  assert.equal(config.root.content[0].size, "62%");
  assert.equal(config.root.content[0].content[0].componentState.panelId, "recordingPanel");
  assert.equal(config.root.content[1].size, "38%");

  const sidePanelIds = config.root.content[1].content.flatMap((row) =>
    row.content.map((stack) => stack.content[0].componentState.panelId),
  );
  assert.deepEqual(sidePanelIds, ["onAxisResponsePlot", "offAxisResponsePlot", "horizontalPolarPlot", "splPlot"]);
});

test("Qts is derived from Qms and Qes", () => {
  const expected = (sampleProject.driver.qms * sampleProject.driver.qes) / (sampleProject.driver.qms + sampleProject.driver.qes);
  assert.equal(driver.qts.toFixed(6), expected.toFixed(6));
});

test("missing Mms and Bl can be derived from consistent driver parameters", () => {
  const partial = {
    ...sampleProject.driver,
    mmsG: 0,
    bl: 0,
  };
  const analysis = analyzeDriverParameters(partial);
  assert.ok(analysis.derived.mmsG > 0);
  assert.ok(analysis.derived.bl > 0);

  const completed = deriveDriverParameters(partial);
  assert.ok(Math.abs(completed.mmsG - analysis.derived.mmsG) / analysis.derived.mmsG < 0.01);
  assert.ok(Math.abs(completed.bl - analysis.derived.bl) / analysis.derived.bl < 0.01);
});

test("fetchUrl falls back when global fetch is unavailable", async () => {
  const originalFetch = globalThis.fetch;
  const server = createServer((request, response) => {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ ok: true, path: request.url }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    globalThis.fetch = undefined;
    const { port } = server.address();
    const response = await fetchUrl(`http://127.0.0.1:${port}/scrape-test`);
    assert.equal(response.ok, true);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, path: "/scrape-test" });
  } finally {
    globalThis.fetch = originalFetch;
    await new Promise((resolve) => server.close(resolve));
  }
});

test("driver analysis reports inconsistent Bl", () => {
  const analysis = analyzeDriverParameters({
    ...sampleProject.driver,
    bl: sampleProject.driver.bl * 0.5,
  });
  assert.ok(analysis.issues.some((issue) => issue.key === "bl" && issue.severity === "warning"));
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

test("identical driver arrays scale electrical wiring and acoustic volume", () => {
  const parallel = combineIdenticalDrivers(driver, 2, "parallel");
  const series = combineIdenticalDrivers(driver, 2, "series");

  assert.equal(parallel.re.toFixed(6), (driver.re / 2).toFixed(6));
  assert.equal(series.re.toFixed(6), (driver.re * 2).toFixed(6));
  assert.equal(parallel.sd.toFixed(6), (driver.sd * 2).toFixed(6));
  assert.equal(series.sd.toFixed(6), (driver.sd * 2).toFixed(6));
  assert.equal(parallel.vas.toFixed(6), (driver.vas * 2).toFixed(6));
  assert.equal(series.vas.toFixed(6), (driver.vas * 2).toFixed(6));
  assert.equal(parallel.qts.toFixed(6), driver.qts.toFixed(6));
  assert.equal(series.qts.toFixed(6), driver.qts.toFixed(6));
});

test("two identical drivers need double sealed volume for the same Qtc", () => {
  const singleVolume = targetClosedVolumeLiters(driver, 0.707);
  const arrayVolume = targetClosedVolumeLiters(combineIdenticalDrivers(driver, 2, "parallel"), 0.707);
  assert.ok(Math.abs(arrayVolume / singleVolume - 2) < 1e-6);
});

test("driver groups aggregate identical shared-box drivers like a driver array", () => {
  const grouped = combineDriverGroups([
    { id: "left", name: "Left", driver: sampleProject.driver, count: 1, wiring: "parallel" },
    { id: "right", name: "Right", driver: sampleProject.driver, count: 1, wiring: "parallel" },
  ], sampleProject.driver);
  const array = combineIdenticalDrivers(driver, 2, "parallel");

  assert.equal(grouped.count, 2);
  assert.equal(grouped.groups.length, 2);
  assert.equal(grouped.re.toFixed(6), array.re.toFixed(6));
  assert.equal(grouped.sd.toFixed(6), array.sd.toFixed(6));
  assert.equal(grouped.vas.toFixed(6), array.vas.toFixed(6));
  assert.equal(grouped.fs.toFixed(6), array.fs.toFixed(6));
  assert.equal(grouped.qts.toFixed(6), array.qts.toFixed(6));
});

test("single driver group preserves group metadata and wiring", () => {
  const grouped = combineDriverGroups([
    { id: "bass", name: "Bass pair", driver: sampleProject.driver, count: 2, wiring: "series" },
  ], sampleProject.driver);
  const array = combineIdenticalDrivers(driver, 2, "series");

  assert.equal(grouped.count, 2);
  assert.equal(grouped.wiring, "series");
  assert.equal(grouped.groups[0].id, "bass");
  assert.equal(grouped.re.toFixed(6), array.re.toFixed(6));
  assert.equal(grouped.sd.toFixed(6), array.sd.toFixed(6));
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

test("excursion limited SPL caps impossible low-frequency output", () => {
  const spl = [90, 90, 90];
  const excursion = [2, 8, 20];
  const limited = excursionLimitedSpl(spl, excursion, 8);
  const maxLinear = maxLinearSpl(spl, excursion, 8);

  assert.equal(limited[0], 90);
  assert.equal(limited[1], 90);
  assert.ok(limited[2] < 83);
  assert.equal(limited[2].toFixed(6), maxLinear[2].toFixed(6));
  assert.equal(maxExcursionRatio(excursion, 8), 2.5);
});

test("excursion limited values scale port velocity by the same linear headroom", () => {
  const velocity = excursionLimitedValues([10, 10, 10], [2, 8, 20], 8);
  assert.deepEqual(velocity.map((value) => Number(value.toFixed(3))), [10, 10, 4]);
});

test("high-pass filter follows Butterworth cutoff behavior", () => {
  const atCutoff = highPassResponse(1000, 1000, 2).abs();
  const below = highPassResponse(250, 1000, 2).abs();
  const above = highPassResponse(4000, 1000, 2).abs();

  assert.ok(Math.abs(20 * Math.log10(atCutoff) + 3.0103) < 0.01);
  assert.ok(below < 0.07);
  assert.ok(above > 0.99);
});

test("low-pass filter follows Butterworth cutoff behavior", () => {
  const atCutoff = lowPassResponse(1000, 1000, 2).abs();
  const below = lowPassResponse(250, 1000, 2).abs();
  const above = lowPassResponse(4000, 1000, 2).abs();

  assert.ok(Math.abs(20 * Math.log10(atCutoff) + 3.0103) < 0.01);
  assert.ok(below > 0.99);
  assert.ok(above < 0.07);
});

test("crossover filter chain combines low-pass and high-pass responses", () => {
  const chain = filterChainResponse(1000, [
    { kind: "highpass", frequencyHz: 100, order: 2, family: "butterworth" },
    { kind: "lowpass", frequencyHz: 10000, order: 2, family: "butterworth" },
  ]).abs();
  const blocked = filterChainResponse(30, [
    { kind: "highpass", frequencyHz: 100, order: 2, family: "butterworth" },
    { kind: "lowpass", frequencyHz: 10000, order: 2, family: "butterworth" },
  ]).abs();

  assert.ok(chain > 0.99);
  assert.ok(blocked < 0.1);
});

test("group crossover designs normalize as schematic routing toggles", () => {
  const crossover = normalizeGroupCrossover({
    designs: [{
      type: "three-way",
      lowFrequencyHz: 400,
      highFrequencyHz: 2500,
      assignments: [
        { band: "low", designId: "woofer" },
        { band: "mid", designId: "midrange" },
        { band: "high", designId: "tweeter" },
      ],
    }],
  });

  assert.equal(crossover.designs.length, 1);
  assert.equal(crossover.designs[0].enabled, true);
  assert.equal("frequencyHz" in crossover.designs[0], false);
  assert.equal("order" in crossover.designs[0], false);
  assert.equal("assignments" in crossover.designs[0], false);
});

test("active crossover designs gate schematic circuit routing", () => {
  assert.equal(hasActiveCrossoverDesign({}), false);
  assert.equal(hasActiveCrossoverDesign({ designs: [{ enabled: false }] }), false);
  assert.equal(hasActiveCrossoverDesign({ designs: [{ enabled: true }] }), true);
});

test("single-member crossover designs can activate schematic routing without a predefined split", () => {
  const design = normalizeGroupCrossover({
    designs: [{
      type: "two-way",
      frequencyHz: 1200,
      assignments: [
        { band: "low", designId: "woofer" },
        { band: "high", designId: "woofer" },
      ],
    }],
  }).designs[0];

  assert.equal(hasActiveCrossoverDesign({ designs: [design] }), true);
});

test("crossover circuit normalizes components and valid wires", () => {
  const circuit = normalizeCrossoverCircuit({
    components: [
      { id: "r1", type: "resistor", value: 5.6, x: 120, y: 80 },
      { id: "bad-type", type: "spark-gap", value: 9999 },
    ],
    nodes: [
      { id: "fixed:positive", x: -42, y: 84 },
      { id: crossoverCircuitDesignNodeId("woofer"), x: 640, y: 112 },
      { id: "junction:j1", x: 320, y: 96 },
      { id: "component:r1:a", x: 1, y: 2 },
    ],
    wires: [
      { from: "fixed:positive", to: crossoverCircuitComponentPortId("r1", "a") },
      { from: crossoverCircuitComponentPortId("r1", "b"), to: crossoverCircuitDesignNodeId("woofer") },
      { from: "junction:j1", to: "fixed:ground" },
      { from: "missing", to: "fixed:ground" },
    ],
  });

  assert.equal(circuit.components.length, 2);
  assert.equal(circuit.components[1].type, "resistor");
  assert.equal(circuit.wires.length, 3);
  assert.equal(circuit.wires[1].to, "design:woofer:positive");
  assert.deepEqual(circuit.nodes.map((node) => node.id), ["fixed:positive", "design:woofer:positive", "junction:j1"]);
  assert.equal(circuit.nodes[0].x, -42);
});

test("crossover circuit routes voltage through speaker plus and minus poles", () => {
  const responses = crossoverCircuitResponses({
    wires: [
      { from: "fixed:positive", to: crossoverCircuitDesignNodeId("woofer", "positive") },
      { from: "fixed:ground", to: crossoverCircuitDesignNodeId("woofer", "negative") },
    ],
  }, [100, 1000], [{ designId: "woofer", impedance: [8, 8] }]);

  const woofer = responses.get("woofer");
  assert.ok(woofer);
  assert.ok(Math.abs(woofer.voltage[0].abs() - 1) < 1e-9);
  assert.ok(Math.abs(woofer.voltage[1].abs() - 1) < 1e-9);
  assert.ok(Math.abs(woofer.inputImpedance[0] - 8) < 1e-9);
});

test("crossover circuit components shape the routed speaker voltage", () => {
  const responses = crossoverCircuitResponses({
    components: [{ id: "c1", type: "capacitor", value: 10, x: 120, y: 80 }],
    wires: [
      { from: "fixed:positive", to: crossoverCircuitComponentPortId("c1", "a") },
      { from: crossoverCircuitComponentPortId("c1", "b"), to: crossoverCircuitDesignNodeId("tweeter", "positive") },
      { from: "fixed:ground", to: crossoverCircuitDesignNodeId("tweeter", "negative") },
    ],
  }, [100, 10000], [{ designId: "tweeter", impedance: [8, 8] }]);

  const tweeter = responses.get("tweeter");
  assert.ok(tweeter.voltage[0].abs() < tweeter.voltage[1].abs());
  assert.ok(tweeter.voltage[0].abs() < 0.1);
  assert.ok(tweeter.voltage[1].abs() > 0.9);
});

test("parametric EQ applies requested gain near center frequency", () => {
  const boosted = parametricEqResponse(100, 100, 6, 1).abs();
  const bypassed = parametricEqResponse(100, 100, 0, 1).abs();

  assert.ok(Math.abs(20 * Math.log10(boosted) - 6) < 0.05);
  assert.equal(bypassed.toFixed(6), "1.000000");
});

test("shelving EQ boosts the intended side of the shelf", () => {
  const lowShelfLow = shelvingEqResponse(20, 100, 6, "low").abs();
  const lowShelfHigh = shelvingEqResponse(5000, 100, 6, "low").abs();
  const highShelfLow = shelvingEqResponse(20, 1000, 6, "high").abs();
  const highShelfHigh = shelvingEqResponse(10000, 1000, 6, "high").abs();

  assert.ok(lowShelfLow > lowShelfHigh);
  assert.ok(highShelfHigh > highShelfLow);
});

test("linkwitz transform boosts low frequencies when target resonance is lower", () => {
  const low = linkwitzTransformResponse(20, 60, 0.707, 30, 0.707).abs();
  const high = linkwitzTransformResponse(1000, 60, 0.707, 30, 0.707).abs();

  assert.ok(low > high * 2);
});

test("subsonic filter attenuates below cutoff", () => {
  const below = subsonicResponse(10, 30, 4, "butterworth").abs();
  const above = subsonicResponse(120, 30, 4, "butterworth").abs();

  assert.ok(below < 0.05);
  assert.ok(above > 0.95);
});

test("frequency response parser reads FRD rows with comments and optional phase", () => {
  const response = parseFrequencyResponseText(`
    * measured response
    Frequency SPL Phase
    20 72.5 -12
    25 76.0 -8
    31.5 80.2 -4
  `, { name: "Nearfield 0deg", source: "nearfield.frd", angleDeg: 0 });

  assert.equal(response.name, "Nearfield 0deg");
  assert.equal(response.source, "nearfield.frd");
  assert.equal(response.points.length, 3);
  assert.equal(response.points[0].frequencyHz, 20);
  assert.equal(response.points[0].magnitudeDb, 72.5);
  assert.equal(response.points[0].phaseDeg, -12);
});

test("frequency response parser reads CSV and semicolon decimal data", () => {
  const csv = parseFrequencyResponseText(`
    Freq(Hz),SPL(dB)
    100,84.2
    200,86.4
  `);
  const semicolon = parseFrequencyResponseText(`
    100;84,2
    200;86,4
  `);

  assert.deepEqual(csv.points.map((point) => point.magnitudeDb), [84.2, 86.4]);
  assert.deepEqual(semicolon.points.map((point) => point.magnitudeDb), [84.2, 86.4]);
});

test("measurement angle can be inferred from file names", () => {
  assert.equal(inferAngleFromName("woofer_30deg.frd"), 30);
  assert.equal(inferAngleFromName("tweeter -15°.txt"), -15);
});

test("frequency response scraper discovers linked response assets", () => {
  const html = `
    <a href="/files/woofer_0deg.frd">Frequency response FRD</a>
    <img src="/img/woofer-spl-chart.png" alt="SPL response graph">
    <a href="/cart/add">Cart</a>
  `;
  const links = extractFrequencyResponseLinks(html, "https://example.test/product/woofer", "woofer");
  const urls = links.map((link) => link.url);

  assert.ok(urls.includes("https://example.test/files/woofer_0deg.frd"));
  assert.ok(urls.includes("https://example.test/img/woofer-spl-chart.png"));
  assert.ok(!urls.includes("https://example.test/cart/add"));
  assert.equal(links.find((link) => link.url.endsWith("woofer-spl-chart.png"))?.title, "SPL response graph");
});

test("frequency response scraper parses embedded numeric response blocks", () => {
  const response = parseEmbeddedFrequencyResponse(`
    <h2>Frequency response</h2>
    <pre>
      20 72.5
      31.5 76.0
      50 81.0
      80 84.2
      125 85.0
      200 84.4
    </pre>
  `, { name: "Scraped 0deg", source: "https://example.test/response" });

  assert.ok(response);
  assert.equal(response.name, "Scraped 0deg");
  assert.equal(response.points.length, 6);
  assert.equal(response.points[0].frequencyHz, 20);
});

test("frequency response scraper extracts text entries from ZIP resources", () => {
  const zip = createZip([
    { name: "FRD/TCP115-4@30.frd", text: "20 70 0\n40 78 0\n80 82 0\n160 84 0\n320 83 0\n640 80 0\n" },
    { name: "README/readme.txt", text: "driver data package" },
  ]);
  const entries = extractZipTextEntries(zip);

  assert.deepEqual(entries.map((entry) => entry.name), ["FRD/TCP115-4@30.frd", "README/readme.txt"]);
  assert.match(entries[0].text, /320 83/);
});

test("Parts Express response scraper lists range and image candidates", () => {
  const candidates = partsExpressFrequencyResponseCandidatesFromItem({
    displayname: "Dayton Audio RSS315HF-4 12 inch Reference Subwoofer",
    mpn: "RSS315HF-4",
    itemid: "295-464",
    urlcomponent: "Dayton-Audio-RSS315HF-4-12-Reference-Series-HF-Subwoofer-4-Ohm-295-464",
    custitem_pe_frequency_response: "23 to 1,000",
    itemimages_detail: {
      main: {
        urls: [
          { url: "/SSP Applications/PartsExpress/img/295-464_HR_0.default.jpg" },
          { url: "/SSP Applications/PartsExpress/img/295-464_ALT_2.default.jpg" },
        ],
      },
    },
  }, "RSS315HF-4");

  assert.ok(candidates.some((candidate) => candidate.format === "api-range" && candidate.reason.includes("23 to 1,000")));
  assert.ok(candidates.some((candidate) => candidate.format === "jpg" && candidate.url.includes("295-464_ALT_2")));
});

test("measurements keep response candidates without numeric points", () => {
  const measurements = normalizeMeasurements({
    frequencyResponses: [
      { name: "Too sparse", points: [{ frequencyHz: 100, magnitudeDb: 80 }] },
    ],
    frequencyResponseCandidates: [
      {
        title: "Dayton Audio RSS315HF-4 SPL",
        source: "Loudspeaker Database",
        url: "https://loudspeakerdatabase.com/Dayton/RSS315HF-4/response.png",
        format: "png",
      },
    ],
  });

  assert.equal(measurements.frequencyResponses.length, 0);
  assert.equal(measurements.frequencyResponseCandidates.length, 1);
  assert.equal(measurements.frequencyResponseCandidates[0].name, "Dayton Audio RSS315HF-4 SPL");
});

test("measurements normalize recording groups and preserve response group assignment", () => {
  const measurements = normalizeMeasurements({
    recordingGroups: [{ id: "room-a", name: "Room A", target: "configGroup:room" }],
    frequencyResponses: [
      {
        name: "Nearfield",
        recordingGroupId: "room-a",
        points: [
          { frequencyHz: 100, magnitudeDb: 80 },
          { frequencyHz: 200, magnitudeDb: 82 },
        ],
      },
    ],
  });

  assert.equal(measurements.recordingGroups.length, 1);
  assert.equal(measurements.recordingGroups[0].name, "Room A");
  assert.equal(measurements.recordingGroups[0].target, "configGroup:room");
  assert.equal(measurements.frequencyResponses[0].recordingGroupId, "room-a");
});

test("recommended low frequency limit protects small high-Fs drivers", () => {
  const tweeter = normalizeDriver({
    ...sampleProject.driver,
    fs: 800,
    sdCm2: 8,
    vasL: 0.02,
    xmaxMm: 0.5,
    mmsG: 0.4,
  });

  assert.ok(recommendedLowFrequencyLimit(tweeter) >= 1000);
  assert.equal(recommendedLowFrequencyLimit(driver), 0);
});

test("enclosure high-pass reduces SPL, excursion, and port velocity together", () => {
  const unfiltered = simulateVented(driver, { ...sampleProject.box, highPassHz: 0, highPassOrder: 0 }, frequencies);
  const filtered = simulateVented(driver, { ...sampleProject.box, highPassHz: 80, highPassOrder: 4 }, frequencies);
  const at20UnfilteredSpl = nearestFrequencyValue(frequencies, unfiltered.spl, 20);
  const at20FilteredSpl = nearestFrequencyValue(frequencies, filtered.spl, 20);
  const at20UnfilteredExcursion = nearestFrequencyValue(frequencies, unfiltered.excursionMm, 20);
  const at20FilteredExcursion = nearestFrequencyValue(frequencies, filtered.excursionMm, 20);
  const at20UnfilteredPort = nearestFrequencyValue(frequencies, unfiltered.portVelocity, 20);
  const at20FilteredPort = nearestFrequencyValue(frequencies, filtered.portVelocity, 20);

  assert.ok(at20FilteredSpl < at20UnfilteredSpl - 40);
  assert.ok(at20FilteredExcursion < at20UnfilteredExcursion / 20);
  assert.ok(at20FilteredPort < at20UnfilteredPort / 20);
});

test("port length formula retunes to the requested Fb", () => {
  const port = portLengthFromTuning(48, 34, 8);
  const volume = 0.048;
  const area = Math.PI * (0.08 / 2) ** 2;
  const c = 343;
  const fb = (c / (2 * Math.PI)) * Math.sqrt(area / (volume * port.effectiveLength));
  assert.ok(Math.abs(fb - 34) < 1e-9);
});

test("port tuning formula inverts physical port length", () => {
  const port = portLengthFromTuning(48, 34, 8, 1.46);
  const fb = tuningFromPortLength(48, 8, port.physicalLength * 100, 1.46);
  assert.ok(Math.abs(fb - 34) < 1e-9);
});

test("multiple identical ports increase required length for the same tuning", () => {
  const single = portLengthFromTuning(48, 34, 8, 1.46, 1);
  const dual = portLengthFromTuning(48, 34, 8, 1.46, 2);
  const fb = tuningFromPortLength(48, 8, dual.physicalLength * 100, 1.46, 2);
  assert.equal(dual.count, 2);
  assert.ok(dual.physicalLength > single.physicalLength * 1.8);
  assert.ok(Math.abs(fb - 34) < 1e-9);
});

test("rectangular port area uses width times height", () => {
  assert.ok(Math.abs(rectangularPortArea(10, 5) - 0.005) < 1e-12);
});

test("rectangular port tuning formula inverts physical port length", () => {
  const options = {
    portShape: "rectangular",
    portWidthCm: 10,
    portHeightCm: 5,
    portCount: 1,
    portEndCorrection: 1.46,
  };
  const port = portLengthFromTuningOptions(48, 34, options);
  const fb = tuningFromPortLengthOptions(48, port.physicalLength * 100, options);
  assert.equal(port.shape, "rectangular");
  assert.ok(Math.abs(port.area - 0.005) < 1e-12);
  assert.ok(Math.abs(fb - 34) < 1e-9);
});

test("port diameter formula inverts physical port length and tuning", () => {
  const port = portLengthFromTuning(48, 34, 8, 1.46);
  const diameterCm = portDiameterFromTuningAndLength(48, 34, port.physicalLength * 100, 1.46);
  assert.ok(Math.abs(diameterCm - 8) < 1e-9);
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

test("vented simulation uses physical port length independently from stored port tune", () => {
  const firstBox = { ...sampleProject.box, portLengthCm: 24, fb: 22 };
  const secondBox = { ...sampleProject.box, portLengthCm: 24, fb: 58 };
  const first = simulateVented(driver, firstBox, frequencies);
  const second = simulateVented(driver, secondBox, frequencies);
  const maxSplDifference = Math.max(...first.spl.map((value, index) => Math.abs(value - second.spl[index])));
  assert.ok(maxSplDifference < 1e-9);
  assert.equal(first.port.tuning.toFixed(6), second.port.tuning.toFixed(6));
});

test("vented simulation supports rectangular ports", () => {
  const options = {
    ...sampleProject.box,
    portShape: "rectangular",
    portWidthCm: 10,
    portHeightCm: 5,
  };
  const port = portLengthFromTuningOptions(options.volumeL, options.fb, options);
  const result = simulateVented(driver, { ...options, portLengthCm: port.physicalLength * 100 }, frequencies);
  assert.equal(result.port.shape, "rectangular");
  assert.ok(Math.abs(result.port.area - 0.005) < 1e-12);
  assert.ok(Math.abs(result.port.tuning - options.fb) < 1e-9);
  assert.ok(result.spl.every(Number.isFinite));
  assert.ok(result.portVelocity.every(Number.isFinite));
});

test("port velocity is high near Fb for the sample vented design", () => {
  const result = simulateVented(driver, sampleProject.box, frequencies);
  const atFb = nearestFrequencyValue(frequencies, result.portVelocity, sampleProject.box.fb);
  const at120 = nearestFrequencyValue(frequencies, result.portVelocity, 120);
  assert.ok(atFb > at120);
});

test("vented port output sums externally without a cancellation notch above tuning", () => {
  const result = simulateVented(driver, sampleProject.box, frequencies);
  const atFb = nearestFrequencyValue(frequencies, result.spl, sampleProject.box.fb);
  const at50 = nearestFrequencyValue(frequencies, result.spl, 50);
  assert.ok(at50 > atFb - 2);
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

test("driver scraper extracts usable frequency range lower bound", () => {
  const html = `
    <html><title>Example Tweeter</title>
    <table>
      <tr><td>Re</td><td>6.1 ohms</td></tr>
      <tr><td>Fs</td><td>980 Hz</td></tr>
      <tr><td>Qms</td><td>2.1</td></tr>
      <tr><td>Qes</td><td>1.4</td></tr>
      <tr><td>Vas</td><td>0.02 L</td></tr>
      <tr><td>Sd</td><td>7.1 cm2</td></tr>
      <tr><td>Xmax</td><td>0.4 mm</td></tr>
      <tr><td>Mms</td><td>0.35 g</td></tr>
      <tr><td>BL</td><td>2.4 Tm</td></tr>
      <tr><td>Usable Frequency Range</td><td>1,200 - 20,000 Hz</td></tr>
    </table></html>`;
  const result = extractDriverData(html, { url: "https://example.test/tweeter" });

  assert.equal(result.driver.minFrequencyHz, 1200);
  assert.equal(result.driver.maxFrequencyHz, 20000);
  assert.ok(result.matched.includes("Usable range"));
});

test("driver scraper extracts usable frequency range upper bound with kHz units", () => {
  const html = `
    <html><title>Example Horn Driver</title>
    <table>
      <tr><td>Re</td><td>6.1 ohms</td></tr>
      <tr><td>Fs</td><td>980 Hz</td></tr>
      <tr><td>Qms</td><td>2.1</td></tr>
      <tr><td>Qes</td><td>1.4</td></tr>
      <tr><td>Vas</td><td>0.02 L</td></tr>
      <tr><td>Sd</td><td>7.1 cm2</td></tr>
      <tr><td>Xmax</td><td>0.4 mm</td></tr>
      <tr><td>Mms</td><td>0.35 g</td></tr>
      <tr><td>BL</td><td>2.4 Tm</td></tr>
      <tr><td>Frequency response</td><td>1.2 kHz - 20 kHz</td></tr>
    </table></html>`;
  const result = extractDriverData(html, { url: "https://example.test/horn" });

  assert.equal(result.driver.minFrequencyHz, 1200);
  assert.equal(result.driver.maxFrequencyHz, 20000);
  assert.ok(result.matched.includes("Usable range"));
});

test("driver scraper extracts recommended crossover as usable lower bound", () => {
  const html = `
    <html><title>Example Compression Driver</title>
    <p>Recommended crossover frequency: 1.6 kHz, 12 dB/oct minimum.</p>
    <table>
      <tr><td>Re</td><td>7.2 ohms</td></tr>
      <tr><td>Fs</td><td>720 Hz</td></tr>
      <tr><td>Qms</td><td>3.1</td></tr>
      <tr><td>Qes</td><td>1.1</td></tr>
      <tr><td>Vas</td><td>0.03 L</td></tr>
      <tr><td>Sd</td><td>8 cm2</td></tr>
      <tr><td>Xmax</td><td>0.3 mm</td></tr>
      <tr><td>Mms</td><td>0.28 g</td></tr>
      <tr><td>BL</td><td>2.8 Tm</td></tr>
    </table></html>`;
  const result = extractDriverData(html, { url: "https://example.test/compression" });

  assert.equal(result.driver.minFrequencyHz, 1600);
  assert.ok(result.matched.includes("Recommended crossover"));
});

test("driver scraper discovers datasheet PDFs from links and button attributes", () => {
  const html = `
    <html>
      <a href="/docs/TCP115-8-datasheet.pdf">Download datasheet</a>
      <button data-url="/downloads/TCP115-8-spec-sheet.pdf">Spec Sheet</button>
      <button onclick="window.open('/files/TCP115-8_manual.pdf')">Manual</button>
      <div role="button" data-href="/download?id=TCP115-8">Datasheet PDF</div>
      <button data-url="/cart/add">Add to cart</button>
    </html>`;
  const links = findDatasheetPdfLinks(html, "https://example.test/product/TCP115-8", "TCP115-8");
  const urls = links.map((link) => link.url);

  assert.ok(urls.includes("https://example.test/docs/TCP115-8-datasheet.pdf"));
  assert.ok(urls.includes("https://example.test/downloads/TCP115-8-spec-sheet.pdf"));
  assert.ok(urls.includes("https://example.test/files/TCP115-8_manual.pdf"));
  assert.ok(urls.includes("https://example.test/download?id=TCP115-8"));
  assert.ok(!urls.includes("https://example.test/cart/add"));
});

test("driver scraper accepts a direct datasheet URL", async () => {
  const html = `
    <html><title>Linked Woofer Datasheet</title>
    <table>
      <tr><td>Re</td><td>5.8 ohms</td></tr>
      <tr><td>Fs</td><td>31 Hz</td></tr>
      <tr><td>Qms</td><td>4.2</td></tr>
      <tr><td>Qes</td><td>0.51</td></tr>
      <tr><td>Vas</td><td>38 L</td></tr>
      <tr><td>Sd</td><td>220 cm2</td></tr>
      <tr><td>Xmax</td><td>5.2 mm</td></tr>
      <tr><td>Mms</td><td>58 g</td></tr>
      <tr><td>BL</td><td>9.4 Tm</td></tr>
    </table></html>`;
  const server = createServer((request, response) => {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(html);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    const { port } = server.address();
    const result = await searchDrivers(`http://127.0.0.1:${port}/datasheet.html`);
    assert.equal(result.directUrl, true);
    assert.equal(result.results.length, 1);
    assert.equal(result.results[0].driver.fs, 31);
    assert.equal(result.results[0].driver.xmaxMm, 5.2);

    const noProtocol = await searchDrivers(`127.0.0.1:${port}/datasheet.html`);
    assert.equal(noProtocol.directUrl, true);
    assert.equal(noProtocol.results.length, 1);
    assert.equal(noProtocol.results[0].driver.fs, 31);

    const pasted = await searchDrivers(`Datasheet: http://127.0.0.1:${port}/datasheet.html)`);
    assert.equal(pasted.directUrl, true);
    assert.equal(pasted.results.length, 1);
    assert.equal(pasted.results[0].driver.xmaxMm, 5.2);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("driver scraper extracts parameters from a direct PDF datasheet URL", async () => {
  const pdf = createSimplePdf([
    "Re 5.6 ohms Fs 29 Hz Qms 4.8 Qes 0.44 Vas 45 L",
    "Sd 230 cm2 Xmax 6.1 mm Mms 63 g BL 10.2 Tm",
    "Usable Frequency Range 35 - 3000 Hz",
  ].join("\n"));
  const server = createServer((request, response) => {
    response.writeHead(200, { "Content-Type": "application/pdf" });
    response.end(pdf);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    const { port } = server.address();
    const result = await searchDrivers(`http://127.0.0.1:${port}/datasheet.pdf`);
    assert.equal(result.directUrl, true);
    assert.equal(result.results.length, 1);
    assert.equal(result.results[0].driver.fs, 29);
    assert.equal(result.results[0].driver.xmaxMm, 6.1);
    assert.equal(result.results[0].driver.minFrequencyHz, 35);
    assert.equal(result.results[0].driver.maxFrequencyHz, 3000);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("driver scraper reads positioned PDF parameter tables", async () => {
  const labels = [
    ["Re", 700],
    ["Le", 684],
    ["Fs", 668],
    ["Qms", 652],
    ["Qes", 636],
    ["Mms", 620],
    ["Sd", 604],
    ["BL", 588],
    ["Vas", 572],
    ["Xmax", 556],
    ["Usable Frequency Range (Hz)", 540],
  ];
  const values = [
    ["7.8 ohms", 700],
    ["1.9 mH", 684],
    ["59.2 Hz", 668],
    ["2.3", 652],
    ["0.54", 636],
    ["10.16 g", 620],
    ["50 cm2", 604],
    ["7.4 Tm", 588],
    ["2.52 liters", 572],
    ["4 mm", 556],
    ["55 - 6,000 Hz", 540],
  ];
  const pdf = createPositionedPdf([
    { x: 80, y: 750, text: "TCP115-8 4 inch Midbass Woofer" },
    ...values.map(([text, y]) => ({ x: 320, y, text })),
    ...labels.map(([text, y]) => ({ x: 80, y, text })),
  ]);
  const server = createServer((request, response) => {
    response.writeHead(200, { "Content-Type": "application/pdf" });
    response.end(pdf);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    const { port } = server.address();
    const result = await searchDrivers(`http://127.0.0.1:${port}/positioned-table.pdf`);
    assert.equal(result.directUrl, true);
    assert.equal(result.results.length, 1);
    assert.equal(result.results[0].driver.re, 7.8);
    assert.equal(result.results[0].driver.leMh, 1.9);
    assert.equal(result.results[0].driver.fs, 59.2);
    assert.equal(result.results[0].driver.vasL, 2.52);
    assert.equal(result.results[0].driver.sdCm2, 50);
    assert.equal(result.results[0].driver.xmaxMm, 4);
    assert.equal(result.results[0].driver.minFrequencyHz, 55);
    assert.equal(result.results[0].driver.maxFrequencyHz, 6000);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("driver scraper rejects direct PDFs without useful driver parameters", async () => {
  const pdf = createSimplePdf([
    "Installation guide",
    "Cutout diameter 146 mm",
    "Mounting depth 72 mm",
    "Use gasket tape before installing the frame.",
  ].join("\n"));
  const server = createServer((request, response) => {
    response.writeHead(200, { "Content-Type": "application/pdf" });
    response.end(pdf);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    const { port } = server.address();
    await assert.rejects(
      () => searchDrivers(`http://127.0.0.1:${port}/manual.pdf`),
      (error) => {
        assert.equal(error.statusCode, 422);
        assert.equal(error.directUrl, true);
        assert.match(error.message, /No usable T\/S parameters found/);
        return true;
      },
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("passive radiator scraper extracts common PR fields and derives Cms", () => {
  const html = `
    <html><title>Example Passive Radiator</title>
    <table>
      <tr><td>Fs</td><td>22 Hz</td></tr>
      <tr><td>Qms</td><td>8.1</td></tr>
      <tr><td>Mms</td><td>82 g</td></tr>
      <tr><td>Sd</td><td>214 cm2</td></tr>
      <tr><td>Xmax</td><td>0.47 in</td></tr>
    </table></html>`;
  const result = extractPassiveRadiatorData(html, { url: "https://example.test/passive-radiator" });

  assert.equal(result.passiveRadiator.fs, 22);
  assert.equal(result.passiveRadiator.qms, 8.1);
  assert.equal(result.passiveRadiator.mmsG, 82);
  assert.equal(result.passiveRadiator.sdCm2, 214);
  assert.equal(result.passiveRadiator.xmaxMm, 11.94);
  assert.ok(result.passiveRadiator.cmsMmN > 0);
  assert.ok(result.matched.includes("Cms derived"));
});

test("passive radiator scraper accepts direct datasheet URLs", async () => {
  const html = `
    <html><title>Linked PR Datasheet</title>
    <table>
      <tr><td>Fs</td><td>24 Hz</td></tr>
      <tr><td>Qms</td><td>6.8</td></tr>
      <tr><td>Mms</td><td>76 g</td></tr>
      <tr><td>Cms</td><td>0.58 mm/N</td></tr>
      <tr><td>Sd</td><td>208 cm2</td></tr>
      <tr><td>Xmax</td><td>10.5 mm</td></tr>
    </table></html>`;
  const server = createServer((request, response) => {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(html);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    const { port } = server.address();
    const result = await searchPassiveRadiators(`http://127.0.0.1:${port}/pr-datasheet.html`);
    assert.equal(result.directUrl, true);
    assert.equal(result.results.length, 1);
    assert.equal(result.results[0].passiveRadiator.fs, 24);
    assert.equal(result.results[0].passiveRadiator.cmsMmN, 0.58);
    assert.equal(result.results[0].passiveRadiator.xmaxMm, 10.5);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("passive radiator scraper extracts parameters from a direct PDF datasheet URL", async () => {
  const pdf = createSimplePdf([
    "Passive Radiator Parameters",
    "Fs 25 Hz Qms 7.4 Mms 88 g Cms 0.46 mm/N",
    "Sd 211 cm2 Xmax 12 mm",
  ].join("\n"));
  const server = createServer((request, response) => {
    response.writeHead(200, { "Content-Type": "application/pdf" });
    response.end(pdf);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    const { port } = server.address();
    const result = await searchPassiveRadiators(`http://127.0.0.1:${port}/pr-datasheet.pdf`);
    assert.equal(result.directUrl, true);
    assert.equal(result.results.length, 1);
    assert.equal(result.results[0].passiveRadiator.fs, 25);
    assert.equal(result.results[0].passiveRadiator.mmsG, 88);
    assert.equal(result.results[0].passiveRadiator.sdCm2, 211);
    assert.equal(result.results[0].passiveRadiator.xmaxMm, 12);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
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

test("4th order bandpass simulation returns finite front port output", () => {
  const project = structuredClone(sampleProject);
  project.box.bandpass = {
    ...project.box.bandpass,
    order: 4,
    rearVolumeL: 24,
    frontVolumeL: 18,
    frontFb: 58,
    frontPortDiameterCm: 8,
  };
  const result = simulateBandpass(driver, project.box, frequencies);
  assert.equal(result.kind, "bandpass");
  assert.equal(result.bandpass.order, 4);
  assert.equal(result.spl.length, frequencies.length);
  assert.ok(result.spl.every(Number.isFinite));
  assert.ok(Math.max(...result.portVelocity) > 0);
  assert.equal(Math.max(...result.rearPortVelocity), 0);
});

test("6th order bandpass simulation includes rear port output", () => {
  const project = structuredClone(sampleProject);
  project.box.bandpass = {
    ...project.box.bandpass,
    order: 6,
    rearVolumeL: 28,
    frontVolumeL: 16,
    frontFb: 62,
    rearFb: 32,
    frontPortDiameterCm: 8,
    rearPortDiameterCm: 8,
  };
  const result = simulateBandpass(driver, project.box, frequencies);
  assert.equal(result.bandpass.order, 6);
  assert.ok(result.spl.every(Number.isFinite));
  assert.ok(Math.max(...result.portVelocity) > 0);
  assert.ok(Math.max(...result.rearPortVelocity) > 0);
});

test("passive radiator output sums externally without a cancellation notch above tuning", () => {
  const project = structuredClone(sampleProject);
  project.mode = "passive";
  project.box.passiveRadiator = { ...knownPassiveRadiators[0].passiveRadiator, count: 1 };
  const result = simulatePassiveRadiator(driver, project.box, frequencies);
  const at30 = nearestFrequencyValue(frequencies, result.spl, 30);
  const at40 = nearestFrequencyValue(frequencies, result.spl, 40);
  const at50 = nearestFrequencyValue(frequencies, result.spl, 50);
  assert.ok(at40 > at30 - 2);
  assert.ok(at40 > at50 - 4);
});

test("passive radiator mass-only limit matches an equivalent vented port", () => {
  const project = structuredClone(sampleProject);
  project.box.volumeL = 48;
  project.box.fb = 34;
  project.box.portDiameterCm = 8;
  project.box.qp = 1e9;
  project.box.ql = 1e9;
  project.box.qa = 1e9;

  const port = portLengthFromTuning(project.box.volumeL, project.box.fb, project.box.portDiameterCm, project.box.portEndCorrection);
  const acousticMass = (AIR_DENSITY * port.effectiveLength) / portArea(project.box.portDiameterCm);
  const passiveSdCm2 = 211.2;
  const passiveSd = passiveSdCm2 / 10000;
  project.box.passiveRadiator = {
    fs: 0.01,
    qms: 1e9,
    mmsG: acousticMass * passiveSd ** 2 * 1000,
    cmsMmN: 1e9,
    sdCm2: passiveSdCm2,
    xmaxMm: 1000,
    count: 1,
  };

  const vented = simulateVented(driver, project.box, frequencies);
  const passive = simulatePassiveRadiator(driver, project.box, frequencies);
  const maxSplDifference = Math.max(...passive.spl.map((value, index) => Math.abs(value - vented.spl[index])));
  assert.ok(maxSplDifference < 1e-4);
});

test("enclosure validation reports extreme losses", () => {
  const warnings = validateEnclosureOptions({ volumeL: 20, seriesResistanceOhm: 1.2, fillPercent: 90, qa: 10, ql: 3, portEndCorrection: 2.5 }, "vented");
  assert.ok(warnings.length >= 4);
});

test("planner normalizes printed port fabrication limits", () => {
  const inventory = normalizeInventory({
    driverCount: 1.2,
    preference: "deep",
    alignment: "passive",
    portFabrication: { minDiameterCm: 9, maxDiameterCm: 6, bendAllowed: false },
  });
  assert.equal(inventory.driverCount, 1);
  assert.equal(inventory.preference, "deep");
  assert.equal(inventory.alignment, "passive");
  assert.equal(inventory.portFabrication.maxDiameterCm, 9);
  assert.equal(inventory.portFabrication.bendAllowed, false);
});

test("planner max volume limit can be disabled", () => {
  const limited = normalizeInventory({ constraints: { hasMaxVolume: true, maxVolumeL: 42 } });
  const unlimited = normalizeInventory({ constraints: { hasMaxVolume: false, maxVolumeL: 42 } });
  assert.equal(maxBuildableVolumeLiters(limited), 42);
  assert.equal(maxBuildableVolumeLiters(unlimited), Number.POSITIVE_INFINITY);
});

test("planner returns addable enclosure candidates with printed port geometry", () => {
  const candidates = planDesigns(driver, sampleProject.inventory, sampleProject.box);
  assert.ok(candidates.length >= 2);
  assert.ok(candidates.some((candidate) => candidate.mode === "sealed"));
  assert.ok(candidates.some((candidate) => candidate.mode === "passive"));
  const vented = candidates.find((candidate) => candidate.mode === "vented");
  assert.ok(vented);
  assert.ok(vented.box.volumeL > 0);
  assert.ok(vented.box.fb > 0);
  assert.ok(vented.port.physicalLengthCm > 0);
  assert.ok(vented.notes.some((note) => note.includes("Printed round port")));
});

test("planner prefers resonant alignments for deep bass when available", () => {
  const candidates = planDesigns(driver, { ...sampleProject.inventory, preference: "deep" }, sampleProject.box);
  assert.ok(candidates.some((candidate) => candidate.mode === "vented"));
  assert.ok(candidates.some((candidate) => candidate.mode === "passive"));
  assert.notEqual(candidates[0].mode, "sealed");
});

test("planner respects explicit sealed, vented, or passive alignment choices", () => {
  const sealed = planDesigns(driver, { ...sampleProject.inventory, alignment: "sealed", preference: "deep" }, sampleProject.box);
  const vented = planDesigns(driver, { ...sampleProject.inventory, alignment: "vented", preference: "balanced" }, sampleProject.box);
  const passive = planDesigns(driver, { ...sampleProject.inventory, alignment: "passive", preference: "balanced" }, sampleProject.box);
  assert.ok(sealed.length > 0);
  assert.ok(vented.length > 0);
  assert.ok(passive.length > 0);
  assert.ok(sealed.every((candidate) => candidate.mode === "sealed"));
  assert.ok(vented.every((candidate) => candidate.mode === "vented"));
  assert.ok(passive.every((candidate) => candidate.mode === "passive"));
  assert.ok(passive[0].box.passiveRadiator.mmsG > 0);
  assert.ok(passive[0].notes.some((note) => note.includes("PR peak excursion")));
});

function createSimplePdf(text) {
  const lines = String(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const commands = lines.map((line, index) => {
    const escaped = line.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    return `${index === 0 ? "" : "0 -16 Td " }(${escaped}) Tj`;
  }).join(" ");
  const stream = `BT /F1 12 Tf 40 750 Td ${commands} ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream, "ascii")} >>\nstream\n${stream}\nendstream`,
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(body, "ascii"));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(body, "ascii");
  body += `xref\n0 ${objects.length + 1}\n`;
  body += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(body, "ascii");
}

function createZip(entries) {
  const chunks = [];
  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const content = Buffer.from(entry.text, "utf8");
    const compressed = deflateRawSync(content);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0, 6);
    header.writeUInt16LE(8, 8);
    header.writeUInt32LE(0, 10);
    header.writeUInt32LE(0, 14);
    header.writeUInt32LE(compressed.length, 18);
    header.writeUInt32LE(content.length, 22);
    header.writeUInt16LE(name.length, 26);
    header.writeUInt16LE(0, 28);
    chunks.push(header, name, compressed);
  }
  return Buffer.concat(chunks);
}

function createPositionedPdf(items) {
  const commands = items.map(({ x, y, text }) => {
    const escaped = String(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    return `1 0 0 1 ${Number(x)} ${Number(y)} Tm (${escaped}) Tj`;
  }).join(" ");
  const stream = `BT /F1 12 Tf ${commands} ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream, "ascii")} >>\nstream\n${stream}\nendstream`,
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(body, "ascii"));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(body, "ascii");
  body += `xref\n0 ${objects.length + 1}\n`;
  body += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(body, "ascii");
}
