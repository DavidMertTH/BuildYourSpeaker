<script>
  import { onMount } from "svelte";

  let groups = [];
  let activeGroupId = "";
  let driverOptions = [];

  function dispatchDriverGroupAction(action, detail = {}) {
    window.dispatchEvent(new CustomEvent("cabio:driver-group-action", {
      detail: { action, ...detail },
    }));
  }

  function syncDriverGroups(event) {
    groups = event.detail?.groups || [];
    activeGroupId = event.detail?.activeGroupId || "";
    driverOptions = event.detail?.driverOptions || [];
  }

  function handleCardClick(groupId) {
    dispatchDriverGroupAction("activate", { groupId });
  }

  function handleCardKeydown(event, groupId) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    dispatchDriverGroupAction("activate", { groupId });
  }

  function stopAndRun(event, action, detail = {}) {
    event.stopPropagation();
    dispatchDriverGroupAction(action, detail);
  }

  function updateName(event, group) {
    event.stopPropagation();
    dispatchDriverGroupAction("update-name", {
      groupId: group.id,
      value: event.currentTarget.value,
      fallback: group.name,
    });
  }

  function updateCount(event, groupId) {
    event.stopPropagation();
    dispatchDriverGroupAction("update-count", {
      groupId,
      value: event.currentTarget.value,
    });
  }

  function updateDriver(event, groupId) {
    event.stopPropagation();
    dispatchDriverGroupAction("select-driver", {
      groupId,
      driverId: event.currentTarget.value,
    });
  }

  function updateWiring(event, groupId) {
    event.stopPropagation();
    dispatchDriverGroupAction("update-wiring", {
      groupId,
      value: event.currentTarget.value,
    });
  }

  onMount(() => {
    window.addEventListener("cabio:driver-groups-sync", syncDriverGroups);
    return () => window.removeEventListener("cabio:driver-groups-sync", syncDriverGroups);
  });
</script>

<section class="driver-groups" aria-label="Driver groups">
  <div class="driver-group-card-header">
    <button
      id="addDriverGroupButton"
      type="button"
      title="Add another active driver group to the shared enclosure model."
      onclick={() => dispatchDriverGroupAction("add")}
    >Add group</button>
  </div>

  <div id="driverGroupList" class="driver-group-list">
    {#each groups as group (group.id)}
      <div
        class:active={group.id === activeGroupId}
        class="driver-group-card"
        role="button"
        tabindex="0"
        title="Select this driver group for editing."
        onclick={() => handleCardClick(group.id)}
        onkeydown={(event) => handleCardKeydown(event, group.id)}
      >
        <div class="driver-group-card-header">
          <input
            type="text"
            value={group.name}
            aria-label="Driver group name"
            title="Name this driver group."
            onclick={(event) => event.stopPropagation()}
            onchange={(event) => updateName(event, group)}
          />
          <div class="driver-group-actions">
            <button
              type="button"
              aria-label={`Duplicate ${group.name}`}
              title="Duplicate this driver group."
              onclick={(event) => stopAndRun(event, "duplicate", { groupId: group.id })}
            >+</button>
            <button
              type="button"
              disabled={groups.length <= 1}
              aria-label={`Remove ${group.name}`}
              title="Remove this driver group."
              onclick={(event) => stopAndRun(event, "remove", { groupId: group.id })}
            >x</button>
          </div>
        </div>

        <label class="driver-group-row wide">
          <span>Driver</span>
          <select
            aria-label={`${group.name} driver`}
            value={group.selectedDriverId || ""}
            onclick={(event) => event.stopPropagation()}
            onchange={(event) => updateDriver(event, group.id)}
          >
            <option value="">Custom group driver</option>
            {#each driverOptions as driver (driver.id)}
              <option value={driver.id}>{driver.name}</option>
            {/each}
          </select>
        </label>

        <div class="driver-group-fields">
          <label class="driver-group-row">
            <span>Count</span>
            <input
              type="number"
              min="1"
              max="16"
              step="1"
              value={group.count}
              onclick={(event) => event.stopPropagation()}
              onchange={(event) => updateCount(event, group.id)}
            />
          </label>
          <label class="driver-group-row">
            <span>Wiring</span>
            <select
              value={group.wiring}
              onclick={(event) => event.stopPropagation()}
              onchange={(event) => updateWiring(event, group.id)}
            >
              <option value="parallel">Parallel</option>
              <option value="series">Series</option>
            </select>
          </label>
        </div>
      </div>
    {/each}
  </div>
</section>
