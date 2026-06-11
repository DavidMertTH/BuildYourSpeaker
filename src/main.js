import { normalizeDriver, validateDriver } from "./core/driver.js";
import { logFrequencyVector, nearestFrequencyValue } from "./core/frequency.js";
import { closedAlignment, simulateSealed } from "./core/sealedBox.js";
import { simulateVented } from "./core/ventedBox.js";
import { simulatePassiveRadiator } from "./core/passiveRadiatorBox.js";
import { validateEnclosureOptions } from "./core/enclosure.js";
import { autoRange, drawPlot } from "./ui/plot.js";
import { drawBoxPreview } from "./ui/preview.js";
import { cloneProject, knownDrivers, knownPassiveRadiators, sampleProject } from "./state.js";

const LAYOUT_STORAGE_KEY = "audiosim.layout.v2";
const DRIVER_LIBRARY_STORAGE_KEY = "audiosim.driverLibrary.v1";
const UNIT_PREF_STORAGE_KEY = "audiosim.unitPrefs.v1";
const DESIGN_COLORS = ["#42bfa3", "#6fb5ff", "#d4b75e", "#dd695f", "#a88cff", "#5bc0de"];
const UNIT_GROUPS = {
  resistance: [
    { id: "ohm", label: "ohm", fromBase: (value) => value, toBase: (value) => value, step: "0.01" },
  ],
  inductance: [
    { id: "mH", label: "mH", fromBase: (value) => value, toBase: (value) => value, step: "0.01" },
    { id: "uH", label: "uH", fromBase: (value) => value * 1000, toBase: (value) => value / 1000, step: "1" },
    { id: "H", label: "H", fromBase: (value) => value / 1000, toBase: (value) => value * 1000, step: "0.0001" },
  ],
  frequency: [
    { id: "Hz", label: "Hz", fromBase: (value) => value, toBase: (value) => value, step: "0.1" },
    { id: "kHz", label: "kHz", fromBase: (value) => value / 1000, toBase: (value) => value * 1000, step: "0.001" },
  ],
  volume: [
    { id: "L", label: "L", fromBase: (value) => value, toBase: (value) => value, step: "0.1" },
    { id: "m3", label: "m3", fromBase: (value) => value / 1000, toBase: (value) => value * 1000, step: "0.001" },
    { id: "ft3", label: "ft3", fromBase: (value) => value / 28.3168, toBase: (value) => value * 28.3168, step: "0.01" },
  ],
  area: [
    { id: "cm2", label: "cm2", fromBase: (value) => value, toBase: (value) => value, step: "0.1" },
    { id: "m2", label: "m2", fromBase: (value) => value / 10000, toBase: (value) => value * 10000, step: "0.0001" },
    { id: "in2", label: "in2", fromBase: (value) => value / 6.4516, toBase: (value) => value * 6.4516, step: "0.1" },
  ],
  length: [
    { id: "mm", label: "mm", fromBase: (value) => value, toBase: (value) => value, step: "0.1" },
    { id: "cm", label: "cm", fromBase: (value) => value / 10, toBase: (value) => value * 10, step: "0.01" },
    { id: "in", label: "in", fromBase: (value) => value / 25.4, toBase: (value) => value * 25.4, step: "0.001" },
  ],
  smallLength: [
    { id: "cm", label: "cm", fromBase: (value) => value, toBase: (value) => value, step: "0.1" },
    { id: "mm", label: "mm", fromBase: (value) => value * 10, toBase: (value) => value / 10, step: "1" },
    { id: "in", label: "in", fromBase: (value) => value / 2.54, toBase: (value) => value * 2.54, step: "0.01" },
  ],
  mass: [
    { id: "g", label: "g", fromBase: (value) => value, toBase: (value) => value, step: "0.1" },
    { id: "kg", label: "kg", fromBase: (value) => value / 1000, toBase: (value) => value * 1000, step: "0.001" },
    { id: "oz", label: "oz", fromBase: (value) => value / 28.3495, toBase: (value) => value * 28.3495, step: "0.01" },
  ],
  compliance: [
    { id: "mm/N", label: "mm/N", fromBase: (value) => value, toBase: (value) => value, step: "0.001" },
    { id: "um/N", label: "um/N", fromBase: (value) => value * 1000, toBase: (value) => value / 1000, step: "1" },
  ],
  power: [
    { id: "W", label: "W", fromBase: (value) => value, toBase: (value) => value, step: "1" },
  ],
  percent: [
    { id: "%", label: "%", fromBase: (value) => value, toBase: (value) => value, step: "1" },
  ],
};
const PANEL_PRESETS = {
  overview: {
    order: ["spl-plot", "impedance-plot", "excursion-plot", "port-plot", "phase-plot", "box-preview"],
    visible: ["splPlot", "impedancePlot", "excursionPlot", "portPlot", "phasePlot", "boxPreview"],
    sizes: {
      splPlot: ["calc(50% - 4px)", "310px"],
      impedancePlot: ["calc(50% - 4px)", "310px"],
      excursionPlot: ["calc(50% - 4px)", "310px"],
      portPlot: ["calc(50% - 4px)", "310px"],
      phasePlot: ["calc(50% - 4px)", "310px"],
      boxPreview: ["calc(50% - 4px)", "310px"],
    },
  },
  tuning: {
    order: ["spl-plot", "impedance-plot", "port-plot", "excursion-plot", "phase-plot", "box-preview"],
    visible: ["splPlot", "impedancePlot", "portPlot", "excursionPlot"],
    sizes: {
      splPlot: ["calc(62% - 4px)", "360px"],
      impedancePlot: ["calc(38% - 4px)", "360px"],
      portPlot: ["calc(50% - 4px)", "300px"],
      excursionPlot: ["calc(50% - 4px)", "300px"],
    },
  },
  limits: {
    order: ["excursion-plot", "port-plot", "spl-plot", "impedance-plot", "phase-plot", "box-preview"],
    visible: ["excursionPlot", "portPlot", "splPlot", "impedancePlot"],
    sizes: {
      excursionPlot: ["calc(50% - 4px)", "360px"],
      portPlot: ["calc(50% - 4px)", "360px"],
      splPlot: ["calc(50% - 4px)", "280px"],
      impedancePlot: ["calc(50% - 4px)", "280px"],
    },
  },
  model: {
    order: ["box-preview", "phase-plot", "spl-plot", "impedance-plot", "excursion-plot", "port-plot"],
    visible: ["boxPreview", "phasePlot", "splPlot"],
    sizes: {
      boxPreview: ["calc(42% - 4px)", "390px"],
      phasePlot: ["calc(58% - 4px)", "390px"],
      splPlot: ["100%", "300px"],
    },
  },
};
let state = cloneProject(sampleProject);
let historyIndex = 0;
let draggedItem = null;
let manualDrag = null;
let activePreset = "overview";
let applyingLayout = false;
let resizePersistenceReady = false;
let resizeTimer = null;
const frequencies = logFrequencyVector(10, 1000, 360);

