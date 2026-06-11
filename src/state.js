import { partsExpressDrivers } from "./data/partsExpressDrivers.js";
import { passiveRadiators } from "./data/passiveRadiators.js";

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

const sampleBox = {
  volumeL: 48,
  powerW: 10,
  seriesResistanceOhm: 0,
  fillPercent: 0,
  qa: 80,
  ql: 7,
  fb: 34,
  portDiameterCm: 8,
  portEndCorrection: 1.46,
  passiveRadiator: {
    ...referencePassiveRadiator.passiveRadiator,
    count: 1,
  },
};

export const knownDrivers = [
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
  ...partsExpressDrivers,
];

export const sampleProject = {
  mode: "vented",
  driver: knownDrivers[0].driver,
  box: sampleBox,
  activeDesignId: "design-vented-reference",
  designs: [
    {
      id: "design-vented-reference",
      name: "48 L Vented",
      mode: "vented",
      visible: true,
      box: sampleBox,
    },
    {
      id: "design-sealed-compact",
      name: "32 L Sealed",
      mode: "sealed",
      visible: true,
      box: {
        ...sampleBox,
        volumeL: 32,
      },
    },
  ],
};

export const knownPassiveRadiators = [
  referencePassiveRadiator,
  ...passiveRadiators,
];

export function cloneProject(project) {
  return JSON.parse(JSON.stringify(project));
}
