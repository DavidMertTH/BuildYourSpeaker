<script>
  import RecordingLevelControls from "./RecordingLevelControls.svelte";
</script>

<aside class="recording-spectrum-panel" aria-label="Input spectrum">
  <RecordingLevelControls />
  <span class="recording-spectrum-title">Input spectrum</span>
  <canvas id="recordingSpectrogram" class="recording-spectrogram" aria-label="Live input spectrogram"></canvas>
</aside>
