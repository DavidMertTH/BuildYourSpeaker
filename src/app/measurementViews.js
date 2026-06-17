export function createMeasurementViews(deps) {
  const {
    compactMeasurementSeriesName,
    createEyeIcon,
    createTrashIcon,
    cssEscape,
    defaultMeasurementTarget,
    deleteMeasurementGroup,
    discardStagedRecording,
    enableDecimalTextInput,
    formatFrequencyValue,
    formatMeasurementAngleCompact,
    fullMeasurementName,
    getStagedRecordingResponse,
    getState,
    hydrateMeasurementTargetOptions,
    hydrateMeasurementTargetSelect,
    measurementGroupList,
    measurementList,
    measurementTargetLabel,
    measurementValue,
    parseNumericInputValue,
    removeFrequencyResponse,
    removeFrequencyResponseCandidate,
    saveStagedRecording,
    setFrequencyResponseVisibility,
    setTooltip,
    shortMeasurementName,
    updateFrequencyResponseAngle,
    updateMeasurementGroup,
    updateMeasurementGroupTarget,
  } = deps;

  let state = getState();
  let stagedRecordingResponse = getStagedRecordingResponse();

  function renderMeasurementControls() {
    state = getState();
    stagedRecordingResponse = getStagedRecordingResponse();
    if (!measurementList) return;
    hydrateMeasurementTargetSelect();
    renderMeasurementGroups();
    const responses = state.measurements?.frequencyResponses || [];
    const candidates = state.measurements?.frequencyResponseCandidates || [];
    const expectedIds = new Set(responses.map((response) => `response:${response.id}`));
    measurementList.querySelectorAll('.measurement-chip[data-measurement-id^="response:"]').forEach((item) => {
      if (!expectedIds.has(item.dataset.measurementId)) item.remove();
    });
  
    renderStagedRecordingSection();
    renderMeasurementResponseGroups(responses);
    renderMeasurementCandidateSection(candidates);
  
    const hasNamedGroups = Boolean(state.measurements?.recordingGroups?.length);
    const hasRenderableSections = Boolean(stagedRecordingResponse) || hasNamedGroups || responses.length || candidates.length;
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
    body.replaceChildren(createStagedRecordingSummary(stagedRecordingResponse));
  
    const save = section.querySelector('[data-staged-recording-action="save"]');
    save.onclick = saveStagedRecording;
    setTooltip(save, "Save this staged recording into Measurement.");
    const discard = section.querySelector('[data-staged-recording-action="discard"]');
    discard.onclick = discardStagedRecording;
    setTooltip(discard, "Discard this staged recording.");
  
    const firstSection = measurementList.querySelector('[data-measurement-section]:not([data-measurement-section="staged-recording"])');
    measurementList.insertBefore(section, firstSection || measurementList.firstElementChild);
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
  
  function renderMeasurementGroups() {
    if (!measurementGroupList) return;
    measurementGroupList.replaceChildren();
    state.measurements?.recordingGroups?.forEach((group) => {
      const pill = document.createElement("div");
      pill.className = "config-group-chip measurement-group-chip";
  
      const input = document.createElement("input");
      input.type = "text";
      input.value = group.name;
      input.ariaLabel = "Recording group name";
      setTooltip(input, "Rename this recording group.");
      input.addEventListener("change", () => updateMeasurementGroup(group.id, { name: input.value.trim() || group.name }));
  
      const remove = document.createElement("button");
      remove.type = "button";
      remove.append(createTrashIcon());
      remove.ariaLabel = `Remove ${group.name}`;
      setTooltip(remove, "Remove this recording group and move its measurements to the next group.");
      remove.addEventListener("click", () => deleteMeasurementGroup(group.id));
  
      pill.append(input, remove);
      measurementGroupList.append(pill);
    });
  }
  
  function renderMeasurementResponseGroups(responses) {
    const expectedSections = new Set((state.measurements?.recordingGroups || []).map((group) => `group:${group.id}`));
    measurementList.querySelectorAll('[data-measurement-section="responses"]').forEach((item) => {
      if (!expectedSections.has(item.dataset.measurementKey)) item.remove();
    });
  
    let placement = measurementList.querySelector('[data-measurement-section="candidates"]');
    const grouped = (state.measurements?.recordingGroups || []).map((group) => ({
      key: `group:${group.id}`,
      groupId: group.id,
      group,
      responses: responses.filter((response) => response.recordingGroupId === group.id),
      emptyLabel: "Empty",
    }));
  
    grouped.forEach((entry) => {
      let section = measurementList.querySelector(`[data-measurement-key="${cssEscape(entry.key)}"]`);
      if (!section) section = createMeasurementGroupBlock(entry.groupId, entry.group?.name || "Recording group", entry.emptyLabel);
      updateMeasurementGroupBlock(section, entry);
      measurementList.insertBefore(section, placement || null);
    });
  }
  
  function createMeasurementGroupBlock(groupId, label, emptyLabel) {
    const section = document.createElement("section");
    section.className = "measurement-group-block";
    section.dataset.measurementSection = "responses";
    section.dataset.measurementKey = `group:${groupId}`;
  
    const header = document.createElement("div");
    header.className = "measurement-group-header";
    header.append(...createMeasurementGroupHeaderControls(groupId, label));
  
    const chips = document.createElement("div");
    chips.className = "measurement-group-chips";
    chips.dataset.measurementGroupId = groupId;
    chips.dataset.emptyLabel = emptyLabel;
  
    section.append(header, chips);
    return section;
  }
  
  function updateMeasurementGroupBlock(section, entry) {
    section.dataset.measurementKey = entry.key;
    const groupNameInput = section.querySelector('[data-measurement-group-field="name"]');
    const groupTargetSelect = section.querySelector('[data-measurement-group-field="target"]');
    const groupTitle = section.querySelector(".measurement-group-title");
    const removeButton = section.querySelector('[data-measurement-group-action="remove"]');
    const group = entry.group;
    if (!group) return;
  
    groupNameInput.hidden = false;
    groupNameInput.disabled = false;
    if (document.activeElement !== groupNameInput) groupNameInput.value = group.name;
    groupNameInput.onchange = () => updateMeasurementGroup(group.id, { name: groupNameInput.value.trim() || group.name });
    groupTargetSelect.hidden = false;
    groupTargetSelect.disabled = false;
    hydrateMeasurementTargetOptions(groupTargetSelect, group.target || defaultMeasurementTarget());
    groupTargetSelect.onchange = () => updateMeasurementGroupTarget(group.id, groupTargetSelect.value);
    groupTitle.hidden = true;
    removeButton.hidden = false;
    removeButton.style.display = "";
    removeButton.onclick = () => deleteMeasurementGroup(group.id);
  
    section.querySelector('[data-measurement-part="count"]').textContent = `${entry.responses.length}`;
    const chips = section.querySelector(".measurement-group-chips");
    chips.dataset.measurementGroupId = group.id;
    chips.dataset.emptyLabel = entry.emptyLabel;
    chips.replaceChildren(...entry.responses.map((response) => {
      const measurementId = `response:${response.id}`;
      let item = measurementList.querySelector(`.measurement-chip[data-measurement-id="${cssEscape(measurementId)}"]`);
      if (!item) item = createMeasurementResponseItem(measurementId);
      updateMeasurementResponseItem(item, response);
      return item;
    }));
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
  
  function createMeasurementGroupHeaderControls(groupId, label) {
    const wrap = document.createElement("div");
    wrap.className = "measurement-group-header-main";
  
    const title = document.createElement("span");
    title.className = "measurement-group-title";
    title.textContent = label;
  
    const name = document.createElement("input");
    name.type = "text";
    name.className = "measurement-group-name-input";
    name.dataset.measurementGroupField = "name";
    name.ariaLabel = "Measurement group name";
  
    const target = document.createElement("select");
    target.className = "measurement-group-target-select";
    target.dataset.measurementGroupField = "target";
    target.ariaLabel = "Measurement group target";
  
    wrap.append(title, name, target);
  
    const count = document.createElement("span");
    count.className = "measurement-group-count";
    count.dataset.measurementPart = "count";
  
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "measurement-group-remove";
    remove.dataset.measurementGroupAction = "remove";
    remove.ariaLabel = `Remove ${label}`;
    remove.append(createTrashIcon());
  
    const actions = document.createElement("div");
    actions.className = "measurement-group-header-actions";
    actions.append(count, remove);
  
    return [wrap, actions];
  }
  
  function createMeasurementResponseItem(measurementId) {
    const item = document.createElement("article");
    item.className = "measurement-chip";
    item.dataset.measurementId = measurementId;
    item.draggable = true;
  
    const name = document.createElement("span");
    name.className = "measurement-chip-name";
    name.dataset.measurementPart = "name";
  
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
  
    const actions = document.createElement("div");
    actions.className = "measurement-chip-actions";
    const visible = document.createElement("button");
    visible.type = "button";
    visible.dataset.measurementAction = "visibility";
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "danger";
    remove.dataset.measurementAction = "remove";
    remove.append(createTrashIcon());
    actions.append(visible, remove);
    item.append(name, meta, angleInput, actions);
    return item;
  }
  
  function updateMeasurementResponseItem(item, response) {
    const shortName = shortMeasurementName(response);
    const fullName = fullMeasurementName(response);
    const name = item.querySelector('[data-measurement-part="name"]');
    name.textContent = shortName;
    setTooltip(name, fullName);
    setTooltip(item, fullName);
    item.querySelector('[data-measurement-part="meta"]').textContent = `${formatMeasurementAngleCompact(response)} / ${response.plane === "vertical" ? "V" : "H"} / ${formatFrequencyValue(response.points[0]?.frequencyHz)}-${formatFrequencyValue(response.points[response.points.length - 1]?.frequencyHz)}`;
  
    const angleInput = item.querySelector('[data-measurement-part="angle"]');
    if (document.activeElement !== angleInput) angleInput.value = String(Math.round(Number(response.angleDeg || 0)));
    angleInput.onchange = () => {
      const angle = parseNumericInputValue(angleInput);
      if (Number.isFinite(angle)) updateFrequencyResponseAngle(response.id, angle);
      else angleInput.value = String(Math.round(Number(response.angleDeg || 0)));
    };
  
    const visible = item.querySelector('[data-measurement-action="visibility"]');
    visible.replaceChildren(createEyeIcon(response.visible !== false));
    visible.classList.toggle("active", response.visible !== false);
    visible.setAttribute("aria-pressed", String(response.visible !== false));
    visible.ariaLabel = `${response.visible === false ? "Show" : "Hide"} ${shortName}`;
    setTooltip(visible, response.visible === false ? "Show this measurement." : "Hide this measurement.");
    visible.onclick = () => setFrequencyResponseVisibility(response.id, !response.visible);
  
    const remove = item.querySelector('[data-measurement-action="remove"]');
    remove.ariaLabel = `Remove ${shortName}`;
    setTooltip(remove, "Delete this measurement.");
    remove.onclick = () => removeFrequencyResponse(response.id);
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
