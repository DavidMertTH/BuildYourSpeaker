const TWO_PI = Math.PI * 2;

export function generateRecordingStimulus(options = {}) {
  const sampleRate = clampNumber(options.sampleRate, 8000, 192000, 48000);
  const durationSec = clampNumber(options.durationSec, 1, 60, 8);
  const signal = options.signal === "noise" ? "noise" : "sweep";
  const frequencyStartHz = clampNumber(options.frequencyStartHz, 1, sampleRate * 0.45, 20);
  const frequencyEndHz = clampNumber(options.frequencyEndHz, frequencyStartHz * 1.01, sampleRate * 0.45, 20000);
  const length = Math.max(1, Math.round(sampleRate * durationSec));
  const levelDb = clampNumber(options.levelDb, 35, 105, 75);
  const gain = recordingGainFromLevel(levelDb);
  const samples = new Float32Array(length);

  if (signal === "noise") {
    fillPinkishNoise(samples, gain);
  } else {
    fillExponentialSweep(samples, sampleRate, gain, frequencyStartHz, frequencyEndHz);
  }

  applyFade(samples, sampleRate, 0.02);
  return {
    signal,
    sampleRate,
    durationSec,
    frequencyStartHz,
    frequencyEndHz,
    samples,
  };
}

export function estimateFrequencyResponse(options = {}) {
  const stimulus = toFloat32Array(options.stimulus);
  const recording = toFloat32Array(options.recording);
  const sampleRate = clampNumber(options.sampleRate, 8000, 192000, 48000);
  const referenceLevelDb = clampNumber(options.referenceLevelDb, -120, 140, 75);
  const frequencies = sanitizeFrequencies(options.frequencies || defaultResponseFrequencies());
  if (stimulus.length < sampleRate * 0.25 || recording.length < sampleRate * 0.25 || frequencies.length < 2) return [];

  const lag = estimateRecordingLag(stimulus, recording, sampleRate);
  const aligned = alignedRecordingSlice(recording, lag, stimulus.length);
  const usableLength = Math.min(stimulus.length, aligned.length);
  if (usableLength < sampleRate * 0.25) return [];

  const windowedStimulus = windowSamples(stimulus.subarray(0, usableLength));
  const windowedRecording = windowSamples(aligned.subarray(0, usableLength));
  const rawPoints = frequencies.map((frequencyHz) => {
    const reference = complexAtFrequency(windowedStimulus, sampleRate, frequencyHz);
    const measured = complexAtFrequency(windowedRecording, sampleRate, frequencyHz);
    const referenceMagnitude = Math.max(1e-12, Math.hypot(reference.re, reference.im));
    const measuredMagnitude = Math.max(1e-12, Math.hypot(measured.re, measured.im));
    return {
      frequencyHz,
      magnitudeDb: 20 * Math.log10(measuredMagnitude / referenceMagnitude),
      phaseDeg: phaseDifferenceDeg(measured, reference),
    };
  });

  const medianReference = median(rawPoints
    .filter((point) => point.frequencyHz >= 200 && point.frequencyHz <= 2000)
    .map((point) => point.magnitudeDb));
  const offset = referenceLevelDb - (Number.isFinite(medianReference) ? medianReference : median(rawPoints.map((point) => point.magnitudeDb)));

  return rawPoints
    .filter((point) => Number.isFinite(point.magnitudeDb))
    .map((point) => ({
      frequencyHz: roundTo(point.frequencyHz, point.frequencyHz >= 100 ? 1 : 2),
      magnitudeDb: roundTo(point.magnitudeDb + offset, 2),
      phaseDeg: roundTo(point.phaseDeg, 2),
    }));
}

export function averageFrequencyResponses(responses = []) {
  const usable = responses.filter((response) => Array.isArray(response) && response.length >= 2);
  if (!usable.length) return [];
  const length = Math.min(...usable.map((response) => response.length));
  return Array.from({ length }, (_, index) => {
    const entries = usable.map((response) => response[index]).filter(Boolean);
    const frequencyHz = median(entries.map((entry) => entry.frequencyHz));
    return {
      frequencyHz,
      magnitudeDb: roundTo(entries.reduce((sum, entry) => sum + entry.magnitudeDb, 0) / entries.length, 2),
      phaseDeg: roundTo(entries.reduce((sum, entry) => sum + (entry.phaseDeg || 0), 0) / entries.length, 2),
    };
  });
}

export function defaultResponseFrequencies(options = {}) {
  const count = 180;
  const min = clampNumber(options.frequencyStartHz, 1, 20000, 20);
  const max = Math.max(min * 1.01, clampNumber(options.frequencyEndHz, min * 1.01, 20000, 20000));
  const ratio = max / min;
  return Array.from({ length: count }, (_, index) => min * ratio ** (index / (count - 1)));
}

function fillExponentialSweep(samples, sampleRate, gain, startHz, endHz) {
  const fMin = Math.max(1, Math.min(startHz, sampleRate * 0.44));
  const fMax = Math.max(fMin * 1.01, Math.min(endHz, sampleRate * 0.45));
  const duration = samples.length / sampleRate;
  const logRatio = Math.log(fMax / fMin);
  const scale = TWO_PI * fMin * duration / logRatio;
  for (let index = 0; index < samples.length; index += 1) {
    const t = index / sampleRate;
    samples[index] = gain * Math.sin(scale * (Math.exp((t / duration) * logRatio) - 1));
  }
}

