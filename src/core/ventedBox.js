import {
  AIR_DENSITY,
  DEFAULT_DISTANCE,
  SPEED_OF_SOUND,
  SPL_REFERENCE,
  cmToMeters,
  db,
  litersToCubicMeters,
} from "./constants.js";
import { C, jOmega, solveLinearSystem, unwrapPhase } from "./complex.js";
import { acousticResistanceFromQ, conductanceFromResistance, normalizeEnclosureOptions } from "./enclosure.js";
import { enclosureHighPassResponse } from "./filters.js";

export function portArea(portDiameterCm) {
  const diameter = cmToMeters(portDiameterCm);
  return Math.PI * (diameter / 2) ** 2;
}

export function rectangularPortArea(portWidthCm, portHeightCm) {
  return cmToMeters(portWidthCm) * cmToMeters(portHeightCm);
}

export function normalizePortCount(count) {
  return Math.max(1, Math.round(Number(count) || 1));
}

export function totalPortArea(portDiameterCm, portCount = 1) {
  return portArea(portDiameterCm) * normalizePortCount(portCount);
}

export function normalizePortShape(shape) {
  return shape === "rectangular" || shape === "slot" ? "rectangular" : "round";
}

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function normalizePortOptions(options = {}) {
  return {
    shape: normalizePortShape(options.portShape || options.shape),
    diameterCm: positiveNumber(options.portDiameterCm ?? options.diameterCm, 8),
    widthCm: positiveNumber(options.portWidthCm ?? options.widthCm, 16),
    heightCm: positiveNumber(options.portHeightCm ?? options.heightCm, 3),
    count: normalizePortCount(options.portCount ?? options.count),
    endCorrectionFactor: positiveNumber(options.portEndCorrection ?? options.endCorrectionFactor, 1.46),
  };
}

export function portAreaFromOptions(options = {}) {
  const port = normalizePortOptions(options);
  return port.shape === "rectangular" ? rectangularPortArea(port.widthCm, port.heightCm) : portArea(port.diameterCm);
}

export function totalPortAreaFromOptions(options = {}) {
  const port = normalizePortOptions(options);
  return portAreaFromOptions(port) * port.count;
}

function equivalentPortRadius(options = {}) {
  const area = portAreaFromOptions(options);
  return Math.sqrt(area / Math.PI);
}

export function portLengthFromTuningOptions(volumeLiters, fb, options = {}) {
  const port = normalizePortOptions(options);
  const volume = litersToCubicMeters(volumeLiters);
  const area = totalPortAreaFromOptions(port);
  const radius = equivalentPortRadius(port);
  const effectiveLength = area / (volume * (2 * Math.PI * fb / SPEED_OF_SOUND) ** 2);
  const endCorrection = port.endCorrectionFactor * radius;
  return {
    shape: port.shape,
    count: port.count,
    singleArea: portAreaFromOptions(port),
    area,
    equivalentRadius: radius,
    effectiveLength,
    endCorrection,
    physicalLength: effectiveLength - endCorrection,
  };
}

export function portLengthFromTuning(volumeLiters, fb, portDiameterCm, endCorrectionFactor = 1.46, portCount = 1) {
  return portLengthFromTuningOptions(volumeLiters, fb, {
    portShape: "round",
    portDiameterCm,
    portEndCorrection: endCorrectionFactor,
    portCount,
  });
}

export function tuningFromPortLengthOptions(volumeLiters, physicalLengthCm, options = {}) {
  const port = normalizePortOptions(options);
  const volume = litersToCubicMeters(volumeLiters);
  const area = totalPortAreaFromOptions(port);
  const radius = equivalentPortRadius(port);
  const effectiveLength = cmToMeters(physicalLengthCm) + port.endCorrectionFactor * radius;
  if (volume <= 0 || area <= 0 || effectiveLength <= 0) return NaN;
  return (SPEED_OF_SOUND / (2 * Math.PI)) * Math.sqrt(area / (volume * effectiveLength));
}

export function tuningFromPortLength(volumeLiters, portDiameterCm, physicalLengthCm, endCorrectionFactor = 1.46, portCount = 1) {
  return tuningFromPortLengthOptions(volumeLiters, physicalLengthCm, {
    portShape: "round",
    portDiameterCm,
    portEndCorrection: endCorrectionFactor,
    portCount,
  });
}

export function portDiameterFromTuningAndLength(volumeLiters, fb, physicalLengthCm, endCorrectionFactor = 1.46, portCount = 1) {
  const volume = litersToCubicMeters(volumeLiters);
  const count = normalizePortCount(portCount);
  const physicalLength = cmToMeters(physicalLengthCm);
  const tuningTerm = volume * (2 * Math.PI * fb / SPEED_OF_SOUND) ** 2;
  if (volume <= 0 || fb <= 0 || physicalLength <= 0 || tuningTerm <= 0) return NaN;
  const correctionTerm = tuningTerm * endCorrectionFactor;
  const radius = (correctionTerm + Math.sqrt(correctionTerm ** 2 + 4 * count * Math.PI * tuningTerm * physicalLength)) / (2 * count * Math.PI);
  return radius * 200;
}

