<script>
  import { onMount } from "svelte";
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

  $: driverFilterResults = filterDriverOptions(driverOptions, driverFilterValue);
  $: selectedDriverLabel = labelForDriverId(selectedDriverId);

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
    selectedDriverId = event.detail.selectedId || "";
    if (!driverFilterDirty) driverFilterValue = labelForDriverId(selectedDriverId);
  }

  function syncBrandOptions(event) {
    if (event.detail?.kind !== "driver") return;
    driverBrandOptions = event.detail.options || [{ value: "", label: "Any brand" }];
    selectedDriverBrand = event.detail.selectedValue || "";
  }

  function filterDriverOptions(options, filterValue) {
    const tokens = String(filterValue || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
    const filtered = options.filter((option) => {
      const label = String(option.label || "").toLowerCase();
      return tokens.every((token) => label.includes(token));
    });
    return filtered.slice(0, 80);
  }

  function labelForDriverId(id) {
    return driverOptions.find((option) => option.value === id)?.label || "";
  }

  function handleDriverFilterFocus() {
    dispatchLibraryAction("ensure-driver-library");
    driverFilterOpen = true;
    activeDriverFilterIndex = Math.max(0, driverFilterResults.findIndex((option) => option.value === selectedDriverId));
  }

  function handleDriverFilterInput(event) {
    driverFilterValue = event.currentTarget.value;
    driverFilterDirty = true;
    driverFilterOpen = true;
    activeDriverFilterIndex = driverFilterResults.length ? 0 : -1;
    dispatchLibraryAction("driver-filter-input");
  }

  function handleDriverFilterKeydown(event) {
    if (event.key === "Escape") {
      driverFilterOpen = false;
      driverFilterDirty = false;
      driverFilterValue = selectedDriverLabel;
      event.stopPropagation();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      driverFilterOpen = true;
      activeDriverFilterIndex = driverFilterResults.length
        ? Math.min(activeDriverFilterIndex + 1, driverFilterResults.length - 1)
        : -1;
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      activeDriverFilterIndex = driverFilterResults.length
        ? Math.max(activeDriverFilterIndex - 1, 0)
        : -1;
      return;
    }
    if (event.key === "Enter" && driverFilterResults.length) {
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
    dispatchLibraryAction("select-driver", { id });
  }

  function closeDriverFilterDropdown(event) {
    if (event.target?.closest?.(".driver-combobox, .driver-library-filter-panel")) return;
    driverFilterOpen = false;
    driverFilterDirty = false;
    driverFilterValue = selectedDriverLabel;
    activeDriverFilterIndex = -1;
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
  <div class="driver-search">
    <input id="driverSearchInput" type="search" placeholder="Search driver or paste datasheet URL" onkeydown={searchOnEnter} />
    <button id="driverSearchButton" type="button" onclick={() => dispatchLibraryAction("driver-search")}>Search</button>
  </div>
  <label class="driver-library-label" for="driverSelect">Known driver</label>
  <div class="driver-library-row">
    <div class="driver-combobox">
      <input
        id="driverSelect"
        class="driver-known-search"
        type="search"
        placeholder="Type to filter known drivers"
        role="combobox"
        autocomplete="off"
        aria-autocomplete="list"
        aria-controls="driverFilterResults"
        aria-expanded={driverFilterOpen}
        value={driverFilterValue}
        onfocus={handleDriverFilterFocus}
        oninput={handleDriverFilterInput}
        onkeydown={handleDriverFilterKeydown}
      />
      <input id="driverLibraryFilter" type="hidden" value={driverFilterValue} />
      {#if driverFilterOpen}
        <div id="driverFilterResults" class="driver-filter-results" role="listbox" aria-label="Filtered known drivers">
          {#if driverFilterResults.length}
            {#each driverFilterResults as option, index}
              <button
                type="button"
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
            <div class="driver-filter-empty">No matches</div>
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
  <StatusText id="driverSearchStatus" className="search-status" />
  <DriverSearchResults />
</section>
