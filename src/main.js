import { analyzeDriverParameters, combineDriverGroups, combineIdenticalDrivers, normalizeDriver, validateDriver } from "./core/driver.js";
import { logFrequencyVector, nearestFrequencyValue } from "./core/frequency.js";
import { simulateSealed } from "./core/sealedBox.js";
import { normalizePortShape, portLengthFromTuning, portLengthFromTuningOptions, simulateVented, tuningFromPortLength, tuningFromPortLengthOptions } from "./core/ventedBox.js";
import { simulatePassiveRadiator } from "./core/passiveRadiatorBox.js";
import { normalizeBandpassOptions, simulateBandpass } from "./core/bandpassBox.js";
import { validateEnclosureOptions } from "./core/enclosure.js";
import { filterChainResponse } from "./core/filters.js";
import { inferAngleFromName, normalizeFrequencyResponse, normalizeFrequencyResponseCandidate, normalizeMeasurementGroups, normalizeMeasurements, normalizeRecordingSettings, parseFrequencyResponseText } from "./core/measurements.js";
import { excursionLimitedSpl, excursionLimitedValues, maxExcursionRatio, recommendedLowFrequencyLimit } from "./core/realism.js";
import { normalizeInventory } from "./core/planner/componentInventory.js";
import { planDesigns } from "./core/planner/designPlanner.js";
import { adoptPlotState, autoRange, drawPlot } from "./ui/plot.js";
import { drawPolarPlot } from "./ui/polarPlot.js";
import { drawBoxPreview } from "./ui/preview.js";
import { cloneProject, knownDrivers, knownPassiveRadiators, sampleProject } from "./state.js";

import {
  AXIS_KEYS,
  CROSSOVER_FAMILIES,
  CROSSOVER_FREQUENCY_MAX_HZ,
  CROSSOVER_FREQUENCY_MIN_HZ,
  CROSSOVER_ORDERS,
  CROSSOVER_SLIDER_STEPS,
  CROSSOVER_UI_STORAGE_KEY,
  DEFAULT_CROSSOVER_FREQUENCY_HZ,
  DEFAULT_PORT_LOCK_FIELD,
  DESIGN_COLORS_DARK,
  DESIGN_COLORS_LIGHT,
  DIAMETER_FILTER_VALUES,
  DRIVER_ANALYSIS_DERIVED_FIELDS,
  DRIVER_LIBRARY_STORAGE_KEY,
  DRIVER_RESULT_FIELDS,
  FREQUENCY_MAX_HZ,
  FREQUENCY_MIN_HZ,
  GOLDEN_COMPONENT_TYPE,
  LAYOUT_PANEL_VERSION,
  LIBRARY_BRAND_ALIASES,
  LIBRARY_CONTROLS_STORAGE_KEY,
  PANEL_IDS,
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
  UNGROUPED_CONFIG_GROUP_ID,
  UNGROUPED_MEASUREMENT_GROUP_ID,
  UNIT_PREF_STORAGE_KEY,
} from "./app/constants.js";
import { PANEL_PRESETS } from "./app/presets.js";
import {
  CONTROL_TOOLTIPS,
  FIELD_TOOLTIPS,
  MODE_TOOLTIPS,
  PANEL_LABELS,
  PANEL_TOOLTIPS,
  PLOT_PANEL_TOOLTIPS,
  PRESET_TOOLTIPS,
  RANGE_TOOLTIPS,
  SIDEBAR_TOOLTIPS,
  THEME_TOOLTIPS,
  summaryTooltip,
} from "./app/tooltips.js";
import { UNIT_GROUPS } from "./app/units.js";
import {
  appendPanelsToGoldenConfig,
  buildGoldenLayoutConfig,
  goldenLayoutConfigFromResolved,
  makeGoldenLayoutTabsClosable,
  panelIdsFromLayoutConfig,
} from "./app/goldenLayoutConfig.js";
import { clampNumber, cssEscape, formatInputValue, roundTo } from "./app/format.js";
import { completeDriverParameters, completePassiveRadiatorParameters } from "./app/driverParameters.js";
import { clampCrossoverFrequency, clampDb, clampNumberValue, crossoverFrequencyToSliderValue, crossoverSliderValueToFrequency } from "./app/crossoverUtils.js";
import { broadcastProjectState, initializePopoutProjectSync, isGoldenLayoutPopoutWindow } from "./app/projectSync.js";
import { legacyPlotHeight, legacyPlotWidth, normalizePlotSize, readSavedLayout, writeGoldenLayoutState, writeSavedLayout } from "./app/layoutPersistence.js";
import { readJsonStorage, readStringStorage, removeStorageItem, writeJsonStorage, writeStringStorage } from "./app/storage.js";
import { collectDomRefs } from "./app/domRefs.js";
let state = readSavedProjectState();
let historyIndex = 0;
let draggedItem = null;
let manualDrag = null;
let activePreset = "overview";
let applyingLayout = false;
let resizePersistenceReady = false;
let resizeTimer = null;
const frequencies = logFrequencyVector(FREQUENCY_MIN_HZ, FREQUENCY_MAX_HZ, 640);
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
  presetButtons,
  panelToggles,
  plotPanels,
  pillTabGroups,
  projectJson,
  importExportButton,
  importExportDialog,
  closeImportExportDialog,
  importJsonButton,
  projectDialogStatus,
  driverSearchInput,
  driverSearchButton,
  driverSearchStatus,
  driverSearchResults,
  driverHealthPanel,
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
  passiveRadiatorSearchResults,
  planDesignsButton,
  plannerStatus,
  plannerResults,
  crossoverGroupSelect,
  crossoverMemberList,
  crossoverStatus,
  signalFilterTypeSelect,
  signalFilterAddButton,
  signalFilterList,
  measurementNameInput,
  measurementAngleInput,
  measurementPlaneSelect,
  measurementTargetSelect,
  measurementGroupAddButton,
  measurementGroupList,
  frequencyResponseInput,
  measurementAddButton,
  measurementStatus,
  measurementList,
  recordingMicrophoneSelect,
  recordingSignalSelect,
  recordingLevelInput,
  recordingDurationInput,
  recordingAveragingInput,
  recordingAddButton,
  recordingLevelReadout,
  recordingMeterBar,
  configGroupList,
  configBarList,
  newConfigButton,
  newConfigGroupButton,
  configAddMenu,
  mobileNewConfigButton,
  mobileNewConfigGroupButton,
} = collectDomRefs();
let driverLibrary = loadDriverLibrary();
let passiveRadiatorLibrary = loadPassiveRadiatorLibrary();
let libraryControlPrefs = readLibraryControlPrefs();
let unitPrefs = readUnitPrefs();
let portLockField = readPortLockField();
let themePreference = readThemePreference();
let plannerCandidates = [];
let pillUpdateFrame = null;
const systemThemeQuery = window.matchMedia("(prefers-color-scheme: light)");
const mobileMediaQuery = window.matchMedia("(max-width: 560px)");
let mobileActivePanel = "splPlot";
let activeCrossoverGroupId = readCrossoverUiState().activeGroupId;
const plotViews = {};
const plotAxisInputTimers = {};
let plotPanDrag = null;
let plotResizeDrag = null;
let draggedConfigDesignId = "";
let configPointerDrag = null;
let draggedMeasurementResponseId = "";
let measurementPointerDrag = null;
const plotSpans = {};
let goldenLayout = null;
let goldenLayoutStaging = null;
let goldenLayoutSaveTimer = null;
let goldenLayoutRenderTimer = null;
let loadingGoldenLayout = false;
let goldenLayoutLoadToken = 0;
let desktopGoldenLayoutConfig = null;
let stagedRecordingResponse = null;

function init() {
  const isGoldenPopout = isGoldenLayoutPopoutWindow();
  state = normalizeProjectState(state);
  saveProjectState(state);
  syncMobileThemePreference();
  applyThemePreference(themePreference);
  initializeUnitControls();
  initializePortLockControls();
  initializeTooltips();
  initializeThemeControls();
  initializeLibraryControls();
  initializePillTransitions();
  initializePlotControls();
  initializeGoldenLayout();
  if (isGoldenPopout) {
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
    render();
    return;
  }
  restoreLayout();
  renderDriverSelect();
  renderPassiveRadiatorSelect();
  renderDesignControls();
  hydrateFields();
  initializeHistory();
  bindEvents();
  bindSidebarTabs();
  bindReorderableLayout();
  bindPanelControls();
  bindResizePersistence();
  initializeMobileLayoutControls();
  render();
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
  presetButtons.forEach((button) => {
    setTooltip(button, PRESET_TOOLTIPS[button.dataset.layoutPreset]);
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
    const tooltip = PLOT_PANEL_TOOLTIPS[panelId] || `Graph panel: ${panel.querySelector(".pane-bar span:last-child")?.textContent || "view"}.`;
    setTooltip(panel, tooltip);
    setTooltip(panel.querySelector(".pane-bar"), tooltip);
  });
  document.querySelectorAll(".summary-strip > div").forEach((metric) => {
    const label = metric.querySelector(".metric-label")?.textContent || "Metric";
    setTooltip(metric, summaryTooltip(label));
  });
}

function setTooltip(element, text) {
  if (!element || !text) return;
  element.title = text;
}

function initializePlotControls() {
  PLOT_IDS.forEach((plotId) => {
    const canvas = document.querySelector(`#${plotId}`);
    const panel = canvas?.closest(".plot-panel");
    if (!canvas || !panel || [...panel.children].some((child) => child.classList?.contains("plot-toolbar"))) return;

    panel.append(createPlotToolbar(plotId, "plot-overlay-toolbar"));

    canvas.addEventListener("wheel", (event) => {
      if (isMobileLayout()) return;
      event.preventDefault();
      const factor = event.deltaY > 0 ? 1.18 : 0.85;
      const axis = event.shiftKey ? "y" : event.altKey || event.ctrlKey ? "x" : "both";
      zoomPlot(plotId, factor, event, axis);
    }, { passive: false });

    canvas.addEventListener("mousedown", (event) => startPlotPan(plotId, event));
  });
}

function initializePlotResizeHandles() {
  plotPanels.forEach((panel) => {
    if (panel.querySelector(".plot-resize-handle")) return;
    ["n", "e", "s", "w", "se"].forEach((direction) => {
      const handle = document.createElement("span");
      handle.className = `plot-resize-handle plot-resize-${direction}`;
      handle.dataset.resizeDirection = direction;
      handle.setAttribute("aria-hidden", "true");
      handle.addEventListener("mousedown", (event) => startPlotResize(panel.dataset.panel, direction, event));
      panel.append(handle);
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
    goldenLayoutStaging = document.createElement("div");
    goldenLayoutStaging.className = "plot-panel-staging";
    host.append(goldenLayoutStaging);
    plotPanels.forEach((panel) => goldenLayoutStaging.append(panel));
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
  if (loadingGoldenLayout) return;
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
    goldenLayout.updateSizeFromContainer();
    render();
    if (options.persist !== false) saveLayout();
  } catch (error) {
    console.error("Golden Layout load failed.", error);
  } finally {
    window.setTimeout(() => {
      if (goldenLayoutLoadToken === loadToken) loadingGoldenLayout = false;
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

function createPlotToolbar(plotId, placementClass = "") {
  const toolbar = document.createElement("div");
  toolbar.className = ["plot-toolbar", placementClass].filter(Boolean).join(" ");
  toolbar.dataset.plotToolbar = plotId;
  toolbar.addEventListener("click", (event) => event.stopPropagation());
  toolbar.addEventListener("dblclick", (event) => event.stopPropagation());
  toolbar.addEventListener("mousedown", (event) => event.stopPropagation());

  const pill = document.createElement("button");
  pill.type = "button";
  pill.className = "plot-toolbar-pill";
  pill.textContent = "Axes";
  setTooltip(pill, "Show graph zoom and axis controls.");

  const menu = document.createElement("div");
  menu.className = "plot-toolbar-menu";

  const zoomOut = plotToolButton("-", "Zoom out");
  zoomOut.addEventListener("click", () => zoomPlot(plotId, 1.28));

  const zoomIn = plotToolButton("+", "Zoom in");
  zoomIn.addEventListener("click", () => zoomPlot(plotId, 0.78));

  const zoomRow = document.createElement("div");
  zoomRow.className = "plot-zoom-row";
  zoomRow.append(zoomIn, zoomOut);

  const reset = plotToolButton("Reset", "Reset zoom and manual axes");
  reset.className = "plot-tool-button plot-tool-reset";
  reset.addEventListener("click", () => resetPlotView(plotId));

  const axes = document.createElement("details");
  axes.className = "plot-axis-menu";
  const summary = document.createElement("summary");
  summary.textContent = "Axes";
  summary.addEventListener("click", (event) => {
    event.preventDefault();
  });
  setTooltip(summary, "Set exact X and Y axis limits.");
  const panelBody = document.createElement("div");
  panelBody.className = "plot-axis-panel";
  panelBody.append(
    plotAxisModeToggle(plotId),
    plotAxisField(plotId, "xMin", "X min"),
    plotAxisField(plotId, "xMax", "X max"),
    plotAxisField(plotId, "yMin", "Y min"),
    plotAxisField(plotId, "yMax", "Y max"),
  );
  axes.append(summary, panelBody);
  axes.addEventListener("mouseenter", () => {
    axes.open = true;
  });
  axes.addEventListener("mouseleave", () => {
    if (!axes.matches(":focus-within")) axes.open = false;
  });
  axes.addEventListener("focusin", () => {
    axes.open = true;
  });
  axes.addEventListener("focusout", () => {
    window.setTimeout(() => {
      if (!axes.matches(":focus-within")) axes.open = false;
    });
  });
  axes.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    axes.open = false;
    summary.focus();
  });

  menu.append(zoomRow, reset, axes);
  toolbar.append(pill, menu);
  return toolbar;
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

function plotToolButton(text, tooltip) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "plot-tool-button";
  button.textContent = text;
  setTooltip(button, tooltip);
  return button;
}

function plotAxisField(plotId, key, labelText) {
  const label = document.createElement("label");
  label.className = "plot-axis-field";
  const span = document.createElement("span");
  span.textContent = labelText;
  const input = document.createElement("input");
  input.type = "number";
  input.step = key.startsWith("x") ? "1" : "0.1";
  input.dataset.plotAxisInput = `${plotId}.${key}`;
  input.addEventListener("input", () => queuePlotAxisInput(plotId, key, input));
  input.addEventListener("change", () => {
    window.clearTimeout(plotAxisInputTimers[`${plotId}.${key}`]);
    const value = parsePlotAxisInput(input);
    if (Number.isFinite(value)) {
      setPlotAxisValue(plotId, key, value);
    } else {
      input.value = formatAxisInput(currentPlotRange(plotId)[key]);
    }
  });
  label.append(span, input);
  return label;
}

function plotAxisModeToggle(plotId) {
  const label = document.createElement("label");
  label.className = "plot-axis-mode-toggle";
  setTooltip(label, "A = adaptive axes. F = fixed X/Y min and max.");

  const adaptive = document.createElement("span");
  adaptive.textContent = "A";
  setTooltip(adaptive, "Adaptive: axes follow the visible data.");

  const input = document.createElement("input");
  input.type = "checkbox";
  input.dataset.plotAxisMode = plotId;
  input.setAttribute("aria-label", "Use fixed X and Y axis bounds");
  setTooltip(input, "Switch between adaptive and fixed axes.");
  input.addEventListener("change", () => setPlotAxisMode(plotId, input.checked ? "fixed" : "adaptive"));

  const fixed = document.createElement("span");
  fixed.textContent = "F";
  setTooltip(fixed, "Fixed: use the values below for both axes.");

  label.append(adaptive, input, fixed);
  return label;
}

function bindSidebarTabs() {
  sidebarTabs.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveSidebarPanel(button.dataset.sidebarTab);
    });
  });
}

function setActiveSidebarPanel(panelId) {
  sidebarTabs.forEach((button) => {
    button.classList.toggle("active", button.dataset.sidebarTab === panelId);
  });
  sidebarPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.sidebarPanel === panelId);
  });
  updatePillIndicators();
}

function initializeThemeControls() {
  hydrateThemeButtons();
  themeButtons.forEach((button) => {
    button.addEventListener("click", () => setThemePreference(button.dataset.themeChoice));
  });
  systemThemeQuery.addEventListener("change", () => {
    if (themePreference !== "sync") return;
    applyThemePreference(themePreference);
    render();
  });
}

function setThemePreference(choice) {
  if (isMobileLayout()) choice = "sync";
  if (!THEME_CHOICES.includes(choice) || choice === themePreference) return;
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
}

function hydrateThemeButtons() {
  themeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.themeChoice === themePreference);
  });
}

function readThemePreference() {
  const saved = readStringStorage(THEME_STORAGE_KEY, "sync");
  return THEME_CHOICES.includes(saved) ? saved : "sync";
}

function initializeLibraryControls() {
  populateLibraryBrandFilter(driverLibraryBrand, driverLibrary, "driver");
  populateLibraryBrandFilter(passiveRadiatorLibraryBrand, passiveRadiatorLibrary, "passiveRadiator");
  if (driverLibrarySort) driverLibrarySort.value = libraryControlPrefs.driverSort || "name-asc";
  setLibraryFilterSwitchState(driverLibraryFilterEnabled, Boolean(libraryControlPrefs.driverFilterEnabled));
  if (driverLibraryBrand) driverLibraryBrand.value = libraryControlPrefs.driverBrand || "";
  if (driverLibraryDiameter) driverLibraryDiameter.value = libraryControlPrefs.driverDiameter || "";
  if (passiveRadiatorLibrarySort) passiveRadiatorLibrarySort.value = libraryControlPrefs.passiveRadiatorSort || "name-asc";
  setLibraryFilterSwitchState(passiveRadiatorLibraryFilterEnabled, Boolean(libraryControlPrefs.passiveRadiatorFilterEnabled));
  if (passiveRadiatorLibraryBrand) passiveRadiatorLibraryBrand.value = libraryControlPrefs.passiveRadiatorBrand || "";
  if (passiveRadiatorLibraryDiameter) passiveRadiatorLibraryDiameter.value = libraryControlPrefs.passiveRadiatorDiameter || "";
  updateLibraryFilterControlState("driver");
  updateLibraryFilterControlState("passiveRadiator");
}

