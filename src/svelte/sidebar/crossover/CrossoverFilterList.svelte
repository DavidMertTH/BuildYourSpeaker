<script>
  import { onMount } from "svelte";
  import { crossoverFrequencyToSliderValue, crossoverSliderValueToFrequency } from "../../../app/crossoverUtils.js";
  import CrossoverFilterField from "./CrossoverFilterField.svelte";
  import IconEye from "../../workspace/IconEye.svelte";

  let transitions = [];
  let filters = [];

  function syncList(event) {
    transitions = event.detail?.transitions || [];
    filters = event.detail?.filters || [];
  }

  function requestSync() {
    window.dispatchEvent(new CustomEvent("cabio:crossover-filter-list-request"));
  }

  function dispatchAction(action, detail = {}) {
    window.dispatchEvent(new CustomEvent("cabio:crossover-filter-action", {
      detail: { action, ...detail },
    }));
  }

  function updateLocalItem(collection, id, patch) {
    return collection.map((item) => item.id === id ? { ...item, ...patch } : item);
  }

  function updateLocalField(collection, id, fieldKey, value) {
    return collection.map((item) => {
      if (item.id !== id) return item;
      return {
        ...item,
        fields: item.fields.map((field) => field.key === fieldKey ? { ...field, value } : field),
      };
    });
  }

  function roundValue(value, decimals = 1) {
    const factor = 10 ** decimals;
    return String(Math.round(Number(value) * factor) / factor);
  }

  function frequencyLabel(value) {
    const frequency = Number(value);
    if (!Number.isFinite(frequency) || frequency <= 0) return "-";
    if (frequency >= 1000) {
      const khz = frequency / 1000;
      return `${roundValue(khz, khz >= 10 ? 1 : 2)} kHz`;
    }
    return `${roundValue(frequency, frequency >= 100 ? 0 : 1)} Hz`;
  }

  function gainLabel(value) {
    const gain = Number(value) || 0;
    return `${gain >= 0 ? "+" : ""}${roundValue(gain, 1)} dB`;
  }

  function rangePreview(range, rangeValue) {
    if (range.kind === "gain") {
      const gain = Number(rangeValue) || 0;
      return { field: "gainDb", fieldValue: roundValue(gain, 1), badge: gainLabel(gain) };
    }
    const frequency = crossoverSliderValueToFrequency(rangeValue);
    return {
      field: "frequencyHz",
      fieldValue: roundValue(frequency, frequency >= 1000 ? 0 : 1),
      badge: frequencyLabel(frequency),
    };
  }

  function localFieldPreview(item, fieldKey, value) {
    if (fieldKey === "gainDb") return { badge: gainLabel(value), rangeValue: String(Number(value) || 0) };
    if (fieldKey === "frequencyHz") return { badge: frequencyLabel(value), rangeValue: String(crossoverFrequencyToSliderValue(value)) };
    if (item.type === "linkwitz-transform" && (fieldKey === "sourceFrequencyHz" || fieldKey === "targetFrequencyHz")) {
      const source = fieldKey === "sourceFrequencyHz" ? value : item.fields.find((field) => field.key === "sourceFrequencyHz")?.value;
      const target = fieldKey === "targetFrequencyHz" ? value : item.fields.find((field) => field.key === "targetFrequencyHz")?.value;
      return { badge: `${frequencyLabel(source)} -> ${frequencyLabel(target)}` };
    }
    return {};
  }

  function handleLocalFieldInput(ownerType, item, fieldKey, value) {
    if (ownerType === "transition") {
      const preview = localFieldPreview(item, fieldKey, value);
      transitions = updateLocalField(transitions, item.id, fieldKey, value);
      if (preview.badge || preview.rangeValue) {
        transitions = updateLocalItem(transitions, item.id, {
          ...(preview.badge ? { badge: preview.badge } : {}),
          ...(preview.rangeValue && item.range ? { range: { ...item.range, value: preview.rangeValue } } : {}),
        });
      }
      return;
    }
    const preview = localFieldPreview(item, fieldKey, value);
    filters = updateLocalField(filters, item.id, fieldKey, value);
    if (preview.badge || preview.rangeValue) {
      filters = updateLocalItem(filters, item.id, {
        ...(preview.badge ? { badge: preview.badge } : {}),
        ...(preview.rangeValue && item.range ? { range: { ...item.range, value: preview.rangeValue } } : {}),
      });
    }
  }

  function handleRangeInput(ownerType, item, event) {
    const rangeValue = event.currentTarget.value;
    const preview = rangePreview(item.range, rangeValue);
    dispatchAction("update-range", {
      ownerType,
      ownerId: item.id,
      value: rangeValue,
      live: true,
    });
    if (ownerType === "transition") {
      transitions = updateLocalItem(transitions, item.id, {
        badge: preview.badge,
        range: { ...item.range, value: rangeValue },
      });
      transitions = updateLocalField(transitions, item.id, preview.field, preview.fieldValue);
      return;
    }
    filters = updateLocalItem(filters, item.id, {
      badge: preview.badge,
      range: { ...item.range, value: rangeValue },
    });
    filters = updateLocalField(filters, item.id, preview.field, preview.fieldValue);
  }

  onMount(() => {
    window.addEventListener("cabio:crossover-filter-list-sync", syncList);
    queueMicrotask(requestSync);
    const fallback = window.setTimeout(requestSync, 0);
    return () => {
      window.clearTimeout(fallback);
      window.removeEventListener("cabio:crossover-filter-list-sync", syncList);
    };
  });
