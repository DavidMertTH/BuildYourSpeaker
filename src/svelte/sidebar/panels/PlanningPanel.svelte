<script>
  import PlanningModeSelector from "../planning/PlanningModeSelector.svelte";
  import BoxUsageSection from "../planning/BoxUsageSection.svelte";
  import PassiveRadiatorPicker from "../planning/PassiveRadiatorPicker.svelte";
  import PlannerSettings from "../planning/PlannerSettings.svelte";
  import AdvancedBoxOptions from "../planning/AdvancedBoxOptions.svelte";

  export let active = false;
</script>

<section class:active class="panel sidebar-panel" data-sidebar-panel="planning">
  <PlanningModeSelector />
  <BoxUsageSection />
  <PassiveRadiatorPicker />
  <PlannerSettings />
  <AdvancedBoxOptions />
</section>
