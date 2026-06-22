export function createMeasurementViews(deps) {
  const {
    compactMeasurementSeriesName,
    createEyeIcon,
    createTrashIcon,
    cssEscape,
    defaultMeasurementTarget,
    discardStagedRecording,
    enableDecimalTextInput,
    formatFrequencyValue,
    formatMeasurementAngleCompact,
    fullMeasurementName,
    getStagedRecordingResponse,
    getState,
    hydrateMeasurementTargetOptions,
    hydrateMeasurementTargetSelect,
    measurementList,
    measurementTargetLabel,
    parseNumericInputValue,
    removeFrequencyResponse,
    removeFrequencyResponseCandidate,
    saveStagedRecording,
    setFrequencyResponseVisibility,
    setTooltip,
    shortMeasurementName,
    updateFrequencyResponseAngle,
    updateFrequencyResponseName,
    updateFrequencyResponseTarget,
  } = deps;

  let state = getState();
  let stagedRecordingResponse = getStagedRecordingResponse();

  function renderMeasurementControls() {
    state = getState();
    stagedRecordingResponse = getStagedRecordingResponse();
    if (!measurementList) return;
    hydrateMeasurementTargetSelect();
    const responses = state.measurements?.frequencyResponses || [];
    const candidates = state.measurements?.frequencyResponseCandidates || [];
    const expectedIds = new Set(responses.map((response) => `response:${response.id}`));
    measurementList.querySelectorAll('.measurement-chip[data-measurement-id^="response:"]').forEach((item) => {
      if (!expectedIds.has(item.dataset.measurementId)) item.remove();
    });
  
    renderStagedRecordingSection();
    renderMeasurementResponseSection(responses);
    renderMeasurementCandidateSection(candidates);
  
    const hasRenderableSections = Boolean(stagedRecordingResponse) || responses.length || candidates.length;
    if (!hasRenderableSections) {
      measurementList.querySelectorAll("[data-measurement-section]").forEach((item) => item.remove());
      if (!measurementList.querySelector("[data-measurement-empty]")) {
        const empty = document.createElement("div");
        empty.className = "crossover-empty";
        empty.dataset.measurementEmpty = "true";
        empty.textContent = "No frequency responses loaded.";
        measurementList.append(empty);
      }
      return;
    }
    measurementList.querySelector("[data-measurement-empty]")?.remove();
  }
  
  function renderStagedRecordingSection() {
    let section = measurementList.querySelector('[data-measurement-section="staged-recording"]');
    if (!stagedRecordingResponse) {
      section?.remove();
      return;
    }
  
    if (!section) {
      section = document.createElement("section");
      section.className = "measurement-group-block measurement-staged-section";
      section.dataset.measurementSection = "staged-recording";
  
      const header = document.createElement("div");
      header.className = "measurement-group-header";
      header.innerHTML = '<span class="measurement-group-title">Staged recording</span>';
  
      const actions = document.createElement("div");
      actions.className = "measurement-staged-actions";
      const save = document.createElement("button");
      save.type = "button";
      save.dataset.stagedRecordingAction = "save";
      save.textContent = "Save";
      const discard = document.createElement("button");
      discard.type = "button";
      discard.className = "danger";
      discard.dataset.stagedRecordingAction = "discard";
      discard.textContent = "Discard";
      actions.append(save, discard);
      header.append(actions);
  
      const body = document.createElement("div");
      body.className = "measurement-staged-body";
      body.dataset.measurementPart = "staged-body";
  
      section.append(header, body);
    }
  
    const body = section.querySelector('[data-measurement-part="staged-body"]');
    const stagedKey = stagedRecordingIdentity(stagedRecordingResponse);
    if (body.dataset.stagedRecordingKey !== stagedKey) {
      body.replaceChildren(createStagedRecordingSummary(stagedRecordingResponse));
      body.dataset.stagedRecordingKey = stagedKey;
    }
  
    const save = section.querySelector('[data-staged-recording-action="save"]');
    if (save.onclick !== saveStagedRecording) save.onclick = saveStagedRecording;
    if (save.title !== "Save this staged recording into Measurement.") setTooltip(save, "Save this staged recording into Measurement.");
    const discard = section.querySelector('[data-staged-recording-action="discard"]');
    if (discard.onclick !== discardStagedRecording) discard.onclick = discardStagedRecording;
    if (discard.title !== "Discard this staged recording.") setTooltip(discard, "Discard this staged recording.");
  
    const firstSection = measurementList.querySelector('[data-measurement-section]:not([data-measurement-section="staged-recording"])');
    const targetNextSibling = firstSection || measurementList.firstElementChild;
    if (section.parentElement !== measurementList || (targetNextSibling !== section && section.nextElementSibling !== targetNextSibling)) {
      measurementList.insertBefore(section, targetNextSibling);
    }
  }

  function stagedRecordingIdentity(response) {
    const first = response.points[0]?.frequencyHz ?? "";
    const last = response.points[response.points.length - 1]?.frequencyHz ?? "";
    return [
      response.id,
      response.name,
      response.target,
      response.recordingGroupId,
      response.angleDeg,
      response.color,
      response.points.length,
      first,
      last,
    ].join("|");
  }
  
  function createStagedRecordingSummary(response) {
    const summary = document.createElement("div");
    summary.className = "measurement-staged-summary";
    setTooltip(summary, fullMeasurementName(response));
  
    const name = document.createElement("strong");
    name.textContent = compactMeasurementSeriesName(response);
  
    const meta = document.createElement("span");
    meta.textContent = `${response.points.length} pts / ${formatFrequencyValue(response.points[0]?.frequencyHz)}-${formatFrequencyValue(response.points[response.points.length - 1]?.frequencyHz)} / ${measurementTargetLabel(response.target)}`;
  
    summary.append(name, meta);
    return summary;
  }
  
  function renderMeasurementResponseSection(responses) {
    let section = measurementList.querySelector('[data-measurement-section="responses"]');
    if (!responses.length) {
      section?.remove();
      return;
    }
    if (!section) section = createMeasurementResponseBlock();
    const chips = section.querySelector(".measurement-group-chips");
    const responseItems = responses.map((response) => {
      const measurementId = `response:${response.id}`;
      let item = measurementList.querySelector(`.measurement-chip[data-measurement-id="${cssEscape(measurementId)}"]`);
      if (!item) item = createMeasurementResponseItem(measurementId);
      updateMeasurementResponseItem(item, response);
      return item;
    });
    reconcileChildren(chips, responseItems);
    const placement = measurementList.querySelector('[data-measurement-section="candidates"]');
    if (section.parentElement !== measurementList || section.nextElementSibling !== placement) {
      measurementList.insertBefore(section, placement || null);
    }
  }

  function createMeasurementResponseBlock() {
    const section = document.createElement("section");
    section.className = "measurement-group-block";
    section.dataset.measurementSection = "responses";
    section.dataset.measurementKey = "responses";
  
    const header = document.createElement("div");
    header.className = "measurement-group-header";
    header.innerHTML = '<span class="measurement-group-title">Responses</span>';
  
    const chips = document.createElement("div");
    chips.className = "measurement-group-chips";
    chips.dataset.measurementGroupId = "";
    chips.dataset.emptyLabel = "No responses";
  
    section.append(header, chips);
    return section;
  }

  function reconcileChildren(parent, nextChildren) {
    const expected = new Set(nextChildren);
    [...parent.children].forEach((child) => {
      if (!expected.has(child)) child.remove();
    });
    nextChildren.forEach((child, index) => {
      const current = parent.children[index] || null;
      if (current !== child) parent.insertBefore(child, current);
    });
  }
  
  function renderMeasurementCandidateSection(candidates) {
    let section = measurementList.querySelector('[data-measurement-section="candidates"]');
    if (!candidates.length) {
      section?.remove();
      return;
    }
    if (!section) {
      section = document.createElement("section");
      section.className = "measurement-candidate-section";
      section.dataset.measurementSection = "candidates";
      section.dataset.measurementKey = "candidates";
  
      const title = document.createElement("div");
      title.className = "measurement-group-header";
      title.innerHTML = '<span class="measurement-group-title">Candidates</span>';
  
      const list = document.createElement("div");
      list.className = "measurement-candidate-list";
      list.dataset.measurementPart = "candidate-list";
      section.append(title, list);
    }
  
    const list = section.querySelector('[data-measurement-part="candidate-list"]');
    list.replaceChildren(...candidates.map((candidate) => {
      const measurementId = `candidate:${candidate.id}`;
      let item = measurementList.querySelector(`[data-measurement-id="${cssEscape(measurementId)}"]`);
      if (!item) item = createMeasurementCandidateItem(measurementId);
      updateMeasurementCandidateItem(item, candidate);
      return item;
    }));
    measurementList.append(section);
  }
  
  function createMeasurementResponseItem(measurementId) {
    const item = document.createElement("article");
    item.className = "measurement-chip";
    item.dataset.measurementId = measurementId;
    item.draggable = true;
  
    const name = document.createElement("span");
    name.className = "measurement-chip-name";
    name.dataset.measurementPart = "name";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.className = "measurement-name-inline";
    nameInput.dataset.measurementPart = "name-input";
    nameInput.hidden = true;
  
    const angleInput = document.createElement("input");
    angleInput.type = "number";
    enableDecimalTextInput(angleInput);
    angleInput.min = "-180";
    angleInput.max = "180";
    angleInput.step = "1";
    angleInput.className = "measurement-angle-inline";
    angleInput.dataset.measurementPart = "angle";
  
    const meta = document.createElement("span");
    meta.className = "measurement-chip-meta";
    meta.dataset.measurementPart = "meta";

    const target = document.createElement("select");
    target.className = "measurement-target-inline";
    target.dataset.measurementPart = "target";
  
    const actions = document.createElement("div");
    actions.className = "measurement-chip-actions";
    const visible = document.createElement("button");
    visible.type = "button";
    visible.dataset.measurementAction = "visibility";
    visible.addEventListener("click", () => {
      const responseId = visible.dataset.responseId;
      if (!responseId) return;
      setFrequencyResponseVisibility(responseId, visible.dataset.responseVisible === "false");
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "danger";
    remove.dataset.measurementAction = "remove";
    remove.append(createTrashIcon());
    remove.addEventListener("click", () => {
      const responseId = remove.dataset.responseId;
      if (responseId) removeFrequencyResponse(responseId);
    });
    actions.append(visible, remove);
    item.append(name, nameInput, meta, target, angleInput, actions);
    return item;
  }
  
  function updateMeasurementResponseItem(item, response) {
    const shortName = shortMeasurementName(response);
    const fullName = fullMeasurementName(response);
    const name = item.querySelector('[data-measurement-part="name"]');
    const nameInput = item.querySelector('[data-measurement-part="name-input"]');
    name.textContent = shortName;
    name.dataset.responseId = response.id;
    name.ondblclick = () => {
      name.hidden = true;
      nameInput.hidden = false;
      nameInput.value = response.name || shortName;
      nameInput.focus();
      nameInput.select();
    };
    nameInput.dataset.responseId = response.id;
    if (document.activeElement !== nameInput && nameInput.hidden) nameInput.value = response.name || shortName;
    nameInput.onkeydown = (event) => {
      if (event.key === "Enter") nameInput.blur();
      if (event.key === "Escape") {
        nameInput.value = response.name || shortName;
        nameInput.hidden = true;
        name.hidden = false;
      }
    };
    nameInput.onblur = () => {
      const nextName = nameInput.value.trim();
      nameInput.hidden = true;
      name.hidden = false;
      if (nextName && nextName !== response.name) updateFrequencyResponseName(response.id, nextName);
    };
    setTooltip(name, fullName);
    setTooltip(item, fullName);
    item.querySelector('[data-measurement-part="meta"]').textContent = `${formatMeasurementAngleCompact(response)} / ${formatFrequencyValue(response.points[0]?.frequencyHz)}-${formatFrequencyValue(response.points[response.points.length - 1]?.frequencyHz)}`;

    const target = item.querySelector('[data-measurement-part="target"]');
    hydrateMeasurementTargetOptions(target, response.target || defaultMeasurementTarget());
    target.onchange = () => updateFrequencyResponseTarget(response.id, target.value);
    setTooltip(target, "Assign this measurement to a config or config group.");
  
    const angleInput = item.querySelector('[data-measurement-part="angle"]');
    if (document.activeElement !== angleInput) angleInput.value = String(Math.round(Number(response.angleDeg || 0)));
    angleInput.onchange = () => {
      const angle = parseNumericInputValue(angleInput);
      if (Number.isFinite(angle)) updateFrequencyResponseAngle(response.id, angle);
      else angleInput.value = String(Math.round(Number(response.angleDeg || 0)));
    };
  
    const visible = item.querySelector('[data-measurement-action="visibility"]');
    const responseVisible = response.visible !== false;
    if (visible.dataset.responseVisible !== String(responseVisible)) {
      visible.replaceChildren(createEyeIcon(responseVisible));
      visible.dataset.responseVisible = String(responseVisible);
    }
    visible.dataset.responseId = response.id;
    visible.classList.toggle("active", responseVisible);
    if (visible.getAttribute("aria-pressed") !== String(responseVisible)) {
      visible.setAttribute("aria-pressed", String(responseVisible));
    }
    const visibleLabel = `${response.visible === false ? "Show" : "Hide"} ${shortName}`;
    if (visible.ariaLabel !== visibleLabel) visible.ariaLabel = visibleLabel;
    const visibleTooltip = response.visible === false ? "Show this measurement." : "Hide this measurement.";
    if (visible.title !== visibleTooltip) setTooltip(visible, visibleTooltip);
  
    const remove = item.querySelector('[data-measurement-action="remove"]');
    remove.dataset.responseId = response.id;
    const removeLabel = `Remove ${shortName}`;
    if (remove.ariaLabel !== removeLabel) remove.ariaLabel = removeLabel;
    if (remove.title !== "Delete this measurement.") setTooltip(remove, "Delete this measurement.");
  }
  
  function createMeasurementCandidateItem(measurementId) {
    const item = document.createElement("article");
    item.className = "search-result frequency-response-result";
    item.dataset.measurementId = measurementId;
  
    const title = document.createElement("div");
    title.className = "search-result-title";
    const name = document.createElement("span");
    name.dataset.measurementPart = "name";
  
    const actions = document.createElement("div");
    actions.className = "crossover-transition-actions";
    const open = document.createElement("button");
    open.type = "button";
    open.textContent = "Open";
    open.dataset.measurementAction = "open";
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "danger";
    remove.textContent = "Remove";
    remove.dataset.measurementAction = "remove";
    actions.append(open, remove);
    title.append(name, actions);
  
    const meta = document.createElement("div");
    meta.className = "search-result-meta";
    meta.dataset.measurementPart = "meta";
  
    const values = document.createElement("div");
    values.className = "search-result-values";
    values.append(
      measurementValue("Status", "", "status"),
      measurementValue("Format", "", "format"),
      measurementValue("Graph", "", "graph"),
    );
  
    const reason = document.createElement("div");
    reason.className = "search-result-fields";
    reason.dataset.measurementPart = "reason";
  
    item.append(title, meta, values, reason);
    return item;
  }
  
  function updateMeasurementCandidateItem(item, candidate) {
    item.querySelector('[data-measurement-part="name"]').textContent = candidate.name;
    item.querySelector('[data-measurement-part="meta"]').textContent = [candidate.source, candidate.format, candidate.url].filter(Boolean).join(" / ");
    item.querySelector('[data-measurement-value="status"]').textContent = candidate.status || "candidate";
    item.querySelector('[data-measurement-value="format"]').textContent = candidate.format || "html";
    item.querySelector('[data-measurement-value="graph"]').textContent = "needs data";
    item.querySelector('[data-measurement-part="reason"]').textContent = candidate.reason || "Candidate found by driver search; numeric response data was not available yet.";
  
    const open = item.querySelector('[data-measurement-action="open"]');
    open.disabled = !candidate.url;
    open.onclick = () => {
      if (candidate.url) window.open(candidate.url, "_blank", "noopener");
    };
  
    const remove = item.querySelector('[data-measurement-action="remove"]');
    remove.onclick = () => removeFrequencyResponseCandidate(candidate.id);
  }

  return { renderMeasurementControls };
}
