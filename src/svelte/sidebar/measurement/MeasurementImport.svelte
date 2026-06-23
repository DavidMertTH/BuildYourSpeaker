<script>
  import { onMount } from "svelte";
  import StatusText from "../../common/StatusText.svelte";
  import MeasurementList from "./MeasurementList.svelte";

  let targetSelect;
  let targetOptions = [{ value: "configGroup:", label: "Group: No group" }];

  function handleFrequencyResponseChange(event) {
    const file = event.currentTarget.files?.[0];
    if (file) {
      window.dispatchEvent(new CustomEvent("cabio:measurement-action", {
        detail: { action: "import-frequency-response", file },
      }));
    }
    event.currentTarget.value = "";
  }

  function syncTargetOptions(event) {
    targetOptions = event.detail?.options || targetOptions;
    queueMicrotask(() => {
      if (targetSelect) targetSelect.value = event.detail?.selectedValue || "configGroup:";
    });
  }

  onMount(() => {
    window.addEventListener("cabio:measurement-target-options-sync", syncTargetOptions);
    return () => window.removeEventListener("cabio:measurement-target-options-sync", syncTargetOptions);
  });
</script>

<label class="driver-select-row">
  <span>Target</span>
  <select id="measurementTargetSelect" bind:this={targetSelect} title="Choose whether this measurement belongs to a config or config group.">
    {#each targetOptions as option}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
</label>
<label class="file-button measurement-file-button">
  Load response
  <input
    id="frequencyResponseInput"
    type="file"
    accept=".frd,.txt,.csv,text/plain,text/csv"
    onchange={handleFrequencyResponseChange}
  />
</label>
<StatusText id="measurementStatus" className="search-status" />
<MeasurementList />
