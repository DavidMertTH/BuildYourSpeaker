import { AIR_DENSITY, DEFAULT_DISTANCE, SPEED_OF_SOUND, SPL_REFERENCE, db, litersToCubicMeters } from "./constants.js";
import { C, jOmega, unwrapPhase } from "./complex.js";
import { acousticResistanceFromQ, conductanceFromResistance, normalizeEnclosureOptions } from "./enclosure.js";
import { enclosureHighPassResponse } from "./filters.js";

export function closedAlignment(driver, volumeLiters, fillPercent = 0) {
  const effectiveVolumeLiters = normalizeEnclosureOptions({ volumeL: volumeLiters, fillPercent }).effectiveVolumeL;
  const volume = litersToCubicMeters(effectiveVolumeLiters);
  const alpha = driver.vas / volume;
  const fc = driver.fs * Math.sqrt(1 + alpha);
  const qtc = driver.qts * Math.sqrt(1 + alpha);
  return { volume, effectiveVolumeLiters, alpha, fc, qtc };
}

export function targetClosedVolumeLiters(driver, qtc) {
  const alpha = (qtc / driver.qts) ** 2 - 1;
  if (alpha <= 0) return Number.POSITIVE_INFINITY;
  return (driver.vas / alpha) * 1000;
}

export function simulateSealed(driver, options, frequencies) {
  const enclosure = normalizeEnclosureOptions(options);
  const volume = litersToCubicMeters(enclosure.effectiveVolumeL);
  const cabMechanical = volume / (AIR_DENSITY * SPEED_OF_SOUND ** 2 * driver.sd ** 2);
  const voltage = Math.sqrt(Number(options.powerW) * driver.re);
  const pressureGain = (AIR_DENSITY / (4 * Math.PI * DEFAULT_DISTANCE)) / SPL_REFERENCE;
  const alignment = closedAlignment(driver, options.volumeL, enclosure.fillPercent);
  const lossOmega = 2 * Math.PI * alignment.fc;
  const cabinetLossConductance =
    conductanceFromResistance(acousticResistanceFromQ(enclosure.qa, lossOmega, cabMechanical)) +
    conductanceFromResistance(acousticResistanceFromQ(enclosure.ql, lossOmega, cabMechanical));

  const spl = [];
  const impedance = [];
  const excursionMm = [];
  const phase = [];
  const groupDelayMs = [];
  const transfer = [];

  for (const frequency of frequencies) {
    const s = jOmega(frequency);
    const ze = C(driver.re + enclosure.seriesResistanceOhm).add(s.mul(driver.le));
    const cabinetAdmittance = s.mul(cabMechanical).add(cabinetLossConductance);
    const stiffness = C(1).div(s.mul(driver.cms)).add(C(1).div(cabinetAdmittance));
    const zm = C(driver.rms).add(s.mul(driver.mms)).add(stiffness);
    const denominator = ze.mul(zm).add(driver.bl ** 2);
    const velocity = C(driver.bl * voltage).div(denominator);
    const displacement = velocity.div(s);
    const volumeVelocity = velocity.mul(driver.sd);
    const pressure = s.mul(volumeVelocity).mul(pressureGain);
    const filter = enclosureHighPassResponse(frequency, options);
    const filteredPressure = pressure.mul(filter);
    const filterMagnitude = filter.abs();
    const zin = ze.add(C(driver.bl ** 2).div(zm));

    spl.push(db(filteredPressure.abs()));
    impedance.push(zin.abs());
    excursionMm.push(displacement.abs() * 1000 * filterMagnitude);
    phase.push(filteredPressure.phase());
    transfer.push(filteredPressure);
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
    kind: "sealed",
    alignment,
    enclosure,
    frequencies,
    spl,
    impedance,
    excursionMm,
    phaseDeg: unwrapped.map((value) => (value * 180) / Math.PI),
    groupDelayMs,
    transfer,
  };
}
