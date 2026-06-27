<script>
  export let id;
  export let label;
  export let viewBox = "0 0 40 24";
  export let paths = [];
  export let disabled = false;
  export let action = "";

  function dispatchAction() {
    if (!action) return;
    window.dispatchEvent(new CustomEvent("cabio:crossover-schematic-action", {
      detail: { action },
    }));
  }
</script>

<button {id} class="crossover-symbol-button" type="button" aria-label={label} title={label} {disabled} onclick={dispatchAction}>
  <svg {viewBox} aria-hidden="true">
    {#each paths as path}
      <path d={path} />
    {/each}
  </svg>
</button>