const fields = [...document.querySelectorAll("[data-field]")];
const modeButtons = [...document.querySelectorAll(".mode-button")];
const presetButtons = [...document.querySelectorAll(".preset-button")];
const panelToggles = [...document.querySelectorAll(".panel-toggle")];
const plotPanels = [...document.querySelectorAll(".plot-panel[data-panel]")];
const projectJson = document.querySelector("#projectJson");
const driverSearchInput = document.querySelector("#driverSearchInput");
const driverSearchButton = document.querySelector("#driverSearchButton");
const driverSearchStatus = document.querySelector("#driverSearchStatus");
const driverSearchResults = document.querySelector("#driverSearchResults");
const driverSelect = document.querySelector("#driverSelect");
const passiveRadiatorSelect = document.querySelector("#passiveRadiatorSelect");
const designSelect = document.querySelector("#designSelect");
const designNameInput = document.querySelector("#designNameInput");
const duplicateDesignButton = document.querySelector("#duplicateDesignButton");
const deleteDesignButton = document.querySelector("#deleteDesignButton");
const designVisibleInput = document.querySelector("#designVisibleInput");
let driverLibrary = loadDriverLibrary();
let unitPrefs = readUnitPrefs();

function init() {
  state = normalizeProjectState(state);
  initializeUnitControls();
  restoreLayout();
  renderDriverSelect();
  renderPassiveRadiatorSelect();
  renderDesignControls();
  hydrateFields();
  initializeHistory();
  bindEvents();
  bindReorderableLayout();
  bindPanelControls();
  bindResizePersistence();
  render();
}

