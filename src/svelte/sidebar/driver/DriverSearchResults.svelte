<script>
  import { onMount } from "svelte";
  import SearchResultValues from "../library/SearchResultValues.svelte";

  let driverResults = [];
  let frequencyResults = [];
  let showFrequencySection = false;

  function syncResults(event) {
    driverResults = event.detail?.driverResults || [];
    frequencyResults = event.detail?.frequencyResults || [];
    showFrequencySection = Boolean(event.detail?.showFrequencySection);
  }

  function dispatchAction(action, id) {
    window.dispatchEvent(new CustomEvent("cabio:driver-search-result-action", {
      detail: { action, id },
    }));
  }

  onMount(() => {
    window.addEventListener("cabio:driver-search-results-sync", syncResults);
    return () => window.removeEventListener("cabio:driver-search-results-sync", syncResults);
  });
</script>

<div id="driverSearchResults" class="search-results">
  {#each driverResults as result}
    <article class:has-frequency-response={result.hasFrequencyResponse} class="search-result" title="Review this driver candidate before applying it.">
      <div class="search-result-title">
        <span>{result.title}</span>
        <button type="button" title="Apply these driver parameters to the project." onclick={() => dispatchAction("apply-driver", result.id)}>Apply</button>
      </div>
      <div class="search-result-meta">{result.meta}</div>
      <div class="search-result-fields driver-response-summary">{result.responseSummary}</div>
      <SearchResultValues values={result.values} />
      <div class="search-result-fields">{result.fields}</div>
    </article>
  {/each}

  {#if showFrequencySection}
    <div class="search-result-section">Frequency responses</div>
  {/if}

  {#each frequencyResults as result}
    <article class="search-result frequency-response-result" title={result.tooltip}>
      <div class="search-result-title">
        <span>{result.title}</span>
        <button
          type="button"
          title={result.actionTooltip}
          disabled={result.disabled}
          onclick={() => dispatchAction(result.action, result.id)}
        >{result.actionLabel}</button>
      </div>
      <div class="search-result-meta">{result.meta}</div>
      <SearchResultValues values={result.values} />
      <div class="search-result-fields">{result.reason}</div>
    </article>
  {/each}
</div>
