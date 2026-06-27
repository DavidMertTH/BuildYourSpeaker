<script>
  import FieldCard from "../fields/FieldCard.svelte";
  import SelectFieldCard from "../fields/SelectFieldCard.svelte";
  import RangeField from "../fields/RangeField.svelte";

  const bandpassOrderOptions = [
    { value: "4", label: "4th order" },
    { value: "6", label: "6th order" },
  ];

  const portShapeOptions = [
    { value: "round", label: "Round" },
    { value: "rectangular", label: "Rectangular" },
  ];

  const controls = [
    { type: "field", label: "Volume", field: "box.volumeL", unitType: "volume", step: "0.1", visibilityClass: "standard-box-only" },
    { type: "range", field: "box.volumeL", scale: "log", min: "4", max: "180", step: "0.1", label: "Volume slider", visibilityClass: "standard-box-only" },
    { type: "select", label: "Bandpass type", field: "box.bandpass.order", options: bandpassOrderOptions, visibilityClass: "bandpass-only" },
    { type: "field", label: "Rear chamber", field: "box.bandpass.rearVolumeL", unitType: "volume", step: "0.1", visibilityClass: "bandpass-only" },
    { type: "range", field: "box.bandpass.rearVolumeL", scale: "log", min: "2", max: "180", step: "0.1", label: "Bandpass rear chamber volume slider", visibilityClass: "bandpass-only" },
    { type: "field", label: "Front chamber", field: "box.bandpass.frontVolumeL", unitType: "volume", step: "0.1", visibilityClass: "bandpass-only" },
    { type: "range", field: "box.bandpass.frontVolumeL", scale: "log", min: "2", max: "180", step: "0.1", label: "Bandpass front chamber volume slider", visibilityClass: "bandpass-only" },
    { type: "field", label: "Front Fb", field: "box.bandpass.frontFb", unitType: "frequency", step: "0.1", visibilityClass: "bandpass-only" },
    { type: "range", field: "box.bandpass.frontFb", min: "18", max: "160", step: "0.1", label: "Bandpass front tuning slider", visibilityClass: "bandpass-only" },
    { type: "field", label: "Front port count", field: "box.bandpass.frontPortCount", min: "1", max: "12", step: "1", visibilityClass: "bandpass-only" },
    { type: "field", label: "Front port dia.", field: "box.bandpass.frontPortDiameterCm", unitType: "smallLength", step: "0.1", visibilityClass: "bandpass-only" },
    { type: "range", field: "box.bandpass.frontPortDiameterCm", min: "0.1", max: "18", step: "0.1", label: "Bandpass front port diameter slider", visibilityClass: "bandpass-only" },
    { type: "field", label: "Front port length", derivedField: "box.bandpass.frontPortLengthCm", unitType: "smallLength", step: "0.1", readonly: true, visibilityClass: "bandpass-only" },
    { type: "field", label: "Rear Fb", field: "box.bandpass.rearFb", unitType: "frequency", step: "0.1", visibilityClass: "bandpass-only sixth-order-only" },
    { type: "range", field: "box.bandpass.rearFb", min: "14", max: "120", step: "0.1", label: "Bandpass rear tuning slider", visibilityClass: "bandpass-only sixth-order-only" },
    { type: "field", label: "Rear port count", field: "box.bandpass.rearPortCount", min: "1", max: "12", step: "1", visibilityClass: "bandpass-only sixth-order-only" },
    { type: "field", label: "Rear port dia.", field: "box.bandpass.rearPortDiameterCm", unitType: "smallLength", step: "0.1", visibilityClass: "bandpass-only sixth-order-only" },
    { type: "range", field: "box.bandpass.rearPortDiameterCm", min: "0.1", max: "18", step: "0.1", label: "Bandpass rear port diameter slider", visibilityClass: "bandpass-only sixth-order-only" },
    { type: "field", label: "Rear port length", derivedField: "box.bandpass.rearPortLengthCm", unitType: "smallLength", step: "0.1", readonly: true, visibilityClass: "bandpass-only sixth-order-only" },
    { type: "field", label: "Target Fb", field: "box.fb", unitType: "frequency", step: "0.1", visibilityClass: "vented-only" },
    { type: "range", field: "box.fb", min: "14", max: "90", step: "0.1", label: "Target tuning slider", visibilityClass: "vented-only" },
    { type: "select", label: "Port shape", field: "box.portShape", options: portShapeOptions, visibilityClass: "vented-only" },
    { type: "field", label: "Port count", field: "box.portCount", min: "1", max: "12", step: "1", visibilityClass: "vented-only" },
    { type: "field", label: "Port dia.", field: "box.portDiameterCm", unitType: "smallLength", step: "0.1", visibilityClass: "vented-only round-port-only" },
    { type: "range", field: "box.portDiameterCm", min: "0.1", max: "18", step: "0.1", label: "Port diameter slider", visibilityClass: "vented-only round-port-only" },
    { type: "field", label: "Port width", field: "box.portWidthCm", unitType: "smallLength", step: "0.1", visibilityClass: "vented-only rectangular-port-only" },
    { type: "range", field: "box.portWidthCm", min: "0.1", max: "60", step: "0.1", label: "Port width slider", visibilityClass: "vented-only rectangular-port-only" },
    { type: "field", label: "Port height", field: "box.portHeightCm", unitType: "smallLength", step: "0.1", visibilityClass: "vented-only rectangular-port-only" },
    { type: "range", field: "box.portHeightCm", min: "0.1", max: "20", step: "0.1", label: "Port height slider", visibilityClass: "vented-only rectangular-port-only" },
    { type: "field", label: "Calc. port length", derivedField: "box.portLengthCm", unitType: "smallLength", step: "0.1", readonly: true, visibilityClass: "vented-only" },
    { type: "field", label: "PR count", field: "box.passiveRadiator.count", step: "1", visibilityClass: "passive-only" },
    { type: "field", label: "PR dia.", derivedField: "box.passiveRadiator.diameterCm", unitType: "smallLength", step: "0.1", visibilityClass: "passive-only" },
    { type: "range", derivedField: "box.passiveRadiator.diameterCm", min: "5", max: "46", step: "0.1", label: "Passive radiator diameter slider", visibilityClass: "passive-only" },
    { type: "field", label: "PR Sd", field: "box.passiveRadiator.sdCm2", unitType: "area", step: "0.1", visibilityClass: "passive-only" },
    { type: "field", label: "PR Mms", field: "box.passiveRadiator.mmsG", unitType: "mass", step: "0.1", visibilityClass: "passive-only" },
    { type: "range", field: "box.passiveRadiator.mmsG", min: "10", max: "500", step: "0.1", label: "Passive radiator moving mass slider", visibilityClass: "passive-only" },
    { type: "field", label: "PR Fs", field: "box.passiveRadiator.fs", unitType: "frequency", step: "0.1", visibilityClass: "passive-only" },
    { type: "range", field: "box.passiveRadiator.fs", min: "10", max: "80", step: "0.1", label: "Passive radiator Fs slider", visibilityClass: "passive-only" },
    { type: "field", label: "PR Xmax", field: "box.passiveRadiator.xmaxMm", unitType: "length", step: "0.1", visibilityClass: "passive-only" },
  ];
</script>

<div class="planner-settings">
  <div class="field-grid">
    {#each controls as control, index (`${control.type}-${control.field || control.derivedField}-${index}`)}
      {#if control.type === "field"}
        <FieldCard {...control} />
      {:else if control.type === "select"}
        <SelectFieldCard {...control} />
      {:else}
        <RangeField {...control} />
      {/if}
    {/each}
  </div>
</div>
