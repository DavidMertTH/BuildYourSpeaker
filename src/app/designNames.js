export function designNameFromBox(mode, box) {
  return `${Number(box.volumeL || 0).toFixed(0)} L ${formatMode(mode)}`;
}

export function legacyDesignNameFromBox(mode, box) {
  return `${Number(box.volumeL || 0).toFixed(0)} L ${mode}`;
}

export function formatMode(mode) {
  if (mode === "sealed") return "Sealed";
  if (mode === "vented") return "Vented";
  if (mode === "passive") return "P-Radiator";
  if (mode === "bandpass") return "Bandpass";
  return String(mode || "Design");
}

export function compactDesignName(design, fallbackName = "Config") {
  const name = String(design?.name || fallbackName || "Config").replace(/\s+/g, " ").trim();
  if (!name) return "Config";
  const withoutBrandNoise = name
    .replace(/\baudiosim\b/gi, "")
    .replace(/\b(audio|driver|speaker|subwoofer|woofer|ohm)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return (withoutBrandNoise || name).slice(0, 8);
}
