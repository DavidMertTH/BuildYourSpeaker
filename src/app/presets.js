export const PANEL_PRESETS = {
  driver: {
    order: ["spl-plot", "on-axis-response-plot", "off-axis-response-plot", "impedance-plot", "phase-plot", "box-preview", "excursion-plot", "port-plot", "pr-excursion-plot", "group-delay-plot", "horizontal-polar-plot", "recording-panel", "crossover-schematic-panel"],
    visible: ["splPlot", "onAxisResponsePlot", "offAxisResponsePlot"],
  },
  boxSealed: {
    order: ["spl-plot", "box-preview", "excursion-plot", "impedance-plot", "phase-plot", "group-delay-plot", "port-plot", "pr-excursion-plot", "on-axis-response-plot", "off-axis-response-plot", "horizontal-polar-plot", "recording-panel", "crossover-schematic-panel"],
    visible: ["splPlot", "boxPreview", "excursionPlot"],
  },
  boxVented: {
    order: ["spl-plot", "box-preview", "port-plot", "excursion-plot", "impedance-plot", "group-delay-plot", "phase-plot", "pr-excursion-plot", "on-axis-response-plot", "off-axis-response-plot", "horizontal-polar-plot", "recording-panel", "crossover-schematic-panel"],
    visible: ["splPlot", "boxPreview", "portPlot", "excursionPlot"],
  },
  boxPassive: {
    order: ["spl-plot", "box-preview", "pr-excursion-plot", "excursion-plot", "impedance-plot", "phase-plot", "group-delay-plot", "port-plot", "on-axis-response-plot", "off-axis-response-plot", "horizontal-polar-plot", "recording-panel", "crossover-schematic-panel"],
    visible: ["splPlot", "boxPreview", "prExcursionPlot", "excursionPlot"],
  },
  boxBandpass: {
    order: ["spl-plot", "box-preview", "port-plot", "excursion-plot", "group-delay-plot", "impedance-plot", "phase-plot", "pr-excursion-plot", "on-axis-response-plot", "off-axis-response-plot", "horizontal-polar-plot", "recording-panel", "crossover-schematic-panel"],
    visible: ["splPlot", "boxPreview", "portPlot", "excursionPlot"],
  },
  filter: {
    order: ["crossover-schematic-panel", "spl-plot", "phase-plot", "impedance-plot", "on-axis-response-plot", "off-axis-response-plot", "group-delay-plot", "box-preview", "horizontal-polar-plot", "excursion-plot", "port-plot", "pr-excursion-plot"],
    visible: ["crossoverSchematicPanel", "splPlot", "phasePlot", "impedancePlot"],
  },
  measurement: {
    order: ["on-axis-response-plot", "off-axis-response-plot", "horizontal-polar-plot", "spl-plot", "recording-panel", "phase-plot", "group-delay-plot", "impedance-plot", "box-preview", "excursion-plot", "port-plot", "pr-excursion-plot", "crossover-schematic-panel"],
    visible: ["onAxisResponsePlot", "offAxisResponsePlot", "horizontalPolarPlot", "splPlot"],
  },
};
