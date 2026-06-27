<script>
  import { onMount } from "svelte";

  let title = "Driver check: OK";
  let summary = "";
  let derived = [];
  let issues = [];
  let hasErrors = false;
  let hasWarnings = false;

  function syncHealth(event) {
    title = event.detail?.title || "Driver check: OK";
    summary = event.detail?.summary || "";
    derived = event.detail?.derived || [];
    issues = event.detail?.issues || [];
    hasErrors = Boolean(event.detail?.hasErrors);
    hasWarnings = Boolean(event.detail?.hasWarnings);
  }

  function fillDerived(item) {
    window.dispatchEvent(new CustomEvent("cabio:driver-health-action", {
      detail: {
        action: "fill-derived",
        fieldPath: item.fieldPath,
        value: item.rawValue,
      },
    }));
  }

  onMount(() => {
    window.addEventListener("cabio:driver-health-sync", syncHealth);
    return () => window.removeEventListener("cabio:driver-health-sync", syncHealth);
  });
</script>

<section
  id="driverHealthPanel"
  class:has-errors={hasErrors}
  class:has-warnings={hasWarnings}
  class="driver-health-panel"
  aria-live="polite"
>
  <div class="driver-health-header">
    <strong>{title}</strong>
    <span>{summary}</span>
  </div>

  {#if derived.length}
    <div class="driver-derived-grid">
      {#each derived as item}
        <div class="driver-derived-item">
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          {#if item.canFill}
            <button type="button" onclick={() => fillDerived(item)}>Fill</button>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  {#if issues.length}
    <ul class="driver-health-issues">
      {#each issues as issue}
        <li class={`driver-health-${issue.severity}`}>{issue.message}</li>
      {/each}
    </ul>
  {/if}
</section>
