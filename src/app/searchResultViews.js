export function renderDriverSearchResultsView({
  addFrequencyResponseSearchCandidate,
  applyDriverCandidate,
  driverResultFields,
  driverSearchResults,
  frequencyResponseResultFields,
  frequencyResults = [],
  query = "",
  results,
  setTooltip,
}) {
  driverSearchResults.replaceChildren();
  const rankedResults = rankDriverResultsByFrequencyResponses(results, frequencyResults, query);

  rankedResults.forEach(({ result, matches }, index) => {
    const item = document.createElement("article");
    item.className = matches.length ? "search-result has-frequency-response" : "search-result";
    setTooltip(item, "Review this driver candidate before applying it.");

    const titleRow = document.createElement("div");
    titleRow.className = "search-result-title";

    const title = document.createElement("span");
    title.textContent = result.title || `Candidate ${index + 1}`;

    const applyButton = document.createElement("button");
    applyButton.type = "button";
    applyButton.textContent = "Apply";
    setTooltip(applyButton, "Apply these driver parameters to the project.");
    applyButton.addEventListener("click", () => applyDriverCandidate(result));

    titleRow.append(title, applyButton);

    const meta = document.createElement("div");
    meta.className = "search-result-meta";
    meta.textContent = result.url || "";

    const fields = document.createElement("div");
    fields.className = "search-result-fields";
    fields.textContent = `Found: ${(result.matched || []).join(", ")}`;

    const responseFields = document.createElement("div");
    responseFields.className = "search-result-fields driver-response-summary";
    responseFields.textContent = formatDriverFrequencyResponseSummary(matches);

    const values = renderSearchResultValues(driverResultFields, result.driver || {}, "No numeric driver values recognized.");

    item.append(titleRow, meta, responseFields, values, fields);
    driverSearchResults.append(item);
  });

  if (frequencyResults.length) {
    const label = document.createElement("div");
    label.className = "search-result-section";
    label.textContent = "Frequency responses";
    driverSearchResults.append(label);
  }

  frequencyResults.forEach((result, index) => {
    const item = document.createElement("article");
    item.className = "search-result frequency-response-result";
    setTooltip(item, result.status === "parsed" ? "Add this parsed response to Measurement." : "Inspect this response candidate before importing it.");

    const titleRow = document.createElement("div");
    titleRow.className = "search-result-title";

    const title = document.createElement("span");
    title.textContent = result.title || `Frequency response ${index + 1}`;

    const actionButton = document.createElement("button");
    actionButton.type = "button";
    actionButton.textContent = result.status === "parsed" ? "Add" : "Open";
    setTooltip(actionButton, result.status === "parsed" ? "Add this frequency response to the Measurement tab." : "Open the source in a new browser tab.");
    actionButton.addEventListener("click", () => {
      if (result.status === "parsed") {
        addFrequencyResponseSearchCandidate(result);
      } else if (result.url) {
        window.open(result.url, "_blank", "noopener");
      }
    });
    actionButton.disabled = result.status !== "parsed" && !result.url;

    titleRow.append(title, actionButton);

    const meta = document.createElement("div");
    meta.className = "search-result-meta";
    meta.textContent = [result.source, result.format, result.url].filter(Boolean).join(" / ");

    const values = result.status === "parsed"
      ? renderSearchResultValues(frequencyResponseResultFields, result, "No numeric response values recognized.")
      : renderFrequencyResponseCandidateValues(result);

    const fields = document.createElement("div");
    fields.className = "search-result-fields";
    fields.textContent = result.reason || "Potential frequency response source.";

    item.append(titleRow, meta, values, fields);
    driverSearchResults.append(item);
  });
}

export function renderPassiveRadiatorSearchResultsView({
  applyPassiveRadiatorCandidate,
  passiveRadiatorResultFields,
  passiveRadiatorSearchResults,
  results,
  setTooltip,
}) {
  passiveRadiatorSearchResults.replaceChildren();

  results.forEach((result, index) => {
    const item = document.createElement("article");
    item.className = "search-result";
    setTooltip(item, "Review this P-Radiator candidate before applying it.");

    const titleRow = document.createElement("div");
    titleRow.className = "search-result-title";

    const title = document.createElement("span");
    title.textContent = result.title || `P-Radiator candidate ${index + 1}`;

    const applyButton = document.createElement("button");
    applyButton.type = "button";
    applyButton.textContent = "Apply";
    setTooltip(applyButton, "Apply these P-Radiator parameters to the active config.");
    applyButton.addEventListener("click", () => applyPassiveRadiatorCandidate(result));

    titleRow.append(title, applyButton);

    const meta = document.createElement("div");
    meta.className = "search-result-meta";
    meta.textContent = result.url || "";

    const fields = document.createElement("div");
    fields.className = "search-result-fields";
    fields.textContent = `Found: ${(result.matched || []).join(", ")}`;

    const values = renderSearchResultValues(passiveRadiatorResultFields, result.passiveRadiator || {}, "No numeric P-Radiator values recognized.");

    item.append(titleRow, meta, values, fields);
    passiveRadiatorSearchResults.append(item);
  });
}

export function renderSearchResultValues(resultFields, data, emptyText) {
  const values = document.createElement("div");
  values.className = "search-result-values";

  resultFields.forEach((field) => {
    const value = Number(data[field.key]);
    if (!Number.isFinite(value)) return;

    const row = document.createElement("div");
    row.className = "search-result-value";

    const label = document.createElement("span");
    label.textContent = field.label;

    const output = document.createElement("strong");
    output.textContent = `${formatSearchResultValue(value)}${field.unit ? ` ${field.unit}` : ""}`;

    row.append(label, output);
    values.append(row);
  });

  if (!values.childElementCount) {
    const empty = document.createElement("div");
    empty.className = "search-result-value";
    empty.textContent = emptyText;
    values.append(empty);
  }

  return values;
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

function renderFrequencyResponseCandidateValues(result) {
  const values = document.createElement("div");
  values.className = "search-result-values";
  [
    ["Status", result.status || "candidate"],
    ["Format", result.format || "html"],
    ["Source", result.source || "Web"],
  ].forEach(([labelText, valueText]) => {
    const row = document.createElement("div");
    row.className = "search-result-value";
    const label = document.createElement("span");
    label.textContent = labelText;
    const output = document.createElement("strong");
    output.textContent = valueText;
    row.append(label, output);
    values.append(row);
  });
  return values;
}
