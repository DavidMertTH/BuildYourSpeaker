export const PANEL_PRESETS = {
  driver: {
    order: ["spl-plot", "on-axis-response-plot", "off-axis-response-plot", "impedance-plot", "phase-plot", "box-preview", "excursion-plot", "port-plot", "pr-excursion-plot", "group-delay-plot", "horizontal-polar-plot", "crossover-schematic-panel"],
    visible: ["splPlot", "onAxisResponsePlot", "offAxisResponsePlot"],
  },
  boxSealed: {
    order: ["spl-plot", "excursion-plot", "box-preview", "impedance-plot", "phase-plot", "group-delay-plot", "port-plot", "pr-excursion-plot", "on-axis-response-plot", "off-axis-response-plot", "horizontal-polar-plot", "crossover-schematic-panel"],
    visible: ["splPlot"],
  },
  boxVented: {
    order: ["spl-plot", "port-plot", "excursion-plot", "box-preview", "impedance-plot", "group-delay-plot", "phase-plot", "pr-excursion-plot", "on-axis-response-plot", "off-axis-response-plot", "horizontal-polar-plot", "crossover-schematic-panel"],
    visible: ["splPlot", "excursionPlot", "portPlot"],
  },
  boxPassive: {
    order: ["spl-plot", "excursion-plot", "pr-excursion-plot", "box-preview", "impedance-plot", "phase-plot", "group-delay-plot", "port-plot", "on-axis-response-plot", "off-axis-response-plot", "horizontal-polar-plot", "crossover-schematic-panel"],
    visible: ["splPlot", "excursionPlot", "prExcursionPlot"],
  },
  boxBandpass: {
    order: ["spl-plot", "excursion-plot", "port-plot", "box-preview", "group-delay-plot", "impedance-plot", "phase-plot", "pr-excursion-plot", "on-axis-response-plot", "off-axis-response-plot", "horizontal-polar-plot", "crossover-schematic-panel"],
    visible: ["splPlot", "excursionPlot", "portPlot"],
  },
  filter: {
    order: ["crossover-schematic-panel", "spl-plot", "phase-plot", "impedance-plot", "on-axis-response-plot", "off-axis-response-plot", "group-delay-plot", "box-preview", "horizontal-polar-plot", "excursion-plot", "port-plot", "pr-excursion-plot"],
    visible: ["crossoverSchematicPanel", "splPlot", "phasePlot", "impedancePlot"],
  },
  measurement: {
    order: ["on-axis-response-plot", "off-axis-response-plot", "horizontal-polar-plot", "spl-plot", "phase-plot", "group-delay-plot", "impedance-plot", "box-preview", "excursion-plot", "port-plot", "pr-excursion-plot", "crossover-schematic-panel"],
    visible: ["onAxisResponsePlot", "offAxisResponsePlot"],
  },
};
