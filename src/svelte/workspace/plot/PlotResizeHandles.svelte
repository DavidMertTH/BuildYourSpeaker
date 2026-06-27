<script>
  const directions = ["n", "e", "s", "w", "se"];
</script>

{#each directions as direction}
  <span
    class={`plot-resize-handle plot-resize-${direction}`}
    data-resize-direction={direction}
    aria-hidden="true"
  ></span>
{/each}
