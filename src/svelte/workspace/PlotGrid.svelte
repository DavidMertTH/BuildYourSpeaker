<script>
  import PlotPanel from "./plot/PlotPanel.svelte";

  const plotPanels = [
    { reorderId: "spl-plot", panelId: "splPlot", title: "SPL", canvasId: "splPlot" },
    {
      reorderId: "on-axis-response-plot",
      panelId: "onAxisResponsePlot",
      title: "On-axis response",
      canvasId: "onAxisResponsePlot",
    },
    {
      reorderId: "off-axis-response-plot",
      panelId: "offAxisResponsePlot",
      title: "Off-axis response",
      canvasId: "offAxisResponsePlot",
    },
    { reorderId: "impedance-plot", panelId: "impedancePlot", title: "Impedance", canvasId: "impedancePlot" },
    { reorderId: "excursion-plot", panelId: "excursionPlot", title: "Excursion", canvasId: "excursionPlot" },
    { reorderId: "port-plot", panelId: "portPlot", title: "Port velocity", canvasId: "portPlot" },
    { reorderId: "pr-excursion-plot", panelId: "prExcursionPlot", title: "PR excursion", canvasId: "prExcursionPlot" },
    { reorderId: "phase-plot", panelId: "phasePlot", title: "Phase", canvasId: "phasePlot" },
    { reorderId: "group-delay-plot", panelId: "groupDelayPlot", title: "Group delay", canvasId: "groupDelayPlot" },
    {
      reorderId: "horizontal-polar-plot",
      panelId: "horizontalPolarPlot",
      title: "Horizontal polar",
      canvasId: "horizontalPolarPlot",
    },
    { reorderId: "box-preview", panelId: "boxPreview", title: "Box", canvasId: "boxPreview" },
  ];
</script>

<section class="plot-grid" data-reorder-group="plots">
  {#each plotPanels as panel (panel.panelId)}
    <PlotPanel {...panel} />
  {/each}
  <div class="plot-panel-staging" data-golden-layout-staging aria-hidden="true"></div>
</section>
