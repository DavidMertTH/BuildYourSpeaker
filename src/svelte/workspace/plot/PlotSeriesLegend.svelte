<script>
  import { onMount } from "svelte";

  export let panelId;
  let series = [];
  let hiddenCount = 0;

  function syncLegend(event) {
    if (event.detail?.panelId !== panelId) return;
    series = event.detail.series || [];
    hiddenCount = Number(event.detail.hiddenCount) || 0;
  }

  onMount(() => {
    window.addEventListener("cabio:plot-series-legend-sync", syncLegend);
    return () => window.removeEventListener("cabio:plot-series-legend-sync", syncLegend);
  });
</script>

{#if series.length}
  <div class="plot-series-legend">
    {#each series as item}
      <div class="plot-series-legend-row" title={item.fullName || item.name}>
        <span class="plot-series-legend-swatch" style={`background: ${item.color}`}></span>
        <strong>{item.angleLabel || ""}</strong>
        <span>{item.compactName || item.name}</span>
      </div>
    {/each}
    {#if hiddenCount > 0}
      <div class="plot-series-legend-more" title={`${hiddenCount} more off-axis curves hidden from the compact legend.`}>+{hiddenCount}</div>
    {/if}
  </div>
{/if}
