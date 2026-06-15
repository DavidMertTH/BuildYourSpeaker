export function maxLinearSpl(splValues, excursionMmValues, xmaxMm) {
  const limit = Number(xmaxMm);
  return splValues.map((level, index) => {
    const excursion = Math.max(Number(excursionMmValues[index]) || 0, 1e-9);
    if (!Number.isFinite(level) || !Number.isFinite(limit) || limit <= 0) return level;
    return level + 20 * Math.log10(limit / excursion);
  });
}

export function excursionLimitedSpl(splValues, excursionMmValues, xmaxMm) {
  const maxSpl = maxLinearSpl(splValues, excursionMmValues, xmaxMm);
  return splValues.map((level, index) => Math.min(level, maxSpl[index]));
}

export function excursionLimitedValues(values, excursionMmValues, xmaxMm) {
  const limit = Number(xmaxMm);
  return values.map((value, index) => {
    const currentValue = Number(value);
    const excursion = Math.max(Number(excursionMmValues[index]) || 0, 1e-9);
    if (!Number.isFinite(currentValue) || !Number.isFinite(limit) || limit <= 0) return currentValue;
    return currentValue * Math.min(1, limit / excursion);
  });
}

export function maxExcursionRatio(excursionMmValues, xmaxMm) {
  const limit = Number(xmaxMm);
  if (!Number.isFinite(limit) || limit <= 0) return Number.POSITIVE_INFINITY;
  const maxExcursion = Math.max(...excursionMmValues.filter(Number.isFinite), 0);
  return maxExcursion / limit;
}

export function recommendedLowFrequencyLimit(driver) {
  const explicitLimit = Number(driver?.minFrequencyHz);
  if (Number.isFinite(explicitLimit) && explicitLimit > 0) return explicitLimit;

  const fs = Number(driver?.fs);
  const sdCm2 = Number(driver?.sd) * 10000;
  if (!Number.isFinite(fs) || fs <= 0) return 0;

  if (Number.isFinite(sdCm2) && sdCm2 <= 20 && fs >= 200) return Math.max(1000, fs * 1.35);
  if (Number.isFinite(sdCm2) && sdCm2 <= 55 && fs >= 250) return Math.max(500, fs * 1.45);
  if (fs >= 450) return fs * 1.5;
  return 0;
}