function populateLibraryBrandFilter(select, entries, kind) {
  if (!select) return;
  const currentValue = select.value;
  select.replaceChildren();
  const anyOption = document.createElement("option");
  anyOption.value = "";
  anyOption.textContent = "Any brand";
  select.append(anyOption);

  [...new Set(entries.map((entry) => libraryBrand(entry, kind)).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" }))
    .forEach((brand) => {
      const option = document.createElement("option");
      option.value = brand;
      option.textContent = brand;
      select.append(option);
    });

  select.value = [...select.options].some((option) => option.value === currentValue) ? currentValue : "";
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
}

function isLibraryFilterSwitchEnabled(control) {
  return control?.getAttribute("aria-checked") === "true";
}

function updateLibraryFilterControlState(kind) {
  const enabledInput = kind === "passiveRadiator" ? passiveRadiatorLibraryFilterEnabled : driverLibraryFilterEnabled;
  const controls = kind === "passiveRadiator"
    ? [passiveRadiatorLibraryBrand, passiveRadiatorLibraryDiameter]
    : [driverLibraryBrand, driverLibraryDiameter];
  const enabled = isLibraryFilterSwitchEnabled(enabledInput);
  controls.forEach((control) => {
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
    if (group.querySelector(":scope > .pill-indicator")) return;
    const indicator = document.createElement("span");
    indicator.className = "pill-indicator";
    indicator.setAttribute("aria-hidden", "true");
    group.prepend(indicator);
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
    field.addEventListener("input", () => {
      const nextState = cloneProject(state);
      const fieldPath = getFieldPath(field);
      applyEditableValue(nextState, fieldPath, inputToBaseValue(field));
      if (fieldPath.startsWith("box.")) syncActiveDesignFromProject(nextState);
      commitState(nextState, { hydrate: shouldHydrateAfterFieldEdit(field, fieldPath) });
    });
  });

  rangeFields.forEach((field) => {
    field.addEventListener("input", () => {
      const nextState = cloneProject(state);
      const fieldPath = getRangeFieldPath(field);
      applyEditableValue(nextState, fieldPath, Number(field.value));
      if (fieldPath.startsWith("box.")) syncActiveDesignFromProject(nextState);
      commitState(nextState, { hydrate: true, replaceHistory: true });
    });
  });

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (state.mode === button.dataset.mode) return;
      const nextState = cloneProject(state);
      nextState.mode = button.dataset.mode;
      if (nextState.mode === "bandpass") updateBandpassPortLengths(nextState);
      syncActiveDesignFromProject(nextState);
      commitState(nextState, { animatePlots: true });
    });
  });

  newConfigButton.addEventListener("click", createDesignFromCurrentProject);
  newConfigGroupButton.addEventListener("click", createConfigGroup);
  mobileNewConfigButton?.addEventListener("click", () => {
    createDesignFromCurrentProject();
    if (configAddMenu) configAddMenu.open = false;
  });
  mobileNewConfigGroupButton?.addEventListener("click", () => {
    createConfigGroup();
    if (configAddMenu) configAddMenu.open = false;
  });
  addDriverGroupButton?.addEventListener("click", addDriverGroup);

  driverSelect.addEventListener("change", () => {
    const selected = driverLibrary.find((driver) => driver.id === driverSelect.value);
    if (!selected) return;
    applyKnownDriver(selected);
  });
  driverLibraryFilter?.addEventListener("input", () => {
    renderDriverSelect();
  });
  driverLibrarySort?.addEventListener("change", () => {
    libraryControlPrefs.driverSort = driverLibrarySort.value;
    saveLibraryControlPrefs();
    renderDriverSelect();
  });
  driverLibraryFilterEnabled?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const enabled = !isLibraryFilterSwitchEnabled(driverLibraryFilterEnabled);
    setLibraryFilterSwitchState(driverLibraryFilterEnabled, enabled);
    libraryControlPrefs.driverFilterEnabled = enabled;
    saveLibraryControlPrefs();
    updateLibraryFilterControlState("driver");
    renderDriverSelect();
  });
  driverLibraryBrand?.addEventListener("change", () => {
    libraryControlPrefs.driverBrand = driverLibraryBrand.value;
    saveLibraryControlPrefs();
    renderDriverSelect();
  });
  driverLibraryDiameter?.addEventListener("change", () => {
    libraryControlPrefs.driverDiameter = driverLibraryDiameter.value;
    saveLibraryControlPrefs();
    renderDriverSelect();
  });

  passiveRadiatorSelect.addEventListener("change", () => {
    const selected = passiveRadiatorLibrary.find((passiveRadiator) => passiveRadiator.id === passiveRadiatorSelect.value);
    if (!selected) return;
    applyKnownPassiveRadiator(selected);
  });
  passiveRadiatorLibraryFilter?.addEventListener("input", () => {
    renderPassiveRadiatorSelect();
  });
  passiveRadiatorLibrarySort?.addEventListener("change", () => {
    libraryControlPrefs.passiveRadiatorSort = passiveRadiatorLibrarySort.value;
    saveLibraryControlPrefs();
    renderPassiveRadiatorSelect();
  });
  passiveRadiatorLibraryFilterEnabled?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const enabled = !isLibraryFilterSwitchEnabled(passiveRadiatorLibraryFilterEnabled);
    setLibraryFilterSwitchState(passiveRadiatorLibraryFilterEnabled, enabled);
    libraryControlPrefs.passiveRadiatorFilterEnabled = enabled;
    saveLibraryControlPrefs();
    updateLibraryFilterControlState("passiveRadiator");
    renderPassiveRadiatorSelect();
  });
  passiveRadiatorLibraryBrand?.addEventListener("change", () => {
    libraryControlPrefs.passiveRadiatorBrand = passiveRadiatorLibraryBrand.value;
    saveLibraryControlPrefs();
    renderPassiveRadiatorSelect();
  });
  passiveRadiatorLibraryDiameter?.addEventListener("change", () => {
    libraryControlPrefs.passiveRadiatorDiameter = passiveRadiatorLibraryDiameter.value;
    saveLibraryControlPrefs();
    renderPassiveRadiatorSelect();
  });

  driverSearchButton.addEventListener("click", searchDriverSpecs);
  passiveRadiatorSearchButton?.addEventListener("click", searchPassiveRadiatorSpecs);
  planDesignsButton.addEventListener("click", planEnclosureDesigns);
  crossoverGroupSelect?.addEventListener("change", () => {
    setActiveCrossoverGroupId(crossoverGroupSelect.value);
    renderCrossoverControls();
  });
  signalFilterAddButton?.addEventListener("click", () => addSignalFilter(signalFilterTypeSelect?.value || "parametric"));
  driverSearchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      searchDriverSpecs();
    }
  });
  passiveRadiatorSearchInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      searchPassiveRadiatorSpecs();
    }
  });

  importExportButton.addEventListener("click", () => {
    projectJson.value = JSON.stringify(state, null, 2);
    projectDialogStatus.textContent = "";
    importExportDialog.showModal();
  });

  closeImportExportDialog.addEventListener("click", () => {
    importExportDialog.close();
  });

  document.querySelector("#exportButton").addEventListener("click", () => {
    const text = JSON.stringify(state, null, 2);
    projectJson.value = text;
    const blob = new Blob([text], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "audiosim-project.json";
    link.click();
    URL.revokeObjectURL(link.href);
  });

  importJsonButton.addEventListener("click", () => {
    importProjectJson(projectJson.value);
  });

  document.querySelector("#importInput").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    importProjectJson(await file.text());
    event.target.value = "";
  });

  frequencyResponseInput?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await importFrequencyResponseFile(file);
    event.target.value = "";
  });
  measurementAddButton?.addEventListener("click", () => addRecordingFrequencyResponse("measurement"));
  recordingAddButton?.addEventListener("click", () => addRecordingFrequencyResponse("recording"));
  measurementGroupAddButton?.addEventListener("click", addMeasurementGroup);
  [
    recordingMicrophoneSelect,
    recordingSignalSelect,
    recordingLevelInput,
    recordingDurationInput,
    recordingAveragingInput,
  ].forEach((control) => {
    control?.addEventListener("change", updateRecordingSettingsFromControls);
  });

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
    ensureFieldValueGroup(field);
    if (units.length < 2) {
      const unitLabel = document.createElement("span");
      unitLabel.className = "unit-fixed";
      unitLabel.textContent = units[0].label;
      field.insertAdjacentElement("afterend", unitLabel);
      applyFieldStep(field);
      return;
    }
    const select = document.createElement("select");
    select.className = "unit-select";
    select.dataset.unitFor = fieldPath;
    units.forEach((unit) => {
      const option = document.createElement("option");
      option.value = unit.id;
      option.textContent = unit.label;
      select.append(option);
    });
    select.value = unitPrefs[fieldPath] || units[0].id;
    field.insertAdjacentElement("afterend", select);
    applyFieldStep(field);
    select.addEventListener("change", () => {
      unitPrefs[fieldPath] = select.value;
      writeJsonStorage(UNIT_PREF_STORAGE_KEY, unitPrefs);
      applyFieldStep(field);
      hydrateField(field);
    });
  });
}

function ensureFieldValueGroup(field) {
  if (field.parentElement?.classList.contains("field-value-group")) return field.parentElement;
  if (!field.parentElement?.classList.contains("field-card")) return field.parentElement;

  const valueGroup = document.createElement("span");
  valueGroup.className = "field-value-group";
  field.insertAdjacentElement("beforebegin", valueGroup);
  valueGroup.append(field);
  return valueGroup;
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
  document.querySelectorAll("[data-port-lock-field]").forEach((button) => {
    const locked = button.dataset.portLockField === portLockField;
    button.classList.toggle("locked", locked);
    button.ariaPressed = String(locked);
    button.ariaLabel = `${locked ? "Locked" : "Unlocked"} ${portFieldName(button.dataset.portLockField)}`;
    button.title = `${portFieldName(button.dataset.portLockField)} ${locked ? "locked" : "unlocked"}`;
    button.replaceChildren(createPortLockIcon(locked));
  });
}

function createPortLockIcon(locked) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");

  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("x", "3");
  rect.setAttribute("y", "11");
  rect.setAttribute("width", "18");
  rect.setAttribute("height", "11");
  rect.setAttribute("rx", "2");
  rect.setAttribute("ry", "2");

  const shackle = document.createElementNS("http://www.w3.org/2000/svg", "path");
  shackle.setAttribute("d", locked ? "M7 11V7a5 5 0 0 1 10 0v4" : "M7 11V7a5 5 0 0 1 9.9-1");

  svg.append(rect, shackle);
  return svg;
}

function portFieldName(fieldPath) {
  if (fieldPath === "box.fb") return "Target Fb";
  if (fieldPath === "box.portCount") return "Port count";
  if (fieldPath === "box.portShape") return "Port shape";
  if (fieldPath === "box.portDiameterCm") return "Port diameter";
  if (fieldPath === "box.portWidthCm") return "Port width";
  if (fieldPath === "box.portHeightCm") return "Port height";
  if (fieldPath === "box.portLengthCm") return "Port length";
  if (fieldPath === "box.bandpass.frontFb") return "Front Fb";
  if (fieldPath === "box.bandpass.frontPortCount") return "Front port count";
  if (fieldPath === "box.bandpass.frontPortDiameterCm") return "Front port diameter";
  if (fieldPath === "box.bandpass.frontPortLengthCm") return "Front port length";
  if (fieldPath === "box.bandpass.rearFb") return "Rear Fb";
  if (fieldPath === "box.bandpass.rearPortCount") return "Rear port count";
  if (fieldPath === "box.bandpass.rearPortDiameterCm") return "Rear port diameter";
  if (fieldPath === "box.bandpass.rearPortLengthCm") return "Rear port length";
  return fieldPath;
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
  return readJsonStorage(CROSSOVER_UI_STORAGE_KEY, {});
}

function saveCrossoverUiState() {
  writeJsonStorage(CROSSOVER_UI_STORAGE_KEY, { activeGroupId: activeCrossoverGroupId || "" }, "Could not save crossover UI state.");
}

