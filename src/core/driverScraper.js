import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { fetchUrl as fetch } from "./fetch.js";

const SEARCH_URL = "https://duckduckgo.com/html/";
const PARTS_EXPRESS_ITEMS_URL = "https://www.parts-express.com/api/cacheable/items";
const SEARCH_SUFFIX = " loudspeaker driver Thiele Small parameters Fs Qes Qms Vas Sd Xmax Bl Mms Re";
const PASSIVE_RADIATOR_SEARCH_SUFFIX = " loudspeaker passive radiator parameters Fs Qms Mms Cms Sd Xmax";
const REQUEST_TIMEOUT_MS = 7000;
const MAX_PDF_PAGES = 12;
const MIN_USEFUL_DRIVER_FIELDS = 3;
const MIN_USEFUL_PASSIVE_RADIATOR_FIELDS = 3;
const MAX_LINKED_PDFS_PER_PAGE = 3;
const DRIVER_PARAMETER_FIELDS = ["re", "leMh", "fs", "qms", "qes", "vasL", "sdCm2", "xmaxMm", "mmsG", "bl"];
const PASSIVE_RADIATOR_PARAMETER_FIELDS = ["fs", "qms", "mmsG", "cmsMmN", "sdCm2", "xmaxMm"];
const PDF_LINK_KEYWORDS = [
  "datasheet",
  "data-sheet",
  "data sheet",
  "specsheet",
  "spec-sheet",
  "spec sheet",
  "specification",
  "specifications",
  "technical data",
  "parameter",
  "thiele",
  "small",
  "manual",
];

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

const usableFrequencyPatterns = [
  {
    label: "Usable range",
    regex: /\b(?:usable\s*frequency\s*range|frequency\s*(?:response|range)|effective\s*frequency\s*range|operating\s*frequency\s*range)\b[\s:=\-()a-zA-Z/]*?(\d[\d.,]*)\s*(kHz|Hz)?\s*(?:[-–—]|to)\s*(\d[\d.,]*)\s*(kHz|Hz)?/i,
    range: true,
    score: 12,
  },
  {
    label: "Usable range",
    regex: /\b(?:frequency\s*(?:response|range)|usable\s*frequency\s*range|effective\s*frequency\s*range|operating\s*frequency\s*range)\b[\s:=\-()a-zA-Z/]*?(\d+(?:[.,]\d+)?)\s*(kHz|Hz)\s*(?:[-–—]|to)\s*(\d+(?:[.,]\d+)?)\s*(kHz|Hz)?/i,
    range: true,
    score: 8,
  },
  {
    label: "Recommended crossover",
    regex: /\b(?:recommended|minimum|suggested)\s+(?:crossover|cross\s*over|x[-\s]?over)(?:\s+frequency)?\b[\s:=\-()a-zA-Z/]*?(\d+(?:[.,]\d+)?)\s*(kHz|Hz)/i,
    score: 10,
  },
  {
    label: "Crossover",
    regex: /\b(?:crossover|cross\s*over|x[-\s]?over)\b[\s:=\-()a-zA-Z/]*?(\d+(?:[.,]\d+)?)\s*(kHz|Hz)/i,
    score: 5,
  },
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

  const directUrl = normalizeDirectUrl(cleanQuery);
  if (directUrl) {
    const result = await scrapeDriverPage(directUrl, { title: titleFromUrl(directUrl) });
    if (!isUsefulDriverResult(result)) {
      if (result.imageOnlyPdf) {
        const fallbackQuery = inferQueryFromUrl(directUrl);
        const fallbackResults = fallbackQuery ? await searchWebCandidates(fallbackQuery) : [];
        if (fallbackResults.length) {
          return {
            query: cleanQuery,
            url: directUrl,
            results: fallbackResults,
            directUrl: true,
            imageOnlyPdf: true,
            fallbackQuery,
          };
        }
        throw imageOnlyPdfNeedsOcrError(directUrl);
      }
      throw noUsefulDriverDataError(result, directUrl);
    }
    return {
      query: cleanQuery,
      url: directUrl,
      results: [result],
      directUrl: true,
    };
  }

  const results = await searchWebCandidates(cleanQuery);
  return { query: cleanQuery, results };
}

