import { analyzeDriverParameters, combineDriverGroups, combineIdenticalDrivers, normalizeDriver, validateDriver } from "../core/driver.js";
import { logFrequencyVector, nearestFrequencyValue } from "../core/frequency.js";
import { simulateSealed } from "../core/sealedBox.js";
import { normalizePortShape, portLengthFromTuning, portLengthFromTuningOptions, simulateVented, tuningFromPortLength, tuningFromPortLengthOptions } from "../core/ventedBox.js";
import { simulatePassiveRadiator } from "../core/passiveRadiatorBox.js";
import { simulateBandpass } from "../core/bandpassBox.js";
import { validateEnclosureOptions } from "../core/enclosure.js";
import { filterChainResponse } from "../core/filters.js";
import { inferAngleFromName, normalizeFrequencyResponse, normalizeFrequencyResponseCandidate, normalizeMeasurementGroups, normalizeMeasurements, normalizeRecordingSettings, parseFrequencyResponseText } from "../core/measurements.js";
import { averageFrequencyResponses, estimateFrequencyResponse, generateRecordingStimulus } from "../core/recordingAnalysis.js";
import { excursionLimitedSpl, excursionLimitedValues, maxExcursionRatio, recommendedLowFrequencyLimit } from "../core/realism.js";
import { adoptPlotState, autoRange, drawPlot } from "../ui/plot.js";
import { drawPolarPlot } from "../ui/polarPlot.js";
import { drawBoxPreview, resetBoxPreview, zoomBoxPreview } from "../ui/preview.js";
import { cloneProject, knownDrivers, knownPassiveRadiators, loadKnownDrivers, loadKnownPassiveRadiators, sampleProject } from "../state.js";

import {
  AXIS_KEYS,
  CROSSOVER_CIRCUIT_COMPONENT_DEFAULTS,
  CROSSOVER_FAMILIES,
  CROSSOVER_FREQUENCY_MAX_HZ,
  CROSSOVER_FREQUENCY_MIN_HZ,
  CROSSOVER_ORDERS,
  CROSSOVER_SLIDER_STEPS,
  CROSSOVER_UI_STORAGE_KEY,
  DEFAULT_CROSSOVER_FREQUENCY_HZ,
  DEFAULT_PORT_LOCK_FIELD,
  DIAMETER_FILTER_VALUES,
  DRIVER_ANALYSIS_DERIVED_FIELDS,
  DRIVER_LIBRARY_STORAGE_KEY,
  DRIVER_RESULT_FIELDS,
  FREQUENCY_MAX_HZ,
  FREQUENCY_MIN_HZ,
  GOLDEN_COMPONENT_TYPE,
  LAYOUT_PANEL_VERSION,
  LIBRARY_CONTROLS_STORAGE_KEY,
  PANEL_IDS,
  POLAR_PLOT_IDS,
  PASSIVE_RADIATOR_LIBRARY_STORAGE_KEY,
  PASSIVE_RADIATOR_RESULT_FIELDS,
  PLOT_IDS,
  PORT_FIELDS,
  PORT_LOCK_STORAGE_KEY,
  PROJECT_STORAGE_KEY,
  SIGNAL_FILTER_DEFAULTS,
  SIGNAL_FILTER_TARGET_GROUP,
  SIGNAL_FILTER_TYPES,
  SUBSONIC_PRESETS,
  THEME_CHOICES,
  THEME_STORAGE_KEY,
  UNGROUPED_CROSSOVER_GROUP_ID,
  UNGROUPED_CONFIG_GROUP_ID,
  UNGROUPED_MEASUREMENT_GROUP_ID,
  UNIT_PREF_STORAGE_KEY,
} from "./constants.js";
import { PANEL_PRESETS } from "./presets.js";
import {
  CONTROL_TOOLTIPS,
  FIELD_TOOLTIPS,
  MODE_TOOLTIPS,
  PANEL_LABELS,
  PANEL_TOOLTIPS,
  PLOT_PANEL_TOOLTIPS,
  RANGE_TOOLTIPS,
  SIDEBAR_TOOLTIPS,
  THEME_TOOLTIPS,
} from "./tooltips.js";
import { UNIT_GROUPS } from "./units.js";
import {
  buildGoldenLayoutConfig,
  goldenLayoutConfigFromResolved,
  makeGoldenLayoutTabsClosable,
  panelIdsFromLayoutConfig,
} from "./goldenLayoutConfig.js";
import { clampNumber, cssEscape, formatInputValue, roundTo } from "./format.js";
import { completeDriverParameters, completePassiveRadiatorParameters } from "./driverParameters.js";
import { clampCrossoverFrequency, crossoverFrequencyToSliderValue, crossoverSliderValueToFrequency } from "./crossoverUtils.js";
import { broadcastProjectState, initializePopoutProjectSync, isGoldenLayoutPopoutWindow } from "./projectSync.js";
import { legacyPlotHeight, legacyPlotWidth, normalizePlotSize, readSavedLayout, writeGoldenLayoutState, writeSavedLayout } from "./layoutPersistence.js";
import { readJsonStorage, readStringStorage, removeStorageItem, writeJsonStorage, writeStringStorage } from "./storage.js";
import { collectDomRefs } from "./domRefs.js";
import { initializeNumericInputs, isNumericInput, parseNumericInputValue } from "./numericInputs.js";
import { driverMatches, filteredSortedLibraryEntries, libraryBrand, libraryEntriesWithSelection, passiveRadiatorMatches, slugify } from "./libraryUtils.js";
import { customLibraryEntries, mergeLibraryEntries, readCustomLibrary, uniqueLibraryId } from "./libraryStore.js";
import { completeBox, passiveRadiatorAreaFromDiameter, passiveRadiatorDiameterFromArea, portOptionsFromBox } from "./boxModel.js";
import {
  crossoverCircuitComponentPortId,
  crossoverCircuitDesignNodeId,
  crossoverCircuitFixedNodeId,
  hasActiveCrossoverDesign,
  normalizeCrossoverDesign,
  normalizeGroupCrossover,
  normalizeSignalFilter,
  normalizeSignalFilterTarget,
} from "./crossoverModel.js";
import { crossoverCircuitResponses } from "./crossoverCircuitSolver.js";
import { compactDesignName, designNameFromBox, formatMode, legacyDesignNameFromBox } from "./designNames.js";
import {
  designColor as designPaletteColor,
  designColorForDesign as designPaletteColorForDesign,
  designPalette as getDesignPalette,
  getThemeColors,
  isPaletteColor,
  readableTextColor,
} from "./designColors.js";
import { getPath, setPath } from "./objectPath.js";
import {
  applyActiveDesignToProject,
  getActiveDesign as getActiveDesignFromProject,
  getActiveDriverGroup as getActiveDriverGroupFromProject,
  normalizeDriverGroups,
  normalizeProjectState as normalizeProjectModelState,
  syncActiveDesignFromProject as syncActiveDesignModelFromProject,
  syncActiveDriverGroupArrayFromBox,
  syncActiveDriverGroupFromProject,
  syncBoxDriverArrayFromActiveGroup,
  syncProjectDriverFromActiveGroup,
} from "./projectModel.js";
import { createEyeIcon, createTrashIcon } from "../ui/icons.js";
import { createPlotViewController, interpolatePlotSeriesValue, positiveMagnitudeRange } from "./plotViewController.js";
import {
  formatSearchResultValue,
  renderDriverSearchResultsView,
  renderPassiveRadiatorSearchResultsView,
} from "./searchResultViews.js";
import { createSearchWorkflows } from "./searchWorkflows.js";
import { createConfigBarController } from "./configBarController.js";
import { createMeasurementViews } from "./measurementViews.js";
import { createRenderPipeline } from "./renderPipeline.js";
import { createCrossoverController } from "./crossoverController.js";
import { createCrossoverSchematicController } from "./crossoverSchematicController.js";
import {
  createConfigGroupId,
  createCrossoverCircuitComponentId,
  createCrossoverCircuitJunctionId,
  createCrossoverCircuitWireId,
  createCrossoverModuleGroupId,
  createCrossoverDesignId,
  createCrossoverTransitionId,
  createDesignId,
  createDriverGroupId,
  createMeasurementGroupId,
  createSignalFilterId,
  uniqueConfigGroupName,
  uniqueDesignName,
  uniqueDriverGroupName,
  uniqueMeasurementGroupName,
} from "./idUtils.js";
let builtInDriverLibrary = knownDrivers;
let builtInPassiveRadiatorLibrary = knownPassiveRadiators;
let driverLibrary = loadDriverLibrary();
let passiveRadiatorLibrary = loadPassiveRadiatorLibrary();
let driverLibraryLoadPromise = null;
let passiveRadiatorLibraryLoadPromise = null;
let driverLibraryLoaded = false;
let passiveRadiatorLibraryLoaded = false;
let state = readSavedProjectState();
let historyIndex = 0;
let draggedItem = null;
let manualDrag = null;
let activePreset = "driver";
let applyingLayout = false;
let resizePersistenceReady = false;
let resizeTimer = null;
let recordingInProgress = false;
let recordingSpectrogramInitialized = false;
const frequencies = logFrequencyVector(FREQUENCY_MIN_HZ, FREQUENCY_MAX_HZ, 640);
const RECORDING_ANALYSIS_FREQUENCY_POINTS = 480;
const RECORDING_PREVIEW_FREQUENCY_POINTS = 640;
const GRAPH_PANEL_IDS = [...PLOT_IDS, ...POLAR_PLOT_IDS, "boxPreview"];
const AXIS_TOOLBAR_PLOT_IDS = [...PLOT_IDS];
const BOX_MODE_PRESETS = {
  sealed: "boxSealed",
  vented: "boxVented",
  passive: "boxPassive",
  bandpass: "boxBandpass",
};
const WORK_MODE_PRESETS = {
  driver: "driver",
  crossover: "filter",
  measurement: "measurement",
};
const FREQUENCY_RESPONSE_RESULT_FIELDS = [
  { key: "pointCount", label: "Points", unit: "" },
  { key: "frequencyMinHz", label: "From", unit: "Hz" },
  { key: "frequencyMaxHz", label: "To", unit: "Hz" },
  { key: "magnitudeMinDb", label: "Min", unit: "dB" },
  { key: "magnitudeMaxDb", label: "Max", unit: "dB" },
];

const {
  fields,
  derivedFields,
  rangeFields,
  modeButtons,
  themeButtons,
  sidebarTabs,
  sidebarPanels,
  panelToggles,
  plotPanels,
  pillTabGroups,
  projectJson,
  importExportButton,
  importExportDialog,
  closeImportExportDialog,
  fileSaveButton,
  fileOpenButton,
  exportButton,
  importInput,
  importJsonButton,
  projectDialogStatus,
  driverSearchInput,
  driverSearchButton,
  driverSearchStatus,
  driverUsageSummary,
  driverValidationDetails,
  driverValidationStatus,
  driverSelect,
  driverLibraryFilter,
  driverLibrarySort,
  driverLibraryFilterEnabled,
  driverLibraryBrand,
  driverLibraryDiameter,
  driverGroupList,
  addDriverGroupButton,
  passiveRadiatorSelect,
  passiveRadiatorLibraryFilter,
  passiveRadiatorLibrarySort,
  passiveRadiatorLibraryFilterEnabled,
  passiveRadiatorLibraryBrand,
  passiveRadiatorLibraryDiameter,
  passiveRadiatorSearchInput,
  passiveRadiatorSearchButton,
  passiveRadiatorSearchStatus,
  crossoverStatus,
  signalFilterTypeSelect,
  signalFilterAddButton,
  crossoverSchematicBoard,
  measurementPlaneSelect,
  measurementTargetSelect,
  frequencyResponseInput,
  measurementStatus,
  measurementList,
  recordingMicrophoneSelect,
  recordingOutputSelect,
  recordingSignalSelect,
  recordingFrequencyStartInput,
  recordingFrequencyEndInput,
  recordingLevelInput,
  recordingDurationInput,
  recordingAveragingInput,
  recordingSampleRateSelect,
  recordingTestToneButton,
  recordingAddButton,
  recordingRunNameInput,
  recordingRunAngleInput,
  recordingSaveRunButton,
  recordingStatus,
  recordingLevelReadout,
  recordingSpectrogram,
  recordingPeakReadout,
  recordingMeterBar,
  configBarList,
  newConfigButton,
  newConfigGroupButton,
  configAddMenu,
  mobileNewConfigButton,
  mobileNewConfigGroupButton,
} = collectDomRefs();

function setUiText(target, text) {
  const id = typeof target === "string" ? target : target?.id;
  if (!id) return;
  window.__cabioTextSync = {
    ...(window.__cabioTextSync || {}),
    [id]: String(text ?? ""),
  };
  window.dispatchEvent(new CustomEvent("cabio:text-sync", {
    detail: { id, text: String(text ?? "") },
  }));
}

let libraryControlPrefs = readLibraryControlPrefs();
let unitPrefs = readUnitPrefs();
let portLockField = readPortLockField();
let themePreference = readThemePreference();
let pillUpdateFrame = null;
const systemThemeQuery = window.matchMedia("(prefers-color-scheme: light)");
const mobileMediaQuery = window.matchMedia("(max-width: 560px)");
let mobileActivePanel = "splPlot";
let crossoverUiState = readCrossoverUiState();
let activeCrossoverGroupId = crossoverUiState.activeGroupId;
let plotResizeDrag = null;
const plotSpans = {};
let goldenLayout = null;
let goldenLayoutStaging = null;
let goldenLayoutSaveTimer = null;
let goldenLayoutRenderTimer = null;
let loadingGoldenLayout = false;
let goldenLayoutLoadToken = 0;
let programmaticGoldenLayoutPreset = "";
let programmaticGoldenLayoutUntil = 0;
let desktopGoldenLayoutConfig = null;
let stagedRecordingResponse = null;
let currentRecordingRun = null;
const plotViewController = createPlotViewController({
  axisKeys: AXIS_KEYS,
  autoRange,
  clampNumber,
  frequencies,
  isMobileLayout,
  parseNumericInputValue,
  plotIds: AXIS_TOOLBAR_PLOT_IDS,
  render: (...args) => render(...args),
});
const searchWorkflows = createSearchWorkflows({
  addDriverToLibrary,
  addFrequencyResponseSearchResultsToMeasurements,
  addPassiveRadiatorToLibrary,
  applyKnownDriver,
  applyKnownPassiveRadiator,
  cloneProject,
  commitState,
  completeBox,
  completeDriverParameters,
  completePassiveRadiatorParameters,
  driverForProject,
  driverSearchButton,
  driverSearchInput,
  driverSearchStatus,
  getState: () => state,
  passiveRadiatorSearchButton,
  passiveRadiatorSearchInput,
  passiveRadiatorSearchStatus,
  renderDriverSearchResults,
  renderPassiveRadiatorSearchResults,
  searchKnownDriverResults,
  setUiText,
  setTooltip,
  slugify,
  syncActiveDesignFromProject,
});
const crossoverController = createCrossoverController({
  activateDesign,
  clampCrossoverFrequency,
  cloneProject,
  commitState,
  createCrossoverCircuitComponentId,
  createCrossoverCircuitJunctionId,
  createCrossoverCircuitWireId,
  createCrossoverDesignId,
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
  getActiveCrossoverGroupId: () => activeCrossoverGroupId,
  getActiveDesign,
  getState: () => state,
  normalizeGroupCrossover,
  normalizeCrossoverDesign,
  normalizeSignalFilter,
  parseNumericInputValue,
  render: (...args) => render(...args),
  roundTo,
  setActiveCrossoverGroupId,
  setSelectedCrossoverDesignId,
  SIGNAL_FILTER_DEFAULTS,
  SIGNAL_FILTER_TARGET_GROUP,
  SIGNAL_FILTER_TYPES,
  signalFilterAddButton,
  signalFilterTypeSelect,
  SUBSONIC_PRESETS,
});
const {
  addCrossoverDesign,
  addSignalFilter,
  commitCrossoverState,
  crossoverFamilyLabel,
  renderCrossoverControls,
  signalFilterTypeLabel,
  updateSignalFilterAddButton,
} = crossoverController;
const crossoverSchematicController = createCrossoverSchematicController({
  cloneProject,
  commitState,
  createCrossoverCircuitComponentId,
  createCrossoverCircuitJunctionId,
  createCrossoverCircuitWireId,
  createCrossoverModuleGroupId,
  CROSSOVER_CIRCUIT_COMPONENT_DEFAULTS,
  addCrossoverDesign,
  crossoverCircuitComponentPortId,
  crossoverCircuitDesignNodeId,
  crossoverCircuitFixedNodeId,
  crossoverSchematicBoard,
  designColorForDesign,
  getActiveCrossoverGroupId: () => activeCrossoverGroupId,
  getActiveDesign,
  getSelectedCrossoverDesignId,
  getState: () => state,
  isMobileLayout,
  normalizeGroupCrossover,
  parseNumericInputValue,
  roundTo,
  setSelectedCrossoverDesignId,
  setTooltip,
});
const { renderCrossoverSchematic } = crossoverSchematicController;
const renderPipeline = createRenderPipeline({
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
  crossoverCircuitResponses,
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
  generatedRecordingPoints,
  getActiveDesign,
  getState: () => state,
  getThemeColors,
  hasActiveCrossoverDesign,
  hydrateDerivedFields,
  hydratePortLockButtons,
  hydrateRangeFields,
  hydrateRecordingControls,
  interpolatePlotSeriesValue,
  maxExcursionRatio,
  modeButtons,
  nearestFrequencyValue,
  normalizeFrequencyResponse,
  normalizeGroupCrossover,
  normalizeSignalFilter,
  normalizeSignalFilterTarget,
  positiveMagnitudeRange,
  projectJson,
  readableTextColor,
  recommendedLowFrequencyLimit,
  recordingSettings,
  renderDriverSummaryPanel: (...args) => renderDriverSummaryPanel(...args),
  renderDriverHealthPanel: (...args) => renderDriverHealthPanel(...args),
  renderCrossoverSchematic,
  renderMeasurementControls: (...args) => renderMeasurementControls(...args),
  roundTo,
  selectMatchingDriver,
  selectMatchingPassiveRadiator,
  shortMeasurementName,
  signalFilterTypeLabel,
  SIGNAL_FILTER_TARGET_GROUP,
  simulateBandpass,
  simulateDesignDriver: (...args) => driverForDesign(...args),
  simulatePassiveRadiator,
  simulateSealed,
  simulateVented,
  getStagedRecordingResponse: () => stagedRecordingResponse,
  UNGROUPED_CONFIG_GROUP_ID,
  updatePanelToggleState,
  updatePillIndicatorsSoon,
  updatePlotControlValues,
  updatePlotFitLayout,
  validateDriver,
  validateEnclosureOptions,
});
const {
  configGroupCombinedColorIndex,
  isConfigGroupCombinedRendered,
  render,
  splValuesForSimulation,
} = renderPipeline;
const configBarController = createConfigBarController({
  activateDesign,
  assignDesignToConfigGroup,
  clearDropMarkers,
  compactDesignName,
  configBarList,
  configGroupCombinedColorIndex,
  createEyeIcon,
  cssEscape,
  deleteConfigGroup,
  deleteDesign,
  designColor,
  designColorForDesign,
  designDriverForName,
  designNameFromDriver,
  designPalette,
  duplicateDesign,
  getDropPlacement,
  getState: () => state,
  isConfigGroupCombinedRendered,
  isMobileLayout,
  measurementList,
  moveDesignToConfigGroup,
  moveFrequencyResponseToMeasurementGroup,
  readableTextColor,
  renameActiveDesign,
  setDesignColor,
  setDesignGraphVisibility,
  setDesignVisibility,
  setTooltip,
  UNGROUPED_CONFIG_GROUP_ID,
  UNGROUPED_MEASUREMENT_GROUP_ID,
  updateConfigGroup,
  updateMobileToolbarOffset,
});
const {
  closeConfigChipMenus,
  handleConfigChipDragEnd,
  handleConfigChipDragLeave,
  handleConfigChipDragOver,
  handleConfigChipDragStart,
  handleConfigChipDrop,
  handleConfigChipPointerDown,
  handleMeasurementChipDragEnd,
  handleMeasurementChipDragLeave,
  handleMeasurementChipDragOver,
  handleMeasurementChipDragStart,
  handleMeasurementChipDrop,
  handleMeasurementChipPointerDown,
  positionConfigChipMenu,
  renderConfigBar,
  toggleConfigChipMenu,
} = configBarController;
const { renderMeasurementControls } = createMeasurementViews({
  compactMeasurementSeriesName,
  defaultMeasurementTarget,
  discardStagedRecording,
  formatFrequencyValue,
  formatMeasurementAngleCompact,
  fullMeasurementName,
  getStagedRecordingResponse: () => stagedRecordingResponse,
  getState: () => state,
  hydrateMeasurementTargetSelect,
  measurementTargetLabel,
  measurementTargetOptions,
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
});



export function loadApplicationConfig() {
  return {
    isGoldenPopout: isGoldenLayoutPopoutWindow(),
  };
}

export function createApplication(config = loadApplicationConfig()) {
  return {
    initialize: () => initializeApplication(config),
    registerEvents: () => registerApplicationEvents(config),
    start: () => startApplication(),
  };
}

function initializeApplication(config) {
  state = normalizeProjectState(state);
  saveProjectState(state);
  syncMobileThemePreference();
  applyThemePreference(themePreference);
  initializeUnitControls();
  initializePortLockControls();
  initializeTooltips();
  initializeNumericInputs();
  initializeThemeControls();
  initializeLibraryControls();
  initializePillTransitions();
  initializePlotControls();
  initializePlotResizeHandles();
  initializeGoldenLayout();
  if (config.isGoldenPopout) return;

  restoreLayout();
  renderDriverSelect();
  renderPassiveRadiatorSelect();
  renderDesignControls();
  hydrateFields();
  hydrateRecordingDeviceOptions();
  initializeHistory();
}

function registerApplicationEvents(config) {
  if (config.isGoldenPopout) {
    initializePopoutProjectSync({
      applyProject: applyExternalProjectState,
      applyTheme: () => {
        themePreference = readThemePreference();
        applyThemePreference(themePreference);
        render();
      },
      applyUnits: () => {
        unitPrefs = readUnitPrefs();
        render();
      },
    });
    window.addEventListener("resize", () => {
      goldenLayout?.updateSizeFromContainer();
      render();
    });
    return;
  }
  bindEvents();
  bindSidebarTabs();
  bindReorderableLayout();
  bindPanelControls();
  bindToolbarMenuExclusivity();
  bindResizePersistence();
  initializeMobileLayoutControls();
}