function setActiveCrossoverGroupId(groupId) {
  activeCrossoverGroupId = groupId || "";
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

function inputToBaseValue(field) {
  if (field.type === "checkbox") return field.checked;
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

function portOptionsFromBox(box) {
  return {
    portShape: box.portShape,
    portCount: box.portCount,
    portDiameterCm: box.portDiameterCm,
    portWidthCm: box.portWidthCm,
    portHeightCm: box.portHeightCm,
    portEndCorrection: box.portEndCorrection,
  };
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

function passiveRadiatorAreaFromDiameter(diameterCm) {
  const radiusCm = Number(diameterCm) / 2;
  return Math.PI * radiusCm ** 2;
}

function passiveRadiatorDiameterFromArea(sdCm2) {
  const area = Number(sdCm2);
  if (!Number.isFinite(area) || area <= 0) return NaN;
  return 2 * Math.sqrt(area / Math.PI);
}

function normalizeProjectState(project) {
  const nextState = cloneProject(project);
  const fallbackBox = completeBox(nextState.box || sampleProject.box);
  const fallbackMode = nextState.mode || "vented";
  nextState.inventory = normalizeInventory(nextState.inventory || sampleProject.inventory);
  nextState.measurements = normalizeMeasurements(nextState.measurements);
  nextState.configGroups = normalizeConfigGroups(nextState.configGroups);
  const defaultConfigGroupId = nextState.configGroups[0]?.id || UNGROUPED_CONFIG_GROUP_ID;
  nextState.driverGroups = normalizeDriverGroups(nextState, fallbackBox);
  if (!nextState.driverGroups.some((group) => group.id === nextState.activeDriverGroupId)) {
    nextState.activeDriverGroupId = nextState.driverGroups[0]?.id;
  }
  syncProjectDriverFromActiveGroup(nextState);
  syncBoxDriverArrayFromActiveGroup(nextState);
  const fallbackDriver = completeDriverParameters(sampleProject.driver, nextState.driver);
  const fallbackDriverGroups = cloneProject(nextState.driverGroups);
  const fallbackActiveDriverGroupId = nextState.activeDriverGroupId;

  if (!Array.isArray(nextState.designs) || nextState.designs.length === 0) {
    nextState.designs = [
      {
        id: nextState.activeDesignId || createDesignId(),
        name: designNameFromDriver(fallbackDriver),
        groupId: defaultConfigGroupId,
        mode: fallbackMode,
        visible: true,
        graphVisible: true,
        driver: cloneProject(fallbackDriver),
        driverGroups: cloneProject(fallbackDriverGroups),
        activeDriverGroupId: fallbackActiveDriverGroupId,
        box: fallbackBox,
      },
    ];
  } else {
    nextState.designs = nextState.designs.map((design, index) => {
      const mode = design.mode || fallbackMode;
      const box = completeBox(design.box || fallbackBox);
      const driver = completeDriverParameters(sampleProject.driver, design.driver || fallbackDriver);
      const driverGroups = normalizeDriverGroups({ ...nextState, driver, driverGroups: design.driverGroups || fallbackDriverGroups }, box);
      const activeDriverGroupId = driverGroups.some((group) => group.id === design.activeDriverGroupId)
        ? design.activeDriverGroupId
        : driverGroups[0]?.id;
      const designForNaming = {
        mode,
        box,
        driver,
        driverGroups,
        activeDriverGroupId,
      };
      return {
        id: design.id || `design-${index + 1}`,
        name: normalizedDesignName(design.name, designForNaming),
        groupId: normalizeDesignConfigGroupId(design, nextState.configGroups),
        mode,
        visible: design.visible !== false,
        graphVisible: design.graphVisible !== false,
        color: isPaletteColor(design.color) ? design.color : "",
        driver,
        driverGroups,
        activeDriverGroupId,
        box,
      };
    });
  }

  if (!nextState.designs.some((design) => design.id === nextState.activeDesignId)) {
    nextState.activeDesignId = nextState.designs[0].id;
  }
  const fallbackMeasurementTarget = nextState.activeDesignId ? `design:${nextState.activeDesignId}` : `configGroup:${defaultConfigGroupId}`;
  nextState.measurements.recordingGroups = normalizeMeasurementGroups(nextState.measurements.recordingGroups).map((group) => {
    const groupedResponse = nextState.measurements.frequencyResponses.find((response) => response.recordingGroupId === group.id);
    return {
      ...group,
      target: group.target || groupedResponse?.target || fallbackMeasurementTarget,
    };
  });
  if (!nextState.measurements.recordingGroups.length) {
    nextState.measurements.recordingGroups = [{
      id: createMeasurementGroupId(),
      name: "Recording group",
      target: fallbackMeasurementTarget,
      kind: "manual",
      driverId: "",
    }];
  }
  nextState.measurements.frequencyResponses = nextState.measurements.frequencyResponses.map((response) => {
    const target = String(response.target || "");
    const nextResponse = { ...response };
    if (
      nextResponse.recordingGroupId
      && !nextState.measurements.recordingGroups.some((group) => group.id === nextResponse.recordingGroupId)
    ) {
      nextResponse.recordingGroupId = nextState.measurements.recordingGroups[0]?.id || UNGROUPED_MEASUREMENT_GROUP_ID;
    }
    if (!nextResponse.recordingGroupId) nextResponse.recordingGroupId = nextState.measurements.recordingGroups[0]?.id || UNGROUPED_MEASUREMENT_GROUP_ID;
    if (target === "design:" || target === "configGroup:") {
      return { ...nextResponse, target: fallbackMeasurementTarget };
    }
    if (target.startsWith("design:")) {
      const designId = target.slice("design:".length);
      return nextState.designs.some((design) => design.id === designId)
        ? nextResponse
        : { ...nextResponse, target: fallbackMeasurementTarget };
    }
    if (target.startsWith("configGroup:")) {
      const groupId = target.slice("configGroup:".length);
      return !groupId || nextState.configGroups.some((group) => group.id === groupId)
        ? nextResponse
        : { ...nextResponse, target: fallbackMeasurementTarget };
    }
    return { ...nextResponse, target: fallbackMeasurementTarget };
  });

  applyActiveDesignToProject(nextState);
  return nextState;
}

function normalizeConfigGroups(groupsInput) {
  const sourceGroups = Array.isArray(groupsInput)
    ? groupsInput
    : sampleProject.configGroups;
  const groups = sourceGroups.map((group, index) => ({
    id: group.id || createConfigGroupId(),
    name: String(group.name || `Config group ${index + 1}`).trim() || `Config group ${index + 1}`,
    showMembers: true,
    showCombined: group.showCombined === true,
    crossover: normalizeGroupCrossover(group.crossover),
  }));
  return groups;
}

function normalizeGroupCrossover(crossoverInput = {}) {
  const transitions = Array.isArray(crossoverInput?.transitions) ? crossoverInput.transitions : [];
  const signalFilters = Array.isArray(crossoverInput?.signalFilters) ? crossoverInput.signalFilters : [];
  return {
    transitions: transitions
      .map((transition) => ({
        id: transition.id || createCrossoverTransitionId(),
        fromDesignId: String(transition.fromDesignId || ""),
        toDesignId: String(transition.toDesignId || ""),
        frequencyHz: clampCrossoverFrequency(transition.frequencyHz),
        family: CROSSOVER_FAMILIES.includes(transition.family) ? transition.family : "linkwitz-riley",
        order: CROSSOVER_ORDERS.includes(Number(transition.order)) ? Number(transition.order) : 4,
        enabled: transition.enabled !== false,
        showAnnotation: transition.showAnnotation !== false,
      }))
      .filter((transition) => transition.fromDesignId && transition.toDesignId && transition.fromDesignId !== transition.toDesignId),
    signalFilters: signalFilters.map(normalizeSignalFilter).filter(Boolean),
  };
}

function normalizeSignalFilter(filter = {}) {
  const type = SIGNAL_FILTER_TYPES.includes(filter.type) ? filter.type : "parametric";
  const defaults = SIGNAL_FILTER_DEFAULTS[type] || SIGNAL_FILTER_DEFAULTS.parametric;
  const normalized = {
    id: filter.id || createSignalFilterId(),
    type,
    target: normalizeSignalFilterTarget(filter.target),
    enabled: filter.enabled !== false,
    showAnnotation: filter.showAnnotation !== false,
    ...defaults,
  };

  if (type === "parametric" || type === "low-shelf" || type === "high-shelf" || type === "subsonic") {
    normalized.frequencyHz = clampCrossoverFrequency(filter.frequencyHz ?? defaults.frequencyHz);
  }
  if (type === "parametric") {
    normalized.gainDb = clampDb(filter.gainDb ?? defaults.gainDb, -24, 24);
    normalized.q = clampNumberValue(filter.q ?? defaults.q, 0.1, 20);
  }
  if (type === "low-shelf" || type === "high-shelf") {
    normalized.gainDb = clampDb(filter.gainDb ?? defaults.gainDb, -24, 24);
    normalized.q = clampNumberValue(filter.q ?? defaults.q, 0.1, 4);
  }
  if (type === "subsonic") {
    normalized.preset = Object.hasOwn(SUBSONIC_PRESETS, filter.preset) ? filter.preset : defaults.preset;
    normalized.order = CROSSOVER_ORDERS.includes(Number(filter.order)) ? Number(filter.order) : defaults.order;
    normalized.family = CROSSOVER_FAMILIES.includes(filter.family) ? filter.family : defaults.family;
  }
  if (type === "linkwitz-transform") {
    normalized.sourceFrequencyHz = clampCrossoverFrequency(filter.sourceFrequencyHz ?? defaults.sourceFrequencyHz);
    normalized.sourceQ = clampNumberValue(filter.sourceQ ?? defaults.sourceQ, 0.1, 4);
    normalized.targetFrequencyHz = clampCrossoverFrequency(filter.targetFrequencyHz ?? defaults.targetFrequencyHz);
    normalized.targetQ = clampNumberValue(filter.targetQ ?? defaults.targetQ, 0.1, 4);
  }
  return normalized;
}

function normalizeSignalFilterTarget(target) {
  const value = String(target || SIGNAL_FILTER_TARGET_GROUP);
  if (value === SIGNAL_FILTER_TARGET_GROUP || value.startsWith("design:") || value.startsWith("driverGroup:")) return value;
  return SIGNAL_FILTER_TARGET_GROUP;
}

function normalizeDesignConfigGroupId(design, groups) {
  const validGroupIds = new Set(groups.map((group) => group.id));
  if (validGroupIds.has(design.groupId)) return design.groupId;
  if (Object.prototype.hasOwnProperty.call(design, "groupId") && !design.groupId) return UNGROUPED_CONFIG_GROUP_ID;
  return groups[0]?.id || UNGROUPED_CONFIG_GROUP_ID;
}

function normalizeDriverGroups(project, fallbackBox = completeBox(project.box || sampleProject.box)) {
  const sourceGroups = Array.isArray(project.driverGroups) && project.driverGroups.length
    ? project.driverGroups
    : [
        {
          id: "group-main",
          name: "Main drivers",
          driver: project.driver || sampleProject.driver,
          count: fallbackBox.driverCount || 1,
          wiring: fallbackBox.driverWiring || "parallel",
          chamberId: "main",
        },
      ];

  return sourceGroups.map((group, index) => ({
    id: group.id || createDriverGroupId(),
    name: String(group.name || `Group ${index + 1}`).trim() || `Group ${index + 1}`,
    driver: completeDriverParameters(sampleProject.driver, group.driver || project.driver || sampleProject.driver),
    count: Math.max(1, Math.min(16, Math.round(Number(group.count) || 1))),
    wiring: group.wiring === "series" ? "series" : "parallel",
    chamberId: group.chamberId || "main",
  }));
}

function completeBox(box = {}) {
  const nextBox = {
    ...cloneProject(sampleProject.box),
    ...cloneProject(box || {}),
    passiveRadiator: {
      ...cloneProject(sampleProject.box.passiveRadiator),
      ...cloneProject(box?.passiveRadiator || {}),
    },
    bandpass: {
      ...cloneProject(sampleProject.box.bandpass),
      ...cloneProject(box?.bandpass || {}),
    },
  };
  nextBox.bandpass = normalizeCompleteBandpass(nextBox);
  nextBox.portCount = Math.max(1, Math.min(12, Math.round(Number(nextBox.portCount) || 1)));
  nextBox.portShape = normalizePortShape(nextBox.portShape);
  nextBox.portDiameterCm = Math.max(0.5, Number(nextBox.portDiameterCm) || sampleProject.box.portDiameterCm);
  nextBox.portWidthCm = Math.max(0.5, Number(nextBox.portWidthCm) || sampleProject.box.portWidthCm);
  nextBox.portHeightCm = Math.max(0.2, Number(nextBox.portHeightCm) || sampleProject.box.portHeightCm);
  nextBox.driverCount = Math.max(1, Math.min(16, Math.round(Number(nextBox.driverCount) || 1)));
  nextBox.driverWiring = nextBox.driverWiring === "series" ? "series" : "parallel";
  nextBox.highPassHz = Math.max(0, Number(nextBox.highPassHz) || 0);
  nextBox.highPassOrder = [0, 1, 2, 4].includes(Number(nextBox.highPassOrder)) ? Number(nextBox.highPassOrder) : 2;
  if (!Number.isFinite(Number(nextBox.portLengthCm)) || Number(nextBox.portLengthCm) <= 0) {
    const port = portLengthFromTuningOptions(nextBox.volumeL, nextBox.fb, portOptionsFromBox(nextBox));
    const fallbackPort = portLengthFromTuningOptions(sampleProject.box.volumeL, sampleProject.box.fb, portOptionsFromBox(sampleProject.box));
    nextBox.portLengthCm = Number.isFinite(port.physicalLength) ? roundTo(port.physicalLength * 100, 3) : roundTo(fallbackPort.physicalLength * 100, 3);
  } else {
    nextBox.portLengthCm = Number(nextBox.portLengthCm);
  }
  return nextBox;
}

function normalizeCompleteBandpass(box) {
  const bandpass = normalizeBandpassOptions(box);
  return {
    order: bandpass.order,
    rearVolumeL: roundTo(bandpass.rearVolumeL, 3),
    frontVolumeL: roundTo(bandpass.frontVolumeL, 3),
    frontFb: roundTo(bandpass.frontFb, 3),
    frontPortCount: Math.max(1, Math.min(12, Math.round(Number(bandpass.frontPortCount) || 1))),
    frontPortDiameterCm: roundTo(bandpass.frontPortDiameterCm, 3),
    frontPortLengthCm: roundTo(bandpass.frontPortLengthCm, 3),
    rearFb: roundTo(bandpass.rearFb, 3),
    rearPortCount: Math.max(1, Math.min(12, Math.round(Number(bandpass.rearPortCount) || 1))),
    rearPortDiameterCm: roundTo(bandpass.rearPortDiameterCm, 3),
    rearPortLengthCm: roundTo(bandpass.rearPortLengthCm, 3),
  };
}

function getActiveDesign(project = state) {
  return project.designs.find((design) => design.id === project.activeDesignId) || project.designs[0];
}

function applyActiveDesignToProject(project) {
  const design = getActiveDesign(project);
  project.mode = design.mode;
  project.box = completeBox(design.box);
  project.driver = completeDriverParameters(sampleProject.driver, design.driver || project.driver || sampleProject.driver);
  project.driverGroups = normalizeDriverGroups({ ...project, driverGroups: design.driverGroups || project.driverGroups, driver: project.driver }, project.box);
  project.activeDriverGroupId = project.driverGroups.some((group) => group.id === design.activeDriverGroupId)
    ? design.activeDriverGroupId
    : project.driverGroups[0]?.id;
  syncProjectDriverFromActiveGroup(project);
  syncBoxDriverArrayFromActiveGroup(project);
  return project;
}

function getActiveDriverGroup(project = state) {
  return project.driverGroups?.find((group) => group.id === project.activeDriverGroupId) || project.driverGroups?.[0];
}

function syncProjectDriverFromActiveGroup(project) {
  const group = getActiveDriverGroup(project);
  project.driver = completeDriverParameters(sampleProject.driver, group?.driver || project.driver || sampleProject.driver);
  return project;
}

function syncActiveDriverGroupFromProject(project) {
  const group = getActiveDriverGroup(project);
  if (group) group.driver = completeDriverParameters(sampleProject.driver, project.driver);
  return project;
}

function syncActiveDriverGroupArrayFromBox(project) {
  const group = getActiveDriverGroup(project);
  if (!group) return project;
  const box = completeBox(project.box);
  group.count = box.driverCount;
  group.wiring = box.driverWiring;
  return project;
}

function syncBoxDriverArrayFromActiveGroup(project) {
  const group = getActiveDriverGroup(project);
  if (!group) return project;
  project.box = completeBox(project.box);
  project.box.driverCount = Math.max(1, Math.min(16, Math.round(Number(group.count) || 1)));
  project.box.driverWiring = group.wiring === "series" ? "series" : "parallel";
  return project;
}

function syncActiveDesignFromProject(project) {
  const design = getActiveDesign(project);
  const previousAutoName = designNameFromBox(design.mode, design.box);
  const previousLegacyName = legacyDesignNameFromBox(design.mode, design.box);
  const previousDriverName = designNameFromDriver(designDriverForName(design));
  const shouldUpdateName = !design.name || design.name === previousAutoName || design.name === previousLegacyName || design.name === previousDriverName;
  design.mode = project.mode;
  design.box = completeBox(project.box);
  design.driver = completeDriverParameters(sampleProject.driver, project.driver);
  design.driverGroups = cloneProject(project.driverGroups || []);
  design.activeDriverGroupId = project.activeDriverGroupId;
  if (shouldUpdateName) {
    design.name = designNameFromDriver(designDriverForName(design));
  }
  return project;
}

function activateDesign(designId) {
  const selected = state.designs.find((design) => design.id === designId);
  if (!selected) return;
  if (selected.groupId) setActiveCrossoverGroupId(selected.groupId);
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
  if (state.designs.length <= 1) return;
  const nextState = cloneProject(state);
  const deletedActive = nextState.activeDesignId === designId;
  nextState.designs = nextState.designs.filter((design) => design.id !== designId);
  if (nextState.designs.length === state.designs.length) return;
  if (deletedActive || !nextState.designs.some((design) => design.id === nextState.activeDesignId)) {
    nextState.activeDesignId = nextState.designs[0].id;
  }
  applyActiveDesignToProject(nextState);
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
  updateDriverGroup(groupId, { driver: completeDriverParameters(sampleProject.driver, selected.driver) });
}

function renderDesignControls() {
  hydrateDesignControls();
}

function hydrateDesignControls() {
  renderConfigGroups();
  renderConfigBar();
  renderDriverGroups();
  renderCrossoverControls();
}

function renderConfigGroups() {
  configGroupList.replaceChildren();
  configGroupList.hidden = true;
}

function renderCrossoverControls() {
  if (!crossoverGroupSelect || !crossoverMemberList || !signalFilterList) return;

  const activeDesign = getActiveDesign();
  const fallbackGroupId = activeDesign?.groupId || state.configGroups[0]?.id || "";
  if (!activeCrossoverGroupId || !state.configGroups.some((group) => group.id === activeCrossoverGroupId)) {
    setActiveCrossoverGroupId(fallbackGroupId);
  }

  crossoverGroupSelect.replaceChildren();
  state.configGroups.forEach((group) => {
    const option = document.createElement("option");
    option.value = group.id;
    option.textContent = group.name;
    crossoverGroupSelect.append(option);
  });
  crossoverGroupSelect.value = activeCrossoverGroupId;

  const group = activeCrossoverGroup();
  const members = crossoverGroupMembers(group);
  renderCrossoverMembers(members);
  renderSignalFilters(group, members);

  const canAdd = Boolean(group && members.length >= 2);
  if (signalFilterAddButton) signalFilterAddButton.disabled = !group;

  if (crossoverStatus) {
    crossoverStatus.textContent = canAdd ? "" : "Transitions need at least two configs in one group.";
  }
}

function renderMeasurementControls() {
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
  angleInput.onchange = () => updateFrequencyResponseAngle(response.id, angleInput.value);

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

function recordingSettings() {
  return normalizeRecordingSettings(state.measurements?.recording);
}

function hydrateRecordingControls() {
  const settings = recordingSettings();
  if (recordingMicrophoneSelect && document.activeElement !== recordingMicrophoneSelect) {
    recordingMicrophoneSelect.value = settings.microphone;
  }
  if (recordingSignalSelect && document.activeElement !== recordingSignalSelect) {
    recordingSignalSelect.value = settings.signal;
  }
  if (recordingLevelInput && document.activeElement !== recordingLevelInput) {
    recordingLevelInput.value = String(settings.levelDb);
  }
  if (recordingDurationInput && document.activeElement !== recordingDurationInput) {
    recordingDurationInput.value = String(settings.durationSec);
  }
  if (recordingAveragingInput && document.activeElement !== recordingAveragingInput) {
    recordingAveragingInput.value = String(settings.averaging);
  }
  if (recordingLevelReadout) recordingLevelReadout.textContent = `${settings.levelDb.toFixed(0)} dB`;
  if (recordingMeterBar) {
    const width = clampNumber((settings.levelDb - 35) / 70, 0, 1) * 100;
    recordingMeterBar.style.width = `${width.toFixed(0)}%`;
  }
}

function updateRecordingSettingsFromControls() {
  const nextState = cloneProject(state);
  nextState.measurements = normalizeMeasurements(nextState.measurements);
  nextState.measurements.recording = normalizeRecordingSettings({
    microphone: recordingMicrophoneSelect?.value,
    signal: recordingSignalSelect?.value,
    levelDb: recordingLevelInput?.value,
    durationSec: recordingDurationInput?.value,
    averaging: recordingAveragingInput?.value,
  });
  commitState(nextState, { replaceHistory: true });
}

function addRecordingFrequencyResponse(source = "recording") {
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
  const settings = normalizeRecordingSettings({
    ...nextState.measurements.recording,
    microphone: recordingMicrophoneSelect?.value || nextState.measurements.recording?.microphone,
    signal: recordingSignalSelect?.value || nextState.measurements.recording?.signal,
    levelDb: recordingLevelInput?.value || nextState.measurements.recording?.levelDb,
    durationSec: recordingDurationInput?.value || nextState.measurements.recording?.durationSec,
    averaging: recordingAveragingInput?.value || nextState.measurements.recording?.averaging,
  });
  nextState.measurements.recording = settings;

  const fallbackName = `${settings.signal === "noise" ? "Noise" : "Sweep"} ${nextState.measurements.frequencyResponses.length + 1}`;
  const name = measurementNameInput?.value?.trim() || fallbackName;
  stagedRecordingResponse = normalizeFrequencyResponse({
    name,
    source: `${settings.microphone} ${settings.signal}`,
    target: measurementTargetSelect?.value || defaultMeasurementTarget(),
    recordingGroupId: nextState.measurements.recordingGroups[0]?.id || UNGROUPED_MEASUREMENT_GROUP_ID,
    plane: measurementPlaneSelect?.value || "horizontal",
    angleDeg: measurementAngleInput?.value || 0,
    importedAt: new Date().toISOString(),
    points: generatedRecordingPoints(settings, Date.now() % 997),
  });

  commitState(nextState, { replaceHistory: true, animatePlots: true });
  if (measurementStatus) {
    const origin = source === "recording" ? "Recording" : "Measurement";
    measurementStatus.textContent = `${origin} staged: ${stagedRecordingResponse.name}. Save it to add the frequency response.`;
  }
}

function saveStagedRecording() {
  if (!stagedRecordingResponse) return;
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
    recordingGroupId: validGroupId,
    target: stagedRecordingResponse.target || targetGroup?.target || measurementTargetSelect?.value || defaultMeasurementTarget(),
    importedAt: stagedRecordingResponse.importedAt || new Date().toISOString(),
  });
  nextState.measurements.frequencyResponses.push(response);
  stagedRecordingResponse = null;
  commitState(nextState, { animatePlots: true });
  if (measurementNameInput) measurementNameInput.value = "";
  if (measurementStatus) measurementStatus.textContent = `Saved recording: ${response.name}.`;
}

function discardStagedRecording() {
  if (!stagedRecordingResponse) return;
  const name = stagedRecordingResponse.name;
  stagedRecordingResponse = null;
  render({ animatePlots: true });
  if (measurementStatus) measurementStatus.textContent = `Discarded staged recording: ${name}.`;
}

function generatedRecordingPoints(settings, seed = 0) {
  return frequencies
    .filter((frequency, index) => index % 7 === 0 || frequency === frequencies[frequencies.length - 1])
    .map((frequency, index) => {
      const logPosition = Math.log10(frequency / FREQUENCY_MIN_HZ) / Math.log10(FREQUENCY_MAX_HZ / FREQUENCY_MIN_HZ);
      const sweepTilt = settings.signal === "sweep" ? -5.5 * logPosition : -1.8 * Math.sin(logPosition * Math.PI);
      const roomRipple = 2.2 * Math.sin(Math.log2(frequency / 120) * Math.PI + seed * 0.7);
      const averagedRipple = roomRipple / Math.sqrt(Math.max(settings.averaging, 1));
      const sourceOffset = settings.microphone === "calibrated" ? 0 : settings.microphone === "usb-measurement" ? 0.8 : 1.4;
      return {
        frequencyHz: frequency,
        magnitudeDb: settings.levelDb + sweepTilt + averagedRipple + sourceOffset + 0.15 * Math.sin(index + seed),
      };
    });
}

function measurementValue(label, value, key = "") {
  const item = document.createElement("div");
  item.className = "search-result-value";
  const labelElement = document.createElement("span");
  labelElement.textContent = label;
  const valueElement = document.createElement("strong");
  if (key) valueElement.dataset.measurementValue = key;
  valueElement.textContent = value;
  item.append(labelElement, valueElement);
  return item;
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
  if (!select) return;
  const options = measurementTargetOptions();
  select.replaceChildren();
  options.forEach((option) => select.append(new Option(option.label, option.value)));
  const resolved = options.some((option) => option.value === value) ? value : defaultMeasurementTarget();
  select.value = resolved;
  setTooltip(select, "Choose whether this measurement belongs to one config or one config group.");
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

function activeCrossoverGroup() {
  return state.configGroups.find((group) => group.id === activeCrossoverGroupId) || state.configGroups[0];
}

function crossoverGroupMembers(group = activeCrossoverGroup()) {
  if (!group) return [];
  return state.designs.filter((design) => design.groupId === group.id);
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

    const annotationToggle = createFilterAnnotationToggle(filter, () => toggleSignalFilterAnnotation(filter.id));

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

    actions.append(annotationToggle, toggle, remove);
    item.classList.toggle("muted", filter.enabled === false);
    item.append(title, fields);
    if (range) item.append(range);
    item.append(actions);
    signalFilterList.append(item);
  });
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
  if (filter.type === "parametric" || filter.type === "low-shelf" || filter.type === "high-shelf") {
    fields.push(signalFilterNumberField(filter, "gainDb", "Gain", "Filter gain in dB.", { min: -24, max: 24, step: 0.1 }));
  }
  if (filter.type === "parametric") {
    fields.push(signalFilterNumberField(filter, "q", "Q", "Filter Q / bandwidth.", { min: 0.1, max: 20, step: 0.01 }));
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
  input.min = String(options.min ?? "");
  input.max = String(options.max ?? "");
  input.step = String(options.step ?? 1);
  input.dataset.signalFilterField = key;
  input.value = String(roundTo(Number(filter[key]) || 0, Number(options.step) < 1 ? 2 : 1));
  setTooltip(input, tooltip);
  input.addEventListener("input", () => {
    const value = Number(input.value);
    const range = input.closest(".signal-filter")?.querySelector(".signal-filter-range");
    if (range && key === "frequencyHz") range.value = String(crossoverFrequencyToSliderValue(value));
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
  setTooltip(select, "Subsonic high-pass family.");
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
  setTooltip(select, "Subsonic filter slope.");
  select.addEventListener("change", () => updateSignalFilterFields(filter.id, { order: Number(select.value), ...(filter.type === "subsonic" ? { preset: "custom" } : {}) }, { animatePlots: true, renderControls: true }));
  label.append(span, select);
  return label;
}

function signalFilterRange(filter, item) {
  if (!["parametric", "low-shelf", "high-shelf", "subsonic"].includes(filter.type)) return null;
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
    "low-shelf": "Low shelf",
    "high-shelf": "High shelf",
    "linkwitz-transform": "Linkwitz Transform",
    subsonic: "Subsonic / rumble",
  }[type] || "Signal filter";
}

function signalFilterFrequencyLabel(filter) {
  if (filter.type === "linkwitz-transform") {
    return `${frequencyLabel(filter.sourceFrequencyHz)} -> ${frequencyLabel(filter.targetFrequencyHz)}`;
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
  input.min = String(CROSSOVER_FREQUENCY_MIN_HZ);
  input.max = String(CROSSOVER_FREQUENCY_MAX_HZ);
  input.step = "1";
  input.dataset.crossoverField = key;
  input.value = String(roundTo(clampCrossoverFrequency(transition[key]), 1));
  setTooltip(input, tooltip);
  input.addEventListener("input", () => {
    const value = clampCrossoverFrequency(input.value);
    const range = input.closest(".crossover-transition")?.querySelector(".crossover-transition-range");
    if (range) range.value = String(crossoverFrequencyToSliderValue(value));
    updateCrossoverTransitionFields(transition.id, { [key]: value }, { live: true });
  });
  label.append(span, input);
  return label;
}

function crossoverTransitionFamilyField(transition) {
  const label = document.createElement("label");
  label.className = "crossover-transition-field";
  const span = document.createElement("span");
  span.textContent = "Family";
  const select = document.createElement("select");
  select.dataset.crossoverField = "family";
  select.append(new Option("Linkwitz-Riley", "linkwitz-riley"), new Option("Butterworth", "butterworth"));
  select.value = CROSSOVER_FAMILIES.includes(transition.family) ? transition.family : "linkwitz-riley";
  setTooltip(select, "Filter family.");
  select.addEventListener("change", () => {
    updateCrossoverTransitionFields(transition.id, { family: select.value }, { animatePlots: true, renderControls: true });
  });
  label.append(span, select);
  return label;
}

function crossoverTransitionOrderField(transition) {
  const label = document.createElement("label");
  label.className = "crossover-transition-field";
  const span = document.createElement("span");
  span.textContent = "Order";
  const select = document.createElement("select");
  select.dataset.crossoverField = "order";
  select.append(new Option("2nd", "2"), new Option("4th", "4"));
  select.value = String(CROSSOVER_ORDERS.includes(Number(transition.order)) ? Number(transition.order) : 4);
  setTooltip(select, "Filter slope.");
  select.addEventListener("change", () => {
    updateCrossoverTransitionFields(transition.id, { order: Number(select.value) }, { animatePlots: true, renderControls: true });
  });
  label.append(span, select);
  return label;
}

function crossoverFamilyLabel(family) {
  return family === "butterworth" ? "BW" : "LR";
}

function addCrossoverTransition() {
  const group = activeCrossoverGroup();
  const members = crossoverGroupMembers(group);
  if (!group || members.length < 2) return;

  const nextState = cloneProject(state);
  const nextGroup = nextState.configGroups.find((item) => item.id === group.id);
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

function addSignalFilter(type = "parametric") {
  if (type === "transition") {
    addCrossoverTransition();
    return;
  }
  const group = activeCrossoverGroup();
  if (!group) return;

  const normalizedType = SIGNAL_FILTER_TYPES.includes(type) ? type : "parametric";
  const nextState = cloneProject(state);
  const nextGroup = nextState.configGroups.find((item) => item.id === group.id);
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
  const nextGroup = nextState.configGroups.find((item) => item.id === group.id);
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
  const nextGroup = nextState.configGroups.find((item) => item.id === group.id);
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
  const nextGroup = nextState.configGroups.find((item) => item.id === group.id);
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
  const nextGroup = nextState.configGroups.find((item) => item.id === group.id);
  const transition = nextGroup?.crossover?.transitions?.find((item) => item.id === transitionId);
  if (!transition) return;
  updater(transition);
  commitCrossoverState(nextState, options);
}

function commitCrossoverState(nextState, options = {}) {
  state = normalizeProjectState(nextState);
  saveProjectState(state);
  if (options.replaceHistory) {
    history.replaceState({ index: historyIndex, project: cloneProject(state) }, "", location.href);
  } else {
    historyIndex += 1;
    history.pushState({ index: historyIndex, project: cloneProject(state) }, "", location.href);
  }
  if (options.renderControls !== false) renderDesignControls();
  render({ animatePlots: Boolean(options.animatePlots) });
}

function renderConfigBar() {
  const openDesignId = document.querySelector(".config-chip-menu.open")?.dataset.designId || "";
  configBarList.replaceChildren();
  state.configGroups.forEach((group, index) => {
    configBarList.append(createConfigGroupBlock(group, index));
  });
  configBarList.append(createUngroupedConfigBlock());
  if (openDesignId) restoreOpenConfigChipMenu(openDesignId);
  updateMobileToolbarOffset();
  window.requestAnimationFrame(updateMobileToolbarOffset);
}

function createConfigGroupBlock(group, index) {
  const groupBlock = document.createElement("article");
  groupBlock.className = "config-group-block";
  groupBlock.dataset.groupId = group.id;
  setTooltip(groupBlock, "Configs in this group.");

  const header = document.createElement("div");
  header.className = "config-group-header";
  header.append(...createConfigGroupControls(group, index));

  const chips = createConfigChipDropZone(group.id);
  state.designs
    .map((design, designIndex) => ({ design, index: designIndex }))
    .filter(({ design }) => design.groupId === group.id)
    .forEach(({ design, index: designIndex }) => chips.append(createConfigChip(design, designIndex)));

  groupBlock.append(header, chips);
  return groupBlock;
}

function createUngroupedConfigBlock() {
  const groupBlock = document.createElement("article");
  groupBlock.className = "config-group-block config-group-block-ungrouped";
  groupBlock.dataset.groupId = UNGROUPED_CONFIG_GROUP_ID;
  setTooltip(groupBlock, "Configs without a group.");

  const header = document.createElement("div");
  header.className = "config-group-header";
  const label = document.createElement("span");
  label.className = "config-group-static-label";
  label.textContent = "No group";
  header.append(label);

  const chips = createConfigChipDropZone(UNGROUPED_CONFIG_GROUP_ID);
  state.designs
    .map((design, designIndex) => ({ design, index: designIndex }))
    .filter(({ design }) => !design.groupId)
    .forEach(({ design, index: designIndex }) => chips.append(createConfigChip(design, designIndex)));

  groupBlock.append(header, chips);
  return groupBlock;
}

function createConfigChipDropZone(groupId) {
  const chips = document.createElement("div");
  chips.className = "config-group-chips";
  chips.dataset.configGroupId = groupId || UNGROUPED_CONFIG_GROUP_ID;
  chips.dataset.emptyLabel = groupId ? "Empty" : "No configs";
  return chips;
}

function restoreOpenConfigChipMenu(designId) {
  const menu = configBarList.querySelector(`.config-chip-menu[data-design-id="${cssEscape(designId)}"]`);
  const button = menu?.querySelector(".config-menu-button");
  if (!menu || !button) return;
  menu.classList.add("open");
  button.ariaExpanded = "true";
  requestAnimationFrame(() => positionConfigChipMenu(menu));
  window.setTimeout(() => positionConfigChipMenu(menu), 80);
}

function createConfigGroupControls(group, groupIndex) {
  const name = document.createElement("input");
  name.type = "text";
  name.value = group.name;
  name.ariaLabel = "Config group name";
  setTooltip(name, "Rename this config group.");
  name.addEventListener("click", (event) => event.stopPropagation());
  name.addEventListener("keydown", (event) => event.stopPropagation());
  name.addEventListener("change", () => updateConfigGroup(group.id, { name: name.value.trim() || group.name }));

  const combined = document.createElement("button");
  combined.type = "button";
  combined.className = "config-group-combined-toggle";
  combined.classList.toggle("active", group.showCombined === true);
  combined.classList.toggle("rendered", isConfigGroupCombinedRendered(group));
  const groupColor = designColor(configGroupCombinedColorIndex(groupIndex));
  combined.style.setProperty("--config-group-combined-color", groupColor);
  combined.style.setProperty("--config-group-combined-text", readableTextColor(groupColor));
  combined.textContent = "Σ";
  combined.ariaLabel = `${group.showCombined === true ? "Hide" : "Show"} combined group curve`;
  setTooltip(combined, "Show or hide the acoustically summed curve for this group.");
  combined.addEventListener("click", (event) => {
    event.stopPropagation();
    updateConfigGroup(group.id, { showCombined: group.showCombined !== true });
  });

  const remove = document.createElement("button");
  remove.type = "button";
  remove.textContent = "x";
  remove.ariaLabel = `Remove ${group.name}`;
  setTooltip(remove, "Remove this group and move its configs to the next group.");
  remove.addEventListener("click", (event) => {
    event.stopPropagation();
    deleteConfigGroup(group.id);
  });

  return [name, combined, remove];
}

function createConfigChip(design, index) {
  const chip = document.createElement("div");
  chip.className = "config-chip";
  chip.tabIndex = 0;
  chip.role = "button";
  chip.draggable = true;
  chip.dataset.designId = design.id;
  chip.dataset.configGroupId = design.groupId || UNGROUPED_CONFIG_GROUP_ID;
  chip.classList.toggle("active", design.id === state.activeDesignId);
  chip.classList.toggle("muted", design.visible === false);
  chip.classList.toggle("graph-hidden", design.graphVisible === false);
  chip.dataset.shortName = compactDesignName(design);
  setTooltip(chip, "Select this config for editing.");
  chip.addEventListener("click", (event) => {
    if (chip.dataset.justDragged === "true") {
      delete chip.dataset.justDragged;
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (event.target.closest("button, input, select, textarea, label, .config-chip-menu")) return;
    activateDesign(design.id);
  });
  chip.addEventListener("keydown", (event) => {
    if (event.target !== chip || !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    activateDesign(design.id);
  });

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = design.visible !== false;
  checkbox.ariaLabel = `${design.visible === false ? "Activate" : "Deactivate"} ${design.name}`;
  setTooltip(checkbox, "Activate or deactivate this config.");
  checkbox.addEventListener("click", (event) => event.stopPropagation());
  checkbox.addEventListener("change", () => setDesignVisibility(design.id, checkbox.checked));

  const swatch = document.createElement("span");
  swatch.className = "legend-swatch";
  swatch.style.background = designColorForDesign(design, index);
  setTooltip(swatch, "Graph color for this config.");

  const name = design.id === state.activeDesignId ? document.createElement("input") : document.createElement("span");
  name.className = "config-name";
  if (design.id === state.activeDesignId) {
    name.type = "text";
    name.value = design.name;
    name.ariaLabel = "Active config name";
    setTooltip(name, "Rename the active config.");
    name.addEventListener("click", (event) => event.stopPropagation());
    name.addEventListener("keydown", (event) => {
      event.stopPropagation();
      if (event.key === "Enter") name.blur();
      if (event.key === "Escape") {
        name.value = design.name;
        name.blur();
      }
    });
    name.addEventListener("change", () => renameActiveDesign(name.value));
  } else {
    name.textContent = design.name;
  }

  const visibility = createConfigVisibilityToggle(design);

  const menu = createConfigChipMenu(design, index);

  chip.append(checkbox, visibility, swatch, name, menu);
  return chip;
}

function createConfigVisibilityToggle(design) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "config-visibility-toggle";
  button.classList.toggle("active", design.graphVisible !== false);
  button.ariaLabel = `${design.graphVisible === false ? "Show" : "Hide"} ${design.name} curve`;
  button.setAttribute("aria-pressed", String(design.graphVisible !== false));
  setTooltip(button, "Show or hide only this config's individual graph curve.");
  button.append(createEyeIcon(design.graphVisible !== false));
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    setDesignGraphVisibility(design.id, design.graphVisible === false);
  });
  return button;
}

function createEyeIcon(isVisible) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");

  const paths = isVisible
    ? [
        "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z",
        "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
      ]
    : [
        "M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68",
        "M6.61 6.61C3.98 8.38 2 12 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61",
        "M14.12 14.12a3 3 0 0 1-4.24-4.24",
        "M3 3l18 18",
      ];

  paths.forEach((definition) => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", definition);
    svg.append(path);
  });
  return svg;
}

function createTrashIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");

  ["M3 6h18", "M8 6V4h8v2", "M19 6l-1 14H6L5 6", "M10 11v6", "M14 11v6"].forEach((definition) => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", definition);
    svg.append(path);
  });
  return svg;
}

