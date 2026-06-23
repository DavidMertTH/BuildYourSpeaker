<script>
  import { onMount } from "svelte";

  export let label;
  export let id = undefined;
  export let field = undefined;
  export let options = [];
  export let visibilityClass = "";
  export let changeAction = "";
  export let focusAction = "";
  export let pointerDownAction = "";
  let selectElement;
  let renderedOptions = options;

  $: if (renderedOptions === options) renderedOptions = options;

  function dispatchFieldAction(action, event = null) {
    if (!action) return;
    window.dispatchEvent(new CustomEvent("cabio:field-action", {
      detail: { action, id, field, element: event?.currentTarget || null },
    }));
  }

  function syncOptions(event) {
    if (event.detail?.id !== id) return;
    renderedOptions = event.detail.options || options;
    queueMicrotask(() => {
      if (selectElement) selectElement.value = event.detail.selectedValue || "";
    });
  }

  onMount(() => {
    window.addEventListener("cabio:select-options-sync", syncOptions);
    return () => window.removeEventListener("cabio:select-options-sync", syncOptions);
  });
</script>

<label class={`field-card ${visibilityClass}`.trim()}>
  <span class="field-top"><span>{label}</span></span>
  <select
    bind:this={selectElement}
    {id}
    data-field={field}
    data-svelte-field={field ? "true" : undefined}
    onpointerdown={(event) => dispatchFieldAction(pointerDownAction, event)}
    onfocus={(event) => dispatchFieldAction(focusAction, event)}
    onchange={(event) => dispatchFieldAction(changeAction || (field ? "editable-field-input" : ""), event)}
  >
    {#each renderedOptions as option (option.value)}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
</label>
