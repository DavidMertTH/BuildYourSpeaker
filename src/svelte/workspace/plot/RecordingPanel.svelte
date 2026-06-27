<script>
  import RecordingWorkbench from "../recording/RecordingWorkbench.svelte";
  import PlotResizeHandles from "./PlotResizeHandles.svelte";
</script>

<div class="plot-panel recording-panel" draggable="true" data-reorder-id="recording-panel" data-panel="recordingPanel">
  <div class="pane-bar">
    <span class="drag-handle plot-drag" aria-hidden="true"></span>
    <span>Recording</span>
  </div>
  <RecordingWorkbench />
  <PlotResizeHandles />
</div>