function createConfigChipMenu(design, index) {
  const menu = document.createElement("div");
  menu.className = "config-chip-menu";
  menu.dataset.designId = design.id;
  menu.addEventListener("pointerdown", (event) => event.stopPropagation());
  menu.addEventListener("click", (event) => event.stopPropagation());

  const menuButton = document.createElement("button");
  menuButton.type = "button";
  menuButton.className = "config-menu-button";
  menuButton.ariaLabel = `${design.name} config menu`;
  menuButton.ariaExpanded = "false";
  menuButton.textContent = "\u22ee";
  setTooltip(menuButton, "Config actions.");

  const panel = document.createElement("div");
  panel.className = "config-chip-menu-panel";

  const groupLabel = document.createElement("label");
  groupLabel.className = "config-menu-field";
  const groupText = document.createElement("span");
  groupText.textContent = "Group";
  const groupSelect = document.createElement("select");
  groupSelect.ariaLabel = `${design.name} group`;
  const noGroupOption = document.createElement("option");
  noGroupOption.value = UNGROUPED_CONFIG_GROUP_ID;
  noGroupOption.textContent = "No group";
  groupSelect.append(noGroupOption);
  state.configGroups.forEach((group) => {
    const option = document.createElement("option");
    option.value = group.id;
    option.textContent = group.name;
    groupSelect.append(option);
  });
  groupSelect.value = design.groupId || UNGROUPED_CONFIG_GROUP_ID;
  groupSelect.addEventListener("change", () => {
    assignDesignToConfigGroup(design.id, groupSelect.value);
    menu.classList.remove("open");
  });
  groupLabel.append(groupText, groupSelect);

  const colorBlock = document.createElement("div");
  colorBlock.className = "config-menu-field";
  const colorText = document.createElement("span");
  colorText.textContent = "Color";
  const colorGrid = document.createElement("div");
  colorGrid.className = "config-color-grid";
  const autoColor = designColor(index);
  const autoButton = document.createElement("button");
  autoButton.type = "button";
  autoButton.className = "config-color-swatch";
  autoButton.classList.toggle("active", !design.color);
  autoButton.style.background = `linear-gradient(135deg, ${autoColor} 0 45%, transparent 45% 55%, ${autoColor} 55%)`;
  autoButton.ariaLabel = "Use automatic color";
  setTooltip(autoButton, "Use automatic color from the palette.");
  autoButton.addEventListener("click", () => {
    setDesignColor(design.id, "");
    menu.classList.remove("open");
  });
  colorGrid.append(autoButton);
  designPalette().forEach((color) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "config-color-swatch";
    button.classList.toggle("active", designColorForDesign(design, index) === color && Boolean(design.color));
    button.style.background = color;
    button.ariaLabel = `Set color ${color}`;
    button.addEventListener("click", () => {
      setDesignColor(design.id, color);
      menu.classList.remove("open");
    });
    colorGrid.append(button);
  });
  colorBlock.append(colorText, colorGrid);

  const duplicate = document.createElement("button");
  duplicate.type = "button";
  duplicate.textContent = "Duplicate";
  duplicate.addEventListener("click", () => {
    duplicateDesign(design.id);
    menu.classList.remove("open");
  });

  const remove = document.createElement("button");
  remove.type = "button";
  remove.textContent = "Delete";
  remove.disabled = state.designs.length <= 1;
  remove.className = "danger";
  setTooltip(remove, state.designs.length <= 1 ? "Keep at least one config." : "Delete this config.");
  remove.addEventListener("click", () => {
    deleteDesign(design.id);
    menu.classList.remove("open");
  });

  panel.append(groupLabel, colorBlock, duplicate, remove);
  menu.append(menuButton, panel);
  return menu;
}

function handleConfigChipDragStart(event) {
  const chip = event.target.closest(".config-chip");
  if (!chip || !configBarList.contains(chip)) return;
  if (isConfigChipInteractiveTarget(event.target)) {
    event.preventDefault();
    return;
  }

  cancelConfigChipPointerDrag();
  draggedConfigDesignId = chip.dataset.designId || "";
  if (!draggedConfigDesignId) {
    event.preventDefault();
    return;
  }

  closeConfigChipMenus();
  chip.classList.add("is-dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", draggedConfigDesignId);
}

function handleConfigChipDragOver(event) {
  if (!draggedConfigDesignId) return;
  const dropZone = event.target.closest(".config-group-chips");
  if (!dropZone || !configBarList.contains(dropZone)) return;

  event.preventDefault();
  updateConfigChipDropPreview(event.target, event.clientX, event.clientY);
  event.dataTransfer.dropEffect = "move";
}

function handleConfigChipDragLeave(event) {
  const dropZone = event.target.closest(".config-group-chips");
  if (dropZone && !dropZone.contains(event.relatedTarget)) {
    dropZone.classList.remove("drop-target");
    clearDropMarkers(dropZone);
  }
}

function handleConfigChipDrop(event) {
  if (!draggedConfigDesignId) return;
  const dropZone = event.target.closest(".config-group-chips");
  if (!dropZone || !configBarList.contains(dropZone)) return;

  event.preventDefault();
  dropConfigChipAt(event.target, event.clientX, event.clientY);
  clearConfigChipDropMarkers();
}

function handleConfigChipDragEnd() {
  draggedConfigDesignId = "";
  clearConfigChipDropMarkers();
  configBarList.querySelectorAll(".is-dragging").forEach((item) => {
    item.classList.remove("is-dragging");
  });
}

function handleConfigChipPointerDown(event) {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  const chip = event.target.closest(".config-chip");
  if (!chip || !configBarList.contains(chip) || isConfigChipInteractiveTarget(event.target)) return;
  const designId = chip.dataset.designId || "";
  if (!designId) return;

  configPointerDrag = {
    chip,
    designId,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    moved: false,
  };
  document.addEventListener("pointermove", handleConfigChipPointerMove, { passive: false });
  document.addEventListener("pointerup", handleConfigChipPointerUp, { passive: false });
  document.addEventListener("pointercancel", cancelConfigChipPointerDrag, { passive: false });
}

function handleConfigChipPointerMove(event) {
  if (!configPointerDrag || event.pointerId !== configPointerDrag.pointerId) return;
  const distance = Math.hypot(event.clientX - configPointerDrag.startX, event.clientY - configPointerDrag.startY);
  if (!configPointerDrag.moved && distance < 7) return;

  event.preventDefault();
  if (!configPointerDrag.moved) {
    configPointerDrag.moved = true;
    draggedConfigDesignId = configPointerDrag.designId;
    closeConfigChipMenus();
    configPointerDrag.chip.classList.add("is-dragging");
  }
  updateConfigChipDropPreview(document.elementFromPoint(event.clientX, event.clientY), event.clientX, event.clientY);
}

function handleConfigChipPointerUp(event) {
  if (!configPointerDrag || event.pointerId !== configPointerDrag.pointerId) return;
  const drag = configPointerDrag;
  if (drag.moved) {
    event.preventDefault();
    drag.chip.dataset.justDragged = "true";
    window.setTimeout(() => {
      delete drag.chip.dataset.justDragged;
    }, 0);
    dropConfigChipAt(document.elementFromPoint(event.clientX, event.clientY), event.clientX, event.clientY);
  }
  cancelConfigChipPointerDrag();
}

function cancelConfigChipPointerDrag() {
  document.removeEventListener("pointermove", handleConfigChipPointerMove);
  document.removeEventListener("pointerup", handleConfigChipPointerUp);
  document.removeEventListener("pointercancel", cancelConfigChipPointerDrag);
  configPointerDrag?.chip.classList.remove("is-dragging");
  configPointerDrag = null;
  draggedConfigDesignId = "";
  clearConfigChipDropMarkers();
}

function updateConfigChipDropPreview(target, x, y) {
  const dropZone = target?.closest?.(".config-group-chips");
  if (!dropZone || !configBarList.contains(dropZone)) {
    clearConfigChipDropMarkers();
    return;
  }

  clearConfigChipDropMarkers();
  const targetChip = configDropTargetChip(target, dropZone);
  if (targetChip && targetChip.dataset.designId !== draggedConfigDesignId) {
    const placement = getDropPlacement(targetChip, x, y);
    targetChip.classList.add(placement === "before" ? "drop-before" : "drop-after");
  } else {
    dropZone.classList.add("drop-target");
  }
}

function dropConfigChipAt(target, x, y) {
  if (!draggedConfigDesignId) return;
  const dropZone = target?.closest?.(".config-group-chips");
  if (!dropZone || !configBarList.contains(dropZone)) return;

  const targetChip = configDropTargetChip(target, dropZone);
  if (targetChip?.dataset.designId === draggedConfigDesignId) return;

  let beforeDesignId = "";
  if (targetChip) {
    const placement = getDropPlacement(targetChip, x, y);
    beforeDesignId = placement === "before"
      ? targetChip.dataset.designId
      : nextConfigChipDesignId(targetChip);
  }

  moveDesignToConfigGroup(draggedConfigDesignId, dropZone.dataset.configGroupId || UNGROUPED_CONFIG_GROUP_ID, beforeDesignId);
}

function isConfigChipInteractiveTarget(target) {
  return Boolean(target.closest("button, input, select, textarea, label, .config-chip-menu"));
}

function configDropTargetChip(target, dropZone) {
  const chip = target.closest?.(".config-chip");
  return chip?.parentElement === dropZone ? chip : null;
}

