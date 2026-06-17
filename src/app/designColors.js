import { DESIGN_COLORS_DARK, DESIGN_COLORS_LIGHT } from "./constants.js";

export function readableTextColor(color) {
  const rgb = hexToRgb(color);
  if (!rgb) return "#ffffff";
  const luminance = [rgb.r, rgb.g, rgb.b]
    .map((value) => {
      const channel = value / 255;
      return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    })
    .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
  return luminance > 0.45 ? "#111111" : "#ffffff";
}

export function designColor(index, colors = getThemeColors()) {
  return colors.palette[index % colors.palette.length];
}

export function designColorForDesign(design, fallbackIndex, colors = getThemeColors()) {
  return isPaletteColor(design?.color) ? design.color : designColor(fallbackIndex, colors);
}

export function designPalette(colors = getThemeColors()) {
  return colors.palette;
}

export function isPaletteColor(color) {
  return [...DESIGN_COLORS_DARK, ...DESIGN_COLORS_LIGHT].includes(color);
}

export function getThemeColors() {
  const styles = getComputedStyle(document.documentElement);
  const palette = document.documentElement.dataset.theme === "light" ? DESIGN_COLORS_LIGHT : DESIGN_COLORS_DARK;
  const accent = styles.getPropertyValue("--accent").trim() || palette[0];
  const blue = styles.getPropertyValue("--blue").trim() || palette[1];
  const accent2 = styles.getPropertyValue("--accent-2").trim() || palette[2];
  const danger = styles.getPropertyValue("--danger").trim() || palette[3];
  return {
    accent,
    accent2,
    blue,
    danger,
    text: styles.getPropertyValue("--text").trim() || "#cfd7dc",
    dim: styles.getPropertyValue("--dim").trim() || "#5f6b73",
    palette,
  };
}

function hexToRgb(color) {
  const match = String(color).trim().match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!match) return null;
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}
