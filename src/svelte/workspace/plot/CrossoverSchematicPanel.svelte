<script>
  import CrossoverSchematicBoard from "../crossover/CrossoverSchematicBoard.svelte";
  import CrossoverSchematicToolbar from "../crossover/CrossoverSchematicToolbar.svelte";
  import PlotResizeHandles from "./PlotResizeHandles.svelte";
</script>

<div class="plot-panel crossover-schematic-panel" draggable="true" data-reorder-id="crossover-schematic-panel" data-panel="crossoverSchematicPanel">
  <div class="pane-bar">
    <span class="drag-handle plot-drag" aria-hidden="true"></span>
    <span>Crossover schematic</span>
  </div>
  <div class="crossover-schematic-workbench">
    <CrossoverSchematicBoard />
    <CrossoverSchematicToolbar />
  </div>
  <PlotResizeHandles />
</div>