function bindEvents() {
  fields.forEach((field) => {
    field.addEventListener("input", () => {
      const nextState = cloneProject(state);
      setPath(nextState, field.dataset.field, inputToBaseValue(field));
      if (field.dataset.field.startsWith("box.")) syncActiveDesignFromProject(nextState);
      commitState(nextState);
    });
  });

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (state.mode === button.dataset.mode) return;
      const nextState = cloneProject(state);
      nextState.mode = button.dataset.mode;
      syncActiveDesignFromProject(nextState);
      commitState(nextState);
    });
  });

  designSelect.addEventListener("change", () => {
    const nextState = cloneProject(state);
    nextState.activeDesignId = designSelect.value;
    applyActiveDesignToProject(nextState);
    commitState(nextState, { hydrate: true });
  });

  designNameInput.addEventListener("change", () => {
    const name = designNameInput.value.trim();
    if (!name) {
      hydrateDesignControls();
      return;
    }
    const nextState = cloneProject(state);
    getActiveDesign(nextState).name = name;
    commitState(nextState);
  });

  duplicateDesignButton.addEventListener("click", () => {
    const nextState = cloneProject(state);
    const source = getActiveDesign(nextState);
    const design = {
      ...cloneProject(source),
      id: createDesignId(),
      name: uniqueDesignName(nextState.designs, `${source.name} copy`),
      visible: true,
    };
    nextState.designs.push(design);
    nextState.activeDesignId = design.id;
    applyActiveDesignToProject(nextState);
    commitState(nextState, { hydrate: true });
  });

  deleteDesignButton.addEventListener("click", () => {
    if (state.designs.length <= 1) return;
    const nextState = cloneProject(state);
    nextState.designs = nextState.designs.filter((design) => design.id !== nextState.activeDesignId);
    nextState.activeDesignId = nextState.designs[0].id;
    applyActiveDesignToProject(nextState);
    commitState(nextState, { hydrate: true });
  });

  designVisibleInput.addEventListener("change", () => {
    const nextState = cloneProject(state);
    getActiveDesign(nextState).visible = designVisibleInput.checked;
    commitState(nextState);
  });

  document.querySelector("#loadSampleButton").addEventListener("click", () => {
    commitState(cloneProject(sampleProject), { hydrate: true });
    selectMatchingDriver();
  });

  driverSelect.addEventListener("change", () => {
    const selected = driverLibrary.find((driver) => driver.id === driverSelect.value);
    if (!selected) return;
    applyKnownDriver(selected);
  });

  passiveRadiatorSelect.addEventListener("change", () => {
    const selected = knownPassiveRadiators.find((passiveRadiator) => passiveRadiator.id === passiveRadiatorSelect.value);
    if (!selected) return;
    const nextState = cloneProject(state);
    nextState.box.passiveRadiator = {
      ...nextState.box.passiveRadiator,
      ...selected.passiveRadiator,
    };
    syncActiveDesignFromProject(nextState);
    commitState(nextState, { hydrate: true });
    passiveRadiatorSelect.value = selected.id;
  });

  driverSearchButton.addEventListener("click", searchDriverSpecs);
  driverSearchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      searchDriverSpecs();
    }
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

  document.querySelector("#importInput").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    commitState(normalizeProjectState(JSON.parse(await file.text())), { hydrate: true });
  });

  window.addEventListener("popstate", (event) => {
    const project = event.state?.project;
    if (!project) return;
    state = normalizeProjectState(project);
    historyIndex = Number(event.state.index) || 0;
    hydrateFields();
    render();
  });

  window.addEventListener("keydown", (event) => {
    if (!isUndoShortcut(event) || historyIndex <= 0) return;
    event.preventDefault();
    history.back();
  });

  window.addEventListener("resize", render);
}

