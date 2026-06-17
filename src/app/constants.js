export const LAYOUT_STORAGE_KEY = "audiosim.layout.v5";
export const LAYOUT_PANEL_VERSION = 5;
export const PROJECT_STORAGE_KEY = "audiosim.project.v1";
export const DRIVER_LIBRARY_STORAGE_KEY = "audiosim.driverLibrary.v1";
export const PASSIVE_RADIATOR_LIBRARY_STORAGE_KEY = "audiosim.passiveRadiatorLibrary.v1";
export const LIBRARY_CONTROLS_STORAGE_KEY = "audiosim.libraryControls.v1";
export const UNIT_PREF_STORAGE_KEY = "audiosim.unitPrefs.v1";
export const PORT_LOCK_STORAGE_KEY = "audiosim.portLock.v2";
export const THEME_STORAGE_KEY = "audiosim.themePreference.v1";
export const CROSSOVER_UI_STORAGE_KEY = "audiosim.crossoverUi.v1";
export const PROJECT_SYNC_CHANNEL = "audiosim.project.sync.v1";
export const FREQUENCY_MIN_HZ = 10;
export const FREQUENCY_MAX_HZ = 20000;
export const UNGROUPED_CONFIG_GROUP_ID = "";
export const UNGROUPED_MEASUREMENT_GROUP_ID = "";
export const PLOT_IDS = [
  "splPlot",
  "onAxisResponsePlot",
  "offAxisResponsePlot",
  "impedancePlot",
  "excursionPlot",
  "portPlot",
  "prExcursionPlot",
  "phasePlot",
  "groupDelayPlot",
];
export const POLAR_PLOT_IDS = ["horizontalPolarPlot"];
export const PANEL_IDS = [...PLOT_IDS, ...POLAR_PLOT_IDS, "boxPreview", "recordingPanel", "crossoverSchematicPanel"];
export const AXIS_KEYS = ["xMin", "xMax", "yMin", "yMax"];
export const GOLDEN_COMPONENT_TYPE = "plotPanel";
export const LOG_Y_PLOTS = new Set(["impedancePlot", "excursionPlot", "portPlot", "prExcursionPlot"]);
export const DESIGN_COLORS_DARK = ["#4c0dca", "#f0ece6", "#ff1744", "#ffea00", "#00e5ff", "#76ff03", "#d500f9", "#2979ff"];
export const DESIGN_COLORS_LIGHT = ["#4c0dca", "#1a1816", "#d50000", "#ff6d00", "#0086ff", "#00a651", "#aa00ff", "#c51162"];
export const PORT_FIELDS = [
  "box.fb",
  "box.portCount",
  "box.portShape",
  "box.portDiameterCm",
  "box.portWidthCm",
  "box.portHeightCm",
  "box.portLengthCm",
  "box.bandpass.frontFb",
  "box.bandpass.frontPortCount",
  "box.bandpass.frontPortDiameterCm",
  "box.bandpass.frontPortLengthCm",
  "box.bandpass.rearFb",
  "box.bandpass.rearPortCount",
  "box.bandpass.rearPortDiameterCm",
  "box.bandpass.rearPortLengthCm",
];
export const DEFAULT_PORT_LOCK_FIELD = "";
export const THEME_CHOICES = ["dark", "light", "sync"];
export const DEFAULT_CROSSOVER_FREQUENCY_HZ = 2500;
export const CROSSOVER_FREQUENCY_MIN_HZ = 0;
export const CROSSOVER_FREQUENCY_MAX_HZ = 20000;
export const CROSSOVER_SLIDER_LOG_MIN_HZ = 1;
export const CROSSOVER_SLIDER_MAX_HZ = 20000;
export const CROSSOVER_SLIDER_STEPS = 1000;
export const CROSSOVER_FAMILIES = ["linkwitz-riley", "butterworth"];
export const CROSSOVER_ORDERS = [2, 4];
export const CROSSOVER_DESIGN_TYPES = ["two-way", "three-way", "sub-sat"];
export const CROSSOVER_DESIGN_DEFAULTS = {
  "two-way": { frequencyHz: 2500, family: "linkwitz-riley", order: 4 },
  "three-way": { lowFrequencyHz: 350, highFrequencyHz: 2500, family: "linkwitz-riley", order: 4 },
  "sub-sat": { frequencyHz: 80, family: "linkwitz-riley", order: 4 },
};
export const CROSSOVER_DESIGN_BANDS = {
  "two-way": ["low", "high"],
  "three-way": ["low", "mid", "high"],
  "sub-sat": ["sub", "sat"],
};
export const CROSSOVER_CIRCUIT_COMPONENT_TYPES = ["resistor", "capacitor", "inductor"];
export const CROSSOVER_CIRCUIT_COMPONENT_DEFAULTS = {
  resistor: { value: 4.7, min: 0.1, max: 47, step: 0.1, unit: "ohm", label: "R" },
  capacitor: { value: 10, min: 0.1, max: 220, step: 0.1, unit: "uF", label: "C" },
  inductor: { value: 0.68, min: 0.01, max: 10, step: 0.01, unit: "mH", label: "L" },
};
export const SIGNAL_FILTER_TYPES = ["parametric", "low-shelf", "high-shelf", "linkwitz-transform", "subsonic"];
export const SIGNAL_FILTER_TARGET_GROUP = "group";
export const SIGNAL_FILTER_DEFAULTS = {
  parametric: { frequencyHz: 60, gainDb: 0, q: 1 },
  "low-shelf": { frequencyHz: 80, gainDb: 0, q: 0.707 },
  "high-shelf": { frequencyHz: 3000, gainDb: 0, q: 0.707 },
  "linkwitz-transform": { sourceFrequencyHz: 60, sourceQ: 0.707, targetFrequencyHz: 32, targetQ: 0.707 },
  subsonic: { preset: "rumble-20", frequencyHz: 20, order: 4, family: "butterworth" },
};
export const SUBSONIC_PRESETS = {
  "rumble-15": { label: "Rumble 15 Hz", frequencyHz: 15, order: 4, family: "butterworth" },
  "rumble-20": { label: "Rumble 20 Hz", frequencyHz: 20, order: 4, family: "butterworth" },
  "vented-25": { label: "Vented 25 Hz", frequencyHz: 25, order: 4, family: "butterworth" },
  "protect-30": { label: "Protect 30 Hz", frequencyHz: 30, order: 4, family: "linkwitz-riley" },
  custom: { label: "Custom" },
};
export const DRIVER_RESULT_FIELDS = [
  { key: "re", label: "Re", unit: "ohm" },
  { key: "leMh", label: "Le", unit: "mH" },
  { key: "fs", label: "Fs", unit: "Hz" },
  { key: "qms", label: "Qms" },
  { key: "qes", label: "Qes" },
  { key: "vasL", label: "Vas", unit: "L" },
  { key: "sdCm2", label: "Sd", unit: "cm2" },
  { key: "xmaxMm", label: "Xmax", unit: "mm" },
  { key: "mmsG", label: "Mms", unit: "g" },
  { key: "bl", label: "Bl", unit: "Tm" },
  { key: "minFrequencyHz", label: "Usable from", unit: "Hz" },
  { key: "maxFrequencyHz", label: "Usable to", unit: "Hz" },
];
export const LIBRARY_BRAND_ALIASES = [
  ["B C", /\bB\s*C\b|B&C/i],
  ["Dayton Audio", /\bDayton\s+Audio\b/i],
  ["Tang Band", /\bTang\s+Band\b/i],
  ["SB Acoustics", /\bSB\s+Acoustics\b/i],
  ["Scan-Speak", /\bScan[-\s]?Speak\b/i],
  ["GRS", /\bGRS\b/i],
  ["Peerless", /\bPeerless\b/i],
  ["Eminence", /\bEminence\b/i],
  ["FaitalPRO", /\bFaital\s*PRO\b/i],
  ["Visaton", /\bVisaton\b/i],
  ["Wavecor", /\bWavecor\b/i],
  ["Morel", /\bMorel\b/i],
  ["Tectonic", /\bTectonic\b/i],
  ["Aurum Cantus", /\bAurum\s+Cantus\b/i],
  ["Timpano Audio", /\bTimpano\s+Audio\b/i],
];
export const DIAMETER_FILTER_VALUES = ["lte-3", "3.5", "4", "5.25", "6.5", "8", "10", "12", "15", "gte-18"];
export const PASSIVE_RADIATOR_RESULT_FIELDS = [
  { key: "fs", label: "Fs", unit: "Hz" },
  { key: "qms", label: "Qms" },
  { key: "mmsG", label: "Mms", unit: "g" },
  { key: "cmsMmN", label: "Cms", unit: "mm/N" },
  { key: "sdCm2", label: "Sd", unit: "cm2" },
  { key: "xmaxMm", label: "Xmax", unit: "mm" },
  { key: "vasL", label: "Vas", unit: "L" },
];
export const DRIVER_ANALYSIS_DERIVED_FIELDS = [
  { key: "qts", label: "Qts" },
  { key: "cmsMmN", label: "Cms", unit: "mm/N" },
  { key: "mmsG", label: "Mms calc.", unit: "g", fieldPath: "driver.mmsG" },
  { key: "bl", label: "Bl calc.", unit: "Tm", fieldPath: "driver.bl" },
];
