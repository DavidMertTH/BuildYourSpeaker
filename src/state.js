import { DEFAULT_INVENTORY } from "./core/planner/componentInventory.js";

const referencePassiveRadiator = {
  id: "audiosim-pr-8",
  name: "AudioSim Reference PR 8",
  source: "Built-in sample",
  passiveRadiator: {
    fs: 23.3,
    qms: 7.34,
    mmsG: 68.8,
    cmsMmN: 0.68,
    sdCm2: 211.2,
    xmaxMm: 11,
  },
};

const defaultDriverEntry = {
  id: "parts-express-295415",
  name: "Dayton Audio TCP115 4 4 Treated Paper Cone Midbass Woofer 4 Ohm",
  source: "https://www.parts-express.com/Dayton-Audio-TCP115-4-4-Treated-Paper-Cone-Midbass-Woofer-4-Ohm-295-415",
  driver: {
    re: 3.2,
    leMh: 0.97,
    fs: 53.8,
    qms: 3.14,
    qes: 0.4,
    vasL: 3.115,
    sdCm2: 50.3,
    xmaxMm: 4,
    mmsG: 9.9,
    bl: 5.2,
    minFrequencyHz: 55,
    maxFrequencyHz: 5000,
  },
  matched: [
    "Re",
    "Le",
    "Fs",
    "Qms",
    "Qes",
    "Vas",
    "Sd",
    "Xmax",
    "Mms",
    "Bl",
    "Usable range",
  ],
};

const sampleBox = {
  volumeL: 4,
  driverCount: 1,
  driverWiring: "parallel",
  powerW: 10,
  highPassHz: 0,
  highPassOrder: 2,
  seriesResistanceOhm: 0,
  fillPercent: 0,
  qa: 80,
  ql: 7,
  fb: 60,
  portCount: 1,
  portShape: "round",
  portDiameterCm: 3,
  portWidthCm: 8,
  portHeightCm: 1.5,
  portLengthCm: 10.248,
  portEndCorrection: 1.46,
  bandpass: {
    order: 4,
    rearVolumeL: 24,
    frontVolumeL: 18,
    frontFb: 58,
    frontPortCount: 1,
    frontPortDiameterCm: 8,
    frontPortLengthCm: 18,
    rearFb: 32,
    rearPortCount: 1,
    rearPortDiameterCm: 8,
    rearPortLengthCm: 28,
  },
  passiveRadiator: {
    ...referencePassiveRadiator.passiveRadiator,
    count: 1,
  },
};

const builtInDrivers = [
  defaultDriverEntry,
  {
    id: "audiosim-reference-12",
    name: "AudioSim Reference 12",
    source: "Built-in sample",
    driver: {
      re: 5.7,
      leMh: 1.1,
      fs: 28,
      qms: 5.3,
      qes: 0.42,
      vasL: 72,
      sdCm2: 346,
      xmaxMm: 6,
      mmsG: 96,
      bl: 15.1,
    },
  },
  {
    id: "dayton-rss315hf-4",
    name: 'Dayton Audio RSS315HF-4 12" Reference HF Subwoofer 4 Ohm',
    source: "daytonaudio.com",
    driver: {
      re: 3.1,
      leMh: 0.96,
      fs: 24.2,
      qms: 2.83,
      qes: 0.45,
      vasL: 84.1,
      sdCm2: 514.7,
      xmaxMm: 14.3,
      mmsG: 188,
      bl: 14.03,
    },
  },
  {
    id: "bc-de250-8",
    name: "B&C Speakers DE250 8 Ohm 1 in Compression Driver",
    source: "https://www.bcspeakers.com/en/products/hf-driver/1/8/DE250",
    category: "hf-driver",
    allowParameterFallback: false,
    driver: {
      leMh: 0.11,
      nominalImpedanceOhm: 8,
      minimumImpedanceOhm: 7.8,
      sensitivityDb: 108.5,
      minFrequencyHz: 1000,
      maxFrequencyHz: 18000,
      recommendedCrossoverHz: 1600,
      throatDiameterMm: 25,
      voiceCoilDiameterMm: 44,
      nominalPowerW: 60,
      continuousPowerW: 120,
      fluxDensityT: 1.85,
    },
    matched: [
      "Nominal impedance",
      "Minimum impedance",
      "Le",
      "Sensitivity",
      "Usable range",
      "Recommended crossover",
      "Throat diameter",
      "Voice coil diameter",
      "Power handling",
    ],
  },
];

let knownDriversPromise = null;
let knownPassiveRadiatorsPromise = null;
let driverFrequencyResponsesPromise = null;

export const knownDrivers = builtInDrivers.map(cloneEntry);

export const sampleProject = {
  mode: "vented",
  driver: cloneEntry(defaultDriverEntry.driver),
  box: sampleBox,
  inventory: DEFAULT_INVENTORY,
  configGroups: [
    {
      id: "config-group-main",
      name: "Main group",
      showMembers: true,
      showCombined: false,
    },
  ],
  activeDesignId: "design-tcp115-vented",
  designs: [
    {
      id: "design-tcp115-vented",
      name: "TCP115-4 Vented",
      groupId: "config-group-main",
      mode: "vented",
      visible: true,
      box: sampleBox,
    },
  ],
};

const builtInPassiveRadiators = [
  referencePassiveRadiator,
];

export const knownPassiveRadiators = builtInPassiveRadiators.map(cloneEntry);

export async function loadKnownDrivers() {
  if (!knownDriversPromise) {
    knownDriversPromise = Promise.all([
      import("./data/partsExpressDrivers.js"),
      loadDriverFrequencyResponses(),
    ]).then(([{ partsExpressDrivers }, frequencyResponses]) => (
      uniqueDriverEntries([...builtInDrivers, ...partsExpressDrivers]).map((entry) => ({
        ...cloneEntry(entry),
        frequencyResponseMatches: frequencyResponses[entry.id] || entry.frequencyResponseMatches || [],
      }))
    ));
  }
  return knownDriversPromise;
}

export async function loadKnownPassiveRadiators() {
  if (!knownPassiveRadiatorsPromise) {
    knownPassiveRadiatorsPromise = import("./data/passiveRadiators.js")
      .then(({ passiveRadiators }) => [...builtInPassiveRadiators, ...passiveRadiators].map(cloneEntry));
  }
  return knownPassiveRadiatorsPromise;
}

export async function loadDriverFrequencyResponses() {
  if (!driverFrequencyResponsesPromise) {
    driverFrequencyResponsesPromise = import("./data/driverFrequencyResponses.js")
      .then(({ driverFrequencyResponses }) => driverFrequencyResponses);
  }
  return driverFrequencyResponsesPromise;
}

export function cloneProject(project) {
  return JSON.parse(JSON.stringify(project));
}

function cloneEntry(entry) {
  return JSON.parse(JSON.stringify(entry));
}

function uniqueDriverEntries(entries) {
  const seen = new Set();
  return entries.filter((entry) => {
    const key = entry.id || entry.name;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