function fillPinkishNoise(samples, gain) {
  let seed = 0x12345678;
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  for (let index = 0; index < samples.length; index += 1) {
    seed = (1664525 * seed + 1013904223) >>> 0;
    const white = (seed / 0xffffffff) * 2 - 1;
    b0 = 0.99765 * b0 + white * 0.099046;
    b1 = 0.963 * b1 + white * 0.2965164;
    b2 = 0.57 * b2 + white * 1.0526913;
    samples[index] = gain * (b0 + b1 + b2 + white * 0.1848) * 0.14;
  }
}

function applyFade(samples, sampleRate, seconds) {
  const fadeLength = Math.min(Math.floor(sampleRate * seconds), Math.floor(samples.length / 2));
  if (fadeLength <= 0) return;
  for (let index = 0; index < fadeLength; index += 1) {
    const gain = 0.5 - 0.5 * Math.cos(Math.PI * index / fadeLength);
    samples[index] *= gain;
    samples[samples.length - 1 - index] *= gain;
  }
}

function estimateRecordingLag(stimulus, recording, sampleRate) {
  const maxLag = Math.min(recording.length - 1, Math.round(sampleRate * 0.35));
  const length = Math.min(stimulus.length, Math.round(sampleRate * 1.5));
  const coarseStep = Math.max(1, Math.round(sampleRate / 6000));
  let bestLag = 0;
  let bestScore = -Infinity;
  for (let lag = 0; lag <= maxLag; lag += coarseStep) {
    const score = correlationAtLag(stimulus, recording, lag, length, coarseStep);
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }
  const refineStart = Math.max(0, bestLag - coarseStep * 3);
  const refineEnd = Math.min(maxLag, bestLag + coarseStep * 3);
  for (let lag = refineStart; lag <= refineEnd; lag += 1) {
    const score = correlationAtLag(stimulus, recording, lag, length, 1);
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }
  return bestLag;
}

function correlationAtLag(stimulus, recording, lag, length, step) {
  let sum = 0;
  let stimulusEnergy = 0;
  let recordingEnergy = 0;
  const usableLength = Math.min(length, stimulus.length, recording.length - lag);
  for (let index = 0; index < usableLength; index += step) {
    const left = stimulus[index];
    const right = recording[index + lag];
    sum += left * right;
    stimulusEnergy += left * left;
    recordingEnergy += right * right;
  }
  const normalizer = Math.sqrt(stimulusEnergy * recordingEnergy);
  return normalizer > 0 ? sum / normalizer : -Infinity;
}

function alignedRecordingSlice(recording, lag, length) {
  if (lag >= 0) return recording.subarray(lag, Math.min(recording.length, lag + length));
  return recording.subarray(0, Math.min(recording.length, length));
}

function windowSamples(samples) {
  const output = new Float32Array(samples.length);
  const denominator = Math.max(1, samples.length - 1);
  for (let index = 0; index < samples.length; index += 1) {
    const window = 0.5 - 0.5 * Math.cos(TWO_PI * index / denominator);
    output[index] = samples[index] * window;
  }
  return output;
}

function complexAtFrequency(samples, sampleRate, frequencyHz) {
  const step = TWO_PI * frequencyHz / sampleRate;
  const stepCos = Math.cos(step);
  const stepSin = Math.sin(step);
  let cos = 1;
  let sin = 0;
  let re = 0;
  let im = 0;
  for (let index = 0; index < samples.length; index += 1) {
    re += samples[index] * cos;
    im -= samples[index] * sin;
    const nextCos = cos * stepCos - sin * stepSin;
    sin = sin * stepCos + cos * stepSin;
    cos = nextCos;
  }
  return { re, im };
}

function phaseDifferenceDeg(measured, reference) {
  const measuredPhase = Math.atan2(measured.im, measured.re);
  const referencePhase = Math.atan2(reference.im, reference.re);
  let phase = (measuredPhase - referencePhase) * 180 / Math.PI;
  while (phase > 180) phase -= 360;
  while (phase < -180) phase += 360;
  return phase;
}

function sanitizeFrequencies(frequencies) {
  return [...new Set(frequencies
    .map(Number)
    .filter((frequency) => Number.isFinite(frequency) && frequency >= 20 && frequency <= 20000)
    .map((frequency) => roundTo(frequency, frequency >= 100 ? 1 : 2)))]
    .sort((left, right) => left - right);
}

function toFloat32Array(value) {
  if (value instanceof Float32Array) return value;
  if (Array.isArray(value)) return Float32Array.from(value.map(Number));
  return new Float32Array();
}

function recordingGainFromLevel(levelDb) {
  return Math.max(0.005, Math.min(0.8, 0.08 * 10 ** ((levelDb - 75) / 20)));
}

function median(values) {
  const finite = values.filter(Number.isFinite).sort((left, right) => left - right);
  if (!finite.length) return NaN;
  const middle = Math.floor(finite.length / 2);
  return finite.length % 2 ? finite[middle] : (finite[middle - 1] + finite[middle]) / 2;
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function roundTo(value, precision = 2) {
  const factor = 10 ** precision;
  return Math.round(Number(value) * factor) / factor;
}
