<script>
  import { onMount } from "svelte";
  import SearchResultValues from "../library/SearchResultValues.svelte";

  let results = [];

  function syncResults(event) {
    results = event.detail?.results || [];
  }

  function applyResult(id) {
    window.dispatchEvent(new CustomEvent("cabio:passive-radiator-search-result-action", {
      detail: { action: "apply-passive-radiator", id },
    }));
  }

  onMount(() => {
    window.addEventListener("cabio:passive-radiator-search-results-sync", syncResults);
    return () => window.removeEventListener("cabio:passive-radiator-search-results-sync", syncResults);
  });
</script>

<div id="passiveRadiatorSearchResults" class="passive-only search-results">
  {#each results as result}
    <article class="search-result" title="Review this P-Radiator candidate before applying it.">
      <div class="search-result-title">
        <span>{result.title}</span>
        <button type="button" title="Apply these P-Radiator parameters to the active config." onclick={() => applyResult(result.id)}>Apply</button>
      </div>
      <div class="search-result-meta">{result.meta}</div>
      <SearchResultValues values={result.values} />
      <div class="search-result-fields">{result.fields}</div>
    </article>
  {/each}
</div>
