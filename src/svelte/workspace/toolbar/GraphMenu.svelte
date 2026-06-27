<script>
  import { onMount } from "svelte";

  const graphToggles = [
    { panelId: "splPlot", label: "SPL" },
    { panelId: "onAxisResponsePlot", label: "On-axis" },
    { panelId: "offAxisResponsePlot", label: "Off-axis" },
    { panelId: "impedancePlot", label: "Impedance" },
    { panelId: "excursionPlot", label: "Cone excursion" },
    { panelId: "portPlot", label: "Port velocity" },
    { panelId: "prExcursionPlot", label: "PR excursion" },
    { panelId: "phasePlot", label: "Phase" },
    { panelId: "groupDelayPlot", label: "Group delay" },
    { panelId: "horizontalPolarPlot", label: "H polar" },
    { panelId: "boxPreview", label: "Box" },
    { panelId: "recordingPanel", label: "Recording" },
    { panelId: "crossoverSchematicPanel", label: "Crossover" },
  ];

  let checkedPanelIds = new Set(graphToggles.map((toggle) => toggle.panelId));
  let summaryLabel = "Graphs";

  function isChecked(panelId) {
    return checkedPanelIds.has(panelId);
  }

  function setCheckedPanel(panelId, checked) {
    const nextPanelIds = new Set(checkedPanelIds);
    if (checked) nextPanelIds.add(panelId);
    else nextPanelIds.delete(panelId);
    checkedPanelIds = nextPanelIds;
    window.dispatchEvent(new CustomEvent("cabio:panel-toggle-change", { detail: { panelId, checked } }));
  }

  onMount(() => {
    summaryLabel = window.__cabioGraphMenuLabel || summaryLabel;
    const syncPanelToggles = (event) => {
      if (Array.isArray(event.detail?.checkedPanelIds)) checkedPanelIds = new Set(event.detail.checkedPanelIds);
    };
    const syncSummaryLabel = (event) => {
      summaryLabel = event.detail?.label || "Graphs";
    };
    window.addEventListener("cabio:panel-toggle-sync", syncPanelToggles);
    window.addEventListener("cabio:graph-menu-label-sync", syncSummaryLabel);
    return () => {
      window.removeEventListener("cabio:panel-toggle-sync", syncPanelToggles);
      window.removeEventListener("cabio:graph-menu-label-sync", syncSummaryLabel);
    };
  });
</script>

<details class="toolbar-group panel-menu graph-menu" aria-label="Panel visibility">
  <summary><span class="panel-menu-summary-label">{summaryLabel}</span></summary>
  <div class="panel-menu-list">
    {#each graphToggles as toggle (toggle.panelId)}
      <label>
        <input
          class="panel-toggle"
          data-panel-toggle={toggle.panelId}
          type="checkbox"
          checked={isChecked(toggle.panelId)}
          onchange={(event) => setCheckedPanel(toggle.panelId, event.currentTarget.checked)}
        />
        {toggle.label}
      </label>
    {/each}
  </div>
</details>
