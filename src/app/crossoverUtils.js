import {
  CROSSOVER_FREQUENCY_MAX_HZ,
  CROSSOVER_FREQUENCY_MIN_HZ,
  CROSSOVER_SLIDER_LOG_MIN_HZ,
  CROSSOVER_SLIDER_MAX_HZ,
  CROSSOVER_SLIDER_STEPS,
  DEFAULT_CROSSOVER_FREQUENCY_HZ,
} from "./constants.js";

export function clampDb(value, min, max) {
  return clampNumberValue(value, min, max);
}

export function clampNumberValue(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

export function clampCrossoverFrequency(value) {
  const frequency = Number(value);
  if (!Number.isFinite(frequency)) return DEFAULT_CROSSOVER_FREQUENCY_HZ;
  return Math.max(CROSSOVER_FREQUENCY_MIN_HZ, Math.min(CROSSOVER_FREQUENCY_MAX_HZ, frequency));
}

export function crossoverFrequencyToSliderValue(frequencyHz) {
  const clamped = clampCrossoverFrequency(frequencyHz);
  if (clamped <= 0) return 0;
  const frequency = Math.max(CROSSOVER_SLIDER_LOG_MIN_HZ, Math.min(CROSSOVER_SLIDER_MAX_HZ, clamped));
  const min = Math.log10(CROSSOVER_SLIDER_LOG_MIN_HZ);
  const max = Math.log10(CROSSOVER_SLIDER_MAX_HZ);
  const position = (Math.log10(frequency) - min) / (max - min);
  return Math.max(1, Math.round(position * (CROSSOVER_SLIDER_STEPS - 1)) + 1);
}

export function crossoverSliderValueToFrequency(value) {
  const raw = Math.max(0, Math.min(CROSSOVER_SLIDER_STEPS, Number(value) || 0));
  if (raw <= 0) return 0;
  const position = (raw - 1) / (CROSSOVER_SLIDER_STEPS - 1);
  const min = Math.log10(CROSSOVER_SLIDER_LOG_MIN_HZ);
  const max = Math.log10(CROSSOVER_SLIDER_MAX_HZ);
  return clampCrossoverFrequency(10 ** (min + (max - min) * position));
}
