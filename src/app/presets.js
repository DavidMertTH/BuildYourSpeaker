export const PANEL_PRESETS = {
  overview: {
    order: ["spl-plot", "on-axis-response-plot", "off-axis-response-plot", "horizontal-polar-plot", "impedance-plot", "excursion-plot", "port-plot", "pr-excursion-plot", "phase-plot", "group-delay-plot", "box-preview", "recording-panel"],
    visible: ["splPlot", "onAxisResponsePlot", "offAxisResponsePlot", "horizontalPolarPlot", "impedancePlot", "excursionPlot", "portPlot", "prExcursionPlot", "phasePlot", "groupDelayPlot", "boxPreview"],
  },
  tuning: {
    order: ["spl-plot", "on-axis-response-plot", "off-axis-response-plot", "impedance-plot", "port-plot", "pr-excursion-plot", "excursion-plot", "phase-plot", "group-delay-plot", "box-preview", "horizontal-polar-plot"],
    visible: ["splPlot", "onAxisResponsePlot", "offAxisResponsePlot", "impedancePlot", "portPlot", "prExcursionPlot", "excursionPlot", "groupDelayPlot"],
  },
  limits: {
    order: ["excursion-plot", "port-plot", "pr-excursion-plot", "spl-plot", "on-axis-response-plot", "off-axis-response-plot", "impedance-plot", "phase-plot", "group-delay-plot", "box-preview", "horizontal-polar-plot"],
    visible: ["excursionPlot", "portPlot", "prExcursionPlot", "splPlot", "impedancePlot"],
  },
  model: {
    order: ["box-preview", "horizontal-polar-plot", "phase-plot", "group-delay-plot", "spl-plot", "on-axis-response-plot", "off-axis-response-plot", "impedance-plot", "excursion-plot", "port-plot", "pr-excursion-plot"],
    visible: ["boxPreview", "horizontalPolarPlot", "phasePlot", "groupDelayPlot", "splPlot"],
  },
  recording: {
    order: ["recording-panel", "on-axis-response-plot", "off-axis-response-plot", "horizontal-polar-plot", "spl-plot", "phase-plot", "group-delay-plot", "impedance-plot", "excursion-plot", "port-plot", "pr-excursion-plot", "box-preview"],
    visible: ["recordingPanel", "onAxisResponsePlot", "offAxisResponsePlot", "horizontalPolarPlot"],
  },
};
