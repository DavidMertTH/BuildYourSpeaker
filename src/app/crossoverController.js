import { UNGROUPED_CROSSOVER_GROUP_ID, UNGROUPED_CONFIG_GROUP_ID } from "./constants.js";

export function createCrossoverController(deps) {
  const {
    activateDesign,
    clampCrossoverFrequency,
    cloneProject,
    createCrossoverDesignId,
    createCrossoverCircuitComponentId,
    createCrossoverCircuitJunctionId,
    createCrossoverCircuitWireId,
    commitState,
    createCrossoverTransitionId,
    createEyeIcon,
    createSignalFilterId,
    CROSSOVER_FAMILIES,
    CROSSOVER_FREQUENCY_MAX_HZ,
    CROSSOVER_FREQUENCY_MIN_HZ,
    CROSSOVER_ORDERS,
    CROSSOVER_SLIDER_STEPS,
    crossoverFrequencyToSliderValue,
    crossoverCircuitComponentPortId,
    crossoverCircuitDesignNodeId,
    crossoverCircuitFixedNodeId,
    crossoverGroupSelect,
    crossoverMemberList,
    crossoverSliderValueToFrequency,
    crossoverStatus,
    DEFAULT_CROSSOVER_FREQUENCY_HZ,
    designColorForDesign,
    enableDecimalTextInput,
    getActiveCrossoverGroupId,
    getActiveDesign,
    getState,
    normalizeGroupCrossover,
    normalizeCrossoverDesign,
    normalizeSignalFilter,
    parseNumericInputValue,
    render,
    roundTo,
    setActiveCrossoverGroupId,
    setSelectedCrossoverDesignId = () => {},
    setTooltip,
    SIGNAL_FILTER_DEFAULTS,
    SIGNAL_FILTER_TARGET_GROUP,
    SIGNAL_FILTER_TYPES,
    signalFilterAddButton,
    signalFilterList,
    signalFilterTypeSelect,
    SUBSONIC_PRESETS,
  } = deps;

  let state = getState();
  const crossoverDesignPresetSelections = new Map();

  function renderCrossoverControls() {
    state = getState();
    if (!crossoverGroupSelect || !crossoverMemberList || !signalFilterList) return;
  
    const groups = crossoverGroups();
    const fallbackGroupId = fallbackCrossoverGroupId();
    if (!groups.some((group) => group.id === getActiveCrossoverGroupId())) {
      setActiveCrossoverGroupId(fallbackGroupId);
    }
  
    crossoverGroupSelect.replaceChildren();
    crossoverGroups().forEach((group) => {
      const option = document.createElement("option");
      option.value = group.id;
      option.textContent = group.name;
      crossoverGroupSelect.append(option);
    });
    crossoverGroupSelect.value = getActiveCrossoverGroupId();
  
    const group = activeCrossoverGroup();
    const members = crossoverGroupMembers(group);
    renderCrossoverMembers(members);
    renderSignalFilters(group, members);
  
    updateSignalFilterAddButton(group, members);
  
    if (crossoverStatus) {
      if (!group || members.length < 1) {
        crossoverStatus.textContent = "Add at least one config to design crossover filters.";
      } else if (members.length < 2) {
        crossoverStatus.textContent = "Transitions need at least two configs. Crossover designs can be used for this single driver.";
      } else {
        crossoverStatus.textContent = "";
      }
    }
  }

  function updateSignalFilterAddButton(group = activeCrossoverGroup(), members = crossoverGroupMembers(group)) {
    if (!signalFilterAddButton) return;
    const selectedType = signalFilterTypeSelect?.value || "parametric";
    const needsMember = selectedType === "crossover-design";
    const needsPair = selectedType === "transition";
    signalFilterAddButton.disabled = !group || (needsMember && members.length < 1) || (needsPair && members.length < 2);
  }
  
  function activeCrossoverGroup() {
    const groups = crossoverGroups();
    return groups.find((group) => group.id === getActiveCrossoverGroupId()) || groups.find((group) => group.id === fallbackCrossoverGroupId()) || groups[0];
  }
  
  function crossoverGroupMembers(group = activeCrossoverGroup()) {
    if (!group) return [];
    const memberGroupId = groupMemberConfigGroupId(group);
    return state.designs.filter((design) => (design.groupId || UNGROUPED_CONFIG_GROUP_ID) === memberGroupId);
  }

  function crossoverGroups(project = state) {
    return [
      ...project.configGroups,
      ungroupedCrossoverGroup(project),
    ];
  }

  function ungroupedCrossoverGroup(project = state) {
    return {
      id: UNGROUPED_CROSSOVER_GROUP_ID,
      name: "No group",
      showCombined: true,
      crossover: normalizeGroupCrossover(project.ungroupedCrossover),
      isUngrouped: true,
    };
  }

  function fallbackCrossoverGroupId() {
    const activeDesign = getActiveDesign();
    if (activeDesign && !activeDesign.groupId) return UNGROUPED_CROSSOVER_GROUP_ID;
    return activeDesign?.groupId || state.configGroups[0]?.id || UNGROUPED_CROSSOVER_GROUP_ID;
  }

  function groupMemberConfigGroupId(group) {
    return group?.isUngrouped || group?.id === UNGROUPED_CROSSOVER_GROUP_ID
      ? UNGROUPED_CONFIG_GROUP_ID
      : group?.id || UNGROUPED_CONFIG_GROUP_ID;
  }

  function mutableCrossoverGroup(project, group = activeCrossoverGroup()) {
    if (!group) return null;
    if (group.id === UNGROUPED_CROSSOVER_GROUP_ID) {
      project.ungroupedCrossover = normalizeGroupCrossover(project.ungroupedCrossover);
      return {
        id: UNGROUPED_CROSSOVER_GROUP_ID,
        name: "No group",
        get crossover() {
          return project.ungroupedCrossover;
        },
        set crossover(value) {
          project.ungroupedCrossover = value;
        },
        set showCombined(_value) {},
      };
    }
    return project.configGroups.find((item) => item.id === group.id) || null;
  }
  
  function renderCrossoverMembers(members) {
    crossoverMemberList.replaceChildren();
    members.forEach((design) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "crossover-member";
      item.classList.toggle("active", design.id === state.activeDesignId);
      item.style.setProperty("--member-color", designColorForDesign(design));
      item.textContent = design.name;
      setTooltip(item, "Select this config for editing.");
      item.addEventListener("click", () => activateDesign(design.id));
      crossoverMemberList.append(item);
    });
  }
  
  function renderSignalFilters(group, members) {
    if (!signalFilterList) return;
    signalFilterList.replaceChildren();
    if (!group) return;
  
    const crossoverDesigns = group.crossover?.designs || [];
    crossoverDesigns.forEach((design) => {
      signalFilterList.append(createCrossoverDesignCard(design, members, group.id));
    });
  
    const transitions = group.crossover?.transitions || [];
    transitions.forEach((transition) => {
      signalFilterList.append(createCrossoverTransitionCard(transition, members));
    });
  
    const filters = group.crossover?.signalFilters || [];
    filters.forEach((filter) => {
      const item = document.createElement("article");
      item.className = "search-result crossover-transition signal-filter";
      item.dataset.signalFilterId = filter.id;
  
      const title = document.createElement("div");
      title.className = "search-result-title";
      const label = document.createElement("span");
      label.textContent = signalFilterTypeLabel(filter.type);
      const frequency = document.createElement("strong");
      frequency.className = "filter-frequency-badge";
      frequency.textContent = signalFilterFrequencyLabel(filter);
      title.append(label, frequency);
  
      const fields = document.createElement("div");
      fields.className = "crossover-transition-fields";
      fields.append(signalFilterTargetField(filter, members));
      signalFilterParameterFields(filter).forEach((field) => fields.append(field));
  
      const range = signalFilterRange(filter, item);
      const actions = document.createElement("div");
      actions.className = "crossover-transition-actions";
  
      const annotationToggle = filter.type === "gain" ? null : createFilterAnnotationToggle(filter, () => toggleSignalFilterAnnotation(filter.id));
  
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.textContent = filter.enabled === false ? "Enable" : "Disable";
      setTooltip(toggle, "Enable or disable this signal filter.");
      toggle.addEventListener("click", () => toggleSignalFilter(filter.id));
  
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Delete";
      remove.className = "danger";
      setTooltip(remove, "Delete this signal filter.");
      remove.addEventListener("click", () => deleteSignalFilter(filter.id));
  
      if (annotationToggle) actions.append(annotationToggle);
      actions.append(toggle, remove);
      item.classList.toggle("muted", filter.enabled === false);
      item.append(title, fields);
      if (range) item.append(range);
      item.append(actions);
      signalFilterList.append(item);
    });
  }

  function createCrossoverDesignCard(design, members, groupId) {
    const item = document.createElement("article");
    item.className = "search-result crossover-transition signal-filter signal-filter-design";
    item.dataset.crossoverDesignId = design.id;

    const title = document.createElement("div");
    title.className = "search-result-title";
    const label = document.createElement("span");
    label.textContent = "Crossover design";
    const status = document.createElement("strong");
    status.className = "filter-frequency-badge";
    status.textContent = design.enabled === false ? "Bypassed" : "Schematic";
    title.append(label, status);

    const presetControls = createCrossoverDesignPresetControls(groupId, design, members);

    const actions = document.createElement("div");
    actions.className = "crossover-transition-actions";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.textContent = design.enabled === false ? "Enable" : "Disable";
    setTooltip(toggle, "Enable or disable this schematic crossover routing.");
    toggle.addEventListener("click", () => toggleCrossoverDesign(design.id));

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Delete";
    remove.className = "danger";
    setTooltip(remove, "Delete this crossover design.");
    remove.addEventListener("click", () => deleteCrossoverDesign(design.id));

    actions.append(toggle, remove);
    item.classList.toggle("muted", design.enabled === false);
    item.append(title);
    if (presetControls) item.append(presetControls);
    item.append(actions);
    return item;
  }

  function createCrossoverDesignPresetControls(groupId, design, members) {
    const presetOptions = crossoverDesignPresetOptions(members);
    if (!presetOptions.length) return null;

    const row = document.createElement("div");
    row.className = "crossover-design-preset-row";

    const select = document.createElement("select");
    select.ariaLabel = "Crossover wiring preset";
    presetOptions.forEach((preset) => select.append(new Option(preset.label, preset.id)));
    select.value = selectedCrossoverDesignPresetId(design.id, presetOptions);
    setTooltip(select, "Choose a starter schematic for the current driver count.");
    select.addEventListener("input", () => setCrossoverDesignPresetSelection(design.id, select.value));
    select.addEventListener("change", () => setCrossoverDesignPresetSelection(design.id, select.value));

    const apply = document.createElement("button");
    apply.type = "button";
    apply.textContent = "Apply";
    setTooltip(apply, "Apply this starter schematic to the crossover design.");
    apply.addEventListener("click", () => {
      setCrossoverDesignPresetSelection(design.id, select.value);
      applyCrossoverDesignPreset(groupId, design.id, select.value);
    });

    row.append(select, apply);
    return row;
  }

  function selectedCrossoverDesignPresetId(designId, presetOptions) {
    const selected = crossoverDesignPresetSelections.get(designId);
    if (presetOptions.some((preset) => preset.id === selected)) return selected;
    const fallback = presetOptions[0]?.id || "";
    setCrossoverDesignPresetSelection(designId, fallback);
    return fallback;
  }

  function setCrossoverDesignPresetSelection(designId, presetId) {
    if (!designId) return;
    if (presetId) crossoverDesignPresetSelections.set(designId, presetId);
    else crossoverDesignPresetSelections.delete(designId);
  }

  function crossoverDesignPresetOptions(members) {
    if (!members.length) return [];
    const driverLabel = members.length === 1 ? "1 driver" : `${members.length} drivers`;
    const presets = [
      {
        id: "direct-driver-routing",
        label: `${driverLabel} direct routing`,
      },
    ];
    if (members.length === 1) {
      presets.push(
        { id: "single-driver-protection", label: "1 driver high-pass protection" },
        { id: "single-driver-zobel", label: "1 driver Zobel start" },
      );
    }
    if (members.length === 2) {
      presets.push(
        { id: "two-way-1st-order", label: "2-way 1st order split" },
        { id: "two-way-2nd-order", label: "2-way 2nd order split" },
        { id: "two-way-2nd-order-lpad", label: "2-way 2nd order + L-pad" },
      );
    }
    if (members.length >= 3) {
      presets.push(
        { id: "three-way-1st-order", label: "3-way 1st order start" },
        { id: "three-way-2nd-order", label: "3-way 2nd order start" },
      );
    }
    return presets;
  }
  
  function createCrossoverTransitionCard(transition, members) {
    const from = members.find((design) => design.id === transition.fromDesignId);
    const to = members.find((design) => design.id === transition.toDesignId);
  
    const item = document.createElement("article");
    item.className = "search-result crossover-transition signal-filter signal-filter-transition";
    item.dataset.transitionId = transition.id;
  
    const title = document.createElement("div");
    title.className = "search-result-title";
    const label = document.createElement("span");
    label.textContent = "Transition";
    const frequency = document.createElement("strong");
    frequency.className = "filter-frequency-badge";
    frequency.textContent = frequencyLabel(transition.frequencyHz);
    title.append(label, frequency);
  
    const fields = document.createElement("div");
    fields.className = "crossover-transition-fields";
    fields.append(
      crossoverTransitionSelectField(transition, members, "fromDesignId", "From", "Low-pass config."),
      crossoverTransitionSelectField(transition, members, "toDesignId", "To", "High-pass config."),
      crossoverTransitionNumberField(transition, "frequencyHz", "Freq", "Crossover frequency."),
      crossoverTransitionFamilyField(transition),
      crossoverTransitionOrderField(transition),
    );
  
    const range = document.createElement("input");
    range.className = "planner-range crossover-transition-range signal-filter-range";
    range.type = "range";
    range.min = "0";
    range.max = String(CROSSOVER_SLIDER_STEPS);
    range.step = "1";
    range.value = String(crossoverFrequencyToSliderValue(transition.frequencyHz));
    range.ariaLabel = "Crossover frequency slider";
    setTooltip(range, "Adjust this crossover frequency live on a logarithmic scale.");
    range.addEventListener("input", () => {
      const value = crossoverSliderValueToFrequency(range.value);
      const numberInput = item.querySelector('input[data-crossover-field="frequencyHz"]');
      if (numberInput) numberInput.value = String(roundTo(value, value >= 1000 ? 0 : 1));
      const badge = item.querySelector(".filter-frequency-badge");
      if (badge) badge.textContent = frequencyLabel(value);
      updateCrossoverTransitionFields(transition.id, { frequencyHz: value }, { live: true });
    });
  
    const actions = document.createElement("div");
    actions.className = "crossover-transition-actions";
  
    const annotationToggle = createFilterAnnotationToggle(transition, () => toggleCrossoverTransitionAnnotation(transition.id));
  
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.textContent = transition.enabled === false ? "Enable" : "Disable";
    setTooltip(toggle, "Enable or disable this transition.");
    toggle.addEventListener("click", () => toggleCrossoverTransition(transition.id));
  
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Delete";
    remove.className = "danger";
    setTooltip(remove, "Delete this transition.");
    remove.addEventListener("click", () => deleteCrossoverTransition(transition.id));
  
    actions.append(annotationToggle, toggle, remove);
    item.classList.toggle("muted", transition.enabled === false);
    if (!from || !to) item.classList.add("invalid");
    item.append(title, fields, range, actions);
    return item;
  }
  
  function createFilterAnnotationToggle(filter, onToggle) {
    const visible = filter.showAnnotation !== false;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter-annotation-toggle";
    button.classList.toggle("active", visible);
    button.ariaLabel = `${visible ? "Hide" : "Show"} SPL visualization`;
    button.setAttribute("aria-pressed", String(visible));
    setTooltip(button, `${visible ? "Hide" : "Show"} this filter's SPL graph visualization.`);
    button.append(createEyeIcon(visible));
    button.addEventListener("click", onToggle);
    return button;
  }
  
  function signalFilterTargetField(filter, members) {
    const label = document.createElement("label");
    label.className = "crossover-transition-field";
    const span = document.createElement("span");
    span.textContent = "Target";
    const select = document.createElement("select");
    select.dataset.signalFilterField = "target";
    select.append(new Option("Group", SIGNAL_FILTER_TARGET_GROUP));
    members.forEach((design) => select.append(new Option(`Config: ${design.name}`, `design:${design.id}`)));
    const driverGroups = uniqueDriverGroupsForMembers(members);
    driverGroups.forEach((group) => select.append(new Option(`Driver: ${group.name}`, `driverGroup:${group.id}`)));
    select.value = [...select.options].some((option) => option.value === filter.target) ? filter.target : SIGNAL_FILTER_TARGET_GROUP;
    setTooltip(select, "Choose whether this filter applies to the whole group, one config, or configs using a driver group.");
    select.addEventListener("change", () => updateSignalFilterFields(filter.id, { target: select.value }, { animatePlots: true, renderControls: true }));
    label.append(span, select);
    return label;
  }
  
  function signalFilterParameterFields(filter) {
    if (filter.type === "gain") {
      return [
        signalFilterNumberField(filter, "gainDb", "Gain", "Output gain in dB.", { min: -24, max: 24, step: 0.1 }),
      ];
    }
    if (filter.type === "linkwitz-transform") {
      return [
        signalFilterNumberField(filter, "sourceFrequencyHz", "Src Hz", "Current system resonance frequency.", { min: 1, max: CROSSOVER_FREQUENCY_MAX_HZ, step: 1 }),
        signalFilterNumberField(filter, "sourceQ", "Src Q", "Current system Q.", { min: 0.1, max: 4, step: 0.01 }),
        signalFilterNumberField(filter, "targetFrequencyHz", "Target Hz", "Target resonance frequency after Linkwitz Transform.", { min: 1, max: CROSSOVER_FREQUENCY_MAX_HZ, step: 1 }),
        signalFilterNumberField(filter, "targetQ", "Target Q", "Target system Q after Linkwitz Transform.", { min: 0.1, max: 4, step: 0.01 }),
      ];
    }
  
    const fields = [
      signalFilterNumberField(filter, "frequencyHz", "Freq", "Filter frequency.", { min: CROSSOVER_FREQUENCY_MIN_HZ, max: CROSSOVER_FREQUENCY_MAX_HZ, step: 1 }),
    ];
    if (filter.type === "parametric") {
      fields.push(signalFilterNumberField(filter, "gainDb", "Gain", "Filter gain in dB.", { min: -24, max: 24, step: 0.1 }));
    }
    if (filter.type === "parametric") {
      fields.push(signalFilterNumberField(filter, "q", "Q", "Filter Q / bandwidth.", { min: 0.1, max: 20, step: 0.01 }));
    }
    if (filter.type === "lowpass" || filter.type === "highpass") {
      fields.push(signalFilterFamilyField(filter), signalFilterOrderField(filter));
    }
    if (filter.type === "subsonic") {
      fields.unshift(signalFilterSubsonicPresetField(filter));
      fields.push(signalFilterFamilyField(filter), signalFilterOrderField(filter));
    }
    return fields;
  }
  
  function signalFilterSubsonicPresetField(filter) {
    const label = document.createElement("label");
    label.className = "crossover-transition-field";
    const span = document.createElement("span");
    span.textContent = "Preset";
    const select = document.createElement("select");
    select.dataset.signalFilterField = "preset";
    Object.entries(SUBSONIC_PRESETS).forEach(([value, preset]) => {
      select.append(new Option(preset.label, value));
    });
    select.value = Object.hasOwn(SUBSONIC_PRESETS, filter.preset) ? filter.preset : "custom";
    setTooltip(select, "Choose a subsonic / rumble protection preset.");
    select.addEventListener("change", () => {
      const preset = SUBSONIC_PRESETS[select.value] || SUBSONIC_PRESETS.custom;
      updateSignalFilterFields(filter.id, {
        preset: select.value,
        ...(Number.isFinite(preset.frequencyHz) ? { frequencyHz: preset.frequencyHz } : {}),
        ...(preset.family ? { family: preset.family } : {}),
        ...(Number.isFinite(preset.order) ? { order: preset.order } : {}),
      }, { animatePlots: true, renderControls: true });
    });
    label.append(span, select);
    return label;
  }
  
  function signalFilterNumberField(filter, key, labelText, tooltip, options = {}) {
    const label = document.createElement("label");
    label.className = "crossover-transition-field";
    const span = document.createElement("span");
    span.textContent = labelText;
    const input = document.createElement("input");
    input.type = "number";
    enableDecimalTextInput(input);
    input.min = String(options.min ?? "");
    input.max = String(options.max ?? "");
    input.step = String(options.step ?? 1);
    input.dataset.signalFilterField = key;
    input.value = String(roundTo(Number(filter[key]) || 0, Number(options.step) < 1 ? 2 : 1));
    setTooltip(input, tooltip);
    input.addEventListener("input", () => {
      const value = parseNumericInputValue(input);
      if (!Number.isFinite(value)) return;
      const range = input.closest(".signal-filter")?.querySelector(".signal-filter-range");
      if (range && key === "frequencyHz") range.value = String(crossoverFrequencyToSliderValue(value));
      if (range && key === "gainDb") range.value = String(value);
      const badge = input.closest(".signal-filter")?.querySelector(".filter-frequency-badge");
      if (badge) badge.textContent = signalFilterFrequencyLabel({ ...filter, [key]: value });
      updateSignalFilterFields(filter.id, { [key]: value, ...(filter.type === "subsonic" ? { preset: "custom" } : {}) }, { live: true });
    });
    label.append(span, input);
    return label;
  }
  
  function signalFilterFamilyField(filter) {
    const label = document.createElement("label");
    label.className = "crossover-transition-field";
    const span = document.createElement("span");
    span.textContent = "Family";
    const select = document.createElement("select");
    select.dataset.signalFilterField = "family";
    select.append(new Option("Butterworth", "butterworth"), new Option("Linkwitz-Riley", "linkwitz-riley"));
    select.value = CROSSOVER_FAMILIES.includes(filter.family) ? filter.family : "butterworth";
    setTooltip(select, filter.type === "subsonic" ? "Subsonic high-pass family." : "Filter response family.");
    select.addEventListener("change", () => updateSignalFilterFields(filter.id, { family: select.value, ...(filter.type === "subsonic" ? { preset: "custom" } : {}) }, { animatePlots: true, renderControls: true }));
    label.append(span, select);
    return label;
  }
  
  function signalFilterOrderField(filter) {
    const label = document.createElement("label");
    label.className = "crossover-transition-field";
    const span = document.createElement("span");
    span.textContent = "Order";
    const select = document.createElement("select");
    select.dataset.signalFilterField = "order";
    select.append(new Option("2nd", "2"), new Option("4th", "4"));
    select.value = String(CROSSOVER_ORDERS.includes(Number(filter.order)) ? Number(filter.order) : 4);
    setTooltip(select, filter.type === "subsonic" ? "Subsonic filter slope." : "Filter slope.");
    select.addEventListener("change", () => updateSignalFilterFields(filter.id, { order: Number(select.value), ...(filter.type === "subsonic" ? { preset: "custom" } : {}) }, { animatePlots: true, renderControls: true }));
    label.append(span, select);
    return label;
  }
  
  function signalFilterRange(filter, item) {
    if (filter.type === "gain") {
      const range = document.createElement("input");
      range.className = "planner-range crossover-transition-range signal-filter-range signal-filter-gain-range";
      range.type = "range";
      range.min = "-24";
      range.max = "24";
      range.step = "0.1";
      range.value = String(Number(filter.gainDb) || 0);
      range.ariaLabel = "Gain level slider";
      setTooltip(range, "Adjust this gain filter level live.");
      range.addEventListener("input", () => {
        const value = Number(range.value);
        const numberInput = item.querySelector('input[data-signal-filter-field="gainDb"]');
        if (numberInput) numberInput.value = String(roundTo(value, 1));
        const badge = item.querySelector(".filter-frequency-badge");
        if (badge) badge.textContent = signalFilterFrequencyLabel({ ...filter, gainDb: value });
        updateSignalFilterFields(filter.id, { gainDb: value }, { live: true });
      });
      return range;
    }
    if (!["parametric", "lowpass", "highpass", "subsonic"].includes(filter.type)) return null;
    const range = document.createElement("input");
    range.className = "planner-range crossover-transition-range signal-filter-range";
    range.type = "range";
    range.min = "0";
    range.max = String(CROSSOVER_SLIDER_STEPS);
    range.step = "1";
    range.value = String(crossoverFrequencyToSliderValue(filter.frequencyHz));
    range.ariaLabel = "Signal filter frequency slider";
    setTooltip(range, "Adjust this filter frequency live on a logarithmic scale.");
    range.addEventListener("input", () => {
      const value = crossoverSliderValueToFrequency(range.value);
      const numberInput = item.querySelector('input[data-signal-filter-field="frequencyHz"]');
      if (numberInput) numberInput.value = String(roundTo(value, value >= 1000 ? 0 : 1));
      const badge = item.querySelector(".filter-frequency-badge");
      if (badge) badge.textContent = signalFilterFrequencyLabel({ ...filter, frequencyHz: value });
      updateSignalFilterFields(filter.id, { frequencyHz: value, ...(filter.type === "subsonic" ? { preset: "custom" } : {}) }, { live: true });
    });
    return range;
  }
  
  function signalFilterTypeLabel(type) {
    return {
      parametric: "Parametric EQ",
      gain: "Gain",
      lowpass: "Lowpass",
      highpass: "Highpass",
      "linkwitz-transform": "Linkwitz Transform",
      subsonic: "Subsonic / rumble",
    }[type] || "Signal filter";
  }
  
  function signalFilterFrequencyLabel(filter) {
    if (filter.type === "linkwitz-transform") {
      return `${frequencyLabel(filter.sourceFrequencyHz)} -> ${frequencyLabel(filter.targetFrequencyHz)}`;
    }
    if (filter.type === "gain") {
      const gain = Number(filter.gainDb) || 0;
      return `${gain >= 0 ? "+" : ""}${roundTo(gain, 1)} dB`;
    }
    return frequencyLabel(filter.frequencyHz);
  }
  
  function frequencyLabel(value) {
    const frequency = Number(value);
    if (!Number.isFinite(frequency) || frequency <= 0) return "-";
    if (frequency >= 1000) {
      const khz = frequency / 1000;
      return `${roundTo(khz, khz >= 10 ? 1 : 2)} kHz`;
    }
    return `${roundTo(frequency, frequency >= 100 ? 0 : 1)} Hz`;
  }
  
  function uniqueDriverGroupsForMembers(members) {
    const seen = new Set();
    const groups = [];
    members.forEach((design) => {
      (design.driverGroups || []).forEach((group) => {
        if (!group?.id || seen.has(group.id)) return;
        seen.add(group.id);
        groups.push(group);
      });
    });
    return groups;
  }
  
  function crossoverTransitionSelectField(transition, members, key, labelText, tooltip) {
    const label = document.createElement("label");
    label.className = "crossover-transition-field";
    const span = document.createElement("span");
    span.textContent = labelText;
    const select = document.createElement("select");
    select.dataset.crossoverField = key;
    members.forEach((design) => {
      select.append(new Option(design.name, design.id));
    });
    select.value = members.some((design) => design.id === transition[key]) ? transition[key] : members[0]?.id || "";
    setTooltip(select, tooltip);
    select.addEventListener("change", () => {
      const patch = { [key]: select.value };
      const otherKey = key === "fromDesignId" ? "toDesignId" : "fromDesignId";
      if (patch[key] === transition[otherKey]) {
        const replacement = members.find((design) => design.id !== patch[key]);
        if (replacement) patch[otherKey] = replacement.id;
      }
      updateCrossoverTransitionFields(transition.id, patch, { animatePlots: true, renderControls: true });
    });
    label.append(span, select);
    return label;
  }
  
  function crossoverTransitionNumberField(transition, key, labelText, tooltip) {
    const label = document.createElement("label");
    label.className = "crossover-transition-field";
    const span = document.createElement("span");
    span.textContent = labelText;
    const input = document.createElement("input");
    input.type = "number";
    enableDecimalTextInput(input);
    input.min = String(CROSSOVER_FREQUENCY_MIN_HZ);
    input.max = String(CROSSOVER_FREQUENCY_MAX_HZ);
    input.step = "1";
    input.dataset.crossoverField = key;
    input.value = String(roundTo(clampCrossoverFrequency(transition[key]), 1));
    setTooltip(input, tooltip);
    input.addEventListener("input", () => {
      const parsed = parseNumericInputValue(input);
      if (!Number.isFinite(parsed)) return;
      const value = clampCrossoverFrequency(parsed);
      const range = input.closest(".crossover-transition")?.querySelector(".crossover-transition-range");
      if (range) range.value = String(crossoverFrequencyToSliderValue(value));
      updateCrossoverTransitionFields(transition.id, { [key]: value }, { live: true });
    });
    label.append(span, input);
    return label;
  }
  
  function crossoverTransitionFamilyField(transition, datasetKey = "crossoverField", onChange = null) {
    const label = document.createElement("label");
    label.className = "crossover-transition-field";
    const span = document.createElement("span");
    span.textContent = "Family";
    const select = document.createElement("select");
    select.dataset[datasetKey] = "family";
    select.append(new Option("Linkwitz-Riley", "linkwitz-riley"), new Option("Butterworth", "butterworth"));
    select.value = CROSSOVER_FAMILIES.includes(transition.family) ? transition.family : "linkwitz-riley";
    setTooltip(select, "Filter family.");
    select.addEventListener("change", () => {
      const patch = { family: select.value };
      if (onChange) onChange(patch);
      else updateCrossoverTransitionFields(transition.id, patch, { animatePlots: true, renderControls: true });
    });
    label.append(span, select);
    return label;
  }
  
  function crossoverTransitionOrderField(transition, datasetKey = "crossoverField", onChange = null) {
    const label = document.createElement("label");
    label.className = "crossover-transition-field";
    const span = document.createElement("span");
    span.textContent = "Order";
    const select = document.createElement("select");
    select.dataset[datasetKey] = "order";
    select.append(new Option("2nd", "2"), new Option("4th", "4"));
    select.value = String(CROSSOVER_ORDERS.includes(Number(transition.order)) ? Number(transition.order) : 4);
    setTooltip(select, "Filter slope.");
    select.addEventListener("change", () => {
      const patch = { order: Number(select.value) };
      if (onChange) onChange(patch);
      else updateCrossoverTransitionFields(transition.id, patch, { animatePlots: true, renderControls: true });
    });
    label.append(span, select);
    return label;
  }

  function crossoverFamilyLabel(family) {
    return family === "butterworth" ? "BW" : "LR";
  }
  
  function addCrossoverTransition() {
    state = getState();
    const group = activeCrossoverGroup();
    const members = crossoverGroupMembers(group);
    if (!group || members.length < 2) return;
  
    const nextState = cloneProject(state);
    const nextGroup = mutableCrossoverGroup(nextState, group);
    if (!nextGroup) return;
    nextGroup.crossover = normalizeGroupCrossover(nextGroup.crossover);
    const transition = {
      id: createCrossoverTransitionId(),
      fromDesignId: members[0].id,
      toDesignId: members[1].id,
      frequencyHz: DEFAULT_CROSSOVER_FREQUENCY_HZ,
      family: "linkwitz-riley",
      order: 4,
      enabled: true,
    };
    nextGroup.crossover.transitions.push(transition);
    nextGroup.showCombined = true;
    commitState(nextState, { animatePlots: true });
  }

  function addCrossoverDesign(type = "two-way") {
    state = getState();
    const group = activeCrossoverGroup();
    const members = crossoverGroupMembers(group);
    if (!group || members.length < 1) return "";

    void type;
    const nextState = cloneProject(state);
    const nextGroup = mutableCrossoverGroup(nextState, group);
    if (!nextGroup) return "";
    nextGroup.crossover = normalizeGroupCrossover(nextGroup.crossover);
    const newDesignId = createCrossoverDesignId();
    nextGroup.crossover.designs.push(normalizeCrossoverDesign({
      id: newDesignId,
      enabled: true,
    }));
    if (!nextGroup.crossover.circuit.components.length && !nextGroup.crossover.circuit.wires.length) {
      nextGroup.crossover.circuit = directDriverRoutingCircuit(members);
    }
    nextGroup.showCombined = true;
    setSelectedCrossoverDesignId(group.id, newDesignId);
    commitState(nextState, { animatePlots: true });
    return newDesignId;
  }

  function addSignalFilter(type = "parametric") {
    state = getState();
    if (type === "crossover-design") {
      addCrossoverDesign("two-way");
      return;
    }
    if (type === "transition") {
      addCrossoverTransition();
      return;
    }
    const group = activeCrossoverGroup();
    if (!group) return;
  
    const normalizedType = SIGNAL_FILTER_TYPES.includes(type) ? type : "parametric";
    const nextState = cloneProject(state);
    const nextGroup = mutableCrossoverGroup(nextState, group);
    if (!nextGroup) return;
    nextGroup.crossover = normalizeGroupCrossover(nextGroup.crossover);
    nextGroup.crossover.signalFilters.push(normalizeSignalFilter({
      id: createSignalFilterId(),
      type: normalizedType,
      target: SIGNAL_FILTER_TARGET_GROUP,
      enabled: true,
      ...SIGNAL_FILTER_DEFAULTS[normalizedType],
    }));
    commitState(nextState, { animatePlots: true });
  }

  function applyCrossoverDesignPreset(groupId, designId, presetId) {
    state = getState();
    const group = crossoverGroups(state).find((item) => item.id === groupId);
    const members = crossoverGroupMembers(group);
    if (!group || !members.length) return;

    const nextState = cloneProject(state);
    const nextGroup = mutableCrossoverGroup(nextState, group);
    if (!nextGroup) return;
    nextGroup.crossover = normalizeGroupCrossover(nextGroup.crossover);
    const design = nextGroup.crossover.designs.find((item) => item.id === designId);
    if (!design) return;
    const nextCircuit = crossoverDesignPresetCircuit(members, presetId);
    if (!nextCircuit) return;
    nextGroup.crossover.circuit = nextCircuit;
    nextGroup.showCombined = true;
    setSelectedCrossoverDesignId(groupId, designId);
    commitState(nextState, { animatePlots: true, renderControls: true });
  }

  function crossoverDesignPresetCircuit(members, presetId) {
    if (presetId === "direct-driver-routing") return directDriverRoutingCircuit(members);
    if (presetId === "single-driver-protection" && members.length === 1) return singleDriverProtectionCircuit(members);
    if (presetId === "single-driver-zobel" && members.length === 1) return singleDriverZobelCircuit(members);
    if (presetId === "two-way-1st-order" && members.length === 2) return twoWaySplitCircuit(members, { order: 1 });
    if (presetId === "two-way-2nd-order" && members.length === 2) return twoWaySplitCircuit(members, { order: 2 });
    if (presetId === "two-way-2nd-order-lpad" && members.length === 2) return twoWaySplitCircuit(members, { order: 2, lpad: true });
    if (presetId === "three-way-1st-order" && members.length >= 3) return threeWaySplitCircuit(members, { order: 1 });
    if (presetId === "three-way-2nd-order" && members.length >= 3) return threeWaySplitCircuit(members, { order: 2 });
    return null;
  }

  function directDriverRoutingCircuit(members) {
    const endpointAnchorOffsetY = 31.6667;
    const speakerPlusOffsetY = 21;
    const speakerMinusOffsetY = 47;
    const height = Math.max(360, 150 + Math.max(members.length * 2, 2) * 92);
    const width = 920;
    const inputX = 42;
    const speakerX = width - 176;
    const firstSpeakerY = 86;
    const speakerGap = 118;
    const positiveBusX = 360;
    const negativeBusX = 470;
    const positiveId = crossoverCircuitFixedNodeId("positive");
    const groundId = crossoverCircuitFixedNodeId("ground");
    const speakerPositions = members.map((design, index) => ({
      design,
      x: speakerX,
      y: firstSpeakerY + index * speakerGap,
      plusId: crossoverCircuitDesignNodeId(design.id, "positive"),
      minusId: crossoverCircuitDesignNodeId(design.id, "negative"),
    }));
    const firstPositiveLineY = speakerPositions[0].y + speakerPlusOffsetY;
    const lastNegativeLineY = speakerPositions[speakerPositions.length - 1].y + speakerMinusOffsetY;

    const nodes = [
      { id: positiveId, x: inputX, y: firstPositiveLineY - endpointAnchorOffsetY },
      { id: groundId, x: inputX, y: lastNegativeLineY - endpointAnchorOffsetY },
      ...speakerPositions.flatMap((speaker) => [
        { id: speaker.plusId, x: speaker.x, y: speaker.y },
        { id: speaker.minusId, x: speaker.x, y: speaker.y },
      ]),
    ];

    const wires = [];
    const pushWire = (from, to) => wires.push({ id: createCrossoverCircuitWireId(), from, to });

    if (speakerPositions.length === 1) {
      pushWire(positiveId, speakerPositions[0].plusId);
      pushWire(groundId, speakerPositions[0].minusId);
      return { components: [], nodes, wires };
    }

    const positiveJunctions = speakerPositions.map((speaker) => ({
      id: `junction:${createCrossoverCircuitJunctionId()}`,
      x: positiveBusX,
      y: speaker.y + speakerPlusOffsetY,
      speaker,
    }));
    const negativeJunctions = speakerPositions.map((speaker) => ({
      id: `junction:${createCrossoverCircuitJunctionId()}`,
      x: negativeBusX,
      y: speaker.y + speakerMinusOffsetY,
      speaker,
    }));
    nodes.push(
      ...positiveJunctions.map((junction) => ({ id: junction.id, x: junction.x - 6, y: junction.y - 6 })),
      ...negativeJunctions.map((junction) => ({ id: junction.id, x: junction.x - 6, y: junction.y - 6 })),
    );
    pushWire(positiveId, positiveJunctions[0].id);
    for (let index = 1; index < positiveJunctions.length; index += 1) {
      pushWire(positiveJunctions[index - 1].id, positiveJunctions[index].id);
    }
    positiveJunctions.forEach((junction) => {
      pushWire(junction.id, junction.speaker.plusId);
    });

    pushWire(groundId, negativeJunctions[negativeJunctions.length - 1].id);
    for (let index = negativeJunctions.length - 1; index > 0; index -= 1) {
      pushWire(negativeJunctions[index].id, negativeJunctions[index - 1].id);
    }
    negativeJunctions.forEach((junction) => {
      pushWire(junction.id, junction.speaker.minusId);
    });

    return { components: [], nodes, wires };
  }

  function singleDriverProtectionCircuit(members) {
    const builder = createPresetCircuitBuilder(members, { firstSpeakerY: 150, speakerGap: 120, width: 900 });
    const speaker = builder.speakers[0];
    const seriesCap = builder.addComponent("capacitor", 68, 270, speaker.y - 1);
    builder.addWire(builder.positiveId, builder.port(seriesCap, "a"));
    builder.addWire(builder.port(seriesCap, "b"), speaker.plusId);
    builder.addNegativeBus(builder.speakers);
    return builder.circuit();
  }

  function singleDriverZobelCircuit(members) {
    const builder = createPresetCircuitBuilder(members, { firstSpeakerY: 150, speakerGap: 120, width: 980 });
    const speaker = builder.speakers[0];
    const outputNode = builder.addJunction(550, speaker.plusLineY);
    const returnNode = builder.addJunction(550, speaker.minusLineY);
    const resistor = builder.addComponent("resistor", 6.8, 340, speaker.y + 82);
    const capacitor = builder.addComponent("capacitor", 10, 500, speaker.y + 82);
    builder.addWire(builder.positiveId, outputNode);
    builder.addWire(outputNode, speaker.plusId);
    builder.addWire(outputNode, builder.port(resistor, "a"));
    builder.addWire(builder.port(resistor, "b"), builder.port(capacitor, "a"));
    builder.addWire(builder.port(capacitor, "b"), returnNode);
    builder.addWire(returnNode, speaker.minusId);
    builder.addWire(builder.groundId, returnNode);
    return builder.circuit();
  }

  function twoWaySplitCircuit(members, options = {}) {
    const builder = createPresetCircuitBuilder(members, { firstSpeakerY: 112, speakerGap: 150, width: 1060 });
    const [woofer, tweeter] = builder.speakers;
    const split = builder.addJunction(172, (woofer.plusLineY + tweeter.plusLineY) / 2);
    builder.addWire(builder.positiveId, split);
    addLowPassBranch(builder, split, woofer, { order: options.order || 1, x: 260, l1: 0.68, c1: 10, l2: 0.33 });
    addHighPassBranch(builder, split, tweeter, { order: options.order || 1, x: 260, c1: 6.8, l1: 0.47, c2: 4.7, lpad: Boolean(options.lpad) });
    builder.addNegativeBus(builder.speakers);
    return builder.circuit();
  }

  function threeWaySplitCircuit(members, options = {}) {
    const builder = createPresetCircuitBuilder(members, { firstSpeakerY: 86, speakerGap: 128, width: 1120 });
    const [woofer, midrange, tweeter] = builder.speakers;
    const order = options.order || 1;
    const split = builder.addJunction(166, midrange.plusLineY);
    builder.addWire(builder.positiveId, split);
    addLowPassBranch(builder, split, woofer, { order, x: 248, l1: 1.2, c1: 22, l2: 0.68 });
    addBandPassBranch(builder, split, midrange, { order, x: 248 });
    addHighPassBranch(builder, split, tweeter, { order, x: 248, c1: 4.7, l1: 0.33, c2: 3.3 });
    builder.speakers.slice(3).forEach((speaker, index) => {
      const directNode = builder.addJunction(250 + index * 46, speaker.plusLineY);
      builder.addWire(split, directNode);
      builder.addWire(directNode, speaker.plusId);
    });
    builder.addNegativeBus(builder.speakers);
    return builder.circuit();
  }

  function addLowPassBranch(builder, inputNode, speaker, options) {
    const first = builder.addComponent("inductor", options.l1, options.x, speaker.y - 1);
    const out = builder.addJunction(options.x + 275, speaker.plusLineY);
    builder.addWire(inputNode, builder.port(first, "a"));
    builder.addWire(builder.port(first, "b"), out);
    if (options.order >= 2) {
      const shunt = builder.addComponent("capacitor", options.c1, options.x + 122, speaker.y + 78);
      const ret = builder.addJunction(options.x + 320, speaker.minusLineY);
      builder.addWire(out, builder.port(shunt, "a"));
      builder.addWire(builder.port(shunt, "b"), ret);
      builder.addWire(ret, speaker.minusId);
    }
    if (options.order >= 3) {
      const second = builder.addComponent("inductor", options.l2, options.x + 318, speaker.y - 1);
      builder.addWire(out, builder.port(second, "a"));
      builder.addWire(builder.port(second, "b"), speaker.plusId);
      return;
    }
    builder.addWire(out, speaker.plusId);
  }

  function addHighPassBranch(builder, inputNode, speaker, options) {
    const first = builder.addComponent("capacitor", options.c1, options.x, speaker.y - 1);
    const out = builder.addJunction(options.x + 275, speaker.plusLineY);
    builder.addWire(inputNode, builder.port(first, "a"));
    builder.addWire(builder.port(first, "b"), out);
    if (options.order >= 2) {
      const shunt = builder.addComponent("inductor", options.l1, options.x + 122, speaker.y + 78);
      const ret = builder.addJunction(options.x + 320, speaker.minusLineY);
      builder.addWire(out, builder.port(shunt, "a"));
      builder.addWire(builder.port(shunt, "b"), ret);
      builder.addWire(ret, speaker.minusId);
    }
    if (options.lpad) {
      const series = builder.addComponent("resistor", 2.2, options.x + 330, speaker.y - 1);
      const shunt = builder.addComponent("resistor", 8.2, options.x + 466, speaker.y + 78);
      const padOut = builder.addJunction(options.x + 610, speaker.plusLineY);
      const padReturn = builder.addJunction(options.x + 610, speaker.minusLineY);
      builder.addWire(out, builder.port(series, "a"));
      builder.addWire(builder.port(series, "b"), padOut);
      builder.addWire(padOut, speaker.plusId);
      builder.addWire(padOut, builder.port(shunt, "a"));
      builder.addWire(builder.port(shunt, "b"), padReturn);
      builder.addWire(padReturn, speaker.minusId);
      return;
    }
    if (options.order >= 3) {
      const second = builder.addComponent("capacitor", options.c2, options.x + 318, speaker.y - 1);
      builder.addWire(out, builder.port(second, "a"));
      builder.addWire(builder.port(second, "b"), speaker.plusId);
      return;
    }
    builder.addWire(out, speaker.plusId);
  }

  function addBandPassBranch(builder, inputNode, speaker, options) {
    const highPass = builder.addComponent("capacitor", 15, options.x, speaker.y - 1);
    const bandNode = builder.addJunction(options.x + 245, speaker.plusLineY);
    const lowPass = builder.addComponent("inductor", 0.56, options.x + 310, speaker.y - 1);
    builder.addWire(inputNode, builder.port(highPass, "a"));
    builder.addWire(builder.port(highPass, "b"), bandNode);
    if (options.order >= 2) {
      const shuntL = builder.addComponent("inductor", 0.68, options.x + 95, speaker.y + 78);
      const shuntC = builder.addComponent("capacitor", 12, options.x + 410, speaker.y + 78);
      const retA = builder.addJunction(options.x + 230, speaker.minusLineY);
      const retB = builder.addJunction(options.x + 550, speaker.minusLineY);
      builder.addWire(bandNode, builder.port(shuntL, "a"));
      builder.addWire(builder.port(shuntL, "b"), retA);
      builder.addWire(retA, speaker.minusId);
      builder.addWire(builder.port(lowPass, "b"), builder.port(shuntC, "a"));
      builder.addWire(builder.port(shuntC, "b"), retB);
      builder.addWire(retB, speaker.minusId);
    }
    builder.addWire(bandNode, builder.port(lowPass, "a"));
    builder.addWire(builder.port(lowPass, "b"), speaker.plusId);
  }

  function createPresetCircuitBuilder(members, options = {}) {
    const endpointAnchorOffsetY = 31.6667;
    const speakerPlusOffsetY = 21;
    const speakerMinusOffsetY = 47;
    const width = options.width || 1020;
    const inputX = 42;
    const speakerX = width - 176;
    const firstSpeakerY = options.firstSpeakerY || 96;
    const speakerGap = options.speakerGap || 130;
    const positiveId = crossoverCircuitFixedNodeId("positive");
    const groundId = crossoverCircuitFixedNodeId("ground");
    const speakers = members.map((design, index) => {
      const y = firstSpeakerY + index * speakerGap;
      return {
        design,
        x: speakerX,
        y,
        plusLineY: y + speakerPlusOffsetY,
        minusLineY: y + speakerMinusOffsetY,
        plusId: crossoverCircuitDesignNodeId(design.id, "positive"),
        minusId: crossoverCircuitDesignNodeId(design.id, "negative"),
      };
    });
    const nodes = [
      { id: positiveId, x: inputX, y: speakers[0].plusLineY - endpointAnchorOffsetY },
      { id: groundId, x: inputX, y: speakers[speakers.length - 1].minusLineY - endpointAnchorOffsetY },
      ...speakers.flatMap((speaker) => [
        { id: speaker.plusId, x: speaker.x, y: speaker.y },
        { id: speaker.minusId, x: speaker.x, y: speaker.y },
      ]),
    ];
    const components = [];
    const wires = [];
    return {
      positiveId,
      groundId,
      speakers,
      addJunction(x, y) {
        const id = `junction:${createCrossoverCircuitJunctionId()}`;
        nodes.push({ id, x: x - 6, y: y - 6 });
        return id;
      },
      addComponent(type, value, x, y) {
        const id = createCrossoverCircuitComponentId();
        components.push({ id, type, value, x, y });
        return id;
      },
      addWire(from, to) {
        if (from && to) wires.push({ id: createCrossoverCircuitWireId(), from, to });
      },
      addNegativeBus(speakerList = speakers) {
        const busX = width - 260;
        const junctions = speakerList.map((speaker) => ({
          id: this.addJunction(busX, speaker.minusLineY),
          speaker,
        }));
        if (!junctions.length) return;
        this.addWire(groundId, junctions[junctions.length - 1].id);
        for (let index = junctions.length - 1; index > 0; index -= 1) {
          this.addWire(junctions[index].id, junctions[index - 1].id);
        }
        junctions.forEach((junction) => this.addWire(junction.id, junction.speaker.minusId));
      },
      port(componentId, port) {
        return crossoverCircuitComponentPortId(componentId, port);
      },
      circuit() {
        return { components, nodes, wires };
      },
    };
  }

  function toggleCrossoverDesign(designId) {
    updateCrossoverDesign(designId, (design) => {
      design.enabled = design.enabled === false;
    }, { animatePlots: true, renderControls: true });
  }

  function deleteCrossoverDesign(designId) {
    const group = activeCrossoverGroup();
    if (!group) return;
    const nextState = cloneProject(state);
    const nextGroup = mutableCrossoverGroup(nextState, group);
    if (!nextGroup) return;
    nextGroup.crossover = normalizeGroupCrossover(nextGroup.crossover);
    nextGroup.crossover.designs = nextGroup.crossover.designs.filter((design) => design.id !== designId);
    commitState(nextState, { animatePlots: true });
  }

  function updateCrossoverDesignFields(designId, patch, options = {}) {
    updateCrossoverDesign(designId, (design) => {
      Object.assign(design, patch);
      Object.assign(design, normalizeCrossoverDesign(design));
    }, options.live ? { renderControls: false, replaceHistory: true } : options);
  }

  function updateCrossoverDesign(designId, updater, options = {}) {
    const group = activeCrossoverGroup();
    if (!group) return;
    const nextState = cloneProject(state);
    const nextGroup = mutableCrossoverGroup(nextState, group);
    if (nextGroup) nextGroup.crossover = normalizeGroupCrossover(nextGroup.crossover);
    const design = nextGroup?.crossover?.designs?.find((item) => item.id === designId);
    if (!design) return;
    updater(design);
    commitCrossoverState(nextState, options);
  }
  
  function toggleSignalFilter(filterId) {
    updateSignalFilter(filterId, (filter) => {
      filter.enabled = filter.enabled === false;
    }, { animatePlots: true, renderControls: true });
  }
  
  function toggleSignalFilterAnnotation(filterId) {
    updateSignalFilter(filterId, (filter) => {
      filter.showAnnotation = filter.showAnnotation === false;
    }, { renderControls: true, replaceHistory: true });
  }
  
  function deleteSignalFilter(filterId) {
    const group = activeCrossoverGroup();
    if (!group) return;
    const nextState = cloneProject(state);
    const nextGroup = mutableCrossoverGroup(nextState, group);
    if (!nextGroup) return;
    nextGroup.crossover = normalizeGroupCrossover(nextGroup.crossover);
    nextGroup.crossover.signalFilters = nextGroup.crossover.signalFilters.filter((filter) => filter.id !== filterId);
    commitState(nextState, { animatePlots: true });
  }
  
  function updateSignalFilterFields(filterId, patch, options = {}) {
    updateSignalFilter(filterId, (filter) => {
      Object.assign(filter, patch);
      Object.assign(filter, normalizeSignalFilter(filter));
    }, options.live ? { renderControls: false, replaceHistory: true } : options);
  }
  
  function updateSignalFilter(filterId, updater, options = {}) {
    const group = activeCrossoverGroup();
    if (!group) return;
    const nextState = cloneProject(state);
    const nextGroup = mutableCrossoverGroup(nextState, group);
    if (nextGroup) nextGroup.crossover = normalizeGroupCrossover(nextGroup.crossover);
    const filter = nextGroup?.crossover?.signalFilters?.find((item) => item.id === filterId);
    if (!filter) return;
    updater(filter);
    commitCrossoverState(nextState, options);
  }
  
  function toggleCrossoverTransition(transitionId) {
    updateCrossoverTransition(transitionId, (transition) => {
      transition.enabled = transition.enabled === false;
    }, { animatePlots: true, renderControls: true });
  }
  
  function toggleCrossoverTransitionAnnotation(transitionId) {
    updateCrossoverTransition(transitionId, (transition) => {
      transition.showAnnotation = transition.showAnnotation === false;
    }, { renderControls: true, replaceHistory: true });
  }
  
  function deleteCrossoverTransition(transitionId) {
    const group = activeCrossoverGroup();
    if (!group) return;
    const nextState = cloneProject(state);
    const nextGroup = mutableCrossoverGroup(nextState, group);
    if (!nextGroup) return;
    nextGroup.crossover = normalizeGroupCrossover(nextGroup.crossover);
    nextGroup.crossover.transitions = nextGroup.crossover.transitions.filter((transition) => transition.id !== transitionId);
    commitState(nextState, { animatePlots: true });
  }
  
  function updateCrossoverTransitionFields(transitionId, patch, options = {}) {
    updateCrossoverTransition(transitionId, (transition) => {
      Object.assign(transition, patch);
      transition.frequencyHz = clampCrossoverFrequency(transition.frequencyHz);
      transition.family = CROSSOVER_FAMILIES.includes(transition.family) ? transition.family : "linkwitz-riley";
      transition.order = CROSSOVER_ORDERS.includes(Number(transition.order)) ? Number(transition.order) : 4;
    }, options.live ? { renderControls: false, replaceHistory: true } : options);
  }
  
  function updateCrossoverTransition(transitionId, updater, options = {}) {
    const group = activeCrossoverGroup();
    if (!group) return;
    const nextState = cloneProject(state);
    const nextGroup = mutableCrossoverGroup(nextState, group);
    const transition = nextGroup?.crossover?.transitions?.find((item) => item.id === transitionId);
    if (!transition) return;
    updater(transition);
    commitCrossoverState(nextState, options);
  }
  
  function commitCrossoverState(nextState, options = {}) {
    commitState(nextState, options);
  }

  return {
    addCrossoverDesign,
    addSignalFilter,
    commitCrossoverState,
    crossoverFamilyLabel,
    renderCrossoverControls,
    signalFilterTypeLabel,
    updateSignalFilterAddButton,
  };
}
