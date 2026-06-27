<script>
  import MeasurementDevices from "../measurement/MeasurementDevices.svelte";
  import MeasurementSignal from "../measurement/MeasurementSignal.svelte";
  import MeasurementCapture from "../measurement/MeasurementCapture.svelte";
  import MeasurementImport from "../measurement/MeasurementImport.svelte";

  export let active = false;
</script>

<section class:active class="panel sidebar-panel" data-sidebar-panel="measurement">
  <MeasurementDevices />
  <MeasurementSignal />
  <MeasurementCapture />
  <MeasurementImport />
</section>
