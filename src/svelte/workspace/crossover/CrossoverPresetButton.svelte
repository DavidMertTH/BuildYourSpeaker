<script>
  export let preset;
  export let previewName;
  export let label;
  export let viewBox;
  export let paths = [];
  export let disabled = false;

  function insertPreset(event) {
    window.dispatchEvent(new CustomEvent("cabio:crossover-schematic-action", {
      detail: { action: "add-preset", preset },
    }));
    event.currentTarget.closest("details")?.removeAttribute("open");
  }
</script>

<button
  class="crossover-preset-button"
  data-crossover-preset={preset}
  data-preview-name={previewName}
  type="button"
  aria-label={label}
  title={label}
  {disabled}
  onclick={insertPreset}
>
  <svg {viewBox} aria-hidden="true">
    {#each paths as path}
      <path d={path} />
    {/each}
  </svg>
</button>
