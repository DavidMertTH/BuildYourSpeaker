<script>
  import StatusText from "../../common/StatusText.svelte";

  function dispatchRecordingAction(action) {
    window.dispatchEvent(new CustomEvent("cabio:recording-action", { detail: { action } }));
  }

  function syncRunFields() {
    dispatchRecordingAction("sync-run-fields");
  }
</script>

<div class="recording-live-controls" aria-label="Recording level and actions">
  <div class="recording-level">
    <div class="recording-meter" aria-label="Input peak level"><span id="recordingMeterBar"></span></div>
    <StatusText id="recordingPeakReadout" tag="span" className="recording-peak-readout" initialText="Peak -inf dBFS" />
  </div>
  <div class="recording-actions">
    <div class="recording-action-row">
      <button id="recordingTestToneButton" class="recording-secondary-button" type="button" onclick={() => dispatchRecordingAction("test-tone")}>Check levels</button>
      <button id="recordingAddButton" class="recording-add-button" type="button" onclick={() => dispatchRecordingAction("record")}>Start</button>
    </div>
    <label class="recording-run-field">
      <span>Run</span>
      <input id="recordingRunNameInput" type="text" oninput={syncRunFields} />
    </label>
    <div class="recording-run-row">
      <label class="recording-run-field">
        <span>Angle</span>
        <input id="recordingRunAngleInput" type="number" min="-180" max="180" step="1" value="0" oninput={syncRunFields} />
      </label>
      <button id="recordingSaveRunButton" class="recording-secondary-button" type="button" onclick={() => dispatchRecordingAction("save-run")}>Save</button>
    </div>
    <StatusText id="recordingStatus" className="recording-status" ariaLive="polite" />
  </div>
</div>
