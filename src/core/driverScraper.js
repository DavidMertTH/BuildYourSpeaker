const SEARCH_URL = "https://duckduckgo.com/html/";
const SEARCH_SUFFIX = " loudspeaker driver Thiele Small parameters Fs Qes Qms Vas Sd Xmax Bl Mms Re";
const REQUEST_TIMEOUT_MS = 7000;

const parameterPatterns = [
  { field: "re", label: "Re", regex: /\b(?:Re|Revc|DCR|DC\s+Resistance|Voice\s+coil\s+resistance)\b[\s:=\-()a-zA-Z/]*(-?\d+(?:[.,]\d+)?)/i },
  { field: "leMh", label: "Le", regex: /\b(?:Le|Voice\s+coil\s+inductance)\b[\s:=\-()a-zA-Z/]*(-?\d+(?:[.,]\d+)?)\s*(uH|µH|mH|H)?/i, unit: "inductance" },
  { field: "fs", label: "Fs", regex: /\b(?:Fs|F\(s\)|Resonant\s+frequency|Free\s+air\s+resonance)\b[\s:=\-()a-zA-Z/]*(-?\d+(?:[.,]\d+)?)\s*Hz/i },
  { field: "qms", label: "Qms", regex: /\bQms\b[\s:=\-()a-zA-Z/]*(-?\d+(?:[.,]\d+)?)/i },
  { field: "qes", label: "Qes", regex: /\bQes\b[\s:=\-()a-zA-Z/]*(-?\d+(?:[.,]\d+)?)/i },
  { field: "vasL", label: "Vas", regex: /\b(?:Vas|V\(as\)|Equivalent\s+compliance\s+volume)\b[\s:=\-()a-zA-Z/]*(-?\d+(?:[.,]\d+)?)\s*(liters?|litres?|l\b|ft3|ft³|cu\.?\s*ft)?/i, unit: "volume" },
  { field: "sdCm2", label: "Sd", regex: /\b(?:Sd|S\(d\)|Effective\s+piston\s+area|Cone\s+area)\b[\s:=\-()a-zA-Z/]*(-?\d+(?:[.,]\d+)?)\s*(cm2|cm²|m2|m²|in2|in²|sq\.?\s*in)?/i, unit: "area" },
  { field: "xmaxMm", label: "Xmax", regex: /\b(?:Xmax|X-max|Linear\s+excursion|Maximum\s+linear\s+excursion)\b[\s:=\-()a-zA-Z/+-]*(-?\d+(?:[.,]\d+)?)\s*(mm|cm|in|inch|inches)?/i, unit: "length" },
  { field: "mmsG", label: "Mms", regex: /\b(?:Mms|M\(ms\)|Moving\s+mass)\b[\s:=\-()a-zA-Z/]*(-?\d+(?:[.,]\d+)?)\s*(g|grams?|kg)?/i, unit: "mass" },
  { field: "bl", label: "Bl", regex: /\b(?:BL|Bxl|Force\s+factor|Motor\s+force\s+factor)\b[\s:=\-()a-zA-Z/]*(-?\d+(?:[.,]\d+)?)\s*(Tm|T·m|N\/A)?/i },
];

const passiveRadiatorPatterns = [
  { field: "fs", label: "Fs", regex: /\b(?:Fs|F\(s\)|Resonant\s+frequency|Free\s+air\s+resonance)\b[\s:=\-()a-zA-Z/]*(-?\d+(?:[.,]\d+)?)\s*Hz/i },
  { field: "qms", label: "Qms", regex: /\b(?:Qms|Mechanical\s+Q)\b[\s:=\-()a-zA-Z/]*(-?\d+(?:[.,]\d+)?)/i },
  { field: "mmsG", label: "Mms", regex: /\b(?:Mms|M\(ms\)|Moving\s+mass|Diaphragm\s+mass(?:\s+inc\.?\s+airload)?)\b[\s:=\-()a-zA-Z/]*(-?\d+(?:[.,]\d+)?)\s*(g|grams?|kg)?/i, unit: "mass" },
  { field: "cmsMmN", label: "Cms", regex: /\b(?:Cms|Mechanical\s+Compliance|Compliance\s+of\s+Suspension)\b[\s:=\-()a-zA-Z/]*(-?\d+(?:[.,]\d+)?)\s*(mm\/N|m\/N|um\/N|µm\/N)?/i, unit: "compliance" },
  { field: "sdCm2", label: "Sd", regex: /\b(?:Sd|S\(d\)|Effective\s+piston\s+area|Cone\s+area|Surface\s+Area\s+Of\s+Cone)\b[\s:=\-()a-zA-Z/]*(-?\d+(?:[.,]\d+)?)\s*(cm2|cm²|m2|m²|in2|in²|sq\.?\s*in)?/i, unit: "area" },
  { field: "xmaxMm", label: "Xmax", regex: /\b(?:Xmax|X-max|Linear\s+excursion|Maximum\s+linear\s+excursion)\b[\s:=\-()a-zA-Z/+-]*(-?\d+(?:[.,]\d+)?)\s*(mm|cm|in|inch|inches)?/i, unit: "length" },
  { field: "vasL", label: "Vas", regex: /\b(?:Vas|V\(as\)|Equivalent\s+compliance\s+volume)\b[\s:=\-()a-zA-Z/]*(-?\d+(?:[.,]\d+)?)\s*(liters?|litres?|l\b|ft3|ft³|cu\.?\s*ft)?/i, unit: "volume" },
];

