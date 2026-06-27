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
    crossoverSliderValueToFrequency,
    crossoverStatus,
    DEFAULT_CROSSOVER_FREQUENCY_HZ,
    designColorForDesign,
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
    SIGNAL_FILTER_DEFAULTS,
    SIGNAL_FILTER_TARGET_GROUP,
    SIGNAL_FILTER_TYPES,
    signalFilterAddButton,
    signalFilterTypeSelect,
    SUBSONIC_PRESETS,
  } = deps;

  let state = getState();
  const crossoverDesignPresetSelections = new Map();
  window.addEventListener("cabio:crossover-filter-list-request", () => renderCrossoverControls());
  window.addEventListener("cabio:crossover-filter-action", handleCrossoverFilterAction);

  function renderCrossoverControls() {
    state = getState();
  
    const groups = crossoverGroups();
    const fallbackGroupId = fallbackCrossoverGroupId();
    if (!groups.some((group) => group.id === getActiveCrossoverGroupId())) {
      setActiveCrossoverGroupId(fallbackGroupId);
    }
  
    const group = activeCrossoverGroup();
    const members = crossoverGroupMembers(group);
    syncCrossoverControls(groups, group, members);
    renderSignalFilters(group, members);
  
    updateSignalFilterAddButton(group, members);
  }

  function syncCrossoverControls(groups, group, members) {
    window.dispatchEvent(new CustomEvent("cabio:crossover-controls-sync", {
      detail: {
        activeGroupId: getActiveCrossoverGroupId(),
        groups: groups.map((item) => ({ id: item.id, name: item.name })),
        members: members.map((design) => ({
          id: design.id,
          name: design.name,
          active: design.id === state.activeDesignId,
          color: designColorForDesign(design),
        })),
        status: crossoverStatusText(group, members),
      },
    }));
  }

  function crossoverStatusText(group, members) {
    if (!group || members.length < 1) return "Add at least one config to edit filters.";
    return "";
  }

  function updateSignalFilterAddButton(group = activeCrossoverGroup(), members = crossoverGroupMembers(group)) {
    if (!signalFilterAddButton) return;
    void members;
    signalFilterAddButton.disabled = !group;
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
  
  function renderSignalFilters(group, members) {
    window.dispatchEvent(new CustomEvent("cabio:crossover-filter-list-sync", {
      detail: group ? {
        filters: (group.crossover?.signalFilters || []).map((filter) => signalFilterSnapshot(filter, members)),
      } : { filters: [] },
    }));
  }

  function crossoverDesignSnapshot(groupId, design, members) {
    const presetOptions = crossoverDesignPresetOptions(members);
    return {
      id: design.id,
      groupId,
      muted: design.enabled === false,
      badge: design.enabled === false ? "Bypassed" : "Schematic",
      presetOptions,
      selectedPresetId: selectedCrossoverDesignPresetId(design.id, presetOptions),
    };
  }

  function crossoverTransitionSnapshot(transition, members) {
    const from = members.find((design) => design.id === transition.fromDesignId);
    const to = members.find((design) => design.id === transition.toDesignId);
    return {
      id: transition.id,
      muted: transition.enabled === false,
      invalid: !from || !to,
      annotationVisible: transition.showAnnotation !== false,
      badge: frequencyLabel(transition.frequencyHz),
      fields: [
        crossoverSelectFieldSnapshot(transition, members, "fromDesignId", "From", "Low-pass config."),
        crossoverSelectFieldSnapshot(transition, members, "toDesignId", "To", "High-pass config."),
        crossoverNumberFieldSnapshot(transition, "frequencyHz", "Freq", "Crossover frequency."),
        crossoverFamilyFieldSnapshot(transition),
        crossoverOrderFieldSnapshot(transition),
      ],
      range: {
        kind: "frequency",
        min: "0",
        max: String(CROSSOVER_SLIDER_STEPS),
        step: "1",
        value: String(crossoverFrequencyToSliderValue(transition.frequencyHz)),
      },
    };
  }

  function signalFilterSnapshot(filter, members) {
    return {
      id: filter.id,
      type: filter.type,
      label: signalFilterTypeLabel(filter.type),
      muted: filter.enabled === false,
      annotationVisible: filter.type === "gain" ? null : filter.showAnnotation !== false,
      badge: signalFilterFrequencyLabel(filter),
      fields: [
        signalFilterTargetFieldSnapshot(filter, members),
        ...signalFilterParameterFieldSnapshots(filter),
      ],
      range: signalFilterRangeSnapshot(filter),
    };
  }

  function crossoverSelectFieldSnapshot(source, members, key, label, tooltip) {
    const options = members.map((design) => ({ value: design.id, label: design.name }));
    return {
      kind: "select",
      key,
      label,
      tooltip,
      value: options.some((option) => option.value === source[key]) ? source[key] : options[0]?.value || "",
      options,
    };
  }

  function crossoverNumberFieldSnapshot(source, key, label, tooltip) {
    return {
      kind: "number",
      key,
      label,
      tooltip,
      min: String(CROSSOVER_FREQUENCY_MIN_HZ),
      max: String(CROSSOVER_FREQUENCY_MAX_HZ),
      step: "1",
      value: String(roundTo(clampCrossoverFrequency(source[key]), 1)),
    };
  }

  function crossoverFamilyFieldSnapshot(source) {
    return {
      kind: "select",
      key: "family",
      label: "Family",
      tooltip: "Filter family.",
      value: CROSSOVER_FAMILIES.includes(source.family) ? source.family : "linkwitz-riley",
      options: [
        { value: "linkwitz-riley", label: "Linkwitz-Riley" },
        { value: "butterworth", label: "Butterworth" },
      ],
    };
  }

  function crossoverOrderFieldSnapshot(source) {
    return {
      kind: "select",
      key: "order",
      label: "Order",
      tooltip: "Filter slope.",
      value: String(CROSSOVER_ORDERS.includes(Number(source.order)) ? Number(source.order) : 4),
      options: [
        { value: "2", label: "2nd" },
        { value: "4", label: "4th" },
      ],
    };
  }

  function signalFilterTargetFieldSnapshot(filter, members) {
    const options = [
      { value: SIGNAL_FILTER_TARGET_GROUP, label: "Group" },
      ...members.map((design) => ({ value: `design:${design.id}`, label: `Config: ${design.name}` })),
      ...uniqueDriverGroupsForMembers(members).map((group) => ({ value: `driverGroup:${group.id}`, label: `Driver: ${group.name}` })),
    ];
    return {
      kind: "select",
      key: "target",
      label: "Target",
      tooltip: "Choose whether this filter applies to the whole group, one config, or configs using a driver group.",
      value: options.some((option) => option.value === filter.target) ? filter.target : SIGNAL_FILTER_TARGET_GROUP,
      options,
    };
  }

  function signalFilterParameterFieldSnapshots(filter) {
    if (filter.type === "gain") {
      return [
        signalFilterNumberFieldSnapshot(filter, "gainDb", "Gain", "Output gain in dB.", { min: -24, max: 24, step: 0.1 }),
      ];
    }
    if (filter.type === "linkwitz-transform") {
      return [
        signalFilterNumberFieldSnapshot(filter, "sourceFrequencyHz", "Src Hz", "Current system resonance frequency.", { min: 1, max: CROSSOVER_FREQUENCY_MAX_HZ, step: 1 }),
        signalFilterNumberFieldSnapshot(filter, "sourceQ", "Src Q", "Current system Q.", { min: 0.1, max: 4, step: 0.01 }),
        signalFilterNumberFieldSnapshot(filter, "targetFrequencyHz", "Target Hz", "Target resonance frequency after Linkwitz Transform.", { min: 1, max: CROSSOVER_FREQUENCY_MAX_HZ, step: 1 }),
        signalFilterNumberFieldSnapshot(filter, "targetQ", "Target Q", "Target system Q after Linkwitz Transform.", { min: 0.1, max: 4, step: 0.01 }),
      ];
    }
    const fields = [
      signalFilterNumberFieldSnapshot(filter, "frequencyHz", "Freq", "Filter frequency.", { min: CROSSOVER_FREQUENCY_MIN_HZ, max: CROSSOVER_FREQUENCY_MAX_HZ, step: 1 }),
    ];
    if (filter.type === "parametric") {
      fields.push(
        signalFilterNumberFieldSnapshot(filter, "gainDb", "Gain", "Filter gain in dB.", { min: -24, max: 24, step: 0.1 }),
        signalFilterNumberFieldSnapshot(filter, "q", "Q", "Filter Q / bandwidth.", { min: 0.1, max: 20, step: 0.01 }),
      );
    }
    if (filter.type === "lowpass" || filter.type === "highpass") fields.push(signalFilterFamilyFieldSnapshot(filter), signalFilterOrderFieldSnapshot(filter));
    if (filter.type === "subsonic") fields.unshift(signalFilterSubsonicPresetFieldSnapshot(filter));
    if (filter.type === "subsonic") fields.push(signalFilterFamilyFieldSnapshot(filter), signalFilterOrderFieldSnapshot(filter));
    return fields;
  }

  function signalFilterSubsonicPresetFieldSnapshot(filter) {
    return {
      kind: "select",
      key: "preset",
      label: "Preset",
      tooltip: "Choose a subsonic / rumble protection preset.",
      value: Object.hasOwn(SUBSONIC_PRESETS, filter.preset) ? filter.preset : "custom",
      options: Object.entries(SUBSONIC_PRESETS).map(([value, preset]) => ({ value, label: preset.label })),
    };
  }

  function signalFilterNumberFieldSnapshot(filter, key, label, tooltip, options = {}) {
    return {
      kind: "number",
      key,
      label,
      tooltip,
      min: String(options.min ?? ""),
      max: String(options.max ?? ""),
      step: String(options.step ?? 1),
      value: String(roundTo(Number(filter[key]) || 0, Number(options.step) < 1 ? 2 : 1)),
    };
  }

  function signalFilterFamilyFieldSnapshot(filter) {
    return {
      kind: "select",
      key: "family",
      label: "Family",
      tooltip: filter.type === "subsonic" ? "Subsonic high-pass family." : "Filter response family.",
      value: CROSSOVER_FAMILIES.includes(filter.family) ? filter.family : "butterworth",
      options: [
        { value: "butterworth", label: "Butterworth" },
        { value: "linkwitz-riley", label: "Linkwitz-Riley" },
      ],
    };
  }

  function signalFilterOrderFieldSnapshot(filter) {
    return {
      kind: "select",
      key: "order",
      label: "Order",
      tooltip: filter.type === "subsonic" ? "Subsonic filter slope." : "Filter slope.",
      value: String(CROSSOVER_ORDERS.includes(Number(filter.order)) ? Number(filter.order) : 4),
      options: [
        { value: "2", label: "2nd" },
        { value: "4", label: "4th" },
      ],
    };
  }

  function signalFilterRangeSnapshot(filter) {
    if (filter.type === "gain") {
      return {
        kind: "gain",
        field: "gainDb",
        min: "-24",
        max: "24",
        step: "0.1",
        value: String(Number(filter.gainDb) || 0),
        ariaLabel: "Gain level slider",
        tooltip: "Adjust this gain filter level live.",
      };
    }
    if (!["parametric", "lowpass", "highpass", "subsonic"].includes(filter.type)) return null;
    return {
      kind: "frequency",
      field: "frequencyHz",
      min: "0",
      max: String(CROSSOVER_SLIDER_STEPS),
      step: "1",
      value: String(crossoverFrequencyToSliderValue(filter.frequencyHz)),
      ariaLabel: "Signal filter frequency slider",
      tooltip: "Adjust this filter frequency live on a logarithmic scale.",
    };
  }

  function handleCrossoverFilterAction(event) {
    const detail = event.detail || {};
    if (detail.action === "set-design-preset") {
      setCrossoverDesignPresetSelection(detail.designId, detail.presetId);
      return;
    }
    if (detail.action === "apply-design-preset") {
      setCrossoverDesignPresetSelection(detail.designId, detail.presetId);
      applyCrossoverDesignPreset(detail.groupId, detail.designId, detail.presetId);
      return;
    }
    if (detail.action === "toggle-design") return toggleCrossoverDesign(detail.designId);
    if (detail.action === "delete-design") return deleteCrossoverDesign(detail.designId);
    if (detail.action === "toggle-transition") return toggleCrossoverTransition(detail.transitionId);
    if (detail.action === "delete-transition") return deleteCrossoverTransition(detail.transitionId);
    if (detail.action === "toggle-transition-annotation") return toggleCrossoverTransitionAnnotation(detail.transitionId);
    if (detail.action === "toggle-filter") return toggleSignalFilter(detail.filterId);
    if (detail.action === "delete-filter") return deleteSignalFilter(detail.filterId);
    if (detail.action === "toggle-filter-annotation") return toggleSignalFilterAnnotation(detail.filterId);
    if (detail.action === "update-field") return updateCrossoverFilterField(detail);
    if (detail.action === "update-range") return updateCrossoverFilterRange(detail);
  }

  function updateCrossoverFilterField(detail) {
    if (detail.ownerType === "transition") {
      const patch = crossoverTransitionFieldPatch(detail);
      if (patch) updateCrossoverTransitionFields(detail.ownerId, patch, detail.live ? { live: true } : { animatePlots: true, renderControls: true });
      return;
    }
    if (detail.ownerType === "filter") {
      const patch = signalFilterFieldPatch(detail.ownerId, detail.field, detail.value);
      if (patch) updateSignalFilterFields(detail.ownerId, patch, detail.live ? { live: true } : { animatePlots: true, renderControls: true });
    }
  }

  function updateCrossoverFilterRange(detail) {
    if (detail.ownerType === "transition") {
      const value = crossoverSliderValueToFrequency(detail.value);
      updateCrossoverTransitionFields(detail.ownerId, { frequencyHz: value }, { live: true });
      return;
    }
    const group = activeCrossoverGroup();
    const filter = group?.crossover?.signalFilters?.find((item) => item.id === detail.ownerId);
    if (!filter) return;
    if (filter.type === "gain") {
      updateSignalFilterFields(detail.ownerId, { gainDb: Number(detail.value) || 0 }, { live: true });
      return;
    }
    updateSignalFilterFields(detail.ownerId, {
      frequencyHz: crossoverSliderValueToFrequency(detail.value),
      ...(filter.type === "subsonic" ? { preset: "custom" } : {}),
    }, { live: true });
  }

  function crossoverTransitionFieldPatch(detail) {
    if (!detail.ownerId || !detail.field) return null;
    if (detail.field === "frequencyHz") {
      const parsed = parseNumericInputValue(detail.value);
      if (!Number.isFinite(parsed)) return null;
      return { frequencyHz: clampCrossoverFrequency(parsed) };
    }
    if (detail.field === "family") return { family: detail.value };
    if (detail.field === "order") return { order: Number(detail.value) };
    if (detail.field !== "fromDesignId" && detail.field !== "toDesignId") return null;
    const group = activeCrossoverGroup();
    const members = crossoverGroupMembers(group);
    const transition = group?.crossover?.transitions?.find((item) => item.id === detail.ownerId);
    if (!transition) return null;
    const patch = { [detail.field]: detail.value };
    const otherKey = detail.field === "fromDesignId" ? "toDesignId" : "fromDesignId";
    if (patch[detail.field] === transition[otherKey]) {
      const replacement = members.find((design) => design.id !== patch[detail.field]);
      if (replacement) patch[otherKey] = replacement.id;
    }
    return patch;
  }

  function signalFilterFieldPatch(filterId, field, value) {
    if (!filterId || !field) return null;
    const group = activeCrossoverGroup();
    const filter = group?.crossover?.signalFilters?.find((item) => item.id === filterId);
    if (!filter) return null;
    if (field === "target" || field === "family") {
      return { [field]: value, ...(filter.type === "subsonic" && field === "family" ? { preset: "custom" } : {}) };
    }
    if (field === "order") return { order: Number(value), ...(filter.type === "subsonic" ? { preset: "custom" } : {}) };
    if (field === "preset") {
      const preset = SUBSONIC_PRESETS[value] || SUBSONIC_PRESETS.custom;
      return {
        preset: value,
        ...(Number.isFinite(preset.frequencyHz) ? { frequencyHz: preset.frequencyHz } : {}),
        ...(preset.family ? { family: preset.family } : {}),
        ...(Number.isFinite(preset.order) ? { order: preset.order } : {}),
      };
    }
    const parsed = parseNumericInputValue(value);
    if (!Number.isFinite(parsed)) return null;
    return { [field]: parsed, ...(filter.type === "subsonic" && field === "frequencyHz" ? { preset: "custom" } : {}) };
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