</script>

<div id="signalFilterList" class="search-results crossover-filter-list">
  {#each transitions as transition (transition.id)}
    <article class:muted={transition.muted} class:invalid={transition.invalid} class="search-result crossover-transition signal-filter signal-filter-transition" data-transition-id={transition.id}>
      <div class="search-result-title">
        <span>Transition</span>
        <strong class="filter-frequency-badge">{transition.badge}</strong>
      </div>
      <div class="crossover-transition-fields">
        {#each transition.fields as field}
          <CrossoverFilterField {field} ownerType="transition" ownerId={transition.id} onLocalInput={(fieldKey, value) => handleLocalFieldInput("transition", transition, fieldKey, value)} />
        {/each}
      </div>
      <input
        class="planner-range crossover-transition-range signal-filter-range"
        type="range"
        min={transition.range.min}
        max={transition.range.max}
        step={transition.range.step}
        value={transition.range.value}
        aria-label="Transition frequency slider"
        title="Adjust this transition frequency live on a logarithmic scale."
        oninput={(event) => handleRangeInput("transition", transition, event)}
      />
      <div class="crossover-transition-actions">
        <button
          type="button"
          class:active={transition.annotationVisible}
          class="filter-annotation-toggle"
          aria-pressed={String(transition.annotationVisible)}
          aria-label={`${transition.annotationVisible ? "Hide" : "Show"} SPL visualization`}
          title={`${transition.annotationVisible ? "Hide" : "Show"} this transition's SPL graph visualization.`}
          onclick={() => dispatchAction("toggle-transition-annotation", { transitionId: transition.id })}
        >
          <IconEye visible={transition.annotationVisible} />
        </button>
        <button type="button" title="Enable or disable this transition." onclick={() => dispatchAction("toggle-transition", { transitionId: transition.id })}>{transition.muted ? "Enable" : "Disable"}</button>
        <button type="button" class="danger" title="Delete this transition." onclick={() => dispatchAction("delete-transition", { transitionId: transition.id })}>Delete</button>
      </div>
    </article>
  {/each}

  {#each filters as filter (filter.id)}
    <article class:muted={filter.muted} class="search-result crossover-transition signal-filter" data-signal-filter-id={filter.id}>
      <div class="search-result-title">
        <span>{filter.label}</span>
        <strong class="filter-frequency-badge">{filter.badge}</strong>
      </div>
      <div class="crossover-transition-fields">
        {#each filter.fields as field}
          <CrossoverFilterField {field} ownerType="filter" ownerId={filter.id} onLocalInput={(fieldKey, value) => handleLocalFieldInput("filter", filter, fieldKey, value)} />
        {/each}
      </div>
      {#if filter.range}
        <input
          class={`planner-range crossover-transition-range signal-filter-range ${filter.range.kind === "gain" ? "signal-filter-gain-range" : ""}`}
          type="range"
          min={filter.range.min}
          max={filter.range.max}
          step={filter.range.step}
          value={filter.range.value}
          aria-label={filter.range.ariaLabel}
          title={filter.range.tooltip}
          oninput={(event) => handleRangeInput("filter", filter, event)}
        />
      {/if}
      <div class="crossover-transition-actions">
        {#if filter.annotationVisible !== null}
          <button
            type="button"
            class:active={filter.annotationVisible}
            class="filter-annotation-toggle"
            aria-pressed={String(filter.annotationVisible)}
            aria-label={`${filter.annotationVisible ? "Hide" : "Show"} SPL visualization`}
            title={`${filter.annotationVisible ? "Hide" : "Show"} this filter's SPL graph visualization.`}
            onclick={() => dispatchAction("toggle-filter-annotation", { filterId: filter.id })}
          >
            <IconEye visible={filter.annotationVisible} />
          </button>
        {/if}
        <button type="button" title="Enable or disable this signal filter." onclick={() => dispatchAction("toggle-filter", { filterId: filter.id })}>{filter.muted ? "Enable" : "Disable"}</button>
        <button type="button" class="danger" title="Delete this signal filter." onclick={() => dispatchAction("delete-filter", { filterId: filter.id })}>Delete</button>
      </div>
    </article>
  {/each}
</div>
