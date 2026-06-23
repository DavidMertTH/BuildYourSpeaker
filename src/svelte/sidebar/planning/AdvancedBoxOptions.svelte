<script>
  import FieldCard from "../fields/FieldCard.svelte";
  import SelectFieldCard from "../fields/SelectFieldCard.svelte";
  import RangeField from "../fields/RangeField.svelte";

  const highPassOrderOptions = [
    { value: "0", label: "Off" },
    { value: "1", label: "1st" },
    { value: "2", label: "2nd" },
    { value: "4", label: "4th" },
  ];

  const controls = [
    { type: "field", label: "Power", field: "box.powerW", unitType: "power", step: "1" },
    { type: "field", label: "HP freq", field: "box.highPassHz", unitType: "frequency", step: "1" },
    { type: "select", label: "HP order", field: "box.highPassOrder", options: highPassOrderOptions },
    { type: "field", label: "Rs", field: "box.seriesResistanceOhm", unitType: "resistance", step: "0.01" },
    { type: "field", label: "Fill", field: "box.fillPercent", unitType: "percent", step: "1" },
    { type: "field", label: "Qa", field: "box.qa", step: "1" },
    { type: "field", label: "QL", field: "box.ql", step: "0.1" },
    { type: "field", label: "Port length", field: "box.portLengthCm", unitType: "smallLength", step: "0.1", visibilityClass: "vented-only" },
    { type: "range", field: "box.portLengthCm", min: "0.1", max: "160", step: "0.1", label: "Port length slider", visibilityClass: "vented-only" },
    { type: "field", label: "End corr.", field: "box.portEndCorrection", step: "0.01", visibilityClass: "vented-only" },
    { type: "range", field: "box.portEndCorrection", min: "0.6", max: "2.2", step: "0.01", label: "End correction slider", visibilityClass: "vented-only" },
    { type: "field", label: "Front port length", field: "box.bandpass.frontPortLengthCm", unitType: "smallLength", step: "0.1", visibilityClass: "bandpass-only" },
    { type: "range", field: "box.bandpass.frontPortLengthCm", min: "0.1", max: "180", step: "0.1", label: "Bandpass front port length slider", visibilityClass: "bandpass-only" },
    { type: "field", label: "Rear port length", field: "box.bandpass.rearPortLengthCm", unitType: "smallLength", step: "0.1", visibilityClass: "bandpass-only sixth-order-only" },
    { type: "range", field: "box.bandpass.rearPortLengthCm", min: "0.1", max: "180", step: "0.1", label: "Bandpass rear port length slider", visibilityClass: "bandpass-only sixth-order-only" },
    { type: "field", label: "End corr.", field: "box.portEndCorrection", step: "0.01", visibilityClass: "bandpass-only" },
    { type: "range", field: "box.portEndCorrection", min: "0.6", max: "2.2", step: "0.01", label: "Bandpass end correction slider", visibilityClass: "bandpass-only" },
    { type: "field", label: "PR Qms", field: "box.passiveRadiator.qms", step: "0.01", visibilityClass: "passive-only" },
    { type: "field", label: "PR Cms", field: "box.passiveRadiator.cmsMmN", unitType: "compliance", step: "0.001", visibilityClass: "passive-only" },
  ];
</script>

<details class="collapsible-fields">
  <summary>Advanced box options</summary>
  <div class="field-grid">
    {#each controls as control, index (`${control.type}-${control.field}-${index}`)}
      {#if control.type === "field"}
        <FieldCard {...control} />
      {:else if control.type === "select"}
        <SelectFieldCard {...control} />
      {:else}
        <RangeField {...control} />
      {/if}
    {/each}
  </div>
</details>
