<script>
  import SelectFieldCard from "../fields/SelectFieldCard.svelte";

  const defaultDeviceOptions = [{ value: "default", label: "System default" }];
</script>

<details class="collapsible-fields recording-section">
  <summary>Devices</summary>
  <div class="field-grid">
    <SelectFieldCard
      label="Microphone"
      id="recordingMicrophoneSelect"
      options={defaultDeviceOptions}
      pointerDownAction="hydrate-recording-devices"
      changeAction="recording-settings-change"
    />
    <SelectFieldCard
      label="Speaker"
      id="recordingOutputSelect"
      options={defaultDeviceOptions}
      pointerDownAction="hydrate-recording-devices"
      changeAction="recording-settings-change"
    />
  </div>
</details>
