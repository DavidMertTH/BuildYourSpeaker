import {
  AIR_DENSITY,
  DEFAULT_DISTANCE,
  SPEED_OF_SOUND,
  SPL_REFERENCE,
  db,
  litersToCubicMeters,
} from "./constants.js";
import { C, jOmega, solveLinearSystem, unwrapPhase } from "./complex.js";
import { acousticResistanceFromQ, conductanceFromResistance, normalizeEnclosureOptions } from "./enclosure.js";
import { enclosureHighPassResponse } from "./filters.js";
import { portLengthFromTuning, totalPortArea, tuningFromPortLength } from "./ventedBox.js";

function chamberCompliance(volumeL, fillPercent = 0) {
  const enclosure = normalizeEnclosureOptions({ volumeL, fillPercent });
  return litersToCubicMeters(enclosure.effectiveVolumeL) / (AIR_DENSITY * SPEED_OF_SOUND ** 2);
}

function normalizePortCount(count) {
  return Math.max(1, Math.round(Number(count) || 1));
}

function portGeometry(volumeL, fb, diameterCm, lengthCm, endCorrectionFactor, count = 1) {
  const portCount = normalizePortCount(count);
  const fallback = portLengthFromTuning(volumeL, fb, diameterCm, endCorrectionFactor, portCount);
  const physicalLengthCm = Number.isFinite(Number(lengthCm)) && Number(lengthCm) > 0
    ? Number(lengthCm)
    : fallback.physicalLength * 100;
  const effectiveLength = Math.max((physicalLengthCm / 100) + fallback.endCorrection, 0.001);
  return {
    ...fallback,
    physicalLength: physicalLengthCm / 100,
    effectiveLength,
    tuning: tuningFromPortLength(volumeL, diameterCm, physicalLengthCm, endCorrectionFactor, portCount),
  };
}

function portImpedance(port, diameterCm, count, q) {
  const area = totalPortArea(diameterCm, count);
  const mass = (AIR_DENSITY * Math.max(port.effectiveLength, 0.001)) / Math.max(area, 1e-9);
  const tuning = Number.isFinite(port.tuning) ? port.tuning : 30;
  const resistance = ((2 * Math.PI * tuning) * mass) / Math.max(Number(q) || 35, 0.1);
  return { area, mass, resistance };
}

export function normalizeBandpassOptions(input = {}) {
  const bandpass = input.bandpass || {};
  const rearVolumeL = Math.max(Number(bandpass.rearVolumeL || input.volumeL || 24), 0.1);
  const frontVolumeL = Math.max(Number(bandpass.frontVolumeL || input.volumeL || 24), 0.1);
  const frontFb = Math.max(Number(bandpass.frontFb || input.fb || 55), 1);
  const rearFb = Math.max(Number(bandpass.rearFb || input.fb || 32), 1);
  const frontPortDiameterCm = Math.max(Number(bandpass.frontPortDiameterCm || input.portDiameterCm || 8), 0.1);
  const rearPortDiameterCm = Math.max(Number(bandpass.rearPortDiameterCm || input.portDiameterCm || 8), 0.1);
  const frontPortCount = normalizePortCount(bandpass.frontPortCount || input.portCount);
  const rearPortCount = normalizePortCount(bandpass.rearPortCount || input.portCount);
  const endCorrection = Math.max(Number(input.portEndCorrection || 1.46), 0.1);
  const frontPort = portGeometry(frontVolumeL, frontFb, frontPortDiameterCm, bandpass.frontPortLengthCm, endCorrection, frontPortCount);
  const rearPort = portGeometry(rearVolumeL, rearFb, rearPortDiameterCm, bandpass.rearPortLengthCm, endCorrection, rearPortCount);

  return {
    order: Number(bandpass.order) === 6 ? 6 : 4,
    rearVolumeL,
    frontVolumeL,
    frontFb,
    rearFb,
    frontPortDiameterCm,
    rearPortDiameterCm,
    frontPortCount,
    rearPortCount,
    frontPortLengthCm: frontPort.physicalLength * 100,
    rearPortLengthCm: rearPort.physicalLength * 100,
    frontPort,
    rearPort,
  };
}