export async function searchDrivers(query) {
  const cleanQuery = String(query || "").trim();
  if (cleanQuery.length < 2) {
    return { query: cleanQuery, results: [] };
  }

  const pages = await findCandidatePages(cleanQuery);
  const fetched = await Promise.allSettled(pages.slice(0, 8).map(fetchCandidate));
  const results = fetched
    .filter((item) => item.status === "fulfilled" && item.value)
    .map((item) => item.value)
    .filter((result) => Object.keys(result.driver).length >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  return { query: cleanQuery, results };
}

export function extractDriverData(html, source = {}) {
  const text = htmlToText(html);
  const driver = {};
  const matched = [];
  const snippets = [];

  for (const pattern of parameterPatterns) {
    const match = findBestParameterMatch(text, pattern);
    if (!match) continue;
    const value = match.value;
    if (!Number.isFinite(value) || value <= 0) continue;
    driver[pattern.field] = roundValue(value);
    matched.push(pattern.label);
    snippets.push(makeSnippet(text, match.index));
  }

  if (driver.bl && driver.bl < 3 && driver.fs && driver.mmsG && driver.re && driver.qes) {
    driver.bl = roundValue(Math.sqrt((2 * Math.PI * driver.fs * (driver.mmsG / 1000) * driver.re) / driver.qes));
    matched.push("Bl derived");
  }

  return {
    title: source.title || extractTitle(html) || source.url || "Driver candidate",
    url: source.url,
    driver,
    matched,
    snippets: [...new Set(snippets)].slice(0, 3),
    score: Object.keys(driver).length * 10 + matched.length,
  };
}

export function extractPassiveRadiatorData(html, source = {}) {
  const text = htmlToText(html);
  const passiveRadiator = {};
  const matched = [];
  const snippets = [];

  for (const pattern of passiveRadiatorPatterns) {
    const match = findBestParameterMatch(text, pattern);
    if (!match) continue;
    const value = match.value;
    if (!Number.isFinite(value) || value <= 0) continue;
    passiveRadiator[pattern.field] = roundValue(value);
    matched.push(pattern.label);
    snippets.push(makeSnippet(text, match.index));
  }

  if (!passiveRadiator.cmsMmN && passiveRadiator.fs && passiveRadiator.mmsG) {
    passiveRadiator.cmsMmN = roundValue(1000 / ((passiveRadiator.mmsG / 1000) * (2 * Math.PI * passiveRadiator.fs) ** 2));
    matched.push("Cms derived");
  } else if (passiveRadiator.cmsMmN > 100) {
    passiveRadiator.cmsMmN = roundValue(passiveRadiator.cmsMmN / 1000);
    matched.push("Cms normalized");
  }

  return {
    title: source.title || extractTitle(html) || source.url || "Passive radiator candidate",
    url: source.url,
    passiveRadiator,
    matched,
    snippets: [...new Set(snippets)].slice(0, 3),
    score: Object.keys(passiveRadiator).length * 10 + matched.length,
  };
}

export async function scrapeDriverPage(url, source = {}) {
  const html = await fetchText(url);
  return extractDriverData(html, { ...source, url });
}

export async function scrapePassiveRadiatorPage(url, source = {}) {
  const html = await fetchText(url);
  return extractPassiveRadiatorData(html, { ...source, url });
}

function findBestParameterMatch(text, pattern) {
  const regex = new RegExp(pattern.regex.source, "gi");
  let best = null;
  let match;

  while ((match = regex.exec(text))) {
    const value = convertValue(parseNumber(match[1]), match[2], pattern.unit);
    if (!Number.isFinite(value) || value <= 0 || !isPlausible(pattern.field, value)) continue;

    const snippet = makeSnippet(text, match.index);
    let score = 1;
    if (snippet.includes(`(${pattern.label})`)) score += 5;
    if (snippet.toLowerCase().includes(pattern.label.toLowerCase())) score += 3;
    if (pattern.field === "mmsG" && /diaphragm mass|airload|mms/i.test(snippet)) score += 6;
    if (pattern.field === "bl" && /bl product|force factor|\(bl\)/i.test(snippet)) score += 6;
    if (pattern.field === "mmsG" && value < 10) score -= 8;
    if (pattern.field === "bl" && value < 3) score -= 4;

    if (!best || score > best.score) {
      best = { value, index: match.index, score };
    }
  }

  return best;
}

function isPlausible(field, value) {
  const ranges = {
    re: [0.1, 100],
    leMh: [0.001, 100],
    fs: [1, 5000],
    qms: [0.05, 100],
    qes: [0.02, 10],
    vasL: [0.001, 10000],
    sdCm2: [0.01, 10000],
    xmaxMm: [0.01, 100],
    mmsG: [0.01, 10000],
    bl: [0.1, 100],
  };
  const range = ranges[field];
  return !range || (value >= range[0] && value <= range[1]);
}

async function findCandidatePages(query) {
  const url = `${SEARCH_URL}?q=${encodeURIComponent(query + SEARCH_SUFFIX)}`;
  const html = await fetchText(url);
  const results = [];
  const linkRegex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/gis;
  let match;

  while ((match = linkRegex.exec(html)) && results.length < 12) {
    const candidateUrl = decodeDuckDuckGoUrl(decodeHtml(match[1]));
    if (!candidateUrl || !/^https?:\/\//i.test(candidateUrl)) continue;
    results.push({
      url: candidateUrl,
      title: htmlToText(match[2]).slice(0, 140) || candidateUrl,
    });
  }

  return uniqueByUrl(results);
}

async function fetchCandidate(candidate) {
  const html = await fetchText(candidate.url);
  return extractDriverData(html, candidate);
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "AudioSim/0.1 (+local driver parameter search)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5",
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function decodeDuckDuckGoUrl(url) {
  try {
    const parsed = new URL(url, SEARCH_URL);
    return parsed.searchParams.get("uddg") || parsed.href;
  } catch {
    return null;
  }
}

function uniqueByUrl(results) {
  const seen = new Set();
  return results.filter((result) => {
    const key = result.url.replace(/#.*$/, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function htmlToText(html) {
  return decodeHtml(String(html || ""))
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(?:tr|p|li|div|h\d|td|th)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html) {
  const match = String(html || "").match(/<title[^>]*>(.*?)<\/title>/is);
  return match ? htmlToText(match[1]) : "";
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function parseNumber(value) {
  return Number(String(value).replace(",", "."));
}

function convertValue(value, unit = "", type = "") {
  const normalizedUnit = String(unit || "").toLowerCase();
  if (type === "inductance") {
    if (normalizedUnit.includes("uh") || normalizedUnit.includes("µh")) return value / 1000;
    if (normalizedUnit === "h") return value * 1000;
    return value;
  }
  if (type === "volume") {
    if (normalizedUnit.includes("ft")) return value * 28.3168;
    return value;
  }
  if (type === "area") {
    if (normalizedUnit.includes("cm")) return value;
    if (normalizedUnit === "m2" || normalizedUnit === "m²") return value * 10000;
    if (normalizedUnit.includes("in")) return value * 6.4516;
    return value;
  }
  if (type === "length") {
    if (normalizedUnit === "cm") return value * 10;
    if (normalizedUnit.includes("in")) return value * 25.4;
    return value;
  }
  if (type === "mass") {
    if (normalizedUnit === "kg") return value * 1000;
    return value;
  }
  if (type === "compliance") {
    if (normalizedUnit === "m/n") return value * 1000;
    if (normalizedUnit === "um/n" || normalizedUnit === "µm/n") return value / 1000;
    return value;
  }
  return value;
}

function roundValue(value) {
  if (Math.abs(value) >= 100) return Math.round(value * 10) / 10;
  if (Math.abs(value) >= 10) return Math.round(value * 100) / 100;
  return Math.round(value * 1000) / 1000;
}

function makeSnippet(text, index) {
  const start = Math.max(0, index - 80);
  const end = Math.min(text.length, index + 140);
  return text.slice(start, end).trim();
}
