<script>
  import FieldCard from "../fields/FieldCard.svelte";
  import SelectFieldCard from "../fields/SelectFieldCard.svelte";

  const stimulusOptions = [
    { value: "sweep", label: "Log sweep" },
    { value: "noise", label: "Pink noise" },
  ];
</script>

<details class="collapsible-fields recording-section">
  <summary>Signal</summary>
  <div class="field-grid">
    <SelectFieldCard label="Stimulus" id="recordingSignalSelect" options={stimulusOptions} changeAction="recording-settings-change" />
    <FieldCard label="Start Hz" id="recordingFrequencyStartInput" min="1" max="20000" step="1" changeAction="recording-settings-change" />
    <FieldCard label="End Hz" id="recordingFrequencyEndInput" min="20" max="24000" step="1" changeAction="recording-settings-change" />
  </div>
</details>
