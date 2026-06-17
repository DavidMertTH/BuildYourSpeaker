export const PANEL_PRESETS = {
  overview: {
    order: ["spl-plot", "box-preview", "impedance-plot", "excursion-plot", "port-plot", "on-axis-response-plot", "off-axis-response-plot", "horizontal-polar-plot", "phase-plot", "group-delay-plot", "pr-excursion-plot", "recording-panel", "crossover-schematic-panel"],
    visible: ["splPlot", "boxPreview", "impedancePlot", "excursionPlot", "portPlot", "onAxisResponsePlot"],
  },
  tuning: {
    order: ["spl-plot", "impedance-plot", "port-plot", "group-delay-plot", "box-preview", "phase-plot", "on-axis-response-plot", "off-axis-response-plot", "horizontal-polar-plot", "excursion-plot", "pr-excursion-plot", "crossover-schematic-panel"],
    visible: ["splPlot", "impedancePlot", "portPlot", "groupDelayPlot", "boxPreview"],
  },
  limits: {
    order: ["excursion-plot", "port-plot", "pr-excursion-plot", "spl-plot", "box-preview", "impedance-plot", "on-axis-response-plot", "off-axis-response-plot", "phase-plot", "group-delay-plot", "horizontal-polar-plot", "crossover-schematic-panel"],
    visible: ["excursionPlot", "portPlot", "prExcursionPlot", "splPlot", "boxPreview"],
  },
  model: {
    order: ["box-preview", "horizontal-polar-plot", "phase-plot", "group-delay-plot", "impedance-plot", "spl-plot", "on-axis-response-plot", "off-axis-response-plot", "excursion-plot", "port-plot", "pr-excursion-plot", "crossover-schematic-panel"],
    visible: ["boxPreview", "horizontalPolarPlot", "phasePlot", "groupDelayPlot", "impedancePlot"],
  },
  recording: {
    order: ["recording-panel", "on-axis-response-plot", "off-axis-response-plot", "horizontal-polar-plot", "spl-plot", "phase-plot", "group-delay-plot", "impedance-plot", "excursion-plot", "port-plot", "pr-excursion-plot", "box-preview", "crossover-schematic-panel"],
    visible: ["recordingPanel", "onAxisResponsePlot", "offAxisResponsePlot", "horizontalPolarPlot", "splPlot"],
  },
  crossover: {
    order: ["crossover-schematic-panel", "spl-plot", "phase-plot", "impedance-plot", "on-axis-response-plot", "off-axis-response-plot", "group-delay-plot", "box-preview", "horizontal-polar-plot", "excursion-plot", "port-plot", "pr-excursion-plot"],
    visible: ["crossoverSchematicPanel", "splPlot", "phasePlot", "impedancePlot"],
  },
};
