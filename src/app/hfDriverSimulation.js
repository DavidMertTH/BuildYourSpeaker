export function isHfDriver(driver = {}) {
  return driver.category === "hf-driver";
}

export function simulateHfDriverResponse(driver = {}, frequencies = []) {
  const sensitivityDb = finiteOr(driver.sensitivityDb, 90);
  const minFrequencyHz = positiveOrNull(driver.minFrequencyHz) ?? positiveOrNull(driver.recommendedCrossoverHz) ?? frequencies[0] ?? 20;
  const maxFrequencyHz = positiveOrNull(driver.maxFrequencyHz) ?? frequencies[frequencies.length - 1] ?? 20000;
  const impedanceOhm = positiveOrNull(driver.minimumImpedanceOhm) ?? positiveOrNull(driver.nominalImpedanceOhm) ?? positiveOrNull(driver.re) ?? 8;
  const inductanceH = Math.max(Number(driver.leMh) || 0, 0) / 1000;
  const spl = frequencies.map((frequency) => {
    let level = sensitivityDb;
    if (frequency < minFrequencyHz) level -= 24 * Math.log2(minFrequencyHz / Math.max(frequency, 1e-9));
    if (frequency > maxFrequencyHz) level -= 18 * Math.log2(frequency / maxFrequencyHz);
    return level;
  });
  return {
    kind: "hf-driver",
    spl,
    impedance: frequencies.map((frequency) => Math.hypot(impedanceOhm, 2 * Math.PI * frequency * inductanceH)),
    excursionMm: frequencies.map(() => 0),
    portVelocity: frequencies.map(() => 0),
    passiveRadiatorExcursionMm: frequencies.map(() => 0),
    passiveRadiatorVelocity: frequencies.map(() => 0),
    phaseDeg: frequencies.map(() => 0),
    groupDelayMs: frequencies.map(() => 0),
    driverSpl: spl,
    portSpl: frequencies.map(() => NaN),
    hfDriver: true,
  };
}

function positiveOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function finiteOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
