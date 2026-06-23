<script>
  import { onMount } from "svelte";

  const emptySnapshot = {
    empty: true,
    camera: { x: 0, y: 0, scale: 1 },
    endpoints: [],
    speakers: [],
    components: [],
    junctions: [],
    moduleGroups: [],
    wires: [],
    wirePreviewD: "",
  };

  let snapshot = emptySnapshot;
  let selectionBox = null;

  function syncBoard(event) {
    snapshot = {
      ...emptySnapshot,
      ...(event.detail || {}),
    };
  }

  function syncModuleGroups(event) {
    snapshot = {
      ...snapshot,
      moduleGroups: event.detail?.moduleGroups || [],
    };
  }

  function syncWires(event) {
    snapshot = {
      ...snapshot,
      wires: event.detail?.wires || [],
      wirePreviewD: event.detail?.wirePreviewD || "",
    };
  }

  function syncSelectionBox(event) {
    selectionBox = event.detail?.box || null;
  }

  function canvasStyle(camera = snapshot.camera) {
    const x = Number(camera?.x) || 0;
    const y = Number(camera?.y) || 0;
    const scale = Number(camera?.scale) || 1;
    return `transform: translate(${x}px, ${y}px) scale(${scale});`;
  }

  function positionStyle(item) {
    const x = Number(item?.x) || 0;
    const y = Number(item?.y) || 0;
    const accent = item?.accent ? ` --node-color: ${item.accent};` : "";
    const length = Number(item?.length);
    const wireLength = Number.isFinite(length) ? ` --wire-segment-length: ${length}px;` : "";
    return `left: ${x}px; top: ${y}px;${accent}${wireLength}`;
  }

  onMount(() => {
    window.addEventListener("cabio:crossover-schematic-board-sync", syncBoard);
    window.addEventListener("cabio:crossover-schematic-module-groups-sync", syncModuleGroups);
    window.addEventListener("cabio:crossover-schematic-wires-sync", syncWires);
    window.addEventListener("cabio:crossover-selection-box-sync", syncSelectionBox);
    return () => {
      window.removeEventListener("cabio:crossover-schematic-board-sync", syncBoard);
      window.removeEventListener("cabio:crossover-schematic-module-groups-sync", syncModuleGroups);
      window.removeEventListener("cabio:crossover-schematic-wires-sync", syncWires);
      window.removeEventListener("cabio:crossover-selection-box-sync", syncSelectionBox);
    };
  });
</script>

