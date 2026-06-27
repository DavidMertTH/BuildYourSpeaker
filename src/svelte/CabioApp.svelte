<script>
  import { onMount } from "svelte";
  import LegacyCabioShell from './LegacyCabioShell.svelte';

  const sidebarPanelIds = new Set(["driver", "planning", "measurement", "crossover"]);

  let activeSidebarPanel = "driver";

  function isSidebarPanelId(panelId) {
    return sidebarPanelIds.has(panelId);
  }

  function selectSidebarPanel(panelId) {
    if (!isSidebarPanelId(panelId)) return;
    activeSidebarPanel = panelId;
    window.dispatchEvent(new CustomEvent("cabio:sidebar-panel-change", { detail: { panelId } }));
  }

  onMount(() => {
    const syncSidebarPanel = (event) => {
      const panelId = event.detail?.panelId;
      if (isSidebarPanelId(panelId)) activeSidebarPanel = panelId;
    };
    window.addEventListener("cabio:sidebar-panel-sync", syncSidebarPanel);
    return () => window.removeEventListener("cabio:sidebar-panel-sync", syncSidebarPanel);
  });
</script>

<LegacyCabioShell {activeSidebarPanel} onSelectSidebarPanel={selectSidebarPanel} />
