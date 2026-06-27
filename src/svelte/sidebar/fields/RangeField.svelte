<script>
  export let field = undefined;
  export let derivedField = undefined;
  export let scale = undefined;
  export let min;
  export let max;
  export let step;
  export let label;
  export let visibilityClass = "";

  function dispatchRangeInput(event) {
    window.dispatchEvent(new CustomEvent("cabio:field-action", {
      detail: {
        action: "range-field-input",
        field,
        derivedField,
        element: event.currentTarget,
      },
    }));
  }
</script>

<input
  class={`planner-range ${visibilityClass}`.trim()}
  data-range-field={field}
  data-derived-range-field={derivedField}
  data-range-scale={scale}
  data-svelte-range={field || derivedField ? "true" : undefined}
  type="range"
  {min}
  {max}
  {step}
  aria-label={label}
  oninput={dispatchRangeInput}
/>
