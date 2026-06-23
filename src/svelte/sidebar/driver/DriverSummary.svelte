<script>
  import { onMount } from "svelte";

  let status = "Manual";
  let name = "Custom driver";
  let source = "Manual parameters";
  let note = "";
  let specs = [];
  let hasErrors = false;
  let hasWarnings = false;

  function syncSummary(event) {
    status = event.detail?.status || "Manual";
    name = event.detail?.name || "Custom driver";
    source = event.detail?.source || "Manual parameters";
    note = event.detail?.note || "";
    specs = event.detail?.specs || [];
    hasErrors = Boolean(event.detail?.hasErrors);
    hasWarnings = Boolean(event.detail?.hasWarnings);
  }

  onMount(() => {
    window.addEventListener("cabio:driver-summary-sync", syncSummary);
    return () => window.removeEventListener("cabio:driver-summary-sync", syncSummary);
  });
</script>

<section
  id="driverSummaryPanel"
  class:has-errors={hasErrors}
  class:has-warnings={hasWarnings}
  class="driver-summary-panel"
  aria-live="polite"
>
  <div class="driver-summary-header">
    <div class="driver-summary-title">
      <strong>{name}</strong>
      <span>{source}</span>
    </div>
    <span class="driver-summary-status">{status}</span>
  </div>
  <div class="driver-summary-specs">
    {#each specs as spec}
      <div class="driver-summary-spec">
        <span>{spec.label}</span>
        <strong>{spec.value}</strong>
      </div>
    {/each}
  </div>
  <div class="driver-summary-note">{note}</div>
</section>
