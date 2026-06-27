<script>
  import StatusText from "../../common/StatusText.svelte";
  import DriverHealth from "./DriverHealth.svelte";
  import DriverSummary from "./DriverSummary.svelte";
</script>

<DriverSummary />

<details id="driverValidationDetails" class="driver-workflow-section driver-validation-section">
  <summary class="driver-validation-summary">
    <span class="driver-validation-light" id="driverValidationLight" aria-hidden="true"></span>
    <span id="driverValidationTitle">Validation</span>
    <StatusText id="driverValidationStatus" tag="strong" initialText="OK" />
  </summary>
  <DriverHealth />
</details>