export async function searchPassiveRadiators(query) {
  const cleanQuery = String(query || "").trim();
  if (cleanQuery.length < 2) {
    return { query: cleanQuery, results: [] };
  }

  const directUrl = normalizeDirectUrl(cleanQuery);
  if (directUrl) {
    const result = await scrapePassiveRadiatorPage(directUrl, { title: titleFromUrl(directUrl) });
    if (!isUsefulPassiveRadiatorResult(result)) {
      if (result.imageOnlyPdf) {
        const fallbackQuery = inferQueryFromUrl(directUrl);
        const fallbackResults = fallbackQuery ? await searchPassiveRadiatorWebCandidates(fallbackQuery) : [];
        if (fallbackResults.length) {
          return {
            query: cleanQuery,
            url: directUrl,
            results: fallbackResults,
            directUrl: true,
            imageOnlyPdf: true,
            fallbackQuery,
          };
        }
        throw imageOnlyPdfNeedsOcrError(directUrl);
      }
      throw noUsefulPassiveRadiatorDataError(result, directUrl);
    }
    return {
      query: cleanQuery,
      url: directUrl,
      results: [result],
      directUrl: true,
    };
  }

  const results = await searchPassiveRadiatorWebCandidates(cleanQuery);
  return { query: cleanQuery, results };
}

