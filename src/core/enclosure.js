export const DEFAULT_ENCLOSURE_OPTIONS = {
  seriesResistanceOhm: 0,
  fillPercent: 0,
  qa: 80,
  ql: 7,
  qp: 35,
  portEndCorrection: 1.46,
};

export function normalizeEnclosureOptions(input = {}) {
  const fillPercent = clamp(Number(input.fillPercent ?? DEFAULT_ENCLOSURE_OPTIONS.fillPercent), 0, 100);
  const volumeL = Math.max(Number(input.volumeL), 0.001);

  return {
    ...DEFAULT_ENCLOSURE_OPTIONS,
    volumeL,
    effectiveVolumeL: volumeL * fillVolumeMultiplier(fillPercent),
    fillPercent,
    seriesResistanceOhm: Math.max(Number(input.seriesResistanceOhm ?? DEFAULT_ENCLOSURE_OPTIONS.seriesResistanceOhm), 0),
    qa: positiveOrDefault(input.qa, DEFAULT_ENCLOSURE_OPTIONS.qa),
    ql: positiveOrDefault(input.ql, DEFAULT_ENCLOSURE_OPTIONS.ql),
    qp: positiveOrDefault(input.qp, DEFAULT_ENCLOSURE_OPTIONS.qp),
    portEndCorrection: positiveOrDefault(input.portEndCorrection, DEFAULT_ENCLOSURE_OPTIONS.portEndCorrection),
  };
}

export function fillVolumeMultiplier(fillPercent) {
  return 1 + clamp(fillPercent, 0, 100) * 0.0018;
}

export function acousticResistanceFromQ(q, omega, compliance) {
  if (!Number.isFinite(q) || q <= 0 || !Number.isFinite(omega) || omega <= 0 || !Number.isFinite(compliance) || compliance <= 0) {
    return Number.POSITIVE_INFINITY;
  }
  return q / (omega * compliance);
}

export function conductanceFromResistance(resistance) {
  return Number.isFinite(resistance) && resistance > 0 ? 1 / resistance : 0;
}

export function validateEnclosureOptions(input = {}, mode = "sealed") {
  const options = normalizeEnclosureOptions(input);
  const warnings = [];

  if (options.seriesResistanceOhm > 0.5) {
    warnings.push(`Series resistance is high: ${options.seriesResistanceOhm.toFixed(2)} ohm`);
  }
  if (options.fillPercent > 70) {
    warnings.push(`Heavy fill: ${options.fillPercent.toFixed(0)}%`);
  }
  if (options.qa < 20) {
    warnings.push(`High absorption loss: Qa ${options.qa.toFixed(1)}`);
  }
  if (options.ql < 5) {
    warnings.push(`High leakage loss: QL ${options.ql.toFixed(1)}`);
  }
  if (mode === "vented" && (options.portEndCorrection < 0.6 || options.portEndCorrection > 2.2)) {
    warnings.push(`Unusual port end correction: ${options.portEndCorrection.toFixed(2)}`);
  }

  return warnings;
}

function positiveOrDefault(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