function nextConfigChipDesignId(chip) {
  let next = chip.nextElementSibling;
  while (next) {
    if (next.classList?.contains("config-chip") && next.dataset.designId !== draggedConfigDesignId) {
      return next.dataset.designId || "";
    }
    next = next.nextElementSibling;
  }
  return "";
}

function clearConfigChipDropMarkers() {
  configBarList.querySelectorAll(".drop-before, .drop-after, .drop-target").forEach((item) => {
    item.classList.remove("drop-before", "drop-after", "drop-target");
  });
}

function handleMeasurementChipDragStart(event) {
  const chip = event.target.closest(".measurement-chip");
  if (!chip || !measurementList?.contains(chip)) return;
  if (isMeasurementChipInteractiveTarget(event.target)) {
    event.preventDefault();
    return;
  }

  cancelMeasurementPointerDrag();
  draggedMeasurementResponseId = chip.dataset.measurementId?.replace(/^response:/, "") || "";
  if (!draggedMeasurementResponseId) {
    event.preventDefault();
    return;
  }

  chip.classList.add("is-dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", draggedMeasurementResponseId);
}

function handleMeasurementChipDragOver(event) {
  if (!draggedMeasurementResponseId) return;
  const dropZone = event.target.closest(".measurement-group-chips");
  if (!dropZone || !measurementList?.contains(dropZone)) return;
  event.preventDefault();
  updateMeasurementChipDropPreview(event.target, event.clientX, event.clientY);
  event.dataTransfer.dropEffect = "move";
}

function handleMeasurementChipDragLeave(event) {
  const dropZone = event.target.closest(".measurement-group-chips");
  if (dropZone && !dropZone.contains(event.relatedTarget)) {
    dropZone.classList.remove("drop-target");
    clearDropMarkers(dropZone);
  }
}

function handleMeasurementChipDrop(event) {
  if (!draggedMeasurementResponseId) return;
  const dropZone = event.target.closest(".measurement-group-chips");
  if (!dropZone || !measurementList?.contains(dropZone)) return;
  event.preventDefault();
  dropMeasurementChipAt(event.target, event.clientX, event.clientY);
  clearMeasurementChipDropMarkers();
}

function handleMeasurementChipDragEnd() {
  draggedMeasurementResponseId = "";
  clearMeasurementChipDropMarkers();
  measurementList?.querySelectorAll(".measurement-chip.is-dragging").forEach((item) => item.classList.remove("is-dragging"));
}

function handleMeasurementChipPointerDown(event) {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  const chip = event.target.closest(".measurement-chip");
  if (!chip || !measurementList?.contains(chip) || isMeasurementChipInteractiveTarget(event.target)) return;
  const responseId = chip.dataset.measurementId?.replace(/^response:/, "") || "";
  if (!responseId) return;

  measurementPointerDrag = {
    chip,
    responseId,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    moved: false,
  };
  document.addEventListener("pointermove", handleMeasurementChipPointerMove, { passive: false });
  document.addEventListener("pointerup", handleMeasurementChipPointerUp, { passive: false });
  document.addEventListener("pointercancel", cancelMeasurementPointerDrag, { passive: false });
}

function handleMeasurementChipPointerMove(event) {
  if (!measurementPointerDrag || event.pointerId !== measurementPointerDrag.pointerId) return;
  const distance = Math.hypot(event.clientX - measurementPointerDrag.startX, event.clientY - measurementPointerDrag.startY);
  if (!measurementPointerDrag.moved && distance < 7) return;

  event.preventDefault();
  if (!measurementPointerDrag.moved) {
    measurementPointerDrag.moved = true;
    draggedMeasurementResponseId = measurementPointerDrag.responseId;
    measurementPointerDrag.chip.classList.add("is-dragging");
  }
  updateMeasurementChipDropPreview(document.elementFromPoint(event.clientX, event.clientY), event.clientX, event.clientY);
}

function handleMeasurementChipPointerUp(event) {
  if (!measurementPointerDrag || event.pointerId !== measurementPointerDrag.pointerId) return;
  const drag = measurementPointerDrag;
  if (drag.moved) {
    event.preventDefault();
    drag.chip.dataset.justDragged = "true";
    window.setTimeout(() => {
      delete drag.chip.dataset.justDragged;
    }, 0);
    dropMeasurementChipAt(document.elementFromPoint(event.clientX, event.clientY), event.clientX, event.clientY);
  }
  cancelMeasurementPointerDrag();
}

function cancelMeasurementPointerDrag() {
  document.removeEventListener("pointermove", handleMeasurementChipPointerMove);
  document.removeEventListener("pointerup", handleMeasurementChipPointerUp);
  document.removeEventListener("pointercancel", cancelMeasurementPointerDrag);
  measurementPointerDrag?.chip.classList.remove("is-dragging");
  measurementPointerDrag = null;
  draggedMeasurementResponseId = "";
  clearMeasurementChipDropMarkers();
}

function updateMeasurementChipDropPreview(target, x, y) {
  const dropZone = target?.closest?.(".measurement-group-chips");
  if (!dropZone || !measurementList?.contains(dropZone)) {
    clearMeasurementChipDropMarkers();
    return;
  }

  clearMeasurementChipDropMarkers();
  const targetChip = measurementDropTargetChip(target, dropZone);
  if (targetChip && targetChip.dataset.measurementId !== `response:${draggedMeasurementResponseId}`) {
    const placement = getDropPlacement(targetChip, x, y);
    targetChip.classList.add(placement === "before" ? "drop-before" : "drop-after");
  } else {
    dropZone.classList.add("drop-target");
  }
}

function dropMeasurementChipAt(target, x, y) {
  if (!draggedMeasurementResponseId) return;
  const dropZone = target?.closest?.(".measurement-group-chips");
  if (!dropZone || !measurementList?.contains(dropZone)) return;

  const targetChip = measurementDropTargetChip(target, dropZone);
  if (targetChip?.dataset.measurementId === `response:${draggedMeasurementResponseId}`) return;

  let beforeResponseId = "";
  if (targetChip) {
    const placement = getDropPlacement(targetChip, x, y);
    beforeResponseId = placement === "before"
      ? targetChip.dataset.measurementId.replace(/^response:/, "")
      : nextMeasurementChipResponseId(targetChip);
  }

  moveFrequencyResponseToMeasurementGroup(
    draggedMeasurementResponseId,
    dropZone.dataset.measurementGroupId || UNGROUPED_MEASUREMENT_GROUP_ID,
    beforeResponseId,
  );
}

function isMeasurementChipInteractiveTarget(target) {
  return Boolean(target.closest("button, input, select, textarea, label"));
}

function measurementDropTargetChip(target, dropZone) {
  const chip = target.closest?.(".measurement-chip");
  return chip?.parentElement === dropZone ? chip : null;
}

function nextMeasurementChipResponseId(chip) {
  let next = chip.nextElementSibling;
  while (next) {
    if (next.classList?.contains("measurement-chip") && next.dataset.measurementId !== `response:${draggedMeasurementResponseId}`) {
      return next.dataset.measurementId.replace(/^response:/, "");
    }
    next = next.nextElementSibling;
  }
  return "";
}

function clearMeasurementChipDropMarkers() {
  measurementList?.querySelectorAll(".measurement-chip.drop-before, .measurement-chip.drop-after, .measurement-group-chips.drop-target").forEach((item) => {
    item.classList.remove("drop-before", "drop-after", "drop-target");
  });
}

function positionConfigChipMenu(menu) {
  const panel = menu.querySelector(".config-chip-menu-panel");
  const button = menu.querySelector(".config-menu-button");
  if (!panel || !button) return;
  const rect = button.getBoundingClientRect();
  const panelWidth = panel.offsetWidth || 224;
  const panelHeight = panel.offsetHeight || 220;
  const gap = 6;
  const left = Math.max(8, Math.min(window.innerWidth - panelWidth - 8, rect.right - panelWidth));
  panel.style.left = `${Math.round(left)}px`;
  panel.style.top = "";
  panel.style.bottom = "";

  if (isMobileLayout()) {
    const availableBelow = window.innerHeight - rect.bottom - gap - 8;
    const availableAbove = rect.top - gap - 8;
    const shouldOpenBelow = rect.top < window.innerHeight / 2 || availableBelow >= Math.min(panelHeight, 150);
    if (shouldOpenBelow) {
      const top = Math.max(8, Math.round(rect.bottom + gap));
      panel.style.top = `${top}px`;
      panel.style.maxHeight = `${Math.max(150, Math.round(window.innerHeight - top - 8))}px`;
    } else {
      const bottom = Math.max(8, Math.round(window.innerHeight - rect.top + gap));
      panel.style.bottom = `${bottom}px`;
      panel.style.maxHeight = `${Math.max(150, Math.round(availableAbove))}px`;
    }
    return;
  }

  const fromBottomBar = Boolean(menu.closest(".config-bar"));
  const shouldOpenBelow = !fromBottomBar && rect.top < window.innerHeight / 2 && rect.bottom + gap + panelHeight <= window.innerHeight;
  const top = shouldOpenBelow
    ? rect.bottom + gap
    : Math.max(8, rect.top - panelHeight - gap);
  panel.style.top = `${Math.round(top)}px`;
  panel.style.maxHeight = `${Math.max(160, Math.round(window.innerHeight - top - 8))}px`;
}

function toggleConfigChipMenu(menu, button = menu.querySelector(".config-menu-button")) {
  const willOpen = !menu.classList.contains("open");
  closeConfigChipMenus();
  menu.classList.toggle("open", willOpen);
  if (button) button.ariaExpanded = String(willOpen);
  if (willOpen) {
    positionConfigChipMenu(menu);
    requestAnimationFrame(() => positionConfigChipMenu(menu));
    window.setTimeout(() => positionConfigChipMenu(menu), 80);
  }
}

function closeConfigChipMenus() {
  document.querySelectorAll(".config-chip-menu.open").forEach((menu) => {
    menu.classList.remove("open");
    const button = menu.querySelector(".config-menu-button");
    if (button) button.ariaExpanded = "false";
  });
}

