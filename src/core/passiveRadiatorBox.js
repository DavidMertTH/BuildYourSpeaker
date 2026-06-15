import { AIR_DENSITY, DEFAULT_DISTANCE, SPEED_OF_SOUND, SPL_REFERENCE, cm2ToSquareMeters, db, gramsToKg, litersToCubicMeters, mmToMeters } from "./constants.js";
import { C, jOmega, solveLinearSystem, unwrapPhase } from "./complex.js";
import { acousticResistanceFromQ, conductanceFromResistance, normalizeEnclosureOptions } from "./enclosure.js";
import { enclosureHighPassResponse } from "./filters.js";

export function normalizePassiveRadiator(input) {
  const fs = Number(input.fs);
  const mms = gramsToKg(Number(input.mmsG));
  const cms = input.cmsMmN ? Number(input.cmsMmN) / 1000 : 1 / (mms * (2 * Math.PI * fs) ** 2);
  const qms = Math.max(Number(input.qms) || 7, 0.1);
  return {
    fs,
    qms,
    mms,
    cms,
    rms: (2 * Math.PI * fs * mms) / qms,
    sd: cm2ToSquareMeters(Number(input.sdCm2)),
    xmax: mmToMeters(Number(input.xmaxMm)),
    count: Math.max(1, Math.round(Number(input.count) || 1)),
  };
}

export function simulatePassiveRadiator(driver, options, frequencies) {
  const enclosure = normalizeEnclosureOptions(options);
  const volume = litersToCubicMeters(enclosure.effectiveVolumeL);
  const cab = volume / (AIR_DENSITY * SPEED_OF_SOUND ** 2);
  const passive = normalizePassiveRadiator(options.passiveRadiator);
  const voltage = Math.sqrt(Number(options.powerW) * driver.re);
  const pressureGain = (AIR_DENSITY / (4 * Math.PI * DEFAULT_DISTANCE)) / SPL_REFERENCE;
  const boxLossOmega = 2 * Math.PI * Math.max(passive.fs, 1);
  const boxLossConductance =
    conductanceFromResistance(acousticResistanceFromQ(enclosure.ql, boxLossOmega, cab)) +
    conductanceFromResistance(acousticResistanceFromQ(enclosure.qa, boxLossOmega, cab));

  const spl = [];
  const impedance = [];
  const excursionMm = [];
  const passiveRadiatorExcursionMm = [];
  const passiveRadiatorVelocity = [];
  const phase = [];
  const groupDelayMs = [];

  for (const frequency of frequencies) {
    const s = jOmega(frequency);
    const ze = C(driver.re + enclosure.seriesResistanceOhm).add(s.mul(driver.le));
    const driverZm = C(driver.rms).add(s.mul(driver.mms)).add(C(1).div(s.mul(driver.cms)));
    const passiveZm = C(passive.rms).add(s.mul(passive.mms)).add(C(1).div(s.mul(passive.cms)));

    const matrix = [
      [ze, C(driver.bl), C(0), C(0)],
      [C(-driver.bl), driverZm, C(driver.sd), C(0)],
      [C(0), C(-driver.sd), s.mul(cab).add(boxLossConductance), C(passive.count * passive.sd)],
      [C(0), C(0), C(-passive.sd), passiveZm],
    ];

    const [current, coneVelocity, boxPressure, passiveVelocity] = solveLinearSystem(matrix, [C(voltage), C(0), C(0), C(0)]);
    void boxPressure;

    const coneDisplacement = coneVelocity.div(s);
    const passiveDisplacement = passiveVelocity.div(s);
    const frontVolumeVelocity = coneVelocity.mul(driver.sd);
    const passiveVolumeVelocity = passiveVelocity.mul(-passive.count * passive.sd);
    const totalVolumeVelocity = frontVolumeVelocity.add(passiveVolumeVelocity);
    const totalPressure = s.mul(totalVolumeVelocity).mul(pressureGain);
    const filter = enclosureHighPassResponse(frequency, options);
    const filteredTotalPressure = totalPressure.mul(filter);
    const filterMagnitude = filter.abs();

    spl.push(db(filteredTotalPressure.abs()));
    impedance.push(C(voltage).div(current).abs());
    excursionMm.push(coneDisplacement.abs() * 1000 * filterMagnitude);
    passiveRadiatorExcursionMm.push(passiveDisplacement.abs() * 1000 * filterMagnitude);
    passiveRadiatorVelocity.push(passiveVelocity.abs() * filterMagnitude);
    phase.push(filteredTotalPressure.phase());
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
    kind: "passive",
    passive,
    enclosure,
    frequencies,
    spl,
    impedance,
    excursionMm,
    passiveRadiatorExcursionMm,
    passiveRadiatorVelocity,
    phaseDeg: unwrapped.map((value) => (value * 180) / Math.PI),
    groupDelayMs,
  };
}
