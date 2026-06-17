import { inflateRawSync } from "node:zlib";
import { fetchUrl as fetch } from "./fetch.js";
import { inferAngleFromName, normalizeFrequencyResponse, parseFrequencyResponseText } from "./measurements.js";

const SEARCH_URL = "https://duckduckgo.com/html/";
const PARTS_EXPRESS_ITEMS_URL = "https://www.parts-express.com/api/cacheable/items";
const PARTS_EXPRESS_DOWNLOADS_SERVICE = "https://www.parts-express.com/PartsExpressSuiteCentric/SCA-2019-1/extensions/PartsExpress/PDPDownloads/1.0.0/services/PDP.Downloads.Service.ss";
const LOUDSPEAKER_DATABASE_HOST = "loudspeakerdatabase.com";
const REQUEST_TIMEOUT_MS = 7000;
const MAX_RESULTS = 10;
const MAX_PAGES_PER_SOURCE = 5;
const RESPONSE_LINK_KEYWORDS = [
  "frequency response",
  "frequenzgang",
  "spl",
  "response",
  "measurement",
  "measured",
  "graph",
  "chart",
  "frd",
  "csv",
  "txt",
  "clio",
  "klippel",
];
const DRIVER_TERMS = /(woofer|subwoofer|driver|tweeter|midrange|full-range|fullrange|speaker|lautsprecher|compression|coaxial)/i;

export async function searchFrequencyResponses(query, options = {}) {
  const cleanQuery = String(query || "").trim();
  if (cleanQuery.length < 2) {
    return { query: cleanQuery, results: [] };
  }

  const directUrl = normalizeDirectUrl(cleanQuery);
  if (directUrl) {
    const results = sourceNameFromUrl(directUrl) === "Parts Express"
      ? await scrapePartsExpressFrequencyResponsePage(directUrl, options)
      : await scrapeFrequencyResponsePage(directUrl, { query: cleanQuery });
    return {
      query: cleanQuery,
      url: directUrl,
      directUrl: true,
      results: rankAndDedupeResults(results).slice(0, options.limit || MAX_RESULTS),
    };
  }

  const searches = await Promise.allSettled([
    searchPartsExpressFrequencyResponses(cleanQuery, options),
    searchLoudspeakerDatabaseFrequencyResponses(cleanQuery, options),
    searchWebFrequencyResponseCandidates(cleanQuery, options),
  ]);

  const results = searches
    .filter((item) => item.status === "fulfilled" && Array.isArray(item.value))
    .flatMap((item) => item.value);

  return {
    query: cleanQuery,
    results: rankAndDedupeResults(results).slice(0, options.limit || MAX_RESULTS),
  };
}

export async function searchPartsExpressFrequencyResponses(query, options = {}) {
  const items = await fetchPartsExpressItems(query);
  return partsExpressFrequencyResponseResultsFromItems(items.filter((item) => partsExpressItemMatchesQuery(item, query)), query, options);
}

async function scrapePartsExpressFrequencyResponsePage(url, options = {}) {
  const slug = partsExpressSlugFromUrl(url);
  if (!slug) return scrapeFrequencyResponsePage(url, { query: url, source: "Parts Express" });
  const item = await fetchPartsExpressItemBySlug(slug);
  if (!item) return scrapeFrequencyResponsePage(url, { query: url, source: "Parts Express" });
  return partsExpressFrequencyResponseResultsFromItems([item], item.mpn || item.displayname || slug, options);
}

async function partsExpressFrequencyResponseResultsFromItems(items, query, options = {}) {
  const limitedItems = items.slice(0, options.partsExpressLimit || 5);
  const productCandidates = limitedItems.flatMap((item) => partsExpressFrequencyResponseCandidatesFromItem(item, query));
  const downloadCandidateResults = await Promise.allSettled(limitedItems.map((item) => fetchPartsExpressDownloadCandidatesFromItem(item, query)));
  const downloadCandidates = downloadCandidateResults
    .filter((item) => item.status === "fulfilled" && Array.isArray(item.value))
    .flatMap((item) => item.value);
  const candidates = [...productCandidates, ...downloadCandidates];

  const fetchedResources = await Promise.allSettled(
    candidates
      .filter((candidate) => shouldFetchCandidateResource(candidate.url))
      .slice(0, 8)
      .map((candidate) => parseResponseResourceCandidate(candidate)),
  );

  return [
    ...candidates,
    ...fetchedResources
      .filter((item) => item.status === "fulfilled" && item.value)
      .flatMap((item) => Array.isArray(item.value) ? item.value : [item.value]),
  ];
}