export function simulateBandpass(driver, options, frequencies) {
  const enclosure = normalizeEnclosureOptions(options);
  const bandpass = normalizeBandpassOptions(options);
  const frontCompliance = chamberCompliance(bandpass.frontVolumeL, 0);
  const rearCompliance = chamberCompliance(bandpass.rearVolumeL, enclosure.fillPercent);
  const frontOmega = 2 * Math.PI * Math.max(bandpass.frontPort.tuning || bandpass.frontFb, 1);
  const rearOmega = 2 * Math.PI * Math.max(bandpass.rearPort.tuning || bandpass.rearFb, 1);
  const frontLossConductance =
    conductanceFromResistance(acousticResistanceFromQ(enclosure.ql, frontOmega, frontCompliance)) +
    conductanceFromResistance(acousticResistanceFromQ(enclosure.qa, frontOmega, frontCompliance));
  const rearLossConductance =
    conductanceFromResistance(acousticResistanceFromQ(enclosure.ql, rearOmega, rearCompliance)) +
    conductanceFromResistance(acousticResistanceFromQ(enclosure.qa, rearOmega, rearCompliance));
  const frontPort = portImpedance(bandpass.frontPort, bandpass.frontPortDiameterCm, bandpass.frontPortCount, enclosure.qp);
  const rearPort = portImpedance(bandpass.rearPort, bandpass.rearPortDiameterCm, bandpass.rearPortCount, enclosure.qp);
  const voltage = Math.sqrt(Number(options.powerW) * driver.re);
  const pressureGain = (AIR_DENSITY / (4 * Math.PI * DEFAULT_DISTANCE)) / SPL_REFERENCE;

  const spl = [];
  const impedance = [];
  const excursionMm = [];
  const portVelocity = [];
  const rearPortVelocity = [];
  const phase = [];
  const groupDelayMs = [];
  const frontPortSpl = [];
  const rearPortSpl = [];

  for (const frequency of frequencies) {
    const s = jOmega(frequency);
    const ze = C(driver.re + enclosure.seriesResistanceOhm).add(s.mul(driver.le));
    const driverZm = C(driver.rms).add(s.mul(driver.mms)).add(C(1).div(s.mul(driver.cms)));
    const frontY = s.mul(frontCompliance).add(frontLossConductance);
    const rearY = s.mul(rearCompliance).add(rearLossConductance);
    const zFrontPort = C(frontPort.resistance).add(s.mul(frontPort.mass));
    const zRearPort = C(rearPort.resistance).add(s.mul(rearPort.mass));

    let current;
    let coneVelocity;
    let frontPortVolumeVelocity;
    let rearPortVolumeVelocity = C(0);

    if (bandpass.order === 6) {
      const matrix = [
        [ze, C(driver.bl), C(0), C(0), C(0), C(0)],
        [C(-driver.bl), driverZm, C(-driver.sd), C(0), C(driver.sd), C(0)],
        [C(0), C(-driver.sd), frontY, C(1), C(0), C(0)],
        [C(0), C(0), C(-1), zFrontPort, C(0), C(0)],
        [C(0), C(driver.sd), C(0), C(0), rearY, C(1)],
        [C(0), C(0), C(0), C(0), C(-1), zRearPort],
      ];
      [current, coneVelocity, , frontPortVolumeVelocity, , rearPortVolumeVelocity] = solveLinearSystem(matrix, [C(voltage), C(0), C(0), C(0), C(0), C(0)]);
    } else {
      const matrix = [
        [ze, C(driver.bl), C(0), C(0), C(0)],
        [C(-driver.bl), driverZm, C(-driver.sd), C(0), C(driver.sd)],
        [C(0), C(-driver.sd), frontY, C(1), C(0)],
        [C(0), C(0), C(-1), zFrontPort, C(0)],
        [C(0), C(driver.sd), C(0), C(0), rearY],
      ];
      [current, coneVelocity, , frontPortVolumeVelocity] = solveLinearSystem(matrix, [C(voltage), C(0), C(0), C(0), C(0)]);
    }

    const filter = enclosureHighPassResponse(frequency, options);
    const filterMagnitude = filter.abs();
    const displacement = coneVelocity.div(s);
    const externalFrontPortVolumeVelocity = frontPortVolumeVelocity.mul(-1);
    const externalRearPortVolumeVelocity = bandpass.order === 6 ? rearPortVolumeVelocity : C(0);
    const totalVolumeVelocity = externalFrontPortVolumeVelocity.add(externalRearPortVolumeVelocity);
    const totalPressure = s.mul(totalVolumeVelocity).mul(pressureGain).mul(filter);
    const frontPressure = s.mul(externalFrontPortVolumeVelocity).mul(pressureGain).mul(filter);
    const rearPressure = s.mul(externalRearPortVolumeVelocity).mul(pressureGain).mul(filter);

    spl.push(db(totalPressure.abs()));
    impedance.push(C(voltage).div(current).abs());
    excursionMm.push(displacement.abs() * 1000 * filterMagnitude);
    portVelocity.push((frontPortVolumeVelocity.abs() / frontPort.area) * filterMagnitude);
    rearPortVelocity.push((rearPortVolumeVelocity.abs() / rearPort.area) * filterMagnitude);
    phase.push(totalPressure.phase());
    frontPortSpl.push(db(frontPressure.abs()));
    rearPortSpl.push(db(rearPressure.abs()));
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
    kind: "bandpass",
    bandpass,
    enclosure,
    frequencies,
    spl,
    impedance,
    excursionMm,
    portVelocity,
    rearPortVelocity,
    phaseDeg: unwrapped.map((value) => (value * 180) / Math.PI),
    groupDelayMs,
    frontPortSpl,
    rearPortSpl,
  };
}
