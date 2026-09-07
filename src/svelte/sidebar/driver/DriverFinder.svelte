<script>
  import { onMount, tick } from "svelte";
  import { libraryTextMatches } from "../../../app/libraryUtils.js";
  import StatusText from "../../common/StatusText.svelte";
  import DriverSearchResults from "./DriverSearchResults.svelte";
  import LibraryFilterSwitch from "../library/LibraryFilterSwitch.svelte";

  let driverOptions = [{ value: "", label: "Custom current driver" }];
  let selectedDriverId = "";
  let driverBrandOptions = [{ value: "", label: "Any brand" }];
  let selectedDriverBrand = "";
  let driverFilterValue = "";
  let driverFilterOpen = false;
  let driverFilterDirty = false;
  let activeDriverFilterIndex = -1;
  let driverInput;

  $: driverFilterResults = filterDriverOptions(driverOptions, driverFilterDirty ? driverFilterValue : "");
  $: selectedDriverLabel = driverOptions.find((option) => option.value === selectedDriverId)?.label || "";
  $: if (activeDriverFilterIndex >= driverFilterResults.length) activeDriverFilterIndex = driverFilterResults.length - 1;

  function dispatchLibraryAction(action, detail = {}) {
    window.dispatchEvent(new CustomEvent("cabio:library-action", { detail: { action, ...detail } }));
  }

  function searchOnEnter(event) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    dispatchLibraryAction("driver-search");
  }

  function syncLibrarySelect(event) {
    if (event.detail?.kind !== "driver") return;
    if (Object.hasOwn(event.detail, "options")) {
      driverOptions = event.detail.options || [{ value: "", label: "Custom current driver" }];
    }
    const nextId = event.detail.selectedId || "";
    if (nextId !== selectedDriverId) resetDriverFilter();
    selectedDriverId = nextId;
    if (!driverFilterDirty) driverFilterValue = labelForDriverId(selectedDriverId);
  }

  function syncBrandOptions(event) {
    if (event.detail?.kind !== "driver") return;
    driverBrandOptions = event.detail.options || [{ value: "", label: "Any brand" }];
    selectedDriverBrand = event.detail.selectedValue || "";
  }

  function filterDriverOptions(options, filterValue) {
    return options.filter((option) => option.value && option.available !== false && libraryTextMatches(option.label, filterValue));
  }

  function labelForDriverId(id) {
    return driverOptions.find((option) => option.value === id)?.label || "";
  }

  function handleDriverFilterFocus() {
    dispatchLibraryAction("ensure-driver-library");
    driverFilterOpen = true;
    activeDriverFilterIndex = Math.max(0, driverFilterResults.findIndex((option) => option.value === selectedDriverId));
    driverInput?.select();
    scrollActiveDriverIntoView();
  }

  async function scrollActiveDriverIntoView() {
    await tick();
    if (driverFilterOpen) document.getElementById(`driver-filter-option-${activeDriverFilterIndex}`)?.scrollIntoView({ block: "nearest" });
  }

  function resetDriverFilter() {
    driverFilterOpen = false;
    driverFilterDirty = false;
    driverFilterValue = labelForDriverId(selectedDriverId);
    activeDriverFilterIndex = -1;
  }

  function toggleDriverFilter() {
    const wasOpen = driverFilterOpen;
    driverInput?.focus({ preventScroll: true });
    if (wasOpen) resetDriverFilter();
    else handleDriverFilterFocus();
  }

  function handleDriverFilterInput(event) {
    driverFilterValue = event.currentTarget.value;
    driverFilterDirty = true;
    driverFilterOpen = true;
    activeDriverFilterIndex = 0;
    scrollActiveDriverIntoView();
  }

  function handleDriverFilterKeydown(event) {
    if (event.isComposing) return;
    if (event.key === "Tab") {
      resetDriverFilter();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      resetDriverFilter();
      driverInput?.select();
      event.stopPropagation();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const wasOpen = driverFilterOpen;
      driverFilterOpen = true;
      const direction = event.key === "ArrowDown" ? 1 : -1;
      if (!wasOpen) {
        activeDriverFilterIndex = driverFilterResults.findIndex((option) => option.value === selectedDriverId);
      }
      if (driverFilterResults.length) {
        activeDriverFilterIndex = activeDriverFilterIndex < 0
          ? (direction === 1 ? 0 : driverFilterResults.length - 1)
          : Math.max(0, Math.min(activeDriverFilterIndex + (wasOpen ? direction : 0), driverFilterResults.length - 1));
      }
      scrollActiveDriverIntoView();
      return;
    }
    if (event.key === "Enter" && driverFilterOpen) {
      event.preventDefault();
      const option = driverFilterResults[Math.max(activeDriverFilterIndex, 0)];
      if (option) selectFilteredDriver(option.value);
    }
  }

  function selectFilteredDriver(id) {
    selectedDriverId = id;
    driverFilterDirty = false;
    driverFilterValue = labelForDriverId(id);
    driverFilterOpen = false;
    activeDriverFilterIndex = -1;
    driverInput?.focus({ preventScroll: true });
    driverInput?.select();
    dispatchLibraryAction("select-driver", { id });
  }

  function closeDriverFilterDropdown(event) {
    if (event.target?.closest?.(".driver-combobox, .driver-library-filter-panel")) return;
    resetDriverFilter();
  }

  onMount(() => {
    window.addEventListener("cabio:library-select-sync", syncLibrarySelect);
    window.addEventListener("cabio:library-brand-options-sync", syncBrandOptions);
    document.addEventListener("pointerdown", closeDriverFilterDropdown);
    return () => {
      window.removeEventListener("cabio:library-select-sync", syncLibrarySelect);
      window.removeEventListener("cabio:library-brand-options-sync", syncBrandOptions);
      document.removeEventListener("pointerdown", closeDriverFilterDropdown);
    };
  });
