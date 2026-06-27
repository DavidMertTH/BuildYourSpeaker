<script>
  import FieldCard from "../fields/FieldCard.svelte";

  const parameterGroups = [
    {
      title: "Core T/S",
      fields: [
        { label: "Re", field: "driver.re", unitType: "resistance", step: "0.01" },
        { label: "Fs", field: "driver.fs", unitType: "frequency", step: "0.1" },
        { label: "Qms", field: "driver.qms", step: "0.01" },
        { label: "Qes", field: "driver.qes", step: "0.01" },
        { label: "Vas", field: "driver.vasL", unitType: "volume", step: "0.1" },
      ],
    },
    {
      title: "Motor & mechanical",
      fields: [
        { label: "Le", field: "driver.leMh", unitType: "inductance", step: "0.01" },
        { label: "Sd", field: "driver.sdCm2", unitType: "area", step: "0.1" },
        { label: "Xmax", field: "driver.xmaxMm", unitType: "length", step: "0.1" },
        { label: "Mms", field: "driver.mmsG", unitType: "mass", step: "0.1" },
        { label: "Bl Tm", field: "driver.bl", step: "0.01" },
      ],
    },
    {
      title: "Frequency range",
      fields: [
        { label: "Usable from", field: "driver.minFrequencyHz", unitType: "frequency", step: "1" },
        { label: "Usable to", field: "driver.maxFrequencyHz", unitType: "frequency", step: "1" },
      ],
    },
  ];
</script>

<div class="driver-parameter-groups">
  {#each parameterGroups as group (group.title)}
    <details class="collapsible-fields">
      <summary>{group.title}</summary>
      <div class="field-grid">
        {#each group.fields as field (field.field)}
          <FieldCard {...field} />
        {/each}
      </div>
    </details>
  {/each}
</div>
