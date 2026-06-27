<script>
  export let field;
  export let ownerType;
  export let ownerId;
  export let onLocalInput = () => {};

  function dispatchUpdate(live = false, value = undefined) {
    window.dispatchEvent(new CustomEvent("cabio:crossover-filter-action", {
      detail: {
        action: "update-field",
        ownerType,
        ownerId,
        field: field.key,
        value: value ?? field.value,
        live,
      },
    }));
  }

  function handleInput(event) {
    field.value = event.currentTarget.value;
    onLocalInput(field.key, field.value);
    if (field.live !== false) dispatchUpdate(true);
  }

  function handleChange(event) {
    field.value = event.currentTarget.value;
    dispatchUpdate(false);
  }
</script>

<label class="crossover-transition-field">
  <span>{field.label}</span>
  {#if field.kind === "select"}
    <select
      data-crossover-field={ownerType === "transition" ? field.key : undefined}
      data-signal-filter-field={ownerType === "filter" ? field.key : undefined}
      title={field.tooltip}
      onchange={handleChange}
    >
      {#each field.options as option}
        <option value={option.value} selected={option.value === field.value}>{option.label}</option>
      {/each}
    </select>
  {:else}
    <input
      type="text"
      inputmode="decimal"
      autocomplete="off"
      data-numeric-input="true"
      data-crossover-field={ownerType === "transition" ? field.key : undefined}
      data-signal-filter-field={ownerType === "filter" ? field.key : undefined}
      min={field.min}
      max={field.max}
      step={field.step}
      value={field.value}
      title={field.tooltip}
      oninput={handleInput}
      onchange={handleChange}
    />
  {/if}
</label>