async function searchWebCandidates(query) {
  const partsExpressResults = await searchPartsExpressDriverCandidates(query);
  const pages = await findCandidatePages(query);
  const fetched = await Promise.allSettled(pages.slice(0, 8).map((page) => fetchCandidate(page, query)));
  const webResults = fetched
    .filter((item) => item.status === "fulfilled" && item.value)
    .map((item) => item.value)
    .flat()
    .filter(isUsefulDriverResult)
    .filter((result) => candidateMatchesQuery(result, query))
    .filter((result) => !isBrokenSearchResult(result));

  return uniqueByUrl([...partsExpressResults, ...webResults])
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

async function searchPassiveRadiatorWebCandidates(query) {
  const pages = await findCandidatePages(query, PASSIVE_RADIATOR_SEARCH_SUFFIX);
  const fetched = await Promise.allSettled(pages.slice(0, 8).map((page) => fetchPassiveRadiatorCandidate(page, query)));
  return fetched
    .filter((item) => item.status === "fulfilled" && item.value)
    .map((item) => item.value)
    .flat()
    .filter(isUsefulPassiveRadiatorResult)
    .filter((result) => candidateMatchesQuery(result, query))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

async function searchPartsExpressDriverCandidates(query) {
  try {
    const items = await fetchPartsExpressItems(query);
    return items
      .filter((item) => partsExpressItemMatchesQuery(item, query))
      .map(partsExpressItemToDriverResult)
      .filter(isUsefulDriverResult)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  } catch {
    return [];
  }
}

async function fetchPartsExpressItems(query) {
  const url = new URL(PARTS_EXPRESS_ITEMS_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("fieldset", "details");
  const response = await fetch(url.href, {
    headers: {
      "User-Agent": "AudioSim/0.1 (+parts-express driver search)",
      Accept: "application/json,*/*;q=0.8",
    },
  });
  if (!response.ok) throw new Error(`Parts Express HTTP ${response.status}`);
  const payload = await response.json();
  return Array.isArray(payload?.items) ? payload.items : [];
}

function partsExpressItemMatchesQuery(item, query) {
  const haystack = [item?.displayname, item?.storedisplayname2, item?.itemid, item?.mpn, item?.urlcomponent].filter(Boolean).join(" ");
  const modelTokensForQuery = partsExpressModelTokens(query);
  if (modelTokensForQuery.length) {
    const normalized = normalizePartsExpressMatchText(haystack);
    return modelTokensForQuery.every((token) => normalized.includes(token));
  }
  return candidateMatchesQuery({ title: haystack, url: "" }, query);
}

function partsExpressItemToDriverResult(item) {
  const driver = {};
  setPositiveField(driver, "re", item.custitem_pe_dc_resistance_re);
  setPositiveField(driver, "leMh", item.custitem_pe_voice_coil_inductance_le);
  setPositiveField(driver, "fs", item.custitem_pe_resonant_frequency_fs);
  setPositiveField(driver, "qms", item.custitem_pe_mechanical_q_qms);
  setPositiveField(driver, "qes", item.custitem_pe_electromagnetic_q_qes);
  setPositiveField(driver, "vasL", item.custitem_pe_compliance_equiv_volume);
  setPositiveField(driver, "sdCm2", item.custitem_pe_surface_area_of_cone_sd);
  setPositiveField(driver, "xmaxMm", item.custitem_pe_max_linear_excursion);
  setPositiveField(driver, "mmsG", item.custitem_pe_diaphragm_mass_airload);
  setPositiveField(driver, "bl", item.custitem_pe_bl_product_bl);

  const frequencyRange = partsExpressFrequencyRange(item.custitem_pe_frequency_response);
  if (frequencyRange) {
    driver.minFrequencyHz = frequencyRange.min;
    driver.maxFrequencyHz = frequencyRange.max;
  }

  const matched = [];
  DRIVER_PARAMETER_FIELDS.forEach((field) => {
    if (Number.isFinite(driver[field])) matched.push(fieldLabel(field));
  });
  if (frequencyRange) matched.push("Usable range");

  const title = item.displayname || item.storedisplayname2 || item.mpn || item.itemid || "Parts Express driver";
  const url = item.urlcomponent ? `https://www.parts-express.com/${item.urlcomponent}` : "https://www.parts-express.com/";
  return {
    title,
    url,
    driver,
    matched,
    snippets: ["Parts Express product API"],
    score: 500 + Object.keys(driver).length * 10 + matched.length,
  };
}

function setPositiveField(target, field, value) {
  const number = Number(value);
  if (Number.isFinite(number) && number > 0) target[field] = roundValue(number);
}

function partsExpressFrequencyRange(value) {
  const match = String(value || "").match(/(\d[\d.,]*)\s*(kHz|Hz)?\s*(?:-|to|–|—)\s*(\d[\d.,]*)\s*(kHz|Hz)?/i);
  if (!match) return null;
  const min = convertFrequency(parseNumber(match[1]), match[2] || match[4]);
  const max = convertFrequency(parseNumber(match[3]), match[4] || match[2]);
  return Number.isFinite(min) && Number.isFinite(max) && max > min ? { min: roundValue(min), max: roundValue(max) } : null;
}

function fieldLabel(field) {
  const labels = {
    re: "Re",
    leMh: "Le",
    fs: "Fs",
    qms: "Qms",
    qes: "Qes",
    vasL: "Vas",
    sdCm2: "Sd",
    xmaxMm: "Xmax",
    mmsG: "Mms",
    bl: "Bl",
  };
  return labels[field] || field;
}

function partsExpressModelTokens(query) {
  return [...new Set(String(query || "").match(/[a-z0-9]+(?:[-_][a-z0-9]+)+/gi) || [])]
    .map(normalizePartsExpressMatchText)
    .filter((token) => token.length >= 4 && /\d/.test(token));
}

function normalizePartsExpressMatchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function isBrokenSearchResult(result) {
  const title = String(result?.title || "").trim();
  return !title || /[+][$][(]this[)]|function\s*\(|<script|<\/|undefined|null/i.test(title);
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

  const usableFrequency = findBestUsableFrequencyMatch(text);
  if (usableFrequency) {
    driver.minFrequencyHz = roundValue(usableFrequency.value);
    if (Number.isFinite(usableFrequency.maxValue) && usableFrequency.maxValue > usableFrequency.value) {
      driver.maxFrequencyHz = roundValue(usableFrequency.maxValue);
    }
    matched.push(usableFrequency.label);
    snippets.push(makeSnippet(text, usableFrequency.index));
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
  const document = await fetchDocument(url);
  return {
    ...extractDriverData(document.text, { ...source, url: document.finalUrl }),
    imageOnlyPdf: Boolean(document.isPdf && !document.text.trim()),
  };
}

export async function scrapePassiveRadiatorPage(url, source = {}) {
  const document = await fetchDocument(url);
  return {
    ...extractPassiveRadiatorData(document.text, { ...source, url: document.finalUrl }),
    imageOnlyPdf: Boolean(document.isPdf && !document.text.trim()),
  };
}

function isUsefulDriverResult(result) {
  const driver = result?.driver || {};
  const parameterCount = DRIVER_PARAMETER_FIELDS.filter((field) => Number.isFinite(Number(driver[field]))).length;
  return parameterCount >= MIN_USEFUL_DRIVER_FIELDS;
}

function isUsefulPassiveRadiatorResult(result) {
  const passiveRadiator = result?.passiveRadiator || {};
  const parameterCount = PASSIVE_RADIATOR_PARAMETER_FIELDS.filter((field) => Number.isFinite(Number(passiveRadiator[field]))).length;
  const hasFs = Number.isFinite(Number(passiveRadiator.fs));
  const hasMassOrCompliance = Number.isFinite(Number(passiveRadiator.mmsG)) || Number.isFinite(Number(passiveRadiator.cmsMmN));
  const hasAreaOrExcursion = Number.isFinite(Number(passiveRadiator.sdCm2)) || Number.isFinite(Number(passiveRadiator.xmaxMm));
  return hasFs && hasMassOrCompliance && hasAreaOrExcursion && parameterCount >= MIN_USEFUL_PASSIVE_RADIATOR_FIELDS;
}

function noUsefulPassiveRadiatorDataError(result, url) {
  const matched = result?.matched?.length ? ` Found only: ${result.matched.join(", ")}.` : "";
  const error = new Error(
    `No usable passive radiator parameters found in this datasheet. The link was read, but it did not contain enough recognizable PR values.${matched}`,
  );
  error.statusCode = 422;
  error.directUrl = true;
  error.url = url;
  return error;
}

function noUsefulDriverDataError(result, url) {
  const matched = result?.matched?.length ? ` Found only: ${result.matched.join(", ")}.` : "";
  const error = new Error(
    `No usable T/S parameters found in this datasheet. The link was read, but it did not contain enough recognizable driver values.${matched}`,
  );
  error.statusCode = 422;
  error.directUrl = true;
  error.url = url;
  return error;
}

function imageOnlyPdfNeedsOcrError(url) {
  const error = new Error(
    "This PDF contains no selectable text, so it needs OCR or an alternate product page. No usable fallback source was found.",
  );
  error.statusCode = 422;
  error.directUrl = true;
  error.imageOnlyPdf = true;
  error.url = url;
  return error;
}

function inferQueryFromUrl(url) {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname
      .split("/")
      .map((segment) => decodeURIComponentSafe(segment).replace(/\.[a-z0-9]+$/i, ""))
      .map((segment) => segment.replace(/^pdf[_\s-]*/i, "").replace(/[_+]+/g, " ").trim())
      .filter(Boolean)
      .filter((segment) => !/^(pdf|doc|docs|brand|brands|download|downloads|file|files)$/i.test(segment));
    const modelSegmentIndex = segments.findIndex((segment) => modelTokens(segment).some((token) => /\d/.test(token)));
    const modelTokensInUrl = [...new Set(modelTokens(segments.join(" ")).filter((token) => /\d/.test(token)))];
    const brand = modelSegmentIndex > 0 ? segments[modelSegmentIndex - 1] : "";
    return `${brand} ${modelTokensInUrl.join(" ")} datasheet`.replace(/\s+/g, " ").trim();
  } catch {
    return "";
  }
}

function candidateMatchesQuery(result, query) {
  const tokens = modelTokens(query).filter((token) => /\d/.test(token));
  if (!tokens.length) return true;
  const haystack = `${result?.title || ""} ${result?.url || ""} ${(result?.snippets || []).join(" ")}`.toLowerCase();
  return tokens.some((token) => haystack.includes(token));
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

function findBestUsableFrequencyMatch(text) {
  let best = null;
  for (const pattern of usableFrequencyPatterns) {
    const regex = new RegExp(pattern.regex.source, "gi");
    let match;

    while ((match = regex.exec(text))) {
      const value = convertFrequency(parseNumber(match[1]), match[2] || (pattern.range ? match[4] : match[3]));
      if (!Number.isFinite(value) || value <= 0 || value > 20000) continue;
      const maxValue = pattern.range ? convertFrequency(parseNumber(match[3]), match[4] || match[2]) : NaN;
      if (pattern.range && (!Number.isFinite(maxValue) || maxValue <= value || maxValue > 100000)) continue;

      const snippet = makeSnippet(text, match.index);
      let score = pattern.score;
      if (/tweeter|compression\s+driver|horn|midrange|full[-\s]?range/i.test(snippet)) score += 2;
      if (/woofer|subwoofer/i.test(snippet) && value > 200) score -= 2;
      if (value < 10) score -= 3;

      if (!best || score > best.score) {
        best = { value, maxValue, index: match.index, score, label: pattern.label };
      }
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

async function findCandidatePages(query, suffix = SEARCH_SUFFIX) {
  const url = `${SEARCH_URL}?q=${encodeURIComponent(query + suffix)}`;
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

function normalizeDirectUrl(value) {
  const text = String(value || "").trim();
  const explicitMatch = text.match(/https?:\/\/[^\s<>"']+/i);
  const candidate = explicitMatch?.[0] || text.match(/(?:www\.|(?:[a-z0-9-]+\.)+[a-z]{2,}|localhost|\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?\/[^\s<>"']+/i)?.[0];
  if (!candidate) return "";
  const cleaned = candidate.replace(/[),.;\]]+$/g, "");
  const defaultProtocol = /^(localhost|\d{1,3}(?:\.\d{1,3}){3})(?::|\/)/i.test(cleaned) ? "http" : "https";
  const withProtocol = /^https?:\/\//i.test(cleaned) ? cleaned : `${defaultProtocol}://${cleaned}`;

  try {
    const url = new URL(withProtocol);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function titleFromUrl(url) {
  try {
    const parsed = new URL(url);
    const file = parsed.pathname.split("/").filter(Boolean).pop() || parsed.hostname;
    return decodeURIComponent(file).replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").trim() || parsed.hostname;
  } catch {
    return "Linked datasheet";
  }
}

async function fetchCandidate(candidate, query = "") {
  const document = await fetchDocument(candidate.url);
  const results = [];
  const pageResult = extractDriverData(document.text, { ...candidate, url: document.finalUrl });
  results.push(pageResult);

  if (!document.isPdf) {
    const pdfCandidates = findDatasheetPdfLinks(document.text, document.finalUrl, `${query} ${candidate.title || ""}`);
    const pdfResults = await Promise.allSettled(
      pdfCandidates.slice(0, MAX_LINKED_PDFS_PER_PAGE).map(async (pdfCandidate) => {
        const pdfText = await fetchText(pdfCandidate.url);
        const result = extractDriverData(pdfText, pdfCandidate);
        result.score += pdfCandidate.scoreBoost || 0;
        return result;
      }),
    );
    pdfResults
      .filter((item) => item.status === "fulfilled" && item.value)
      .forEach((item) => results.push(item.value));
  }

  return results;
}

async function fetchPassiveRadiatorCandidate(candidate, query = "") {
  const document = await fetchDocument(candidate.url);
  const results = [];
  const pageResult = extractPassiveRadiatorData(document.text, { ...candidate, url: document.finalUrl });
  results.push(pageResult);

  if (!document.isPdf) {
    const pdfCandidates = findDatasheetPdfLinks(document.text, document.finalUrl, `${query} ${candidate.title || ""}`);
    const pdfResults = await Promise.allSettled(
      pdfCandidates.slice(0, MAX_LINKED_PDFS_PER_PAGE).map(async (pdfCandidate) => {
        const pdfText = await fetchText(pdfCandidate.url);
        const result = extractPassiveRadiatorData(pdfText, pdfCandidate);
        result.score += pdfCandidate.scoreBoost || 0;
        return result;
      }),
    );
    pdfResults
      .filter((item) => item.status === "fulfilled" && item.value)
      .forEach((item) => results.push(item.value));
  }

  return results;
}

async function fetchText(url) {
  return (await fetchDocument(url)).text;
}

async function fetchDocument(url) {
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
    const contentType = response.headers.get("content-type") || "";
    if (/application\/pdf/i.test(contentType) || new URL(response.url).pathname.toLowerCase().endsWith(".pdf")) {
      return {
        finalUrl: response.url,
        isPdf: true,
        text: await extractPdfText(await response.arrayBuffer()),
      };
    }
    return {
      finalUrl: response.url,
      isPdf: false,
      text: await response.text(),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function findDatasheetPdfLinks(html, baseUrl, query = "") {
  const links = [];
  const elementRegex = /<(a|button|div|span)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  const urlTokens = modelTokens(query);
  let match;

  while ((match = elementRegex.exec(String(html || "")))) {
    const tag = match[1].toLowerCase();
    const attrs = match[2] || "";
    const text = htmlToText(match[3]);
    if (!shouldInspectDocumentElement(tag, attrs, text)) continue;

    const attrText = htmlToText(attrs);
    const urls = extractDocumentUrls(attrs, baseUrl);
    urls.forEach((url) => {
      const label = `${text} ${attrText} ${decodeURIComponentSafe(url)}`.trim();
      const score = datasheetPdfScore(label, urlTokens);
      if (!isLikelyDatasheetDocument(url, score)) return;

      links.push({
        url,
        title: text || titleFromUrl(url),
        score,
        scoreBoost: Math.min(18, score),
      });
    });
  }

  return uniqueByUrl(links)
    .sort((a, b) => b.score - a.score)
    .map(({ score, ...candidate }) => candidate);
}

function shouldInspectDocumentElement(tag, attrs, text) {
  if (tag === "a" || tag === "button") return true;
  const descriptor = `${attrs} ${text}`.toLowerCase();
  return /\b(?:button|download|datasheet|data[-\s]?sheet|spec[-\s]?sheet|manual)\b/.test(descriptor);
}

function extractDocumentUrls(attrs, baseUrl) {
  const urls = [];
  const values = [];
  const attrRegex = /([a-z0-9_:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  let attrMatch;

  while ((attrMatch = attrRegex.exec(attrs))) {
    const name = attrMatch[1] || "";
    const value = decodeHtml(attrMatch[2] || attrMatch[3] || attrMatch[4] || "");
    values.push(value);
    if (/href|src|url|download|file|pdf|onclick/i.test(name)) values.push(`${name} ${value}`);
  }

  values.forEach((value) => {
    extractUrlLikeValues(value).forEach((candidate) => {
      const url = resolveHttpUrl(candidate, baseUrl);
      if (url) urls.push(url);
    });
  });

  return [...new Set(urls)];
}

function extractUrlLikeValues(value) {
  const text = String(value || "").replace(/\\\//g, "/");
  const matches = text.match(/https?:\/\/[^\s"'<>),]+|(?:\.{1,2}\/|\/)[^\s"'<>),]+|[a-z0-9][a-z0-9._~%/-]*\.pdf(?:[?#][^\s"'<>),]+)?/gi) || [];
  return matches
    .map((match) => match.replace(/[.;]+$/g, ""))
    .filter((match) => !/^javascript:/i.test(match) && !/^mailto:/i.test(match) && !match.startsWith("#"));
}

function isLikelyDatasheetDocument(url, score) {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();
    if (/\/(?:cart|basket|checkout|account|login|wishlist|compare)(?:\/|$)/i.test(pathname)) return false;
    if (pathname.endsWith(".pdf")) return score > 0;
    if (score >= 8 && !/\.(?:jpg|jpeg|png|gif|svg|webp|css|js|json|zip)$/i.test(pathname)) return true;
  } catch {
    return false;
  }
  return false;
}

function resolveHttpUrl(href, baseUrl) {
  try {
    const url = new URL(href, baseUrl);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function datasheetPdfScore(label, queryTokens = []) {
  const text = String(label || "").toLowerCase();
  let score = text.includes(".pdf") ? 1 : 0;
  PDF_LINK_KEYWORDS.forEach((keyword) => {
    if (text.includes(keyword)) score += keyword.includes("sheet") || keyword.includes("spec") ? 6 : 3;
  });
  queryTokens.forEach((token) => {
    if (token.length >= 3 && text.includes(token)) score += 3;
  });
  if (/datasheet|data[-\s]?sheet|spec[-\s]?sheet/i.test(text)) score += 8;
  if (/warranty|catalog|brochure|drawing|image|logo|terms|shipping/i.test(text)) score -= 5;
  return score;
}

function modelTokens(value) {
  return [...new Set(String(value || "")
    .toLowerCase()
    .match(/[a-z]*\d+[a-z0-9-]*|[a-z]{3,}/g) || [])]
    .filter((token) => token.length >= 3 && !PDF_LINK_KEYWORDS.includes(token));
}

function decodeURIComponentSafe(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return String(value || "");
  }
}

async function extractPdfText(arrayBuffer) {
  const pdfjs = await loadPdfJs();
  const document = await pdfjs.getDocument({
    data: new Uint8Array(arrayBuffer),
    disableWorker: true,
    useSystemFonts: true,
  }).promise;
  const pages = [];
  const pageCount = Math.min(document.numPages, MAX_PDF_PAGES);

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent({ disableCombineTextItems: false });
    const layoutText = pdfItemsToLayoutText(content.items);
    const streamText = content.items.map((item) => item.str || "").join(" ");
    pages.push([layoutText, streamText].filter(Boolean).join("\n"));
  }

  return pages.join("\n");
}

function pdfItemsToLayoutText(items) {
  const yTolerance = 2.5;
  const lines = [];
  const textItems = items
    .map((item) => ({
      text: String(item.str || "").trim(),
      x: Number(item.transform?.[4]),
      y: Number(item.transform?.[5]),
    }))
    .filter((item) => item.text && Number.isFinite(item.x) && Number.isFinite(item.y))
    .sort((a, b) => b.y - a.y || a.x - b.x);

  textItems.forEach((item) => {
    const line = lines.find((candidate) => Math.abs(candidate.y - item.y) <= yTolerance);
    if (line) {
      const previousCount = line.items.length;
      line.items.push(item);
      line.y = (line.y * previousCount + item.y) / line.items.length;
    } else {
      lines.push({ y: item.y, items: [item] });
    }
  });

  return lines
    .sort((a, b) => b.y - a.y)
    .map((line) => line.items
      .sort((a, b) => a.x - b.x)
      .map((item) => item.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim())
    .filter(Boolean)
    .join("\n");
}

async function loadPdfJs() {
  ensurePdfDomPolyfills();
  const candidates = [
    "pdfjs-dist/legacy/build/pdf.mjs",
    pathToFileURL(join(dirname(process.execPath), "..", "node_modules", "pdfjs-dist", "legacy", "build", "pdf.mjs")).href,
  ];
  let lastError = null;

  for (const candidate of candidates) {
    try {
      return await importPdfJs(candidate);
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(`PDF datasheet parsing needs pdfjs-dist. ${lastError?.message || ""}`.trim());
}

async function importPdfJs(candidate) {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    const message = String(args[0] || "");
    if (message.includes("@napi-rs/canvas")) return;
    originalWarn(...args);
  };
  try {
    return await import(candidate);
  } finally {
    console.warn = originalWarn;
  }
}

function ensurePdfDomPolyfills() {
  if (!globalThis.DOMMatrix) {
    globalThis.DOMMatrix = class DOMMatrix {
      constructor() {
        this.a = 1;
        this.b = 0;
        this.c = 0;
        this.d = 1;
        this.e = 0;
        this.f = 0;
        this.is2D = true;
        this.isIdentity = true;
      }

      multiplySelf() { return this; }
      preMultiplySelf() { return this; }
      translateSelf() { return this; }
      scaleSelf() { return this; }
      rotateSelf() { return this; }
      invertSelf() { return this; }
      transformPoint(point = {}) { return point; }
    };
  }
  if (!globalThis.ImageData) {
    globalThis.ImageData = class ImageData {
      constructor(data = [], width = 0, height = 0) {
        this.data = data;
        this.width = width;
        this.height = height;
      }
    };
  }
  if (!globalThis.Path2D) {
    globalThis.Path2D = class Path2D {};
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
  const text = String(value || "").trim();
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(text)) return Number(text.replace(/,/g, ""));
  if (/^-?\d{1,3}(\.\d{3})+,(\d+)$/.test(text)) return Number(text.replace(/\./g, "").replace(",", "."));
  if (text.includes(",") && text.includes(".")) {
    const decimalSeparator = text.lastIndexOf(",") > text.lastIndexOf(".") ? "," : ".";
    return Number(
      decimalSeparator === ","
        ? text.replace(/\./g, "").replace(",", ".")
        : text.replace(/,/g, ""),
    );
  }
  if (text.includes(",")) {
    const [, decimals = ""] = text.split(",");
    return Number(decimals.length === 3 ? text.replace(/,/g, "") : text.replace(",", "."));
  }
  return Number(text);
}

function convertValue(value, unit = "", type = "") {
  const normalizedUnit = normalizeUnit(unit);
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

function normalizeUnit(unit) {
  return String(unit || "")
    .toLowerCase()
    .replace(/Â/g, "")
    .replace(/[µμ]/g, "u")
    .replace(/²/g, "2")
    .replace(/\s+/g, "");
}

function convertFrequency(value, unit = "") {
  const normalizedUnit = String(unit || "").toLowerCase();
  if (normalizedUnit === "khz") return value * 1000;
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