function portGeometryFromLengthOptions(volumeLiters, physicalLengthCm, options = {}) {
  const port = normalizePortOptions(options);
  const radius = equivalentPortRadius(port);
  const physicalLength = cmToMeters(physicalLengthCm);
  const endCorrection = port.endCorrectionFactor * radius;
  const effectiveLength = physicalLength + endCorrection;
  return {
    shape: port.shape,
    count: port.count,
    singleArea: portAreaFromOptions(port),
    area: totalPortAreaFromOptions(port),
    equivalentRadius: radius,
    effectiveLength,
    endCorrection,
    physicalLength,
    tuning: tuningFromPortLengthOptions(volumeLiters, physicalLengthCm, port),
  };
}

export function simulateVented(driver, options, frequencies) {
  const enclosure = normalizeEnclosureOptions(options);
  const volume = litersToCubicMeters(enclosure.effectiveVolumeL);
  const cab = volume / (AIR_DENSITY * SPEED_OF_SOUND ** 2);
  const portOptions = {
    ...options,
    portEndCorrection: enclosure.portEndCorrection,
  };
  const area = totalPortAreaFromOptions(portOptions);
  const fallbackPort = portLengthFromTuningOptions(enclosure.effectiveVolumeL, options.fb, portOptions);
  const physicalLengthCm = Number.isFinite(Number(options.portLengthCm)) ? Number(options.portLengthCm) : fallbackPort.physicalLength * 100;
  const port = portGeometryFromLengthOptions(enclosure.effectiveVolumeL, physicalLengthCm, portOptions);
  const effectiveLength = Math.max(port.effectiveLength, 0.001);
  const map = (AIR_DENSITY * effectiveLength) / area;
  const fb = Number.isFinite(port.tuning) ? port.tuning : Number(options.fb);
  const fbOmega = 2 * Math.PI * fb;
  const rap = (fbOmega * map) / enclosure.qp;
  const boxLossConductance =
    conductanceFromResistance(acousticResistanceFromQ(enclosure.ql, fbOmega, cab)) +
    conductanceFromResistance(acousticResistanceFromQ(enclosure.qa, fbOmega, cab));
  const voltage = Math.sqrt(Number(options.powerW) * driver.re);
  const pressureGain = (AIR_DENSITY / (4 * Math.PI * DEFAULT_DISTANCE)) / SPL_REFERENCE;

  const spl = [];
  const impedance = [];
  const excursionMm = [];
  const portVelocity = [];
  const phase = [];
  const groupDelayMs = [];
  const driverSpl = [];
  const portSpl = [];

  for (const frequency of frequencies) {
    const s = jOmega(frequency);
    const ze = C(driver.re + enclosure.seriesResistanceOhm).add(s.mul(driver.le));
    const zm = C(driver.rms).add(s.mul(driver.mms)).add(C(1).div(s.mul(driver.cms)));
    const zport = C(rap).add(s.mul(map));

    const matrix = [
      [ze, C(driver.bl), C(0), C(0)],
      [C(-driver.bl), zm, C(driver.sd), C(0)],
      [C(0), C(-driver.sd), s.mul(cab).add(boxLossConductance), C(1)],
      [C(0), C(0), C(-1), zport],
    ];

    const [current, coneVelocity, boxPressure, portVolumeVelocity] = solveLinearSystem(matrix, [C(voltage), C(0), C(0), C(0)]);
    void boxPressure;
    const displacement = coneVelocity.div(s);
    const frontVolumeVelocity = coneVelocity.mul(driver.sd);
    const externalPortVolumeVelocity = portVolumeVelocity.mul(-1);
    const totalVolumeVelocity = frontVolumeVelocity.add(externalPortVolumeVelocity);
    const totalPressure = s.mul(totalVolumeVelocity).mul(pressureGain);
    const conePressure = s.mul(frontVolumeVelocity).mul(pressureGain);
    const ventPressure = s.mul(externalPortVolumeVelocity).mul(pressureGain);
    const filter = enclosureHighPassResponse(frequency, options);
    const filteredTotalPressure = totalPressure.mul(filter);
    const filterMagnitude = filter.abs();

    spl.push(db(filteredTotalPressure.abs()));
    impedance.push(C(voltage).div(current).abs());
    excursionMm.push(displacement.abs() * 1000 * filterMagnitude);
    portVelocity.push((portVolumeVelocity.abs() / area) * filterMagnitude);
    phase.push(filteredTotalPressure.phase());
    driverSpl.push(db(conePressure.mul(filter).abs()));
    portSpl.push(db(ventPressure.mul(filter).abs()));
  }

  const unwrapped = unwrapPhase(phase);
  for (let index = 0; index < frequencies.length; index += 1) {
    if (index === 0 || index === frequencies.length - 1) {
      groupDelayMs.push(0);
      continue;
    }
    const phaseDelta = unwrapped[index + 1] - unwrapped[index - 1];
    const omegaDelta = 2 * Math.PI * (frequencies[index + 1] - frequencies[index - 1]);
    groupDelayMs.push((-phaseDelta / omegaDelta) * 1000);
  }

  return {
    kind: "vented",
    port,
    enclosure,
    frequencies,
    spl,
    impedance,
    excursionMm,
    portVelocity,
    phaseDeg: unwrapped.map((value) => (value * 180) / Math.PI),
    groupDelayMs,
    driverSpl,
    portSpl,
  };
}
