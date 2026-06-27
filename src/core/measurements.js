export function parseFrequencyResponseText(text, options = {}) {
  const pointsByFrequency = new Map();
  const lines = String(text || "").replace(/^\uFEFF/, "").split(/\r?\n/);

  for (const rawLine of lines) {
    const line = stripInlineComment(rawLine).trim();
    if (!line || isCommentLine(line)) continue;

    const tokens = tokenizeDataLine(line);
    if (tokens.length < 2) continue;

    const frequencyHz = parseFlexibleNumber(tokens[0]);
    const magnitudeDb = parseFlexibleNumber(tokens[1]);
    const phaseDeg = tokens.length > 2 ? parseFlexibleNumber(tokens[2]) : NaN;
    if (!Number.isFinite(frequencyHz) || frequencyHz <= 0 || !Number.isFinite(magnitudeDb)) continue;

    pointsByFrequency.set(roundFrequency(frequencyHz), {
      frequencyHz,
      magnitudeDb,
      ...(Number.isFinite(phaseDeg) ? { phaseDeg } : {}),
    });
  }

  const points = [...pointsByFrequency.values()].sort((left, right) => left.frequencyHz - right.frequencyHz);
  if (points.length < 2) {
    throw new Error("No usable frequency response data found.");
  }

  return normalizeFrequencyResponse({
    id: options.id,
    name: options.name,
    source: options.source,
    plane: options.plane,
    angleDeg: options.angleDeg,
    visible: options.visible,
    importedAt: options.importedAt,
    points,
  });
}

export function normalizeFrequencyResponse(input = {}) {
  const points = Array.isArray(input.points)
    ? input.points
        .map((point) => ({
          frequencyHz: Number(point.frequencyHz),
          magnitudeDb: Number(point.magnitudeDb),
          ...(Number.isFinite(Number(point.phaseDeg)) ? { phaseDeg: Number(point.phaseDeg) } : {}),
        }))
        .filter((point) => Number.isFinite(point.frequencyHz) && point.frequencyHz > 0 && Number.isFinite(point.magnitudeDb))
        .sort((left, right) => left.frequencyHz - right.frequencyHz)
    : [];

  return {
    id: input.id || createMeasurementId(),
    name: String(input.name || input.source || "Imported response").trim() || "Imported response",
    kind: "frequency-response",
    source: String(input.source || "").trim(),
    target: normalizeMeasurementTarget(input.target),
    recordingGroupId: normalizeMeasurementGroupId(input.recordingGroupId),
    plane: input.plane === "vertical" ? "vertical" : "horizontal",
    angleDeg: normalizeAngle(input.angleDeg),
    color: normalizeResponseColor(input.color),
    visible: input.visible !== false,
    importedAt: input.importedAt || "",
    points,
  };
}

function normalizeResponseColor(color) {
  return typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color.trim()) ? color.trim() : "";
}

export function normalizeFrequencyResponseCandidate(input = {}) {
  const url = String(input.url || input.source || "").trim();
  return {
    id: input.id || createMeasurementId(),
    name: String(input.name || input.title || url || "Frequency response candidate").trim() || "Frequency response candidate",
    kind: "frequency-response-candidate",
    source: String(input.source || "").trim(),
    url,
    status: String(input.status || "candidate").trim() || "candidate",
    format: String(input.format || "html").trim() || "html",
    reason: String(input.reason || "").trim(),
    importedAt: input.importedAt || "",
  };
}

export function normalizeMeasurements(input = {}) {
  const responses = Array.isArray(input.frequencyResponses)
    ? input.frequencyResponses.map(normalizeFrequencyResponse).filter((response) => response.points.length >= 2)
    : [];
  const candidates = Array.isArray(input.frequencyResponseCandidates)
    ? input.frequencyResponseCandidates.map(normalizeFrequencyResponseCandidate).filter((candidate) => candidate.name || candidate.url)
    : [];
  return {
    frequencyResponses: responses,
    frequencyResponseCandidates: candidates,
    recordingGroups: normalizeMeasurementGroups(input.recordingGroups),
    recording: normalizeRecordingSettings(input.recording),
  };
}

export function normalizeMeasurementGroups(input = []) {
  const groups = Array.isArray(input) ? input : [];
  return groups.map((group, index) => ({
    id: group.id || createMeasurementGroupId(),
    name: String(group.name || `Recording group ${index + 1}`).trim() || `Recording group ${index + 1}`,
    target: normalizeMeasurementTarget(group.target),
    kind: String(group.kind || "manual").trim() || "manual",
    driverId: String(group.driverId || "").trim(),
  }));
}

export function normalizeRecordingSettings(input = {}) {
  const frequencyStartHz = clampNumber(input.frequencyStartHz ?? input.startHz, 1, 20000, 20);
  const frequencyEndHz = clampNumber(input.frequencyEndHz ?? input.endHz, Math.max(20, frequencyStartHz * 1.01), 24000, 20000);
  const repetitions = Math.round(clampNumber(input.repetitions ?? input.averaging, 1, 8, 1));
  return {
    microphone: String(input.microphone || "default"),
    outputDeviceId: String(input.outputDeviceId || input.speaker || "default"),
    signal: ["noise", "sweep"].includes(input.signal) ? input.signal : "sweep",
    levelDb: clampNumber(input.levelDb, 35, 105, 75),
    durationSec: clampNumber(input.durationSec, 1, 60, 8),
    repetitions,
    averaging: repetitions,
    sampleRate: Math.round(clampNumber(input.sampleRate, 44100, 96000, 48000)),
    frequencyStartHz,
    frequencyEndHz,
  };
}

export function inferAngleFromName(name) {
  const match = String(name || "").match(/(?:^|[^0-9-])(-?\d+(?:[\.,]\d+)?)\s*(?:deg|degrees|°)/i);
  return match ? normalizeAngle(parseFlexibleNumber(match[1])) : 0;
}

function tokenizeDataLine(line) {
  const trimmed = line.trim();
  if (trimmed.includes(";")) return trimmed.split(";").map((token) => token.trim()).filter(Boolean);
  if (trimmed.includes("\t")) return trimmed.split(/\t+/).map((token) => token.trim()).filter(Boolean);
  if (trimmed.includes(",")) return trimmed.split(",").map((token) => token.trim()).filter(Boolean);
  return trimmed.split(/\s+/).map((token) => token.trim()).filter(Boolean);
}

function stripInlineComment(line) {
  return String(line || "").replace(/\s+(?:#|\/\/).*$/, "");
}

function isCommentLine(line) {
  return /^(#|\/\/|\*)/.test(line) || /^;\s*\D/.test(line);
}

function parseFlexibleNumber(value) {
  const normalized = String(value || "")
    .trim()
    .replace(/^"|"$/g, "")
    .replace(",", ".");
  const match = normalized.match(/[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?/i);
  return match ? Number(match[0]) : NaN;
}

function normalizeAngle(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(-180, Math.min(180, number));
}

function normalizeMeasurementTarget(value) {
  const text = String(value || "").trim();
  if (text.startsWith("configGroup:") || text.startsWith("design:")) return text;
  return "design:";
}

function normalizeMeasurementGroupId(value) {
  return String(value || "").trim();
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function roundFrequency(value) {
  return Math.round(Number(value) * 1000000) / 1000000;
}

function createMeasurementId() {
  return `measurement-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function createMeasurementGroupId() {
  return `measurement-group-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
