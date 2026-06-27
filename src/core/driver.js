import {
  AIR_DENSITY,
  SPEED_OF_SOUND,
  cm2ToSquareMeters,
  gramsToKg,
  litersToCubicMeters,
  mhToHenry,
  mmToMeters,
} from "./constants.js";

const REQUIRED_DRIVER_INPUTS = [
  ["re", "Re"],
  ["fs", "Fs"],
  ["qms", "Qms"],
  ["qes", "Qes"],
  ["vasL", "Vas"],
  ["sdCm2", "Sd"],
  ["xmaxMm", "Xmax"],
  ["mmsG", "Mms"],
  ["bl", "Bl"],
];

export function normalizeDriver(input) {
  const completed = deriveDriverParameters(input);
  const driver = {
    re: Number(completed.re),
    le: mhToHenry(Number(completed.leMh)),
    fs: Number(completed.fs),
    qms: Number(completed.qms),
    qes: Number(completed.qes),
    vas: litersToCubicMeters(Number(completed.vasL)),
    sd: cm2ToSquareMeters(Number(completed.sdCm2)),
    xmax: mmToMeters(Number(completed.xmaxMm)),
    mms: gramsToKg(Number(completed.mmsG)),
    bl: Number(completed.bl),
    minFrequencyHz: Number(completed.minFrequencyHz),
    maxFrequencyHz: Number(completed.maxFrequencyHz),
  };

  const omega = 2 * Math.PI * driver.fs;
  driver.qts = (driver.qms * driver.qes) / (driver.qms + driver.qes);
  driver.cms = driver.vas / (AIR_DENSITY * SPEED_OF_SOUND ** 2 * driver.sd ** 2);
  driver.rms = (omega * driver.mms) / driver.qms;
  driver.derivedBl = Math.sqrt((omega * driver.mms * driver.re) / driver.qes);
  driver.derivedMms = 1 / (driver.cms * omega ** 2);
  return driver;
}

export function deriveDriverParameters(input = {}) {
  const next = { ...input };
  const analysis = analyzeDriverParameters(input);
  if (!positiveNumber(next.mmsG) && positiveNumber(analysis.derived.mmsG)) {
    next.mmsG = roundDriverValue(analysis.derived.mmsG);
  }
  if (!positiveNumber(next.bl) && positiveNumber(analysis.derived.bl)) {
    next.bl = roundDriverValue(analysis.derived.bl);
  }
  return next;
}

export function analyzeDriverParameters(input = {}) {
  const values = {
    re: positiveOrNaN(input.re),
    fs: positiveOrNaN(input.fs),
    qms: positiveOrNaN(input.qms),
    qes: positiveOrNaN(input.qes),
    vasL: positiveOrNaN(input.vasL),
    sdCm2: positiveOrNaN(input.sdCm2),
    xmaxMm: positiveOrNaN(input.xmaxMm),
    mmsG: positiveOrNaN(input.mmsG),
    bl: positiveOrNaN(input.bl),
  };
  const derived = {};
  const issues = [];
  const fieldIssues = {};

  REQUIRED_DRIVER_INPUTS.forEach(([key, label]) => {
    if (!positiveNumber(values[key])) {
      addDriverIssue(issues, fieldIssues, {
        key,
        severity: "error",
        message: `${label} must be positive`,
      });
    }
  });

  if (positiveNumber(values.qms) && positiveNumber(values.qes)) {
    derived.qts = (values.qms * values.qes) / (values.qms + values.qes);
  }

  if (positiveNumber(values.vasL) && positiveNumber(values.sdCm2)) {
    const cms = litersToCubicMeters(values.vasL) / (AIR_DENSITY * SPEED_OF_SOUND ** 2 * cm2ToSquareMeters(values.sdCm2) ** 2);
    derived.cmsMmN = cms * 1000;
  }

  if (positiveNumber(values.fs) && positiveNumber(derived.cmsMmN)) {
    const cms = derived.cmsMmN / 1000;
    derived.mmsG = (1 / (cms * (2 * Math.PI * values.fs) ** 2)) * 1000;
    if (!positiveNumber(values.mmsG)) {
      addDriverIssue(issues, fieldIssues, {
        key: "mmsG",
        severity: "info",
        message: `Mms can be derived as ${formatDriverAnalysisValue(derived.mmsG)} g`,
      });
    } else {
      addRelativeDriverCheck(issues, fieldIssues, "mmsG", "Mms", values.mmsG, derived.mmsG, 0.25, "Vas/Sd/Fs");
    }
  }

  const mmsForBl = positiveNumber(values.mmsG) ? values.mmsG : derived.mmsG;
  if (positiveNumber(values.re) && positiveNumber(values.fs) && positiveNumber(values.qes) && positiveNumber(mmsForBl)) {
    derived.bl = Math.sqrt((2 * Math.PI * values.fs * gramsToKg(mmsForBl) * values.re) / values.qes);
    if (!positiveNumber(values.bl)) {
      addDriverIssue(issues, fieldIssues, {
        key: "bl",
        severity: "info",
        message: `Bl can be derived as ${formatDriverAnalysisValue(derived.bl)} Tm`,
      });
    } else {
      addRelativeDriverCheck(issues, fieldIssues, "bl", "Bl", values.bl, derived.bl, 0.18, "Re/Fs/Mms/Qes");
    }
  }

  return {
    values,
    derived,
    issues,
    fieldIssues,
  };
}

