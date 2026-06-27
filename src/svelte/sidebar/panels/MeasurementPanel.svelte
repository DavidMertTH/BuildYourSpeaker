<script>
  import MeasurementImport from "../measurement/MeasurementImport.svelte";

  export let active = false;
</script>

<section class:active class="panel sidebar-panel" data-sidebar-panel="measurement">
  <div class="beta-warning measurement-beta-warning">
    <strong>Recording beta</strong>
    <span>Live recording is not available yet. Imported response files can already be used.</span>
  </div>
  <MeasurementImport />
</section>