function renderDriverGroups() {
  if (!driverGroupList) return;
  driverGroupList.replaceChildren();
  state.driverGroups.forEach((group) => {
    const card = document.createElement("article");
    card.className = "driver-group-card";
    card.classList.toggle("active", group.id === state.activeDriverGroupId);
    card.addEventListener("click", () => activateDriverGroup(group.id));
    setTooltip(card, "Select this driver group for editing.");

    const header = document.createElement("div");
    header.className = "driver-group-card-header";

    const name = document.createElement("input");
    name.type = "text";
    name.value = group.name;
    name.ariaLabel = "Driver group name";
    setTooltip(name, "Name this driver group.");
    name.addEventListener("click", (event) => event.stopPropagation());
    name.addEventListener("change", () => updateDriverGroup(group.id, { name: name.value.trim() || group.name }));

    const actions = document.createElement("div");
    actions.className = "driver-group-actions";

    const duplicate = document.createElement("button");
    duplicate.type = "button";
    duplicate.textContent = "+";
    duplicate.ariaLabel = `Duplicate ${group.name}`;
    setTooltip(duplicate, "Duplicate this driver group.");
    duplicate.addEventListener("click", (event) => {
      event.stopPropagation();
      duplicateDriverGroup(group.id);
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "x";
    remove.disabled = state.driverGroups.length <= 1;
    remove.ariaLabel = `Remove ${group.name}`;
    setTooltip(remove, "Remove this driver group.");
    remove.addEventListener("click", (event) => {
      event.stopPropagation();
      deleteDriverGroup(group.id);
    });

    actions.append(duplicate, remove);
    header.append(name, actions);

    const driverRow = document.createElement("label");
    driverRow.className = "driver-group-row wide";
    const driverLabel = document.createElement("span");
    driverLabel.textContent = "Driver";
    const driverPick = document.createElement("select");
    driverPick.ariaLabel = `${group.name} driver`;
    const customOption = document.createElement("option");
    customOption.value = "";
    customOption.textContent = "Custom group driver";
    driverPick.append(customOption);
    driverLibrary.forEach((entry) => {
      const option = document.createElement("option");
      option.value = entry.id;
      option.textContent = entry.name;
      driverPick.append(option);
    });
    const match = driverLibrary.find((entry) => driverMatches(group.driver, entry.driver));
    driverPick.value = match?.id || "";
    driverPick.addEventListener("click", (event) => event.stopPropagation());
    driverPick.addEventListener("change", () => updateDriverGroupDriver(group.id, driverPick.value));
    driverRow.append(driverLabel, driverPick);

    const fields = document.createElement("div");
    fields.className = "driver-group-fields";
    fields.append(
      driverGroupNumberField(group, "Count", "count", 1, 16, 1),
      driverGroupSelectField(group),
    );

    card.append(header, driverRow, fields);
    driverGroupList.append(card);
  });
}

function driverGroupNumberField(group, labelText, key, min, max, step) {
  const label = document.createElement("label");
  label.className = "driver-group-row";
  const span = document.createElement("span");
  span.textContent = labelText;
  const input = document.createElement("input");
  input.type = "number";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = group[key];
  input.addEventListener("click", (event) => event.stopPropagation());
  input.addEventListener("change", () => updateDriverGroup(group.id, { [key]: Number(input.value) }));
  label.append(span, input);
  return label;
}

function driverGroupSelectField(group) {
  const label = document.createElement("label");
  label.className = "driver-group-row";
  const span = document.createElement("span");
  span.textContent = "Wiring";
  const select = document.createElement("select");
  select.innerHTML = '<option value="parallel">Parallel</option><option value="series">Series</option>';
  select.value = group.wiring;
  select.addEventListener("click", (event) => event.stopPropagation());
  select.addEventListener("change", () => updateDriverGroup(group.id, { wiring: select.value }));
  label.append(span, select);
  return label;
}

function renameActiveDesign(rawName) {
  const name = rawName.trim();
  if (!name) {
    renderConfigBar();
    return;
  }
  const nextState = cloneProject(state);
  getActiveDesign(nextState).name = name;
  commitState(nextState);
}

function importProjectJson(text) {
  try {
    stagedRecordingResponse = null;
    commitState(normalizeProjectState(JSON.parse(text)), { hydrate: true });
    projectDialogStatus.textContent = "";
    importExportDialog.close();
  } catch (error) {
    projectDialogStatus.textContent = "Could not import JSON. Check the project data and try again.";
    console.error(error);
  }
}

async function importFrequencyResponseFile(file) {
  try {
    const source = file.name || "frequency-response";
    const fallbackName = source.replace(/\.[^.]+$/, "");
    const rawAngle = measurementAngleInput?.value?.trim();
    const angleDeg = rawAngle ? Number(rawAngle) : inferAngleFromName(source);
    const response = parseFrequencyResponseText(await file.text(), {
      name: measurementNameInput?.value?.trim() || fallbackName,
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
    if (measurementNameInput) measurementNameInput.value = "";
    if (measurementStatus) {
      measurementStatus.textContent = `Imported ${response.points.length} points from ${source}.`;
    }
  } catch (error) {
    if (measurementStatus) measurementStatus.textContent = error.message || "Could not import frequency response.";
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
    if (measurementStatus) {
      measurementStatus.textContent = `Added ${response.points.length} points from ${result.source || "web search"}.`;
    }
    driverSearchStatus.textContent = `${response.name} added to Measurement.`;
  } catch (error) {
    driverSearchStatus.textContent = error.message || "Could not add frequency response.";
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
      measurementStatus.textContent = actionText;
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
  if (measurementStatus) measurementStatus.textContent = `${shortMeasurementName(response)} angle set to ${Math.round(nextAngle)} deg.`;
}

function removeFrequencyResponse(responseId) {
  const nextState = cloneProject(state);
  nextState.measurements = normalizeMeasurements(nextState.measurements);
  nextState.measurements.frequencyResponses = nextState.measurements.frequencyResponses.filter((item) => item.id !== responseId);
  commitState(nextState, { animatePlots: true });
  if (measurementStatus) measurementStatus.textContent = "Frequency response removed.";
}

function removeFrequencyResponseCandidate(candidateId) {
  const nextState = cloneProject(state);
  nextState.measurements = normalizeMeasurements(nextState.measurements);
  nextState.measurements.frequencyResponseCandidates = nextState.measurements.frequencyResponseCandidates.filter((item) => item.id !== candidateId);
  commitState(nextState, { animatePlots: true });
  if (measurementStatus) measurementStatus.textContent = "Frequency response candidate removed.";
}

function updateFrequencyResponseTarget(responseId, target) {
  const nextState = cloneProject(state);
  nextState.measurements = normalizeMeasurements(nextState.measurements);
  const response = nextState.measurements.frequencyResponses.find((item) => item.id === responseId);
  if (!response) return;
  response.target = String(target || "").trim() || defaultMeasurementTarget();
  commitState(nextState, { animatePlots: true });
  if (measurementStatus) measurementStatus.textContent = `${shortMeasurementName(response)} target set to ${measurementTargetLabel(response.target)}.`;
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

function createDesignId() {
  return `design-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function createConfigGroupId() {
  return `config-group-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function createCrossoverTransitionId() {
  return `crossover-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function createSignalFilterId() {
  return `signal-filter-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function createDriverGroupId() {
  return `driver-group-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function createMeasurementGroupId() {
  return `measurement-group-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function uniqueDesignName(designs, baseName) {
  const names = new Set(designs.map((design) => design.name));
  if (!names.has(baseName)) return baseName;
  let index = 2;
  while (names.has(`${baseName} ${index}`)) index += 1;
  return `${baseName} ${index}`;
}

function uniqueDriverGroupName(groups, baseName) {
  const names = new Set(groups.map((group) => group.name));
  if (!names.has(baseName)) return baseName;
  let index = 2;
  while (names.has(`${baseName} ${index}`)) index += 1;
  return `${baseName} ${index}`;
}

function uniqueConfigGroupName(groups, baseName) {
  const names = new Set(groups.map((group) => group.name));
  if (!names.has(baseName)) return baseName;
  let index = 2;
  while (names.has(`${baseName} ${index}`)) index += 1;
  return `${baseName} ${index}`;
}

function designNameFromBox(mode, box) {
  return `${Number(box.volumeL || 0).toFixed(0)} L ${formatMode(mode)}`;
}

function designNameFromDriver(driver) {
  return driverNameForParameters(driver) || "Custom driver";
}

function legacyDesignNameFromBox(mode, box) {
  return `${Number(box.volumeL || 0).toFixed(0)} L ${mode}`;
}

function normalizedDesignName(name, design) {
  const currentName = String(name || "").trim();
  if (!currentName || currentName === designNameFromBox(design.mode, design.box) || currentName === legacyDesignNameFromBox(design.mode, design.box)) {
    return designNameFromDriver(designDriverForName(design));
  }
  return name;
}

function formatMode(mode) {
  if (mode === "sealed") return "Sealed";
  if (mode === "vented") return "Vented";
  if (mode === "passive") return "P-Radiator";
  if (mode === "bandpass") return "Bandpass";
  return String(mode || "Design");
}

function compactDesignName(design) {
  const name = String(design?.name || designNameFromDriver(designDriverForName(design)) || "Config").replace(/\s+/g, " ").trim();
  if (!name) return "Config";
  const withoutBrandNoise = name
    .replace(/\baudiosim\b/gi, "")
    .replace(/\b(audio|driver|speaker|subwoofer|woofer|ohm)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return (withoutBrandNoise || name).slice(0, 8);
}

function designDriverForName(design = {}) {
  const activeGroup = design.driverGroups?.find((group) => group.id === design.activeDriverGroupId) || design.driverGroups?.[0];
  return completeDriverParameters(sampleProject.driver, activeGroup?.driver || design.driver || state?.driver || sampleProject.driver);
}

function driverNameForParameters(driver) {
  const normalizedDriver = completeDriverParameters(sampleProject.driver, driver);
  return driverLibrary.find((entry) => driverMatches(normalizedDriver, entry.driver))?.name || "";
}

async function searchDriverSpecs() {
  const query = driverSearchInput.value.trim();
  if (!query) {
    driverSearchStatus.textContent = "Enter a driver model, manufacturer, or datasheet URL.";
    return;
  }

  driverSearchButton.disabled = true;
  const directUrl = isHttpUrl(query);
  driverSearchStatus.textContent = directUrl ? "Reading datasheet and response sources..." : "Searching web for T/S parameters and frequency responses...";
  driverSearchResults.replaceChildren();

  try {
    const driverPayload = await fetchSearchJson(`/api/driver-search?q=${encodeURIComponent(query)}`);
    const driverResults = driverPayload.results || [];
    const frequencyResults = driverPayload.frequencyResponses || [];

    renderDriverSearchResults(driverResults, frequencyResults, query);

    const statusParts = [];
    if (driverResults.length) {
      statusParts.push(driverPayload.imageOnlyPdf
        ? `PDF has no selectable text. Values found from "${driverPayload.fallbackQuery || "an alternate source"}"; verify before applying.`
        : driverPayload.directUrl
          ? "Datasheet parsed. Verify the values before applying."
          : `${driverResults.length} driver candidate${driverResults.length === 1 ? "" : "s"} found. Verify before applying.`);
    } else {
      statusParts.push(driverPayload.directUrl
        ? "No usable T/S parameter set found at this URL."
        : "No usable T/S parameter set found.");
    }
    if (frequencyResults.length) {
      const parsedCount = frequencyResults.filter((result) => result.status === "parsed").length;
      statusParts.push(`${frequencyResults.length} response candidate${frequencyResults.length === 1 ? "" : "s"} found${parsedCount ? `, ${parsedCount} importable` : ""}; added only when you apply a driver.`);
    }
    if (driverPayload.frequencyResponseError) statusParts.push(`Response search failed: ${driverPayload.frequencyResponseError}.`);
    driverSearchStatus.textContent = statusParts.join(" ");
  } catch (error) {
    driverSearchStatus.textContent = error.message || "Search failed.";
  } finally {
    driverSearchButton.disabled = false;
  }
}

function uniqueMeasurementGroupName(groups, baseName) {
  const names = new Set((groups || []).map((group) => group.name));
  if (!names.has(baseName)) return baseName;
  let index = 2;
  while (names.has(`${baseName} ${index}`)) index += 1;
  return `${baseName} ${index}`;
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

async function fetchSearchJson(url) {
  const response = await fetch(url);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || `Search failed with HTTP ${response.status}`);
  return payload;
}

function renderDriverSearchResults(results, frequencyResults = [], query = "") {
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

    const values = renderDriverResultValues(result.driver || {});

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
      ? renderSearchResultValues(FREQUENCY_RESPONSE_RESULT_FIELDS, result, "No numeric response values recognized.")
      : renderFrequencyResponseCandidateValues(result);

    const fields = document.createElement("div");
    fields.className = "search-result-fields";
    fields.textContent = result.reason || "Potential frequency response source.";

    item.append(titleRow, meta, values, fields);
    driverSearchResults.append(item);
  });
}

function renderDriverResultValues(driver) {
  return renderSearchResultValues(DRIVER_RESULT_FIELDS, driver, "No numeric driver values recognized.");
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

function formatDriverFrequencyResponseSummary(matches = []) {
  if (!matches.length) return "Frequency response: none found for this driver.";
  const parsedCount = matches.filter((result) => result.status === "parsed").length;
  const sources = [...new Set(matches.map((result) => result.source).filter(Boolean))].slice(0, 2);
  const sourceText = sources.length ? ` from ${sources.join(", ")}` : "";
  return `Frequency response: ${matches.length} candidate${matches.length === 1 ? "" : "s"} found${parsedCount ? `, ${parsedCount} importable` : ""}${sourceText}.`;
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

async function searchPassiveRadiatorSpecs() {
  const query = passiveRadiatorSearchInput.value.trim();
  if (!query) {
    passiveRadiatorSearchStatus.textContent = "Enter a P-Radiator model, manufacturer, or datasheet URL.";
    return;
  }

  passiveRadiatorSearchButton.disabled = true;
  const directUrl = isHttpUrl(query);
  passiveRadiatorSearchStatus.textContent = directUrl ? "Reading P-Radiator datasheet URL..." : "Searching web for P-Radiator parameters...";
  passiveRadiatorSearchResults.replaceChildren();

  try {
    const response = await fetch(`/api/passive-radiator-search?q=${encodeURIComponent(query)}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || `Search failed with HTTP ${response.status}`);
    renderPassiveRadiatorSearchResults(payload.results || []);
    if (payload.results?.length) {
      passiveRadiatorSearchStatus.textContent = payload.imageOnlyPdf
        ? `PDF has no selectable text. Values found from "${payload.fallbackQuery || "an alternate source"}"; verify before applying.`
        : payload.directUrl
          ? "P-Radiator datasheet parsed. Verify the values before applying."
          : `${payload.results.length} candidate${payload.results.length === 1 ? "" : "s"} found. Verify before applying.`;
    } else {
      passiveRadiatorSearchStatus.textContent = payload.directUrl
        ? "No usable P-Radiator parameter set found at this URL."
        : "No usable P-Radiator parameter set found.";
    }
  } catch (error) {
    passiveRadiatorSearchStatus.textContent = error.message || "P-Radiator search failed.";
  } finally {
    passiveRadiatorSearchButton.disabled = false;
  }
}

function renderPassiveRadiatorSearchResults(results) {
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

    const values = renderPassiveRadiatorResultValues(result.passiveRadiator || {});

    item.append(titleRow, meta, values, fields);
    passiveRadiatorSearchResults.append(item);
  });
}

function renderPassiveRadiatorResultValues(passiveRadiator) {
  return renderSearchResultValues(PASSIVE_RADIATOR_RESULT_FIELDS, passiveRadiator, "No numeric P-Radiator values recognized.");
}

function renderSearchResultValues(resultFields, data, emptyText) {
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

function formatSearchResultValue(value) {
  if (Math.abs(value) >= 1000) return String(Math.round(value));
  if (Math.abs(value) >= 100) return String(Math.round(value * 10) / 10);
  if (Math.abs(value) >= 10) return String(Math.round(value * 100) / 100);
  return String(Math.round(value * 1000) / 1000);
}

function formatDriverResultValue(value) {
  return formatSearchResultValue(value);
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

function planEnclosureDesigns() {
  plannerCandidates = planDesigns(driverForProject(), { ...state.inventory, alignment: state.mode }, state.box);
  if (plannerCandidates[0]) {
    applyPlannerCandidate(plannerCandidates[0]);
  }
  renderPlannerResults(plannerCandidates);
  plannerStatus.textContent = plannerCandidates.length
    ? `${plannerCandidates[0].name} applied to the active config.`
    : "No buildable design candidates found. Try more volume, longer ports, or a lower velocity target.";
}

function renderPlannerResults(candidates) {
  plannerResults.replaceChildren();

  candidates.forEach((candidate, index) => {
    const item = document.createElement("article");
    item.className = "search-result";
    setTooltip(item, "Auto plan candidate for the active config.");

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
    setTooltip(applyButton, candidate.applied ? "This candidate is currently applied." : "Apply this candidate to the active config.");
    applyButton.addEventListener("click", () => {
      applyPlannerCandidate(candidate);
      plannerCandidates = plannerCandidates.map((item) => ({
        ...item,
        applied: item === candidate,
      }));
      renderPlannerResults(plannerCandidates);
      plannerStatus.textContent = `${candidate.name} applied to the active config.`;
    });

    titleRow.append(title, applyButton);

    const meta = document.createElement("div");
    meta.className = "search-result-meta";
    meta.textContent = candidate.notes.join(" · ");

    const dimensions = candidate.dimensions?.external;
    const fields = document.createElement("div");
    fields.className = "search-result-fields";
    const sizeText = dimensions
      ? `External ${dimensions.widthCm.toFixed(1)} x ${dimensions.heightCm.toFixed(1)} x ${dimensions.depthCm.toFixed(1)} cm`
      : "";
    const warningText = candidate.warnings.length ? `Warnings: ${candidate.warnings.join(", ")}` : "No planner warnings";
    fields.textContent = [sizeText, warningText].filter(Boolean).join(" · ");

    item.append(titleRow, meta, fields);
    plannerResults.append(item);
  });
}

function applyPlannerCandidate(candidate) {
  const nextState = cloneProject(state);
  nextState.mode = candidate.mode;
  nextState.box = completeBox(candidate.box);
  syncActiveDesignFromProject(nextState);
  commitState(nextState, { hydrate: true });
  plannerCandidates = plannerCandidates.map((item) => ({
    ...item,
    applied: item === candidate,
  }));
}

function applyDriverCandidate(result) {
  const nextDriver = completeDriverParameters(state.driver, result.driver);
  const fieldCount = Object.keys(result.driver || {}).filter((key) => Number.isFinite(Number(result.driver[key]))).length;
  const responseImport = addFrequencyResponseSearchResultsToMeasurements(result.frequencyResponseMatches || [], result.title || result.url || "", {
    createGroup: true,
    groupName: result.title || "Recording group",
    groupKind: "driver",
    sourceLabel: "driver search",
  });
  const libraryEntry = addDriverToLibrary({
    id: slugify(result.title || result.url || `driver-${Date.now()}`),
    name: result.title || "Scraped driver",
    source: result.url || "Scraped result",
    driver: nextDriver,
  });
  applyKnownDriver(libraryEntry);
  driverSearchResults.replaceChildren();
  const responseText = responseImport.added
    ? ` ${responseImport.added} frequency response ${responseImport.added === 1 ? "entry" : "entries"} added to Measurement${responseImport.parsed ? `; ${responseImport.parsed} plotted` : ""}.`
    : "";
  driverSearchStatus.textContent = `${fieldCount} parameter${fieldCount === 1 ? "" : "s"} applied and added to Known driver.${responseText}`;
}

function applyPassiveRadiatorCandidate(result) {
  const nextPassiveRadiator = completePassiveRadiatorParameters(state.box.passiveRadiator, result.passiveRadiator);
  const fieldCount = Object.keys(result.passiveRadiator || {}).filter((key) => Number.isFinite(Number(result.passiveRadiator[key]))).length;
  const libraryEntry = addPassiveRadiatorToLibrary({
    id: `pr-${slugify(result.title || result.url || `p-radiator-${Date.now()}`)}`,
    name: result.title || "Scraped P-Radiator",
    source: result.url || "Scraped result",
    passiveRadiator: nextPassiveRadiator,
  });
  applyKnownPassiveRadiator(libraryEntry);
  passiveRadiatorSearchStatus.textContent = `${fieldCount} parameter${fieldCount === 1 ? "" : "s"} applied and added to Known P-Radiator.`;
}

function applyKnownDriver(driverEntry) {
  const nextState = cloneProject(state);
  nextState.driver = completeDriverParameters(sampleProject.driver, driverEntry.driver);
  const removedDriverGroups = removeDriverMeasurementGroups(nextState);
  syncActiveDriverGroupFromProject(nextState);
  syncActiveDesignFromProject(nextState);
  commitState(nextState, { hydrate: true });
  if (Array.isArray(driverEntry.frequencyResponseMatches) && driverEntry.frequencyResponseMatches.length) {
    const responseImport = addFrequencyResponseSearchResultsToMeasurements(driverEntry.frequencyResponseMatches, driverEntry.name || driverEntry.source || "", {
      createGroup: true,
      groupName: driverEntry.name || "Recording group",
      groupKind: "driver",
      groupDriverId: driverEntry.id,
      sourceLabel: "known driver library",
    });
    if (removedDriverGroups && measurementStatus) {
      const importedCount = responseImport.added || responseImport.reassigned;
      const suffix = importedCount ? " New driver measurements added." : "";
      measurementStatus.textContent = `${removedDriverGroups} previous driver measurement ${removedDriverGroups === 1 ? "group was" : "groups were"} removed.${suffix}`;
    }
  } else if (removedDriverGroups && measurementStatus) {
    measurementStatus.textContent = `${removedDriverGroups} previous driver measurement ${removedDriverGroups === 1 ? "group was" : "groups were"} removed.`;
  }
  renderDriverSelect();
  driverSelect.value = driverEntry.id;
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
  passiveRadiatorSelect.value = passiveRadiatorEntry.id;
}

function renderDriverSelect() {
  driverSelect.replaceChildren();
  const customOption = document.createElement("option");
  customOption.value = "";
  customOption.textContent = "Custom current driver";
  driverSelect.append(customOption);
  filteredSortedLibraryEntries(driverLibrary, {
    kind: "driver",
    filter: driverLibraryFilter?.value,
    filtersEnabled: isLibraryFilterSwitchEnabled(driverLibraryFilterEnabled),
    brand: driverLibraryBrand?.value,
    diameter: driverLibraryDiameter?.value,
    sort: driverLibrarySort?.value,
  }).forEach((entry) => {
    const option = document.createElement("option");
    option.value = entry.id;
    option.textContent = entry.name;
    driverSelect.append(option);
  });
  selectMatchingDriver();
}

function selectMatchingDriver() {
  const match = driverLibrary.find((entry) => driverMatches(state.driver, entry.driver));
  driverSelect.value = match?.id || "";
}

function renderPassiveRadiatorSelect() {
  passiveRadiatorSelect.replaceChildren();
  const customOption = document.createElement("option");
  customOption.value = "";
  customOption.textContent = "Custom P-Radiator";
  passiveRadiatorSelect.append(customOption);
  filteredSortedLibraryEntries(passiveRadiatorLibrary, {
    kind: "passiveRadiator",
    filter: passiveRadiatorLibraryFilter?.value,
    filtersEnabled: isLibraryFilterSwitchEnabled(passiveRadiatorLibraryFilterEnabled),
    brand: passiveRadiatorLibraryBrand?.value,
    diameter: passiveRadiatorLibraryDiameter?.value,
    sort: passiveRadiatorLibrarySort?.value,
  }).forEach((entry) => {
    const option = document.createElement("option");
    option.value = entry.id;
    option.textContent = entry.name;
    passiveRadiatorSelect.append(option);
  });
  selectMatchingPassiveRadiator();
}

function selectMatchingPassiveRadiator() {
  const match = passiveRadiatorLibrary.find((entry) => passiveRadiatorMatches(state.box.passiveRadiator, entry.passiveRadiator));
  passiveRadiatorSelect.value = match?.id || "";
}

function filteredSortedLibraryEntries(entries, options = {}) {
  const { kind, filter = "", filtersEnabled = false, brand = "", diameter = "", sort = "name-asc" } = options;
  const filterTokens = String(filter || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  const filtered = entries.filter((entry) => {
    if (filtersEnabled && brand && libraryBrand(entry, kind) !== brand) return false;
    if (filtersEnabled && diameter && !libraryEntryMatchesDiameter(entry, kind, diameter)) return false;
    if (!filterTokens.length) return true;
    const text = searchableLibraryText(entry, kind);
    return filterTokens.every((token) => text.includes(token));
  });
  return filtered
    .map((entry, index) => ({ entry, index }))
    .sort((left, right) => compareLibraryEntries(left, right, kind, sort))
    .map((item) => item.entry);
}

function searchableLibraryText(entry, kind) {
  const parameters = kind === "passiveRadiator" ? entry.passiveRadiator || {} : entry.driver || {};
  const diameter = libraryEntryDiameterInches(entry, kind);
  return [
    entry.id,
    entry.name,
    entry.source,
    libraryBrand(entry, kind),
    Number.isFinite(diameter) ? `${roundTo(diameter, 2)}in` : "",
    parameters.fs,
    parameters.sdCm2,
    parameters.xmaxMm,
    parameters.vasL,
    parameters.re,
  ]
    .filter((value) => value !== undefined && value !== null)
    .join(" ")
    .toLowerCase();
}

function libraryBrand(entry) {
  const name = String(entry?.name || "");
  for (const [brand, pattern] of LIBRARY_BRAND_ALIASES) {
    if (pattern.test(name)) return brand;
  }
  const words = name.match(/[A-Za-z][A-Za-z-]*/g) || [];
  if (!words.length) return "";
  if (words[0].length <= 2 && words[1]?.length <= 2) return `${words[0]} ${words[1]}`;
  return words.slice(0, words[0].length <= 3 && words[1] ? 2 : 1).join(" ");
}

function libraryEntryMatchesDiameter(entry, kind, filterValue) {
  if (!DIAMETER_FILTER_VALUES.includes(filterValue)) return true;
  const diameter = libraryEntryDiameterInches(entry, kind);
  if (!Number.isFinite(diameter)) return false;
  if (filterValue === "lte-3") return diameter <= 3.25;
  if (filterValue === "gte-18") return diameter >= 17;
  const target = Number(filterValue);
  const tolerance = target >= 15 ? 0.85 : target >= 6 ? 0.65 : 0.45;
  return Math.abs(diameter - target) <= tolerance;
}

function libraryEntryDiameterInches(entry, kind) {
  const nominalDiameter = nominalDiameterFromName(entry?.name);
  if (Number.isFinite(nominalDiameter)) return nominalDiameter;
  const parameters = kind === "passiveRadiator" ? entry?.passiveRadiator || {} : entry?.driver || {};
  const sdCm2 = Number(parameters.sdCm2);
  if (!Number.isFinite(sdCm2) || sdCm2 <= 0) return NaN;
  return (2 * Math.sqrt(sdCm2 / Math.PI)) / 2.54;
}

function nominalDiameterFromName(name) {
  const text = String(name || "").replace(/[-_/]+/g, " ").replace(/\s+/g, " ");
  const metric = text.match(/\b(\d{2,3})\s*mm\b/i);
  if (metric) return Number(metric[1]) / 25.4;

  const fraction = text.match(/\b(\d{1,2})\s+(1|3)\s+(2|4)\s+(?=aluminum|paper|poly|designer|signature|passive|radiator|woofer|subwoofer|midwoofer|speaker|driver|full|coaxial|professional|neodymium|cone)/i);
  if (fraction) {
    const whole = Number(fraction[1]);
    const numerator = Number(fraction[2]);
    const denominator = Number(fraction[3]);
    return whole + numerator / denominator;
  }

  const explicitInches = text.match(/\b(\d{1,2}(?:\.\d+)?)\s*(?:in|inch|inches|")\b/i);
  if (explicitInches) return Number(explicitInches[1]);

  const nominal = text.match(/\b(\d{1,2}(?:\.\d+)?)\s+(?=aluminum|paper|poly|designer|signature|passive|radiator|woofer|subwoofer|midwoofer|speaker|driver|full|coaxial|professional|neodymium|cone|bmr)/i);
  if (nominal) return Number(nominal[1]);

  return NaN;
}

function compareLibraryEntries(left, right, kind, sort) {
  const [field = "name", direction = "asc"] = String(sort || "name-asc").split("-");
  const multiplier = direction === "desc" ? -1 : 1;
  if (field === "name") {
    const result = left.entry.name.localeCompare(right.entry.name, undefined, { numeric: true, sensitivity: "base" });
    return result * multiplier || left.index - right.index;
  }

  const leftValue = librarySortValue(left.entry, kind, field);
  const rightValue = librarySortValue(right.entry, kind, field);
  const leftFinite = Number.isFinite(leftValue);
  const rightFinite = Number.isFinite(rightValue);
  if (leftFinite && rightFinite && leftValue !== rightValue) return (leftValue - rightValue) * multiplier;
  if (leftFinite !== rightFinite) return leftFinite ? -1 : 1;
  return left.entry.name.localeCompare(right.entry.name, undefined, { numeric: true, sensitivity: "base" }) || left.index - right.index;
}

function librarySortValue(entry, kind, field) {
  const parameters = kind === "passiveRadiator" ? entry.passiveRadiator || {} : entry.driver || {};
  if (field === "fs") return Number(parameters.fs);
  if (field === "sd") return Number(parameters.sdCm2);
  if (field === "xmax") return Number(parameters.xmaxMm);
  return NaN;
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
  populateLibraryBrandFilter(driverLibraryBrand, driverLibrary, "driver");
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
  populateLibraryBrandFilter(passiveRadiatorLibraryBrand, passiveRadiatorLibrary, "passiveRadiator");
  renderPassiveRadiatorSelect();
  return passiveRadiatorLibrary.find((passiveRadiatorEntry) => passiveRadiatorEntry.id === normalized.id) || normalized;
}

function loadDriverLibrary() {
  return [...knownDrivers.map(cloneProject), ...readCustomDrivers()].filter((entry, index, entries) => {
    return entries.findIndex((candidate) => candidate.id === entry.id) === index;
  });
}

function loadPassiveRadiatorLibrary() {
  return [...knownPassiveRadiators.map(cloneProject), ...readCustomPassiveRadiators()].filter((entry, index, entries) => {
    return entries.findIndex((candidate) => candidate.id === entry.id) === index;
  });
}

function readCustomDrivers() {
  const parsed = readJsonStorage(DRIVER_LIBRARY_STORAGE_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

function readCustomPassiveRadiators() {
  const parsed = readJsonStorage(PASSIVE_RADIATOR_LIBRARY_STORAGE_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

function saveCustomDrivers() {
  const builtInIds = new Set(knownDrivers.map((driver) => driver.id));
  const customDrivers = driverLibrary.filter((driver) => !builtInIds.has(driver.id));
  writeJsonStorage(DRIVER_LIBRARY_STORAGE_KEY, customDrivers);
}

function saveCustomPassiveRadiators() {
  const builtInIds = new Set(knownPassiveRadiators.map((passiveRadiator) => passiveRadiator.id));
  const customPassiveRadiators = passiveRadiatorLibrary.filter((passiveRadiator) => !builtInIds.has(passiveRadiator.id));
  writeJsonStorage(PASSIVE_RADIATOR_LIBRARY_STORAGE_KEY, customPassiveRadiators);
}

function driverMatches(left, right) {
  const keys = ["re", "leMh", "fs", "qms", "qes", "vasL", "sdCm2", "xmaxMm", "mmsG", "bl"];
  return keys.every((key) => Math.abs(Number(left[key]) - Number(right[key])) < 1e-6);
}

function passiveRadiatorMatches(left, right) {
  const keys = ["fs", "qms", "mmsG", "cmsMmN", "sdCm2", "xmaxMm"];
  return keys.every((key) => Math.abs(Number(left[key]) - Number(right[key])) < 1e-6);
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80) || `driver-${Date.now()}`;
}

function uniqueDriverId(id) {
  const existing = new Set(driverLibrary.map((driver) => driver.id));
  if (!existing.has(id)) return id;
  let suffix = 2;
  while (existing.has(`${id}-${suffix}`)) suffix += 1;
  return `${id}-${suffix}`;
}

function uniquePassiveRadiatorId(id) {
  const existing = new Set(passiveRadiatorLibrary.map((passiveRadiator) => passiveRadiator.id));
  if (!existing.has(id)) return id;
  let suffix = 2;
  while (existing.has(`${id}-${suffix}`)) suffix += 1;
  return `${id}-${suffix}`;
}

function bindPanelControls() {
  presetButtons.forEach((button) => {
    button.addEventListener("click", () => applyPreset(button.dataset.layoutPreset));
  });

  panelToggles.forEach((toggle) => {
    toggle.addEventListener("change", () => {
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
        loadGoldenLayoutConfig(goldenLayoutConfigFromResolved(desktopGoldenLayoutConfig) || buildGoldenLayoutConfig(PANEL_PRESETS.overview.visible), {
          persist: false,
        });
        desktopGoldenLayoutConfig = null;
      } else if (goldenLayout) {
        restoreLayout();
      } else {
        applyPreset(activePreset === "custom" ? "overview" : activePreset);
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
  if (panelId === "recordingPanel") return "440px";
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
  const summary = document.querySelector(".panel-menu summary");
  if (!summary) return;
  summary.textContent = isMobileLayout() ? PANEL_LABELS[mobileActivePanel] || "Graph" : "Graphs";
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

function restoreLayout() {
  if (isGoldenLayoutPopoutWindow()) return;
  const layout = readSavedLayout();
  if (goldenLayout) {
    activePreset = layout?.activePreset || "overview";
    const savedConfig = goldenLayoutConfigFromResolved(layout?.golden);
    let validSavedConfig = savedConfig && panelIdsFromLayoutConfig(savedConfig).length > 0 ? savedConfig : null;
    let shouldPersist = !validSavedConfig;
    if (validSavedConfig && layout?.panelLayoutVersion !== LAYOUT_PANEL_VERSION) {
      shouldPersist = true;
      const visiblePanelIds = panelIdsFromLayoutConfig(validSavedConfig);
      const missingPanels = ["onAxisResponsePlot", "offAxisResponsePlot", "horizontalPolarPlot", "groupDelayPlot", "recordingPanel"].filter((panelId) => !visiblePanelIds.includes(panelId));
      if (missingPanels.length) {
        validSavedConfig = appendPanelsToGoldenConfig(validSavedConfig, missingPanels);
      }
    }
    loadGoldenLayoutConfig(validSavedConfig || buildGoldenLayoutConfig(PANEL_PRESETS[activePreset]?.visible || PANEL_PRESETS.overview.visible), {
      persist: shouldPersist,
    });
    return;
  }

  if (!layout) return;

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

  activePreset = layout.activePreset || "overview";
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
  const preset = PANEL_PRESETS[name];
  if (!preset) return;
  if (goldenLayout) {
    activePreset = name;
    loadGoldenLayoutConfig(buildGoldenLayoutConfig(preset.visible));
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

  activePreset = name;
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
  updateMobilePanelMenuLabel();
}

function updatePresetButtonState() {
  presetButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.layoutPreset === activePreset);
  });
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
  renderDesignControls();
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
  if (field.tagName === "SELECT" || field.type === "text" || field.type === "search") {
    field.value = value;
    return;
  }
  field.value = baseToInputValue(field, value);
}

function hydrateRangeFields() {
  rangeFields.forEach((field) => {
    const fieldPath = getRangeFieldPath(field);
    const value = Number(field.dataset.derivedRangeField ? derivedFieldValue(fieldPath) : getPath(state, fieldPath));
    if (!Number.isFinite(value)) return;
    if (value < Number(field.min)) field.min = String(Math.floor(value));
    if (value > Number(field.max)) field.max = String(Math.ceil(value));
    field.value = String(value);
  });
}

function hydrateDerivedFields() {
  derivedFields.forEach((field) => {
    hydrateField(field);
  });
}

function renderDriverHealthPanel() {
  if (!driverHealthPanel) return;
  const analysis = analyzeDriverParameters(state.driver);
  markDriverFieldIssues(analysis.fieldIssues);

  const hasErrors = analysis.issues.some((issue) => issue.severity === "error");
  const hasWarnings = analysis.issues.some((issue) => issue.severity === "warning");
  driverHealthPanel.classList.toggle("has-errors", hasErrors);
  driverHealthPanel.classList.toggle("has-warnings", hasWarnings && !hasErrors);
  driverHealthPanel.replaceChildren();

  const header = document.createElement("div");
  header.className = "driver-health-header";
  const title = document.createElement("strong");
  title.textContent = hasErrors ? "Driver check: missing values" : hasWarnings ? "Driver check: review" : "Driver check: OK";
  const summary = document.createElement("span");
  summary.textContent = driverHealthSummary(analysis);
  header.append(title, summary);

  const derived = document.createElement("div");
  derived.className = "driver-derived-grid";
  DRIVER_ANALYSIS_DERIVED_FIELDS.forEach((field) => {
    const value = Number(analysis.derived[field.key]);
    if (!Number.isFinite(value)) return;
    const item = document.createElement("div");
    item.className = "driver-derived-item";
    const label = document.createElement("span");
    label.textContent = field.label;
    const output = document.createElement("strong");
    output.textContent = `${formatDriverResultValue(value)}${field.unit ? ` ${field.unit}` : ""}`;
    item.append(label, output);

    if (field.fieldPath && !positiveDriverValue(getPath(state, field.fieldPath))) {
      const fill = document.createElement("button");
      fill.type = "button";
      fill.textContent = "Fill";
      fill.addEventListener("click", () => applyDerivedDriverParameter(field.fieldPath, value));
      item.append(fill);
    }
    derived.append(item);
  });

  driverHealthPanel.append(header);
  if (derived.childElementCount) driverHealthPanel.append(derived);

  const visibleIssues = analysis.issues.filter((issue) => issue.severity !== "info");
  if (visibleIssues.length) {
    const list = document.createElement("ul");
    list.className = "driver-health-issues";
    visibleIssues.forEach((issue) => {
      const item = document.createElement("li");
      item.className = `driver-health-${issue.severity}`;
      item.textContent = issue.message;
      list.append(item);
    });
    driverHealthPanel.append(list);
  }
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
  delete plotViews[plotId];
  render();
}

function queuePlotAxisInput(plotId, key, input) {
  const timerKey = `${plotId}.${key}`;
  window.clearTimeout(plotAxisInputTimers[timerKey]);
  plotAxisInputTimers[timerKey] = window.setTimeout(() => {
    const value = parsePlotAxisInput(input);
    if (Number.isFinite(value)) setPlotAxisValue(plotId, key, value);
  }, 120);
}

function parsePlotAxisInput(input) {
  const text = String(input?.value || "").trim();
  return text ? Number(text) : NaN;
}

function setPlotAxisMode(plotId, mode) {
  if (isMobileLayout()) return;
  const view = ensurePlotView(plotId);
  if (mode === "fixed") {
    const range = currentPlotRange(plotId);
    AXIS_KEYS.forEach((key) => {
      view[key] = range[key];
    });
  } else {
    AXIS_KEYS.forEach((key) => {
      delete view[key];
    });
  }
  render();
}

function setPlotAxisValue(plotId, key, value) {
  if (isMobileLayout() || !Number.isFinite(value)) return;
  const view = ensurePlotView(plotId);
  const current = currentPlotRange(plotId);
  const next = constrainPlotRangeToData(plotId, { ...current, [key]: value });
  if (!validPlotRange(next, plotId)) {
    updatePlotControlValues();
    return;
  }
  AXIS_KEYS.forEach((axisKey) => {
    view[axisKey] = next[axisKey];
  });
  render();
}

function zoomPlot(plotId, factor, event = null, axis = "both") {
  if (isMobileLayout()) return;
  const current = currentPlotRange(plotId);
  if (!validPlotRange(current, plotId)) return;

  const canvas = document.querySelector(`#${plotId}`);
  const rect = canvas?.getBoundingClientRect();
  const xRatio = event && rect?.width ? clampNumber((event.clientX - rect.left) / rect.width, 0.02, 0.98) : 0.5;
  const yRatio = event && rect?.height ? clampNumber((event.clientY - rect.top) / rect.height, 0.02, 0.98) : 0.5;
  const next = { ...current };

  if (axis === "both" || axis === "x") {
    const logMin = Math.log10(Math.max(current.xMin, 0.01));
    const logMax = Math.log10(Math.max(current.xMax, current.xMin + 0.01));
    const focus = logMin + (logMax - logMin) * xRatio;
    next.xMin = 10 ** (focus - (focus - logMin) * factor);
    next.xMax = 10 ** (focus + (logMax - focus) * factor);
  }

  if (axis === "both" || axis === "y") {
    if (plotUsesLogY(plotId, current)) {
      const logMin = Math.log10(current.yMin);
      const logMax = Math.log10(current.yMax);
      const focus = logMax - (logMax - logMin) * yRatio;
      next.yMin = 10 ** (focus - (focus - logMin) * factor);
      next.yMax = 10 ** (focus + (logMax - focus) * factor);
    } else {
      const focus = current.yMax - (current.yMax - current.yMin) * yRatio;
      next.yMin = focus - (focus - current.yMin) * factor;
      next.yMax = focus + (current.yMax - focus) * factor;
    }
  }

  if (!validPlotRange(next, plotId)) return;
  Object.assign(ensurePlotView(plotId), constrainPlotRangeToData(plotId, next));
  render();
}

function startPlotPan(plotId, event) {
  if (isMobileLayout() || event.button !== 0) return;
  if (event.currentTarget?.classList?.contains("is-dragging-annotation")) return;
  const current = currentPlotRange(plotId);
  if (!validPlotRange(current, plotId)) return;
  const canvas = document.querySelector(`#${plotId}`);
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;

  event.preventDefault();
  plotPanDrag = {
    plotId,
    startX: event.clientX,
    startY: event.clientY,
    rect,
    range: current,
  };
  canvas.closest(".plot-panel")?.classList.add("plot-is-panning");
  document.addEventListener("mousemove", handlePlotPanMove);
  document.addEventListener("mouseup", finishPlotPan);
}

function handlePlotPanMove(event) {
  if (!plotPanDrag) return;
  const { plotId, startX, startY, rect, range } = plotPanDrag;
  const dx = event.clientX - startX;
  const dy = event.clientY - startY;
  const logMin = Math.log10(Math.max(range.xMin, 0.01));
  const logMax = Math.log10(Math.max(range.xMax, range.xMin + 0.01));
  const logSpan = logMax - logMin;
  const logShift = (dx / rect.width) * logSpan;
  const next = {
    xMin: 10 ** (logMin - logShift),
    xMax: 10 ** (logMax - logShift),
  };
  if (plotUsesLogY(plotId, range)) {
    const yLogMin = Math.log10(range.yMin);
    const yLogMax = Math.log10(range.yMax);
    const yLogShift = (dy / rect.height) * (yLogMax - yLogMin);
    next.yMin = 10 ** (yLogMin + yLogShift);
    next.yMax = 10 ** (yLogMax + yLogShift);
  } else {
    const ySpan = range.yMax - range.yMin;
    const yShift = (dy / rect.height) * ySpan;
    next.yMin = range.yMin + yShift;
    next.yMax = range.yMax + yShift;
  }
  const constrained = constrainPlotRangeToData(plotId, next);
  if (!validPlotRange(constrained, plotId)) return;
  Object.assign(ensurePlotView(plotId), constrained);
  render();
}

function finishPlotPan() {
  if (!plotPanDrag) return;
  document.querySelector(`#${plotPanDrag.plotId}`)?.closest(".plot-panel")?.classList.remove("plot-is-panning");
  plotPanDrag = null;
  document.removeEventListener("mousemove", handlePlotPanMove);
  document.removeEventListener("mouseup", finishPlotPan);
}

function ensurePlotView(plotId) {
  plotViews[plotId] ||= {};
  return plotViews[plotId];
}

function currentPlotRange(plotId) {
  const view = plotViews[plotId] || {};
  const auto = view.auto || { xMin: frequencies[0], xMax: frequencies[frequencies.length - 1], yMin: 0, yMax: 1 };
  return constrainPlotRangeToData(plotId, {
    xMin: Number.isFinite(view.xMin) ? view.xMin : auto.xMin,
    xMax: Number.isFinite(view.xMax) ? view.xMax : auto.xMax,
    yMin: Number.isFinite(view.yMin) ? view.yMin : auto.yMin,
    yMax: Number.isFinite(view.yMax) ? view.yMax : auto.yMax,
  });
}

function validPlotRange(range, plotId = "") {
  return range.xMin > 0 && range.xMax > range.xMin * 1.01 && range.yMax > range.yMin + 1e-6;
}

function constrainPlotRangeToData(plotId, range, config = null) {
  const auto = config || plotViews[plotId]?.auto || {};
  const domainMin = Math.max(Number(auto.xMin) || frequencies[0], 0.01);
  const domainMax = Math.max(Number(auto.xMax) || frequencies[frequencies.length - 1], domainMin * 1.01);
  let logMin = Math.log10(Math.max(Number(range.xMin) || domainMin, 0.01));
  let logMax = Math.log10(Math.max(Number(range.xMax) || domainMax, 0.01));
  const logDomainMin = Math.log10(domainMin);
  const logDomainMax = Math.log10(domainMax);
  const domainSpan = logDomainMax - logDomainMin;
  let span = logMax - logMin;

  if (!Number.isFinite(span) || span <= 0) {
    logMin = logDomainMin;
    logMax = logDomainMax;
    span = domainSpan;
  }

  if (span >= domainSpan) {
    logMin = logDomainMin;
    logMax = logDomainMax;
  } else {
    if (logMin < logDomainMin) {
      logMax += logDomainMin - logMin;
      logMin = logDomainMin;
    }
    if (logMax > logDomainMax) {
      logMin -= logMax - logDomainMax;
      logMax = logDomainMax;
    }
  }

  return {
    ...range,
    xMin: 10 ** logMin,
    xMax: 10 ** logMax,
  };
}

function applyPlotView(plotId, config) {
  const view = ensurePlotView(plotId);
  const constrainedX = constrainPlotRangeToData(plotId, {
    xMin: Number.isFinite(view.xMin) ? view.xMin : config.xMin,
    xMax: Number.isFinite(view.xMax) ? view.xMax : config.xMax,
    yMin: config.yMin,
    yMax: config.yMax,
  }, config);
  const xMin = constrainedX.xMin;
  const xMax = constrainedX.xMax;
  const autoY = visiblePlotYRange(config, xMin, xMax);
  view.auto = {
    xMin: config.xMin,
    xMax: config.xMax,
    yMin: autoY.yMin,
    yMax: autoY.yMax,
    yScale: autoY.yScale,
  };
  const next = { ...config, xMin, xMax, ...currentPlotRange(plotId), yScale: autoY.yScale };
  return validPlotRange(next, plotId) ? next : config;
}

function plotUsesLogY(plotId, range = currentPlotRange(plotId)) {
  return plotViews[plotId]?.auto?.yScale === "log" && range.yMin > 0 && range.yMax > range.yMin * 1.01;
}

function updatePlotControlValues() {
  PLOT_IDS.forEach((plotId) => {
    const range = currentPlotRange(plotId);
    const view = plotViews[plotId] || {};
    const isFixed = AXIS_KEYS.some((key) => Number.isFinite(view[key]));
    document.querySelectorAll(`[data-plot-axis-mode="${plotId}"]`).forEach((mode) => {
      if (document.activeElement !== mode) {
        mode.checked = isFixed;
      }
      mode.dataset.axisMode = isFixed ? "fixed" : "adaptive";
    });
    AXIS_KEYS.forEach((key) => {
      document.querySelectorAll(`[data-plot-axis-input="${plotId}.${key}"]`).forEach((input) => {
        input.dataset.axisMode = isFixed ? "fixed" : "adaptive";
        if (document.activeElement !== input) input.value = formatAxisInput(range[key]);
      });
    });
    const panel = document.querySelector(`#${plotId}`)?.closest(".plot-panel");
    panel?.classList.toggle("plot-has-custom-view", hasCustomPlotView(plotId));
  });
}

function hasCustomPlotView(plotId) {
  const view = plotViews[plotId] || {};
  return ["xMin", "xMax", "yMin", "yMax"].some((key) => Number.isFinite(view[key]));
}

function formatAxisInput(value) {
  if (!Number.isFinite(value)) return "";
  if (Math.abs(value) >= 100) return String(Math.round(value * 10) / 10);
  if (Math.abs(value) >= 10) return String(Math.round(value * 100) / 100);
  return String(Math.round(value * 1000) / 1000);
}

function visiblePlotYRange(config, xMin, xMax) {
  const rangeMin = Math.max(Number(xMin) || config.xMin, config.xMin);
  const rangeMax = Math.min(Number(xMax) || config.xMax, config.xMax);
  const values = [];

  (config.series || []).forEach((series) => {
    const xValues = series.x || [];
    const yValues = series.values || [];
    if (!xValues.length || !yValues.length) return;

    [rangeMin, rangeMax].forEach((frequency) => {
      const value = interpolatePlotSeriesValue(series, frequency);
      if (Number.isFinite(value)) values.push(value);
    });

    xValues.forEach((frequency, index) => {
      if (frequency < rangeMin || frequency > rangeMax) return;
      const value = yValues[index];
      if (Number.isFinite(value)) values.push(value);
    });
  });

  (config.annotations || []).forEach((annotation) => {
    if (annotation.exceeded === false) return;
    const limitValue = Number(annotation.limitValue);
    if (Number.isFinite(limitValue)) values.push(limitValue);
  });

  if (config.yScale === "log") {
    return positiveMagnitudeRange(values, {
      fallbackMax: Math.max(config.yMax, 1),
      minFloor: Math.max(Math.min(config.yMin, config.yMax / 1000), 1e-9),
      includeFallbackMax: false,
    });
  }

  if (!values.length) {
    return { yMin: config.yMin, yMax: config.yMax, yScale: config.yScale };
  }

  const [yMin, yMax] = autoRange(values);
  if (config.forceYMinZero) {
    return { yMin: 0, yMax: Math.max(yMax, 1), yScale: config.yScale };
  }
  return { yMin, yMax, yScale: config.yScale };
}

function interpolatePlotSeriesValue(series, frequency) {
  const xValues = series.x || [];
  const yValues = series.values || [];
  const lastIndex = Math.min(xValues.length, yValues.length) - 1;
  if (lastIndex < 0) return NaN;
  if (frequency <= xValues[0]) return yValues[0];
  if (frequency >= xValues[lastIndex]) return yValues[lastIndex];

  for (let index = 1; index <= lastIndex; index += 1) {
    if (xValues[index] < frequency) continue;
    const leftX = Math.log10(xValues[index - 1]);
    const rightX = Math.log10(xValues[index]);
    const ratio = (Math.log10(frequency) - leftX) / (rightX - leftX || 1);
    const value = yValues[index - 1] + (yValues[index] - yValues[index - 1]) * ratio;
    return Number.isFinite(value) ? value : NaN;
  }
  return yValues[lastIndex];
}

function positiveMagnitudeRange(values, options = {}) {
  const fallbackMax = Math.max(Number(options.fallbackMax) || 1, 1e-6);
  const minFloor = Math.max(Number(options.minFloor) || 1e-6, 1e-9);
  const positiveValues = values.filter((value) => Number.isFinite(value) && value > 0);
  if (!positiveValues.length) {
    return { yMin: 0, yMax: fallbackMax, yScale: "linear" };
  }

  const min = Math.min(...positiveValues);
  const max = options.includeFallbackMax === false ? Math.max(...positiveValues) : Math.max(...positiveValues, fallbackMax);
  const yMin = Math.max(min * 0.82, max / 1000, minFloor);
  const yMax = Math.max(max * 1.18, yMin * 1.12);
  return { yMin, yMax, yScale: "log" };
}

function render(options = {}) {
  document.body.dataset.mode = state.mode;
  document.body.dataset.plannerAlignment = state.mode;
  const completedBox = completeBox(state.box);
  document.body.dataset.bandpassOrder = String(completedBox.bandpass.order);
  document.body.dataset.portShape = completedBox.portShape;
  modeButtons.forEach((button) => button.classList.toggle("active", button.dataset.mode === state.mode));

  const activeDesign = getActiveDesign();
  applyActiveConfigAccent(activeDesign);
  const allDesignSimulations = state.designs.map((design) => {
    return simulateDesign(design, designColorIndex(design.id));
  });
  const memberSimulations = allDesignSimulations.filter((simulation) => shouldShowDesignMember(simulation.design));
  const groupSimulations = buildConfigGroupSimulations(allDesignSimulations);
  const designSimulations = [...memberSimulations, ...groupSimulations];
  const activeSimulation =
    allDesignSimulations.find((simulation) => simulation.design.id === activeDesign.id) || simulateDesign(activeDesign, designColorIndex(activeDesign.id));
  const warnings = [...validateDriver(activeSimulation.driver), ...activeSimulation.warnings];

  const animatePlots = Boolean(options.animatePlots);
  updatePlotFitLayout();
  renderMetrics(activeSimulation.driver, activeSimulation, warnings);
  renderPlots(designSimulations.length ? designSimulations : [activeSimulation], activeSimulation, { animate: animatePlots });
  drawBoxPreview(document.querySelector("#boxPreview"), state);
  projectJson.value = JSON.stringify(state, null, 2);
  hydrateDerivedFields();
  hydrateRangeFields();
  renderDriverHealthPanel();
  hydrateRecordingControls();
  renderMeasurementControls();
  hydratePortLockButtons();
  selectMatchingDriver();
  selectMatchingPassiveRadiator();
  applyMobilePanelVisibility();
  updatePanelToggleState();
  updatePillIndicatorsSoon();
}

function applyActiveConfigAccent(design) {
  const root = document.documentElement;
  const color = designColorForDesign(design);
  root.style.setProperty("--accent", color);
  root.style.setProperty("--accent-text", readableTextColor(color));
}

function readableTextColor(color) {
  const rgb = hexToRgb(color);
  if (!rgb) return "#ffffff";
  const luminance = [rgb.r, rgb.g, rgb.b]
    .map((value) => {
      const channel = value / 255;
      return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    })
    .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
  return luminance > 0.45 ? "#111111" : "#ffffff";
}

function hexToRgb(color) {
  const match = String(color).trim().match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!match) return null;
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}

function shouldShowDesignMember(design) {
  if (design.visible === false) return false;
  if (design.graphVisible === false) return false;
  return true;
}

function isConfigGroupCombinedRendered(group) {
  if (group.showCombined !== true) return false;
  return state.designs.some((design) => design.visible !== false && design.groupId === group.id);
}

function configGroupCombinedColorIndex(groupIndex) {
  return state.designs.length + groupIndex;
}

function configGroupForDesign(design) {
  return state.configGroups.find((group) => group.id === design.groupId) || state.configGroups[0];
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
  const group = state.configGroups.find((item) => item.id === design.groupId);
  const transitions = group?.crossover?.transitions || [];
  const signalFilters = group?.crossover?.signalFilters || [];
  const filters = [];
  transitions.forEach((transition) => {
    if (transition.enabled === false) return;
    const base = {
      family: transition.family,
      order: transition.order,
      frequencyHz: transition.frequencyHz,
      enabled: true,
    };
    if (transition.fromDesignId === design.id) filters.push({ ...base, kind: "lowpass" });
    if (transition.toDesignId === design.id) filters.push({ ...base, kind: "highpass" });
  });
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
  if (target.startsWith("driverGroup:")) {
    const groupId = target.slice("driverGroup:".length);
    return (design.driverGroups || []).some((group) => group.id === groupId);
  }
  return true;
}

function applyCrossoverToSimulation(active, filters) {
  if (!filters.length) return active;
  const next = {
    ...active,
    spl: [...active.spl],
    excursionMm: [...active.excursionMm],
    phaseDeg: [...active.phaseDeg],
    groupDelayMs: [...active.groupDelayMs],
    crossoverFilters: cloneProject(filters),
  };
  const filteredPhase = [];

  frequencies.forEach((frequency, index) => {
    const response = filterChainResponse(frequency, filters);
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

function simulateDesign(design, colorIndex = 0) {
  const box = completeBox(design.box);
  const simulationDriver = driverForDesign(design, box);
  const sealed = simulateSealed(simulationDriver, box, frequencies);
  const rawActive =
    design.mode === "vented"
      ? simulateVented(simulationDriver, box, frequencies)
      : design.mode === "passive"
        ? simulatePassiveRadiator(simulationDriver, box, frequencies)
        : design.mode === "bandpass"
          ? simulateBandpass(simulationDriver, box, frequencies)
          : sealed;
  const active = applyCrossoverToSimulation(rawActive, crossoverFiltersForDesign(design));
  return {
    design,
    box,
    driver: simulationDriver,
    colorIndex: Math.max(colorIndex, 0),
    sealed,
    active,
    warnings: designWarnings(design.mode, box, active, simulationDriver),
  };
}

function designWarnings(mode, box, active, driver) {
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

function renderMetrics(driver, activeSimulation, warnings) {
  if (!document.querySelector("#qtsMetric")) return;
  const { active, sealed, box, design } = activeSimulation;
  document.querySelector("#qtsMetric").textContent = driver.qts.toFixed(3);
  document.querySelector("#sealedMetric").textContent = `${sealed.alignment.fc.toFixed(1)} Hz / ${sealed.alignment.qtc.toFixed(2)}`;
  if (design.mode === "vented") {
    const tuning = Number.isFinite(active.port.tuning) ? `${active.port.tuning.toFixed(1)} Hz / ` : "";
    const countLabel = `${box.portCount || 1}x `;
    const geometryLabel =
      box.portShape === "rectangular"
        ? `${Number(box.portWidthCm).toFixed(1)} x ${Number(box.portHeightCm).toFixed(1)} cm`
        : `${Number(box.portDiameterCm).toFixed(1)} cm dia`;
    const maxPortVelocity = Math.max(...active.portVelocity);
    document.querySelector("#portMetric").textContent = `${tuning}${countLabel}${geometryLabel} / ${(active.port.physicalLength * 100).toFixed(1)} cm / ${maxPortVelocity.toFixed(1)} m/s`;
  } else if (design.mode === "bandpass") {
    const front = active.bandpass.frontPort;
    const suffix = box.bandpass.order === 6 ? ` / rear ${Number(active.bandpass.rearPort.tuning).toFixed(1)} Hz` : "";
    const maxPortVelocity = Math.max(...active.portVelocity, ...(active.rearPortVelocity || []));
    document.querySelector("#portMetric").textContent = `${box.bandpass.order}th / front ${box.bandpass.frontPortCount || 1}x ${Number(front.tuning).toFixed(1)} Hz${suffix} / ${maxPortVelocity.toFixed(1)} m/s`;
  } else if (design.mode === "passive") {
    document.querySelector("#portMetric").textContent = `${box.passiveRadiator.count} PR / ${Number(box.passiveRadiator.fs).toFixed(1)} Hz`;
  } else {
    document.querySelector("#portMetric").textContent = `alpha ${sealed.alignment.alpha.toFixed(2)}`;
  }
  document.querySelector("#warningMetric").textContent = warnings.length ? warnings.slice(0, 2).join(", ") : "none";
}

function renderPlots(simulations, activeSimulation, options = {}) {
  const colors = getThemeColors();
  const xMin = frequencies[0];
  const xMax = frequencies[frequencies.length - 1];
  const xmaxMm = activeSimulation.driver.xmax * 1000;
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
  const offAxisResponseSeries = [
    ...measurementResponses
      .filter((response) => Math.abs(Number(response.angleDeg) || 0) >= 0.001)
      .map((response, index) => frequencyResponseSeries(response, colors, index)),
  ];
  const horizontalPolarSeries = measurementPolarSeries(measurementResponses, colors, "horizontal");
  const impedanceSeries = physicalSimulations.map((simulation) => designSeries(simulation, simulation.active.impedance, colors));
  const excursionSeries = [
    ...physicalSimulations.map((simulation) => designSeries(simulation, simulation.active.excursionMm, colors)),
    { name: "Xmax", x: frequencies, values: frequencies.map(() => xmaxMm), color: colors.text, width: 1 },
  ];
  const portSeries = physicalSimulations
    .map((simulation) => {
      if (simulation.design.mode === "vented" || simulation.design.mode === "bandpass") return designSeries(simulation, portVelocityValuesForSimulation(simulation), colors);
      return null;
    })
    .filter(Boolean);
  const prExcursionSeries = physicalSimulations
    .map((simulation) => {
      if (simulation.design.mode === "passive") return designSeries(simulation, simulation.active.passiveRadiatorExcursionMm, colors);
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
    series: onAxisResponseSeries,
  }), plotOptions);

  drawPlot(document.querySelector("#offAxisResponsePlot"), applyPlotView("offAxisResponsePlot", {
    title: "Off-axis response",
    yLabel: "dB SPL",
    xMin,
    xMax,
    yMin: offAxisResponseRange[0],
    yMax: offAxisResponseRange[1],
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
    series: portSeries.length ? portSeries : [{ name: activeSimulation.design.name, x: frequencies, values: frequencies.map(() => 0), color: colors.dim, width: 1 }],
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
    series: prExcursionSeries.length ? prExcursionSeries : [{ name: activeSimulation.design.name, x: frequencies, values: frequencies.map(() => 0), color: colors.dim, width: 1 }],
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
    series: horizontalPolarSeries,
  });

  const recordingSeries = recordingPlotSeries(colors);
  const recordingRange = autoRange(recordingSeries.flatMap((series) => series.values));
  drawPlot(document.querySelector("#recordingPlot"), {
    title: "Recording",
    yLabel: "dB SPL",
    xMin,
    xMax,
    yMin: recordingRange[0],
    yMax: recordingRange[1],
    series: recordingSeries,
  }, plotOptions);

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

function recordingPlotSeries(colors) {
  if (stagedRecordingResponse?.points?.length >= 2) {
    return [{
      ...frequencyResponseSeries(stagedRecordingResponse, colors, 0),
      width: 2.8,
      opacity: 1,
    }];
  }
  const settings = recordingSettings();
  const preview = normalizeFrequencyResponse({
    name: `${settings.signal === "noise" ? "Noise" : "Sweep"} preview`,
    points: generatedRecordingPoints(settings, 0),
  });
  return [{
    ...frequencyResponseSeries(preview, colors, 0),
    color: colors.dim,
    opacity: 0.72,
  }];
}

function frequencyResponseSeries(response, colors, index = 0) {
  const color = colors.palette[(index + 3) % colors.palette.length];
  const compactName = shortMeasurementName(response);
  const angleLabel = formatMeasurementAngleCompact(response);
  return {
    name: compactMeasurementSeriesName(response),
    compactName,
    angleLabel,
    fullName: fullMeasurementName(response),
    x: response.points.map((point) => point.frequencyHz),
    values: response.points.map((point) => point.magnitudeDb),
    color,
    width: 2.4,
    opacity: 0.92,
  };
}

function updateOffAxisResponseLegend(series) {
  const panel = document.querySelector('[data-panel="offAxisResponsePlot"]');
  if (!panel) return;

  let legend = panel.querySelector(".plot-series-legend");
  if (!series.length) {
    legend?.remove();
    return;
  }

  if (!legend) {
    legend = document.createElement("div");
    legend.className = "plot-series-legend";
    panel.append(legend);
  }

  legend.replaceChildren(...series.slice(0, 8).map((item) => {
    const row = document.createElement("div");
    row.className = "plot-series-legend-row";
    setTooltip(row, item.fullName || item.name);

    const swatch = document.createElement("span");
    swatch.className = "plot-series-legend-swatch";
    swatch.style.background = item.color;

    const angle = document.createElement("strong");
    angle.textContent = item.angleLabel || "";

    const name = document.createElement("span");
    name.textContent = item.compactName || item.name;

    row.append(swatch, angle, name);
    return row;
  }));

  if (series.length > 8) {
    const more = document.createElement("div");
    more.className = "plot-series-legend-more";
    more.textContent = `+${series.length - 8}`;
    setTooltip(more, `${series.length - 8} more off-axis curves hidden from the compact legend.`);
    legend.append(more);
  }
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
          magnitudeDb: interpolateMeasurementDb(response.points, frequency),
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
  const group = nextState.configGroups.find((item) => item.id === drag.groupId);
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
  const simulationsByDesignId = new Map(simulations.map((simulation) => [simulation.design.id, simulation]));
  const annotations = [];
  state.configGroups.forEach((group, groupIndex) => {
    const groupColor = designColor(configGroupCombinedColorIndex(groupIndex));
    (group.crossover?.transitions || []).forEach((transition) => {
      if (transition.enabled === false) return;
      if (transition.showAnnotation === false) return;
      const fromSimulation = simulationsByDesignId.get(transition.fromDesignId);
      const toSimulation = simulationsByDesignId.get(transition.toDesignId);
      if (!fromSimulation || !toSimulation) return;

      const frequencyHz = clampCrossoverFrequency(transition.frequencyHz);
      const annotation = {
        frequencyHz,
        bandMinHz: frequencyHz / Math.SQRT2,
        bandMaxHz: frequencyHz * Math.SQRT2,
        color: groupColor,
        label: `${crossoverFamilyLabel(transition.family)}${transition.order} ${formatCrossoverFrequency(frequencyHz)}`,
        draggable: true,
        drag: {
          type: "transition",
          groupId: group.id,
          id: transition.id,
          field: "frequencyHz",
        },
      };

      if (plotKind === "phase") {
        const fromPhase = interpolatePlotSeriesValue({ x: frequencies, values: fromSimulation.active.phaseDeg }, frequencyHz);
        const toPhase = interpolatePlotSeriesValue({ x: frequencies, values: toSimulation.active.phaseDeg }, frequencyHz);
        const delta = wrapPhaseDifference(toPhase - fromPhase);
        if (Number.isFinite(delta)) annotation.detail = `Delta phase ${delta.toFixed(0)} deg`;
      }
      annotations.push(annotation);
    });

    if (plotKind !== "spl") return;
    (group.crossover?.signalFilters || []).forEach((filter) => {
      if (filter.enabled === false) return;
      if (filter.showAnnotation === false) return;
      const targetSimulations = simulations.filter((simulation) => simulation.design.groupId === group.id && signalFilterAppliesToDesign(filter, simulation.design));
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
      groupId: simulations[0]?.design?.groupId || "",
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
  if (filter.type === "low-shelf" || filter.type === "subsonic") {
    return { bandMinHz: 0, bandMaxHz: frequencyHz };
  }
  if (filter.type === "high-shelf") {
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
  if (filter.type === "parametric" || filter.type === "low-shelf" || filter.type === "high-shelf") {
    const gain = Number(filter.gainDb) || 0;
    const gainLabel = `${gain >= 0 ? "+" : ""}${roundTo(gain, 1)} dB`;
    return `${gainLabel} / ${targetLabel}`;
  }
  if (filter.type === "subsonic") {
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
    "low-shelf": "Low shelf",
    "high-shelf": "High shelf",
    subsonic: "Subsonic",
  }[type] || signalFilterTypeLabel(type);
}

function signalFilterTargetLabel(target, simulations) {
  if (target === SIGNAL_FILTER_TARGET_GROUP) return "Group";
  if (target.startsWith("design:")) {
    const designId = target.slice("design:".length);
    return simulations.find((simulation) => simulation.design.id === designId)?.design.name || "Config";
  }
  if (target.startsWith("driverGroup:")) return "Driver group";
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

function arrayDriverForBox(box, driver = normalizeDriver(state.driver)) {
  return combineIdenticalDrivers(driver, box?.driverCount, box?.driverWiring);
}

function driverForProject(project = state) {
  if (project.driverGroups?.length) {
    return combineDriverGroups(project.driverGroups, project.driver);
  }
  return arrayDriverForBox(project.box, normalizeDriver(project.driver));
}

function driverForDesign(design, box = completeBox(design.box)) {
  const driver = normalizeDriver(completeDriverParameters(sampleProject.driver, design.driver || state.driver));
  if (design.driverGroups?.length) {
    return combineDriverGroups(design.driverGroups, driver);
  }
  return arrayDriverForBox(box, driver);
}

function designColorIndex(designId) {
  return Math.max(
    0,
    state.designs.findIndex((design) => design.id === designId),
  );
}

function designColor(index) {
  const colors = getThemeColors();
  return colors.palette[index % colors.palette.length];
}

function designColorForDesign(design, fallbackIndex = designColorIndex(design?.id)) {
  return isPaletteColor(design?.color) ? design.color : designColor(fallbackIndex);
}

function designPalette() {
  return getThemeColors().palette;
}

function isPaletteColor(color) {
  return [...DESIGN_COLORS_DARK, ...DESIGN_COLORS_LIGHT].includes(color);
}

function getThemeColors() {
  const styles = getComputedStyle(document.documentElement);
  const palette = document.documentElement.dataset.theme === "light" ? DESIGN_COLORS_LIGHT : DESIGN_COLORS_DARK;
  const accent = styles.getPropertyValue("--accent").trim() || palette[0];
  const blue = styles.getPropertyValue("--blue").trim() || palette[1];
  const accent2 = styles.getPropertyValue("--accent-2").trim() || palette[2];
  const danger = styles.getPropertyValue("--danger").trim() || palette[3];
  return {
    accent,
    accent2,
    blue,
    danger,
    text: styles.getPropertyValue("--text").trim() || "#cfd7dc",
    dim: styles.getPropertyValue("--dim").trim() || "#5f6b73",
    palette,
  };
}

function getPath(object, path) {
  return path.split(".").reduce((value, key) => value[key], object);
}

function setPath(object, path, value) {
  const parts = path.split(".");
  const key = parts.pop();
  const target = parts.reduce((item, part) => item[part], object);
  target[key] = value;
}

try {
  init();
} catch (error) {
  console.error("App initialization failed.", error);
  throw error;
}
