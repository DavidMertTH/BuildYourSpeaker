<script>
  import PlotToolbar from "./PlotToolbar.svelte";
  import PlotSeriesLegend from "./PlotSeriesLegend.svelte";
  import PlotResizeHandles from "./PlotResizeHandles.svelte";

  export let reorderId;
  export let panelId;
  export let title;
  export let canvasId;
</script>

<div class="plot-panel" draggable="true" data-reorder-id={reorderId} data-panel={panelId}>
  <div class="pane-bar">
    <span class="drag-handle plot-drag" aria-hidden="true"></span>
    <span>{title}</span>
  </div>
  <canvas id={canvasId}></canvas>
  {#if panelId === "offAxisResponsePlot"}
    <PlotSeriesLegend {panelId} />
  {/if}
  <PlotToolbar {panelId} />
  <PlotResizeHandles />
</div>
