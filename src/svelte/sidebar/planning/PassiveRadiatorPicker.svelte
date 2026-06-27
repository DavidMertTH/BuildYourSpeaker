<script>
  import { onMount } from "svelte";
  import StatusText from "../../common/StatusText.svelte";
  import PassiveRadiatorSearchResults from "./PassiveRadiatorSearchResults.svelte";
  import LibraryFilterSwitch from "../library/LibraryFilterSwitch.svelte";

  let passiveRadiatorOptions = [{ value: "", label: "Custom P-Radiator" }];
  let selectedPassiveRadiatorId = "";
  let passiveRadiatorBrandOptions = [{ value: "", label: "Any brand" }];
  let selectedPassiveRadiatorBrand = "";

  function dispatchLibraryAction(action) {
    window.dispatchEvent(new CustomEvent("cabio:library-action", { detail: { action } }));
  }

  function searchOnEnter(event) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    dispatchLibraryAction("passive-radiator-search");
  }

  function syncLibrarySelect(event) {
    if (event.detail?.kind !== "passive-radiator") return;
    if (Object.hasOwn(event.detail, "options")) {
      passiveRadiatorOptions = event.detail.options || [{ value: "", label: "Custom P-Radiator" }];
    }
    selectedPassiveRadiatorId = event.detail.selectedId || "";
  }

  function syncBrandOptions(event) {
    if (event.detail?.kind !== "passive-radiator") return;
    passiveRadiatorBrandOptions = event.detail.options || [{ value: "", label: "Any brand" }];
    selectedPassiveRadiatorBrand = event.detail.selectedValue || "";
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

<label class="passive-only driver-select-row">
            <span>P-Radiator</span>
            <div class="library-controls">
              <details class="library-filter-menu">
                <summary>
                  <span>Filters</span>
                  <LibraryFilterSwitch
                    id="passiveRadiatorLibraryFilterEnabled"
                    kind="passive-radiator"
                    label="Enable P-Radiator preset filters"
                  />
                </summary>
                <div class="library-filter-menu-body">
                  <select
                    id="passiveRadiatorLibraryBrand"
                    aria-label="Filter P-Radiator presets by brand"
                    value={selectedPassiveRadiatorBrand}
                    onfocus={() => dispatchLibraryAction("ensure-passive-radiator-library")}
                    onchange={() => dispatchLibraryAction("passive-radiator-brand-change")}
                  >
                    {#each passiveRadiatorBrandOptions as option}
                      <option value={option.value}>{option.label}</option>
                    {/each}
                  </select>
                  <select
                    id="passiveRadiatorLibraryDiameter"
                    aria-label="Filter P-Radiator presets by diameter"
                    onfocus={() => dispatchLibraryAction("ensure-passive-radiator-library")}
                    onchange={() => dispatchLibraryAction("passive-radiator-diameter-change")}
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
            <select
              id="passiveRadiatorSelect"
              value={selectedPassiveRadiatorId}
              onpointerdown={() => dispatchLibraryAction("ensure-passive-radiator-library")}
              onfocus={() => dispatchLibraryAction("ensure-passive-radiator-library")}
              onchange={() => dispatchLibraryAction("select-passive-radiator")}
            >
              {#each passiveRadiatorOptions as option}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
          </label>
          <div class="passive-only driver-search">
            <input id="passiveRadiatorSearchInput" type="search" placeholder="Search P-Radiator or paste datasheet URL" onkeydown={searchOnEnter} />
            <button id="passiveRadiatorSearchButton" type="button" onclick={() => dispatchLibraryAction("passive-radiator-search")}>Search</button>
          </div>
          <StatusText id="passiveRadiatorSearchStatus" className="passive-only search-status" />
          <PassiveRadiatorSearchResults />