function addRelativeDriverCheck(issues, fieldIssues, key, label, actual, expected, threshold, sourceLabel) {
  if (!positiveNumber(actual) || !positiveNumber(expected)) return;
  const error = Math.abs(expected - actual) / actual;
  if (error <= threshold) return;
  addDriverIssue(issues, fieldIssues, {
    key,
    severity: "warning",
    message: `${label} differs from ${sourceLabel} derived value by ${(error * 100).toFixed(0)}%`,
  });
}

function addDriverIssue(issues, fieldIssues, issue) {
  issues.push(issue);
  const current = fieldIssues[issue.key];
  if (!current || driverSeverityRank(issue.severity) > driverSeverityRank(current.severity)) {
    fieldIssues[issue.key] = issue;
  }
}

function driverSeverityRank(severity) {
  if (severity === "error") return 3;
  if (severity === "warning") return 2;
  if (severity === "info") return 1;
  return 0;
}

function positiveOrNaN(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : NaN;
}

function positiveNumber(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}

function roundDriverValue(value) {
  if (!Number.isFinite(value)) return value;
  if (Math.abs(value) >= 100) return Math.round(value * 10) / 10;
  if (Math.abs(value) >= 10) return Math.round(value * 100) / 100;
  return Math.round(value * 1000) / 1000;
}

function formatDriverAnalysisValue(value) {
  if (!Number.isFinite(value)) return "";
  if (Math.abs(value) >= 100) return String(Math.round(value * 10) / 10);
  if (Math.abs(value) >= 10) return String(Math.round(value * 100) / 100);
  return String(Math.round(value * 1000) / 1000);
}

export function combineIdenticalDrivers(driver, countInput = 1, wiringInput = "parallel") {
  const count = Math.max(1, Math.round(Number(countInput) || 1));
  const wiring = wiringInput === "series" ? "series" : "parallel";
  if (count === 1) return { ...driver, count, wiring };

  const electricalScale = wiring === "series" ? count : 1 / count;
  const forceScale = wiring === "series" ? count : 1;
  const combined = {
    ...driver,
    count,
    wiring,
    re: driver.re * electricalScale,
    le: driver.le * electricalScale,
    vas: driver.vas * count,
    sd: driver.sd * count,
    mms: driver.mms * count,
    rms: driver.rms * count,
    cms: driver.cms / count,
    bl: driver.bl * forceScale,
  };

  const omega = 2 * Math.PI * combined.fs;
  combined.qms = driver.qms;
  combined.qes = driver.qes;
  combined.qts = (combined.qms * combined.qes) / (combined.qms + combined.qes);
  combined.derivedBl = Math.sqrt((omega * combined.mms * combined.re) / combined.qes);
  combined.derivedMms = 1 / (combined.cms * omega ** 2);
  return combined;
}

export function validateDriver(driver) {
  const warnings = [];
  const required = ["re", "fs", "qms", "qes", "vas", "sd", "xmax", "mms", "bl"];

  for (const key of required) {
    if (!Number.isFinite(driver[key]) || driver[key] <= 0) {
      warnings.push(`${key} must be positive`);
    }
  }

  if (Number.isFinite(driver.derivedBl) && driver.bl > 0) {
    const error = Math.abs(driver.derivedBl - driver.bl) / driver.bl;
    if (error > 0.18) {
      warnings.push(`Bl differs from derived value by ${(error * 100).toFixed(0)}%`);
    }
  }

  if (Number.isFinite(driver.derivedMms) && driver.mms > 0) {
    const error = Math.abs(driver.derivedMms - driver.mms) / driver.mms;
    if (error > 0.25) {
      warnings.push(`Mms/Vas/Fs consistency differs by ${(error * 100).toFixed(0)}%`);
    }
  }

  return warnings;
}
