<script>
  import { onMount } from "svelte";
  import IconEye from "./IconEye.svelte";

  let groups = [];
  let ungroupedGroupId = "";
  let groupOptions = [];
  let palette = [];

  function dispatchConfigAction(action, detail = {}, event = null) {
    event?.stopPropagation?.();
    window.dispatchEvent(new CustomEvent("cabio:config-action", { detail: { action, ...detail } }));
    event?.currentTarget?.closest("details")?.removeAttribute("open");
  }

  function syncConfigBar(event) {
    groups = event.detail?.groups || [];
    ungroupedGroupId = event.detail?.ungroupedGroupId || "";
    groupOptions = event.detail?.groupOptions || [];
    palette = event.detail?.palette || [];
  }

  function activateChip(event, design) {
    if (event.currentTarget.dataset.justDragged === "true") {
      delete event.currentTarget.dataset.justDragged;
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (event.target.closest("button, input, select, textarea, label, .config-chip-menu")) return;
    dispatchConfigAction("activate-design", { designId: design.id }, event);
  }

  function activateChipByKey(event, design) {
    if (event.target !== event.currentTarget || !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    dispatchConfigAction("activate-design", { designId: design.id }, event);
  }

  function renameOnKey(event, design) {
    event.stopPropagation();
    if (event.key === "Enter") event.currentTarget.blur();
    if (event.key === "Escape") {
      event.currentTarget.value = design.name;
      event.currentTarget.blur();
    }
  }

  function autoColorBackground(color) {
    return `linear-gradient(135deg, ${color} 0 45%, transparent 45% 55%, ${color} 55%)`;
  }

  onMount(() => {
    window.addEventListener("cabio:config-bar-sync", syncConfigBar);
    const requestSync = () => window.dispatchEvent(new CustomEvent("cabio:config-bar-request"));
    queueMicrotask(requestSync);
    window.setTimeout(requestSync, 50);
    return () => window.removeEventListener("cabio:config-bar-sync", syncConfigBar);
  });
</script>

<footer class="config-bar" aria-label="Configurations">
  <div class="config-bar-main">
    <div id="configBarList" class="config-bar-list">
      {#each groups as group (group.id)}
        <article
          class:config-group-block-ungrouped={group.isUngrouped}
          class="config-group-block"
          data-group-id={group.id}
          title={group.isUngrouped ? "Configs without a group." : "Configs in this group."}
        >
          <div class="config-group-header">
            {#if group.isUngrouped}
              <span class="config-group-static-label">No group</span>
            {:else}
              <input
                type="text"
                value={group.name}
                aria-label="Config group name"
                title="Rename this config group."
                onclick={(event) => event.stopPropagation()}
                onkeydown={(event) => event.stopPropagation()}
                onchange={(event) => dispatchConfigAction("rename-group", { groupId: group.id, value: event.currentTarget.value, fallback: group.name }, event)}
              />
              <button
                type="button"
                class:active={group.showCombined}
                class:rendered={group.combinedRendered}
                class="config-group-combined-toggle"
                style={`--config-group-combined-color: ${group.combinedColor}; --config-group-combined-text: ${group.combinedText};`}
                aria-label={`${group.showCombined ? "Hide" : "Show"} combined group curve`}
                title="Show or hide the acoustically summed curve for this group."
                onclick={(event) => dispatchConfigAction("toggle-group-combined", { groupId: group.id, showCombined: !group.showCombined }, event)}
              >&Sigma;</button>
              <button
                type="button"
                aria-label={`Remove ${group.name}`}
                title="Remove this group and move its configs to the next group."
                onclick={(event) => dispatchConfigAction("delete-group", { groupId: group.id }, event)}
              >x</button>
            {/if}
          </div>

          <div class="config-group-chips" data-config-group-id={group.id || ungroupedGroupId} data-empty-label={group.isUngrouped ? "No configs" : "Empty"}>
            {#each group.designs as design (design.id)}
              <div
                class:active={design.active}
                class:muted={!design.visible}
                class:graph-hidden={!design.graphVisible}
                class="config-chip"
                tabindex="0"
                role="button"
                draggable="true"
                data-design-id={design.id}
                data-config-group-id={design.groupId || ungroupedGroupId}
                data-short-name={design.shortName}
                data-full-name={design.fullName}
                title="Select this config for editing."
                onclick={(event) => activateChip(event, design)}
                onkeydown={(event) => activateChipByKey(event, design)}
              >
                <input
                  type="checkbox"
                  checked={design.visible}
                  aria-label={`${design.visible ? "Deactivate" : "Activate"} ${design.name}`}
                  title="Activate or deactivate this config."
                  onclick={(event) => event.stopPropagation()}
                  onchange={(event) => dispatchConfigAction("set-design-visible", { designId: design.id, visible: event.currentTarget.checked }, event)}
                />
                <button
                  type="button"
                  class:active={design.graphVisible}
                  class="config-visibility-toggle"
                  aria-label={`${design.graphVisible ? "Hide" : "Show"} ${design.name} curve`}
                  aria-pressed={String(design.graphVisible)}
                  title="Show or hide only this config's individual graph curve."
                  onclick={(event) => dispatchConfigAction("set-design-graph-visible", { designId: design.id, visible: !design.graphVisible }, event)}
                ><IconEye visible={design.graphVisible} /></button>
                <span class="legend-swatch" style={`background: ${design.color};`} title="Graph color for this config."></span>
                {#if design.active}
                  <input
                    class="config-name"
                    type="text"
                    value={design.name}
                    aria-label="Active config name"
                    title="Rename the active config."
                    onclick={(event) => event.stopPropagation()}
                    onkeydown={(event) => renameOnKey(event, design)}
                    onchange={(event) => dispatchConfigAction("rename-active-design", { value: event.currentTarget.value }, event)}
                  />
                {:else}
                  <span class="config-name">{design.name}</span>
                {/if}
                <span class="config-name-runner" aria-hidden="true" title={design.fullName}>
                  <span class="config-name-runner-text">{design.fullName} &nbsp;&nbsp; {design.fullName}</span>
                </span>
                <div class="config-chip-menu" data-design-id={design.id}>
                  <button type="button" class="config-menu-button" aria-label={`${design.name} config menu`} aria-expanded="false" title="Config actions.">⋮</button>
                  <div class="config-chip-menu-panel">
                    <label class="config-menu-field">
                      <span>Group</span>
                      <select
                        aria-label={`${design.name} group`}
                        value={design.groupId || ungroupedGroupId}
                        onchange={(event) => dispatchConfigAction("assign-design-group", { designId: design.id, groupId: event.currentTarget.value }, event)}
                      >
                        <option value={ungroupedGroupId}>No group</option>
                        {#each groupOptions as option (option.id)}
                          <option value={option.id}>{option.name}</option>
                        {/each}
                      </select>
                    </label>
                    <div class="config-menu-field">
                      <span>Color</span>
                      <div class="config-color-grid">
                        <button
                          type="button"
                          class:active={!design.customColor}
                          class="config-color-swatch"
                          style={`background: ${autoColorBackground(design.autoColor)};`}
                          aria-label="Use automatic color"
                          title="Use automatic color from the palette."
                          onclick={(event) => dispatchConfigAction("set-design-color", { designId: design.id, color: "" }, event)}
                        ></button>
                        {#each palette as color (color)}
                          <button
                            type="button"
                            class:active={design.color === color && design.customColor}
                            class="config-color-swatch"
                            style={`background: ${color};`}
                            aria-label={`Set color ${color}`}
                            onclick={(event) => dispatchConfigAction("set-design-color", { designId: design.id, color }, event)}
                          ></button>
                        {/each}
                      </div>
                    </div>
                    <button type="button" onclick={(event) => dispatchConfigAction("duplicate-design", { designId: design.id }, event)}>Duplicate</button>
                    <button type="button" class="danger" title="Delete this config." onclick={(event) => dispatchConfigAction("delete-design", { designId: design.id }, event)}>Delete</button>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </article>
      {/each}
    </div>
  </div>
  <div class="config-actions">
    <button id="newConfigButton" class="config-new-button" type="button" onclick={(event) => dispatchConfigAction("new-config", {}, event)}>
      <span class="desktop-label">+ Config</span><span class="mobile-label">+ Config</span>
    </button>
    <button id="newConfigGroupButton" type="button" onclick={(event) => dispatchConfigAction("new-group", {}, event)}>
      <span class="desktop-label">+ Group</span><span class="mobile-label">+ Group</span>
    </button>
    <details id="configAddMenu" class="config-add-menu config-more-menu">
      <summary aria-label="Add config or group">+</summary>
      <div class="config-more-list">
        <button id="mobileNewConfigButton" type="button" onclick={(event) => dispatchConfigAction("new-config", {}, event)}>+ Config</button>
        <button id="mobileNewConfigGroupButton" type="button" onclick={(event) => dispatchConfigAction("new-group", {}, event)}>+ Group</button>
      </div>
    </details>
  </div>
</footer>