function startApplication() {
  render();
  window.requestAnimationFrame(initializePlotResizeHandles);
}

function initializeTooltips() {
  fields.forEach((field) => {
    const fieldPath = getFieldPath(field);
    const tooltip = FIELD_TOOLTIPS[fieldPath];
    if (!tooltip) return;
    setTooltip(field, tooltip);
    setTooltip(field.closest(".field-card"), tooltip);
  });

  rangeFields.forEach((field) => {
    configureRangeField(field);
    const fieldPath = getRangeFieldPath(field);
    setTooltip(field, RANGE_TOOLTIPS[fieldPath] || FIELD_TOOLTIPS[fieldPath]);
  });

  document.querySelectorAll("[id]").forEach((element) => {
    setTooltip(element, CONTROL_TOOLTIPS[element.id]);
  });
  sidebarTabs.forEach((button) => {
    setTooltip(button, SIDEBAR_TOOLTIPS[button.dataset.sidebarTab]);
  });
  modeButtons.forEach((button) => {
    setTooltip(button, MODE_TOOLTIPS[button.dataset.mode]);
  });
  themeButtons.forEach((button) => {
    setTooltip(button, THEME_TOOLTIPS[button.dataset.themeChoice]);
  });
  panelToggles.forEach((button) => {
    setTooltip(button, PANEL_TOOLTIPS[button.dataset.panelToggle]);
  });
  document.querySelectorAll(".unit-select, .unit-fixed").forEach((element) => {
    setTooltip(element, "Choose the display unit for this value.");
  });
  document.querySelectorAll("summary").forEach((summary) => {
    setTooltip(summary, "Expand or collapse this section.");
  });
  document.querySelectorAll(".file-button").forEach((label) => {
    setTooltip(label, "Import a project JSON file.");
  });
  document.querySelectorAll(".plot-panel").forEach((panel) => {
    const panelId = panel.dataset.panel;
    const title = panel.querySelector(".pane-bar span:last-child");
    const tooltip = PLOT_PANEL_TOOLTIPS[panelId] || `Graph panel: ${title?.textContent || "view"}.`;
    panel.removeAttribute("title");
    panel.querySelector(".pane-bar")?.removeAttribute("title");
    setTooltip(title, tooltip);
  });
}

function setTooltip(element, text) {
  if (!element || !text) return;
  element.title = text;
}

function initializePlotControls() {
  GRAPH_PANEL_IDS.forEach((panelId) => {
    const panel = document.querySelector(`[data-panel="${panelId}"]`);
    const canvas = plotCanvasForPanel(panelId);
    if (!panel) return;

    const axisPlotId = axisPlotIdForPanel(panelId);
    if (!axisPlotId || !canvas) return;
    canvas.addEventListener("wheel", (event) => {
      if (isMobileLayout()) return;
      event.preventDefault();
      const factor = event.deltaY > 0 ? 1.18 : 0.85;
      const axis = event.shiftKey ? "y" : event.altKey || event.ctrlKey ? "x" : "both";
      zoomPlot(axisPlotId, factor, event, axis);
    }, { passive: false });

    canvas.addEventListener("mousedown", (event) => startPlotPan(axisPlotId, event));
  });
}

function initializePlotResizeHandles() {
  plotPanels.forEach((panel) => {
    panel.querySelectorAll(".plot-resize-handle[data-resize-direction]").forEach((handle) => {
      if (handle.dataset.resizeBound === "true") return;
      handle.dataset.resizeBound = "true";
      handle.addEventListener("mousedown", (event) => startPlotResize(panel.dataset.panel, handle.dataset.resizeDirection, event));
    });
  });
}

function initializeGoldenLayout() {
  const host = document.querySelector(".plot-grid");
  const GoldenLayout = globalThis.goldenLayout?.GoldenLayout;
  const isPopout = isGoldenLayoutPopoutWindow();
  if ((!host && !isPopout) || !GoldenLayout || goldenLayout || (!isPopout && isMobileLayout())) return Boolean(goldenLayout);

  installGoldenLayoutComponentBridge(GoldenLayout);
  const layoutHost = isPopout ? document.body : host;
  layoutHost.classList.add("golden-layout-host");
  if (!isPopout) {
    goldenLayoutStaging = host.querySelector("[data-golden-layout-staging]");
    if (goldenLayoutStaging) plotPanels.forEach((panel) => goldenLayoutStaging.append(panel));
  }

  goldenLayout = isPopout ? new GoldenLayout() : new GoldenLayout(host);
  goldenLayout.registerComponentFactoryFunction(GOLDEN_COMPONENT_TYPE, bindGoldenPlotPanel);
  goldenLayout.on("stateChanged", handleGoldenLayoutStateChanged);
  layoutHost.addEventListener("dblclick", handleGoldenLayoutTabDoubleClick);
  layoutHost.addEventListener("mousedown", handleGoldenLayoutTabMiddleClick);
  window.setTimeout(() => {
    goldenLayout?.updateSizeFromContainer();
    render();
  }, 80);
  return true;
}

function applyExternalProjectState(project) {
  state = normalizeProjectState(project);
  goldenLayout?.updateSizeFromContainer();
  render();
}

function installGoldenLayoutComponentBridge(GoldenLayout) {
  if (GoldenLayout.prototype.__audioSimComponentBridge) return;
  const previousGetComponentEvent = GoldenLayout.prototype.getComponentEvent;
  GoldenLayout.prototype.getComponentEvent = function getAudioSimComponent(container, itemConfig) {
    if (itemConfig?.componentType === GOLDEN_COMPONENT_TYPE) {
      return bindGoldenPlotPanel(container, itemConfig.componentState || {});
    }
    return typeof previousGetComponentEvent === "function" ? previousGetComponentEvent.call(this, container, itemConfig) : undefined;
  };
  GoldenLayout.prototype.__audioSimComponentBridge = true;
}

function bindGoldenPlotPanel(container, componentState = {}) {
  const panelId = componentState.panelId || container.initialState?.panelId;
  const panel = document.querySelector(`[data-panel="${panelId}"]`) || plotPanels.find((candidate) => candidate.dataset.panel === panelId);
  if (!panel) return { panelId };

  panel.classList.remove("is-hidden");
  panel.style.width = "";
  panel.style.height = "";
  panel.style.gridColumn = "";
  panel.style.gridRow = "";
  panel.setAttribute("draggable", "false");
  container.element.append(panel);
  syncGraphPanelSwitcherValue(panel);
  container.stateRequestEvent = () => ({ panelId });
  container.on("resize", queueGoldenLayoutRender);
  container.on("show", queueGoldenLayoutRender);
  return { panelId };
}

function handleGoldenLayoutTabDoubleClick(event) {
  const tab = event.target.closest(".lm_tab");
  if (!tab || !event.currentTarget.contains(tab) || isMobileLayout()) return;
  const stack = tab.closest(".lm_stack");
  const toggle = stack?.querySelector(".lm_controls .lm_maximise, .lm_controls .lm_minimise");
  if (!toggle) return;
  event.preventDefault();
  event.stopPropagation();
  toggle.click();
  window.setTimeout(() => {
    goldenLayout?.updateSizeFromContainer();
    render();
  }, 80);
}

function handleGoldenLayoutTabMiddleClick(event) {
  if (event.button !== 1 || isMobileLayout()) return;
  const tab = event.target.closest(".lm_tab");
  if (!tab || !event.currentTarget.contains(tab)) return;
  const closeButton = tab.querySelector(".lm_close_tab");
  if (!closeButton) return;
  event.preventDefault();
  event.stopPropagation();
  closeButton.click();
}

function handleGoldenLayoutStateChanged() {
  if (loadingGoldenLayout || (programmaticGoldenLayoutPreset && Date.now() < programmaticGoldenLayoutUntil)) {
    if (programmaticGoldenLayoutPreset) {
      activePreset = programmaticGoldenLayoutPreset;
      updatePresetButtonState();
    }
    return;
  }
  programmaticGoldenLayoutPreset = "";
  if (isGoldenLayoutMaximized()) {
    queueGoldenLayoutRender();
    return;
  }
  activePreset = "custom";
  updatePresetButtonState();
  updatePanelToggleState();
  queueGoldenLayoutSave();
  queueGoldenLayoutRender();
}

function isGoldenLayoutMaximized() {
  return Boolean(document.querySelector(".golden-layout-host .lm_maximised"));
}

function deactivateGoldenLayoutForMobile() {
  if (!goldenLayout || isGoldenLayoutPopoutWindow()) return;
  const host = document.querySelector(".plot-grid");
  window.clearTimeout(goldenLayoutSaveTimer);
  window.clearTimeout(goldenLayoutRenderTimer);
  loadingGoldenLayout = true;
  try {
    host?.removeEventListener("dblclick", handleGoldenLayoutTabDoubleClick);
    host?.removeEventListener("mousedown", handleGoldenLayoutTabMiddleClick);
    plotPanels.forEach((panel) => {
      panel.setAttribute("draggable", "true");
      panel.style.width = "";
      panel.style.height = "";
      panel.style.gridColumn = "";
      panel.style.gridRow = "";
      host?.append(panel);
    });
    goldenLayout.destroy?.();
  } catch (error) {
    console.warn("Golden Layout teardown failed.", error);
  } finally {
    goldenLayout = null;
    goldenLayoutStaging = null;
    host?.classList.remove("golden-layout-host");
    if (host) {
      [...host.children].forEach((child) => {
        if (!child.classList.contains("plot-panel")) child.remove();
      });
    }
    loadingGoldenLayout = false;
  }
}

function queueGoldenLayoutSave() {
  window.clearTimeout(goldenLayoutSaveTimer);
  goldenLayoutSaveTimer = window.setTimeout(() => saveLayout(), 160);
}

function queueGoldenLayoutRender() {
  window.clearTimeout(goldenLayoutRenderTimer);
  goldenLayoutRenderTimer = window.setTimeout(() => render(), 80);
}

function loadGoldenLayoutConfig(config, options = {}) {
  if (!goldenLayout) return;
  const loadToken = goldenLayoutLoadToken + 1;
  goldenLayoutLoadToken = loadToken;
  loadingGoldenLayout = true;
  if (options.activePresetName) {
    programmaticGoldenLayoutPreset = options.activePresetName;
    programmaticGoldenLayoutUntil = Date.now() + 1200;
  }
  try {
    const closableConfig = makeGoldenLayoutTabsClosable(config);
    if (goldenLayout.rootItem) goldenLayout.clear();
    plotPanels.forEach((panel) => {
      panel.classList.add("is-hidden");
      goldenLayoutStaging?.append(panel);
    });
    goldenLayout.loadLayout(closableConfig);
    syncPanelVisibilityFromGoldenLayout();
    updatePanelToggleState();
    updatePresetButtonState();
    goldenLayout.updateSizeFromContainer();
    render();
    if (options.persist !== false) saveLayout();
  } catch (error) {
    console.error("Golden Layout load failed.", error);
  } finally {
    window.setTimeout(() => {
      if (goldenLayoutLoadToken !== loadToken) return;
      loadingGoldenLayout = false;
      if (options.activePresetName) {
        activePreset = options.activePresetName;
        updatePresetButtonState();
        window.setTimeout(() => {
          if (goldenLayoutLoadToken !== loadToken) return;
          programmaticGoldenLayoutPreset = "";
        }, 900);
      }
    }, 300);
  }
}

function currentGoldenPanelIds() {
  if (!goldenLayout) return PANEL_IDS.filter((panelId) => !document.querySelector(`[data-panel="${panelId}"]`)?.classList.contains("is-hidden"));
  return panelIdsFromLayoutConfig(goldenLayout.saveLayout());
}

function syncPanelVisibilityFromGoldenLayout() {
  const visible = new Set(currentGoldenPanelIds());
  plotPanels.forEach((panel) => panel.classList.toggle("is-hidden", !visible.has(panel.dataset.panel)));
  syncGraphPanelSwitcherValues();
}

function startPlotResize(panelId, direction, event) {
  if (isMobileLayout() || event.button !== 0) return;
  const panel = document.querySelector(`[data-panel="${panelId}"]`);
  const grid = panel?.closest(".plot-grid");
  const panelRect = panel?.getBoundingClientRect();
  const gridRect = grid?.getBoundingClientRect();
  if (!panel || !grid || !panelRect || !gridRect || gridRect.width <= 0) return;

  event.preventDefault();
  event.stopPropagation();
  plotResizeDrag = {
    panelId,
    direction,
    startX: event.clientX,
    startY: event.clientY,
    gridWidth: gridRect.width,
    startWidthPct: (panelRect.width / gridRect.width) * 100,
    startHeightPx: panelRect.height,
  };
  panel.classList.add("plot-is-resizing");
  document.addEventListener("mousemove", handlePlotResizeMove);
  document.addEventListener("mouseup", finishPlotResize);
}

function handlePlotResizeMove(event) {
  if (!plotResizeDrag) return;
  const { panelId, direction, startX, startY, gridWidth, startWidthPct, startHeightPx } = plotResizeDrag;
  const dx = event.clientX - startX;
  const dy = event.clientY - startY;
  let widthPct = startWidthPct;
  let heightPx = startHeightPx;

  if (direction.includes("e")) widthPct = startWidthPct + (dx / gridWidth) * 100;
  if (direction.includes("w")) widthPct = startWidthPct - (dx / gridWidth) * 100;
  if (direction.includes("s")) heightPx = startHeightPx + dy;
  if (direction.includes("n")) heightPx = startHeightPx - dy;

  plotSpans[panelId] = normalizePlotSize({ widthPct, heightPx });
  activePreset = "custom";
  updatePresetButtonState();
  applyPlotPanelSize(document.querySelector(`[data-panel="${panelId}"]`), plotSpans[panelId]);
}

function finishPlotResize() {
  if (!plotResizeDrag) return;
  document.querySelector(`[data-panel="${plotResizeDrag.panelId}"]`)?.classList.remove("plot-is-resizing");
  plotResizeDrag = null;
  document.removeEventListener("mousemove", handlePlotResizeMove);
  document.removeEventListener("mouseup", finishPlotResize);
  saveLayout();
  render();
}

function plotSizeForPanel(panelId, defaults = {}) {
  const saved = plotSpans[panelId] || {};
  return normalizePlotSize({
    widthPct: saved.widthPct ?? legacyPlotWidth(saved.colSpan) ?? defaults.widthPct,
    heightPx: saved.heightPx ?? legacyPlotHeight(saved.rowSpan) ?? defaults.heightPx,
  });
}

function applyPlotPanelSize(panel, size) {
  if (!panel || panel.classList.contains("is-hidden")) return;
  panel.style.gridColumn = "";
  panel.style.gridRow = "";
  panel.style.width = `${size.widthPct}%`;
  panel.style.height = `${size.heightPx}px`;
}

function axisPlotIdForPanel(panelId) {
  if (PLOT_IDS.includes(panelId)) return panelId;
  return "";
}

function zoomGraphPanel(panelId, factor) {
  if (panelId === "boxPreview") {
    zoomBoxPreview(document.querySelector("#boxPreview"), factor);
    return;
  }
  const axisPlotId = axisPlotIdForPanel(panelId);
  if (axisPlotId) zoomPlot(axisPlotId, factor);
}

function resetGraphPanelView(panelId) {
  if (panelId === "boxPreview") {
    resetBoxPreview(document.querySelector("#boxPreview"));
    render();
    return;
  }
  const axisPlotId = axisPlotIdForPanel(panelId);
  if (axisPlotId) resetPlotView(axisPlotId);
}

function replaceGraphPanel(currentPanelId, nextPanelId) {
  if (currentPanelId === nextPanelId || !GRAPH_PANEL_IDS.includes(nextPanelId)) return;

  if (isMobileLayout()) {
    const previousMobilePanel = mobileActivePanel;
    mobileActivePanel = nextPanelId;
    adoptPlotState(plotCanvasForPanel(mobileActivePanel), plotCanvasForPanel(previousMobilePanel));
    applyMobilePanelVisibility();
    updatePanelToggleState();
    render({ animatePlots: true });
    return;
  }

  if (goldenLayout) {
    const nextConfig = cloneProject(goldenLayout.saveLayout());
    const changed = replaceGraphPanelInLayout(nextConfig.root, currentPanelId, nextPanelId);
    if (!changed) return;
    activePreset = "custom";
    loadGoldenLayoutConfig(goldenLayoutConfigFromResolved(nextConfig) || nextConfig);
    return;
  }

  replaceGraphPanelInStaticLayout(currentPanelId, nextPanelId);
}

function replaceGraphPanelInLayout(root, currentPanelId, nextPanelId) {
  let hasCurrent = false;
  let hasNext = false;
  const visit = (item) => {
    if (!item) return;
    if (item.type === "component" && item.componentType === GOLDEN_COMPONENT_TYPE) {
      const panelId = item.componentState?.panelId;
      hasCurrent ||= panelId === currentPanelId;
      hasNext ||= panelId === nextPanelId;
    }
    item.content?.forEach(visit);
  };
  visit(root);
  if (!hasCurrent) return false;

  const apply = (item) => {
    if (!item) return;
    if (item.type === "component" && item.componentType === GOLDEN_COMPONENT_TYPE) {
      const panelId = item.componentState?.panelId;
      const replacementId = panelId === currentPanelId ? nextPanelId : hasNext && panelId === nextPanelId ? currentPanelId : panelId;
      if (replacementId !== panelId) {
        item.componentState = { ...(item.componentState || {}), panelId: replacementId };
        item.title = PANEL_LABELS[replacementId] || replacementId;
      }
    }
    item.content?.forEach(apply);
  };
  apply(root);
  return true;
}

function replaceGraphPanelInStaticLayout(currentPanelId, nextPanelId) {
  const currentPanel = document.querySelector(`[data-panel="${currentPanelId}"]`);
  const nextPanel = document.querySelector(`[data-panel="${nextPanelId}"]`);
  const parent = currentPanel?.parentElement;
  if (!currentPanel || !nextPanel || !parent || nextPanel.parentElement !== parent) return;

  const targetWasHidden = nextPanel.classList.contains("is-hidden");
  const currentMarker = document.createComment("current-graph-panel");
  const nextMarker = document.createComment("next-graph-panel");
  parent.insertBefore(currentMarker, currentPanel);
  parent.insertBefore(nextMarker, nextPanel);
  parent.insertBefore(nextPanel, currentMarker);
  parent.insertBefore(currentPanel, nextMarker);
  currentMarker.remove();
  nextMarker.remove();

  nextPanel.classList.remove("is-hidden");
  currentPanel.classList.toggle("is-hidden", targetWasHidden);
  syncGraphPanelSwitcherValues();
  activePreset = "custom";
  updatePlotFitLayout();
  updatePanelToggleState();
  updatePresetButtonState();
  saveLayout();
  render({ animatePlots: true });
}

function syncGraphPanelSwitcherValues() {
  plotPanels.forEach(syncGraphPanelSwitcherValue);
}

function syncGraphPanelSwitcherValue(panel) {
  const select = panel?.querySelector(".plot-panel-select");
  if (!select || !panel?.dataset?.panel) return;
  select.value = panel.dataset.panel;
}

function currentPlotPanelSize(panel) {
  const grid = panel?.closest(".plot-grid");
  const panelRect = panel?.getBoundingClientRect();
  const gridRect = grid?.getBoundingClientRect();
  if (panelRect && gridRect?.width > 0 && panelRect.width > 0 && panelRect.height > 0) {
    return normalizePlotSize({
      widthPct: (panelRect.width / gridRect.width) * 100,
      heightPx: panelRect.height,
    });
  }
  return plotSizeForPanel(panel?.dataset?.panel);
}

function bindSidebarTabs() {
  window.addEventListener("cabio:sidebar-panel-change", (event) => {
    const panelId = event.detail?.panelId;
    if (!panelId) return;
    setActiveSidebarPanel(panelId, { syncSvelte: false });
  });
}

function setActiveSidebarPanel(panelId, { syncSvelte = true } = {}) {
  sidebarTabs.forEach((button) => {
    button.classList.toggle("active", button.dataset.sidebarTab === panelId);
  });
  sidebarPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.sidebarPanel === panelId);
  });
  if (syncSvelte) {
    window.dispatchEvent(new CustomEvent("cabio:sidebar-panel-sync", { detail: { panelId } }));
  }
  updatePillIndicators();
  applyWorkModeView(panelId);
}

function initializeThemeControls() {
  hydrateThemeButtons();
  window.addEventListener("cabio:theme-choice-change", (event) => {
    setThemePreference(event.detail?.choice);
  });
  systemThemeQuery.addEventListener("change", () => {
    if (themePreference !== "sync") return;
    applyThemePreference(themePreference);
    render();
  });
}

function setThemePreference(choice) {
  if (isMobileLayout()) choice = "sync";
  if (!THEME_CHOICES.includes(choice)) return;
  if (choice === themePreference) {
    hydrateThemeButtons();
    return;
  }
  themePreference = choice;
  writeStringStorage(THEME_STORAGE_KEY, themePreference);
  applyThemePreference(themePreference);
  hydrateThemeButtons();
  render();
  updatePillIndicatorsSoon();
}

function applyThemePreference(choice) {
  const resolvedTheme = choice === "sync" ? (systemThemeQuery.matches ? "light" : "dark") : choice;
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.dataset.themeChoice = choice;
  recordingSpectrogramInitialized = false;
}

function hydrateThemeButtons() {
  themeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.themeChoice === themePreference);
  });
  window.dispatchEvent(new CustomEvent("cabio:theme-choice-sync", { detail: { choice: themePreference } }));
}

function readThemePreference() {
  const saved = readStringStorage(THEME_STORAGE_KEY, "sync");
  return THEME_CHOICES.includes(saved) ? saved : "sync";
}

function initializeLibraryControls() {
  const driverControls = getLibraryControls("driver");
  const passiveRadiatorControls = getLibraryControls("passiveRadiator");
  populateLibraryBrandFilter(driverControls.brand, driverLibrary, "driver", libraryControlPrefs.driverBrand || "");
  populateLibraryBrandFilter(passiveRadiatorControls.brand, passiveRadiatorLibrary, "passiveRadiator", libraryControlPrefs.passiveRadiatorBrand || "");
  if (driverControls.sort) driverControls.sort.value = libraryControlPrefs.driverSort || "name-asc";
  setLibraryFilterSwitchState(driverControls.filterEnabled, Boolean(libraryControlPrefs.driverFilterEnabled));
  if (driverControls.diameter) driverControls.diameter.value = libraryControlPrefs.driverDiameter || "";
  if (passiveRadiatorControls.sort) passiveRadiatorControls.sort.value = libraryControlPrefs.passiveRadiatorSort || "name-asc";
  setLibraryFilterSwitchState(passiveRadiatorControls.filterEnabled, Boolean(libraryControlPrefs.passiveRadiatorFilterEnabled));
  if (passiveRadiatorControls.diameter) passiveRadiatorControls.diameter.value = libraryControlPrefs.passiveRadiatorDiameter || "";
  updateLibraryFilterControlState("driver");
  updateLibraryFilterControlState("passiveRadiator");
}