<div id="crossoverSchematicBoard" class="crossover-schematic-board" class:is-empty={snapshot.empty}>
  {#if !snapshot.empty}
    <div class="crossover-schematic-canvas" style={canvasStyle()}>
      <svg class="crossover-schematic-wires" aria-hidden="true">
        {#each snapshot.wires as wire (wire.id)}
          <g
            class={`crossover-wire${wire.hovered ? " network-hovered hovered" : ""}`}
            data-wire-id={wire.id}
          >
            <path class="crossover-wire-hit" data-wire-id={wire.id} d={wire.pathD}></path>
            <path class="crossover-wire-line" data-wire-id={wire.id} d={wire.pathD}></path>
          </g>
        {/each}
        {#if snapshot.wirePreviewD}
          <path class="crossover-wire-preview" d={snapshot.wirePreviewD}></path>
        {/if}
      </svg>

      {#each snapshot.endpoints as endpoint (endpoint.id)}
        <button
          type="button"
          class={`crossover-schematic-endpoint endpoint-${endpoint.symbol || "node"}${endpoint.selected ? " selected" : ""}`}
          data-node-id={endpoint.id}
          style={positionStyle(endpoint)}
          aria-label={`${endpoint.label} terminal`}
          title="Click or drag from this endpoint to start a wire."
        >
          <span class="crossover-endpoint-symbol">
            <svg class="crossover-endpoint-symbol-svg" viewBox="0 0 54 46" aria-hidden="true">
              {#if endpoint.symbol === "ground"}
                <path class="endpoint-stroke" d="M27 8 V22"></path>
                <path class="endpoint-stroke" d="M14 22 H40"></path>
                <path class="endpoint-stroke" d="M18 29 H36"></path>
                <path class="endpoint-stroke" d="M23 36 H31"></path>
              {:else}
                <circle class="endpoint-stroke" cx="27" cy="23" r="15"></circle>
                <path class="endpoint-stroke" d="M27 15 V23"></path>
                <path class="endpoint-stroke" d="M21 19 H33"></path>
                <path class="endpoint-stroke endpoint-muted-stroke" d="M21 29 H33"></path>
              {/if}
            </svg>
          </span>
          <span class="crossover-endpoint-label">{endpoint.label}</span>
        </button>
      {/each}

      {#each snapshot.speakers as speaker (speaker.designId)}
        <article
          class={`crossover-schematic-speaker${speaker.selected ? " selected" : ""}`}
          data-speaker-design-id={speaker.designId}
          data-plus-node-id={speaker.plusId}
          data-minus-node-id={speaker.minusId}
          style={positionStyle(speaker)}
          title="Drag this speaker endpoint. Use the plus or minus terminal to create wires."
        >
          <button
            type="button"
            class={`crossover-speaker-port speaker-port-positive${speaker.plusSelected ? " selected" : ""}`}
            data-node-id={speaker.plusId}
            aria-label="Speaker plus terminal"
            title="Click the speaker + terminal to create a wire."
          >+</button>
          <button
            type="button"
            class={`crossover-speaker-port speaker-port-negative${speaker.minusSelected ? " selected" : ""}`}
            data-node-id={speaker.minusId}
            aria-label="Speaker minus terminal"
            title="Click the speaker - terminal to create a wire."
          >-</button>
          <div class="crossover-speaker-symbol">
            <svg class="crossover-speaker-symbol-svg" viewBox="0 0 58 46" aria-hidden="true">
              <path class="speaker-stroke" d="M8 17 H19 L34 7 V39 L19 29 H8 Z"></path>
              <path class="speaker-stroke" d="M40 15 C46 20 46 26 40 31"></path>
              <path class="speaker-stroke speaker-wave" d="M46 10 C56 19 56 27 46 36"></path>
            </svg>
          </div>
          <div class="crossover-speaker-name">{speaker.name}</div>
        </article>
      {/each}

      {#each snapshot.components as component (component.id)}
        {#if component.type === "wire-segment"}
          <article
            class={`crossover-schematic-component crossover-wire-segment wire-segment-${component.orientation}${component.selected ? " selected" : ""}`}
            data-component-id={component.id}
            style={positionStyle(component)}
            title="Drag this wire segment to move it. Use either terminal to extend the wiring."
          >
            <div class="crossover-wire-segment-line"></div>
            <button
              type="button"
              class={`crossover-component-port crossover-wire-segment-port wire-port-start${component.portASelected ? " selected" : ""}`}
              data-node-id={component.portAId}
              aria-label="Wire segment start terminal"
              title="Drag from this wire terminal to create another segment."
            ></button>
            <button
              type="button"
              class={`crossover-component-port crossover-wire-segment-port wire-port-end${component.portBSelected ? " selected" : ""}`}
              data-node-id={component.portBId}
              aria-label="Wire segment end terminal"
              title="Drag from this wire terminal to create another segment."
            ></button>
          </article>
        {:else}
          <article
            class={`crossover-schematic-component schematic-${component.type}${component.selected ? " selected" : ""}`}
            data-component-id={component.id}
            style={positionStyle(component)}
          >
            <button
              type="button"
              class={`crossover-component-port port-left${component.portASelected ? " selected" : ""}`}
              data-node-id={component.portAId}
              aria-label="Component input node"
              title="Click one port, then another port or endpoint to create a wire."
            ></button>
            <div class="crossover-component-preview">
              <div class="crossover-component-name">{component.typeLabel}</div>
              <div class="crossover-component-symbol" title="Drag this component to position it on the schematic.">
                <svg class="crossover-component-symbol-svg" viewBox="0 0 132 42" preserveAspectRatio="none" aria-hidden="true">
                  <path class="symbol-lead" d="M0 21 H20"></path>
                  <path class="symbol-lead" d="M112 21 H132"></path>
                  {#if component.type === "capacitor"}
                    <path class="symbol-stroke" d="M20 21 H54 M54 8 V34 M78 8 V34 M78 21 H112"></path>
                  {:else if component.type === "inductor"}
                    <path class="symbol-stroke" d="M20 21 C20 7 38 7 38 21 C38 35 56 35 56 21 C56 7 74 7 74 21 C74 35 92 35 92 21 C92 7 110 7 112 21"></path>
                  {:else}
                    <polyline class="symbol-stroke" points="20,21 28,9 40,33 52,9 64,33 76,9 88,33 100,9 112,21"></polyline>
                  {/if}
                </svg>
              </div>
              <div class="crossover-component-value">{component.valueLabel}</div>
            </div>
            <button
              type="button"
              class="crossover-component-port port-right"
              class:selected={component.portBSelected}
              data-node-id={component.portBId}
              aria-label="Component output node"
              title="Click one port, then another port or endpoint to create a wire."
            ></button>
            <button
              type="button"
              class="crossover-component-delete"
              title="Delete this component and its connected wires."
              data-delete-component-id={component.id}
            >x</button>
            <div class="crossover-component-controls">
              <input
                type="range"
                min={component.min}
                max={component.max}
                step={component.step}
                value={component.value}
                data-component-value={component.id}
                title="Adjust the component value."
              />
              <input
                type="number"
                min={component.min}
                max={component.max}
                step={component.step}
                value={component.numberValue}
                data-component-value={component.id}
                title="Set the component value."
              />
              <span>{component.unit}</span>
            </div>
          </article>
        {/if}
      {/each}

      {#each snapshot.junctions as junction (junction.id)}
        <button
          type="button"
          class={`crossover-schematic-junction${junction.selected ? " selected" : ""}`}
          data-node-id={junction.id}
          style={positionStyle(junction)}
          aria-label="Wire junction"
          title="Click or drag from this junction to continue wiring."
        ></button>
      {/each}

      {#each snapshot.moduleGroups as group (group.id)}
        <div
          class={`crossover-module-group-box${group.selected ? " selected" : ""}`}
          data-module-group-id={group.id}
          style={`left: ${group.left}px; top: ${group.top}px; width: ${group.width}px; height: ${group.height}px; --module-group-index: ${group.index};`}
        >
          <button
            type="button"
            class="crossover-module-group-ungroup"
            aria-label="Ungroup crossover module"
            title="Remove this group without deleting its contents."
          >x</button>
        </div>
      {/each}
    </div>
  {/if}
</div>

{#if selectionBox}
  <div
    class="crossover-selection-box"
    style={`left: ${selectionBox.left}px; top: ${selectionBox.top}px; width: ${selectionBox.width}px; height: ${selectionBox.height}px;`}
  ></div>
{/if}