function initializeUnitControls() {
  fields.forEach((field) => {
    const units = UNIT_GROUPS[field.dataset.unitType];
    if (!units) return;
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
    select.dataset.unitFor = field.dataset.field;
    units.forEach((unit) => {
      const option = document.createElement("option");
      option.value = unit.id;
      option.textContent = unit.label;
      select.append(option);
    });
    select.value = unitPrefs[field.dataset.field] || units[0].id;
    field.insertAdjacentElement("afterend", select);
    applyFieldStep(field);
    select.addEventListener("change", () => {
      unitPrefs[field.dataset.field] = select.value;
      localStorage.setItem(UNIT_PREF_STORAGE_KEY, JSON.stringify(unitPrefs));
      applyFieldStep(field);
      hydrateField(field);
    });
  });
}

function readUnitPrefs() {
  try {
    return JSON.parse(localStorage.getItem(UNIT_PREF_STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function getSelectedUnit(field) {
  const units = UNIT_GROUPS[field.dataset.unitType];
  if (!units) return null;
  const selectedId = document.querySelector(`.unit-select[data-unit-for="${cssEscape(field.dataset.field)}"]`)?.value || units[0].id;
  return units.find((unit) => unit.id === selectedId) || units[0];
}

function inputToBaseValue(field) {
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

function formatInputValue(value) {
  if (!Number.isFinite(value)) return "";
  if (Math.abs(value) >= 1000) return String(Math.round(value * 10) / 10);
  if (Math.abs(value) >= 100) return String(Math.round(value * 100) / 100);
  if (Math.abs(value) >= 10) return String(Math.round(value * 1000) / 1000);
  return String(Math.round(value * 10000) / 10000);
}

function cssEscape(value) {
  return String(value).replace(/"/g, '\\"');
}

function normalizeProjectState(project) {
  const nextState = cloneProject(project);
  const fallbackBox = completeBox(nextState.box || sampleProject.box);
  const fallbackMode = nextState.mode || "vented";

  if (!Array.isArray(nextState.designs) || nextState.designs.length === 0) {
    nextState.designs = [
      {
        id: nextState.activeDesignId || createDesignId(),
        name: designNameFromBox(fallbackMode, fallbackBox),
        mode: fallbackMode,
        visible: true,
        box: fallbackBox,
      },
    ];
  } else {
    nextState.designs = nextState.designs.map((design, index) => {
      const mode = design.mode || fallbackMode;
      const box = completeBox(design.box || fallbackBox);
      return {
        id: design.id || `design-${index + 1}`,
        name: normalizedDesignName(design.name, mode, box),
        mode,
        visible: design.visible !== false,
        box,
      };
    });
  }

  if (!nextState.designs.some((design) => design.id === nextState.activeDesignId)) {
    nextState.activeDesignId = nextState.designs[0].id;
  }

  applyActiveDesignToProject(nextState);
  return nextState;
}

function completeBox(box = {}) {
  return {
    ...cloneProject(sampleProject.box),
    ...cloneProject(box || {}),
    passiveRadiator: {
      ...cloneProject(sampleProject.box.passiveRadiator),
      ...cloneProject(box?.passiveRadiator || {}),
    },
  };
}

function getActiveDesign(project = state) {
  return project.designs.find((design) => design.id === project.activeDesignId) || project.designs[0];
}

function applyActiveDesignToProject(project) {
  const design = getActiveDesign(project);
  project.mode = design.mode;
  project.box = completeBox(design.box);
  return project;
}

function syncActiveDesignFromProject(project) {
  const design = getActiveDesign(project);
  const previousAutoName = designNameFromBox(design.mode, design.box);
  const previousLegacyName = legacyDesignNameFromBox(design.mode, design.box);
  const shouldUpdateName = !design.name || design.name === previousAutoName || design.name === previousLegacyName;
  design.mode = project.mode;
  design.box = completeBox(project.box);
  if (shouldUpdateName) design.name = designNameFromBox(design.mode, design.box);
  return project;
}

function renderDesignControls() {
  designSelect.replaceChildren();
  state.designs.forEach((design) => {
    const option = document.createElement("option");
    option.value = design.id;
    option.textContent = `${design.name} (${design.mode})`;
    designSelect.append(option);
  });
  hydrateDesignControls();
}

function hydrateDesignControls() {
  const activeDesign = getActiveDesign();
  designSelect.value = activeDesign.id;
  designNameInput.value = activeDesign.name;
  designVisibleInput.checked = activeDesign.visible !== false;
  deleteDesignButton.disabled = state.designs.length <= 1;
}

function createDesignId() {
  return `design-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function uniqueDesignName(designs, baseName) {
  const names = new Set(designs.map((design) => design.name));
  if (!names.has(baseName)) return baseName;
  let index = 2;
  while (names.has(`${baseName} ${index}`)) index += 1;
  return `${baseName} ${index}`;
}

function designNameFromBox(mode, box) {
  return `${Number(box.volumeL || 0).toFixed(0)} L ${formatMode(mode)}`;
}

function legacyDesignNameFromBox(mode, box) {
  return `${Number(box.volumeL || 0).toFixed(0)} L ${mode}`;
}

function normalizedDesignName(name, mode, box) {
  if (!name || name === legacyDesignNameFromBox(mode, box)) return designNameFromBox(mode, box);
  return name;
}

function formatMode(mode) {
  if (mode === "sealed") return "Sealed";
  if (mode === "vented") return "Vented";
  if (mode === "passive") return "Passive";
  return String(mode || "Design");
}

async function searchDriverSpecs() {
  const query = driverSearchInput.value.trim();
  if (!query) {
    driverSearchStatus.textContent = "Enter a driver model or manufacturer.";
    return;
  }

  driverSearchButton.disabled = true;
  driverSearchStatus.textContent = "Searching web for T/S parameters...";
  driverSearchResults.replaceChildren();

  try {
    const response = await fetch(`/api/driver-search?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error(`Search failed with HTTP ${response.status}`);
    const payload = await response.json();
    renderDriverSearchResults(payload.results || []);
    driverSearchStatus.textContent = payload.results?.length
      ? `${payload.results.length} candidate${payload.results.length === 1 ? "" : "s"} found. Verify before applying.`
      : "No usable T/S parameter set found.";
  } catch (error) {
    driverSearchStatus.textContent = error.message || "Search failed.";
  } finally {
    driverSearchButton.disabled = false;
  }
}

function renderDriverSearchResults(results) {
  driverSearchResults.replaceChildren();

  results.forEach((result, index) => {
    const item = document.createElement("article");
    item.className = "search-result";

    const titleRow = document.createElement("div");
    titleRow.className = "search-result-title";

    const title = document.createElement("span");
    title.textContent = result.title || `Candidate ${index + 1}`;

    const applyButton = document.createElement("button");
    applyButton.type = "button";
    applyButton.textContent = "Apply";
    applyButton.addEventListener("click", () => applyDriverCandidate(result));

    titleRow.append(title, applyButton);

    const meta = document.createElement("div");
    meta.className = "search-result-meta";
    meta.textContent = result.url || "";

    const fields = document.createElement("div");
    fields.className = "search-result-fields";
    fields.textContent = `Found: ${(result.matched || []).join(", ")}`;

    item.append(titleRow, meta, fields);
    driverSearchResults.append(item);
  });
}

function applyDriverCandidate(result) {
  const libraryEntry = addDriverToLibrary({
    id: slugify(result.title || result.url || `driver-${Date.now()}`),
    name: result.title || "Scraped driver",
    source: result.url || "Scraped result",
    driver: result.driver,
  });
  applyKnownDriver(libraryEntry);
  driverSearchStatus.textContent = "Driver parameters applied and added to Known driver.";
}

function applyKnownDriver(driverEntry) {
  const nextState = cloneProject(state);
  nextState.driver = { ...nextState.driver, ...driverEntry.driver };
  commitState(nextState, { hydrate: true });
  driverSelect.value = driverEntry.id;
}

function renderDriverSelect() {
  driverSelect.replaceChildren();
  const customOption = document.createElement("option");
  customOption.value = "";
  customOption.textContent = "Custom current driver";
  driverSelect.append(customOption);
  driverLibrary.forEach((entry) => {
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
  customOption.textContent = "Custom passive radiator";
  passiveRadiatorSelect.append(customOption);
  knownPassiveRadiators.forEach((entry) => {
    const option = document.createElement("option");
    option.value = entry.id;
    option.textContent = entry.name;
    passiveRadiatorSelect.append(option);
  });
  selectMatchingPassiveRadiator();
}

function selectMatchingPassiveRadiator() {
  const match = knownPassiveRadiators.find((entry) => passiveRadiatorMatches(state.box.passiveRadiator, entry.passiveRadiator));
  passiveRadiatorSelect.value = match?.id || "";
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
  renderDriverSelect();
  return driverLibrary.find((driver) => driver.id === normalized.id) || normalized;
}

function loadDriverLibrary() {
  return [...knownDrivers.map(cloneProject), ...readCustomDrivers()].filter((entry, index, entries) => {
    return entries.findIndex((candidate) => candidate.id === entry.id) === index;
  });
}

function readCustomDrivers() {
  try {
    const parsed = JSON.parse(localStorage.getItem(DRIVER_LIBRARY_STORAGE_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCustomDrivers() {
  const builtInIds = new Set(knownDrivers.map((driver) => driver.id));
  const customDrivers = driverLibrary.filter((driver) => !builtInIds.has(driver.id));
  localStorage.setItem(DRIVER_LIBRARY_STORAGE_KEY, JSON.stringify(customDrivers));
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

function bindPanelControls() {
  presetButtons.forEach((button) => {
    button.addEventListener("click", () => applyPreset(button.dataset.layoutPreset));
  });

  panelToggles.forEach((button) => {
    button.addEventListener("click", () => {
      const panel = document.querySelector(`[data-panel="${button.dataset.panelToggle}"]`);
      panel.classList.toggle("is-hidden");
      activePreset = "custom";
      updatePanelToggleState();
      updatePresetButtonState();
      saveLayout();
      render();
    });
  });
}

function bindResizePersistence() {
  const observer = new ResizeObserver(() => {
    if (applyingLayout || !resizePersistenceReady) return;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      activePreset = "custom";
      updatePresetButtonState();
      saveLayout();
      render();
    }, 80);
  });

  plotPanels.forEach((panel) => observer.observe(panel));
  pauseResizePersistence();
}

function bindReorderableLayout() {
  for (const group of document.querySelectorAll("[data-reorder-group]")) {
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
  const layout = {};
  for (const group of document.querySelectorAll("[data-reorder-group]")) {
    layout[group.dataset.reorderGroup] = [...group.children]
      .filter((child) => child.dataset.reorderId)
      .map((child) => child.dataset.reorderId);
  }
  layout.activePreset = activePreset;
  layout.panels = {};
  plotPanels.forEach((panel) => {
    const rect = panel.getBoundingClientRect();
    layout.panels[panel.dataset.panel] = {
      hidden: panel.classList.contains("is-hidden"),
      width: panel.style.width || `${Math.round(rect.width)}px`,
      height: panel.style.height || `${Math.round(rect.height)}px`,
    };
  });
  localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout));
}

function restoreLayout() {
  const layout = readSavedLayout();
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
      if (panelLayout.width) panel.style.width = panelLayout.width;
      if (panelLayout.height) panel.style.height = panelLayout.height;
    });
  }
  updatePanelToggleState();
  updatePresetButtonState();
  applyingLayout = false;
}

function readSavedLayout() {
  try {
    return JSON.parse(localStorage.getItem(LAYOUT_STORAGE_KEY));
  } catch {
    return null;
  }
}

function applyPreset(name) {
  const preset = PANEL_PRESETS[name];
  if (!preset) return;
  const group = document.querySelector('[data-reorder-group="plots"]');

  pauseResizePersistence();
  applyingLayout = true;
  preset.order.forEach((id) => {
    const panel = group.querySelector(`[data-reorder-id="${id}"]`);
    if (panel) group.appendChild(panel);
  });

  plotPanels.forEach((panel) => {
    const isVisible = preset.visible.includes(panel.dataset.panel);
    const size = preset.sizes[panel.dataset.panel] ?? ["calc(50% - 4px)", "310px"];
    panel.classList.toggle("is-hidden", !isVisible);
    panel.style.width = size[0];
    panel.style.height = size[1];
  });
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
  panelToggles.forEach((button) => {
    const panel = document.querySelector(`[data-panel="${button.dataset.panelToggle}"]`);
    button.classList.toggle("active", panel && !panel.classList.contains("is-hidden"));
  });
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
  historyIndex += 1;
  history.pushState({ index: historyIndex, project: cloneProject(state) }, "", location.href);
  renderDesignControls();
  if (options.hydrate) hydrateFields();
  render();
}

function isUndoShortcut(event) {
  return (event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "z";
}

function hydrateFields() {
  fields.forEach((field) => {
    hydrateField(field);
  });
  hydrateDesignControls();
  selectMatchingDriver();
  selectMatchingPassiveRadiator();
}

function hydrateField(field) {
  field.value = baseToInputValue(field, getPath(state, field.dataset.field));
}

function render() {
  document.body.dataset.mode = state.mode;
  modeButtons.forEach((button) => button.classList.toggle("active", button.dataset.mode === state.mode));

  const driver = normalizeDriver(state.driver);
  const activeDesign = getActiveDesign();
  const visibleDesigns = state.designs.filter((design) => design.visible !== false);
  const designSimulations = (visibleDesigns.length ? visibleDesigns : [activeDesign]).map((design, index) => simulateDesign(driver, design, index));
  const activeSimulation = simulateDesign(driver, activeDesign, designSimulations.findIndex((simulation) => simulation.design.id === activeDesign.id));
  const warnings = [...validateDriver(driver), ...activeSimulation.warnings];

  renderMetrics(driver, activeSimulation, warnings);
  renderPlots(designSimulations, activeSimulation);
  drawBoxPreview(document.querySelector("#boxPreview"), state);
  projectJson.value = JSON.stringify(state, null, 2);
  hydrateDesignControls();
  selectMatchingDriver();
  selectMatchingPassiveRadiator();
}

function simulateDesign(driver, design, colorIndex = 0) {
  const box = completeBox(design.box);
  const sealed = simulateSealed(driver, box, frequencies);
  const active = design.mode === "vented" ? simulateVented(driver, box, frequencies) : design.mode === "passive" ? simulatePassiveRadiator(driver, box, frequencies) : sealed;
  return {
    design,
    box,
    colorIndex: Math.max(colorIndex, 0),
    sealed,
    active,
    warnings: designWarnings(design.mode, box, active),
  };
}

function designWarnings(mode, box, active) {
  const warnings = validateEnclosureOptions(box, mode);
  const maxExcursion = Math.max(...active.excursionMm);
  if (maxExcursion > state.driver.xmaxMm) {
    warnings.push(`Xmax exceeded: ${maxExcursion.toFixed(1)} mm`);
  }
  if (mode === "vented") {
    const maxPort = Math.max(...active.portVelocity);
    if (maxPort > 17) warnings.push(`High port velocity: ${maxPort.toFixed(1)} m/s`);
    if (active.port.physicalLength <= 0) warnings.push("Port diameter too large for selected Fb/Vb");
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
  const { active, sealed, box, design } = activeSimulation;
  document.querySelector("#qtsMetric").textContent = driver.qts.toFixed(3);
  document.querySelector("#sealedMetric").textContent = `${sealed.alignment.fc.toFixed(1)} Hz / ${sealed.alignment.qtc.toFixed(2)}`;
  if (design.mode === "vented") {
    document.querySelector("#portMetric").textContent = `${(active.port.physicalLength * 100).toFixed(1)} cm`;
  } else if (design.mode === "passive") {
    document.querySelector("#portMetric").textContent = `${box.passiveRadiator.count} PR / ${Number(box.passiveRadiator.fs).toFixed(1)} Hz`;
  } else {
    const target = closedAlignment(driver, box.volumeL, box.fillPercent);
    document.querySelector("#portMetric").textContent = `alpha ${target.alpha.toFixed(2)}`;
  }
  document.querySelector("#warningMetric").textContent = warnings.length ? warnings.slice(0, 2).join(", ") : "none";
}

function renderPlots(simulations, activeSimulation) {
  const colors = getThemeColors();
  const xMin = frequencies[0];
  const xMax = frequencies[frequencies.length - 1];
  const splSeries = simulations.map((simulation) => designSeries(simulation, simulation.active.spl, colors));
  const impedanceSeries = simulations.map((simulation) => designSeries(simulation, simulation.active.impedance, colors));
  const excursionSeries = [
    ...simulations.map((simulation) => designSeries(simulation, simulation.active.excursionMm, colors)),
    { name: "Xmax", x: frequencies, values: frequencies.map(() => state.driver.xmaxMm), color: colors.text, width: 1 },
  ];
  const portSeries = simulations
    .map((simulation) => {
      if (simulation.design.mode === "vented") return designSeries(simulation, simulation.active.portVelocity, colors);
      if (simulation.design.mode === "passive") return designSeries(simulation, simulation.active.passiveRadiatorExcursionMm, colors);
      return null;
    })
    .filter(Boolean);
  const phaseSeries = simulations.map((simulation) => designSeries(simulation, simulation.active.phaseDeg, colors));
  const portValues = portSeries.flatMap((series) => series.values);
  const splRange = autoRange(splSeries.flatMap((series) => series.values));
  const impedanceRange = autoRange(impedanceSeries.flatMap((series) => series.values));
  const excursionRange = [0, Math.max(state.driver.xmaxMm * 1.25, ...excursionSeries.flatMap((series) => series.values)) * 1.08];
  const portRange = [0, Math.max(3, ...portValues) * 1.12];
  const phaseRange = autoRange(phaseSeries.flatMap((series) => series.values));

  drawPlot(document.querySelector("#splPlot"), {
    title: "SPL at 1 m",
    yLabel: "dB SPL",
    xMin,
    xMax,
    yMin: splRange[0],
    yMax: splRange[1],
    series: splSeries,
  });

  drawPlot(document.querySelector("#impedancePlot"), {
    title: "Input impedance",
    yLabel: "ohm",
    xMin,
    xMax,
    yMin: Math.max(0, impedanceRange[0]),
    yMax: impedanceRange[1],
    series: impedanceSeries,
  });

  drawPlot(document.querySelector("#excursionPlot"), {
    title: "Cone excursion",
    yLabel: "mm",
    xMin,
    xMax,
    yMin: excursionRange[0],
    yMax: excursionRange[1],
    series: excursionSeries,
  });

  drawPlot(document.querySelector("#portPlot"), {
    title: "Vent / passive radiator limits",
    yLabel: "m/s / mm",
    xMin,
    xMax,
    yMin: portRange[0],
    yMax: portRange[1],
    series: portSeries.length ? portSeries : [{ name: activeSimulation.design.name, x: frequencies, values: frequencies.map(() => 0), color: colors.dim, width: 1 }],
  });

  drawPlot(document.querySelector("#phasePlot"), {
    title: "Phase",
    yLabel: "deg",
    xMin,
    xMax,
    yMin: phaseRange[0],
    yMax: phaseRange[1],
    series: phaseSeries,
  });

  const fbValue = activeSimulation.design.mode === "vented" ? nearestFrequencyValue(frequencies, activeSimulation.active.portVelocity, activeSimulation.box.fb) : null;
  void fbValue;
}

function designSeries(simulation, values, colors) {
  return {
    name: simulation.design.name,
    x: frequencies,
    values,
    color: colors.palette[simulation.colorIndex % colors.palette.length],
    width: simulation.design.id === state.activeDesignId ? 3 : 2,
  };
}

function getThemeColors() {
  const styles = getComputedStyle(document.documentElement);
  const accent = styles.getPropertyValue("--accent").trim() || DESIGN_COLORS[0];
  const blue = styles.getPropertyValue("--blue").trim() || DESIGN_COLORS[1];
  const accent2 = styles.getPropertyValue("--accent-2").trim() || DESIGN_COLORS[2];
  const danger = styles.getPropertyValue("--danger").trim() || DESIGN_COLORS[3];
  return {
    accent,
    accent2,
    blue,
    danger,
    text: styles.getPropertyValue("--text").trim() || "#cfd7dc",
    dim: styles.getPropertyValue("--dim").trim() || "#5f6b73",
    palette: [accent, blue, accent2, danger, ...DESIGN_COLORS.slice(4)],
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

init();
