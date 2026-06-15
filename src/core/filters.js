import { C } from "./complex.js";

export function normalizeHighPassOrder(value) {
  const order = Math.round(Number(value) || 0);
  if (order <= 0) return 0;
  if (order <= 1) return 1;
  if (order <= 2) return 2;
  return 4;
}

export function highPassResponse(frequency, highPassHz, orderInput = 2) {
  const fc = Number(highPassHz);
  const order = normalizeHighPassOrder(orderInput);
  const currentFrequency = Number(frequency);
  if (!Number.isFinite(fc) || fc <= 0 || !Number.isFinite(currentFrequency) || currentFrequency <= 0 || order <= 0) {
    return C(1);
  }

  const s = C(0, currentFrequency / fc);
  let response = C(1);
  for (let index = 0; index < order; index += 1) {
    const angle = Math.PI / 2 + (Math.PI * (2 * index + 1)) / (2 * order);
    const pole = C(Math.cos(angle), Math.sin(angle));
    response = response.mul(pole.neg()).mul(s).div(C(1).sub(pole.mul(s)));
  }
  return response;
}

export function lowPassResponse(frequency, lowPassHz, orderInput = 2) {
  const fc = Number(lowPassHz);
  const order = normalizeHighPassOrder(orderInput);
  const currentFrequency = Number(frequency);
  if (!Number.isFinite(fc) || fc <= 0 || !Number.isFinite(currentFrequency) || currentFrequency <= 0 || order <= 0) {
    return C(1);
  }

  const s = C(0, currentFrequency / fc);
  let response = C(1);
  for (let index = 0; index < order; index += 1) {
    const angle = Math.PI / 2 + (Math.PI * (2 * index + 1)) / (2 * order);
    const pole = C(Math.cos(angle), Math.sin(angle));
    response = response.mul(pole.neg()).div(C(1).sub(pole.mul(s)));
  }
  return response;
}

export function crossoverFilterResponse(frequency, filter = {}) {
  if (filter.enabled === false) return C(1);
  if (filter.type === "parametric") return parametricEqResponse(frequency, filter.frequencyHz, filter.gainDb, filter.q);
  if (filter.type === "low-shelf") return shelvingEqResponse(frequency, filter.frequencyHz, filter.gainDb, "low");
  if (filter.type === "high-shelf") return shelvingEqResponse(frequency, filter.frequencyHz, filter.gainDb, "high");
  if (filter.type === "linkwitz-transform") {
    return linkwitzTransformResponse(frequency, filter.sourceFrequencyHz, filter.sourceQ, filter.targetFrequencyHz, filter.targetQ);
  }
  if (filter.type === "subsonic") return subsonicResponse(frequency, filter.frequencyHz, filter.order, filter.family);

  const kind = filter.kind === "lowpass" ? "lowpass" : "highpass";
  const frequencyHz = Number(filter.frequencyHz);
  const order = normalizeHighPassOrder(filter.order);
  if (!Number.isFinite(frequencyHz) || frequencyHz <= 0 || order <= 0) return C(1);

  if (filter.family === "linkwitz-riley" && order >= 2) {
    const halfOrder = Math.max(1, order / 2);
    const base = kind === "lowpass"
      ? lowPassResponse(frequency, frequencyHz, halfOrder)
      : highPassResponse(frequency, frequencyHz, halfOrder);
    return base.mul(base);
  }

  return kind === "lowpass"
    ? lowPassResponse(frequency, frequencyHz, order)
    : highPassResponse(frequency, frequencyHz, order);
}

export function filterChainResponse(frequency, filters = []) {
  return filters.reduce((response, filter) => response.mul(crossoverFilterResponse(frequency, filter)), C(1));
}

export function enclosureHighPassResponse(frequency, options = {}) {
  return highPassResponse(frequency, options.highPassHz, options.highPassOrder);
}

export function parametricEqResponse(frequency, frequencyHz, gainDb = 0, qInput = 1) {
  const f0 = Number(frequencyHz);
  const currentFrequency = Number(frequency);
  const q = Math.max(Number(qInput) || 1, 0.05);
  if (!Number.isFinite(f0) || f0 <= 0 || !Number.isFinite(currentFrequency) || currentFrequency <= 0) return C(1);

  const gain = 10 ** ((Number(gainDb) || 0) / 20);
  if (Math.abs(gain - 1) < 1e-9) return C(1);
  const a = Math.sqrt(gain);
  const s = C(0, currentFrequency / f0);
  const s2 = s.mul(s);
  return s2.add(s.mul(a / q)).add(1).div(s2.add(s.mul(1 / (a * q))).add(1));
}

export function shelvingEqResponse(frequency, frequencyHz, gainDb = 0, shelf = "low") {
  const f0 = Number(frequencyHz);
  const currentFrequency = Number(frequency);
  if (!Number.isFinite(f0) || f0 <= 0 || !Number.isFinite(currentFrequency) || currentFrequency <= 0) return C(1);

  const gain = 10 ** ((Number(gainDb) || 0) / 20);
  if (Math.abs(gain - 1) < 1e-9) return C(1);
  const s = C(0, currentFrequency / f0);
  return shelf === "high"
    ? s.mul(gain).add(1).div(s.add(1))
    : s.add(gain).div(s.add(1));
}

export function linkwitzTransformResponse(frequency, sourceFrequencyHz, sourceQ, targetFrequencyHz, targetQ) {
  const f = Number(frequency);
  const sourceF = Number(sourceFrequencyHz);
  const targetF = Number(targetFrequencyHz);
  const sourceQuality = Math.max(Number(sourceQ) || 0, 0.05);
  const targetQuality = Math.max(Number(targetQ) || 0, 0.05);
  if (!Number.isFinite(f) || f <= 0 || !Number.isFinite(sourceF) || sourceF <= 0 || !Number.isFinite(targetF) || targetF <= 0) return C(1);

  const s = C(0, 2 * Math.PI * f);
  const s2 = s.mul(s);
  const sourceW = 2 * Math.PI * sourceF;
  const targetW = 2 * Math.PI * targetF;
  const numerator = s2.add(s.mul(sourceW / sourceQuality)).add(sourceW ** 2);
  const denominator = s2.add(s.mul(targetW / targetQuality)).add(targetW ** 2);
  return numerator.div(denominator);
}

export function subsonicResponse(frequency, frequencyHz, order = 4, family = "butterworth") {
  if (family === "linkwitz-riley" && normalizeHighPassOrder(order) >= 2) {
    const base = highPassResponse(frequency, frequencyHz, Math.max(1, normalizeHighPassOrder(order) / 2));
    return base.mul(base);
  }
  return highPassResponse(frequency, frequencyHz, order);
}
