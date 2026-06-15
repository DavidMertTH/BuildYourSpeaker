import { cloneProject } from "../state.js";
import { LAYOUT_STORAGE_KEY } from "./constants.js";
import { clampNumber } from "./format.js";

export function normalizePlotSize(size = {}) {
  return {
    widthPct: clampNumber(Number(size.widthPct) || 50, 24, 100),
    heightPx: clampNumber(Number(size.heightPx) || 300, 180, 900),
  };
}

export function legacyPlotWidth(colSpan) {
  if (!Number.isFinite(Number(colSpan))) return null;
  return clampNumber((Number(colSpan) / 3) * 100, 24, 100);
}

export function legacyPlotHeight(rowSpan) {
  if (!Number.isFinite(Number(rowSpan))) return null;
  return clampNumber(Number(rowSpan) * 280, 180, 900);
}

export function readSavedLayout() {
  try {
    return JSON.parse(localStorage.getItem(LAYOUT_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writeSavedLayout(layout) {
  localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout));
}

export function writeGoldenLayoutState(activePreset, panelLayoutVersion, golden) {
  writeSavedLayout({ activePreset, panelLayoutVersion, golden: cloneProject(golden) });
}
