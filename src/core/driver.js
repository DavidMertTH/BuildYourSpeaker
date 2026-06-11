import {
  AIR_DENSITY,
  SPEED_OF_SOUND,
  cm2ToSquareMeters,
  gramsToKg,
  litersToCubicMeters,
  mhToHenry,
  mmToMeters,
} from "./constants.js";

export function normalizeDriver(input) {
  const driver = {
    re: Number(input.re),
    le: mhToHenry(Number(input.leMh)),
    fs: Number(input.fs),
    qms: Number(input.qms),
    qes: Number(input.qes),
    vas: litersToCubicMeters(Number(input.vasL)),
    sd: cm2ToSquareMeters(Number(input.sdCm2)),
    xmax: mmToMeters(Number(input.xmaxMm)),
    mms: gramsToKg(Number(input.mmsG)),
    bl: Number(input.bl),
  };

  const omega = 2 * Math.PI * driver.fs;
  driver.qts = (driver.qms * driver.qes) / (driver.qms + driver.qes);
  driver.cms = driver.vas / (AIR_DENSITY * SPEED_OF_SOUND ** 2 * driver.sd ** 2);
  driver.rms = (omega * driver.mms) / driver.qms;
  driver.derivedBl = Math.sqrt((omega * driver.mms * driver.re) / driver.qes);
  driver.derivedMms = 1 / (driver.cms * omega ** 2);
  return driver;
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
