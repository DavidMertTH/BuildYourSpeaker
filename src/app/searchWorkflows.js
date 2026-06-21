export function createSearchWorkflows(deps) {
  let plannerCandidates = [];

  async function searchDriverSpecs() {
    const query = deps.driverSearchInput.value.trim();
    if (!query) {
      deps.driverSearchStatus.textContent = "Enter a driver model, manufacturer, or datasheet URL.";
      return;
    }

    deps.driverSearchButton.disabled = true;
    const directUrl = isHttpUrl(query);
    const knownDriverResults = directUrl ? [] : deps.searchKnownDriverResults?.(query) || [];
    deps.driverSearchStatus.textContent = directUrl ? "Reading datasheet and response sources..." : "Searching known drivers and the web...";
    deps.driverSearchResults.replaceChildren();
    if (knownDriverResults.length) {
      deps.renderDriverSearchResults(knownDriverResults, [], query);
    }

    try {
      const driverPayload = await fetchSearchJson(`/api/driver-search?q=${encodeURIComponent(query)}`);
      const webDriverResults = driverPayload.results || [];
      const driverResults = [...knownDriverResults, ...webDriverResults];
      const frequencyResults = driverPayload.frequencyResponses || [];

      deps.renderDriverSearchResults(driverResults, frequencyResults, query);

      const statusParts = [];
      if (knownDriverResults.length) {
        statusParts.push(`${knownDriverResults.length} known driver match${knownDriverResults.length === 1 ? "" : "es"} found.`);
      }
      if (webDriverResults.length) {
        statusParts.push(driverPayload.imageOnlyPdf
          ? `PDF has no selectable text. Values found from "${driverPayload.fallbackQuery || "an alternate source"}"; verify before applying.`
          : driverPayload.directUrl
            ? "Datasheet parsed. Verify the values before applying."
            : `${webDriverResults.length} web driver candidate${webDriverResults.length === 1 ? "" : "s"} found. Verify before applying.`);
      } else if (!knownDriverResults.length) {
        statusParts.push(driverPayload.directUrl
          ? "No usable T/S parameter set found at this URL."
          : "No usable T/S parameter set found.");
      }
      if (frequencyResults.length) {
        const parsedCount = frequencyResults.filter((result) => result.status === "parsed").length;
        statusParts.push(`${frequencyResults.length} response candidate${frequencyResults.length === 1 ? "" : "s"} found${parsedCount ? `, ${parsedCount} importable` : ""}; added only when you apply a driver.`);
      }
      if (driverPayload.frequencyResponseError) statusParts.push(`Response search failed: ${driverPayload.frequencyResponseError}.`);
      deps.driverSearchStatus.textContent = statusParts.join(" ");
    } catch (error) {
      if (knownDriverResults.length) {
        deps.renderDriverSearchResults(knownDriverResults, [], query);
        deps.driverSearchStatus.textContent = `${knownDriverResults.length} known driver match${knownDriverResults.length === 1 ? "" : "es"} found. Web search failed: ${error.message || "Search failed."}`;
      } else {
        deps.driverSearchStatus.textContent = error.message || "Search failed.";
      }
    } finally {
      deps.driverSearchButton.disabled = false;
    }
  }

  async function searchPassiveRadiatorSpecs() {
    const query = deps.passiveRadiatorSearchInput.value.trim();
    if (!query) {
      deps.passiveRadiatorSearchStatus.textContent = "Enter a P-Radiator model, manufacturer, or datasheet URL.";
      return;
    }

    deps.passiveRadiatorSearchButton.disabled = true;
    const directUrl = isHttpUrl(query);
    deps.passiveRadiatorSearchStatus.textContent = directUrl ? "Reading P-Radiator datasheet URL..." : "Searching web for P-Radiator parameters...";
    deps.passiveRadiatorSearchResults.replaceChildren();

    try {
      const response = await fetch(`/api/passive-radiator-search?q=${encodeURIComponent(query)}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || `Search failed with HTTP ${response.status}`);
      deps.renderPassiveRadiatorSearchResults(payload.results || []);
      if (payload.results?.length) {
        deps.passiveRadiatorSearchStatus.textContent = payload.imageOnlyPdf
          ? `PDF has no selectable text. Values found from "${payload.fallbackQuery || "an alternate source"}"; verify before applying.`
          : payload.directUrl
            ? "P-Radiator datasheet parsed. Verify the values before applying."
            : `${payload.results.length} candidate${payload.results.length === 1 ? "" : "s"} found. Verify before applying.`;
      } else {
        deps.passiveRadiatorSearchStatus.textContent = payload.directUrl
          ? "No usable P-Radiator parameter set found at this URL."
          : "No usable P-Radiator parameter set found.";
      }
    } catch (error) {
      deps.passiveRadiatorSearchStatus.textContent = error.message || "P-Radiator search failed.";
    } finally {
      deps.passiveRadiatorSearchButton.disabled = false;
    }
  }

  function planEnclosureDesigns() {
    const state = deps.getState();
    plannerCandidates = deps.planDesigns(deps.driverForProject(), { ...state.inventory, alignment: state.mode }, state.box);
    if (plannerCandidates[0]) {
      applyPlannerCandidate(plannerCandidates[0]);
    }
    renderPlannerResults(plannerCandidates);
    deps.plannerStatus.textContent = plannerCandidates.length
      ? `${plannerCandidates[0].name} applied to the active config.`
      : "No buildable design candidates found. Try more volume, longer ports, or a lower velocity target.";
  }

  function renderPlannerResults(candidates) {
    deps.plannerResults.replaceChildren();

    candidates.forEach((candidate) => {
      const item = document.createElement("article");
      item.className = "search-result";
      deps.setTooltip(item, "Auto plan candidate for the active config.");

      const titleRow = document.createElement("div");
      titleRow.className = "search-result-title";

      const title = document.createElement("span");
      const score = document.createElement("span");
      score.className = "candidate-score";
      score.textContent = Math.round(candidate.score);
      title.append(score, `  ${candidate.name}`);

      const applyButton = document.createElement("button");
      applyButton.type = "button";
      applyButton.textContent = candidate.applied ? "Applied" : "Use";
      applyButton.disabled = Boolean(candidate.applied);
      deps.setTooltip(applyButton, candidate.applied ? "This candidate is currently applied." : "Apply this candidate to the active config.");
      applyButton.addEventListener("click", () => {
        applyPlannerCandidate(candidate);
        plannerCandidates = plannerCandidates.map((item) => ({
          ...item,
          applied: item === candidate,
        }));
        renderPlannerResults(plannerCandidates);
        deps.plannerStatus.textContent = `${candidate.name} applied to the active config.`;
      });

      titleRow.append(title, applyButton);

      const meta = document.createElement("div");
      meta.className = "search-result-meta";
      meta.textContent = candidate.notes.join(" - ");

      const dimensions = candidate.dimensions?.external;
      const fields = document.createElement("div");
      fields.className = "search-result-fields";
      const sizeText = dimensions
        ? `External ${dimensions.widthCm.toFixed(1)} x ${dimensions.heightCm.toFixed(1)} x ${dimensions.depthCm.toFixed(1)} cm`
        : "";
      const warningText = candidate.warnings.length ? `Warnings: ${candidate.warnings.join(", ")}` : "No planner warnings";
      fields.textContent = [sizeText, warningText].filter(Boolean).join(" - ");

      item.append(titleRow, meta, fields);
      deps.plannerResults.append(item);
    });
  }

  function applyPlannerCandidate(candidate) {
    const nextState = deps.cloneProject(deps.getState());
    nextState.mode = candidate.mode;
    nextState.box = deps.completeBox(candidate.box);
    deps.syncActiveDesignFromProject(nextState);
    deps.commitState(nextState, { hydrate: true });
    plannerCandidates = plannerCandidates.map((item) => ({
      ...item,
      applied: item === candidate,
    }));
  }

  function applyDriverCandidate(result) {
    const state = deps.getState();
    const nextDriver = deps.completeDriverParameters(state.driver, result.driver);
    const fieldCount = Object.keys(result.driver || {}).filter((key) => Number.isFinite(Number(result.driver[key]))).length;
    const responseImport = deps.addFrequencyResponseSearchResultsToMeasurements(result.frequencyResponseMatches || [], result.title || result.url || "", {
      createGroup: true,
      groupName: result.title || "Recording group",
      groupKind: "driver",
      sourceLabel: "driver search",
    });
    const libraryEntry = deps.addDriverToLibrary({
      id: deps.slugify(result.title || result.url || `driver-${Date.now()}`),
      name: result.title || "Scraped driver",
      source: result.url || "Scraped result",
      driver: nextDriver,
    });
    deps.applyKnownDriver(libraryEntry);
    deps.driverSearchResults.replaceChildren();
    const responseText = responseImport.added
      ? ` ${responseImport.added} frequency response ${responseImport.added === 1 ? "entry" : "entries"} added to Measurement${responseImport.parsed ? `; ${responseImport.parsed} plotted` : ""}.`
      : "";
    deps.driverSearchStatus.textContent = `${fieldCount} parameter${fieldCount === 1 ? "" : "s"} applied and added to Known driver.${responseText}`;
  }

  function applyPassiveRadiatorCandidate(result) {
    const state = deps.getState();
    const nextPassiveRadiator = deps.completePassiveRadiatorParameters(state.box.passiveRadiator, result.passiveRadiator);
    const fieldCount = Object.keys(result.passiveRadiator || {}).filter((key) => Number.isFinite(Number(result.passiveRadiator[key]))).length;
    const libraryEntry = deps.addPassiveRadiatorToLibrary({
      id: `pr-${deps.slugify(result.title || result.url || `p-radiator-${Date.now()}`)}`,
      name: result.title || "Scraped P-Radiator",
      source: result.url || "Scraped result",
      passiveRadiator: nextPassiveRadiator,
    });
    deps.applyKnownPassiveRadiator(libraryEntry);
    deps.passiveRadiatorSearchStatus.textContent = `${fieldCount} parameter${fieldCount === 1 ? "" : "s"} applied and added to Known P-Radiator.`;
  }

  return {
    applyDriverCandidate,
    applyPassiveRadiatorCandidate,
    isHttpUrl,
    normalizeDirectUrl,
    planEnclosureDesigns,
    searchDriverSpecs,
    searchPassiveRadiatorSpecs,
  };
}

async function fetchSearchJson(url) {
  const response = await fetch(url);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || `Search failed with HTTP ${response.status}`);
  return payload;
}

function isHttpUrl(value) {
  return Boolean(normalizeDirectUrl(value));
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
