import { logFrequencyVector, nearestFrequencyValue } from "../frequency.js";
import { simulatePassiveRadiator } from "../passiveRadiatorBox.js";
import { excursionLimitedSpl, excursionLimitedValues, recommendedLowFrequencyLimit } from "../realism.js";
import { closedAlignment, simulateSealed, targetClosedVolumeLiters } from "../sealedBox.js";
import { simulateVented } from "../ventedBox.js";
import { estimateBoxDimensions, maxBuildableVolumeLiters, normalizeInventory } from "./componentInventory.js";

const plannerFrequencies = logFrequencyVector(10, 1000, 180);
const COARSE_GRID = { volume: 9, tuning: 10, port: 8 };
const FINE_GRID = { volume: 5, tuning: 5, port: 5 };
const FINE_TOP_COUNT = 18;

export function planDesigns(driver, inventoryInput = {}, baseBox = {}) {
  const inventory = normalizeInventory(inventoryInput);
  const candidates = [];
  if (inventory.alignment === "auto" || inventory.alignment === "sealed") {
    candidates.push(...planSealedDesigns(driver, inventory, baseBox));
  }
  if (inventory.alignment === "auto" || inventory.alignment === "vented") {
    candidates.push(...planVentedDesigns(driver, inventory, baseBox));
  }
  if (inventory.alignment === "auto" || inventory.alignment === "passive") {
    candidates.push(...planPassiveRadiatorDesigns(driver, inventory, baseBox));
  }
  const sorted = candidates
    .filter((candidate) => Number.isFinite(candidate.score))
    .sort((left, right) => right.score - left.score);
  return diverseTopCandidates(sorted, 6);
}

export function planSealedDesigns(driver, inventory, baseBox = {}) {
  const qtcTargets = sealedTargetsForPreference(inventory.preference);
  return qtcTargets
    .map((target) => {
      const volumeL = targetClosedVolumeLiters(driver, target.qtc);
      if (!Number.isFinite(volumeL)) return null;
      const box = { ...baseBox, volumeL: round(volumeL, 1) };
      const alignment = closedAlignment(driver, box.volumeL, box.fillPercent || 0);
      const dimensions = estimateBoxDimensions(box.volumeL, inventory);
      const simulation = simulateSealed(driver, box, plannerFrequencies);
      const maxExcursionMm = Math.max(...simulation.excursionMm);
      const driverXmaxMm = driver.xmax * 1000;
      const limitedSpl = realisticSplForDriver(driver, simulation);
      const warnings = [];
      if (!dimensions.fits) warnings.push("Box exceeds build envelope");
      if (maxExcursionMm > driverXmaxMm) warnings.push(`Xmax exceeded: ${maxExcursionMm.toFixed(1)} mm`);
      const lowFrequencyLimit = recommendedLowFrequencyLimit(driver);
      if (lowFrequencyLimit > 200) warnings.push(`Driver usable from ${lowFrequencyLimit.toFixed(0)} Hz`);
      const score = scoreCandidate({
        preference: inventory.preference,
        mode: "sealed",
        dimensions,
        warnings,
        volumeL: box.volumeL,
        maxVolumeL: maxBuildableVolumeLiters(inventory),
        alignment,
        lowCutoffHz: lowCutoffFrequency(plannerFrequencies, limitedSpl, 6),
        lowFrequencyLimit,
        maxExcursionMm,
        driverXmaxMm,
      });

      return {
        mode: "sealed",
        name: `${box.volumeL.toFixed(0)} L Sealed ${target.label}`,
        box,
        score,
        dimensions,
        metrics: {
          qtc: alignment.qtc,
          fc: alignment.fc,
          lowCutoffHz: lowCutoffFrequency(plannerFrequencies, limitedSpl, 6),
          maxExcursionMm,
        },
        notes: [`Qtc ${alignment.qtc.toFixed(2)}`, `Fc ${alignment.fc.toFixed(1)} Hz`, "No port required"],
        warnings,
      };
    })
    .filter(Boolean);
}

