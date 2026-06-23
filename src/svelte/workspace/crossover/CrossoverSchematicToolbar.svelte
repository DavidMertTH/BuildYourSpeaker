<script>
  import { onMount } from "svelte";
  import CrossoverSymbolButton from "./CrossoverSymbolButton.svelte";
  import CrossoverPresetMenu from "./CrossoverPresetMenu.svelte";

  const componentButtons = [
    {
      id: "crossoverAddResistorButton",
      label: "Add resistor",
      action: "add-resistor",
      paths: ["M2 12 H8 L11 5 L17 19 L23 5 L29 19 L32 12 H38"],
    },
    {
      id: "crossoverAddCapacitorButton",
      label: "Add capacitor",
      action: "add-capacitor",
      paths: ["M2 12 H16 M16 4 V20 M24 4 V20 M24 12 H38"],
    },
    {
      id: "crossoverAddInductorButton",
      label: "Add inductor",
      action: "add-inductor",
      paths: ["M2 12 C2 4 10 4 10 12 C10 20 18 20 18 12 C18 4 26 4 26 12 C26 20 34 20 38 12"],
    },
  ];

  let filterOptions = [{ value: "", label: "Select crossover" }];
  let selectedFilterId = "";
  let toolsEnabled = false;
  let moduleGroupEnabled = false;

  function handleFilterChange(event) {
    selectedFilterId = event.currentTarget.value;
    window.dispatchEvent(new CustomEvent("cabio:crossover-schematic-action", {
      detail: { action: "select-design", designId: selectedFilterId },
    }));
  }

  function createModuleGroup() {
    window.dispatchEvent(new CustomEvent("cabio:crossover-schematic-action", {
      detail: { action: "create-module-group" },
    }));
  }

  function syncToolbar(event) {
    const detail = event.detail || {};
    if (Array.isArray(detail.options)) filterOptions = detail.options;
    if ("selectedId" in detail) selectedFilterId = detail.selectedId || "";
    if ("toolsEnabled" in detail) toolsEnabled = Boolean(detail.toolsEnabled);
    if ("moduleGroupEnabled" in detail) moduleGroupEnabled = Boolean(detail.moduleGroupEnabled);
  }

  onMount(() => {
    window.addEventListener("cabio:crossover-schematic-toolbar-sync", syncToolbar);
    return () => window.removeEventListener("cabio:crossover-schematic-toolbar-sync", syncToolbar);
  });
</script>

<div class="crossover-schematic-toolbar" aria-label="Crossover schematic tools">
  <select
    id="crossoverSchematicFilterSelect"
    class="crossover-schematic-filter-select"
    aria-label="Select crossover"
    title="Choose which crossover design shows the schematic editor."
    value={selectedFilterId}
    onchange={handleFilterChange}
  >
    {#each filterOptions as option}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
  {#each componentButtons as button (button.id)}
    <CrossoverSymbolButton {...button} disabled={!toolsEnabled} />
  {/each}
  <span class="crossover-toolbar-divider" aria-hidden="true"></span>
  <button
    id="crossoverCreateModuleGroupButton"
    class="crossover-group-button"
    type="button"
    title="Create a module group from the current schematic selection."
    disabled={!moduleGroupEnabled}
    onclick={createModuleGroup}
  >Create group from selection</button>
  <CrossoverPresetMenu disabled={!toolsEnabled} />
</div>
