<script>
  import PlotToolbar from "../plot/PlotToolbar.svelte";
  import RecordingSpectrumPanel from "./RecordingSpectrumPanel.svelte";
</script>

<div class="recording-workbench">
  <div class="recording-plot-stage">
    <canvas id="recordingPlot"></canvas>
    <PlotToolbar panelId="recordingPanel" />
  </div>
  <RecordingSpectrumPanel />
</div>