export async function searchLoudspeakerDatabaseFrequencyResponses(query, options = {}) {
  const pages = await findSearchResultPages(`${query} site:${LOUDSPEAKER_DATABASE_HOST}`, MAX_PAGES_PER_SOURCE);
  const matches = pages.filter((page) => {
    try {
      return page.url && new URL(page.url).hostname.includes(LOUDSPEAKER_DATABASE_HOST);
    } catch {
      return false;
    }
  });
  const fetched = await Promise.allSettled(matches.slice(0, options.loudspeakerDatabaseLimit || 4).map((page) => scrapeFrequencyResponsePage(page.url, {
    title: page.title,
    query,
    source: "Loudspeaker Database",
  })));

  const parsed = fetched
    .filter((item) => item.status === "fulfilled" && Array.isArray(item.value))
    .flatMap((item) => item.value);
  const pageCandidates = matches.map((page) => createCandidateResult({
    title: page.title || "Loudspeaker Database result",
    url: page.url,
    source: "Loudspeaker Database",
    format: "html",
    reason: "Driver database page; may list frequency range and product links.",
    score: 24,
  }));

  return [...parsed, ...pageCandidates];
}

export async function searchWebFrequencyResponseCandidates(query, options = {}) {
  const pages = await findSearchResultPages(`${query} loudspeaker frequency response FRD CSV SPL`, options.webLimit || MAX_PAGES_PER_SOURCE);
  const fetched = await Promise.allSettled(pages.slice(0, 4).map((page) => scrapeFrequencyResponsePage(page.url, {
    title: page.title,
    query,
    source: sourceNameFromUrl(page.url),
  })));

  return fetched
    .filter((item) => item.status === "fulfilled" && Array.isArray(item.value))
    .flatMap((item) => item.value);
}

export async function scrapeFrequencyResponsePage(url, source = {}) {
  const document = await fetchTextDocument(url);
  const directData = parseEmbeddedFrequencyResponse(document.body, {
    name: source.title || titleFromUrl(url),
    source: url,
  });
  const directResult = directData ? [createParsedResult(directData, {
    title: source.title || directData.name,
    url,
    source: source.source || sourceNameFromUrl(url),
    reason: "Numeric frequency response data found in page text.",
    score: 90,
  })] : [];

  const linkCandidates = extractFrequencyResponseLinks(document.body, url, source.query)
    .slice(0, 8)
    .map((candidate) => ({
      ...candidate,
      title: candidate.title || source.title || titleFromUrl(candidate.url),
      source: source.source || sourceNameFromUrl(candidate.url),
    }));
  const parsedResources = await Promise.allSettled(
    linkCandidates
      .filter((candidate) => shouldFetchCandidateResource(candidate.url))
      .slice(0, 4)
      .map((candidate) => parseResponseResourceCandidate(candidate)),
  );

  return [
    ...directResult,
    ...linkCandidates,
    ...parsedResources
      .filter((item) => item.status === "fulfilled" && item.value)
      .flatMap((item) => Array.isArray(item.value) ? item.value : [item.value]),
  ];
}

export function partsExpressFrequencyResponseCandidatesFromItem(item, query = "") {
  const productUrl = item?.urlcomponent ? `https://www.parts-express.com/${item.urlcomponent}` : "";
  const title = item?.displayname || item?.storedisplayname2 || item?.itemid || item?.mpn || "Parts Express driver";
  const source = "Parts Express";
  const candidates = [];

  const range = String(item?.custitem_pe_frequency_response || "").trim();
  if (range) {
    candidates.push(createCandidateResult({
      title,
      url: productUrl,
      source,
      format: "api-range",
      reason: `Listed frequency range: ${range}. This is not a measured SPL curve.`,
      score: queryMatchesText(query, `${title} ${item?.mpn || ""}`) ? 42 : 30,
    }));
  }

  for (const resource of extractPartsExpressResources(item)) {
    candidates.push(createCandidateResult({
      title: `${title} - ${resource.label}`,
      url: resource.url,
      source,
      format: formatFromUrl(resource.url),
      reason: resource.reason,
      score: resource.score + (queryMatchesText(query, `${title} ${item?.mpn || ""}`) ? 12 : 0),
    }));
  }

  return candidates;
}

