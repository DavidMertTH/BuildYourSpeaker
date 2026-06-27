<script>
  import { onMount } from "svelte";
  import { PLOT_IDS, POLAR_PLOT_IDS } from "../../../app/constants.js";
  import { PANEL_LABELS } from "../../../app/tooltips.js";

  export let panelId;
  export let placementClass = "plot-overlay-toolbar";

  const graphPanelIds = [...PLOT_IDS, ...POLAR_PLOT_IDS, "boxPreview", "recordingPanel"];
  const axisKeys = [
    { key: "xMin", label: "X min", step: "1" },
    { key: "xMax", label: "X max", step: "1" },
    { key: "yMin", label: "Y min", step: "0.1" },
    { key: "yMax", label: "Y max", step: "0.1" },
  ];

  $: axisPlotId = PLOT_IDS.includes(panelId) ? panelId : panelId === "recordingPanel" ? "recordingPlot" : "";
  let toolbarElement;
  let resetButtonElement;

  function stopPlotEvent(event) {
    event.stopPropagation();
  }

  function dispatchPlotAction(action, detail = {}) {
    window.dispatchEvent(new CustomEvent("cabio:plot-toolbar-action", {
      detail: { action, panelId, ...detail },
    }));
  }

  function handleResetClick(event) {
    event.stopPropagation();
    dispatchPlotAction("reset-panel");
  }

  function handleResetPointer(event) {
    event.preventDefault();
    event.stopPropagation();
    dispatchPlotAction("reset-panel");
  }

  function handleAxisInput(key, event) {
    dispatchPlotAction("axis-input", { plotId: axisPlotId, key, element: event.currentTarget });
  }

  function handleAxisChange(key, event) {
    dispatchPlotAction("axis-change", { plotId: axisPlotId, key, element: event.currentTarget });
  }

  onMount(() => {
    const eventTypes = ["dblclick", "mousedown"];
    eventTypes.forEach((type) => toolbarElement?.addEventListener(type, stopPlotEvent));
    resetButtonElement?.addEventListener("mousedown", handleResetPointer);
    resetButtonElement?.addEventListener("click", handleResetClick);
    return () => {
      eventTypes.forEach((type) => toolbarElement?.removeEventListener(type, stopPlotEvent));
      resetButtonElement?.removeEventListener("mousedown", handleResetPointer);
      resetButtonElement?.removeEventListener("click", handleResetClick);
    };
  });
</script>

<div
  bind:this={toolbarElement}
  class={`plot-toolbar ${placementClass}`}
  data-plot-toolbar={panelId}
>
  <button type="button" class="plot-toolbar-pill" title="Show graph and axis controls.">Plot</button>
  <div class="plot-toolbar-menu">
    <button bind:this={resetButtonElement} type="button" class="plot-tool-button plot-tool-reset" title="Reset zoom and manual axes">Reset</button>
    <div class="plot-graph-axis-row">
      <select
        class="plot-panel-select"
        data-plot-panel-select={panelId}
        aria-label="Graph shown in this panel"
        title="Change the graph shown in this panel."
        value={panelId}
        onchange={(event) => dispatchPlotAction("replace-panel", { nextPanelId: event.currentTarget.value })}
      >
        {#each graphPanelIds as graphPanelId}
          <option value={graphPanelId}>{PANEL_LABELS[graphPanelId] || graphPanelId}</option>
        {/each}
      </select>
    </div>
    {#if axisPlotId}
      <div class="plot-axis-panel" aria-label="Axis controls">
        <label class="plot-axis-mode-toggle" title="A = adaptive axes. F = fixed X/Y min and max.">
          <span title="Adaptive: axes follow the visible data.">A</span>
          <input
            type="checkbox"
            data-plot-axis-mode={axisPlotId}
            aria-label="Use fixed X and Y axis bounds"
            title="Switch between adaptive and fixed axes."
            onchange={(event) => dispatchPlotAction("axis-mode", { plotId: axisPlotId, mode: event.currentTarget.checked ? "fixed" : "adaptive" })}
          />
          <span title="Fixed: use the values below for both axes.">F</span>
        </label>
        {#each axisKeys as field}
          <label class="plot-axis-field">
            <span>{field.label}</span>
            <input
              type="text"
              inputmode="decimal"
              autocomplete="off"
              data-numeric-input="true"
              data-plot-axis-input={`${axisPlotId}.${field.key}`}
              step={field.step}
              oninput={(event) => handleAxisInput(field.key, event)}
              onchange={(event) => handleAxisChange(field.key, event)}
            />
          </label>
        {/each}
      </div>
    {/if}
  </div>
</div>
