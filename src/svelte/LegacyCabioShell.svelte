<script>
  import AppBrand from "./sidebar/AppBrand.svelte";
  import SidebarTabs from "./sidebar/SidebarTabs.svelte";
  import DriverPanel from "./sidebar/panels/DriverPanel.svelte";
  import PlanningPanel from "./sidebar/panels/PlanningPanel.svelte";
  import MeasurementPanel from "./sidebar/panels/MeasurementPanel.svelte";
  import CrossoverPanel from "./sidebar/panels/CrossoverPanel.svelte";
  import ImportExportDialog from "./dialogs/ImportExportDialog.svelte";
  import AppToolbar from "./workspace/AppToolbar.svelte";
  import PlotGrid from "./workspace/PlotGrid.svelte";
  import ConfigBar from "./workspace/ConfigBar.svelte";

  export let activeSidebarPanel = "driver";
  export let onSelectSidebarPanel = () => {};
</script>

<main class="app-shell">
      <aside class="sidebar">
        <AppBrand />
        <SidebarTabs activePanel={activeSidebarPanel} onSelectPanel={onSelectSidebarPanel} />

        <DriverPanel active={activeSidebarPanel === "driver"} />
        <PlanningPanel active={activeSidebarPanel === "planning"} />
        <MeasurementPanel active={activeSidebarPanel === "measurement"} />
        <CrossoverPanel active={activeSidebarPanel === "crossover"} />
      </aside>

      <ImportExportDialog />

      <section class="workspace">
        <AppToolbar />

        <PlotGrid />

        <ConfigBar />
      </section>
    </main>
