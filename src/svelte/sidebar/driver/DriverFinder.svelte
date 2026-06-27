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

  $: driverFilterResults = filterDriverOptions(driverOptions, driverFilterValue);

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
  }

  function syncBrandOptions(event) {
    if (event.detail?.kind !== "driver") return;
    driverBrandOptions = event.detail.options || [{ value: "", label: "Any brand" }];
    selectedDriverBrand = event.detail.selectedValue || "";
  }

  function filterDriverOptions(options, filterValue) {
    const tokens = String(filterValue || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return [];
    return options.filter((option) => {
      if (!option.value) return false;
      const label = String(option.label || "").toLowerCase();
      return tokens.every((token) => label.includes(token));
    });
  }

  function handleDriverFilterFocus() {
    dispatchLibraryAction("ensure-driver-library");
    driverFilterOpen = Boolean(driverFilterValue.trim());
  }

  function handleDriverFilterInput(event) {
    driverFilterValue = event.currentTarget.value;
    driverFilterOpen = Boolean(driverFilterValue.trim());
    dispatchLibraryAction("driver-filter-input");
  }

  function handleDriverFilterKeydown(event) {
    if (event.key === "Escape") {
      driverFilterOpen = false;
      event.stopPropagation();
      return;
    }
    if (event.key === "Enter" && driverFilterResults.length === 1) {
      event.preventDefault();
      selectFilteredDriver(driverFilterResults[0].value);
    }
  }

  function selectFilteredDriver(id) {
    selectedDriverId = id;
    driverFilterOpen = false;
    dispatchLibraryAction("select-driver", { id });
  }

  function closeDriverFilterDropdown(event) {
    if (event.target?.closest?.(".driver-library-filter-panel")) return;
    driverFilterOpen = false;
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
    <select
      id="driverSelect"
      value={selectedDriverId}
      onpointerdown={() => dispatchLibraryAction("ensure-driver-library")}
      onfocus={() => dispatchLibraryAction("ensure-driver-library")}
      onchange={() => dispatchLibraryAction("select-driver")}
    >
      {#each driverOptions as option}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>
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
        <input
          id="driverLibraryFilter"
          class="driver-known-search"
          type="search"
          placeholder="Filter known drivers by name"
          role="combobox"
          aria-autocomplete="list"
          aria-controls="driverFilterResults"
          aria-expanded={driverFilterOpen}
          value={driverFilterValue}
          onfocus={handleDriverFilterFocus}
          oninput={handleDriverFilterInput}
          onkeydown={handleDriverFilterKeydown}
        />
        {#if driverFilterOpen}
          <div id="driverFilterResults" class="driver-filter-results" role="listbox" aria-label="Filtered known drivers">
            {#if driverFilterResults.length}
              {#each driverFilterResults as option}
                <button
                  type="button"
                  class:selected={option.value === selectedDriverId}
                  class="driver-filter-result"
                  role="option"
                  aria-selected={option.value === selectedDriverId}
                  title={option.label}
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
