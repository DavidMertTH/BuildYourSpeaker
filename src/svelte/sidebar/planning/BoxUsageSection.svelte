<script>
  import StatusText from "../../common/StatusText.svelte";

  function dispatchEditableField(event) {
    window.dispatchEvent(new CustomEvent("cabio:field-action", {
      detail: {
        action: "editable-field-input",
        element: event.currentTarget,
      },
    }));
  }
</script>

<section class="driver-workflow-section box-usage-section" aria-labelledby="boxUsageTitle">
  <div class="driver-section-header">
    <span id="boxUsageTitle">Driver usage</span>
    <StatusText id="driverUsageSummary" tag="strong" className="driver-usage-summary" />
  </div>
  <div class="driver-setup-panel">
    <label class="driver-setup-field">
      <span>Count</span>
      <input
        data-field="box.driverCount"
        data-svelte-field="true"
        type="number"
        min="1"
        max="16"
        step="1"
        oninput={dispatchEditableField}
      />
    </label>
    <label class="driver-setup-field">
      <span>Wiring</span>
      <select data-field="box.driverWiring" data-svelte-field="true" onchange={dispatchEditableField}>
        <option value="parallel">Parallel</option>
        <option value="series">Series</option>
      </select>
    </label>
  </div>
</section>
