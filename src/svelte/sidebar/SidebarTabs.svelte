<script>
  export let activePanel = "driver";
  export let onSelectPanel = () => {};

  const tabs = [
    { panelId: "driver", label: "Driver" },
    { panelId: "planning", label: "Box" },
    { panelId: "measurement", label: "Measurement" },
    { panelId: "crossover", label: "Filter" },
  ];
</script>

<nav class="sidebar-tabs" aria-label="Sidebar sections">
  <span class="pill-indicator" aria-hidden="true"></span>
  {#each tabs as tab (tab.panelId)}
    <button
      class:active={activePanel === tab.panelId}
      class="sidebar-tab"
      data-sidebar-tab={tab.panelId}
      type="button"
      onclick={() => onSelectPanel(tab.panelId)}
    >
      {tab.label}
    </button>
  {/each}
</nav>
