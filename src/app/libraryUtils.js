import { DIAMETER_FILTER_VALUES, LIBRARY_BRAND_ALIASES } from "./constants.js";
import { roundTo } from "./format.js";

export function libraryEntriesWithSelection(entries, selectedEntry) {
  if (!selectedEntry || entries.some((entry) => entry.id === selectedEntry.id)) return entries;
  return [selectedEntry, ...entries];
}

export function filteredSortedLibraryEntries(entries, options = {}) {
  const { kind, filter = "", filtersEnabled = false, brand = "", diameter = "", sort = "name-asc" } = options;
  const filterTokens = String(filter || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  const filtered = entries.filter((entry) => {
    if (filtersEnabled && brand && libraryBrand(entry, kind) !== brand) return false;
    if (filtersEnabled && diameter && !libraryEntryMatchesDiameter(entry, kind, diameter)) return false;
    if (!filterTokens.length) return true;
    const text = searchableLibraryText(entry, kind);
    return filterTokens.every((token) => text.includes(token));
  });
  return filtered
    .map((entry, index) => ({ entry, index }))
    .sort((left, right) => compareLibraryEntries(left, right, kind, sort))
    .map((item) => item.entry);
}

export function librarySearchScore(entry, query, kind = "driver") {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  if (!normalizedQuery) return null;

  const readableHaystack = searchableLibraryText(entry, kind);
  const compactHaystack = compactSearchText(readableHaystack);
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const compactQuery = compactSearchText(normalizedQuery);
  let score = 0;
  const matched = [];

  tokens.forEach((token) => {
    const compactToken = compactSearchText(token);
    if (!compactToken) return;
    if (readableHaystack.includes(token)) {
      score += token.length >= 4 ? 3 : 2;
      matched.push(token);
      return;
    }
    if (compactHaystack.includes(compactToken)) {
      score += compactToken.length >= 4 ? 2 : 1;
      matched.push(token);
    }
  });

  if (compactQuery.length >= 3 && compactHaystack.includes(compactQuery)) {
    score += compactQuery.length >= 6 ? 5 : 3;
    if (!matched.includes(normalizedQuery)) matched.push(normalizedQuery);
  }

  if (!score) return null;
  return {
    matched,
    score,
    tokenCount: Math.max(tokens.length, 1),
  };
}

export function libraryBrand(entry) {
  const name = String(entry?.name || "");
  for (const [brand, pattern] of LIBRARY_BRAND_ALIASES) {
    if (pattern.test(name)) return brand;
  }
  const words = name.match(/[A-Za-z][A-Za-z-]*/g) || [];
  if (!words.length) return "";
  if (words[0].length <= 2 && words[1]?.length <= 2) return `${words[0]} ${words[1]}`;
  return words.slice(0, words[0].length <= 3 && words[1] ? 2 : 1).join(" ");
}

export function driverMatches(left, right) {
  const keys = ["re", "leMh", "fs", "qms", "qes", "vasL", "sdCm2", "xmaxMm", "mmsG", "bl"];
  return libraryParametersMatch(left, right, keys);
}

export function passiveRadiatorMatches(left, right) {
  const keys = ["fs", "qms", "mmsG", "cmsMmN", "sdCm2", "xmaxMm"];
  return libraryParametersMatch(left, right, keys);
}

export function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80) || `driver-${Date.now()}`;
}

