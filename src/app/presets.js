export const PANEL_PRESETS = {
  overview: {
    order: ["spl-plot", "impedance-plot", "excursion-plot", "port-plot", "pr-excursion-plot", "phase-plot", "group-delay-plot", "box-preview"],
    visible: ["splPlot", "impedancePlot", "excursionPlot", "portPlot", "prExcursionPlot", "phasePlot", "groupDelayPlot", "boxPreview"],
  },
  tuning: {
    order: ["spl-plot", "impedance-plot", "port-plot", "pr-excursion-plot", "excursion-plot", "phase-plot", "group-delay-plot", "box-preview"],
    visible: ["splPlot", "impedancePlot", "portPlot", "prExcursionPlot", "excursionPlot", "groupDelayPlot"],
  },
  limits: {
    order: ["excursion-plot", "port-plot", "pr-excursion-plot", "spl-plot", "impedance-plot", "phase-plot", "group-delay-plot", "box-preview"],
    visible: ["excursionPlot", "portPlot", "prExcursionPlot", "splPlot", "impedancePlot"],
  },
  model: {
    order: ["box-preview", "phase-plot", "group-delay-plot", "spl-plot", "impedance-plot", "excursion-plot", "port-plot", "pr-excursion-plot"],
    visible: ["boxPreview", "phasePlot", "groupDelayPlot", "splPlot"],
  },
};