export function planVentedDesigns(driver, inventory, baseBox = {}) {
  if (driver.qts > 0.75) return [];

  const maxVolume = maxBuildableVolumeLiters(inventory);
  const bounds = ventedSearchBounds(driver, inventory, maxVolume);
  const coarseCandidates = searchVentedGrid(driver, inventory, baseBox, bounds, COARSE_GRID, maxVolume);
  const refinedCandidates = refineVentedCandidates(driver, inventory, baseBox, bounds, coarseCandidates, maxVolume);

  return dedupeByShape([...refinedCandidates, ...coarseCandidates])
    .sort((left, right) => right.score - left.score)
    .slice(0, 4);
}

export function planPassiveRadiatorDesigns(driver, inventory, baseBox = {}) {
  const passive = baseBox.passiveRadiator || {};
  if (!passive.sdCm2 || !passive.xmaxMm || (!passive.mmsG && !passive.fs)) return [];

  const maxVolume = maxBuildableVolumeLiters(inventory);
  const bounds = passiveSearchBounds(driver, inventory, maxVolume);
  const candidates = [];
  const basePassive = normalizePlannerPassive(passive);

  for (const volumeL of rangeValues(bounds.volume[0], bounds.volume[1], COARSE_GRID.volume)) {
    for (const targetFs of rangeValues(bounds.tuning[0], bounds.tuning[1], COARSE_GRID.tuning)) {
      for (const count of passiveCountValues(basePassive.count)) {
        const candidate = evaluatePassiveCandidate(driver, inventory, baseBox, basePassive, { volumeL, targetFs, count }, maxVolume);
        if (candidate) candidates.push(candidate);
      }
    }
  }

  return dedupeByShape(candidates)
    .sort((left, right) => right.score - left.score)
    .slice(0, 4);
}

function sealedTargetsForPreference(preference) {
  if (preference === "compact") return [{ qtc: 0.86, label: "Compact" }, { qtc: 0.76, label: "Balanced" }];
  if (preference === "deep") return [{ qtc: 0.64, label: "Deep" }, { qtc: 0.707, label: "Balanced" }];
  if (preference === "loud") return [{ qtc: 0.78, label: "Controlled" }, { qtc: 0.707, label: "Balanced" }];
  return [{ qtc: 0.707, label: "Balanced" }, { qtc: 0.8, label: "Compact" }];
}

function ventedSearchBounds(driver, inventory, maxVolume) {
  const vasL = driver.vas * 1000;
  const volumeProfiles = {
    compact: [0.18, 0.75],
    balanced: [0.28, 1.15],
    deep: [0.42, 1.75],
    loud: [0.32, 1.35],
  };
  const tuningProfiles = {
    compact: [0.95, 1.45],
    balanced: [0.7, 1.2],
    deep: [0.5, 0.95],
    loud: [0.72, 1.15],
  };
  const volumeProfile = volumeProfiles[inventory.preference] || volumeProfiles.balanced;
  const tuningProfile = tuningProfiles[inventory.preference] || tuningProfiles.balanced;
  const naturalMaxVolume = clamp(vasL * volumeProfile[1], 8, 240);
  const maxVolumeL = Number.isFinite(maxVolume) ? Math.max(4, Math.min(maxVolume, naturalMaxVolume)) : naturalMaxVolume;
  const minVolumeL = Math.min(maxVolumeL, Math.max(4, vasL * volumeProfile[0]));

  return {
    volume: [round(minVolumeL, 1), round(maxVolumeL, 1)],
    tuning: [round(clamp(driver.fs * tuningProfile[0], 14, 95), 1), round(clamp(driver.fs * tuningProfile[1], 16, 110), 1)],
    port: [inventory.portFabrication.minDiameterCm, inventory.portFabrication.maxDiameterCm],
  };
}

function searchVentedGrid(driver, inventory, baseBox, bounds, grid, maxVolume) {
  const candidates = [];
  for (const volumeL of rangeValues(bounds.volume[0], bounds.volume[1], grid.volume)) {
    for (const fb of rangeValues(bounds.tuning[0], bounds.tuning[1], grid.tuning)) {
      for (const diameterCm of rangeValues(bounds.port[0], bounds.port[1], grid.port)) {
        const candidate = evaluateVentedCandidate(driver, inventory, baseBox, { volumeL, fb, diameterCm }, maxVolume);
        if (candidate) candidates.push(candidate);
      }
    }
  }
  return candidates;
}

