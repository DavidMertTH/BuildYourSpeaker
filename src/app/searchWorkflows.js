export function createSearchWorkflows(deps) {
  const setUiText = deps.setUiText || ((target, text) => {
    const id = typeof target === "string" ? target : target?.id;
    if (!id) return;
    window.__cabioTextSync = {
      ...(window.__cabioTextSync || {}),
      [id]: String(text ?? ""),
    };
    window.dispatchEvent(new CustomEvent("cabio:text-sync", {
      detail: { id, text: String(text ?? "") },
    }));
  });
  const setDriverSearchStatus = (text) => setUiText(deps.driverSearchStatus, text);
  const setPassiveRadiatorSearchStatus = (text) => setUiText(deps.passiveRadiatorSearchStatus, text);

  async function searchDriverSpecs() {
    const query = deps.driverSearchInput.value.trim();
    if (!query) {
      setDriverSearchStatus("Enter a driver model, manufacturer, or datasheet URL.");
      return;
    }

    deps.driverSearchButton.disabled = true;
    const directUrl = isHttpUrl(query);
    const knownDriverResults = directUrl ? [] : await (deps.searchKnownDriverResults?.(query) || []);
    setDriverSearchStatus(directUrl ? "Reading datasheet and response sources..." : "Searching known drivers and the web...");
    deps.renderDriverSearchResults([], [], query);
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
      setDriverSearchStatus(statusParts.join(" "));
    } catch (error) {
      if (knownDriverResults.length) {
        deps.renderDriverSearchResults(knownDriverResults, [], query);
        setDriverSearchStatus(`${knownDriverResults.length} known driver match${knownDriverResults.length === 1 ? "" : "es"} found. Web search failed: ${error.message || "Search failed."}`);
      } else {
        setDriverSearchStatus(error.message || "Search failed.");
      }
    } finally {
      deps.driverSearchButton.disabled = false;
    }
  }

  async function searchPassiveRadiatorSpecs() {
    const query = deps.passiveRadiatorSearchInput.value.trim();
    if (!query) {
      setPassiveRadiatorSearchStatus("Enter a P-Radiator model, manufacturer, or datasheet URL.");
      return;
    }

    deps.passiveRadiatorSearchButton.disabled = true;
    const directUrl = isHttpUrl(query);
    setPassiveRadiatorSearchStatus(directUrl ? "Reading P-Radiator datasheet URL..." : "Searching web for P-Radiator parameters...");
    deps.renderPassiveRadiatorSearchResults([]);

    try {
      const response = await fetch(`/api/passive-radiator-search?q=${encodeURIComponent(query)}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || `Search failed with HTTP ${response.status}`);
      deps.renderPassiveRadiatorSearchResults(payload.results || []);
      if (payload.results?.length) {
        setPassiveRadiatorSearchStatus(payload.imageOnlyPdf
          ? `PDF has no selectable text. Values found from "${payload.fallbackQuery || "an alternate source"}"; verify before applying.`
          : payload.directUrl
            ? "P-Radiator datasheet parsed. Verify the values before applying."
            : `${payload.results.length} candidate${payload.results.length === 1 ? "" : "s"} found. Verify before applying.`);
      } else {
        setPassiveRadiatorSearchStatus(payload.directUrl
          ? "No usable P-Radiator parameter set found at this URL."
          : "No usable P-Radiator parameter set found.");
      }
    } catch (error) {
      setPassiveRadiatorSearchStatus(error.message || "P-Radiator search failed.");
    } finally {
      deps.passiveRadiatorSearchButton.disabled = false;
    }
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
    deps.renderDriverSearchResults([], [], "");
    const responseText = responseImport.added
      ? ` ${responseImport.added} frequency response ${responseImport.added === 1 ? "entry" : "entries"} added to Measurement${responseImport.parsed ? `; ${responseImport.parsed} plotted` : ""}.`
      : "";
    setDriverSearchStatus(`${fieldCount} parameter${fieldCount === 1 ? "" : "s"} applied and added to Known driver.${responseText}`);
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
    setPassiveRadiatorSearchStatus(`${fieldCount} parameter${fieldCount === 1 ? "" : "s"} applied and added to Known P-Radiator.`);
  }

  return {
    applyDriverCandidate,
    applyPassiveRadiatorCandidate,
    isHttpUrl,
    normalizeDirectUrl,
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
