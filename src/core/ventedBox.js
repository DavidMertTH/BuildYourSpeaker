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

export function portArea(portDiameterCm) {
  const diameter = cmToMeters(portDiameterCm);
  return Math.PI * (diameter / 2) ** 2;
}

export function portLengthFromTuning(volumeLiters, fb, portDiameterCm, endCorrectionFactor = 1.46) {
  const volume = litersToCubicMeters(volumeLiters);
  const area = portArea(portDiameterCm);
  const radius = cmToMeters(portDiameterCm) / 2;
  const effectiveLength = area / (volume * (2 * Math.PI * fb / SPEED_OF_SOUND) ** 2);
  const endCorrection = endCorrectionFactor * radius;
  return {
    effectiveLength,
    endCorrection,
    physicalLength: effectiveLength - endCorrection,
  };
}

export function simulateVented(driver, options, frequencies) {
  const enclosure = normalizeEnclosureOptions(options);
  const volume = litersToCubicMeters(enclosure.effectiveVolumeL);
  const cab = volume / (AIR_DENSITY * SPEED_OF_SOUND ** 2);
  const area = portArea(options.portDiameterCm);
  const port = portLengthFromTuning(enclosure.effectiveVolumeL, options.fb, options.portDiameterCm, enclosure.portEndCorrection);
  const effectiveLength = Math.max(port.effectiveLength, 0.001);
  const map = (AIR_DENSITY * effectiveLength) / area;
  const fbOmega = 2 * Math.PI * Number(options.fb);
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
    const totalVolumeVelocity = frontVolumeVelocity.add(portVolumeVelocity);
    const totalPressure = s.mul(totalVolumeVelocity).mul(pressureGain);
    const conePressure = s.mul(frontVolumeVelocity).mul(pressureGain);
    const ventPressure = s.mul(portVolumeVelocity).mul(pressureGain);

    spl.push(db(totalPressure.abs()));
    impedance.push(C(voltage).div(current).abs());
    excursionMm.push(displacement.abs() * 1000);
    portVelocity.push(portVolumeVelocity.abs() / area);
    phase.push(totalPressure.phase());
    driverSpl.push(db(conePressure.abs()));
    portSpl.push(db(ventPressure.abs()));
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