function getLibraryControls(kind) {
  const isPassiveRadiator = kind === "passiveRadiator";
  return {
    filter: document.querySelector(isPassiveRadiator ? "#passiveRadiatorLibraryFilter" : "#driverLibraryFilter"),
    sort: document.querySelector(isPassiveRadiator ? "#passiveRadiatorLibrarySort" : "#driverLibrarySort"),
    filterEnabled: document.querySelector(isPassiveRadiator ? "#passiveRadiatorLibraryFilterEnabled" : "#driverLibraryFilterEnabled"),
    brand: document.querySelector(isPassiveRadiator ? "#passiveRadiatorLibraryBrand" : "#driverLibraryBrand"),
    diameter: document.querySelector(isPassiveRadiator ? "#passiveRadiatorLibraryDiameter" : "#driverLibraryDiameter"),
  };
}

function populateLibraryBrandFilter(select, entries, kind, selectedValue = select?.value || "") {
  const brands = [...new Set(entries.map((entry) => libraryBrand(entry, kind)).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" }))
    .map((brand) => ({ value: brand, label: brand }));
  const options = [{ value: "", label: "Any brand" }, ...brands];
  const resolvedValue = options.some((option) => option.value === selectedValue) ? selectedValue : "";
  window.dispatchEvent(new CustomEvent("cabio:library-brand-options-sync", {
    detail: {
      kind: kind === "passiveRadiator" ? "passive-radiator" : "driver",
      options,
      selectedValue: resolvedValue,
    },
  }));
}

function readLibraryControlPrefs() {
  const parsed = readJsonStorage(LIBRARY_CONTROLS_STORAGE_KEY, {});
  return parsed && typeof parsed === "object" ? parsed : {};
}

function saveLibraryControlPrefs() {
  writeJsonStorage(LIBRARY_CONTROLS_STORAGE_KEY, libraryControlPrefs);
}

function setLibraryFilterSwitchState(control, enabled) {
  control?.setAttribute("aria-checked", enabled ? "true" : "false");
  const kind = control?.id === "passiveRadiatorLibraryFilterEnabled" ? "passive-radiator" : "driver";
  window.dispatchEvent(new CustomEvent("cabio:library-filter-sync", { detail: { kind, enabled } }));
}

function isLibraryFilterSwitchEnabled(control) {
  return control?.getAttribute("aria-checked") === "true";
}

function isSwitchActivationKey(event) {
  return event.key === "Enter" || event.key === " ";
}

async function toggleDriverLibraryFilters() {
  await ensureDriverLibraryLoaded();
  const { filterEnabled } = getLibraryControls("driver");
  const enabled = !isLibraryFilterSwitchEnabled(filterEnabled);
  setLibraryFilterSwitchState(filterEnabled, enabled);
  libraryControlPrefs.driverFilterEnabled = enabled;
  saveLibraryControlPrefs();
  updateLibraryFilterControlState("driver");
  renderDriverSelect();
}

async function togglePassiveRadiatorLibraryFilters() {
  await ensurePassiveRadiatorLibraryLoaded();
  const { filterEnabled } = getLibraryControls("passiveRadiator");
  const enabled = !isLibraryFilterSwitchEnabled(filterEnabled);
  setLibraryFilterSwitchState(filterEnabled, enabled);
  libraryControlPrefs.passiveRadiatorFilterEnabled = enabled;
  saveLibraryControlPrefs();
  updateLibraryFilterControlState("passiveRadiator");
  renderPassiveRadiatorSelect();
}

function updateLibraryFilterControlState(kind) {
  const controls = getLibraryControls(kind);
  const enabled = isLibraryFilterSwitchEnabled(controls.filterEnabled);
  [controls.brand, controls.diameter].forEach((control) => {
    if (control) control.disabled = !enabled;
  });
}

function syncMobileThemePreference() {
  if (!isMobileLayout() || themePreference === "sync") return;
  themePreference = "sync";
  writeStringStorage(THEME_STORAGE_KEY, themePreference);
}

function isMobileLayout() {
  return !isGoldenLayoutPopoutWindow() && mobileMediaQuery.matches;
}

function initializePillTransitions() {
  pillTabGroups.forEach((group) => {
    group.classList.add("pill-track");
  });
  window.addEventListener("resize", updatePillIndicatorsSoon);
}

function updatePillIndicatorsSoon() {
  if (pillUpdateFrame) window.cancelAnimationFrame(pillUpdateFrame);
  pillUpdateFrame = window.requestAnimationFrame(() => {
    pillUpdateFrame = null;
    updatePillIndicators();
  });
}

function updatePillIndicators() {
  pillTabGroups.forEach((group) => {
    const indicator = group.querySelector(":scope > .pill-indicator");
    const activeButton = [...group.querySelectorAll(":scope > button.active")][0];
    if (!indicator) return;
    if (!activeButton) {
      indicator.style.opacity = "0";
      return;
    }

    const groupRect = group.getBoundingClientRect();
    const activeRect = activeButton.getBoundingClientRect();
    const isVisible = groupRect.width > 0 && groupRect.height > 0 && activeRect.width > 0 && activeRect.height > 0;
    indicator.style.opacity = isVisible ? "1" : "0";
    if (!isVisible) return;

    const nextLeft = `${activeRect.left - groupRect.left}px`;
    const nextTop = `${activeRect.top - groupRect.top}px`;
    const nextWidth = `${activeRect.width}px`;
    const nextHeight = `${activeRect.height}px`;

    group.style.setProperty("--pill-left", nextLeft);
    group.style.setProperty("--pill-top", nextTop);
    group.style.setProperty("--pill-width", nextWidth);
    group.style.setProperty("--pill-height", nextHeight);
  });
}

function bindEvents() {
  fields.forEach((field) => {
    if (field.dataset.svelteField === "true") return;
    field.addEventListener("input", () => {
      commitEditableField(field);
    });
    if (isNumericInput(field)) {
      field.addEventListener("blur", () => hydrateField(field));
    }
  });

  rangeFields.forEach((field) => {
    if (field.dataset.svelteRange === "true") return;
    field.addEventListener("input", () => {
      commitRangeField(field);
    });
  });

  window.addEventListener("cabio:box-mode-change", (event) => {
    setBoxMode(event.detail?.mode);
  });

  window.addEventListener("cabio:config-bar-request", () => renderConfigBar());
  window.addEventListener("cabio:config-action", handleConfigAction);
  window.addEventListener("cabio:driver-group-action", handleDriverGroupAction);

  window.addEventListener("cabio:library-action", handleLibraryAction);
  window.addEventListener("cabio:crossover-control-action", handleCrossoverControlAction);
  window.addEventListener("cabio:project-action", handleProjectAction);
  window.addEventListener("cabio:field-action", handleFieldAction);
  window.addEventListener("cabio:driver-health-action", handleDriverHealthAction);
  window.addEventListener("cabio:plot-toolbar-action", handlePlotToolbarAction);
  window.addEventListener("cabio:measurement-action", handleMeasurementAction);
  window.addEventListener("cabio:recording-action", handleRecordingAction);
  navigator.mediaDevices?.addEventListener?.("devicechange", () => hydrateRecordingDeviceOptions());

  window.addEventListener("popstate", (event) => {
    const project = event.state?.project;
    if (!project) return;
    state = normalizeProjectState(project);
    saveProjectState(state);
    historyIndex = Number(event.state.index) || 0;
    hydrateFields();
    render();
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeConfigChipMenus();
    if (!isUndoShortcut(event) || historyIndex <= 0) return;
    event.preventDefault();
    history.back();
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest(".config-chip-menu")) return;
    closeConfigChipMenus();
    if (configAddMenu && !event.target.closest("#configAddMenu")) configAddMenu.open = false;
  });

  configBarList.addEventListener("pointerdown", (event) => {
    const button = event.target.closest(".config-menu-button");
    if (!button || !configBarList.contains(button)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const menu = button.closest(".config-chip-menu");
    if (!menu) return;
    menu.dataset.pointerToggled = "true";
    toggleConfigChipMenu(menu, button);
  }, true);

  configBarList.addEventListener("click", (event) => {
    const button = event.target.closest(".config-menu-button");
    if (!button || !configBarList.contains(button)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const menu = button.closest(".config-chip-menu");
    if (menu?.dataset.pointerToggled === "true") {
      delete menu.dataset.pointerToggled;
      return;
    }
    if (menu) toggleConfigChipMenu(menu, button);
  }, true);

  configBarList.addEventListener("dragstart", handleConfigChipDragStart);
  configBarList.addEventListener("dragover", handleConfigChipDragOver);
  configBarList.addEventListener("dragleave", handleConfigChipDragLeave);
  configBarList.addEventListener("drop", handleConfigChipDrop);
  configBarList.addEventListener("dragend", handleConfigChipDragEnd);
  configBarList.addEventListener("pointerdown", handleConfigChipPointerDown);
  measurementList?.addEventListener("dragstart", handleMeasurementChipDragStart);
  measurementList?.addEventListener("dragover", handleMeasurementChipDragOver);
  measurementList?.addEventListener("dragleave", handleMeasurementChipDragLeave);
  measurementList?.addEventListener("drop", handleMeasurementChipDrop);
  measurementList?.addEventListener("dragend", handleMeasurementChipDragEnd);
  measurementList?.addEventListener("pointerdown", handleMeasurementChipPointerDown);

  window.addEventListener("resize", () => {
    updateMobileToolbarOffset();
    document.querySelectorAll(".config-chip-menu.open").forEach(positionConfigChipMenu);
    if (document.querySelector(".config-chip-menu.open")) return;
    render();
  });
}

function initializeUnitControls() {
  fields.forEach((field) => {
    const units = UNIT_GROUPS[field.dataset.unitType];
    if (!units) return;
    const fieldPath = getFieldPath(field);
    window.dispatchEvent(new CustomEvent("cabio:unit-select-sync", {
      detail: { fieldPath, unitId: unitPrefs[fieldPath] || units[0].id },
    }));
    applyFieldStep(field);
  });
}

function initializePortLockControls() {
  hydratePortLockButtons();
}

function setPortLockField(fieldPath) {
  portLockField = portLockField === fieldPath ? DEFAULT_PORT_LOCK_FIELD : fieldPath;
  if (!PORT_FIELDS.includes(portLockField)) portLockField = DEFAULT_PORT_LOCK_FIELD;
  if (portLockField) {
    writeStringStorage(PORT_LOCK_STORAGE_KEY, portLockField);
  } else {
    removeStorageItem(PORT_LOCK_STORAGE_KEY);
  }
  hydratePortLockButtons();
}

function hydratePortLockButtons() {
  window.dispatchEvent(new CustomEvent("cabio:port-lock-sync", {
    detail: { fieldPath: portLockField },
  }));
}

function readPortLockField() {
  const fieldPath = readStringStorage(PORT_LOCK_STORAGE_KEY, DEFAULT_PORT_LOCK_FIELD);
  return PORT_FIELDS.includes(fieldPath) ? fieldPath : DEFAULT_PORT_LOCK_FIELD;
}

function readUnitPrefs() {
  return readJsonStorage(UNIT_PREF_STORAGE_KEY, {});
}

function readSavedProjectState() {
  const savedProject = readJsonStorage(PROJECT_STORAGE_KEY);
  return savedProject ? normalizeProjectState(savedProject) : cloneProject(sampleProject);
}

function saveProjectState(project) {
  if (writeJsonStorage(PROJECT_STORAGE_KEY, cloneProject(project), "Could not save project state.")) {
    broadcastProjectState(project);
  }
}

function readCrossoverUiState() {
  const saved = readJsonStorage(CROSSOVER_UI_STORAGE_KEY, {});
  const selectedCrossoverDesignIds = saved?.selectedCrossoverDesignIds && typeof saved.selectedCrossoverDesignIds === "object"
    ? saved.selectedCrossoverDesignIds
    : {};
  return {
    activeGroupId: typeof saved?.activeGroupId === "string" ? saved.activeGroupId : "",
    selectedCrossoverDesignIds,
  };
}

function saveCrossoverUiState() {
  crossoverUiState.activeGroupId = activeCrossoverGroupId || "";
  writeJsonStorage(CROSSOVER_UI_STORAGE_KEY, crossoverUiState, "Could not save crossover UI state.");
}

function setActiveCrossoverGroupId(groupId) {
  activeCrossoverGroupId = groupId || "";
  saveCrossoverUiState();
}

function getSelectedCrossoverDesignId(groupId) {
  if (!groupId) return "";
  return crossoverUiState.selectedCrossoverDesignIds?.[groupId] || "";
}

function setSelectedCrossoverDesignId(groupId, designId) {
  if (!groupId) return;
  crossoverUiState.selectedCrossoverDesignIds = crossoverUiState.selectedCrossoverDesignIds || {};
  if (designId) {
    crossoverUiState.selectedCrossoverDesignIds[groupId] = designId;
  } else {
    delete crossoverUiState.selectedCrossoverDesignIds[groupId];
  }
  saveCrossoverUiState();
}

function getSelectedUnit(field) {
  const units = UNIT_GROUPS[field.dataset.unitType];
  if (!units) return null;
  const fieldPath = getFieldPath(field);
  const localUnitSelect = field.parentElement?.querySelector(`.unit-select[data-unit-for="${cssEscape(fieldPath)}"]`);
  const selectedId = localUnitSelect?.value || document.querySelector(`.unit-select[data-unit-for="${cssEscape(fieldPath)}"]`)?.value || units[0].id;
  return units.find((unit) => unit.id === selectedId) || units[0];
}

function getFieldPath(field) {
  return field.dataset.field || field.dataset.derivedField;
}

function getRangeFieldPath(field) {
  return field.dataset.rangeField || field.dataset.derivedRangeField;
}

function commitEditableField(field) {
  if (!field) return;
  if (isNumericInput(field) && !Number.isFinite(inputToBaseValue(field))) return;
  const nextState = cloneProject(state);
  const fieldPath = getFieldPath(field);
  applyEditableValue(nextState, fieldPath, inputToBaseValue(field));
  if (fieldPath.startsWith("box.")) syncActiveDesignFromProject(nextState);
  commitState(nextState, { hydrate: shouldHydrateAfterFieldEdit(field, fieldPath) });
}

function commitRangeField(field) {
  if (!field) return;
  const nextState = cloneProject(state);
  const fieldPath = getRangeFieldPath(field);
  applyEditableValue(nextState, fieldPath, rangeInputToBaseValue(field));
  if (fieldPath.startsWith("box.")) syncActiveDesignFromProject(nextState);
  commitState(nextState, { hydrate: true, replaceHistory: true });
}

function handleFieldAction(event) {
  const action = event.detail?.action;
  if (action === "unit-change") {
    const fieldPath = event.detail?.field || event.detail?.derivedField;
    const field = event.detail?.inputElement
      || (fieldPath ? document.querySelector(`[data-field="${cssEscape(fieldPath)}"], [data-derived-field="${cssEscape(fieldPath)}"]`) : null);
    const unitSelect = event.detail?.element;
    if (!fieldPath || !unitSelect) return;
    unitPrefs[fieldPath] = unitSelect.value;
    writeJsonStorage(UNIT_PREF_STORAGE_KEY, unitPrefs);
    if (field) {
      applyFieldStep(field);
      hydrateField(field);
    }
    return;
  }
  if (action === "toggle-port-lock") {
    if (event.detail?.field) setPortLockField(event.detail.field);
    return;
  }
  if (action === "editable-field-input") {
    commitEditableField(event.detail.element);
    return;
  }
  if (action === "editable-field-blur") {
    if (isNumericInput(event.detail.element)) hydrateField(event.detail.element);
    return;
  }
  if (action === "range-field-input") {
    commitRangeField(event.detail.element);
    return;
  }
  if (action === "recording-settings-change") {
    updateRecordingSettingsFromControls();
    return;
  }
  if (action === "hydrate-recording-devices") hydrateRecordingDeviceOptions();
}

function handleDriverHealthAction(event) {
  const detail = event.detail || {};
  if (detail.action !== "fill-derived") return;
  if (!detail.fieldPath || !Number.isFinite(Number(detail.value))) return;
  applyDerivedDriverParameter(detail.fieldPath, Number(detail.value));
}

function handlePlotToolbarAction(event) {
  const detail = event.detail || {};
  if (detail.action === "reset-panel") {
    resetGraphPanelView(detail.panelId);
    return;
  }
  if (detail.action === "replace-panel") {
    replaceGraphPanel(detail.panelId, detail.nextPanelId);
    return;
  }
  if (detail.action === "axis-input") {
    queuePlotAxisInput(detail.plotId, detail.key, detail.element);
    return;
  }
  if (detail.action === "axis-change") {
    plotViewController.commitPlotAxisInput(detail.plotId, detail.key, detail.element);
    return;
  }
  if (detail.action === "axis-mode") setPlotAxisMode(detail.plotId, detail.mode);
}

function handleCrossoverControlAction(event) {
  const action = event.detail?.action;
  if (action === "select-group") {
    setActiveCrossoverGroupId(event.detail.groupId || "");
    renderCrossoverControls();
    return;
  }
  if (action === "select-member") {
    activateDesign(event.detail.designId);
    return;
  }
  if (action === "add-filter") {
    addSignalFilter(signalFilterTypeSelect?.value || "parametric");
    return;
  }
  if (action === "select-filter-type") updateSignalFilterAddButton();
}

function handleRecordingAction(event) {
  const action = event.detail?.action;
  if (action === "sync-run-fields") {
    syncStagedRecordingRunFields();
    return;
  }
  if (action === "record") {
    recordFrequencyResponse();
    return;
  }
  if (action === "test-tone") {
    playRecordingTestTone();
    return;
  }
  if (action === "save-run") saveStagedRecording();
}

async function handleMeasurementAction(event) {
  const action = event.detail?.action;
  if (action === "import-frequency-response" && event.detail.file) {
    await importFrequencyResponseFile(event.detail.file);
  }
}

async function handleLibraryAction(event) {
  const action = event.detail?.action;
  if (action === "ensure-driver-library") {
    await ensureDriverLibraryLoaded();
    return;
  }
  if (action === "select-driver") {
    await ensureDriverLibraryLoaded();
    const selectedId = event.detail?.id || driverSelect.value;
    const selected = driverLibrary.find((driver) => driver.id === selectedId);
    if (selected) applyKnownDriver(selected);
    return;
  }
  if (action === "driver-filter-input") {
    await ensureDriverLibraryLoaded();
    renderDriverSelect();
    return;
  }
  if (action === "driver-brand-change") {
    await ensureDriverLibraryLoaded();
    libraryControlPrefs.driverBrand = getLibraryControls("driver").brand?.value || "";
    saveLibraryControlPrefs();
    renderDriverSelect();
    return;
  }
  if (action === "driver-diameter-change") {
    await ensureDriverLibraryLoaded();
    libraryControlPrefs.driverDiameter = getLibraryControls("driver").diameter?.value || "";
    saveLibraryControlPrefs();
    renderDriverSelect();
    return;
  }
  if (action === "ensure-passive-radiator-library") {
    await ensurePassiveRadiatorLibraryLoaded();
    return;
  }
  if (action === "select-passive-radiator") {
    await ensurePassiveRadiatorLibraryLoaded();
    const selected = passiveRadiatorLibrary.find((passiveRadiator) => passiveRadiator.id === passiveRadiatorSelect.value);
    if (selected) applyKnownPassiveRadiator(selected);
    return;
  }
  if (action === "passive-radiator-brand-change") {
    await ensurePassiveRadiatorLibraryLoaded();
    libraryControlPrefs.passiveRadiatorBrand = getLibraryControls("passiveRadiator").brand?.value || "";
    saveLibraryControlPrefs();
    renderPassiveRadiatorSelect();
    return;
  }
  if (action === "passive-radiator-diameter-change") {
    await ensurePassiveRadiatorLibraryLoaded();
    libraryControlPrefs.passiveRadiatorDiameter = getLibraryControls("passiveRadiator").diameter?.value || "";
    saveLibraryControlPrefs();
    renderPassiveRadiatorSelect();
    return;
  }
  if (action === "toggle-driver-filters") {
    await toggleDriverLibraryFilters();
    return;
  }
  if (action === "toggle-passive-radiator-filters") {
    await togglePassiveRadiatorLibraryFilters();
    return;
  }
  if (action === "driver-search") {
    searchDriverSpecs();
    return;
  }
  if (action === "passive-radiator-search") {
    searchPassiveRadiatorSpecs();
  }
}

function handleConfigAction(event) {
  const action = event.detail?.action;
  if (action === "new-config") {
    createDesignFromCurrentProject();
    return;
  }
  if (action === "new-group") {
    createConfigGroup();
    return;
  }
  if (action === "activate-design") {
    activateDesign(event.detail.designId);
    return;
  }
  if (action === "rename-group") {
    updateConfigGroup(event.detail.groupId, { name: event.detail.value.trim() || event.detail.fallback || "Config group" });
    return;
  }
  if (action === "toggle-group-combined") {
    updateConfigGroup(event.detail.groupId, { showCombined: event.detail.showCombined === true });
    return;
  }
  if (action === "delete-group") {
    deleteConfigGroup(event.detail.groupId);
    return;
  }
  if (action === "set-design-visible") {
    setDesignVisibility(event.detail.designId, event.detail.visible === true);
    return;
  }
  if (action === "set-design-graph-visible") {
    setDesignGraphVisibility(event.detail.designId, event.detail.visible === true);
    return;
  }
  if (action === "rename-active-design") {
    renameActiveDesign(event.detail.value || "");
    return;
  }
  if (action === "assign-design-group") {
    assignDesignToConfigGroup(event.detail.designId, event.detail.groupId);
    return;
  }
  if (action === "set-design-color") {
    setDesignColor(event.detail.designId, event.detail.color || "");
    return;
  }
  if (action === "duplicate-design") {
    duplicateDesign(event.detail.designId);
    return;
  }
  if (action === "delete-design") {
    deleteDesign(event.detail.designId);
  }
}

function handleDriverGroupAction(event) {
  const action = event.detail?.action;
  const groupId = event.detail?.groupId;
  if (action === "add") {
    addDriverGroup();
    return;
  }
  if (action === "activate") {
    activateDriverGroup(groupId);
    return;
  }
  if (action === "duplicate") {
    duplicateDriverGroup(groupId);
    return;
  }
  if (action === "remove") {
    deleteDriverGroup(groupId);
    return;
  }
  if (action === "update-name") {
    updateDriverGroup(groupId, { name: event.detail.value.trim() || event.detail.fallback || "Driver group" });
    return;
  }
  if (action === "select-driver") {
    updateDriverGroupDriver(groupId, event.detail.driverId);
    return;
  }
  if (action === "update-count") {
    const value = Number(event.detail.value);
    if (Number.isFinite(value)) updateDriverGroup(groupId, { count: value });
    return;
  }
  if (action === "update-wiring") {
    updateDriverGroup(groupId, { wiring: event.detail.value === "series" ? "series" : "parallel" });
  }
}

function handleProjectAction(event) {
  const action = event.detail?.action;
  if (action === "open-import-export") {
    openImportExportDialog();
    return;
  }
  if (action === "close-import-export") {
    importExportDialog.close();
    return;
  }
  if (action === "export-project") {
    exportProjectJson();
    return;
  }
  if (action === "apply-project-json") {
    importProjectJson(projectJson.value);
    return;
  }
  if (action === "import-project-file" && event.detail.file) {
    event.detail.file.text().then(importProjectJson);
  }
}

function setBoxMode(mode) {
  if (!mode || state.mode === mode) return;
  const nextState = cloneProject(state);
  nextState.mode = mode;
  if (nextState.mode === "bandpass") updateBandpassPortLengths(nextState);
  syncActiveDesignFromProject(nextState);
  commitState(nextState, { animatePlots: true });
  if (activeSidebarPanelId() === "planning") applyWorkModeView("planning");
}

function isLogRangeField(field) {
  return field.dataset.rangeScale === "log";
}

function rangeBounds(field) {
  const min = Number(field.dataset.baseMin ?? field.min);
  const max = Number(field.dataset.baseMax ?? field.max);
  return {
    min: Number.isFinite(min) && min > 0 ? min : 1,
    max: Number.isFinite(max) && max > 0 ? max : 1,
  };
}

function rangeInputToBaseValue(field) {
  if (!isLogRangeField(field)) return Number(field.value);
  const { min, max } = rangeBounds(field);
  const position = clampNumber(Number(field.value) || 0, 0, 1000) / 1000;
  return roundTo(min * ((max / min) ** position), 3);
}

function baseValueToRangeInput(field, value) {
  if (!isLogRangeField(field)) return value;
  const { min, max } = rangeBounds(field);
  const clampedValue = clampNumber(Number(value) || min, min, max);
  return roundTo((Math.log(clampedValue / min) / Math.log(max / min)) * 1000, 3);
}

function configureRangeField(field) {
  if (!isLogRangeField(field) || field.dataset.logRangeConfigured === "true") return;
  field.dataset.baseMin = field.min;
  field.dataset.baseMax = field.max;
  field.min = "0";
  field.max = "1000";
  field.step = "1";
  field.dataset.logRangeConfigured = "true";
}

function inputToBaseValue(field) {
  if (field.type === "checkbox") return field.checked;
  if (isNumericInput(field)) {
    const raw = parseNumericInputValue(field);
    const unit = getSelectedUnit(field);
    return unit ? unit.toBase(raw) : raw;
  }
  if (field.tagName === "SELECT" || field.type === "text" || field.type === "search") return field.value;
  const raw = Number(field.value);
  const unit = getSelectedUnit(field);
  return unit ? unit.toBase(raw) : raw;
}

function baseToInputValue(field, value) {
  const unit = getSelectedUnit(field);
  const displayValue = unit ? unit.fromBase(Number(value)) : Number(value);
  return formatInputValue(displayValue);
}

function applyFieldStep(field) {
  const unit = getSelectedUnit(field);
  if (unit?.step) field.step = unit.step;
}

function shouldHydrateAfterFieldEdit(field, fieldPath) {
  return Boolean(field.dataset.derivedField)
    || PORT_FIELDS.includes(fieldPath)
    || fieldPath === "box.volumeL"
    || fieldPath === "box.bandpass.order"
    || fieldPath === "box.bandpass.frontVolumeL"
    || fieldPath === "box.bandpass.rearVolumeL"
    || fieldPath === "box.portEndCorrection"
    || fieldPath === "box.driverCount"
    || fieldPath === "box.driverWiring"
    || fieldPath === "driver.minFrequencyHz";
}

function applyEditableValue(project, fieldPath, value) {
  if (fieldPath === "box.volumeTuningHz") {
    return;
  }

  if (PORT_FIELDS.includes(fieldPath)) {
    applyPortFieldValue(project, fieldPath, value);
    return;
  }

  if (fieldPath.startsWith("driver.")) {
    setPath(project, fieldPath, value);
    if (fieldPath === "driver.minFrequencyHz" && Number(value) > 0 && (!Number(project.box?.highPassHz) || Number(project.box.highPassHz) <= 0)) {
      project.box.highPassHz = value;
      project.box.highPassOrder = Number(project.box.highPassOrder) > 0 ? project.box.highPassOrder : 2;
    }
    syncActiveDriverGroupFromProject(project);
    syncActiveDesignFromProject(project);
    return;
  }

  if (fieldPath === "box.volumeL") {
    setPath(project, fieldPath, value);
    if (project.mode === "vented") setPortLengthFromTuning(project, project.box.fb, completeBox(project.box));
    return;
  }

  if (fieldPath === "box.bandpass.frontVolumeL" || fieldPath === "box.bandpass.rearVolumeL" || fieldPath === "box.bandpass.order") {
    setPath(project, fieldPath, value);
    updateBandpassPortLengths(project);
    return;
  }

  if (fieldPath === "box.portEndCorrection") {
    setPath(project, fieldPath, value);
    if (project.mode === "vented") setPortLengthFromTuning(project, project.box.fb);
    if (project.mode === "bandpass") updateBandpassPortLengths(project);
    return;
  }

  if (fieldPath === "box.driverCount" || fieldPath === "box.driverWiring") {
    setPath(project, fieldPath, value);
    project.box = completeBox(project.box);
    syncActiveDriverGroupArrayFromBox(project);
    syncActiveDesignFromProject(project);
    return;
  }

  if (fieldPath === "box.passiveRadiator.diameterCm") {
    setPassiveRadiatorAreaFromDiameter(project, value);
    return;
  }

  setPath(project, fieldPath, value);
}

function applyPortFieldValue(project, editedFieldPath, value) {
  if (editedFieldPath.startsWith("box.bandpass.")) {
    applyBandpassPortFieldValue(project, editedFieldPath, value);
    return;
  }

  const box = completeBox(project.box);

  if (editedFieldPath === "box.fb") {
    project.box.fb = value;
    setPortLengthFromTuning(project, value, box);
    return;
  }

  if (editedFieldPath === "box.portCount") {
    project.box.portCount = Math.max(1, Math.min(12, Math.round(Number(value) || 1)));
    setPortLengthFromTuning(project, project.box.fb, completeBox(project.box));
    return;
  }

  if (editedFieldPath === "box.portShape") {
    project.box.portShape = normalizePortShape(value);
    setPortLengthFromTuning(project, project.box.fb, completeBox(project.box));
    return;
  }

  if (editedFieldPath === "box.portDiameterCm") {
    project.box.portDiameterCm = value;
    setPortLengthFromTuning(project, project.box.fb, completeBox(project.box));
    return;
  }

  if (editedFieldPath === "box.portWidthCm" || editedFieldPath === "box.portHeightCm") {
    setPath(project, editedFieldPath, value);
    setPortLengthFromTuning(project, project.box.fb, completeBox(project.box));
    return;
  }

  if (editedFieldPath === "box.portLengthCm") {
    project.box.portLengthCm = value;
    setTuningFromPortLength(project, value, box);
  }
}

function applyBandpassPortFieldValue(project, editedFieldPath, value) {
  project.box = completeBox(project.box);

  if (editedFieldPath === "box.bandpass.frontFb") {
    project.box.bandpass.frontFb = value;
    setBandpassPortLengthFromTuning(project, "front");
    return;
  }
  if (editedFieldPath === "box.bandpass.frontPortCount") {
    project.box.bandpass.frontPortCount = Math.max(1, Math.min(12, Math.round(Number(value) || 1)));
    setBandpassPortLengthFromTuning(project, "front");
    return;
  }
  if (editedFieldPath === "box.bandpass.frontPortDiameterCm") {
    project.box.bandpass.frontPortDiameterCm = value;
    setBandpassPortLengthFromTuning(project, "front");
    return;
  }
  if (editedFieldPath === "box.bandpass.frontPortLengthCm") {
    project.box.bandpass.frontPortLengthCm = value;
    setBandpassTuningFromPortLength(project, "front");
    return;
  }
  if (editedFieldPath === "box.bandpass.rearFb") {
    project.box.bandpass.rearFb = value;
    setBandpassPortLengthFromTuning(project, "rear");
    return;
  }
  if (editedFieldPath === "box.bandpass.rearPortCount") {
    project.box.bandpass.rearPortCount = Math.max(1, Math.min(12, Math.round(Number(value) || 1)));
    setBandpassPortLengthFromTuning(project, "rear");
    return;
  }
  if (editedFieldPath === "box.bandpass.rearPortDiameterCm") {
    project.box.bandpass.rearPortDiameterCm = value;
    setBandpassPortLengthFromTuning(project, "rear");
    return;
  }
  if (editedFieldPath === "box.bandpass.rearPortLengthCm") {
    project.box.bandpass.rearPortLengthCm = value;
    setBandpassTuningFromPortLength(project, "rear");
  }
}

function updateBandpassPortLengths(project) {
  project.box = completeBox(project.box);
  setBandpassPortLengthFromTuning(project, "front");
  setBandpassPortLengthFromTuning(project, "rear");
}

function setBandpassPortLengthFromTuning(project, side) {
  const box = completeBox(project.box);
  const bandpass = box.bandpass;
  const volumeL = side === "front" ? bandpass.frontVolumeL : bandpass.rearVolumeL;
  const fb = side === "front" ? bandpass.frontFb : bandpass.rearFb;
  const diameterCm = side === "front" ? bandpass.frontPortDiameterCm : bandpass.rearPortDiameterCm;
  const count = side === "front" ? bandpass.frontPortCount : bandpass.rearPortCount;
  const port = portLengthFromTuning(volumeL, fb, diameterCm, box.portEndCorrection, count);
  if (!Number.isFinite(port.physicalLength)) return;
  project.box.bandpass[side === "front" ? "frontPortLengthCm" : "rearPortLengthCm"] = roundTo(port.physicalLength * 100, 3);
}

function setBandpassTuningFromPortLength(project, side) {
  const box = completeBox(project.box);
  const bandpass = box.bandpass;
  const volumeL = side === "front" ? bandpass.frontVolumeL : bandpass.rearVolumeL;
  const diameterCm = side === "front" ? bandpass.frontPortDiameterCm : bandpass.rearPortDiameterCm;
  const lengthCm = side === "front" ? bandpass.frontPortLengthCm : bandpass.rearPortLengthCm;
  const count = side === "front" ? bandpass.frontPortCount : bandpass.rearPortCount;
  const fb = tuningFromPortLength(volumeL, diameterCm, lengthCm, box.portEndCorrection, count);
  if (!Number.isFinite(fb)) return;
  project.box.bandpass[side === "front" ? "frontFb" : "rearFb"] = roundTo(fb, 3);
}

function setTuningFromPortLength(project, physicalLengthCm, box = completeBox(project.box)) {
  const fb = tuningFromPortLengthOptions(box.volumeL, physicalLengthCm, portOptionsFromBox(box));
  if (Number.isFinite(fb)) project.box.fb = roundTo(fb, 3);
}

function setPortLengthFromTuning(project, fb, box = completeBox(project.box)) {
  const port = portLengthFromTuningOptions(box.volumeL, fb, portOptionsFromBox(box));
  if (Number.isFinite(port.physicalLength)) project.box.portLengthCm = roundTo(port.physicalLength * 100, 3);
}

function derivedFieldValue(fieldPath, project = state) {
  if (fieldPath === "box.volumeTuningHz") {
    const box = completeBox(project.box);
    return tuningFromPortLengthOptions(box.volumeL, box.portLengthCm, portOptionsFromBox(box));
  }
  if (fieldPath === "box.portLengthCm") {
    const box = completeBox(project.box);
    return box.portLengthCm;
  }
  if (fieldPath === "box.passiveRadiator.diameterCm") {
    return passiveRadiatorDiameterFromArea(getPath(project, "box.passiveRadiator.sdCm2"));
  }
  if (fieldPath === "box.bandpass.frontPortLengthCm" || fieldPath === "box.bandpass.rearPortLengthCm") {
    const box = completeBox(project.box);
    return getPath({ box }, fieldPath);
  }
  return getPath(project, fieldPath);
}

function setPassiveRadiatorAreaFromDiameter(project, diameterCm) {
  const sdCm2 = passiveRadiatorAreaFromDiameter(diameterCm);
  if (Number.isFinite(sdCm2) && sdCm2 > 0) {
    project.box.passiveRadiator.sdCm2 = roundTo(sdCm2, 3);
  }
}

function normalizeProjectState(project) {
  return normalizeProjectModelState(project, {
    designNameFromDriver,
    normalizedDesignName,
  });
}

function getActiveDesign(project = state) {
  return getActiveDesignFromProject(project);
}

function getActiveDriverGroup(project = state) {
  return getActiveDriverGroupFromProject(project);
}

function syncActiveDesignFromProject(project) {
  return syncActiveDesignModelFromProject(project, {
    designNameFromBox,
    legacyDesignNameFromBox,
    designNameFromDriver,
    designDriverForName,
  });
}

function activateDesign(designId) {
  const selected = state.designs.find((design) => design.id === designId);
  if (!selected) return;
  setActiveCrossoverGroupId(selected.groupId || UNGROUPED_CROSSOVER_GROUP_ID);
  const nextState = cloneProject(state);
  nextState.activeDesignId = designId;
  applyActiveDesignToProject(nextState);
  commitState(nextState, { hydrate: true });
}

function createDesignFromCurrentProject() {
  const nextState = cloneProject(state);
  const activeDesign = getActiveDesign(nextState);
  const nextDriver = completeDriverParameters(sampleProject.driver, nextState.driver);
  const nextDriverGroups = cloneProject(nextState.driverGroups || []);
  const design = {
    id: createDesignId(),
    name: uniqueDesignName(nextState.designs, designNameFromDriver(designDriverForName({
      driver: nextDriver,
      driverGroups: nextDriverGroups,
      activeDriverGroupId: nextState.activeDriverGroupId,
    }))),
    groupId: activeDesign?.groupId ?? nextState.configGroups[0]?.id ?? UNGROUPED_CONFIG_GROUP_ID,
    mode: nextState.mode,
    visible: true,
    graphVisible: true,
    driver: nextDriver,
    driverGroups: nextDriverGroups,
    activeDriverGroupId: nextState.activeDriverGroupId,
    box: completeBox(nextState.box),
  };
  nextState.designs.push(design);
  nextState.activeDesignId = design.id;
  applyActiveDesignToProject(nextState);
  commitState(nextState, { hydrate: true });
}

function createConfigGroup() {
  const nextState = cloneProject(state);
  const group = {
    id: createConfigGroupId(),
    name: uniqueConfigGroupName(nextState.configGroups, "Config group"),
    showMembers: true,
    showCombined: true,
    crossover: normalizeGroupCrossover(),
  };
  nextState.configGroups.push(group);
  commitState(nextState, { hydrate: true });
}

function updateConfigGroup(groupId, patch) {
  const nextState = cloneProject(state);
  const group = nextState.configGroups.find((item) => item.id === groupId);
  if (!group) return;
  Object.assign(group, patch);
  commitState(nextState, { hydrate: true });
}

function deleteConfigGroup(groupId) {
  const nextState = cloneProject(state);
  nextState.configGroups = nextState.configGroups.filter((group) => group.id !== groupId);
  nextState.designs.forEach((design) => {
    if (design.groupId === groupId) design.groupId = UNGROUPED_CONFIG_GROUP_ID;
  });
  if (activeCrossoverGroupId === groupId) setActiveCrossoverGroupId("");
  commitState(nextState, { hydrate: true });
}

function assignDesignToConfigGroup(designId, groupId) {
  const nextGroupId = normalizeConfigGroupTarget(groupId);
  if (nextGroupId && !state.configGroups.some((group) => group.id === nextGroupId)) return;
  const nextState = cloneProject(state);
  const design = nextState.designs.find((item) => item.id === designId);
  if (!design) return;
  design.groupId = nextGroupId;
  commitState(nextState, { hydrate: true });
}

function normalizeConfigGroupTarget(groupId) {
  return groupId || UNGROUPED_CONFIG_GROUP_ID;
}

function moveDesignToConfigGroup(designId, groupId, beforeDesignId = "") {
  const nextGroupId = normalizeConfigGroupTarget(groupId);
  if (nextGroupId && !state.configGroups.some((group) => group.id === nextGroupId)) return;

  const nextState = cloneProject(state);
  const movingIndex = nextState.designs.findIndex((design) => design.id === designId);
  if (movingIndex < 0) return;

  const [movingDesign] = nextState.designs.splice(movingIndex, 1);
  movingDesign.groupId = nextGroupId;

  let insertIndex = -1;
  if (beforeDesignId && beforeDesignId !== designId) {
    insertIndex = nextState.designs.findIndex((design) => design.id === beforeDesignId);
  }
  if (insertIndex < 0) {
    insertIndex = designGroupEndIndex(nextState.designs, nextGroupId);
  }

  nextState.designs.splice(insertIndex, 0, movingDesign);
  commitState(nextState, { hydrate: true });
}

function designGroupEndIndex(designs, groupId) {
  let insertIndex = designs.length;
  designs.forEach((design, index) => {
    if ((design.groupId || UNGROUPED_CONFIG_GROUP_ID) === groupId) {
      insertIndex = index + 1;
    }
  });
  return insertIndex;
}

function duplicateActiveDesign() {
  duplicateDesign(state.activeDesignId);
}

function duplicateDesign(designId) {
  const nextState = cloneProject(state);
  const source = nextState.designs.find((design) => design.id === designId);
  if (!source) return;
  const design = {
    ...cloneProject(source),
    id: createDesignId(),
    name: uniqueDesignName(nextState.designs, `${source.name} copy`),
    visible: true,
    graphVisible: source.graphVisible !== false,
  };
  nextState.designs.push(design);
  nextState.activeDesignId = design.id;
  applyActiveDesignToProject(nextState);
  commitState(nextState, { hydrate: true });
}

function deleteActiveDesign() {
  deleteDesign(state.activeDesignId);
}

function deleteDesign(designId) {
  const nextState = cloneProject(state);
  const deletedActive = nextState.activeDesignId === designId;
  nextState.designs = nextState.designs.filter((design) => design.id !== designId);
  if (nextState.designs.length === state.designs.length) return;
  if (deletedActive || !nextState.designs.some((design) => design.id === nextState.activeDesignId)) {
    nextState.activeDesignId = nextState.designs[0]?.id || "";
  }
  if (nextState.activeDesignId) applyActiveDesignToProject(nextState);
  commitState(nextState, { hydrate: true });
}

function setDesignVisibility(designId, visible) {
  const nextState = cloneProject(state);
  const design = nextState.designs.find((item) => item.id === designId);
  if (!design) return;
  design.visible = visible;
  commitState(nextState);
}

function setDesignGraphVisibility(designId, visible) {
  const nextState = cloneProject(state);
  const design = nextState.designs.find((item) => item.id === designId);
  if (!design) return;
  design.graphVisible = visible;
  commitState(nextState, { hydrate: true });
}

function setDesignColor(designId, color) {
  const nextState = cloneProject(state);
  const design = nextState.designs.find((item) => item.id === designId);
  if (!design) return;
  design.color = isPaletteColor(color) ? color : "";
  commitState(nextState, { hydrate: true });
}

function addDriverGroup() {
  const nextState = cloneProject(state);
  const source = getActiveDriverGroup(nextState);
  const group = {
    id: createDriverGroupId(),
    name: uniqueDriverGroupName(nextState.driverGroups, "Driver group"),
    driver: completeDriverParameters(sampleProject.driver, source?.driver || nextState.driver),
    count: 1,
    wiring: source?.wiring || "parallel",
    chamberId: "main",
  };
  nextState.driverGroups.push(group);
  nextState.activeDriverGroupId = group.id;
  syncProjectDriverFromActiveGroup(nextState);
  syncActiveDesignFromProject(nextState);
  commitState(nextState, { hydrate: true });
}

function activateDriverGroup(groupId) {
  if (!state.driverGroups.some((group) => group.id === groupId)) return;
  const nextState = cloneProject(state);
  nextState.activeDriverGroupId = groupId;
  syncProjectDriverFromActiveGroup(nextState);
  syncActiveDesignFromProject(nextState);
  commitState(nextState, { hydrate: true });
}

function duplicateDriverGroup(groupId) {
  const nextState = cloneProject(state);
  const source = nextState.driverGroups.find((group) => group.id === groupId);
  if (!source) return;
  const group = {
    ...cloneProject(source),
    id: createDriverGroupId(),
    name: uniqueDriverGroupName(nextState.driverGroups, `${source.name} copy`),
  };
  nextState.driverGroups.push(group);
  nextState.activeDriverGroupId = group.id;
  syncProjectDriverFromActiveGroup(nextState);
  syncActiveDesignFromProject(nextState);
  commitState(nextState, { hydrate: true });
}

function deleteDriverGroup(groupId) {
  if (state.driverGroups.length <= 1) return;
  const nextState = cloneProject(state);
  nextState.driverGroups = nextState.driverGroups.filter((group) => group.id !== groupId);
  if (!nextState.driverGroups.some((group) => group.id === nextState.activeDriverGroupId)) {
    nextState.activeDriverGroupId = nextState.driverGroups[0].id;
  }
  syncProjectDriverFromActiveGroup(nextState);
  syncActiveDesignFromProject(nextState);
  commitState(nextState, { hydrate: true });
}

function updateDriverGroup(groupId, patch) {
  const nextState = cloneProject(state);
  const group = nextState.driverGroups.find((item) => item.id === groupId);
  if (!group) return;
  Object.assign(group, patch);
  if (group.id === nextState.activeDriverGroupId) {
    syncProjectDriverFromActiveGroup(nextState);
    syncBoxDriverArrayFromActiveGroup(nextState);
  }
  syncActiveDesignFromProject(nextState);
  commitState(nextState, { hydrate: true });
}

function updateDriverGroupDriver(groupId, driverId) {
  const selected = driverLibrary.find((driver) => driver.id === driverId);
  if (!selected) return;
  updateDriverGroup(groupId, { driver: driverParametersFromLibraryEntry(selected) });
}

function renderDesignControls() {
  hydrateDesignControls();
}

function hydrateDesignControls() {
  renderConfigBar();
  renderDriverGroups();
  renderCrossoverControls();
}

function recordingSettings() {
  return normalizeRecordingSettings(state.measurements?.recording);
}

function hydrateRecordingControls() {
  const settings = recordingSettings();
  if (recordingMicrophoneSelect && document.activeElement !== recordingMicrophoneSelect) {
    recordingMicrophoneSelect.value = settings.microphone;
  }
  if (recordingOutputSelect && document.activeElement !== recordingOutputSelect) {
    recordingOutputSelect.value = settings.outputDeviceId;
  }
  if (recordingSignalSelect && document.activeElement !== recordingSignalSelect) {
    recordingSignalSelect.value = settings.signal;
  }
  if (recordingFrequencyStartInput && document.activeElement !== recordingFrequencyStartInput) {
    recordingFrequencyStartInput.value = String(settings.frequencyStartHz);
  }
  if (recordingFrequencyEndInput && document.activeElement !== recordingFrequencyEndInput) {
    recordingFrequencyEndInput.value = String(settings.frequencyEndHz);
  }
  if (recordingLevelInput && document.activeElement !== recordingLevelInput) {
    recordingLevelInput.value = String(settings.levelDb);
  }
  if (recordingDurationInput && document.activeElement !== recordingDurationInput) {
    recordingDurationInput.value = String(settings.durationSec);
  }
  if (recordingAveragingInput && document.activeElement !== recordingAveragingInput) {
    recordingAveragingInput.value = String(settings.repetitions);
  }
  if (recordingSampleRateSelect && document.activeElement !== recordingSampleRateSelect) {
    recordingSampleRateSelect.value = String(settings.sampleRate);
  }
  if (recordingRunNameInput && document.activeElement !== recordingRunNameInput) {
    recordingRunNameInput.value = stagedRecordingResponse?.name || currentRecordingRun?.name || "";
  }
  if (recordingRunAngleInput && document.activeElement !== recordingRunAngleInput) {
    recordingRunAngleInput.value = String(stagedRecordingResponse?.angleDeg ?? currentRecordingRun?.angleDeg ?? 0);
  }
  setUiText(recordingLevelReadout, recordingInProgress ? "Live" : "Ready");
  initializeRecordingSpectrogram();
  [recordingAddButton, recordingTestToneButton].forEach((button) => {
    if (button) button.disabled = recordingInProgress;
  });
  if (recordingSaveRunButton) recordingSaveRunButton.disabled = recordingInProgress || !stagedRecordingResponse;
}

function updateRecordingSettingsFromControls() {
  const nextState = cloneProject(state);
  nextState.measurements = normalizeMeasurements(nextState.measurements);
  nextState.measurements.recording = normalizeRecordingSettings({
    microphone: recordingMicrophoneSelect?.value,
    outputDeviceId: recordingOutputSelect?.value,
    signal: recordingSignalSelect?.value,
    frequencyStartHz: recordingFrequencyStartInput?.value,
    frequencyEndHz: recordingFrequencyEndInput?.value,
    levelDb: recordingLevelInput?.value,
    durationSec: recordingDurationInput?.value,
    repetitions: recordingAveragingInput?.value,
    sampleRate: recordingSampleRateSelect?.value,
  });
  commitState(nextState, { replaceHistory: true });
}

async function hydrateRecordingDeviceOptions(options = {}) {
  const settings = recordingSettings();
  if (!navigator.mediaDevices?.enumerateDevices) {
    setRecordingDeviceOptions(recordingMicrophoneSelect, [{ value: "default", label: "System default" }], settings.microphone);
    setRecordingDeviceOptions(recordingOutputSelect, [{ value: "default", label: "System default" }], settings.outputDeviceId);
    setRecordingStatus("Browser audio device enumeration is not available.");
    return;
  }
  let permissionStream = null;
  try {
    if (options.requestPermission) {
      permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }
    const devices = await navigator.mediaDevices.enumerateDevices();
    const microphones = devices
      .filter((device) => device.kind === "audioinput")
      .map((device, index) => ({ value: device.deviceId, label: device.label || `Microphone ${index + 1}` }));
    const speakers = devices
      .filter((device) => device.kind === "audiooutput")
      .map((device, index) => ({ value: device.deviceId, label: device.label || `Speaker ${index + 1}` }));
    const nextSettings = recordingSettings();
    setRecordingDeviceOptions(recordingMicrophoneSelect, [{ value: "default", label: "System default" }, ...microphones], nextSettings.microphone);
    setRecordingDeviceOptions(recordingOutputSelect, [{ value: "default", label: "System default" }, ...speakers], nextSettings.outputDeviceId);
  } catch (error) {
    setRecordingStatus(`Could not access audio devices: ${error.message || error}`);
  } finally {
    permissionStream?.getTracks().forEach((track) => track.stop());
  }
}

function setRecordingDeviceOptions(select, options, selectedValue) {
  const activeValue = selectedValue || "default";
  const seen = new Set();
  const uniqueOptions = options.filter((option) => {
    if (!option.value || seen.has(option.value)) return false;
    seen.add(option.value);
    return true;
  });
  if (!seen.has(activeValue)) {
    uniqueOptions.push({ value: activeValue, label: activeValue === "default" ? "System default" : "Selected device" });
  }
  window.dispatchEvent(new CustomEvent("cabio:select-options-sync", {
    detail: {
      id: select?.id,
      options: uniqueOptions,
      selectedValue: activeValue,
    },
  }));
}

async function playRecordingTestTone() {
  if (recordingInProgress) return;
  recordingInProgress = true;
  hydrateRecordingControls();
  try {
    const settings = currentRecordingSettingsFromControls();
    await hydrateRecordingDeviceOptions({ requestPermission: true });
    resetRecordingSpectrogram();
    setRecordingStatus("");
    await playToneAndMonitorLevel(settings, 1000, 2.2);
  } catch (error) {
    setRecordingStatus(`Test tone and level check failed: ${error.message || error}`);
  } finally {
    recordingInProgress = false;
    hydrateRecordingControls();
  }
}

async function recordFrequencyResponse() {
  if (recordingInProgress) return;
  if (!navigator.mediaDevices?.getUserMedia) {
    setRecordingStatus("Recording requires browser microphone access.");
    return;
  }
  recordingInProgress = true;
  hydrateRecordingControls();
  try {
    await hydrateRecordingDeviceOptions({ requestPermission: true });
    const nextState = cloneProject(state);
    nextState.measurements = normalizeMeasurements(nextState.measurements);
    ensureRecordingGroup(nextState);
    const settings = currentRecordingSettingsFromControls(nextState.measurements.recording);
    currentRecordingRun = createRecordingRun(settings);
    if (recordingRunNameInput) recordingRunNameInput.value = currentRecordingRun.name;
    if (recordingRunAngleInput) recordingRunAngleInput.value = String(currentRecordingRun.angleDeg);
    resetRecordingSpectrogram();
    nextState.measurements.recording = settings;
    commitState(nextState, { replaceHistory: true });

    const measuredResponses = [];
    const repetitionCount = Math.max(1, Math.round(settings.repetitions));
    for (let index = 0; index < repetitionCount; index += 1) {
      setRecordingStatus(`Measurement ${index + 1}/${repetitionCount}: playing ${settings.signal === "noise" ? "noise" : "log sweep"} and recording microphone.`);
      const stimulus = generateRecordingStimulus({
        signal: settings.signal,
        sampleRate: settings.sampleRate,
        durationSec: settings.durationSec,
        levelDb: settings.levelDb,
        frequencyStartHz: settings.frequencyStartHz,
        frequencyEndHz: settings.frequencyEndHz,
      });
      const capture = await captureStimulusResponse(stimulus.samples, settings, stimulus.sampleRate);
      measuredResponses.push(estimateFrequencyResponse({
        stimulus: stimulus.samples,
        recording: capture.samples,
        sampleRate: stimulus.sampleRate,
        frequencies: recordingAnalysisFrequencies(settings),
        referenceLevelDb: settings.levelDb,
      }));
    }

    const points = averageFrequencyResponses(measuredResponses);
    if (points.length < 2) throw new Error("No usable frequency response could be calculated from the recording.");
    const microphoneLabel = selectedOptionLabel(recordingMicrophoneSelect, settings.microphone);
    stagedRecordingResponse = normalizeFrequencyResponse({
      name: recordingRunName() || currentRecordingRun.name,
      source: `${microphoneLabel} ${settings.signal}`,
      target: measurementTargetSelect?.value || defaultMeasurementTarget(),
      recordingGroupId: nextState.measurements.recordingGroups[0]?.id || UNGROUPED_MEASUREMENT_GROUP_ID,
      plane: measurementPlaneSelect?.value || "horizontal",
      angleDeg: recordingRunAngle(),
      color: currentRecordingRun.color,
      importedAt: currentRecordingRun.importedAt,
      points,
    });
    render({ animatePlots: true });
    setRecordingStatus("");
    hydrateRecordingControls();
  } catch (error) {
    setRecordingStatus(`Measurement failed: ${error.message || error}`);
  } finally {
    recordingInProgress = false;
    hydrateRecordingControls();
  }
}

function currentRecordingSettingsFromControls(base = state.measurements?.recording) {
  return normalizeRecordingSettings({
    ...base,
    microphone: recordingMicrophoneSelect?.value || base?.microphone,
    outputDeviceId: recordingOutputSelect?.value || base?.outputDeviceId,
    signal: recordingSignalSelect?.value || base?.signal,
    frequencyStartHz: recordingFrequencyStartInput?.value || base?.frequencyStartHz,
    frequencyEndHz: recordingFrequencyEndInput?.value || base?.frequencyEndHz,
    levelDb: recordingLevelInput?.value || base?.levelDb,
    durationSec: recordingDurationInput?.value || base?.durationSec,
    repetitions: recordingAveragingInput?.value || base?.repetitions || base?.averaging,
    sampleRate: recordingSampleRateSelect?.value || base?.sampleRate,
  });
}

function createRecordingRun(settings) {
  const timestamp = new Date();
  const timestampLabel = formatRecordingRunTimestamp(timestamp);
  return {
    name: `${recordingDriverName()} ${timestampLabel}`,
    angleDeg: recordingRunAngleInput?.value || 0,
    color: randomMeasurementColor(),
    importedAt: timestamp.toISOString(),
  };
}

function recordingDriverName(project = state) {
  const activeDesign = getActiveDesign(project);
  const activeGroup = getActiveDriverGroup(project);
  const driver = activeDesign ? designDriverForName(activeDesign) : activeGroup?.driver || project.driver;
  return driverNameForParameters(driver) || activeDesign?.name || activeGroup?.name || "Custom driver";
}

function formatRecordingRunTimestamp(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-") + ` ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function randomMeasurementColor() {
  const palette = getDesignPalette();
  return palette[Math.floor(Math.random() * palette.length)] || designPaletteColor(0);
}

function recordingRunName() {
  return recordingRunNameInput?.value?.trim() || currentRecordingRun?.name || "";
}

function recordingRunAngle() {
  const value = parseNumericInputValue(recordingRunAngleInput);
  if (Number.isFinite(value)) return clampNumber(value, -180, 180);
  return 0;
}

function syncStagedRecordingRunFields() {
  if (!stagedRecordingResponse) return;
  stagedRecordingResponse = normalizeFrequencyResponse({
    ...stagedRecordingResponse,
    name: recordingRunName() || stagedRecordingResponse.name,
    angleDeg: recordingRunAngle(),
    color: stagedRecordingResponse.color || currentRecordingRun?.color || randomMeasurementColor(),
  });
  render({ animatePlots: true });
}

function ensureRecordingGroup(project) {
  if (project.measurements.recordingGroups?.length) return;
  project.measurements.recordingGroups = [{
    id: createMeasurementGroupId(),
    name: "Recording group",
    target: measurementTargetSelect?.value || defaultMeasurementTarget(),
    kind: "manual",
    driverId: "",
  }];
}

function recordingAnalysisFrequencies(settings) {
  const start = Math.max(1, Number(settings.frequencyStartHz) || FREQUENCY_MIN_HZ);
  const sampleRateLimit = Math.max(start * 1.01, Number(settings.sampleRate) * 0.45 || FREQUENCY_MAX_HZ);
  const requestedEnd = Math.max(start * 1.01, Number(settings.frequencyEndHz) || FREQUENCY_MAX_HZ);
  const end = Math.min(requestedEnd, sampleRateLimit);
  return logFrequencyVector(start, end, RECORDING_ANALYSIS_FREQUENCY_POINTS);
}

async function openRecordingStream(settings) {
  return navigator.mediaDevices.getUserMedia({
    audio: {
      ...(settings.microphone && settings.microphone !== "default" ? { deviceId: { exact: settings.microphone } } : {}),
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      channelCount: 1,
    },
  });
}

async function monitorRecordingLevel(stream, durationMs) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) throw new Error("Web Audio is not available in this browser.");
  const audioContext = new AudioContextClass();
  try {
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(2048, 1, 1);
    const silentOutput = audioContext.createGain();
    silentOutput.gain.value = 0;
    processor.onaudioprocess = (event) => updateRecordingSpectrogramFromSamples(event.inputBuffer.getChannelData(0), audioContext.sampleRate);
    source.connect(processor);
    processor.connect(silentOutput);
    silentOutput.connect(audioContext.destination);
    await delay(durationMs);
    processor.disconnect();
    source.disconnect();
    silentOutput.disconnect();
  } finally {
    await audioContext.close().catch(() => {});
  }
}

async function playToneAndMonitorLevel(settings, frequencyHz, durationSec) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) throw new Error("Web Audio is not available in this browser.");
  const audioContext = new AudioContextClass({ sampleRate: settings.sampleRate });
  const stream = await openRecordingStream(settings);
  let outputFallback = "";
  try {
    outputFallback = await routeAudioOutput(audioContext, settings);
    const microphoneSource = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(2048, 1, 1);
    const silentOutput = audioContext.createGain();
    const oscillator = audioContext.createOscillator();
    const playbackGain = audioContext.createGain();
    silentOutput.gain.value = 0;
    oscillator.type = "sine";
    oscillator.frequency.value = frequencyHz;
    playbackGain.gain.value = Math.max(0.005, Math.min(0.4, 0.06 * 10 ** ((settings.levelDb - 75) / 20)));
    processor.onaudioprocess = (event) => updateRecordingSpectrogramFromSamples(event.inputBuffer.getChannelData(0), audioContext.sampleRate);
    microphoneSource.connect(processor);
    processor.connect(silentOutput);
    silentOutput.connect(audioContext.destination);
    oscillator.connect(playbackGain);
    playbackGain.connect(audioContext.destination);
    await audioContext.resume();
    oscillator.start();
    oscillator.stop(audioContext.currentTime + durationSec);
    await delay(durationSec * 1000 + 180);
    processor.disconnect();
    microphoneSource.disconnect();
    playbackGain.disconnect();
    silentOutput.disconnect();
    return outputFallback;
  } finally {
    stream.getTracks().forEach((track) => track.stop());
    await audioContext.close().catch(() => {});
  }
}