</script>

<section class="driver-workflow-section driver-finder-section" aria-labelledby="driverFinderTitle">
  <div class="driver-section-header">
    <span id="driverFinderTitle">Find driver</span>
  </div>
  <label class="driver-library-label" for="driverSelect">Known driver</label>
  <div class="driver-library-row">
    <div class="driver-combobox">
      <input
        id="driverSelect"
        bind:this={driverInput}
        class="driver-known-search"
        type="text"
        placeholder="Choose or type a driver model"
        spellcheck="false"
        role="combobox"
        autocomplete="off"
        aria-autocomplete="list"
        aria-controls="driverFilterResults"
        aria-expanded={driverFilterOpen}
        aria-activedescendant={driverFilterOpen && driverFilterResults[activeDriverFilterIndex] ? `driver-filter-option-${activeDriverFilterIndex}` : undefined}
        value={driverFilterValue}
        onfocus={handleDriverFilterFocus}
        onclick={() => { if (!driverFilterOpen) handleDriverFilterFocus(); }}
        onblur={resetDriverFilter}
        oninput={handleDriverFilterInput}
        onkeydown={handleDriverFilterKeydown}
      />
      <button class="driver-combobox-toggle" type="button" tabindex="-1" aria-label="Show known drivers" aria-expanded={driverFilterOpen} aria-controls="driverFilterResults" onmousedown={(event) => event.preventDefault()} onclick={toggleDriverFilter}>▾</button>
      <input id="driverLibraryFilter" type="hidden" value={driverFilterDirty ? driverFilterValue : ""} />
      {#if driverFilterOpen}
        <div id="driverFilterResults" class="driver-filter-results" role="listbox" aria-label="Filtered known drivers">
          {#if driverFilterResults.length}
            {#each driverFilterResults as option, index}
              <button
                id={`driver-filter-option-${index}`}
                type="button"
                tabindex="-1"
                class:selected={option.value === selectedDriverId}
                class:active={index === activeDriverFilterIndex}
                class="driver-filter-result"
                role="option"
                aria-selected={option.value === selectedDriverId}
                title={option.label}
                onmouseenter={() => activeDriverFilterIndex = index}
                onmousedown={(event) => event.preventDefault()}
                onclick={() => selectFilteredDriver(option.value)}
              >
                <span>{option.label}</span>
              </button>
            {/each}
          {:else}
            <div class="driver-filter-empty" role="status">No matching drivers. Try another model or check the filters.</div>
          {/if}
        </div>
      {/if}
    </div>
    <details class="library-filter-menu">
      <summary>
        <span>Filters</span>
        <LibraryFilterSwitch
          id="driverLibraryFilterEnabled"
          kind="driver"
          label="Enable driver preset filters"
        />
      </summary>
      <div class="library-filter-menu-body driver-library-filter-panel">
        <select
          id="driverLibraryBrand"
          aria-label="Filter driver presets by brand"
          value={selectedDriverBrand}
          onfocus={() => dispatchLibraryAction("ensure-driver-library")}
          onchange={() => dispatchLibraryAction("driver-brand-change")}
        >
          {#each driverBrandOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
        <select
          id="driverLibraryDiameter"
          aria-label="Filter driver presets by diameter"
          onfocus={() => dispatchLibraryAction("ensure-driver-library")}
          onchange={() => dispatchLibraryAction("driver-diameter-change")}
        >
          <option value="">Any diameter</option>
          <option value="lte-3">&lt;= 3 in</option>
          <option value="3.5">3.5 in</option>
          <option value="4">4 in</option>
          <option value="5.25">5.25 in</option>
          <option value="6.5">6.5 in</option>
          <option value="8">8 in</option>
          <option value="10">10 in</option>
          <option value="12">12 in</option>
          <option value="15">15 in</option>
          <option value="gte-18">&gt;= 18 in</option>
        </select>
      </div>
    </details>
  </div>
  <details class="driver-web-search">
    <summary>Search web or import datasheet</summary>
    <div class="driver-search">
      <input id="driverSearchInput" type="search" aria-label="Search web or datasheet URL" placeholder="Driver model or datasheet URL" onkeydown={searchOnEnter} />
      <button id="driverSearchButton" type="button" onclick={() => dispatchLibraryAction("driver-search")}>Search</button>
    </div>
    <StatusText id="driverSearchStatus" className="search-status" />
    <DriverSearchResults />
  </details>
</section>
