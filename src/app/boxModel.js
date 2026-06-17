import { normalizeBandpassOptions } from "../core/bandpassBox.js";
import { portLengthFromTuningOptions, normalizePortShape } from "../core/ventedBox.js";
import { cloneProject, sampleProject } from "../state.js";
import { roundTo } from "./format.js";

export function portOptionsFromBox(box) {
  return {
    portShape: box.portShape,
    portCount: box.portCount,
    portDiameterCm: box.portDiameterCm,
    portWidthCm: box.portWidthCm,
    portHeightCm: box.portHeightCm,
    portEndCorrection: box.portEndCorrection,
  };
}

export function passiveRadiatorAreaFromDiameter(diameterCm) {
  const radiusCm = Number(diameterCm) / 2;
  return Math.PI * radiusCm ** 2;
}

export function passiveRadiatorDiameterFromArea(sdCm2) {
  const area = Number(sdCm2);
  if (!Number.isFinite(area) || area <= 0) return NaN;
  return 2 * Math.sqrt(area / Math.PI);
}

export function completeBox(box = {}) {
  const nextBox = {
    ...cloneProject(sampleProject.box),
    ...cloneProject(box || {}),
    passiveRadiator: {
      ...cloneProject(sampleProject.box.passiveRadiator),
      ...cloneProject(box?.passiveRadiator || {}),
    },
    bandpass: {
      ...cloneProject(sampleProject.box.bandpass),
      ...cloneProject(box?.bandpass || {}),
    },
  };
  nextBox.bandpass = normalizeCompleteBandpass(nextBox);
  nextBox.portCount = Math.max(1, Math.min(12, Math.round(Number(nextBox.portCount) || 1)));
  nextBox.portShape = normalizePortShape(nextBox.portShape);
  nextBox.portDiameterCm = Math.max(0.5, Number(nextBox.portDiameterCm) || sampleProject.box.portDiameterCm);
  nextBox.portWidthCm = Math.max(0.5, Number(nextBox.portWidthCm) || sampleProject.box.portWidthCm);
  nextBox.portHeightCm = Math.max(0.2, Number(nextBox.portHeightCm) || sampleProject.box.portHeightCm);
  nextBox.driverCount = Math.max(1, Math.min(16, Math.round(Number(nextBox.driverCount) || 1)));
  nextBox.driverWiring = nextBox.driverWiring === "series" ? "series" : "parallel";
  nextBox.highPassHz = Math.max(0, Number(nextBox.highPassHz) || 0);
  nextBox.highPassOrder = [0, 1, 2, 4].includes(Number(nextBox.highPassOrder)) ? Number(nextBox.highPassOrder) : 2;
  if (!Number.isFinite(Number(nextBox.portLengthCm)) || Number(nextBox.portLengthCm) <= 0) {
    const port = portLengthFromTuningOptions(nextBox.volumeL, nextBox.fb, portOptionsFromBox(nextBox));
    const fallbackPort = portLengthFromTuningOptions(sampleProject.box.volumeL, sampleProject.box.fb, portOptionsFromBox(sampleProject.box));
    nextBox.portLengthCm = Number.isFinite(port.physicalLength) ? roundTo(port.physicalLength * 100, 3) : roundTo(fallbackPort.physicalLength * 100, 3);
  } else {
    nextBox.portLengthCm = Number(nextBox.portLengthCm);
  }
  return nextBox;
}

function normalizeCompleteBandpass(box) {
  const bandpass = normalizeBandpassOptions(box);
  return {
    order: bandpass.order,
    rearVolumeL: roundTo(bandpass.rearVolumeL, 3),
    frontVolumeL: roundTo(bandpass.frontVolumeL, 3),
    frontFb: roundTo(bandpass.frontFb, 3),
    frontPortCount: Math.max(1, Math.min(12, Math.round(Number(bandpass.frontPortCount) || 1))),
    frontPortDiameterCm: roundTo(bandpass.frontPortDiameterCm, 3),
    frontPortLengthCm: roundTo(bandpass.frontPortLengthCm, 3),
    rearFb: roundTo(bandpass.rearFb, 3),
    rearPortCount: Math.max(1, Math.min(12, Math.round(Number(bandpass.rearPortCount) || 1))),
    rearPortDiameterCm: roundTo(bandpass.rearPortDiameterCm, 3),
    rearPortLengthCm: roundTo(bandpass.rearPortLengthCm, 3),
  };
}