function compactSearchText(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function searchableLibraryText(entry, kind) {
  const parameters = kind === "passiveRadiator" ? entry.passiveRadiator || {} : entry.driver || {};
  const diameter = libraryEntryDiameterInches(entry, kind);
  return [
    entry.id,
    entry.name,
    entry.source,
    libraryBrand(entry, kind),
    Number.isFinite(diameter) ? `${roundTo(diameter, 2)}in` : "",
    parameters.fs,
    parameters.sdCm2,
    parameters.xmaxMm,
    parameters.vasL,
    parameters.re,
  ]
    .filter((value) => value !== undefined && value !== null)
    .join(" ")
    .toLowerCase();
}

function libraryEntryMatchesDiameter(entry, kind, filterValue) {
  if (!DIAMETER_FILTER_VALUES.includes(filterValue)) return true;
  const diameter = libraryEntryDiameterInches(entry, kind);
  if (!Number.isFinite(diameter)) return false;
  if (filterValue === "lte-3") return diameter <= 3.25;
  if (filterValue === "gte-18") return diameter >= 17;
  const target = Number(filterValue);
  const tolerance = target >= 15 ? 0.85 : target >= 6 ? 0.65 : 0.45;
  return Math.abs(diameter - target) <= tolerance;
}

function libraryEntryDiameterInches(entry, kind) {
  const nominalDiameter = nominalDiameterFromName(entry?.name);
  if (Number.isFinite(nominalDiameter)) return nominalDiameter;
  const parameters = kind === "passiveRadiator" ? entry?.passiveRadiator || {} : entry?.driver || {};
  const sdCm2 = Number(parameters.sdCm2);
  if (!Number.isFinite(sdCm2) || sdCm2 <= 0) return NaN;
  return (2 * Math.sqrt(sdCm2 / Math.PI)) / 2.54;
}

function nominalDiameterFromName(name) {
  const text = String(name || "").replace(/[-_/]+/g, " ").replace(/\s+/g, " ");
  const metric = text.match(/\b(\d{2,3})\s*mm\b/i);
  if (metric) return Number(metric[1]) / 25.4;

  const fraction = text.match(/\b(\d{1,2})\s+(1|3)\s+(2|4)\s+(?=aluminum|paper|poly|designer|signature|passive|radiator|woofer|subwoofer|midwoofer|speaker|driver|full|coaxial|professional|neodymium|cone)/i);
  if (fraction) {
    const whole = Number(fraction[1]);
    const numerator = Number(fraction[2]);
    const denominator = Number(fraction[3]);
    return whole + numerator / denominator;
  }

  const explicitInches = text.match(/\b(\d{1,2}(?:\.\d+)?)\s*(?:in|inch|inches|")\b/i);
  if (explicitInches) return Number(explicitInches[1]);

  const nominal = text.match(/\b(\d{1,2}(?:\.\d+)?)\s+(?=aluminum|paper|poly|designer|signature|passive|radiator|woofer|subwoofer|midwoofer|speaker|driver|full|coaxial|professional|neodymium|cone|bmr)/i);
  if (nominal) return Number(nominal[1]);

  return NaN;
}

function compareLibraryEntries(left, right, kind, sort) {
  const [field = "name", direction = "asc"] = String(sort || "name-asc").split("-");
  const multiplier = direction === "desc" ? -1 : 1;
  if (field === "name") {
    const result = left.entry.name.localeCompare(right.entry.name, undefined, { numeric: true, sensitivity: "base" });
    return result * multiplier || left.index - right.index;
  }

  const leftValue = librarySortValue(left.entry, kind, field);
  const rightValue = librarySortValue(right.entry, kind, field);
  const leftFinite = Number.isFinite(leftValue);
  const rightFinite = Number.isFinite(rightValue);
  if (leftFinite && rightFinite && leftValue !== rightValue) return (leftValue - rightValue) * multiplier;
  if (leftFinite !== rightFinite) return leftFinite ? -1 : 1;
  return left.entry.name.localeCompare(right.entry.name, undefined, { numeric: true, sensitivity: "base" }) || left.index - right.index;
}

function librarySortValue(entry, kind, field) {
  const parameters = kind === "passiveRadiator" ? entry.passiveRadiator || {} : entry.driver || {};
  if (field === "fs") return Number(parameters.fs);
  if (field === "sd") return Number(parameters.sdCm2);
  if (field === "xmax") return Number(parameters.xmaxMm);
  return NaN;
}

function libraryParametersMatch(currentParameters = {}, libraryParameters = {}, keys = []) {
  return keys.every((key) => {
    const libraryValue = Number(libraryParameters[key]);
    if (!Number.isFinite(libraryValue)) return true;
    const currentValue = Number(currentParameters[key]);
    return Number.isFinite(currentValue) && Math.abs(currentValue - libraryValue) < 1e-6;
  });
}