function refineVentedCandidates(driver, inventory, baseBox, bounds, candidates, maxVolume) {
  const topCandidates = dedupeByShape(candidates)
    .sort((left, right) => right.score - left.score)
    .slice(0, FINE_TOP_COUNT);
  const volumeStep = gridStep(bounds.volume, COARSE_GRID.volume);
  const tuningStep = gridStep(bounds.tuning, COARSE_GRID.tuning);
  const portStep = gridStep(bounds.port, COARSE_GRID.port);
  const refined = [];
  const seen = new Set();

  for (const candidate of topCandidates) {
    const localBounds = {
      volume: clampBounds([candidate.box.volumeL - volumeStep, candidate.box.volumeL + volumeStep], bounds.volume),
      tuning: clampBounds([candidate.box.fb - tuningStep, candidate.box.fb + tuningStep], bounds.tuning),
      port: clampBounds([candidate.box.portDiameterCm - portStep, candidate.box.portDiameterCm + portStep], bounds.port),
    };
    for (const volumeL of rangeValues(localBounds.volume[0], localBounds.volume[1], FINE_GRID.volume)) {
      for (const fb of rangeValues(localBounds.tuning[0], localBounds.tuning[1], FINE_GRID.tuning)) {
        for (const diameterCm of rangeValues(localBounds.port[0], localBounds.port[1], FINE_GRID.port)) {
          const key = `${round(volumeL, 2)}:${round(fb, 2)}:${round(diameterCm, 2)}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const refinedCandidate = evaluateVentedCandidate(driver, inventory, baseBox, { volumeL, fb, diameterCm }, maxVolume);
          if (refinedCandidate) refined.push(refinedCandidate);
        }
      }
    }
  }

  return refined;
}

function evaluateVentedCandidate(driver, inventory, baseBox, values, maxVolume) {
  const box = {
    ...baseBox,
    volumeL: round(values.volumeL, 1),
    fb: round(values.fb, 1),
    portDiameterCm: round(values.diameterCm, 2),
    portEndCorrection: inventory.portFabrication.flareAllowed ? 1.7 : 1.46,
  };
  const simulation = simulateVented(driver, box, plannerFrequencies);
  const physicalLengthCm = simulation.port.physicalLength * 100;
  if (!Number.isFinite(physicalLengthCm) || physicalLengthCm <= 0) return null;
  if (physicalLengthCm > inventory.constraints.maxPortLengthCm && !inventory.portFabrication.bendAllowed) return null;

  const maxExcursionMm = Math.max(...simulation.excursionMm);
  const driverXmaxMm = driver.xmax * 1000;
  const realisticSpl = realisticSplForDriver(driver, simulation);
  const linearPortVelocity = excursionLimitedValues(simulation.portVelocity, simulation.excursionMm, driverXmaxMm);
  const maxPortVelocity = Math.max(...linearPortVelocity);
  const dimensions = estimateBoxDimensions(box.volumeL, inventory);
  const warnings = [];
  if (!dimensions.fits) warnings.push("Box exceeds build envelope");
  if (physicalLengthCm > inventory.constraints.maxPortLengthCm) {
    warnings.push(`Folded port needed: ${physicalLengthCm.toFixed(1)} cm path`);
  }
  if (maxExcursionMm > driverXmaxMm) warnings.push(`Xmax exceeded: ${maxExcursionMm.toFixed(1)} mm`);
  const lowFrequencyLimit = recommendedLowFrequencyLimit(driver);
  if (lowFrequencyLimit > 200) warnings.push(`Driver usable from ${lowFrequencyLimit.toFixed(0)} Hz`);
  if (maxPortVelocity > inventory.constraints.maxPortVelocityMs) {
    warnings.push(`Port velocity ${maxPortVelocity.toFixed(1)} m/s exceeds target`);
  }

  const metrics = {
    fb: box.fb,
    maxPortVelocity,
    maxExcursionMm,
    splAt40Hz: nearestFrequencyValue(plannerFrequencies, realisticSpl, 40),
    lowCutoffHz: lowCutoffFrequency(plannerFrequencies, realisticSpl, 6),
  };
  const port = {
    shape: "round",
    diameterCm: box.portDiameterCm,
    outerDiameterCm: box.portDiameterCm + (Number(inventory.portFabrication.wallThicknessMm) / 10) * 2,
    physicalLengthCm,
    effectiveLengthCm: simulation.port.effectiveLength * 100,
    endCorrectionCm: simulation.port.endCorrection * 100,
    flareRadiusCm: inventory.portFabrication.flareAllowed ? Math.max(0.8, box.portDiameterCm * 0.12) : 0,
    warnings: warnings.filter((warning) => warning.startsWith("Folded port") || warning.startsWith("Port velocity")),
  };
  const score = scoreCandidate({
    preference: inventory.preference,
    mode: "vented",
    dimensions,
    warnings,
    volumeL: box.volumeL,
    maxVolumeL: maxVolume,
    fb: box.fb,
    lowCutoffHz: metrics.lowCutoffHz,
    maxPortVelocity,
    targetPortVelocity: inventory.constraints.maxPortVelocityMs,
    maxPortLengthCm: inventory.constraints.maxPortLengthCm,
    port,
    lowFrequencyLimit,
    maxExcursionMm,
    driverXmaxMm,
  });

  return {
    mode: "vented",
    name: `${box.volumeL.toFixed(0)} L Vented ${ventedLabel(inventory.preference)}`,
    box,
    score,
    dimensions,
    port,
    metrics,
    notes: [
      `Fb ${box.fb.toFixed(1)} Hz`,
      `Printed round port ${Math.round(port.diameterCm * 10)} mm ID x ${port.physicalLengthCm.toFixed(1)} cm`,
      `Peak port velocity ${maxPortVelocity.toFixed(1)} m/s`,
    ],
    warnings,
  };
}

function passiveSearchBounds(driver, inventory, maxVolume) {
  const vasL = driver.vas * 1000;
  const volumeProfiles = {
    compact: [0.18, 0.8],
    balanced: [0.3, 1.25],
    deep: [0.42, 1.85],
    loud: [0.32, 1.45],
  };
  const tuningProfiles = {
    compact: [0.85, 1.35],
    balanced: [0.62, 1.08],
    deep: [0.45, 0.88],
    loud: [0.62, 1.0],
  };
  const volumeProfile = volumeProfiles[inventory.preference] || volumeProfiles.balanced;
  const tuningProfile = tuningProfiles[inventory.preference] || tuningProfiles.balanced;
  const naturalMaxVolume = clamp(vasL * volumeProfile[1], 8, 260);
  const maxVolumeL = Number.isFinite(maxVolume) ? Math.max(4, Math.min(maxVolume, naturalMaxVolume)) : naturalMaxVolume;
  const minVolumeL = Math.min(maxVolumeL, Math.max(4, vasL * volumeProfile[0]));

  return {
    volume: [round(minVolumeL, 1), round(maxVolumeL, 1)],
    tuning: [round(clamp(driver.fs * tuningProfile[0], 12, 80), 1), round(clamp(driver.fs * tuningProfile[1], 14, 95), 1)],
  };
}

function evaluatePassiveCandidate(driver, inventory, baseBox, basePassive, values, maxVolume) {
  const passiveRadiator = passiveRadiatorForTargetFs(basePassive, values.targetFs, values.count);
  const box = {
    ...baseBox,
    volumeL: round(values.volumeL, 1),
    passiveRadiator,
  };
  const simulation = simulatePassiveRadiator(driver, box, plannerFrequencies);
  const maxExcursionMm = Math.max(...simulation.excursionMm);
  const driverXmaxMm = driver.xmax * 1000;
  const realisticSpl = realisticSplForDriver(driver, simulation);
  const maxPassiveExcursionMm = Math.max(...simulation.passiveRadiatorExcursionMm);
  const dimensions = estimateBoxDimensions(box.volumeL, inventory);
  const warnings = [];
  if (!dimensions.fits) warnings.push("Box exceeds build envelope");
  if (maxExcursionMm > driverXmaxMm) warnings.push(`Xmax exceeded: ${maxExcursionMm.toFixed(1)} mm`);
  const lowFrequencyLimit = recommendedLowFrequencyLimit(driver);
  if (lowFrequencyLimit > 200) warnings.push(`Driver usable from ${lowFrequencyLimit.toFixed(0)} Hz`);
  if (maxPassiveExcursionMm > passiveRadiator.xmaxMm) warnings.push(`PR Xmax exceeded: ${maxPassiveExcursionMm.toFixed(1)} mm`);

  const metrics = {
    passiveFs: passiveRadiator.fs,
    passiveCount: passiveRadiator.count,
    passiveMmsG: passiveRadiator.mmsG,
    maxExcursionMm,
    maxPassiveExcursionMm,
    splAt40Hz: nearestFrequencyValue(plannerFrequencies, realisticSpl, 40),
    lowCutoffHz: lowCutoffFrequency(plannerFrequencies, realisticSpl, 6),
  };
  const score = scoreCandidate({
    preference: inventory.preference,
    mode: "passive",
    dimensions,
    warnings,
    volumeL: box.volumeL,
    maxVolumeL: maxVolume,
    lowCutoffHz: metrics.lowCutoffHz,
    maxPassiveExcursionMm,
    passiveXmaxMm: passiveRadiator.xmaxMm,
    passiveCount: passiveRadiator.count,
    lowFrequencyLimit,
    maxExcursionMm,
    driverXmaxMm,
  });

  return {
    mode: "passive",
    name: `${box.volumeL.toFixed(0)} L Passive ${passiveRadiator.fs.toFixed(1)} Hz ${passiveLabel(inventory.preference)}`,
    box,
    score,
    dimensions,
    metrics,
    notes: [
      `${passiveRadiator.count} passive radiator${passiveRadiator.count === 1 ? "" : "s"}`,
      `PR Fs ${passiveRadiator.fs.toFixed(1)} Hz`,
      `PR moving mass ${passiveRadiator.mmsG.toFixed(1)} g`,
      `PR peak excursion ${maxPassiveExcursionMm.toFixed(1)} mm`,
    ],
    warnings,
  };
}

function normalizePlannerPassive(passive) {
  const fs = positiveOrDefault(passive.fs, 24);
  const mmsG = positiveOrDefault(passive.mmsG, 80);
  const cmsMmN = passive.cmsMmN ? positiveOrDefault(passive.cmsMmN, 0.6) : 1000 / (mmsG / 1000 * (2 * Math.PI * fs) ** 2);
  return {
    ...passive,
    fs,
    mmsG,
    cmsMmN,
    qms: positiveOrDefault(passive.qms, 7),
    sdCm2: positiveOrDefault(passive.sdCm2, 200),
    xmaxMm: positiveOrDefault(passive.xmaxMm, 8),
    count: Math.max(1, Math.round(positiveOrDefault(passive.count, 1))),
  };
}

function passiveRadiatorForTargetFs(basePassive, targetFs, count) {
  const mmsG = 1000000 / ((2 * Math.PI * targetFs) ** 2 * basePassive.cmsMmN);
  return {
    ...basePassive,
    fs: round(targetFs, 1),
    mmsG: round(mmsG, 1),
    count,
  };
}

function passiveCountValues(baseCount) {
  return [...new Set([baseCount, baseCount + 1, baseCount + 2, baseCount * 2].map((value) => Math.max(1, Math.min(4, Math.round(value)))))];
}

function realisticSplForDriver(driver, simulation) {
  return excursionLimitedSpl(simulation.spl, simulation.excursionMm, driver.xmax * 1000);
}

function scoreCandidate(input) {
  let score = 100;
  if (!input.dimensions.fits) score -= 28;
  score -= input.warnings.length * 12;
  if (input.driverXmaxMm > 0 && input.maxExcursionMm > 0) {
    const excursionRatio = input.maxExcursionMm / input.driverXmaxMm;
    score -= Math.max(0, excursionRatio - 0.8) * 22;
    score -= Math.max(0, excursionRatio - 2) * 18;
  }
  if (input.maxVolumeL > 0) score -= Math.max(0, input.volumeL / input.maxVolumeL - 0.72) * 30;
  if (input.mode === "vented") {
    score -= Math.max(0, input.maxPortVelocity / input.targetPortVelocity - 0.9) * 30;
    score -= Math.max(0, input.port.physicalLengthCm / input.maxPortLengthCm - 0.9) * 24;
    if (input.preference === "deep") score -= Math.max(0, input.fb - 32) * 0.45;
    if (input.preference === "deep") score += Math.max(0, 42 - input.lowCutoffHz) * 0.55;
    if (input.preference === "balanced") score -= Math.abs(input.fb - 0.9 * input.lowCutoffHz) * 0.05;
    if (input.preference === "compact") score -= Math.max(0, input.volumeL - input.maxVolumeL * 0.45) * 0.2;
  }
  if (input.mode === "passive") {
    if (input.passiveXmaxMm > 0) score -= Math.max(0, input.maxPassiveExcursionMm / input.passiveXmaxMm - 0.85) * 32;
    if (input.preference === "deep") score += Math.max(0, 42 - input.lowCutoffHz) * 0.45;
    if (input.preference === "compact") score -= Math.max(0, input.volumeL - input.maxVolumeL * 0.5) * 0.18;
    if (input.preference === "loud") score += Math.min(12, input.passiveCount * 2);
  }
  if (input.mode === "sealed" && input.preference === "deep") score -= 30;
  if (input.preference === "deep" && Number.isFinite(input.lowCutoffHz)) score -= Math.max(0, input.lowCutoffHz - 55) * 0.18;
  if (Number(input.lowFrequencyLimit) > 200) score -= Math.min(80, (Number(input.lowFrequencyLimit) - 200) * 0.08);
  return Math.max(0, score);
}

function diverseTopCandidates(candidates, limit) {
  const selected = [];
  for (const mode of ["sealed", "vented", "passive"]) {
    const candidate = candidates.find((item) => item.mode === mode);
    if (candidate) selected.push(candidate);
  }
  for (const candidate of candidates) {
    if (selected.length >= limit) break;
    if (!selected.includes(candidate)) selected.push(candidate);
  }
  return selected.sort((left, right) => right.score - left.score).slice(0, limit);
}

function dedupeByShape(candidates) {
  const buckets = new Map();
  for (const candidate of candidates) {
    const tuning = candidate.mode === "passive" ? candidate.box.passiveRadiator?.fs : candidate.box.fb;
    const key = `${candidate.mode}-${Math.round(candidate.box.volumeL / 5) * 5}-${Math.round(Number(tuning || 0) / 3) * 3}`;
    const previous = buckets.get(key);
    if (!previous || candidate.score > previous.score) buckets.set(key, candidate);
  }
  return [...buckets.values()];
}

function lowCutoffFrequency(frequencies, spl, dropDb = 6) {
  const referenceValues = frequencies
    .map((frequency, index) => ({ frequency, value: spl[index] }))
    .filter((item) => item.frequency >= 120 && item.frequency <= 250)
    .map((item) => item.value);
  const reference = referenceValues.length ? average(referenceValues) : Math.max(...spl);
  const threshold = reference - dropDb;
  const candidate = frequencies
    .map((frequency, index) => ({ frequency, value: spl[index] }))
    .find((item) => item.frequency >= 10 && item.value >= threshold);
  return candidate?.frequency || frequencies[frequencies.length - 1];
}

function rangeValues(min, max, count) {
  if (count <= 1 || Math.abs(max - min) < 1e-9) return [round(min, 3)];
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, index) => round(min + step * index, 3)).filter(uniqueFinite);
}

function gridStep(bounds, count) {
  return count <= 1 ? 0 : (bounds[1] - bounds[0]) / (count - 1);
}

function clampBounds(bounds, limit) {
  const min = clamp(bounds[0], limit[0], limit[1]);
  const max = clamp(bounds[1], limit[0], limit[1]);
  return min <= max ? [min, max] : [max, min];
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function ventedLabel(preference) {
  if (preference === "compact") return "Compact";
  if (preference === "deep") return "Deep";
  if (preference === "loud") return "Output";
  return "Balanced";
}

function passiveLabel(preference) {
  if (preference === "compact") return "Compact";
  if (preference === "deep") return "Deep";
  if (preference === "loud") return "Output";
  return "Balanced";
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function positiveOrDefault(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function round(value, decimals = 0) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function uniqueFinite(value, index, values) {
  return Number.isFinite(value) && values.indexOf(value) === index;
}
