<script>
  import DriverFinder from "../driver/DriverFinder.svelte";
  import DriverValidation from "../driver/DriverValidation.svelte";
  import DriverGroups from "../driver/DriverGroups.svelte";
  import DriverParameterGroups from "../driver/DriverParameterGroups.svelte";

  export let active = false;
</script>

<section class:active class="panel sidebar-panel" data-sidebar-panel="driver">
  <DriverFinder />
  <DriverValidation />
  <DriverGroups />
  <DriverParameterGroups />
</section>