export function extractFrequencyResponseLinks(html, baseUrl, query = "") {
  const matches = [];
  const tagRegex = /<(a|img|source|button|div|span)\b([^>]*)>([\s\S]*?)(?:<\/\1>)?/gi;
  let match;
  while ((match = tagRegex.exec(String(html || "")))) {
    const tag = match[1].toLowerCase();
    const attrs = match[2] || "";
    const body = stripTags(match[3] || "");
    const attrsText = decodeHtml(attrs.replace(/<[^>]*>/g, " "));
    const descriptiveText = extractDescriptiveAttributeText(attrs);
    const label = decodeHtml(`${body} ${descriptiveText}`.replace(/\s+/g, " ").trim());
    const urls = extractUrlsFromAttributes(attrs, baseUrl);

    for (const url of urls) {
      const score = scoreResponseCandidate(`${label} ${attrsText} ${url}`, query);
      if (score <= 0) continue;
      matches.push(createCandidateResult({
        title: label || titleFromUrl(url),
        url,
        source: sourceNameFromUrl(url),
        format: formatFromUrl(url, tag),
        reason: reasonForCandidate(label, url),
        score,
      }));
    }
  }

  return rankAndDedupeResults(matches);
}

export function parseEmbeddedFrequencyResponse(htmlOrText, source = {}) {
  const text = htmlToText(htmlOrText);
  if (!/(frequency\s*response|frequenzgang|spl|frd|measurement|measured)/i.test(text)) return null;

  const blocks = extractLikelyDataBlocks(text);
  for (const block of blocks) {
    try {
      const response = parseFrequencyResponseText(block, {
        name: source.name || "Scraped response",
        source: source.source,
        angleDeg: source.angleDeg || 0,
        plane: source.plane || "horizontal",
        importedAt: source.importedAt || "",
      });
      if (isUsefulResponse(response)) return response;
    } catch {
      // Keep trying smaller blocks.
    }
  }

  try {
    const response = parseFrequencyResponseText(text, {
      name: source.name || "Scraped response",
      source: source.source,
      angleDeg: source.angleDeg || 0,
      plane: source.plane || "horizontal",
      importedAt: source.importedAt || "",
    });
    return isUsefulResponse(response) ? response : null;
  } catch {
    return null;
  }
}