async function captureStimulusResponse(stimulus, settings, sampleRate) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) throw new Error("Web Audio is not available in this browser.");
  const audioContext = new AudioContextClass({ sampleRate });
  const stream = await openRecordingStream(settings);
  let outputFallback = "";
  try {
    outputFallback = await routeAudioOutput(audioContext, settings);
    await audioContext.resume();
    const microphoneSource = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    const silentOutput = audioContext.createGain();
    const playbackSource = audioContext.createBufferSource();
    const playbackGain = audioContext.createGain();
    const playbackBuffer = audioContext.createBuffer(1, stimulus.length, audioContext.sampleRate);
    const chunks = [];
    silentOutput.gain.value = 0;
    playbackGain.gain.value = 1;
    playbackBuffer.copyToChannel(stimulus, 0);
    playbackSource.buffer = playbackBuffer;
    processor.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0);
      chunks.push(new Float32Array(input));
      updateRecordingSpectrogramFromSamples(input, audioContext.sampleRate);
    };
    microphoneSource.connect(processor);
    processor.connect(silentOutput);
    silentOutput.connect(audioContext.destination);
    playbackSource.connect(playbackGain);
    playbackGain.connect(audioContext.destination);
    playbackSource.start(audioContext.currentTime + 0.12);
    await delay((stimulus.length / sampleRate) * 1000 + 450);
    try {
      playbackSource.stop();
    } catch {}
    processor.disconnect();
    microphoneSource.disconnect();
    playbackGain.disconnect();
    silentOutput.disconnect();
    return {
      samples: concatenateFloat32(chunks),
      outputFallback,
    };
  } finally {
    stream.getTracks().forEach((track) => track.stop());
    await audioContext.close().catch(() => {});
  }
}

