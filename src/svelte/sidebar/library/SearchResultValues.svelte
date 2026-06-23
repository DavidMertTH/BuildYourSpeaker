<script>
  export let values = [];
</script>

<div class="search-result-values">
  {#each values as item}
    <div class="search-result-value">
      {#if item.empty}
        {item.text}
      {:else}
        <span>{item.label}</span>
        <strong>{item.value}</strong>
      {/if}
    </div>
  {/each}
</div>
