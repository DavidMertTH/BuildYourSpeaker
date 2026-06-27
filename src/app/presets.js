export const PANEL_PRESETS = {
  driver: {
    order: ["spl-plot", "on-axis-response-plot", "off-axis-response-plot", "impedance-plot", "phase-plot", "box-preview", "excursion-plot", "port-plot", "pr-excursion-plot", "group-delay-plot", "horizontal-polar-plot"],
    visible: ["splPlot", "onAxisResponsePlot", "offAxisResponsePlot"],
  },
  boxSealed: {
    order: ["spl-plot", "excursion-plot", "box-preview", "impedance-plot", "phase-plot", "group-delay-plot", "port-plot", "pr-excursion-plot", "on-axis-response-plot", "off-axis-response-plot", "horizontal-polar-plot"],
    visible: ["splPlot"],
  },
  boxVented: {
    order: ["spl-plot", "port-plot", "excursion-plot", "box-preview", "impedance-plot", "group-delay-plot", "phase-plot", "pr-excursion-plot", "on-axis-response-plot", "off-axis-response-plot", "horizontal-polar-plot"],
    visible: ["splPlot", "excursionPlot", "portPlot"],
  },
  boxPassive: {
    order: ["spl-plot", "excursion-plot", "pr-excursion-plot", "box-preview", "impedance-plot", "phase-plot", "group-delay-plot", "port-plot", "on-axis-response-plot", "off-axis-response-plot", "horizontal-polar-plot"],
    visible: ["splPlot", "excursionPlot", "prExcursionPlot"],
  },
  boxBandpass: {
    order: ["spl-plot", "excursion-plot", "port-plot", "box-preview", "group-delay-plot", "impedance-plot", "phase-plot", "pr-excursion-plot", "on-axis-response-plot", "off-axis-response-plot", "horizontal-polar-plot"],
    visible: ["splPlot", "excursionPlot", "portPlot"],
  },
  filter: {
    order: ["spl-plot", "phase-plot", "impedance-plot", "group-delay-plot", "on-axis-response-plot", "off-axis-response-plot", "box-preview", "horizontal-polar-plot", "excursion-plot", "port-plot", "pr-excursion-plot"],
    visible: ["splPlot", "phasePlot", "impedancePlot", "groupDelayPlot"],
  },
  measurement: {
    order: ["on-axis-response-plot", "off-axis-response-plot", "horizontal-polar-plot", "spl-plot", "phase-plot", "group-delay-plot", "impedance-plot", "box-preview", "excursion-plot", "port-plot", "pr-excursion-plot"],
    visible: ["onAxisResponsePlot", "offAxisResponsePlot"],
  },
};