async function routeAudioOutput(audioContext, settings) {
  if (!settings.outputDeviceId || settings.outputDeviceId === "default") return "";
  if (typeof audioContext.setSinkId !== "function") return "unsupported-output-routing";
  try {
    await audioContext.setSinkId(settings.outputDeviceId);
    return "";
  } catch {
    return "unsupported-output-routing";
  }
}

function updateRecordingSpectrogramFromSamples(samples, sampleRate = 48000) {
  const peak = peakAbs(samples);
  const peakDb = 20 * Math.log10(Math.max(peak, 1e-6));
  if (recordingMeterBar) {
    const width = clampNumber((peakDb + 60) / 60, 0, 1) * 100;
    recordingMeterBar.style.width = `${Math.max(2, width).toFixed(0)}%`;
  }
  drawRecordingSpectrogramColumn(samples, sampleRate);
  setUiText(recordingPeakReadout, `Peak ${peakDb.toFixed(1)} dBFS`);
}

function initializeRecordingSpectrogram() {
  if (!recordingSpectrogram) return;
  const rect = recordingSpectrogram.getBoundingClientRect();
  const scale = Math.max(1.5, Math.min(3, window.devicePixelRatio || 1));
  const width = Math.max(80, Math.round((rect.width || 120) * scale));
  const height = Math.max(34, Math.round((rect.height || 46) * scale));
  if (recordingSpectrogram.width !== width || recordingSpectrogram.height !== height) {
    recordingSpectrogram.width = width;
    recordingSpectrogram.height = height;
    recordingSpectrogramInitialized = false;
  }
  if (recordingSpectrogramInitialized) return;
  const ctx = recordingSpectrogram.getContext("2d");
  if (!ctx) return;
  const isLight = document.documentElement.dataset.theme === "light";
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  if (isLight) {
    gradient.addColorStop(0, "rgba(255,255,255,0.92)");
    gradient.addColorStop(1, "rgba(76,13,202,0.08)");
  } else {
    gradient.addColorStop(0, "rgba(255,255,255,0.08)");
    gradient.addColorStop(1, "rgba(0,0,0,0.34)");
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = isLight ? "rgba(76,13,202,0.13)" : "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  for (let index = 1; index < 4; index += 1) {
    const y = Math.round((height * index) / 4) + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  recordingSpectrogramInitialized = true;
}

function resetRecordingSpectrogram() {
  recordingSpectrogramInitialized = false;
  initializeRecordingSpectrogram();
  if (recordingMeterBar) recordingMeterBar.style.width = "0";
  setUiText(recordingPeakReadout, "Peak -inf dBFS");
}

function drawRecordingSpectrogramColumn(samples, sampleRate) {
  if (!recordingSpectrogram || samples.length < 32) return;
  initializeRecordingSpectrogram();
  const ctx = recordingSpectrogram.getContext("2d");
  if (!ctx) return;
  const { width, height } = recordingSpectrogram;
  ctx.drawImage(recordingSpectrogram, 1, 0, width - 1, height, 0, 0, width - 1, height);
  const bins = Math.max(36, Math.min(96, Math.floor(height * 0.85)));
  const minFrequency = 30;
  const maxFrequency = Math.min(20000, sampleRate * 0.45);
  const samplesForAnalysis = samples.length > 6144 ? samples.subarray(samples.length - 6144) : samples;
  for (let bin = 0; bin < bins; bin += 1) {
    const position = bin / Math.max(1, bins - 1);
    const frequency = minFrequency * ((maxFrequency / minFrequency) ** position);
    const db = frequencyMagnitudeDb(samplesForAnalysis, sampleRate, frequency);
    const intensity = clampNumber((db + 88) / 58, 0, 1);
    ctx.fillStyle = spectrogramColor(intensity);
    const y = Math.floor(height - ((bin + 1) / bins) * height);
    const nextY = Math.floor(height - (bin / bins) * height);
    ctx.fillRect(width - 1, y, 1, Math.max(1, nextY - y));
  }
}

function frequencyMagnitudeDb(samples, sampleRate, frequencyHz) {
  const step = (Math.PI * 2 * frequencyHz) / sampleRate;
  const stepCos = Math.cos(step);
  const stepSin = Math.sin(step);
  let cos = 1;
  let sin = 0;
  let re = 0;
  let im = 0;
  const denominator = Math.max(1, samples.length - 1);
  for (let index = 0; index < samples.length; index += 1) {
    const windowValue = 0.5 - 0.5 * Math.cos((Math.PI * 2 * index) / denominator);
    const sample = samples[index] * windowValue;
    re += sample * cos;
    im -= sample * sin;
    const nextCos = cos * stepCos - sin * stepSin;
    sin = sin * stepCos + cos * stepSin;
    cos = nextCos;
  }
  return 20 * Math.log10(Math.max(1e-8, Math.hypot(re, im) / samples.length));
}

function spectrogramColor(intensity) {
  const value = clampNumber(intensity, 0, 1);
  const palette = document.documentElement.dataset.theme === "light"
    ? [
        [246, 248, 255],
        [76, 13, 202],
        [213, 0, 0],
      ]
    : [
        [5, 6, 18],
        [76, 13, 202],
        [255, 23, 68],
      ];
  const scaled = value * 2;
  const leftIndex = scaled < 1 ? 0 : 1;
  const rightIndex = scaled < 1 ? 1 : 2;
  const mix = scaled < 1 ? scaled : scaled - 1;
  const color = palette[leftIndex].map((channel, index) => Math.round(channel + (palette[rightIndex][index] - channel) * mix));
  return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}

function selectedOptionLabel(select, fallbackValue) {
  return select?.selectedOptions?.[0]?.textContent?.trim() || fallbackValue || "Microphone";
}

function setRecordingStatus(message) {
  setUiText(recordingStatus, message);
  setUiText(measurementStatus, message);
}

function concatenateFloat32(chunks) {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Float32Array(length);
  let offset = 0;
  chunks.forEach((chunk) => {
    output.set(chunk, offset);
    offset += chunk.length;
  });
  return output;
}

function peakAbs(samples) {
  let peak = 0;
  for (let index = 0; index < samples.length; index += 1) peak = Math.max(peak, Math.abs(samples[index]));
  return peak;
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function saveStagedRecording() {
  if (!stagedRecordingResponse) return;
  syncStagedRecordingRunFields();
  const nextState = cloneProject(state);
  nextState.measurements = normalizeMeasurements(nextState.measurements);
  if (!nextState.measurements.recordingGroups?.length) {
    nextState.measurements.recordingGroups = [{
      id: createMeasurementGroupId(),
      name: "Recording group",
      target: measurementTargetSelect?.value || defaultMeasurementTarget(),
      kind: "manual",
      driverId: "",
    }];
  }
  const validGroupId = nextState.measurements.recordingGroups.some((group) => group.id === stagedRecordingResponse.recordingGroupId)
    ? stagedRecordingResponse.recordingGroupId
    : nextState.measurements.recordingGroups[0]?.id || UNGROUPED_MEASUREMENT_GROUP_ID;
  const targetGroup = nextState.measurements.recordingGroups.find((group) => group.id === validGroupId);
  const response = normalizeFrequencyResponse({
    ...stagedRecordingResponse,
    name: recordingRunName() || stagedRecordingResponse.name,
    angleDeg: recordingRunAngle(),
    color: stagedRecordingResponse.color || currentRecordingRun?.color || randomMeasurementColor(),
    recordingGroupId: validGroupId,
    target: stagedRecordingResponse.target || targetGroup?.target || measurementTargetSelect?.value || defaultMeasurementTarget(),
    importedAt: stagedRecordingResponse.importedAt || new Date().toISOString(),
  });
  nextState.measurements.frequencyResponses.push(response);
  stagedRecordingResponse = null;
  currentRecordingRun = null;
  commitState(nextState, { animatePlots: true });
  setUiText(recordingStatus, "");
  hydrateRecordingControls();
}

function discardStagedRecording() {
  if (!stagedRecordingResponse) return;
  const name = stagedRecordingResponse.name;
  stagedRecordingResponse = null;
  currentRecordingRun = null;
  render({ animatePlots: true });
  hydrateRecordingControls();
  setUiText(measurementStatus, `Discarded staged recording: ${name}.`);
}

function generatedRecordingPoints(settings, seed = 0) {
  const start = Math.max(1, Number(settings.frequencyStartHz) || FREQUENCY_MIN_HZ);
  const sampleRateLimit = Math.max(start * 1.01, Number(settings.sampleRate) * 0.45 || FREQUENCY_MAX_HZ);
  const requestedEnd = Math.max(start * 1.01, Number(settings.frequencyEndHz) || FREQUENCY_MAX_HZ);
  const end = Math.min(requestedEnd, sampleRateLimit);
  return logFrequencyVector(start, end, RECORDING_PREVIEW_FREQUENCY_POINTS)
    .map((frequency, index) => {
      const logPosition = Math.log10(frequency / start) / Math.log10(end / start);
      const sweepTilt = settings.signal === "sweep" ? -5.5 * logPosition : -1.8 * Math.sin(logPosition * Math.PI);
      const roomRipple = 2.2 * Math.sin(Math.log2(frequency / 120) * Math.PI + seed * 0.7);
      const averagedRipple = roomRipple / Math.sqrt(Math.max(settings.repetitions || settings.averaging, 1));
      const sourceOffset = settings.microphone === "default" ? 1.4 : 0.4;
      return {
        frequencyHz: frequency,
        magnitudeDb: settings.levelDb + sweepTilt + averagedRipple + sourceOffset + 0.15 * Math.sin(index + seed),
      };
    });
}

function measurementTargetOptions() {
  const options = state.configGroups.map((group) => ({
    value: `configGroup:${group.id}`,
    label: `Group: ${group.name}`,
  }));
  options.push({ value: "configGroup:", label: "Group: No group" });
  state.designs.forEach((design) => {
    options.push({ value: `design:${design.id}`, label: `Config: ${design.name}` });
  });
  return options;
}

function defaultMeasurementTarget() {
  const activeDesign = getActiveDesign();
  return activeDesign ? `design:${activeDesign.id}` : "configGroup:";
}

function hydrateMeasurementTargetOptions(select, value = "") {
  const options = measurementTargetOptions();
  const resolved = options.some((option) => option.value === value) ? value : defaultMeasurementTarget();
  window.dispatchEvent(new CustomEvent("cabio:measurement-target-options-sync", {
    detail: { options, selectedValue: resolved },
  }));
}

function hydrateMeasurementTargetSelect() {
  hydrateMeasurementTargetOptions(measurementTargetSelect, measurementTargetSelect?.value || defaultMeasurementTarget());
}

function measurementTargetLabel(target) {
  if (String(target || "").startsWith("design:")) {
    const designId = String(target).slice("design:".length);
    return `Config: ${state.designs.find((design) => design.id === designId)?.name || "Unknown"}`;
  }
  if (String(target || "").startsWith("configGroup:")) {
    const groupId = String(target).slice("configGroup:".length);
    if (!groupId) return "Group: No group";
    return `Group: ${state.configGroups.find((group) => group.id === groupId)?.name || "Unknown"}`;
  }
  return "Config";
}

function shortMeasurementName(response) {
  const sourceName = responseEntryName(response.source || response.name || "");
  const withoutExtension = sourceName.replace(/\.(?:frd|txt|csv|dat|zip)$/i, "");
  const withoutAngle = withoutExtension.replace(/@-?\d+(?:[\.,]\d+)?(?:deg)?$/i, "");
  const compact = withoutAngle
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return compact || String(response.name || "Response").slice(0, 32);
}

function fullMeasurementName(response) {
  return [response.name, response.source].filter(Boolean).join(" / ") || response.name || "Frequency response";
}

function formatMeasurementAngleCompact(response) {
  return `${Number(response.angleDeg || 0).toFixed(0)} deg`;
}

function compactMeasurementSeriesName(response) {
  return `${shortMeasurementName(response)} ${formatMeasurementAngleCompact(response)}`;
}

function measurementLevelRange(response) {
  const values = response.points.map((point) => point.magnitudeDb).filter(Number.isFinite);
  if (!values.length) return "n/a";
  return `${Math.min(...values).toFixed(1)}..${Math.max(...values).toFixed(1)} dB`;
}

function formatFrequencyValue(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "n/a";
  if (number >= 1000) return `${roundTo(number / 1000, number >= 10000 ? 1 : 2)} kHz`;
  return `${roundTo(number, 1)} Hz`;
}

function renderDriverGroups() {
  window.dispatchEvent(new CustomEvent("cabio:driver-groups-sync", {
    detail: {
      activeGroupId: state.activeDriverGroupId,
      driverOptions: driverLibrary.map((entry) => ({ id: entry.id, name: entry.name })),
      groups: state.driverGroups.map((group) => ({
        id: group.id,
        name: group.name,
        count: group.count,
        wiring: group.wiring,
        selectedDriverId: driverLibrary.find((entry) => driverMatches(group.driver, entry.driver))?.id || "",
      })),
    },
  }));
}

function renameActiveDesign(rawName) {
  const name = rawName.trim();
  if (!name) {
    renderConfigBar();
    return;
  }
  const nextState = cloneProject(state);
  const activeDesign = getActiveDesign(nextState);
  if (!activeDesign) return;
  activeDesign.name = name;
  commitState(nextState);
}

function openImportExportDialog() {
  projectJson.value = JSON.stringify(state, null, 2);
  setUiText(projectDialogStatus, "");
  importExportDialog.showModal();
}

function exportProjectJson() {
  const text = JSON.stringify(state, null, 2);
  projectJson.value = text;
  window.dispatchEvent(new CustomEvent("cabio:project-download", {
    detail: { text, filename: "audiosim-project.json" },
  }));
}

function importProjectJson(text) {
  try {
    stagedRecordingResponse = null;
    commitState(normalizeProjectState(JSON.parse(text)), { hydrate: true });
    setUiText(projectDialogStatus, "");
    importExportDialog.close();
  } catch (error) {
    setUiText(projectDialogStatus, "Could not import JSON. Check the project data and try again.");
    console.error(error);
  }
}

async function importFrequencyResponseFile(file) {
  try {
    const source = file.name || "frequency-response";
    const fallbackName = source.replace(/\.[^.]+$/, "");
    const angleDeg = inferAngleFromName(source);
    const response = parseFrequencyResponseText(await file.text(), {
      name: fallbackName,
      source,
      target: measurementTargetSelect?.value || defaultMeasurementTarget(),
      recordingGroupId: UNGROUPED_MEASUREMENT_GROUP_ID,
      angleDeg,
      plane: measurementPlaneSelect?.value || "horizontal",
      importedAt: new Date().toISOString(),
    });
    const nextState = cloneProject(state);
    nextState.measurements = normalizeMeasurements(nextState.measurements);
    if (!nextState.measurements.recordingGroups?.length) {
      nextState.measurements.recordingGroups = [{
        id: createMeasurementGroupId(),
        name: "Recording group",
        target: measurementTargetSelect?.value || defaultMeasurementTarget(),
      }];
    }
    response.recordingGroupId = nextState.measurements.recordingGroups[0]?.id || response.recordingGroupId;
    nextState.measurements.frequencyResponses.push(response);
    commitState(nextState, { animatePlots: true });
    setUiText(measurementStatus, `Imported ${response.points.length} points from ${source}.`);
  } catch (error) {
    setUiText(measurementStatus, error.message || "Could not import frequency response.");
    console.error(error);
  }
}

function addFrequencyResponseSearchCandidate(result) {
  try {
    if (!result?.response?.points?.length) throw new Error("This result does not contain numeric response data.");
    const response = normalizeFrequencyResponse({
      ...result.response,
      name: result.response.name || result.title || "Scraped response",
      source: result.response.source || result.url || result.source || "",
      target: measurementTargetSelect?.value || defaultMeasurementTarget(),
      recordingGroupId: UNGROUPED_MEASUREMENT_GROUP_ID,
      importedAt: new Date().toISOString(),
    });
    if (response.points.length < 2) throw new Error("This response has too few points to import.");

    const nextState = cloneProject(state);
    nextState.measurements = normalizeMeasurements(nextState.measurements);
    if (!nextState.measurements.recordingGroups?.length) {
      nextState.measurements.recordingGroups = [{
        id: createMeasurementGroupId(),
        name: "Recording group",
        target: measurementTargetSelect?.value || defaultMeasurementTarget(),
      }];
    }
    response.recordingGroupId = nextState.measurements.recordingGroups[0]?.id || response.recordingGroupId;
    nextState.measurements.frequencyResponses.push(response);
    commitState(nextState, { animatePlots: true });
    setActiveSidebarPanel("measurement");
    setUiText(measurementStatus, `Added ${response.points.length} points from ${result.source || "web search"}.`);
    setUiText(driverSearchStatus, `${response.name} added to Measurement.`);
  } catch (error) {
    setUiText(driverSearchStatus, error.message || "Could not add frequency response.");
    console.error(error);
  }
}

function addFrequencyResponseSearchResultsToMeasurements(results = [], query = "", options = {}) {
  const validResults = Array.isArray(results) ? results.filter(Boolean) : [];
  if (!validResults.length) return { added: 0, parsed: 0, candidates: 0 };

  const nextState = cloneProject(state);
  nextState.measurements = normalizeMeasurements(nextState.measurements);
  if (!nextState.measurements.recordingGroups?.length) {
    nextState.measurements.recordingGroups = [{
      id: createMeasurementGroupId(),
      name: "Recording group",
      target: measurementTargetSelect?.value || defaultMeasurementTarget(),
    }];
  }
  const shouldCreateGroup = options.createGroup === true;
  const parsedSourceResults = validResults.filter((result) => result.status === "parsed" && result.response?.points?.length >= 2);
  let targetRecordingGroupId = nextState.measurements.recordingGroups[0]?.id || UNGROUPED_MEASUREMENT_GROUP_ID;
  let createdGroup = false;
  if (shouldCreateGroup && parsedSourceResults.length) {
    const group = {
      id: createMeasurementGroupId(),
      name: uniqueMeasurementGroupName(
        nextState.measurements.recordingGroups,
        options.groupName || measurementGroupNameFromQuery(query),
      ),
      target: measurementTargetSelect?.value || defaultMeasurementTarget(),
      kind: options.groupKind === "driver" ? "driver" : "manual",
      driverId: options.groupKind === "driver" ? String(options.groupDriverId || "").trim() : "",
    };
    nextState.measurements.recordingGroups.push(group);
    targetRecordingGroupId = group.id;
    createdGroup = true;
  }
  const responseKeys = new Set(nextState.measurements.frequencyResponses.map(frequencyResponseIdentity));
  const candidateKeys = new Set(nextState.measurements.frequencyResponseCandidates.map(frequencyResponseCandidateIdentity));
  let parsed = 0;
  let candidates = 0;
  let reassigned = 0;

  validResults.forEach((result) => {
    if (result.status === "parsed" && result.response?.points?.length >= 2) {
      const response = normalizeFrequencyResponse({
        ...result.response,
        name: result.response.name || result.title || query || "Scraped response",
        source: result.response.source || result.url || result.source || "",
        recordingGroupId: targetRecordingGroupId,
        importedAt: new Date().toISOString(),
      });
      const key = frequencyResponseIdentity(response);
      if (!responseKeys.has(key)) {
        nextState.measurements.frequencyResponses.push(response);
        responseKeys.add(key);
        parsed += 1;
      } else if (createdGroup) {
        const existing = nextState.measurements.frequencyResponses.find((item) => frequencyResponseIdentity(item) === key);
        if (existing && existing.recordingGroupId !== targetRecordingGroupId) {
          existing.recordingGroupId = targetRecordingGroupId;
          const group = nextState.measurements.recordingGroups.find((item) => item.id === targetRecordingGroupId);
          if (group?.target) existing.target = group.target;
          reassigned += 1;
        }
      }
      return;
    }

    const candidate = normalizeFrequencyResponseCandidate({
      name: result.title || query || "Frequency response candidate",
      title: result.title,
      source: result.source || "",
      url: result.url || "",
      status: result.status || "candidate",
      format: result.format || "html",
      reason: result.reason || "",
      importedAt: new Date().toISOString(),
    });
    const key = frequencyResponseCandidateIdentity(candidate);
    if (!candidateKeys.has(key) && !responseKeys.has(key)) {
      nextState.measurements.frequencyResponseCandidates.push(candidate);
      candidateKeys.add(key);
      candidates += 1;
    }
  });

  const added = parsed + candidates;
  if (added || reassigned || createdGroup) {
    commitState(nextState, { animatePlots: parsed > 0 });
    if (measurementStatus) {
      const sourceLabel = options.sourceLabel || "driver search";
      const actionText = added
        ? `${added} frequency response ${added === 1 ? "entry" : "entries"} added from ${sourceLabel}${parsed ? `; ${parsed} plotted` : ""}.`
        : reassigned
          ? `${reassigned} existing frequency response ${reassigned === 1 ? "entry" : "entries"} moved into a new recording group from ${sourceLabel}.`
          : `New recording group created for ${sourceLabel}.`;
      setUiText(measurementStatus, actionText);
    }
  }
  return { added, parsed, candidates, reassigned };
}

function frequencyResponseIdentity(response = {}) {
  const points = response.points || [];
  const first = points[0]?.frequencyHz;
  const last = points[points.length - 1]?.frequencyHz;
  return normalizeResponseIdentity([
    responseEntryName(response.source || response.url || response.name),
    response.angleDeg,
    points.length,
    Number.isFinite(first) ? first.toFixed(3) : "",
    Number.isFinite(last) ? last.toFixed(3) : "",
  ].join(":"));
}

function frequencyResponseCandidateIdentity(candidate = {}) {
  return normalizeResponseIdentity(candidate.url || `${candidate.source}:${candidate.name}`);
}

function normalizeResponseIdentity(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function responseEntryName(value) {
  const text = String(value || "");
  const fragment = text.includes("#") ? text.split("#").pop() : text;
  return fragment.split(/[\\/]/).pop() || fragment || text;
}

function setFrequencyResponseVisibility(responseId, visible) {
  const nextState = cloneProject(state);
  nextState.measurements = normalizeMeasurements(nextState.measurements);
  const response = nextState.measurements.frequencyResponses.find((item) => item.id === responseId);
  if (!response) return;
  response.visible = visible;
  commitState(nextState, { animatePlots: true });
}

function updateFrequencyResponseAngle(responseId, angleDeg) {
  const nextState = cloneProject(state);
  nextState.measurements = normalizeMeasurements(nextState.measurements);
  const response = nextState.measurements.frequencyResponses.find((item) => item.id === responseId);
  if (!response) return;
  const nextAngle = clampNumber(Number(angleDeg), -180, 180, response.angleDeg || 0);
  response.angleDeg = nextAngle;
  commitState(nextState, { animatePlots: true });
  setUiText(measurementStatus, `${shortMeasurementName(response)} angle set to ${Math.round(nextAngle)} deg.`);
}

function updateFrequencyResponseName(responseId, name) {
  const nextName = String(name || "").trim();
  if (!nextName) return;
  const nextState = cloneProject(state);
  nextState.measurements = normalizeMeasurements(nextState.measurements);
  const response = nextState.measurements.frequencyResponses.find((item) => item.id === responseId);
  if (!response) return;
  response.name = nextName;
  commitState(nextState, { animatePlots: true });
}

function removeFrequencyResponse(responseId) {
  const nextState = cloneProject(state);
  nextState.measurements = normalizeMeasurements(nextState.measurements);
  nextState.measurements.frequencyResponses = nextState.measurements.frequencyResponses.filter((item) => item.id !== responseId);
  commitState(nextState, { animatePlots: true });
  setUiText(measurementStatus, "Frequency response removed.");
}

function removeFrequencyResponseCandidate(candidateId) {
  const nextState = cloneProject(state);
  nextState.measurements = normalizeMeasurements(nextState.measurements);
  nextState.measurements.frequencyResponseCandidates = nextState.measurements.frequencyResponseCandidates.filter((item) => item.id !== candidateId);
  commitState(nextState, { animatePlots: true });
  setUiText(measurementStatus, "Frequency response candidate removed.");
}

function updateFrequencyResponseTarget(responseId, target) {
  const nextState = cloneProject(state);
  nextState.measurements = normalizeMeasurements(nextState.measurements);
  const response = nextState.measurements.frequencyResponses.find((item) => item.id === responseId);
  if (!response) return;
  response.target = String(target || "").trim() || defaultMeasurementTarget();
  commitState(nextState, { animatePlots: true });
  setUiText(measurementStatus, `${shortMeasurementName(response)} target set to ${measurementTargetLabel(response.target)}.`);
}

function addMeasurementGroup() {
  const nextState = cloneProject(state);
  nextState.measurements = normalizeMeasurements(nextState.measurements);
  nextState.measurements.recordingGroups = normalizeMeasurementGroups(nextState.measurements.recordingGroups);
  const group = {
    id: createMeasurementGroupId(),
    name: uniqueMeasurementGroupName(nextState.measurements.recordingGroups, "Recording group"),
    target: measurementTargetSelect?.value || defaultMeasurementTarget(),
    kind: "manual",
    driverId: "",
  };
  nextState.measurements.recordingGroups.push(group);
  commitState(nextState);
}

function updateMeasurementGroup(groupId, updates = {}) {
  const nextState = cloneProject(state);
  nextState.measurements = normalizeMeasurements(nextState.measurements);
  const group = nextState.measurements.recordingGroups.find((item) => item.id === groupId);
  if (!group) return;
  group.name = String(updates.name || group.name).trim() || group.name;
  if (updates.target) group.target = String(updates.target).trim() || group.target;
  commitState(nextState, { replaceHistory: true });
}

function updateMeasurementGroupTarget(groupId, target) {
  const nextState = cloneProject(state);
  nextState.measurements = normalizeMeasurements(nextState.measurements);
  const group = nextState.measurements.recordingGroups.find((item) => item.id === groupId);
  if (!group) return;
  group.target = String(target || "").trim() || defaultMeasurementTarget();
  nextState.measurements.frequencyResponses = nextState.measurements.frequencyResponses.map((response) => (
    response.recordingGroupId === groupId
      ? { ...response, target: group.target }
      : response
  ));
  commitState(nextState, { animatePlots: true });
}

function deleteMeasurementGroup(groupId) {
  const nextState = cloneProject(state);
  nextState.measurements = normalizeMeasurements(nextState.measurements);
  const remainingGroups = nextState.measurements.recordingGroups.filter((group) => group.id !== groupId);
  if (!remainingGroups.length) {
    remainingGroups.push({
      id: createMeasurementGroupId(),
      name: "Recording group",
      target: defaultMeasurementTarget(),
      kind: "manual",
      driverId: "",
    });
  }
  const fallbackGroupId = remainingGroups[0].id;
  const fallbackTarget = remainingGroups[0].target || defaultMeasurementTarget();
  nextState.measurements.recordingGroups = remainingGroups;
  nextState.measurements.frequencyResponses = nextState.measurements.frequencyResponses.map((response) => (
    response.recordingGroupId === groupId
      ? { ...response, recordingGroupId: fallbackGroupId, target: fallbackTarget }
      : response
  ));
  commitState(nextState, { animatePlots: true });
}

function moveFrequencyResponseToMeasurementGroup(responseId, groupId, beforeResponseId = "") {
  const nextState = cloneProject(state);
  nextState.measurements = normalizeMeasurements(nextState.measurements);
  const responses = nextState.measurements.frequencyResponses;
  const responseIndex = responses.findIndex((item) => item.id === responseId);
  if (responseIndex < 0) return;

  const [response] = responses.splice(responseIndex, 1);
  response.recordingGroupId = groupId || UNGROUPED_MEASUREMENT_GROUP_ID;
  if (groupId) {
    const group = nextState.measurements.recordingGroups.find((item) => item.id === groupId);
    if (group?.target) response.target = group.target;
  }

  let insertIndex = responses.length;
  if (beforeResponseId) {
    const beforeIndex = responses.findIndex((item) => item.id === beforeResponseId);
    if (beforeIndex >= 0) insertIndex = beforeIndex;
  } else {
    const lastIndexInGroup = responses.reduce((lastIndex, item, index) => (
      (item.recordingGroupId || UNGROUPED_MEASUREMENT_GROUP_ID) === (groupId || UNGROUPED_MEASUREMENT_GROUP_ID) ? index : lastIndex
    ), -1);
    insertIndex = lastIndexInGroup + 1;
  }

  responses.splice(insertIndex, 0, response);
  commitState(nextState, { animatePlots: true });
}

function designNameFromDriver(driver) {
  return driverNameForParameters(driver) || "Custom driver";
}

function normalizedDesignName(name, design) {
  const currentName = String(name || "").trim();
  if (!currentName || currentName === designNameFromBox(design.mode, design.box) || currentName === legacyDesignNameFromBox(design.mode, design.box)) {
    return designNameFromDriver(designDriverForName(design));
  }
  return name;
}

function designDriverForName(design = {}) {
  const activeGroup = design.driverGroups?.find((group) => group.id === design.activeDriverGroupId) || design.driverGroups?.[0];
  return completeDriverForMetadata(activeGroup?.driver || design.driver || state?.driver || sampleProject.driver);
}

function driverNameForParameters(driver) {
  const normalizedDriver = completeDriverForMetadata(driver);
  return driverLibrary.find((entry) => driverMatches(normalizedDriver, entry.driver))?.name || "";
}

function completeDriverForMetadata(driver) {
  return completeDriverParameters(driver?.allowParameterFallback === false ? {} : sampleProject.driver, driver);
}

async function searchDriverSpecs() {
  await ensureDriverLibraryLoaded();
  return searchWorkflows.searchDriverSpecs();
}

async function searchKnownDriverResults(query) {
  await ensureDriverLibraryLoaded();
  const normalizedQuery = String(query || "").trim().toLowerCase();
  if (!normalizedQuery || isHttpUrl(normalizedQuery)) return [];
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  return driverLibrary
    .map((entry) => {
      const haystack = [
        entry.name,
        entry.source,
        libraryBrand(entry, "driver"),
        nominalDiameterLabel(entry),
      ].filter(Boolean).join(" ").toLowerCase();
      const score = tokens.reduce((total, token) => total + (haystack.includes(token) ? 1 : 0), 0);
      if (!score) return null;
      return {
        title: entry.name,
        url: "Known driver library",
        driver: entry.driver,
        matched: ["known driver", `${score}/${tokens.length} name tokens`],
        libraryEntryId: entry.id,
        score,
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title, undefined, { numeric: true, sensitivity: "base" }))
    .slice(0, 8);
}

function nominalDiameterLabel(entry) {
  const diameter = Number(entry?.diameterIn ?? entry?.diameter ?? entry?.nominalDiameterIn);
  return Number.isFinite(diameter) && diameter > 0 ? `${diameter} in` : "";
}

function isDriverMeasurementGroup(group) {
  return String(group?.kind || "") === "driver";
}

function removeDriverMeasurementGroups(project) {
  const nextProject = project;
  nextProject.measurements = normalizeMeasurements(nextProject.measurements);
  const removedGroupIds = new Set(
    nextProject.measurements.recordingGroups
      .filter((group) => isDriverMeasurementGroup(group))
      .map((group) => group.id),
  );
  if (!removedGroupIds.size) return 0;
  nextProject.measurements.recordingGroups = nextProject.measurements.recordingGroups.filter((group) => !removedGroupIds.has(group.id));
  nextProject.measurements.frequencyResponses = nextProject.measurements.frequencyResponses.filter(
    (response) => !removedGroupIds.has(response.recordingGroupId),
  );
  if (!nextProject.measurements.recordingGroups.length) {
    nextProject.measurements.recordingGroups = [{
      id: createMeasurementGroupId(),
      name: "Recording group",
      target: defaultMeasurementTarget(),
      kind: "manual",
      driverId: "",
    }];
  }
  return removedGroupIds.size;
}

function measurementGroupNameFromQuery(query) {
  const text = String(query || "").trim().replace(/\s+/g, " ");
  if (!text) return "Recording group";
  return text.length > 42 ? `${text.slice(0, 42).trim()}...` : text;
}

function renderDriverSearchResults(results, frequencyResults = [], query = "") {
  renderDriverSearchResultsView({
    addFrequencyResponseSearchCandidate,
    applyDriverCandidate,
    driverResultFields: DRIVER_RESULT_FIELDS,
    frequencyResponseResultFields: FREQUENCY_RESPONSE_RESULT_FIELDS,
    frequencyResults,
    query,
    results,
  });
}

async function searchPassiveRadiatorSpecs() {
  return searchWorkflows.searchPassiveRadiatorSpecs();
}

function renderPassiveRadiatorSearchResults(results) {
  renderPassiveRadiatorSearchResultsView({
    applyPassiveRadiatorCandidate,
    passiveRadiatorResultFields: PASSIVE_RADIATOR_RESULT_FIELDS,
    results,
  });
}

function isHttpUrl(value) {
  return searchWorkflows.isHttpUrl(value);
}

function normalizeDirectUrl(value) {
  return searchWorkflows.normalizeDirectUrl(value);
}

function applyDriverCandidate(result) {
  if (result?.libraryEntryId) {
    const entry = driverLibrary.find((item) => item.id === result.libraryEntryId);
    if (entry) {
      applyKnownDriver(entry);
      renderDriverSearchResults([], [], "");
      setUiText(driverSearchStatus, `${entry.name} applied from Known driver.`);
      return;
    }
  }
  searchWorkflows.applyDriverCandidate(result);
}

function applyPassiveRadiatorCandidate(result) {
  searchWorkflows.applyPassiveRadiatorCandidate(result);
}

function applyKnownDriver(driverEntry) {
  const nextState = cloneProject(state);
  nextState.driver = driverParametersFromLibraryEntry(driverEntry);
  const removedDriverGroups = removeDriverMeasurementGroups(nextState);
  syncActiveDriverGroupFromProject(nextState);
  syncActiveDesignFromProject(nextState);
  renameActiveDesignForDriver(nextState, driverEntry.name);
  commitState(nextState, { hydrate: true });
  if (Array.isArray(driverEntry.frequencyResponseMatches) && driverEntry.frequencyResponseMatches.length) {
    const responseImport = addFrequencyResponseSearchResultsToMeasurements(driverEntry.frequencyResponseMatches, driverEntry.name || driverEntry.source || "", {
      createGroup: true,
      groupName: driverEntry.name || "Recording group",
      groupKind: "driver",
      groupDriverId: driverEntry.id,
      sourceLabel: "known driver library",
    });
    if (removedDriverGroups) {
      const importedCount = responseImport.added || responseImport.reassigned;
      const suffix = importedCount ? " New driver measurements added." : "";
      setUiText(measurementStatus, `${removedDriverGroups} previous driver measurement ${removedDriverGroups === 1 ? "group was" : "groups were"} removed.${suffix}`);
    }
  } else if (removedDriverGroups) {
    setUiText(measurementStatus, `${removedDriverGroups} previous driver measurement ${removedDriverGroups === 1 ? "group was" : "groups were"} removed.`);
  }
  renderDriverSelect();
}

function driverParametersFromLibraryEntry(driverEntry = {}) {
  const fallbackDriver = driverEntry.allowParameterFallback === false ? {} : sampleProject.driver;
  return {
    ...completeDriverParameters(fallbackDriver, driverEntry.driver),
    ...(driverEntry.category ? { category: driverEntry.category } : {}),
    ...(driverEntry.allowParameterFallback === false ? { allowParameterFallback: false } : {}),
  };
}

function renameActiveDesignForDriver(project, driverName) {
  const design = getActiveDesign(project);
  if (!design) return;
  const name = String(driverName || designNameFromDriver(designDriverForName(design)) || "").replace(/\s+/g, " ").trim();
  if (!name) return;
  design.name = uniqueDesignName(
    project.designs.filter((item) => item.id !== design.id),
    name,
  );
}

function applyKnownPassiveRadiator(passiveRadiatorEntry) {
  const nextState = cloneProject(state);
  nextState.box.passiveRadiator = {
    ...nextState.box.passiveRadiator,
    ...passiveRadiatorEntry.passiveRadiator,
  };
  syncActiveDesignFromProject(nextState);
  commitState(nextState, { hydrate: true });
  renderPassiveRadiatorSelect();
}

function renderDriverSelect() {
  const selectedEntry = matchingDriverEntry();
  const controls = getLibraryControls("driver");
  const options = [
    { value: "", label: "Custom current driver" },
    ...libraryEntriesWithSelection(filteredSortedLibraryEntries(driverLibrary, {
    kind: "driver",
    filter: controls.filter?.value,
    filtersEnabled: isLibraryFilterSwitchEnabled(controls.filterEnabled),
    brand: controls.brand?.value,
    diameter: controls.diameter?.value,
    sort: controls.sort?.value,
  }), selectedEntry).map((entry) => ({ value: entry.id, label: entry.name })),
  ];
  syncLibrarySelect("driver", options, selectedEntry?.id || "");
}

function selectMatchingDriver(match = matchingDriverEntry()) {
  syncLibrarySelect("driver", null, match?.id || "");
}

function matchingDriverEntry() {
  return driverLibrary.find((entry) => driverMatches(state.driver, entry.driver));
}

function renderPassiveRadiatorSelect() {
  const selectedEntry = matchingPassiveRadiatorEntry();
  const controls = getLibraryControls("passiveRadiator");
  const options = [
    { value: "", label: "Custom P-Radiator" },
    ...libraryEntriesWithSelection(filteredSortedLibraryEntries(passiveRadiatorLibrary, {
    kind: "passiveRadiator",
    filter: controls.filter?.value,
    filtersEnabled: isLibraryFilterSwitchEnabled(controls.filterEnabled),
    brand: controls.brand?.value,
    diameter: controls.diameter?.value,
    sort: controls.sort?.value,
  }), selectedEntry).map((entry) => ({ value: entry.id, label: entry.name })),
  ];
  syncLibrarySelect("passive-radiator", options, selectedEntry?.id || "");
}

function selectMatchingPassiveRadiator(match = matchingPassiveRadiatorEntry()) {
  syncLibrarySelect("passive-radiator", null, match?.id || "");
}

function syncLibrarySelect(kind, options, selectedId) {
  window.dispatchEvent(new CustomEvent("cabio:library-select-sync", {
    detail: {
      kind,
      ...(Array.isArray(options) ? { options } : {}),
      selectedId,
    },
  }));
}

function matchingPassiveRadiatorEntry() {
  return passiveRadiatorLibrary.find((entry) => passiveRadiatorMatches(state.box.passiveRadiator, entry.passiveRadiator));
}

function addDriverToLibrary(entry) {
  const existingIndex = driverLibrary.findIndex((driver) => driver.name === entry.name || driver.id === entry.id);
  const normalized = {
    id: existingIndex >= 0 ? driverLibrary[existingIndex].id : uniqueDriverId(entry.id),
    name: entry.name,
    source: entry.source,
    driver: cloneProject(entry.driver),
  };
  if (existingIndex >= 0) {
    driverLibrary[existingIndex] = { ...driverLibrary[existingIndex], ...normalized };
  } else {
    driverLibrary.push(normalized);
  }
  saveCustomDrivers();
  populateLibraryBrandFilter(getLibraryControls("driver").brand, driverLibrary, "driver", libraryControlPrefs.driverBrand || "");
  renderDriverSelect();
  return driverLibrary.find((driver) => driver.id === normalized.id) || normalized;
}

function addPassiveRadiatorToLibrary(entry) {
  const existingIndex = passiveRadiatorLibrary.findIndex((passiveRadiator) => passiveRadiator.name === entry.name || passiveRadiator.id === entry.id);
  const passiveRadiator = cloneProject(entry.passiveRadiator);
  delete passiveRadiator.count;
  const normalized = {
    id: existingIndex >= 0 ? passiveRadiatorLibrary[existingIndex].id : uniquePassiveRadiatorId(entry.id),
    name: entry.name,
    source: entry.source,
    passiveRadiator,
  };
  if (existingIndex >= 0) {
    passiveRadiatorLibrary[existingIndex] = { ...passiveRadiatorLibrary[existingIndex], ...normalized };
  } else {
    passiveRadiatorLibrary.push(normalized);
  }
  saveCustomPassiveRadiators();
  populateLibraryBrandFilter(getLibraryControls("passiveRadiator").brand, passiveRadiatorLibrary, "passiveRadiator", libraryControlPrefs.passiveRadiatorBrand || "");
  renderPassiveRadiatorSelect();
  return passiveRadiatorLibrary.find((passiveRadiatorEntry) => passiveRadiatorEntry.id === normalized.id) || normalized;
}

function loadDriverLibrary() {
  return mergeLibraryEntries(builtInDriverLibrary, readCustomDrivers(), cloneProject);
}

function loadPassiveRadiatorLibrary() {
  return mergeLibraryEntries(builtInPassiveRadiatorLibrary, readCustomPassiveRadiators(), cloneProject);
}

async function ensureDriverLibraryLoaded() {
  if (driverLibraryLoaded) return driverLibrary;
  if (!driverLibraryLoadPromise) {
    driverLibraryLoadPromise = loadKnownDrivers()
      .then((entries) => {
        builtInDriverLibrary = entries;
        driverLibrary = loadDriverLibrary();
        driverLibraryLoaded = true;
        const controls = getLibraryControls("driver");
        populateLibraryBrandFilter(controls.brand, driverLibrary, "driver", libraryControlPrefs.driverBrand || "");
        if (controls.diameter) controls.diameter.value = libraryControlPrefs.driverDiameter || "";
        updateLibraryFilterControlState("driver");
        renderDriverSelect();
        return driverLibrary;
      })
      .catch((error) => {
        driverLibraryLoadPromise = null;
        setUiText(driverSearchStatus, error.message || "Could not load driver database.");
        return driverLibrary;
      });
  }
  return driverLibraryLoadPromise;
}

async function ensurePassiveRadiatorLibraryLoaded() {
  if (passiveRadiatorLibraryLoaded) return passiveRadiatorLibrary;
  if (!passiveRadiatorLibraryLoadPromise) {
    passiveRadiatorLibraryLoadPromise = loadKnownPassiveRadiators()
      .then((entries) => {
        builtInPassiveRadiatorLibrary = entries;
        passiveRadiatorLibrary = loadPassiveRadiatorLibrary();
        passiveRadiatorLibraryLoaded = true;
        const controls = getLibraryControls("passiveRadiator");
        populateLibraryBrandFilter(controls.brand, passiveRadiatorLibrary, "passiveRadiator", libraryControlPrefs.passiveRadiatorBrand || "");
        if (controls.diameter) controls.diameter.value = libraryControlPrefs.passiveRadiatorDiameter || "";
        updateLibraryFilterControlState("passiveRadiator");
        renderPassiveRadiatorSelect();
        return passiveRadiatorLibrary;
      })
      .catch((error) => {
        passiveRadiatorLibraryLoadPromise = null;
        setUiText(passiveRadiatorSearchStatus, error.message || "Could not load P-Radiator database.");
        return passiveRadiatorLibrary;
      });
  }
  return passiveRadiatorLibraryLoadPromise;
}

function readCustomDrivers() {
  return readCustomLibrary(readJsonStorage, DRIVER_LIBRARY_STORAGE_KEY);
}

function readCustomPassiveRadiators() {
  return readCustomLibrary(readJsonStorage, PASSIVE_RADIATOR_LIBRARY_STORAGE_KEY);
}

function saveCustomDrivers() {
  writeJsonStorage(DRIVER_LIBRARY_STORAGE_KEY, customLibraryEntries(driverLibrary, builtInDriverLibrary));
}

function saveCustomPassiveRadiators() {
  writeJsonStorage(PASSIVE_RADIATOR_LIBRARY_STORAGE_KEY, customLibraryEntries(passiveRadiatorLibrary, builtInPassiveRadiatorLibrary));
}

function uniqueDriverId(id) {
  return uniqueLibraryId(id, driverLibrary);
}

function uniquePassiveRadiatorId(id) {
  return uniqueLibraryId(id, passiveRadiatorLibrary);
}

function bindPanelControls() {
  window.addEventListener("cabio:panel-toggle-change", (event) => {
    const panelId = event.detail?.panelId;
    const toggle = panelToggles.find((item) => item.dataset.panelToggle === panelId);
    if (!toggle) return;
    toggle.checked = Boolean(event.detail?.checked);
    handlePanelToggle(toggle);
  });
}

function handlePanelToggle(toggle) {
  if (isMobileLayout()) {
    const previousMobilePanel = mobileActivePanel;
    mobileActivePanel = toggle.dataset.panelToggle;
    adoptPlotState(plotCanvasForPanel(mobileActivePanel), plotCanvasForPanel(previousMobilePanel));
    applyMobilePanelVisibility();
    updatePanelToggleState();
    toggle.closest(".panel-menu")?.removeAttribute("open");
    render({ animatePlots: true });
    return;
  }
  if (goldenLayout) {
    const panelId = toggle.dataset.panelToggle;
    const currentPanelIds = currentGoldenPanelIds();
    const nextPanelIds = toggle.checked
      ? [...currentPanelIds, panelId].sort((left, right) => PANEL_IDS.indexOf(left) - PANEL_IDS.indexOf(right))
      : currentPanelIds.filter((id) => id !== panelId);
    loadGoldenLayoutConfig(buildGoldenLayoutConfig(nextPanelIds));
  } else {
    const panel = document.querySelector(`[data-panel="${toggle.dataset.panelToggle}"]`);
    panel.classList.toggle("is-hidden", !toggle.checked);
  }
  activePreset = "custom";
  updatePanelToggleState();
  updatePresetButtonState();
  saveLayout();
  render();
}

function bindToolbarMenuExclusivity() {
  const menus = [...document.querySelectorAll(".app-toolbar .panel-menu")];
  menus.forEach((menu) => {
    menu.addEventListener("toggle", () => {
      if (!menu.open) return;
      menus.forEach((otherMenu) => {
        if (otherMenu !== menu) otherMenu.open = false;
      });
    });
  });
}

function initializeMobileLayoutControls() {
  mobileMediaQuery.addEventListener("change", () => {
    syncMobileThemePreference();
    applyThemePreference(themePreference);
    hydrateThemeButtons();
    if (isMobileLayout()) {
      const visiblePanel = plotPanels.find((panel) => !panel.classList.contains("is-hidden"));
      mobileActivePanel = visiblePanel?.dataset.panel || mobileActivePanel;
      if (goldenLayout) {
        desktopGoldenLayoutConfig = goldenLayout.saveLayout();
        writeGoldenLayoutState(activePreset, LAYOUT_PANEL_VERSION, desktopGoldenLayoutConfig);
        deactivateGoldenLayoutForMobile();
      }
      applyMobilePanelVisibility();
    } else {
      initializeGoldenLayout();
      if (goldenLayout && desktopGoldenLayoutConfig) {
        loadGoldenLayoutConfig(goldenLayoutConfigFromResolved(desktopGoldenLayoutConfig) || buildGoldenLayoutConfig(PANEL_PRESETS.driver.visible), {
          persist: false,
        });
        desktopGoldenLayoutConfig = null;
      } else if (goldenLayout) {
        restoreLayout();
      } else {
        applyPreset(activePreset === "custom" ? "driver" : activePreset);
        return;
      }
    }
    updatePanelToggleState();
    updatePresetButtonState();
    render();
  });

  if (isMobileLayout()) {
    applyMobilePanelVisibility();
    updatePanelToggleState();
  }
}

function applyMobilePanelVisibility() {
  if (!isMobileLayout()) return;
  updateMobileToolbarOffset();
  const mobileHeight = mobilePanelHeight(mobileActivePanel);
  document.querySelector(".plot-grid")?.style.setProperty("--mobile-plot-height", mobileHeight);
  plotPanels.forEach((panel) => {
    const isActive = panel.dataset.panel === mobileActivePanel;
    panel.classList.toggle("is-hidden", !isActive);
    panel.style.width = "100%";
    panel.style.height = mobilePanelHeight(panel.dataset.panel);
  });
  updateMobilePanelMenuLabel();
}

function mobilePanelHeight(panelId) {
  if (panelId === "boxPreview") return "320px";
  return "300px";
}

function updateMobileToolbarOffset() {
  const workspace = document.querySelector(".workspace");
  const configBar = document.querySelector(".config-bar");
  if (!workspace || !configBar) return;
  if (!isMobileLayout()) {
    workspace.style.removeProperty("--mobile-toolbar-top");
    return;
  }
  const top = Math.ceil(configBar.getBoundingClientRect().height + 6);
  workspace.style.setProperty("--mobile-toolbar-top", `${top}px`);
}

function updateMobilePanelMenuLabel() {
  const label = isMobileLayout() ? PANEL_LABELS[mobileActivePanel] || "Graph" : "Graphs";
  window.__cabioGraphMenuLabel = label;
  window.dispatchEvent(new CustomEvent("cabio:graph-menu-label-sync", {
    detail: { label },
  }));
}

function plotCanvasForPanel(panelId) {
  return document.querySelector(`[data-panel="${panelId}"] canvas`);
}

function updatePlotFitLayout() {
  if (isMobileLayout()) return;
  if (goldenLayout) {
    goldenLayout.updateSizeFromContainer();
    return;
  }
  const visiblePanels = plotPanels.filter((panel) => !panel.classList.contains("is-hidden"));
  const visibleCount = visiblePanels.length || 1;
  const columns = visibleCount <= 1 ? 1 : visibleCount <= 4 ? 2 : 3;
  const rows = Math.max(1, Math.ceil(visibleCount / columns));
  const grid = document.querySelector(".plot-grid");
  const defaultWidthPct = 100 / columns;
  const defaultHeightPx = Math.max(220, Math.floor((grid?.clientHeight || 640) / rows));

  visiblePanels.forEach((panel) => {
    const size = plotSizeForPanel(panel.dataset.panel, {
      widthPct: defaultWidthPct,
      heightPx: defaultHeightPx,
    });
    applyPlotPanelSize(panel, size);
  });
  plotPanels
    .filter((panel) => panel.classList.contains("is-hidden"))
    .forEach((panel) => {
      panel.style.gridColumn = "";
      panel.style.gridRow = "";
      panel.style.width = "";
      panel.style.height = "";
    });
  grid?.style.setProperty("--plot-columns", String(columns));
  grid?.style.setProperty("--plot-rows", String(rows));
}

function bindResizePersistence() {
  pauseResizePersistence();
}

function bindReorderableLayout() {
  for (const group of document.querySelectorAll("[data-reorder-group]")) {
    if (goldenLayout && group.dataset.reorderGroup === "plots") continue;
    group.addEventListener("mousedown", handleManualDragStart);
    group.addEventListener("dragstart", handleDragStart);
    group.addEventListener("dragover", handleDragOver);
    group.addEventListener("dragleave", handleDragLeave);
    group.addEventListener("drop", handleDrop);
    group.addEventListener("dragend", handleDragEnd);
  }
}

function handleManualDragStart(event) {
  if (event.button !== 0 || !event.target.closest(".drag-handle")) return;
  const group = event.currentTarget;
  const item = getDirectReorderItem(event.target, group);
  if (!item) return;

  event.preventDefault();
  event.stopPropagation();
  manualDrag = {
    group,
    item,
    moved: false,
    startX: event.clientX,
    startY: event.clientY,
  };
  item.classList.add("is-dragging");
  document.addEventListener("mousemove", handleManualDragMove);
  document.addEventListener("mouseup", handleManualDragEnd);
}

function handleManualDragMove(event) {
  if (!manualDrag) return;
  const { group, item } = manualDrag;
  const distance = Math.hypot(event.clientX - manualDrag.startX, event.clientY - manualDrag.startY);
  if (distance < 4) return;

  manualDrag.moved = true;
  const target = getDirectReorderItem(document.elementFromPoint(event.clientX, event.clientY), group);
  if (!target || target === item) return;

  const placement = getDropPlacement(target, event.clientX, event.clientY);
  group.insertBefore(item, placement === "before" ? target : target.nextElementSibling);
}

function handleManualDragEnd() {
  if (!manualDrag) return;
  const shouldSave = manualDrag.moved;
  manualDrag.item.classList.remove("is-dragging");
  manualDrag = null;
  document.removeEventListener("mousemove", handleManualDragMove);
  document.removeEventListener("mouseup", handleManualDragEnd);
  if (shouldSave) {
    activePreset = "custom";
    updatePresetButtonState();
    saveLayout();
    render();
  }
}

function handleDragStart(event) {
  const group = event.currentTarget;
  const item = getDirectReorderItem(event.target, group);
  if (!item) return;
  if (!event.target.closest(".drag-handle")) {
    event.preventDefault();
    return;
  }

  draggedItem = item;
  item.classList.add("is-dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", item.dataset.reorderId);
  event.stopPropagation();
}

function handleDragOver(event) {
  if (!draggedItem) return;
  const group = event.currentTarget;
  if (draggedItem.parentElement !== group) return;

  const target = getDirectReorderItem(event.target, group);
  if (!target || target === draggedItem) return;

  event.preventDefault();
  clearDropMarkers(group);
  const placement = getDropPlacement(target, event.clientX, event.clientY);
  target.classList.add(placement === "before" ? "drop-before" : "drop-after");
  event.dataTransfer.dropEffect = "move";
}

function handleDragLeave(event) {
  const group = event.currentTarget;
  if (!group.contains(event.relatedTarget)) {
    clearDropMarkers(group);
  }
}

function handleDrop(event) {
  if (!draggedItem) return;
  const group = event.currentTarget;
  if (draggedItem.parentElement !== group) return;

  const target = getDirectReorderItem(event.target, group);
  event.preventDefault();
  if (target && target !== draggedItem) {
    const placement = getDropPlacement(target, event.clientX, event.clientY);
    group.insertBefore(draggedItem, placement === "before" ? target : target.nextElementSibling);
    saveLayout();
    render();
  }
  clearDropMarkers(group);
}

function handleDragEnd() {
  document.querySelectorAll(".is-dragging, .drop-before, .drop-after").forEach((item) => {
    item.classList.remove("is-dragging", "drop-before", "drop-after");
  });
  draggedItem = null;
}

function getDropPlacement(target, x, y) {
  const rect = target.getBoundingClientRect();
  const isUpperHalf = y < rect.top + rect.height / 2;
  const isLeftHalf = x < rect.left + rect.width / 2;
  return isUpperHalf || (y < rect.bottom && isLeftHalf) ? "before" : "after";
}

function getDirectReorderItem(target, group) {
  let item = target.closest?.("[data-reorder-id]");
  while (item && item.parentElement !== group) {
    item = item.parentElement?.closest?.("[data-reorder-id]");
  }
  return item?.parentElement === group ? item : null;
}

function clearDropMarkers(group) {
  group.querySelectorAll(".drop-before, .drop-after").forEach((item) => {
    item.classList.remove("drop-before", "drop-after");
  });
}

function saveLayout() {
  if (isMobileLayout() || isGoldenLayoutPopoutWindow()) return;
  const layout = { activePreset, panelLayoutVersion: LAYOUT_PANEL_VERSION };
  if (goldenLayout) {
    layout.golden = goldenLayout.saveLayout();
    writeSavedLayout(layout);
    return;
  }

  for (const group of document.querySelectorAll("[data-reorder-group]")) {
    layout[group.dataset.reorderGroup] = [...group.children]
      .filter((child) => child.dataset.reorderId)
      .map((child) => child.dataset.reorderId);
  }
  layout.panels = {};
  plotPanels.forEach((panel) => {
    const size = currentPlotPanelSize(panel);
    layout.panels[panel.dataset.panel] = {
      hidden: panel.classList.contains("is-hidden"),
      widthPct: size.widthPct,
      heightPx: size.heightPx,
    };
  });
  writeSavedLayout(layout);
}

function normalizePresetName(name) {
  if (name === "custom") return "custom";
  if (name && PANEL_PRESETS[name]) return name;
  if (name === "crossover") return "filter";
  if (name === "recording") return "measurement";
  return "driver";
}

function boxPresetForMode(mode = state.mode) {
  return BOX_MODE_PRESETS[mode] || BOX_MODE_PRESETS.vented;
}

function presetForWorkMode(workMode) {
  if (workMode === "planning") return boxPresetForMode();
  return WORK_MODE_PRESETS[workMode] || WORK_MODE_PRESETS.driver;
}

function activeSidebarPanelId() {
  return sidebarTabs.find((button) => button.classList.contains("active"))?.dataset.sidebarTab || "driver";
}

function applyWorkModeView(workMode = activeSidebarPanelId()) {
  applyPreset(presetForWorkMode(workMode));
}

function restoreLayout() {
  if (isGoldenLayoutPopoutWindow()) return;
  const layout = readSavedLayout();
  if (goldenLayout) {
    activePreset = normalizePresetName(layout?.activePreset);
    const savedConfig = goldenLayoutConfigFromResolved(layout?.golden);
    let validSavedConfig = savedConfig && panelIdsFromLayoutConfig(savedConfig).length > 0 ? savedConfig : null;
    let shouldPersist = !validSavedConfig;
    if (activePreset !== "custom") {
      validSavedConfig = null;
      shouldPersist = true;
    }
    if (validSavedConfig && layout?.panelLayoutVersion !== LAYOUT_PANEL_VERSION) {
      shouldPersist = true;
      if (activePreset !== "custom") validSavedConfig = null;
    }
    if (!validSavedConfig && !PANEL_PRESETS[activePreset]) activePreset = "driver";
    loadGoldenLayoutConfig(validSavedConfig || buildGoldenLayoutConfig(PANEL_PRESETS[activePreset].visible), {
      persist: shouldPersist,
    });
    return;
  }

  if (!layout) return;
  if (layout.activePreset && layout.activePreset !== "custom") {
    applyPreset(normalizePresetName(layout.activePreset));
    return;
  }

  pauseResizePersistence();
  applyingLayout = true;
  for (const group of document.querySelectorAll("[data-reorder-group]")) {
    const order = layout[group.dataset.reorderGroup];
    if (!Array.isArray(order)) continue;

    for (const id of order) {
      const child = [...group.children].find((item) => item.dataset.reorderId === id);
      if (child) group.appendChild(child);
    }
  }

  activePreset = layout.activePreset || "driver";
  if (layout.panels) {
    plotPanels.forEach((panel) => {
      const panelLayout = layout.panels[panel.dataset.panel];
      if (!panelLayout) return;
      panel.classList.toggle("is-hidden", Boolean(panelLayout.hidden));
      panel.style.width = "";
      panel.style.height = "";
      plotSpans[panel.dataset.panel] = normalizePlotSize({
        widthPct: panelLayout.widthPct ?? legacyPlotWidth(panelLayout.colSpan),
        heightPx: panelLayout.heightPx ?? legacyPlotHeight(panelLayout.rowSpan),
      });
    });
  }
  updatePlotFitLayout();
  updatePanelToggleState();
  updatePresetButtonState();
  applyingLayout = false;
}

function applyPreset(name) {
  if (isMobileLayout()) return;
  const presetName = normalizePresetName(name);
  const preset = PANEL_PRESETS[presetName];
  if (!preset) return;
  if (goldenLayout) {
    activePreset = presetName;
    loadGoldenLayoutConfig(buildGoldenLayoutConfig(preset.visible), { activePresetName: presetName });
    updatePresetButtonState();
    return;
  }

  const group = document.querySelector('[data-reorder-group="plots"]');

  pauseResizePersistence();
  applyingLayout = true;
  preset.order.forEach((id) => {
    const panel = group.querySelector(`[data-reorder-id="${id}"]`);
    if (panel) group.appendChild(panel);
  });

  plotPanels.forEach((panel) => {
    const isVisible = preset.visible.includes(panel.dataset.panel);
    panel.classList.toggle("is-hidden", !isVisible);
    panel.style.width = "";
    panel.style.height = "";
    if (isVisible) {
      delete plotSpans[panel.dataset.panel];
    }
  });
  updatePlotFitLayout();
  applyingLayout = false;

  activePreset = presetName;
  updatePanelToggleState();
  updatePresetButtonState();
  saveLayout();
  render();
}

function pauseResizePersistence() {
  resizePersistenceReady = false;
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    resizePersistenceReady = true;
  }, 250);
}

function updatePanelToggleState() {
  panelToggles.forEach((toggle) => {
    const panel = document.querySelector(`[data-panel="${toggle.dataset.panelToggle}"]`);
    toggle.checked = isMobileLayout() ? toggle.dataset.panelToggle === mobileActivePanel : Boolean(panel && !panel.classList.contains("is-hidden"));
  });
  window.dispatchEvent(new CustomEvent("cabio:panel-toggle-sync", {
    detail: {
      checkedPanelIds: panelToggles.filter((toggle) => toggle.checked).map((toggle) => toggle.dataset.panelToggle),
    },
  }));
  updateMobilePanelMenuLabel();
}

function updatePresetButtonState() {
}

function initializeHistory() {
  history.replaceState({ index: historyIndex, project: cloneProject(state) }, "", location.href);
}

function commitState(nextState, options = {}) {
  state = normalizeProjectState(nextState);
  saveProjectState(state);
  if (options.replaceHistory) {
    history.replaceState({ index: historyIndex, project: cloneProject(state) }, "", location.href);
  } else {
    historyIndex += 1;
    history.pushState({ index: historyIndex, project: cloneProject(state) }, "", location.href);
  }
  if (options.renderControls !== false) renderDesignControls();
  if (options.hydrate) hydrateFields();
  render({ animatePlots: Boolean(options.animatePlots) });
}

function isUndoShortcut(event) {
  return (event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "z";
}

function hydrateFields() {
  fields.forEach((field) => {
    hydrateField(field);
  });
  hydrateRangeFields();
  hydrateDesignControls();
  renderDriverSummaryPanel();
  renderDriverHealthPanel();
  selectMatchingDriver();
  selectMatchingPassiveRadiator();
}

function hydrateField(field) {
  const fieldPath = getFieldPath(field);
  const value = field.dataset.derivedField ? derivedFieldValue(fieldPath) : getPath(state, fieldPath);
  if (field.type === "checkbox") {
    field.checked = Boolean(value);
    return;
  }
  if (isNumericInput(field)) {
    if (document.activeElement === field && !field.readOnly) return;
    field.value = baseToInputValue(field, value);
    return;
  }
  if (field.tagName === "SELECT" || field.type === "text" || field.type === "search") {
    field.value = value;
    return;
  }
  field.value = baseToInputValue(field, value);
}

function hydrateRangeFields() {
  rangeFields.forEach((field) => {
    configureRangeField(field);
    const fieldPath = getRangeFieldPath(field);
    const value = Number(field.dataset.derivedRangeField ? derivedFieldValue(fieldPath) : getPath(state, fieldPath));
    if (!Number.isFinite(value)) return;
    if (isLogRangeField(field)) {
      const bounds = rangeBounds(field);
      if (value < bounds.min) field.dataset.baseMin = String(Math.max(0.001, Math.floor(value)));
      if (value > bounds.max) field.dataset.baseMax = String(Math.ceil(value));
    } else {
      if (value < Number(field.min)) field.min = String(Math.floor(value));
      if (value > Number(field.max)) field.max = String(Math.ceil(value));
    }
    field.value = String(baseValueToRangeInput(field, value));
  });
}

function hydrateDerivedFields() {
  derivedFields.forEach((field) => {
    hydrateField(field);
  });
}

function renderDriverSummaryPanel() {
  const analysis = analyzeDriverParameters(state.driver);
  const match = matchingDriverEntry();
  const hasErrors = analysis.issues.some((issue) => issue.severity === "error");
  const hasWarnings = analysis.issues.some((issue) => issue.severity === "warning");
  const isLibraryDriver = Boolean(match);
  const driverName = match?.name || "Custom driver";
  const driverSource = driverSummarySourceLabel(match);
  const completedDriver = completeDriverParameters(sampleProject.driver, state.driver);
  const qts = positiveDriverValue(analysis.derived.qts) || positiveDriverValue(completedDriver.qts);
  const specs = [
    { label: "Re", value: positiveDriverValue(state.driver.re), unit: "ohm", decimals: 2 },
    { label: "Fs", value: positiveDriverValue(state.driver.fs), unit: "Hz", decimals: 1 },
    { label: "Qts", value: qts, unit: "", decimals: 3 },
    { label: "Vas", value: positiveDriverValue(state.driver.vasL), unit: "L", decimals: 1 },
    { label: "Sd", value: positiveDriverValue(state.driver.sdCm2), unit: "cm2", decimals: 1 },
    { label: "Xmax", value: positiveDriverValue(state.driver.xmaxMm), unit: "mm", decimals: 1 },
  ];

  window.dispatchEvent(new CustomEvent("cabio:driver-summary-sync", {
    detail: {
      name: driverName,
      source: driverSource,
      status: hasErrors ? "Missing data" : hasWarnings ? "Review" : isLibraryDriver ? "Library" : "Manual",
      note: driverHealthSummary(analysis),
      hasErrors,
      hasWarnings: hasWarnings && !hasErrors,
      specs: specs.map((spec) => ({
        label: spec.label,
        value: formatDriverSummaryValue(spec.value, spec.unit, spec.decimals),
      })),
    },
  }));

  setUiText(driverUsageSummary, driverUsageText());
}

function formatDriverSummaryValue(value, unit, decimals = 1) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return "-";
  const formatted = number.toFixed(decimals).replace(/\.?0+$/, "");
  return unit ? `${formatted} ${unit}` : formatted;
}

function driverSummarySourceLabel(match) {
  if (!match) return "Manual parameters";
  return "Known driver library";
}

function driverUsageText() {
  const count = Math.max(1, Math.min(16, Math.round(Number(state.box?.driverCount) || 1)));
  const wiring = state.box?.driverWiring === "series" ? "series" : "parallel";
  const re = positiveDriverValue(state.driver?.re);
  if (!re) return `${count}x ${wiring}`;
  const effective = wiring === "series" ? re * count : re / count;
  return `${count}x ${wiring} / ${formatDriverSummaryValue(effective, "ohm", 2)}`;
}

function renderDriverHealthPanel() {
  const analysis = analyzeDriverParameters(state.driver);
  markDriverFieldIssues(analysis.fieldIssues);

  const hasErrors = analysis.issues.some((issue) => issue.severity === "error");
  const hasWarnings = analysis.issues.some((issue) => issue.severity === "warning");
  updateDriverValidationStatus(hasErrors, hasWarnings);
  const derived = DRIVER_ANALYSIS_DERIVED_FIELDS
    .map((field) => {
      const value = Number(analysis.derived[field.key]);
      if (!Number.isFinite(value)) return null;
      return {
        label: field.label,
        value: `${formatSearchResultValue(value)}${field.unit ? ` ${field.unit}` : ""}`,
        rawValue: value,
        fieldPath: field.fieldPath || "",
        canFill: Boolean(field.fieldPath && !positiveDriverValue(getPath(state, field.fieldPath))),
      };
    })
    .filter(Boolean);

  window.dispatchEvent(new CustomEvent("cabio:driver-health-sync", {
    detail: {
      title: hasErrors ? "Driver check: missing values" : hasWarnings ? "Driver check: review" : "Driver check: OK",
      summary: driverHealthSummary(analysis),
      derived,
      issues: analysis.issues
        .filter((issue) => issue.severity !== "info")
        .map((issue) => ({ severity: issue.severity, message: issue.message })),
      hasErrors,
      hasWarnings: hasWarnings && !hasErrors,
    },
  }));
}

function updateDriverValidationStatus(hasErrors, hasWarnings) {
  if (!driverValidationDetails) return;
  driverValidationDetails.classList.toggle("has-errors", hasErrors);
  driverValidationDetails.classList.toggle("has-warnings", hasWarnings && !hasErrors);
  driverValidationDetails.classList.toggle("is-ok", !hasErrors && !hasWarnings);
  setUiText(driverValidationStatus, hasErrors ? "Missing data" : hasWarnings ? "Review" : "OK");
}

function driverHealthSummary(analysis) {
  const errors = analysis.issues.filter((issue) => issue.severity === "error").length;
  const warnings = analysis.issues.filter((issue) => issue.severity === "warning").length;
  const fillable = analysis.issues.filter((issue) => issue.severity === "info").length;
  if (errors) return `${errors} required value${errors === 1 ? "" : "s"} missing or invalid.`;
  if (warnings) return `${warnings} consistency warning${warnings === 1 ? "" : "s"}.`;
  if (fillable) return `${fillable} value${fillable === 1 ? "" : "s"} can be derived.`;
  return "Required T/S parameters are present and internally consistent.";
}

function markDriverFieldIssues(fieldIssues) {
  document.querySelectorAll('[data-field^="driver."]').forEach((field) => {
    const key = field.dataset.field.slice("driver.".length);
    const issue = fieldIssues[key];
    const card = field.closest(".field-card");
    if (!card) return;
    card.classList.remove("field-driver-error", "field-driver-warning", "field-driver-info");
    card.removeAttribute("data-driver-issue");
    if (!issue) {
      card.removeAttribute("title");
      return;
    }
    card.classList.add(`field-driver-${issue.severity}`);
    card.dataset.driverIssue = issue.message;
    card.title = issue.message;
  });
}

function applyDerivedDriverParameter(fieldPath, value) {
  const nextState = cloneProject(state);
  applyEditableValue(nextState, fieldPath, roundTo(value, 3));
  commitState(nextState, { hydrate: true });
}

function positiveDriverValue(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}

function resetPlotView(plotId) {
  plotViewController.resetPlotView(plotId);
}

function queuePlotAxisInput(plotId, key, input) {
  plotViewController.queuePlotAxisInput(plotId, key, input);
}

function setPlotAxisMode(plotId, mode) {
  plotViewController.setPlotAxisMode(plotId, mode);
}

function setPlotAxisValue(plotId, key, value) {
  plotViewController.setPlotAxisValue(plotId, key, value);
}

function zoomPlot(plotId, factor, event = null, axis = "both") {
  plotViewController.zoomPlot(plotId, factor, event, axis);
}

function startPlotPan(plotId, event) {
  plotViewController.startPlotPan(plotId, event);
}

function currentPlotRange(plotId) {
  return plotViewController.currentPlotRange(plotId);
}

function applyPlotView(plotId, config) {
  return plotViewController.applyPlotView(plotId, config);
}

function plotUsesLogY(plotId, range = currentPlotRange(plotId)) {
  return plotViewController.plotUsesLogY(plotId, range);
}

function updatePlotControlValues() {
  plotViewController.updatePlotControlValues();
}

function hasCustomPlotView(plotId) {
  return plotViewController.hasCustomPlotView(plotId);
}

function formatAxisInput(value) {
  return plotViewController.formatAxisInput(value);
}

function arrayDriverForBox(box, driver = normalizeDriver(state.driver)) {
  return combineIdenticalDrivers(driver, box?.driverCount, box?.driverWiring);
}

function driverForProject(project = state) {
  if (isHfDriverInput(project.driver)) return completeDriverForSimulation(project.driver);
  if (project.driverGroups?.length) {
    const activeGroup = project.driverGroups.find((group) => group.id === project.activeDriverGroupId) || project.driverGroups[0];
    if (isHfDriverInput(activeGroup?.driver)) return completeDriverForSimulation(activeGroup.driver);
    return combineDriverGroups(project.driverGroups, project.driver);
  }
  return arrayDriverForBox(project.box, completeDriverForSimulation(project.driver));
}

function driverForDesign(design, box = completeBox(design.box)) {
  const sourceDriver = design.driver || state.driver;
  if (isHfDriverInput(sourceDriver)) return completeDriverForSimulation(sourceDriver);
  const driver = completeDriverForSimulation(sourceDriver);
  if (design.driverGroups?.length) {
    const activeGroup = design.driverGroups.find((group) => group.id === design.activeDriverGroupId) || design.driverGroups[0];
    if (isHfDriverInput(activeGroup?.driver)) return completeDriverForSimulation(activeGroup.driver);
    return combineDriverGroups(design.driverGroups, driver);
  }
  return arrayDriverForBox(box, driver);
}

function isHfDriverInput(driver = {}) {
  return driver?.category === "hf-driver";
}

function completeDriverForSimulation(driver = {}) {
  const completed = completeDriverParameters(driver?.allowParameterFallback === false ? {} : sampleProject.driver, driver || sampleProject.driver);
  return isHfDriverInput(completed) ? completed : normalizeDriver(completed);
}

function designColorIndex(designId) {
  return Math.max(
    0,
    state.designs.findIndex((design) => design.id === designId),
  );
}

function designColor(index) {
  return designPaletteColor(index, getThemeColors());
}

function designColorForDesign(design, fallbackIndex = designColorIndex(design?.id)) {
  return designPaletteColorForDesign(design, fallbackIndex, getThemeColors());
}

function designPalette() {
  return getDesignPalette(getThemeColors());
}