async function fetchPartsExpressItems(query) {
  const url = new URL(PARTS_EXPRESS_ITEMS_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("fieldset", "details");
  const response = await fetchJsonDocument(url.href);
  const items = response?.items || response?.data?.items || [];
  return Array.isArray(items) ? items : [];
}

async function fetchPartsExpressItemBySlug(slug) {
  const url = new URL(PARTS_EXPRESS_ITEMS_URL);
  url.searchParams.set("url", slug);
  url.searchParams.set("fieldset", "details");
  const response = await fetchJsonDocument(url.href);
  return Array.isArray(response?.items) ? response.items[0] : null;
}

async function fetchPartsExpressDownloadCandidatesFromItem(item, query = "") {
  if (!item?.internalid) return [];
  const url = new URL(PARTS_EXPRESS_DOWNLOADS_SERVICE);
  url.searchParams.set("itemid", item.internalid);
  const payload = await fetchJsonDocument(url.href);
  const downloads = Array.isArray(payload?.data) ? payload.data : [];
  const productTitle = item?.displayname || item?.storedisplayname2 || item?.itemid || item?.mpn || "Parts Express driver";
  return downloads
    .map((resource) => partsExpressDownloadResourceCandidate(resource, productTitle, query))
    .filter(Boolean);
}

function partsExpressDownloadResourceCandidate(resource, productTitle, query = "") {
  const url = absoluteUrl(resource?.url || "", "https://www.parts-express.com/");
  if (!url) return null;
  const label = resource?.title || resource?.name || titleFromUrl(url);
  const text = `${label} ${resource?.fileType?.label || ""} ${url}`;
  const score = scoreResponseCandidate(text, query);
  if (score <= 0 && !/\.(?:zip|frd|csv|txt|dat)(?:$|[?#])/i.test(url)) return null;
  return createCandidateResult({
    title: `${productTitle} - ${label}`,
    url,
    source: "Parts Express",
    format: formatFromUrl(resource?.name || url),
    reason: /\bzip\b/i.test(resource?.fileType?.label || resource?.name || url)
      ? "Parts Express resource ZIP may contain FRD/ZMA measurement files."
      : "Parts Express linked product resource may contain response data.",
    score: Math.max(score, 48),
  });
}

function extractPartsExpressResources(item) {
  const resources = [];
  const manuals = String(item?.custitem_product_manuals_resources || "");
  for (const link of extractFrequencyResponseLinks(manuals, "https://www.parts-express.com/")) {
    resources.push({
      label: labelFromCandidate(link),
      url: link.url,
      reason: "Linked product resource mentions response or measurement data.",
      score: 45,
    });
  }

  const images = flattenImageUrls(item?.itemimages_detail);
  for (const imageUrl of images) {
    const score = scoreResponseCandidate(imageUrl);
    if (score < 8 && !/_ALT_/i.test(imageUrl)) continue;
    resources.push({
      label: "product image candidate",
      url: imageUrl,
      reason: "Product image candidate; may contain a response graph and needs digitizing before import.",
      score: Math.max(18, score),
    });
  }

  return dedupeByUrl(resources).slice(0, 5);
}

async function parseResponseResourceCandidate(candidate) {
  try {
    if (isZipUrl(candidate.url)) {
      return await parseZipResponseResourceCandidate(candidate);
    }
    const document = await fetchTextDocument(candidate.url);
    const response = parseEmbeddedFrequencyResponse(document.body, {
      name: candidate.title || titleFromUrl(candidate.url),
      source: candidate.url,
    });
    if (!response) return null;
    return createParsedResult(response, {
      title: candidate.title || response.name,
      url: candidate.url,
      source: candidate.source,
      reason: "Numeric frequency response data found in linked resource.",
      score: candidate.score + 40,
    });
  } catch {
    return null;
  }
}

async function parseZipResponseResourceCandidate(candidate) {
  const document = await fetchBinaryDocument(candidate.url);
  const entries = extractZipTextEntries(document.body)
    .filter((entry) => /\.frd$/i.test(entry.name));
  return entries
    .map((entry) => {
      try {
        const response = parseFrequencyResponseText(entry.text, {
          name: `${candidate.title || titleFromUrl(candidate.url)} - ${entry.name.split("/").pop()}`,
          source: `${candidate.url}#${entry.name}`,
          angleDeg: inferAngleFromResourceName(entry.name),
          plane: "horizontal",
        });
        if (!isUsefulResponse(response)) return null;
        return createParsedResult(response, {
          title: response.name,
          url: `${candidate.url}#${entry.name}`,
          source: candidate.source || sourceNameFromUrl(candidate.url),
          reason: `Parsed FRD data from ZIP entry ${entry.name}.`,
          score: (candidate.score || 40) + 65,
        });
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

async function findSearchResultPages(query, limit = MAX_PAGES_PER_SOURCE) {
  const url = new URL(SEARCH_URL);
  url.searchParams.set("q", query);
  const { body } = await fetchTextDocument(url.href);
  const links = [];
  const regex = /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = regex.exec(body))) {
    const targetUrl = decodeDuckDuckGoUrl(decodeHtml(match[1]));
    if (!targetUrl) continue;
    links.push({
      title: decodeHtml(stripTags(match[2])).trim(),
      url: targetUrl,
    });
  }
  return dedupeByUrl(links).slice(0, limit);
}

async function fetchTextDocument(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "AudioSim/0.1 (+frequency-response-search)",
        Accept: "text/html,application/xhtml+xml,text/plain,text/csv,*/*;q=0.8",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return {
      url: response.url || url,
      contentType: response.headers.get("content-type") || "",
      body: await response.text(),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchBinaryDocument(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "AudioSim/0.1 (+frequency-response-search)",
        Accept: "application/zip,application/octet-stream,*/*;q=0.8",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return {
      url: response.url || url,
      contentType: response.headers.get("content-type") || "",
      body: Buffer.from(await response.arrayBuffer()),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJsonDocument(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "AudioSim/0.1 (+frequency-response-search)",
        Accept: "application/json,*/*;q=0.8",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function createParsedResult(response, source = {}) {
  const normalized = normalizeFrequencyResponse({
    ...response,
    name: response.name || source.title || "Scraped response",
    source: response.source || source.url || "",
    importedAt: "",
  });
  const stats = responseStats(normalized);
  return {
    title: source.title || normalized.name,
    url: source.url || normalized.source,
    source: source.source || sourceNameFromUrl(source.url || normalized.source),
    status: "parsed",
    format: "frd",
    reason: source.reason || "Numeric frequency response data found.",
    response: normalized,
    pointCount: normalized.points.length,
    frequencyMinHz: stats.frequencyMinHz,
    frequencyMaxHz: stats.frequencyMaxHz,
    magnitudeMinDb: stats.magnitudeMinDb,
    magnitudeMaxDb: stats.magnitudeMaxDb,
    score: source.score || 80,
  };
}

function createCandidateResult(input = {}) {
  return {
    title: input.title || titleFromUrl(input.url) || "Frequency response candidate",
    url: input.url || "",
    source: input.source || sourceNameFromUrl(input.url),
    status: "candidate",
    format: input.format || formatFromUrl(input.url),
    reason: input.reason || "Potential response source; inspect before importing.",
    score: input.score || 1,
  };
}

function responseStats(response) {
  const frequencies = response.points.map((point) => point.frequencyHz);
  const magnitudes = response.points.map((point) => point.magnitudeDb);
  return {
    frequencyMinHz: Math.min(...frequencies),
    frequencyMaxHz: Math.max(...frequencies),
    magnitudeMinDb: Math.min(...magnitudes),
    magnitudeMaxDb: Math.max(...magnitudes),
  };
}

function isUsefulResponse(response) {
  if (!response?.points || response.points.length < 5) return false;
  const stats = responseStats(response);
  if (!Number.isFinite(stats.frequencyMinHz) || !Number.isFinite(stats.frequencyMaxHz)) return false;
  if (stats.frequencyMaxHz / Math.max(1, stats.frequencyMinHz) < 1.8) return false;
  if (stats.magnitudeMaxDb - stats.magnitudeMinDb > 90) return false;
  return response.points.every((point) => point.frequencyHz >= 1 && point.frequencyHz <= 100000 && point.magnitudeDb > -80 && point.magnitudeDb < 180);
}

function extractLikelyDataBlocks(text) {
  const lines = String(text || "").split(/\r?\n/);
  const blocks = [];
  let current = [];
  for (const line of lines) {
    const trimmed = line.trim();
    const dataish = /[-+]?(?:\d+(?:[.,]\d*)?|\.\d+)\s*[,;\t ]+\s*[-+]?(?:\d+(?:[.,]\d*)?|\.\d+)/.test(trimmed);
    if (dataish) {
      current.push(trimmed);
    } else if (current.length) {
      if (current.length >= 5) blocks.push(current.join("\n"));
      current = [];
    }
  }
  if (current.length >= 5) blocks.push(current.join("\n"));
  return blocks;
}

function extractUrlsFromAttributes(attrs, baseUrl) {
  const urls = [];
  const attrRegex = /\b(?:href|src|data-href|data-url|data-src|content|onclick)=("([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  let match;
  while ((match = attrRegex.exec(attrs || ""))) {
    const raw = match[2] || match[3] || match[4] || "";
    const nestedUrls = raw.match(/https?:\/\/[^\s'"()<>]+|\/[^\s'"()<>]+/gi) || [raw];
    for (const value of nestedUrls) {
      const url = absoluteUrl(decodeHtml(value), baseUrl);
      if (url) urls.push(url);
    }
  }
  return [...new Set(urls)];
}

function extractDescriptiveAttributeText(attrs) {
  const values = [];
  const attrRegex = /\b(?:alt|title|aria-label|data-title|data-name)=("([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  let match;
  while ((match = attrRegex.exec(attrs || ""))) {
    const value = match[2] || match[3] || match[4] || "";
    if (value) values.push(value);
  }
  return decodeHtml(values.join(" "));
}

function absoluteUrl(value, baseUrl) {
  const clean = String(value || "").trim().replace(/[),.;\]]+$/g, "");
  if (!clean || /^(javascript:|mailto:|tel:|#)/i.test(clean)) return "";
  try {
    return new URL(clean, baseUrl).href;
  } catch {
    return "";
  }
}

function shouldFetchCandidateResource(url) {
  return isZipUrl(url) || /\.(?:frd|txt|csv|dat)(?:$|[?#])/i.test(url) || /(?:response|measurement|spl|frd|csv|txt|zma)/i.test(url);
}

function isZipUrl(url) {
  return /\.zip(?:$|[?#])|_xt=\.zip\b/i.test(String(url || ""));
}

function scoreResponseCandidate(text, query = "") {
  const haystack = String(text || "").toLowerCase();
  let score = 0;
  for (const keyword of RESPONSE_LINK_KEYWORDS) {
    if (haystack.includes(keyword)) score += keyword.length > 4 ? 12 : 8;
  }
  if (/\.(?:frd|csv|txt|dat)(?:$|[?#])/i.test(haystack)) score += 35;
  if (/\.(?:png|jpe?g|webp|gif)(?:$|[?#])/i.test(haystack)) score += 6;
  if (/frequency[^a-z0-9]+response/i.test(haystack)) score += 20;
  if (queryMatchesText(query, haystack)) score += 14;
  if (/(cart|checkout|login|account|review|shipping)/i.test(haystack)) score -= 40;
  return score;
}

function reasonForCandidate(label, url) {
  const text = `${label} ${url}`;
  if (/\.(?:frd|csv|txt|dat)(?:$|[?#])/i.test(url)) return "Linked numeric response file.";
  if (/\.(?:png|jpe?g|webp|gif)(?:$|[?#])/i.test(url)) return "Linked response image candidate; needs digitizing before import.";
  if (/pdf/i.test(url)) return "Linked PDF candidate; may include a plotted response.";
  if (/frequency\s*response|frequenzgang|spl/i.test(text)) return "Link label mentions frequency response or SPL.";
  return "Potential response source.";
}

function formatFromUrl(url, tag = "") {
  const path = String(url || "").split(/[?#]/)[0].toLowerCase();
  const query = String(url || "").split(/[?#]/).slice(1).join("?");
  if (/_xt=\.zip\b/i.test(query)) return "zip";
  const extension = path.match(/\.([a-z0-9]+)$/)?.[1];
  if (extension) return extension;
  if (tag === "img" || tag === "source") return "image";
  return "html";
}

function rankAndDedupeResults(results) {
  const byKey = new Map();
  for (const result of results.filter(Boolean)) {
    const key = `${result.status || "candidate"}:${result.url || result.title}`;
    const existing = byKey.get(key);
    if (!existing || (result.score || 0) > (existing.score || 0)) byKey.set(key, result);
  }
  return [...byKey.values()].sort((left, right) => (right.score || 0) - (left.score || 0));
}

function partsExpressItemMatchesQuery(item, query) {
  const haystack = [item?.displayname, item?.storedisplayname2, item?.itemid, item?.mpn, item?.urlcomponent].filter(Boolean).join(" ");
  const modelTokens = queryModelTokens(query);
  if (modelTokens.length) {
    const normalized = normalizeTextForMatch(haystack);
    return DRIVER_TERMS.test(haystack) && modelTokens.every((token) => normalized.includes(token));
  }
  return DRIVER_TERMS.test(haystack) && queryMatchesText(query, haystack);
}

function queryModelTokens(query) {
  return [...new Set(String(query || "").match(/[a-z0-9]+(?:[-_][a-z0-9]+)+/gi) || [])]
    .map(normalizeTextForMatch)
    .filter((token) => token.length >= 4 && /\d/.test(token));
}

function normalizeTextForMatch(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function extractZipTextEntries(input) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input || []);
  const entries = [];
  let offset = 0;
  while (offset <= buffer.length - 30 && buffer.readUInt32LE(offset) === 0x04034b50) {
    const method = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const fileNameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const dataStart = nameStart + fileNameLength + extraLength;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > buffer.length) break;

    const name = buffer.slice(nameStart, nameStart + fileNameLength).toString("utf8");
    const compressed = buffer.slice(dataStart, dataEnd);
    let content = null;
    if (method === 0) {
      content = compressed;
    } else if (method === 8) {
      content = inflateRawSync(compressed);
    }
    if (content && /\.(?:frd|txt|csv|dat|zma)$/i.test(name)) {
      entries.push({ name, text: content.toString("utf8") });
    }
    offset = dataEnd;
  }
  return entries;
}

function inferAngleFromResourceName(name) {
  const atAngle = String(name || "").match(/@(-?\d+(?:[\.,]\d+)?)(?:\D|$)/);
  if (atAngle) return Number(atAngle[1].replace(",", "."));
  return inferAngleFromName(name);
}

function queryMatchesText(query, text) {
  const tokens = String(query || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((token) => token.length >= 2);
  if (!tokens.length) return true;
  const haystack = String(text || "").toLowerCase();
  return tokens.some((token) => haystack.includes(token));
}

function flattenImageUrls(value) {
  const urls = [];
  function visit(node) {
    if (!node) return;
    if (typeof node === "string") {
      if (/^https?:\/\//i.test(node)) urls.push(node);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (typeof node === "object") {
      for (const [key, child] of Object.entries(node)) {
        if ((key === "url" || key === "src") && typeof child === "string") {
          const url = absoluteUrl(child, "https://www.parts-express.com/");
          if (url) urls.push(url);
        } else {
          visit(child);
        }
      }
    }
  }
  visit(value);
  return [...new Set(urls)];
}

function dedupeByUrl(items) {
  const seen = new Map();
  for (const item of items) {
    if (!item?.url) continue;
    if (!seen.has(item.url)) seen.set(item.url, item);
  }
  return [...seen.values()];
}

function htmlToText(html) {
  return decodeHtml(String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|tr|li|table|h[1-6]|pre)>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .trim());
}

function stripTags(value) {
  return String(value || "").replace(/<[^>]*>/g, " ");
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, "/");
}

function decodeDuckDuckGoUrl(value) {
  try {
    const url = new URL(value, "https://duckduckgo.com/");
    const uddg = url.searchParams.get("uddg");
    return uddg ? new URL(uddg).href : url.href;
  } catch {
    return "";
  }
}

function normalizeDirectUrl(value) {
  const text = String(value || "").trim();
  const explicitMatch = text.match(/https?:\/\/[^\s<>"']+/i);
  const candidate = explicitMatch?.[0] || text.match(/(?:www\.|(?:[a-z0-9-]+\.)+[a-z]{2,}|localhost|\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?\/[^\s<>"']+/i)?.[0];
  if (!candidate) return "";
  const cleaned = candidate.replace(/[),.;\]]+$/g, "");
  try {
    const defaultProtocol = /^(localhost|\d{1,3}(?:\.\d{1,3}){3})(?::|\/)/i.test(cleaned) ? "http" : "https";
    const url = new URL(/^https?:\/\//i.test(cleaned) ? cleaned : `${defaultProtocol}://${cleaned}`);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function sourceNameFromUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host.includes("parts-express.com")) return "Parts Express";
    if (host.includes(LOUDSPEAKER_DATABASE_HOST)) return "Loudspeaker Database";
    return host;
  } catch {
    return "Web";
  }
}

function partsExpressSlugFromUrl(url) {
  try {
    return new URL(url).pathname.split("/").filter(Boolean).pop() || "";
  } catch {
    return "";
  }
}

function titleFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    const slug = pathname.split("/").filter(Boolean).pop() || url;
    return decodeURIComponent(slug).replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").trim();
  } catch {
    return String(url || "Frequency response candidate");
  }
}

function labelFromCandidate(candidate) {
  return String(candidate?.title || titleFromUrl(candidate?.url) || "resource").slice(0, 80);
}
