export function roundTo(value, places) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

export function formatInputValue(value) {
  if (!Number.isFinite(value)) return "";
  if (Math.abs(value) >= 1000) return String(Math.round(value * 10) / 10);
  if (Math.abs(value) >= 100) return String(Math.round(value * 100) / 100);
  if (Math.abs(value) >= 10) return String(Math.round(value * 1000) / 1000);
  return String(Math.round(value * 10000) / 10000);
}

export function cssEscape(value) {
  return String(value).replace(/"/g, '\\"');
}

export function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
