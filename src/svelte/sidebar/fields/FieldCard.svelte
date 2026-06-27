<script>
  import { onMount } from "svelte";
  import { UNIT_GROUPS } from "../../../app/units.js";

  export let label;
  export let field = undefined;
  export let id = undefined;
  export let unitType = undefined;
  export let type = "number";
  export let step = undefined;
  export let min = undefined;
  export let max = undefined;
  export let derivedField = undefined;
  export let readonly = false;
  export let visibilityClass = "";
  export let changeAction = "";
  export let inputAction = "";
  export let focusAction = "";
  export let pointerDownAction = "";
  export let blurAction = "";
  let inputElement;
  let selectedUnitId = "";

  $: fieldPath = field || derivedField || "";
  $: unitOptions = unitType ? UNIT_GROUPS[unitType] || [] : [];
  $: showUnitSelect = unitOptions.length > 1;
  $: fixedUnitLabel = unitOptions.length === 1 ? unitOptions[0].label : "";

  function dispatchFieldAction(action, event = null) {
    if (!action) return;
    window.dispatchEvent(new CustomEvent("cabio:field-action", {
      detail: { action, id, field, element: event?.currentTarget || null },
    }));
  }

  function handleUnitChange(event) {
    window.dispatchEvent(new CustomEvent("cabio:field-action", {
      detail: {
        action: "unit-change",
        field,
        derivedField,
        element: event.currentTarget,
        inputElement,
      },
    }));
  }

  function syncUnit(event) {
    if (event.detail?.fieldPath !== fieldPath) return;
    selectedUnitId = event.detail.unitId || unitOptions[0]?.id || "";
  }

  onMount(() => {
    window.addEventListener("cabio:unit-select-sync", syncUnit);
    return () => {
      window.removeEventListener("cabio:unit-select-sync", syncUnit);
    };
  });
</script>

<label class={`field-card ${visibilityClass}`.trim()}>
  <span class="field-top"><span>{label}</span></span>
  <span class="field-value-group">
    <input
      bind:this={inputElement}
      {id}
      data-field={field}
      data-derived-field={derivedField}
      data-svelte-field={field || derivedField ? "true" : undefined}
      data-unit-type={unitType}
      {type}
      {step}
      {min}
      {max}
      {readonly}
      onpointerdown={(event) => dispatchFieldAction(pointerDownAction, event)}
      onfocus={(event) => dispatchFieldAction(focusAction, event)}
      oninput={(event) => dispatchFieldAction(inputAction || (field ? "editable-field-input" : ""), event)}
      onchange={(event) => dispatchFieldAction(changeAction, event)}
      onblur={(event) => dispatchFieldAction(blurAction || (field ? "editable-field-blur" : ""), event)}
    />
    {#if showUnitSelect}
      <select class="unit-select" data-unit-for={fieldPath} title="Choose the display unit for this value." value={selectedUnitId || unitOptions[0]?.id} onchange={handleUnitChange}>
        {#each unitOptions as unit}
          <option value={unit.id}>{unit.label}</option>
        {/each}
      </select>
    {:else if fixedUnitLabel}
      <span class="unit-fixed" title="Choose the display unit for this value.">{fixedUnitLabel}</span>
    {/if}
  </span>
</label>
