<script>
  import { onMount } from "svelte";
  import CrossoverFilterList from "./CrossoverFilterList.svelte";

  const signalFilterTypes = [
    { value: "transition", label: "Transition" },
    { value: "gain", label: "Gain" },
    { value: "parametric", label: "Parametric EQ" },
    { value: "lowpass", label: "Lowpass" },
    { value: "highpass", label: "Highpass" },
    { value: "linkwitz-transform", label: "Linkwitz Transform" },
    { value: "subsonic", label: "Subsonic / rumble" },
  ];

  export let active = false;
  let groups = [];
  let activeGroupId = "";
  let members = [];
  let status = "";

  function dispatchCrossoverAction(action, detail = {}) {
    window.dispatchEvent(new CustomEvent("cabio:crossover-control-action", { detail: { action, ...detail } }));
  }

  function syncCrossoverControls(event) {
    groups = event.detail?.groups || [];
    activeGroupId = event.detail?.activeGroupId || "";
    members = event.detail?.members || [];
    status = event.detail?.status || "";
  }

  onMount(() => {
    window.addEventListener("cabio:crossover-controls-sync", syncCrossoverControls);
    return () => window.removeEventListener("cabio:crossover-controls-sync", syncCrossoverControls);
  });
</script>

<section class:active class="panel sidebar-panel crossover-control-panel" data-sidebar-panel="crossover">
  <label class="driver-select-row crossover-group-field">
    <span>Group</span>
    <select id="crossoverGroupSelect" value={activeGroupId} onchange={(event) => dispatchCrossoverAction("select-group", { groupId: event.currentTarget.value })}>
      {#each groups as group (group.id)}
        <option value={group.id}>{group.name}</option>
      {/each}
    </select>
  </label>
  <div id="crossoverMemberList" class="crossover-member-list">
    {#each members as member (member.id)}
      <button
        type="button"
        class:active={member.active}
        class="crossover-member"
        style={`--member-color: ${member.color}`}
        title="Select this config for editing."
        onclick={() => dispatchCrossoverAction("select-member", { designId: member.id })}
      >{member.name}</button>
    {/each}
  </div>
  <div class="crossover-add-row">
    <select id="signalFilterTypeSelect" aria-label="Signal filter type" onchange={() => dispatchCrossoverAction("select-filter-type")}>
      {#each signalFilterTypes as type (type.value)}
        <option value={type.value}>{type.label}</option>
      {/each}
    </select>
    <button id="signalFilterAddButton" class="crossover-add-button" type="button" onclick={() => dispatchCrossoverAction("add-filter")}>Add</button>
  </div>
  <CrossoverFilterList />
  <div id="crossoverStatus" class="search-status">{status}</div>
</section>
