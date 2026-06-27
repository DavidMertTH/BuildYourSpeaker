<script>
  import { onMount } from "svelte";
  import StatusText from "../../common/StatusText.svelte";
  import DriverSearchResults from "./DriverSearchResults.svelte";
  import LibraryFilterSwitch from "../library/LibraryFilterSwitch.svelte";

  let driverOptions = [{ value: "", label: "Custom current driver" }];
  let selectedDriverId = "";
  let driverBrandOptions = [{ value: "", label: "Any brand" }];
  let selectedDriverBrand = "";

  function dispatchLibraryAction(action) {
    window.dispatchEvent(new CustomEvent("cabio:library-action", { detail: { action } }));
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

  onMount(() => {
    window.addEventListener("cabio:library-select-sync", syncLibrarySelect);
    window.addEventListener("cabio:library-brand-options-sync", syncBrandOptions);
    return () => {
      window.removeEventListener("cabio:library-select-sync", syncLibrarySelect);
      window.removeEventListener("cabio:library-brand-options-sync", syncBrandOptions);
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
      <div class="library-filter-menu-body">
        <input
          id="driverLibraryFilter"
          class="driver-known-search"
          type="search"
          placeholder="Filter known drivers by name"
          onfocus={() => dispatchLibraryAction("ensure-driver-library")}
          oninput={() => dispatchLibraryAction("driver-filter-input")}
        />
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
