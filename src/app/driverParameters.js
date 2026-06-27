import { deriveDriverParameters } from "../core/driver.js";
import { cloneProject, sampleProject } from "../state.js";
import { roundTo } from "./format.js";

export function completeDriverParameters(fallbackDriver = {}, driver = {}) {
  const resolvedFallback = driver?.allowParameterFallback === false ? {} : fallbackDriver;
  const nextDriver = { ...cloneProject(resolvedFallback), ...cloneProject(driver || {}) };
  Object.entries(nextDriver).forEach(([key, value]) => {
    if (typeof value === "boolean") return;
    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) nextDriver[key] = numericValue;
  });
  return deriveDriverParameters(nextDriver);
}

export function completePassiveRadiatorParameters(fallbackPassiveRadiator = {}, passiveRadiator = {}) {
  const nextPassiveRadiator = {
    ...cloneProject(sampleProject.box.passiveRadiator),
    ...cloneProject(fallbackPassiveRadiator || {}),
    ...cloneProject(passiveRadiator || {}),
  };
  Object.entries(nextPassiveRadiator).forEach(([key, value]) => {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) nextPassiveRadiator[key] = numericValue;
  });
  if (!Number.isFinite(nextPassiveRadiator.cmsMmN) && Number.isFinite(nextPassiveRadiator.fs) && Number.isFinite(nextPassiveRadiator.mmsG)) {
    nextPassiveRadiator.cmsMmN = roundTo(1000 / ((nextPassiveRadiator.mmsG / 1000) * (2 * Math.PI * nextPassiveRadiator.fs) ** 2), 3);
  }
  nextPassiveRadiator.count = Math.max(1, Math.round(Number(nextPassiveRadiator.count) || 1));
  return nextPassiveRadiator;
}
