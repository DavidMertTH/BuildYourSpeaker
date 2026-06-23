const driverSearchResultsById = new Map();
const frequencySearchResultsById = new Map();
const passiveRadiatorResultsById = new Map();
let driverSearchActions = null;
let passiveRadiatorSearchActions = null;
let listenersRegistered = false;

export function renderDriverSearchResultsView({
  addFrequencyResponseSearchCandidate,
  applyDriverCandidate,
  driverResultFields,
  frequencyResponseResultFields,
  frequencyResults = [],
  query = "",
  results,
}) {
  driverSearchActions = { addFrequencyResponseSearchCandidate, applyDriverCandidate };
  ensureSearchResultListeners();
  driverSearchResultsById.clear();
  frequencySearchResultsById.clear();

  const rankedResults = rankDriverResultsByFrequencyResponses(results, frequencyResults, query);
  const driverResults = rankedResults.map(({ result, matches }, index) => {
    const id = `driver-${index}`;
    driverSearchResultsById.set(id, result);
    return {
      id,
      title: result.title || `Candidate ${index + 1}`,
      meta: result.url || "",
      fields: `Found: ${(result.matched || []).join(", ")}`,
      responseSummary: formatDriverFrequencyResponseSummary(matches),
      hasFrequencyResponse: matches.length > 0,
      values: searchResultValues(driverResultFields, result.driver || {}, "No numeric driver values recognized."),
    };
  });

  const frequencySnapshots = frequencyResults.map((result, index) => {
    const id = `frequency-${index}`;
    frequencySearchResultsById.set(id, result);
    const parsed = result.status === "parsed";
    return {
      id,
      title: result.title || `Frequency response ${index + 1}`,
      meta: [result.source, result.format, result.url].filter(Boolean).join(" / "),
      reason: result.reason || "Potential frequency response source.",
      tooltip: parsed ? "Add this parsed response to Measurement." : "Inspect this response candidate before importing it.",
      action: parsed ? "add-frequency-response" : "open-frequency-response",
      actionLabel: parsed ? "Add" : "Open",
      actionTooltip: parsed ? "Add this frequency response to the Measurement tab." : "Open the source in a new browser tab.",
      disabled: !parsed && !result.url,
      values: parsed
        ? searchResultValues(frequencyResponseResultFields, result, "No numeric response values recognized.")
        : frequencyResponseCandidateValues(result),
    };
  });

  window.dispatchEvent(new CustomEvent("cabio:driver-search-results-sync", {
    detail: {
      driverResults,
      frequencyResults: frequencySnapshots,
      showFrequencySection: frequencySnapshots.length > 0,
    },
  }));
}

export function renderPassiveRadiatorSearchResultsView({
  applyPassiveRadiatorCandidate,
  passiveRadiatorResultFields,
  results,
}) {
  passiveRadiatorSearchActions = { applyPassiveRadiatorCandidate };
  ensureSearchResultListeners();
  passiveRadiatorResultsById.clear();

  window.dispatchEvent(new CustomEvent("cabio:passive-radiator-search-results-sync", {
    detail: {
      results: results.map((result, index) => {
        const id = `passive-radiator-${index}`;
        passiveRadiatorResultsById.set(id, result);
        return {
          id,
          title: result.title || `P-Radiator candidate ${index + 1}`,
          meta: result.url || "",
          fields: `Found: ${(result.matched || []).join(", ")}`,
          values: searchResultValues(passiveRadiatorResultFields, result.passiveRadiator || {}, "No numeric P-Radiator values recognized."),
        };
      }),
    },
  }));
}

export function formatSearchResultValue(value) {
  if (Math.abs(value) >= 1000) return String(Math.round(value));
  if (Math.abs(value) >= 100) return String(Math.round(value * 10) / 10);
  if (Math.abs(value) >= 10) return String(Math.round(value * 100) / 100);
  return String(Math.round(value * 1000) / 1000);
}

export function formatDriverFrequencyResponseSummary(matches = []) {
  if (!matches.length) return "Frequency response: none found for this driver.";
  const parsedCount = matches.filter((result) => result.status === "parsed").length;
  const sources = [...new Set(matches.map((result) => result.source).filter(Boolean))].slice(0, 2);
  const sourceText = sources.length ? ` from ${sources.join(", ")}` : "";
  return `Frequency response: ${matches.length} candidate${matches.length === 1 ? "" : "s"} found${parsedCount ? `, ${parsedCount} importable` : ""}${sourceText}.`;
}

