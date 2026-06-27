<script>
  import FieldCard from "../fields/FieldCard.svelte";
  import SelectFieldCard from "../fields/SelectFieldCard.svelte";

  const sampleRateOptions = [
    { value: "44100", label: "44.1 kHz" },
    { value: "48000", label: "48 kHz" },
    { value: "96000", label: "96 kHz" },
  ];
</script>

<details class="collapsible-fields recording-section">
  <summary>Capture</summary>
  <div class="field-grid">
    <FieldCard label="Level dB" id="recordingLevelInput" min="35" max="105" step="1" changeAction="recording-settings-change" />
    <FieldCard label="Duration" id="recordingDurationInput" min="1" max="60" step="1" changeAction="recording-settings-change" />
    <FieldCard label="Repeats" id="recordingAveragingInput" min="1" max="8" step="1" changeAction="recording-settings-change" />
    <SelectFieldCard label="Sample rate" id="recordingSampleRateSelect" options={sampleRateOptions} changeAction="recording-settings-change" />
  </div>
</details>
