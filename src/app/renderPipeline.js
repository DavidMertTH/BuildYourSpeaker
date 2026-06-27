import { UNGROUPED_CROSSOVER_GROUP_ID } from "./constants.js";
import { isHfDriver, simulateHfDriverResponse } from "./hfDriverSimulation.js";

export function createRenderPipeline(deps) {
  const {
    applyMobilePanelVisibility,
    applyPlotView,
    autoRange,
    clampCrossoverFrequency,
    cloneProject,
    compactMeasurementSeriesName,
    completeBox,
    commitCrossoverState,
    CROSSOVER_FAMILIES,
    CROSSOVER_ORDERS,
    crossoverFamilyLabel,
    defaultMeasurementTarget,
    designColor,
    designColorForDesign,
    designColorIndex,
    drawBoxPreview,
    drawPlot,
    drawPolarPlot,
    excursionLimitedSpl,
    excursionLimitedValues,
    filterChainResponse,
    formatMeasurementAngleCompact,
    frequencies,
    fullMeasurementName,
    getActiveDesign,
    getState,
    getThemeColors,
    hydrateDerivedFields,
    hydratePortLockButtons,
    hydrateRangeFields,
    hydrateRecordingControls,
    interpolatePlotSeriesValue,
    maxExcursionRatio,
    modeButtons,
    nearestFrequencyValue,
    normalizeGroupCrossover,
    normalizeSignalFilter,
    normalizeSignalFilterTarget,
    positiveMagnitudeRange,
    projectJson,
    readableTextColor,
    recommendedLowFrequencyLimit,
    renderCrossoverSchematic,
    renderDriverSummaryPanel,
    renderDriverHealthPanel,
    renderMeasurementControls,
    roundTo,
    selectMatchingDriver,
    selectMatchingPassiveRadiator,
    shortMeasurementName,
    signalFilterTypeLabel,
    SIGNAL_FILTER_TARGET_GROUP,
    simulateBandpass,
    simulateDesignDriver,
    simulatePassiveRadiator,
    simulateSealed,
    simulateVented,
    UNGROUPED_CONFIG_GROUP_ID,
    updatePanelToggleState,
    updatePillIndicatorsSoon,
    updatePlotControlValues,
    updatePlotFitLayout,
    validateDriver,
    validateEnclosureOptions,
  } = deps;

  let state = getState();

  function render(options = {}) {
    state = getState();
    document.body.dataset.mode = state.mode;
    document.body.dataset.plannerAlignment = state.mode;
    const completedBox = completeBox(state.box);
    document.body.dataset.bandpassOrder = String(completedBox.bandpass.order);
    document.body.dataset.portShape = completedBox.portShape;
    modeButtons.forEach((button) => button.classList.toggle("active", button.dataset.mode === state.mode));
    window.dispatchEvent(new CustomEvent("cabio:box-mode-sync", { detail: { mode: state.mode } }));
  
    const activeDesign = getActiveDesign();
    applyActiveConfigAccent(activeDesign);
    const rawDesignSimulations = state.designs.map((design) => simulateDesignRaw(design, designColorIndex(design.id)));
    const allDesignSimulations = applyCrossoverRoutingToSimulations(rawDesignSimulations);
    const memberSimulations = allDesignSimulations.filter((simulation) => shouldShowDesignMember(simulation.design));
    const groupSimulations = buildConfigGroupSimulations(allDesignSimulations);
    const designSimulations = [...memberSimulations, ...groupSimulations];
    const activeSimulation = activeDesign
      ? allDesignSimulations.find((simulation) => simulation.design.id === activeDesign.id) || finalizeDesignSimulation(simulateDesignRaw(activeDesign, designColorIndex(activeDesign.id)))
      : finalizeDesignSimulation(simulateDesignRaw(currentProjectDraftDesign(), 0));
    const warnings = [
      ...(isHfDriver(activeSimulation.driver) ? [] : validateDriver(activeSimulation.driver)),
      ...activeSimulation.warnings,
    ];
  
    const animatePlots = Boolean(options.animatePlots);
    updatePlotFitLayout();
    renderMetrics(activeSimulation.driver, activeSimulation, warnings);
    renderPlots(designSimulations, activeSimulation, { animate: animatePlots });
    drawBoxPreview(document.querySelector("#boxPreview"), state);
    projectJson.value = JSON.stringify(state, null, 2);
    hydrateDerivedFields();
    hydrateRangeFields();
    renderDriverSummaryPanel();
    renderDriverHealthPanel();
    hydrateRecordingControls();
    renderMeasurementControls();
    renderCrossoverSchematic();
    hydratePortLockButtons();
    selectMatchingDriver();
    selectMatchingPassiveRadiator();
    applyMobilePanelVisibility();
    updatePanelToggleState();
    updatePillIndicatorsSoon();
  }
  
  function applyActiveConfigAccent(design) {
    const root = document.documentElement;
    const color = design ? designColorForDesign(design) : designColor(0);
    root.style.setProperty("--accent", color);
    root.style.setProperty("--accent-text", readableTextColor(color));
  }

  function currentProjectDraftDesign() {
    return {
      id: "__draft__",
      name: "Current settings",
      groupId: state.configGroups[0]?.id || UNGROUPED_CONFIG_GROUP_ID,
      mode: state.mode,
      visible: false,
      graphVisible: false,
      driver: cloneProject(state.driver),
      box: cloneProject(state.box),
    };
  }
  
  function shouldShowDesignMember(design) {
    if (design.visible === false) return false;
    if (design.graphVisible === false) return false;
    return true;
  }
  
  function isConfigGroupCombinedRendered(group) {
    state = getState();
    if (group.showCombined !== true) return false;
    return state.designs.some((design) => design.visible !== false && design.groupId === group.id);
  }
  
  function configGroupCombinedColorIndex(groupIndex) {
    state = getState();
    return state.designs.length + groupIndex;
  }
  
  function configGroupForDesign(design) {
    return state.configGroups.find((group) => group.id === design.groupId) || state.configGroups[0];
  }

  function crossoverGroups() {
    return [
      ...state.configGroups,
      ungroupedCrossoverGroup(),
    ];
  }

  function ungroupedCrossoverGroup() {
    return {
      id: UNGROUPED_CROSSOVER_GROUP_ID,
      name: "No group",
      showCombined: true,
      crossover: normalizeGroupCrossover(state.ungroupedCrossover),
      isUngrouped: true,
    };
  }

  function crossoverGroupForDesign(design) {
    if (!design.groupId) return ungroupedCrossoverGroup();
    return state.configGroups.find((group) => group.id === design.groupId);
  }

  function crossoverGroupMemberId(group) {
    return group?.isUngrouped || group?.id === UNGROUPED_CROSSOVER_GROUP_ID
      ? UNGROUPED_CONFIG_GROUP_ID
      : group?.id || UNGROUPED_CONFIG_GROUP_ID;
  }

  function mutableCrossoverGroup(project, groupId) {
    if (groupId === UNGROUPED_CROSSOVER_GROUP_ID) {
      project.ungroupedCrossover = normalizeGroupCrossover(project.ungroupedCrossover);
      return {
        get crossover() {
          return project.ungroupedCrossover;
        },
        set crossover(value) {
          project.ungroupedCrossover = value;
        },
      };
    }
    return project.configGroups.find((item) => item.id === groupId);
  }
  
  function buildConfigGroupSimulations(simulations) {
    return state.configGroups
      .map((group, index) => {
        if (group.showCombined !== true) return null;
        const members = simulations.filter((simulation) => simulation.design.visible !== false && simulation.design.groupId === group.id);
        if (members.length === 0) return null;
        return combineConfigGroupSimulation(group, members, configGroupCombinedColorIndex(index));
      })
      .filter(Boolean);
  }
  
  function combineConfigGroupSimulation(group, simulations, colorIndex) {
    const combinedResponse = combineSplPhaseResponses(simulations.map((simulation) => ({
      ...simulation.active,
      spl: splValuesForSimulation(simulation),
    })));
    const reference = simulations[0];
    return {
      design: {
        id: `combined-${group.id}`,
        name: `${group.name} combined`,
        mode: "combined",
      },
      groupCombined: true,
      box: reference.box,
      driver: reference.driver,
      colorIndex,
      active: {
        ...reference.active,
        spl: combinedResponse.spl,
        phaseDeg: combinedResponse.phaseDeg,
        groupDelayMs: combinedResponse.groupDelayMs,
      },
      warnings: [],
    };
  }
  
  function combineSplPhaseResponses(responses) {
    const spl = [];
    const phase = [];
    frequencies.forEach((frequency, index) => {
      void frequency;
      let re = 0;
      let im = 0;
      responses.forEach((response) => {
        const level = Number(response.spl?.[index]);
        const phaseDeg = Number(response.phaseDeg?.[index]);
        if (!Number.isFinite(level) || !Number.isFinite(phaseDeg)) return;
        const amplitude = 10 ** (level / 20);
        const radians = (phaseDeg * Math.PI) / 180;
        re += amplitude * Math.cos(radians);
        im += amplitude * Math.sin(radians);
      });
      const magnitude = Math.max(Math.hypot(re, im), 1e-12);
      spl.push(20 * Math.log10(magnitude));
      phase.push(Math.atan2(im, re));
    });
    const unwrappedPhase = unwrapRadians(phase);
    return {
      spl,
      phaseDeg: unwrappedPhase.map((value) => (value * 180) / Math.PI),
      groupDelayMs: groupDelayFromPhaseRadians(unwrappedPhase),
    };
  }
  
  function groupDelayFromPhaseRadians(phaseRadians) {
    return frequencies.map((frequency, index) => {
      void frequency;
      if (index === 0 || index === frequencies.length - 1) return 0;
      const phaseDelta = phaseRadians[index + 1] - phaseRadians[index - 1];
      const omegaDelta = 2 * Math.PI * (frequencies[index + 1] - frequencies[index - 1]);
      const delayMs = (-phaseDelta / omegaDelta) * 1000;
      return Number.isFinite(delayMs) ? delayMs : 0;
    });
  }
  
  function unwrapRadians(phases) {
    if (phases.length === 0) return [];
    const output = [phases[0]];
    let offset = 0;
    for (let index = 1; index < phases.length; index += 1) {
      const delta = phases[index] - phases[index - 1];
      if (delta > Math.PI) offset -= 2 * Math.PI;
      if (delta < -Math.PI) offset += 2 * Math.PI;
      output.push(phases[index] + offset);
    }
    return output;
  }
  
  function crossoverFiltersForDesign(design) {
    const group = crossoverGroupForDesign(design);
    const signalFilters = group?.crossover?.signalFilters || [];
    const filters = [];
    signalFilters.forEach((filter) => {
      if (filter.enabled === false || !signalFilterAppliesToDesign(filter, design)) return;
      filters.push({ ...filter });
    });
    return filters;
  }
  
  function signalFilterAppliesToDesign(filter, design) {
    const target = normalizeSignalFilterTarget(filter.target);
    if (target === SIGNAL_FILTER_TARGET_GROUP) return true;
    if (target.startsWith("design:")) return target.slice("design:".length) === design.id;
    return true;
  }
  
  function applyCrossoverToSimulation(active, filters) {
    if (!filters.length) return active;
    const responses = frequencies.map((frequency) => filterChainResponse(frequency, filters));
    return applyComplexResponseToSimulation(active, responses, { crossoverFilters: cloneProject(filters) });
  }

  function applyComplexResponseToSimulation(active, responses, patch = {}) {
    if (!Array.isArray(responses) || !responses.length) return active;
    const next = {
      ...active,
      spl: [...active.spl],
      excursionMm: [...active.excursionMm],
      phaseDeg: [...active.phaseDeg],
      groupDelayMs: [...active.groupDelayMs],
      ...patch,
    };
    const filteredPhase = [];
  
    frequencies.forEach((frequency, index) => {
      void frequency;
      const response = responses[index];
      if (!response?.abs || !response?.phase) {
        filteredPhase.push(((Number(active.phaseDeg?.[index]) || 0) * Math.PI) / 180);
        return;
      }
      const magnitude = Math.max(response.abs(), 1e-12);
      const dbOffset = 20 * Math.log10(magnitude);
      next.spl[index] = active.spl[index] + dbOffset;
      next.excursionMm[index] = active.excursionMm[index] * magnitude;
  
      ["portVelocity", "passiveRadiatorExcursionMm", "passiveRadiatorVelocity"].forEach((key) => {
        if (Array.isArray(active[key])) {
          if (!Array.isArray(next[key])) next[key] = [...active[key]];
          next[key][index] = active[key][index] * magnitude;
        }
      });
  
      ["driverSpl", "portSpl"].forEach((key) => {
        if (Array.isArray(active[key])) {
          if (!Array.isArray(next[key])) next[key] = [...active[key]];
          next[key][index] = active[key][index] + dbOffset;
        }
      });
  
      const acousticPhase = Number(active.phaseDeg?.[index]) || 0;
      filteredPhase.push((acousticPhase * Math.PI) / 180 + response.phase());
    });
  
    const unwrapped = unwrapRadians(filteredPhase);
    next.phaseDeg = unwrapped.map((value) => (value * 180) / Math.PI);
    next.groupDelayMs = groupDelayFromPhaseRadians(unwrapped);
    return next;
  }

  function applyCrossoverRoutingToSimulations(simulations) {
    return simulations.map((simulation) => {
      const active = applyCrossoverToSimulation(simulation.active, crossoverFiltersForDesign(simulation.design));
      return {
        ...simulation,
        active,
        warnings: designWarnings(simulation.design.mode, simulation.box, active, simulation.driver),
      };
    });
  }
  
  function simulateDesignRaw(design, colorIndex = 0) {
    const box = completeBox(design.box);
    const simulationDriver = simulateDesignDriver(design, box);
    if (isHfDriver(simulationDriver)) {
      const active = simulateHfDriverResponse(simulationDriver, frequencies);
      return {
        design,
        box,
        driver: simulationDriver,
        colorIndex: Math.max(colorIndex, 0),
        sealed: active,
        active,
        warnings: [],
        hfDriver: true,
      };
    }
    const sealed = simulateSealed(simulationDriver, box, frequencies);
    const rawActive =
      design.mode === "vented"
        ? simulateVented(simulationDriver, box, frequencies)
        : design.mode === "passive"
          ? simulatePassiveRadiator(simulationDriver, box, frequencies)
          : design.mode === "bandpass"
            ? simulateBandpass(simulationDriver, box, frequencies)
            : sealed;
    return {
      design,
      box,
      driver: simulationDriver,
      colorIndex: Math.max(colorIndex, 0),
      sealed,
      active: rawActive,
      warnings: [],
    };
  }

  function finalizeDesignSimulation(simulation) {
    return applyCrossoverRoutingToSimulations([simulation])[0] || simulation;
  }
  
  function designWarnings(mode, box, active, driver) {
    if (isHfDriver(driver) || active?.kind === "hf-driver") return [];
    const warnings = validateEnclosureOptions(box, mode);
    const maxExcursion = Math.max(...active.excursionMm);
    const excursionRatio = maxExcursionRatio(active.excursionMm, driver.xmax * 1000);
    const lowFrequencyLimit = recommendedLowFrequencyLimit(driver);
    if (maxExcursion > driver.xmax * 1000) {
      warnings.push(`Xmax exceeded: ${maxExcursion.toFixed(1)} mm`);
    }
    if (excursionRatio > 2) {
      warnings.push(`Bass output is excursion-limited (${excursionRatio.toFixed(1)}x Xmax)`);
    }
    if (lowFrequencyLimit > 200) {
      warnings.push(`Driver usable from ${lowFrequencyLimit.toFixed(0)} Hz`);
    }
    if (mode === "vented") {
      const maxPort = Math.max(...active.portVelocity);
      const maxPortVelocity = state.inventory?.constraints?.maxPortVelocityMs || 20;
      if (maxPort > maxPortVelocity) warnings.push(`High port velocity: ${maxPort.toFixed(1)} m/s`);
      if (active.port.physicalLength <= 0) warnings.push("Port diameter too large for selected port tuning");
    }
    if (mode === "bandpass") {
      const maxFrontPort = Math.max(...active.portVelocity);
      const maxRearPort = Math.max(...(active.rearPortVelocity || [0]));
      const maxPort = Math.max(maxFrontPort, maxRearPort);
      const maxPortVelocity = state.inventory?.constraints?.maxPortVelocityMs || 20;
      if (maxPort > maxPortVelocity) warnings.push(`High bandpass port velocity: ${maxPort.toFixed(1)} m/s`);
      if (active.bandpass.frontPort.physicalLength <= 0) warnings.push("Front port diameter too large for selected bandpass tuning");
      if (box.bandpass.order === 6 && active.bandpass.rearPort.physicalLength <= 0) warnings.push("Rear port diameter too large for selected bandpass tuning");
    }
    if (mode === "passive") {
      const maxPassiveExcursion = Math.max(...active.passiveRadiatorExcursionMm);
      if (maxPassiveExcursion > box.passiveRadiator.xmaxMm) {
        warnings.push(`PR Xmax exceeded: ${maxPassiveExcursion.toFixed(1)} mm`);
      }
    }
    return warnings;
  }
  
  function renderMetrics() {}
  
  function renderPlots(simulations, activeSimulation, options = {}) {
    const colors = getThemeColors();
    const xMin = frequencies[0];
    const xMax = frequencies[frequencies.length - 1];
    const xmaxMm = isHfDriver(activeSimulation.driver) ? NaN : activeSimulation.driver.xmax * 1000;
    const portVelocityLimit = positiveOrNull(state.inventory?.constraints?.maxPortVelocityMs) ?? 20;
    const passiveRadiatorLimit = positiveOrNull(activeSimulation.box.passiveRadiator?.xmaxMm);
    const physicalSimulations = simulations.filter((simulation) => !simulation.groupCombined);
    const measurementResponses = visibleFrequencyResponses();
    const splSeries = simulations.map((simulation) => designSeries(simulation, splValuesForSimulation(simulation), colors));
    const onAxisResponseSeries = [
      ...measurementResponses
        .filter((response) => Math.abs(Number(response.angleDeg) || 0) < 0.001)
        .map((response, index) => frequencyResponseSeries(response, colors, index)),
    ];
    const offAxisReferenceResponses = measurementResponses
      .filter((response) => Math.abs(Number(response.angleDeg) || 0) < 0.001);
    const offAxisAngledResponses = measurementResponses
      .filter((response) => Math.abs(Number(response.angleDeg) || 0) >= 0.001);
    const offAxisResponseSeries = [
      ...offAxisReferenceResponses.map((response, index) => ({
        ...frequencyResponseSeries(response, colors, index),
        width: 2.6,
        opacity: 0.96,
      })),
      ...offAxisAngledResponses.map((response, index) => frequencyResponseSeries(response, colors, index + offAxisReferenceResponses.length)),
    ];
    const horizontalPolarSeries = measurementPolarSeries(measurementResponses, colors, "horizontal");
    const impedanceSeries = physicalSimulations.map((simulation) => designSeries(simulation, simulation.active.impedance, colors));
    const excursionSeries = [
      ...physicalSimulations
        .filter((simulation) => !isHfDriver(simulation.driver))
        .map((simulation) => designSeries(simulation, simulation.active.excursionMm, colors)),
    ];
    if (Number.isFinite(xmaxMm) && xmaxMm > 0) {
      excursionSeries.push({ name: "Xmax", x: frequencies, values: frequencies.map(() => xmaxMm), color: colors.text, width: 1 });
    }
    const portSeries = physicalSimulations
      .map((simulation) => {
        if (!isHfDriver(simulation.driver) && (simulation.design.mode === "vented" || simulation.design.mode === "bandpass")) return designSeries(simulation, portVelocityValuesForSimulation(simulation), colors);
        return null;
      })
      .filter(Boolean);
    const prExcursionSeries = physicalSimulations
      .map((simulation) => {
        if (!isHfDriver(simulation.driver) && simulation.design.mode === "passive") return designSeries(simulation, simulation.active.passiveRadiatorExcursionMm, colors);
        return null;
      })
      .filter(Boolean);
    const phaseSeries = simulations.map((simulation) => designSeries(simulation, simulation.active.phaseDeg, colors));
    const groupDelaySeries = simulations.map((simulation) => designSeries(simulation, simulation.active.groupDelayMs, colors));
    const portValues = portSeries.flatMap((series) => series.values);
    const prExcursionValues = prExcursionSeries.flatMap((series) => series.values);
    const excursionLimitAnnotations = limitAnnotationsForValues(excursionSeries.flatMap((series) => series.name === "Xmax" ? [] : series.values), xmaxMm, {
      color: colors.danger,
      label: `Xmax ${formatLimitValue(xmaxMm)} mm`,
      detail: "Cone excursion limit",
      unit: "mm",
    });
    const portLimitAnnotations = limitAnnotationsForValues(portValues, portVelocityLimit, {
      color: colors.danger,
      label: `${formatLimitValue(portVelocityLimit)} m/s`,
      detail: "Port velocity limit",
      unit: "m/s",
    });
    const passiveRadiatorLimitAnnotations = limitAnnotationsForValues(prExcursionValues, passiveRadiatorLimit, {
      color: colors.danger,
      label: `PR Xmax ${formatLimitValue(passiveRadiatorLimit)} mm`,
      detail: "Passive radiator limit",
      unit: "mm",
    });
    const splRange = autoRange(splSeries.flatMap((series) => series.values));
    const onAxisResponseRange = autoRange(onAxisResponseSeries.flatMap((series) => series.values));
    const offAxisResponseRange = autoRange(offAxisResponseSeries.flatMap((series) => series.values));
    const impedanceRange = positiveMagnitudeRange(impedanceSeries.flatMap((series) => series.values), { fallbackMax: 16, minFloor: 0.1 });
    const excursionRange = positiveMagnitudeRange(excursionSeries.flatMap((series) => series.values), {
      fallbackMax: Math.max(3, xmaxMm * 1.25),
      minFloor: 0.001,
    });
    const portRange = positiveMagnitudeRange(portValues, { fallbackMax: 3, minFloor: 0.01 });
    const prExcursionRange = positiveMagnitudeRange(prExcursionValues, { fallbackMax: 3, minFloor: 0.001 });
    const phaseRange = autoRange(phaseSeries.flatMap((series) => series.values));
    const groupDelayRange = autoRange(groupDelaySeries.flatMap((series) => series.values).filter((value) => Number.isFinite(value)));
    const splCrossoverAnnotations = crossoverAnnotationsForPlot(physicalSimulations, "spl");
    const phaseCrossoverAnnotations = crossoverAnnotationsForPlot(physicalSimulations, "phase");
  
    const plotOptions = { animate: Boolean(options.animate) };
  
    drawPlot(document.querySelector("#splPlot"), applyPlotView("splPlot", {
      title: "SPL at 1 m",
      yLabel: "dB SPL",
      xMin,
      xMax,
      yMin: 0,
      yMax: Math.max(splRange[1], 1),
      forceYMinZero: true,
      annotations: splCrossoverAnnotations,
      onAnnotationDrag: handleFilterAnnotationDrag,
      series: splSeries,
    }), plotOptions);
  
    drawPlot(document.querySelector("#onAxisResponsePlot"), applyPlotView("onAxisResponsePlot", {
      title: "On-axis response",
      yLabel: "dB SPL",
      xMin,
      xMax,
      yMin: onAxisResponseRange[0],
      yMax: onAxisResponseRange[1],
      emptyMessage: "No on-axis measurement imported yet.",
      series: onAxisResponseSeries,
    }), plotOptions);
  
    drawPlot(document.querySelector("#offAxisResponsePlot"), applyPlotView("offAxisResponsePlot", {
      title: "Off-axis response",
      yLabel: "dB SPL",
      xMin,
      xMax,
      yMin: offAxisResponseRange[0],
      yMax: offAxisResponseRange[1],
      emptyMessage: "No off-axis measurement imported yet.",
      series: offAxisResponseSeries,
    }), plotOptions);
    updateOffAxisResponseLegend(offAxisResponseSeries);
  
    drawPlot(document.querySelector("#impedancePlot"), applyPlotView("impedancePlot", {
      title: "Input impedance",
      yLabel: "ohm",
      xMin,
      xMax,
      yMin: impedanceRange.yMin,
      yMax: impedanceRange.yMax,
      yScale: impedanceRange.yScale,
      series: impedanceSeries,
    }), plotOptions);
  
    drawPlot(document.querySelector("#excursionPlot"), applyPlotView("excursionPlot", {
      title: "Cone excursion",
      yLabel: "mm",
      xMin,
      xMax,
      yMin: excursionRange.yMin,
      yMax: excursionRange.yMax,
      yScale: excursionRange.yScale,
      annotations: excursionLimitAnnotations,
      series: excursionSeries,
    }), plotOptions);
  
    drawPlot(document.querySelector("#portPlot"), applyPlotView("portPlot", {
      title: "Linear port velocity",
      yLabel: "m/s",
      xMin,
      xMax,
      yMin: portRange.yMin,
      yMax: portRange.yMax,
      yScale: portRange.yScale,
      annotations: portLimitAnnotations,
      emptyMessage: "Port velocity is only available for vented or bandpass boxes.",
      series: portSeries,
    }), plotOptions);
  
    drawPlot(document.querySelector("#prExcursionPlot"), applyPlotView("prExcursionPlot", {
      title: "Passive radiator excursion",
      yLabel: "mm",
      xMin,
      xMax,
      yMin: prExcursionRange.yMin,
      yMax: prExcursionRange.yMax,
      yScale: prExcursionRange.yScale,
      annotations: passiveRadiatorLimitAnnotations,
      emptyMessage: "PR excursion is only available for passive radiator boxes.",
      series: prExcursionSeries,
    }), plotOptions);
  
    drawPlot(document.querySelector("#phasePlot"), applyPlotView("phasePlot", {
      title: "Phase",
      yLabel: "deg",
      xMin,
      xMax,
      yMin: phaseRange[0],
      yMax: phaseRange[1],
      annotations: phaseCrossoverAnnotations,
      onAnnotationDrag: handleFilterAnnotationDrag,
      series: phaseSeries,
    }), plotOptions);
  
    drawPlot(document.querySelector("#groupDelayPlot"), applyPlotView("groupDelayPlot", {
      title: "Group delay",
      yLabel: "ms",
      xMin,
      xMax,
      yMin: groupDelayRange[0],
      yMax: groupDelayRange[1],
      series: groupDelaySeries,
    }), plotOptions);
  
    drawPolarPlot(document.querySelector("#horizontalPolarPlot"), {
      title: "Horizontal polar",
      minDb: -30,
      maxDb: 0,
      emptyMessage: "Need at least two horizontal angles in one measurement group.",
      series: horizontalPolarSeries,
    });
  
    updatePlotControlValues();
  
    const fbValue = activeSimulation.design.mode === "vented" ? nearestFrequencyValue(frequencies, activeSimulation.active.portVelocity, activeSimulation.box.fb) : null;
    void fbValue;
  }
  
  function visibleFrequencyResponses() {
    return (state.measurements?.frequencyResponses || []).filter((response) =>
      response.visible !== false &&
      response.points?.length >= 2 &&
      measurementTargetMatchesVisibleDesign(response.target)
    );
  }
  
  function measurementTargetMatchesVisibleDesign(target) {
    const value = String(target || defaultMeasurementTarget());
    if (value.startsWith("design:")) {
      const designId = value.slice("design:".length);
      const design = state.designs.find((item) => item.id === designId);
      return Boolean(design && design.visible !== false);
    }
    if (value.startsWith("configGroup:")) {
      const groupId = value.slice("configGroup:".length);
      return state.designs.some((design) => (design.groupId || UNGROUPED_CONFIG_GROUP_ID) === groupId && design.visible !== false);
    }
    return false;
  }
  
  function frequencyResponseSeries(response, colors, index = 0) {
    const color = response.color || colors.palette[(index + 3) % colors.palette.length];
    const compactName = shortMeasurementName(response);
    const angleLabel = formatMeasurementAngleCompact(response);
    const values = filteredMeasurementMagnitudeValues(response);
    return {
      name: compactMeasurementSeriesName(response),
      compactName,
      angleLabel,
      fullName: fullMeasurementName(response),
      x: response.points.map((point) => point.frequencyHz),
      values,
      color,
      width: 2.4,
      opacity: 0.92,
    };
  }

  function filteredMeasurementMagnitudeValues(response) {
    const filters = crossoverFiltersForMeasurement(response);
    if (!filters.length) return response.points.map((point) => point.magnitudeDb);
    return response.points.map((point) => {
      const filterResponse = filterChainResponse(point.frequencyHz, filters);
      const magnitude = Math.max(filterResponse.abs(), 1e-12);
      return point.magnitudeDb + 20 * Math.log10(magnitude);
    });
  }

  function filteredMeasurementPoints(response) {
    const values = filteredMeasurementMagnitudeValues(response);
    return response.points.map((point, index) => ({
      ...point,
      magnitudeDb: values[index],
    }));
  }

  function crossoverFiltersForMeasurement(response) {
    const target = String(response.target || defaultMeasurementTarget());
    if (target.startsWith("design:")) {
      const designId = target.slice("design:".length);
      const design = state.designs.find((item) => item.id === designId);
      return design ? crossoverFiltersForDesign(design) : [];
    }
    if (target.startsWith("configGroup:")) {
      const groupId = target.slice("configGroup:".length);
      const group = groupId
        ? state.configGroups.find((item) => item.id === groupId)
        : ungroupedCrossoverGroup();
      return groupLevelSignalFilters(group);
    }
    return [];
  }

  function groupLevelSignalFilters(group) {
    return (group?.crossover?.signalFilters || [])
      .filter((filter) => filter.enabled !== false && normalizeSignalFilterTarget(filter.target) === SIGNAL_FILTER_TARGET_GROUP)
      .map((filter) => ({ ...filter }));
  }
  
  function updateOffAxisResponseLegend(series) {
    window.dispatchEvent(new CustomEvent("cabio:plot-series-legend-sync", {
      detail: {
        panelId: "offAxisResponsePlot",
        series: series.slice(0, 8).map((item) => ({
          name: item.name,
          fullName: item.fullName,
          compactName: item.compactName,
          angleLabel: item.angleLabel,
          color: item.color,
        })),
        hiddenCount: Math.max(0, series.length - 8),
      },
    }));
  }
  
  function measurementPolarSeries(responses, colors, plane = "horizontal") {
    const planeResponses = responses.filter((response) => response.plane === plane && response.points?.length >= 2);
    const grouped = new Map();
    planeResponses.forEach((response) => {
      const key = response.recordingGroupId || "__ungrouped__";
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(response);
    });
    const bestGroupResponses = [...grouped.values()]
      .map((groupResponses) => groupResponses.sort((left, right) => Number(left.angleDeg || 0) - Number(right.angleDeg || 0)))
      .sort((left, right) => distinctMeasurementAngles(right).length - distinctMeasurementAngles(left).length)[0] || [];
    const distinctAngles = distinctMeasurementAngles(bestGroupResponses);
    if (distinctAngles.length < 2) return [];
  
    const polarColors = [colors.accent, colors.blue, colors.text, colors.accent2, colors.danger];
    return [500, 1000, 2000, 4000, 8000]
      .map((frequency, index) => {
        const sampled = bestGroupResponses
          .map((response) => ({
            angleDeg: Number(response.angleDeg) || 0,
            magnitudeDb: interpolateMeasurementDb(filteredMeasurementPoints(response), frequency),
          }))
          .filter((point) => Number.isFinite(point.magnitudeDb));
        const uniqueSampled = dedupePolarPoints(sampled);
        if (uniqueSampled.length < 2) return null;
  
        const reference = uniqueSampled.find((point) => Math.abs(point.angleDeg) < 0.001)?.magnitudeDb ?? Math.max(...uniqueSampled.map((point) => point.magnitudeDb));
        return {
          name: formatCrossoverFrequency(frequency),
          color: polarColors[index % polarColors.length],
          width: index >= 3 ? 2.4 : 1.8,
          points: uniqueSampled.map((point) => ({
            angleDeg: point.angleDeg,
            db: Math.max(-30, Math.min(0, point.magnitudeDb - reference)),
          })),
        };
      })
      .filter(Boolean);
  }
  
  function distinctMeasurementAngles(responses = []) {
    return [...new Set(responses.map((response) => Math.round(Number(response.angleDeg || 0) * 1000) / 1000))];
  }
  
  function dedupePolarPoints(points = []) {
    const seen = new Map();
    points.forEach((point) => {
      const key = Math.round(Number(point.angleDeg || 0) * 1000) / 1000;
      if (!seen.has(key)) seen.set(key, point);
    });
    return [...seen.values()].sort((left, right) => left.angleDeg - right.angleDeg);
  }
  
  function interpolateMeasurementDb(points, frequency) {
    const target = Number(frequency);
    if (!Number.isFinite(target) || !Array.isArray(points) || points.length < 2) return NaN;
    const sorted = points;
    if (target < sorted[0].frequencyHz || target > sorted[sorted.length - 1].frequencyHz) return NaN;
    for (let index = 1; index < sorted.length; index += 1) {
      const left = sorted[index - 1];
      const right = sorted[index];
      if (target > right.frequencyHz) continue;
      if (Math.abs(right.frequencyHz - left.frequencyHz) < 1e-9) return right.magnitudeDb;
      const ratio = (target - left.frequencyHz) / (right.frequencyHz - left.frequencyHz);
      return left.magnitudeDb + (right.magnitudeDb - left.magnitudeDb) * ratio;
    }
    return NaN;
  }
  
  function designSeries(simulation, values, colors) {
    return {
      name: simulation.design.name,
      x: frequencies,
      values,
      color: designColorForDesign(simulation.design, simulation.colorIndex),
      width: simulation.design.id === state.activeDesignId || simulation.groupCombined ? 3 : 2,
    };
  }
  
  function handleFilterAnnotationDrag({ annotation, frequencyHz, final }) {
    const drag = annotation?.drag;
    if (!drag || !Number.isFinite(frequencyHz)) return;
    updateDraggedFilterFrequency(drag, clampCrossoverFrequency(frequencyHz), {
      live: !final,
      renderControls: final,
    });
  }
  
  function updateDraggedFilterFrequency(drag, frequencyHz, options = {}) {
    const nextState = cloneProject(state);
    const group = mutableCrossoverGroup(nextState, drag.groupId);
    if (!group) return;
    group.crossover = normalizeGroupCrossover(group.crossover);
  
    if (drag.type === "transition") {
      const transition = group.crossover.transitions.find((item) => item.id === drag.id);
      if (!transition) return;
      transition.frequencyHz = frequencyHz;
      transition.family = CROSSOVER_FAMILIES.includes(transition.family) ? transition.family : "linkwitz-riley";
      transition.order = CROSSOVER_ORDERS.includes(Number(transition.order)) ? Number(transition.order) : 4;
    } else if (drag.type === "signalFilter") {
      const filter = group.crossover.signalFilters.find((item) => item.id === drag.id);
      if (!filter) return;
      filter[drag.field || "frequencyHz"] = frequencyHz;
      if (filter.type === "subsonic") filter.preset = "custom";
      Object.assign(filter, normalizeSignalFilter(filter));
    } else {
      return;
    }
  
    commitCrossoverState(nextState, options.live ? { renderControls: false, replaceHistory: true } : options);
  }
  
  function limitAnnotationsForValues(values, limit, options = {}) {
    if (!Number.isFinite(limit) || limit <= 0) return [];
    const maxValue = Math.max(...values.filter(Number.isFinite));
    if (!Number.isFinite(maxValue) || maxValue <= limit) return [];
    return [{
      limitValue: limit,
      limitDirection: "above",
      exceeded: true,
      color: options.color,
      label: options.label,
      detail: options.detail
        ? `${options.detail} / peak ${formatLimitValue(maxValue)}${options.unit ? ` ${options.unit}` : ""}`
        : `Peak ${formatLimitValue(maxValue)}${options.unit ? ` ${options.unit}` : ""}`,
    }];
  }
  
  function positiveOrNull(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
  }
  
  function formatLimitValue(value) {
    if (!Number.isFinite(value)) return "";
    if (Math.abs(value) >= 100) return value.toFixed(0);
    if (Math.abs(value) >= 10) return value.toFixed(1);
    return value.toFixed(2);
  }
  
  function crossoverAnnotationsForPlot(simulations, plotKind) {
    const annotations = [];
    crossoverGroups().forEach((group, groupIndex) => {
      const groupColor = designColor(configGroupCombinedColorIndex(groupIndex));
      if (plotKind !== "spl") return;
      (group.crossover?.signalFilters || []).forEach((filter) => {
        if (filter.enabled === false) return;
        if (filter.showAnnotation === false) return;
        const memberGroupId = crossoverGroupMemberId(group);
        const targetSimulations = simulations.filter((simulation) => (simulation.design.groupId || UNGROUPED_CONFIG_GROUP_ID) === memberGroupId && signalFilterAppliesToDesign(filter, simulation.design));
        if (!targetSimulations.length) return;
        const annotation = signalFilterAnnotation(filter, targetSimulations, groupColor);
        if (annotation) annotations.push(annotation);
      });
    });
    return annotations;
  }

  function signalFilterAnnotation(filter, simulations, fallbackColor) {
    const target = normalizeSignalFilterTarget(filter.target);
    const targetDesign = target.startsWith("design:")
      ? simulations.find((simulation) => simulation.design.id === target.slice("design:".length))?.design
      : null;
    const color = targetDesign ? designColorForDesign(targetDesign) : fallbackColor;
    const type = filter.type;
    const frequencyHz = signalFilterAnnotationFrequency(filter);
    if (!Number.isFinite(frequencyHz) || frequencyHz <= 0) return null;
  
    return {
      frequencyHz,
      ...signalFilterAnnotationBand(filter, frequencyHz),
      color,
      label: signalFilterAnnotationLabel(filter),
      detail: signalFilterAnnotationDetail(filter, target, simulations),
      draggable: true,
      drag: {
        type: "signalFilter",
        groupId: crossoverGroupForDesign(simulations[0]?.design || {})?.id || "",
        id: filter.id,
        field: filter.type === "linkwitz-transform" ? "targetFrequencyHz" : "frequencyHz",
      },
    };
  }
  
  function signalFilterAnnotationFrequency(filter) {
    if (filter.type === "linkwitz-transform") return Number(filter.targetFrequencyHz);
    return Number(filter.frequencyHz);
  }
  
  function signalFilterAnnotationBand(filter, frequencyHz) {
    if (filter.type === "parametric") {
      const q = Math.max(Number(filter.q) || 1, 0.1);
      const factor = 2 ** (1 / (2 * q));
      return { bandMinHz: frequencyHz / factor, bandMaxHz: frequencyHz * factor };
    }
    if (filter.type === "lowpass" || filter.type === "subsonic") {
      return { bandMinHz: 0, bandMaxHz: frequencyHz };
    }
    if (filter.type === "highpass") {
      return { bandMinHz: frequencyHz, bandMaxHz: Number.MAX_SAFE_INTEGER };
    }
    if (filter.type === "linkwitz-transform") {
      const source = Number(filter.sourceFrequencyHz);
      const target = Number(filter.targetFrequencyHz);
      if (Number.isFinite(source) && source > 0 && Number.isFinite(target) && target > 0) {
        return { bandMinHz: Math.min(source, target), bandMaxHz: Math.max(source, target) };
      }
    }
    return { bandMinHz: frequencyHz / Math.SQRT2, bandMaxHz: frequencyHz * Math.SQRT2 };
  }
  
  function signalFilterAnnotationLabel(filter) {
    if (filter.type === "linkwitz-transform") {
      return `LT ${formatCrossoverFrequency(filter.sourceFrequencyHz)} -> ${formatCrossoverFrequency(filter.targetFrequencyHz)}`;
    }
    return `${shortSignalFilterTypeLabel(filter.type)} ${formatCrossoverFrequency(filter.frequencyHz)}`;
  }
  
  function signalFilterAnnotationDetail(filter, target, simulations) {
    const targetLabel = signalFilterTargetLabel(target, simulations);
    if (filter.type === "gain" || filter.type === "parametric") {
      const gain = Number(filter.gainDb) || 0;
      const gainLabel = `${gain >= 0 ? "+" : ""}${roundTo(gain, 1)} dB`;
      return `${gainLabel} / ${targetLabel}`;
    }
    if (filter.type === "lowpass" || filter.type === "highpass" || filter.type === "subsonic") {
      return `${crossoverFamilyLabel(filter.family)}${filter.order || 4} / ${targetLabel}`;
    }
    if (filter.type === "linkwitz-transform") {
      return `Q ${roundTo(filter.sourceQ, 2)} -> ${roundTo(filter.targetQ, 2)} / ${targetLabel}`;
    }
    return targetLabel;
  }
  
  function shortSignalFilterTypeLabel(type) {
    return {
      parametric: "PEQ",
      gain: "Gain",
      lowpass: "LP",
      highpass: "HP",
      subsonic: "Subsonic",
    }[type] || signalFilterTypeLabel(type);
  }
  
  function signalFilterTargetLabel(target, simulations) {
    if (target === SIGNAL_FILTER_TARGET_GROUP) return "Group";
    if (target.startsWith("design:")) {
      const designId = target.slice("design:".length);
      return simulations.find((simulation) => simulation.design.id === designId)?.design.name || "Config";
    }
    return "Group";
  }
  
  function formatCrossoverFrequency(value) {
    if (value >= 1000) return `${roundTo(value / 1000, value >= 10000 ? 1 : 2)} kHz`;
    return `${roundTo(value, 1)} Hz`;
  }
  
  function wrapPhaseDifference(value) {
    if (!Number.isFinite(value)) return NaN;
    return ((((value + 180) % 360) + 360) % 360) - 180;
  }
  
  function splValuesForSimulation(simulation) {
    if (simulation.groupCombined) return simulation.active.spl;
    const linearSpl = excursionLimitedSpl(simulation.active.spl, simulation.active.excursionMm, simulation.driver.xmax * 1000);
    return linearSpl;
  }
  
  function portVelocityValuesForSimulation(simulation) {
    if (simulation.design.mode === "bandpass" && Array.isArray(simulation.active.rearPortVelocity)) {
      const combinedPortVelocity = simulation.active.portVelocity.map((value, index) => Math.max(value, simulation.active.rearPortVelocity[index] || 0));
      return excursionLimitedValues(combinedPortVelocity, simulation.active.excursionMm, simulation.driver.xmax * 1000);
    }
    return excursionLimitedValues(simulation.active.portVelocity, simulation.active.excursionMm, simulation.driver.xmax * 1000);
  }

  return {
    configGroupCombinedColorIndex,
    isConfigGroupCombinedRendered,
    render,
    splValuesForSimulation,
  };
}