function ensureSearchResultListeners() {
  if (listenersRegistered) return;
  listenersRegistered = true;
  window.addEventListener("cabio:driver-search-result-action", handleDriverSearchResultAction);
  window.addEventListener("cabio:passive-radiator-search-result-action", handlePassiveRadiatorSearchResultAction);
}

function handleDriverSearchResultAction(event) {
  const detail = event.detail || {};
  if (detail.action === "apply-driver") {
    const result = driverSearchResultsById.get(detail.id);
    if (result) driverSearchActions?.applyDriverCandidate?.(result);
    return;
  }
  if (detail.action === "add-frequency-response") {
    const result = frequencySearchResultsById.get(detail.id);
    if (result) driverSearchActions?.addFrequencyResponseSearchCandidate?.(result);
    return;
  }
  if (detail.action === "open-frequency-response") {
    const result = frequencySearchResultsById.get(detail.id);
    if (result?.url) window.open(result.url, "_blank", "noopener");
  }
}

function handlePassiveRadiatorSearchResultAction(event) {
  if (event.detail?.action !== "apply-passive-radiator") return;
  const result = passiveRadiatorResultsById.get(event.detail.id);
  if (result) passiveRadiatorSearchActions?.applyPassiveRadiatorCandidate?.(result);
}

function searchResultValues(resultFields, data, emptyText) {
  const values = resultFields
    .map((field) => {
      const value = Number(data[field.key]);
      if (!Number.isFinite(value)) return null;
      return {
        label: field.label,
        value: `${formatSearchResultValue(value)}${field.unit ? ` ${field.unit}` : ""}`,
      };
    })
    .filter(Boolean);

  return values.length ? values : [{ empty: true, text: emptyText }];
}

function frequencyResponseCandidateValues(result) {
  return [
    { label: "Status", value: result.status || "candidate" },
    { label: "Format", value: result.format || "html" },
    { label: "Source", value: result.source || "Web" },
  ];
}

function rankDriverResultsByFrequencyResponses(results, frequencyResults = [], query = "") {
  return results
    .map((result, index) => ({
      result,
      index,
      matches: Array.isArray(result.frequencyResponseMatches)
        ? result.frequencyResponseMatches
        : matchingFrequencyResponseResults(result, frequencyResults, query),
    }))
    .sort((left, right) => {
      const leftHasResponses = left.matches.length > 0;
      const rightHasResponses = right.matches.length > 0;
      if (leftHasResponses !== rightHasResponses) return rightHasResponses ? 1 : -1;
      return left.index - right.index;
    });
}

function matchingFrequencyResponseResults(driverResult, frequencyResults = [], query = "") {
  const driverTokens = driverResponseMatchTokens(driverResult);
  const queryTokens = driverResponseMatchTokens({ title: query });
  const tokens = [...new Set([...driverTokens, ...queryTokens])];
  if (!frequencyResults.length) return [];
  if (!tokens.length) return frequencyResults;
  const matches = frequencyResults.filter((result) => {
    const haystack = normalizeResponseMatchText([result.title, result.url, result.source].filter(Boolean).join(" "));
    return tokens.some((token) => haystack.includes(token));
  });
  if (matches.length) return matches;
  if (queryTokens.length && driverTextMatchesTokens(driverResult, queryTokens)) return frequencyResults;
  return frequencyResults;
}

function driverResponseMatchTokens(driverResult) {
  const text = [driverResult?.title, driverResult?.url].filter(Boolean).join(" ");
  const normalized = normalizeResponseMatchText(text);
  const rawTokens = [
    ...(text.match(/[A-Z0-9]+(?:[-_][A-Z0-9]+)+/gi) || []),
    ...(text.match(/\b(?=[A-Z0-9-]*\d)(?=[A-Z0-9-]*[A-Z])[A-Z0-9-]{4,}\b/gi) || []),
  ];
  return [...new Set(rawTokens.map(normalizeResponseMatchText))]
    .filter((token) => token.length >= 4 && /\d/.test(token) && normalized.includes(token))
    .slice(0, 8);
}

function normalizeResponseMatchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function driverTextMatchesTokens(driverResult, tokens) {
  const haystack = normalizeResponseMatchText([driverResult?.title, driverResult?.url].filter(Boolean).join(" "));
  return tokens.some((token) => haystack.includes(token));
}
