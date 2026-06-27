import { UNGROUPED_CROSSOVER_GROUP_ID, UNGROUPED_CONFIG_GROUP_ID } from "./constants.js";
import {
  WIRE_POSTURE_HORIZONTAL_FIRST,
  normalizeWirePosture,
  orthogonalWireRoutePoints,
  snapWirePointToGrid,
  toggleWirePosture,
  wirePathD,
} from "./crossoverWireRouting.js";

const NEW_CROSSOVER_FOR_GROUP_OPTION = "__new_crossover_for_group__";

const CROSSOVER_SCHEMATIC_PRESETS = {
  "lowpass-1": {
    nodes: {
      input: { x: 24, y: 26 },
      output: { x: 250, y: 26 },
    },
    components: [
      { key: "series", type: "inductor", value: 0.68, x: 72, y: 0 },
    ],
    wires: [
      ["input", "series.a"],
      ["series.b", "output"],
    ],
  },
  "highpass-1": {
    nodes: {
      input: { x: 24, y: 26 },
      output: { x: 250, y: 26 },
    },
    components: [
      { key: "series", type: "capacitor", value: 10, x: 72, y: 0 },
    ],
    wires: [
      ["input", "series.a"],
      ["series.b", "output"],
    ],
  },
  "lowpass-2": {
    nodes: {
      input: { x: 24, y: 26 },
      output: { x: 250, y: 26 },
      return: { x: 450, y: 176 },
    },
    components: [
      { key: "series", type: "inductor", value: 0.68, x: 72, y: 0 },
      { key: "shunt", type: "capacitor", value: 10, x: 274, y: 150 },
    ],
    wires: [
      ["input", "series.a"],
      ["series.b", "output"],
      ["output", "shunt.a"],
      ["shunt.b", "return"],
    ],
  },
  "lowpass-3": {
    nodes: {
      input: { x: 24, y: 26 },
      output: { x: 510, y: 26 },
      return: { x: 390, y: 176 },
    },
    components: [
      { key: "seriesA", type: "inductor", value: 0.56, x: 72, y: 0 },
      { key: "shunt", type: "capacitor", value: 10, x: 204, y: 150 },
      { key: "seriesB", type: "inductor", value: 0.33, x: 330, y: 0 },
    ],
    wires: [
      ["input", "seriesA.a"],
      ["seriesA.b", "seriesB.a"],
      ["seriesA.b", "shunt.a"],
      ["shunt.b", "return"],
      ["seriesB.b", "output"],
    ],
  },
  "highpass-2": {
    nodes: {
      input: { x: 24, y: 26 },
      output: { x: 250, y: 26 },
      return: { x: 450, y: 176 },
    },
    components: [
      { key: "series", type: "capacitor", value: 10, x: 72, y: 0 },
      { key: "shunt", type: "inductor", value: 0.68, x: 274, y: 150 },
    ],
    wires: [
      ["input", "series.a"],
      ["series.b", "output"],
      ["output", "shunt.a"],
      ["shunt.b", "return"],
    ],
  },
  "highpass-3": {
    nodes: {
      input: { x: 24, y: 26 },
      output: { x: 510, y: 26 },
      return: { x: 390, y: 176 },
    },
    components: [
      { key: "seriesA", type: "capacitor", value: 8.2, x: 72, y: 0 },
      { key: "shunt", type: "inductor", value: 0.47, x: 204, y: 150 },
      { key: "seriesB", type: "capacitor", value: 4.7, x: 330, y: 0 },
    ],
    wires: [
      ["input", "seriesA.a"],
      ["seriesA.b", "seriesB.a"],
      ["seriesA.b", "shunt.a"],
      ["shunt.b", "return"],
      ["seriesB.b", "output"],
    ],
  },
  lpad: {
    nodes: {
      input: { x: 24, y: 26 },
      output: { x: 250, y: 26 },
      return: { x: 450, y: 176 },
    },
    components: [
      { key: "series", type: "resistor", value: 2.2, x: 72, y: 0 },
      { key: "shunt", type: "resistor", value: 8.2, x: 274, y: 150 },
    ],
    wires: [
      ["input", "series.a"],
      ["series.b", "output"],
      ["output", "shunt.a"],
      ["shunt.b", "return"],
    ],
  },
  zobel: {
    nodes: {
      input: { x: 24, y: 26 },
      output: { x: 550, y: 26 },
      return: { x: 550, y: 176 },
    },
    components: [
      { key: "resistor", type: "resistor", value: 6.8, x: 120, y: 150 },
      { key: "capacitor", type: "capacitor", value: 10, x: 330, y: 150 },
    ],
    wires: [
      ["input", "output"],
      ["output", "resistor.a"],
      ["resistor.b", "capacitor.a"],
      ["capacitor.b", "return"],
    ],
  },
  notch: {
    nodes: {
      input: { x: 24, y: 26 },
      output: { x: 680, y: 26 },
      return: { x: 680, y: 186 },
    },
    components: [
      { key: "resistor", type: "resistor", value: 6.8, x: 86, y: 160 },
      { key: "capacitor", type: "capacitor", value: 6.8, x: 282, y: 160 },
      { key: "inductor", type: "inductor", value: 0.33, x: 478, y: 160 },
    ],
    wires: [
      ["input", "output"],
      ["output", "resistor.a"],
      ["resistor.b", "capacitor.a"],
      ["capacitor.b", "inductor.a"],
      ["inductor.b", "return"],
    ],
  },
  "baffle-step": {
    nodes: {
      input: { x: 24, y: 26 },
      output: { x: 270, y: 26 },
    },
    components: [
      { key: "inductor", type: "inductor", value: 1.0, x: 78, y: 0 },
      { key: "bypass", type: "resistor", value: 6.8, x: 78, y: 150 },
    ],
    wires: [
      ["input", "inductor.a"],
      ["inductor.b", "output"],
      ["input", "bypass.a"],
      ["bypass.b", "output"],
    ],
  },
};

export function createCrossoverSchematicController(deps) {
  const {
    cloneProject,
    commitState,
    createCrossoverCircuitComponentId,
    createCrossoverCircuitJunctionId,
    createCrossoverCircuitWireId,
    createCrossoverModuleGroupId,
    CROSSOVER_CIRCUIT_COMPONENT_DEFAULTS,
    addCrossoverDesign = () => "",
    crossoverCircuitComponentPortId,
    crossoverCircuitDesignNodeId,
    crossoverCircuitFixedNodeId,
    crossoverSchematicBoard,
    designColorForDesign,
    getActiveCrossoverGroupId,
    getActiveDesign,
    getSelectedCrossoverDesignId = () => "",
    getState,
    isMobileLayout = () => false,
    normalizeGroupCrossover,
    parseNumericInputValue,
    roundTo,
    setSelectedCrossoverDesignId = () => {},
  } = deps;

  const GRID_SIZE = 28;
  const JUNCTION_ANCHOR_OFFSET = 4;
  const WIRE_SEGMENT_PORT_OFFSET = 7;
  const WIRE_SEGMENT_MIN_LENGTH = 14;
  const WIRE_MODE_IDLE = "idle";
  const WIRE_MODE_ARMED = "armed";
  const WIRE_MODE_WIRING = "wiring";
  let state = getState();
  let selectedNodeId = "";
  let selectedCrossoverDesignId = "";
  let wireMode = WIRE_MODE_IDLE;
  let wirePosture = WIRE_POSTURE_HORIZONTAL_FIRST;
  let drag = null;
  let endpointDrag = null;
  let speakerDrag = null;
  let boardPan = null;
  let boardPinch = null;
  let boardTouchPointers = new Map();
  let selectionDrag = null;
  let wireDraft = null;
  let selectedComponentIds = new Set();
  let selectedNodeIds = new Set();
  let selectedSpeakerIds = new Set();
  let cameraX = 0;
  let cameraY = 0;
  let cameraScale = 1;
  let lastRenderSignature = "";
  let lastSelectSignature = "";
  let lastSelectionGroupId = "";
  let hoveredWireNetworkKey = "";
  let hoveredWireIds = new Set();
  let currentWireNetworkIdsByWireId = new Map();
  let wireHoverClearTimer = 0;
  let lastWirePointer = null;
  let suppressedWireClick = null;
  let preserveNextRender = false;
  let eventsBound = false;

  bindEvents();

  function bindEvents() {
    if (eventsBound) return;
    eventsBound = true;
    window.addEventListener("cabio:crossover-schematic-action", handleCrossoverSchematicAction);
    if (crossoverSchematicBoard) {
      crossoverSchematicBoard.tabIndex = 0;
      crossoverSchematicBoard.addEventListener("keydown", handleBoardKeyDown);
    }
    crossoverSchematicBoard?.addEventListener("pointerdown", handleSchematicElementPointerDown);
    crossoverSchematicBoard?.addEventListener("click", handleSchematicElementClick);
    crossoverSchematicBoard?.addEventListener("input", handleSchematicElementInput);
    crossoverSchematicBoard?.addEventListener("wheel", handleSchematicElementWheel, { passive: false });
    crossoverSchematicBoard?.addEventListener("contextmenu", handleSchematicElementContextMenu);
    crossoverSchematicBoard?.addEventListener("pointerover", handleSchematicWirePointer);
    crossoverSchematicBoard?.addEventListener("pointermove", handleSchematicWirePointer);
    crossoverSchematicBoard?.addEventListener("pointerout", handleSchematicWirePointerOut);
    crossoverSchematicBoard?.addEventListener("pointerdown", startBoardPan);
    crossoverSchematicBoard?.addEventListener("pointerdown", handleWireCancelPointer, { capture: true });
    crossoverSchematicBoard?.addEventListener("pointermove", handleBoardPointerMove);
    crossoverSchematicBoard?.addEventListener("wheel", handleBoardWheel, { passive: false });
    crossoverSchematicBoard?.addEventListener("contextmenu", handleWireCancelContextMenu, { capture: true });
    crossoverSchematicBoard?.addEventListener("contextmenu", suppressBoardContextMenu);
    crossoverSchematicBoard?.addEventListener("auxclick", (event) => {
      if (event.button === 1) event.preventDefault();
    });
  }

  function handleCrossoverSchematicAction(event) {
    const detail = event.detail || {};
    if (detail.action === "add-resistor") {
      addComponent("resistor");
      return;
    }
    if (detail.action === "add-capacitor") {
      addComponent("capacitor");
      return;
    }
    if (detail.action === "add-inductor") {
      addComponent("inductor");
      return;
    }
    if (detail.action === "add-preset") {
      addPreset(detail.preset);
      return;
    }
    if (detail.action === "create-module-group") {
      createModuleGroupFromSelection();
      return;
    }
    if (detail.action === "select-design") {
      selectCrossoverDesignFromToolbar(detail.designId || "");
    }
  }

  function selectCrossoverDesignFromToolbar(designId) {
    if (designId === NEW_CROSSOVER_FOR_GROUP_OPTION) {
      const groupId = activeCrossoverGroup()?.id || "";
      const newDesignId = addCrossoverDesign();
      if (newDesignId) {
        selectedCrossoverDesignId = newDesignId;
        setSelectedCrossoverDesignId(groupId, selectedCrossoverDesignId);
      }
      syncSchematicToolbar();
      return;
    }
    selectedCrossoverDesignId = designId || "";
    setSelectedCrossoverDesignId(activeCrossoverGroup()?.id || "", selectedCrossoverDesignId);
    wireMode = WIRE_MODE_IDLE;
    selectedNodeId = "";
    wireDraft = null;
    clearSchematicSelection();
    lastRenderSignature = "";
    renderCrossoverSchematic();
  }

  function suppressBoardContextMenu(event) {
    event.preventDefault();
  }

  function handleSchematicElementPointerDown(event) {
    const target = event.target;
    if (!target?.closest) return;

    if (target.closest(".crossover-module-group-ungroup")) {
      event.cabioSchematicHandled = true;
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const nodeElement = target.closest("[data-node-id]");
    if (nodeElement && crossoverSchematicBoard?.contains(nodeElement)) {
      event.cabioSchematicHandled = true;
      if (event.button === 2 && nodeElement.classList.contains("crossover-schematic-junction")) {
        event.preventDefault();
        event.stopPropagation();
        deleteJunctionNode(nodeElement.dataset.nodeId);
        return;
      }
      if (event.button === 0) startWirePaint(event, nodeElement.dataset.nodeId);
      return;
    }

    const componentElement = target.closest("[data-component-id]");
    if (componentElement && crossoverSchematicBoard?.contains(componentElement)) {
      event.cabioSchematicHandled = true;
      if (event.button === 2) {
        event.preventDefault();
        event.stopPropagation();
        deleteComponent(componentElement.dataset.componentId);
        return;
      }
      if (target.closest(".crossover-component-controls, .crossover-component-delete")) return;
      startComponentDrag(event, componentElement.dataset.componentId);
      return;
    }

    const speakerElement = target.closest("[data-speaker-design-id]");
    if (speakerElement && crossoverSchematicBoard?.contains(speakerElement)) {
      event.cabioSchematicHandled = true;
      startSpeakerDrag(
        event,
        speakerElement.dataset.speakerDesignId,
        speakerElement.dataset.plusNodeId,
        speakerElement.dataset.minusNodeId,
      );
      return;
    }

    const moduleGroupElement = target.closest("[data-module-group-id]");
    if (moduleGroupElement && crossoverSchematicBoard?.contains(moduleGroupElement) && event.button === 0) {
      event.cabioSchematicHandled = true;
      event.preventDefault();
      event.stopPropagation();
      wireMode = WIRE_MODE_IDLE;
      selectedNodeId = "";
      wireDraft = null;
      updateWiringState();
      const group = activeCrossoverGroup()?.crossover?.circuit?.moduleGroups?.find((item) => item.id === moduleGroupElement.dataset.moduleGroupId);
      if (group) selectModuleGroup(group);
      return;
    }

    const wireHit = target.closest(".crossover-wire-hit[data-wire-id]");
    if (wireHit && crossoverSchematicBoard?.contains(wireHit) && event.button === 2) {
      event.cabioSchematicHandled = true;
      event.preventDefault();
      event.stopPropagation();
      deleteWire(wireHit.dataset.wireId);
    }
  }

  function handleSchematicElementClick(event) {
    const target = event.target;
    if (!target?.closest) return;
    const deleteButton = target.closest("[data-delete-component-id]");
    if (deleteButton && crossoverSchematicBoard?.contains(deleteButton)) {
      event.preventDefault();
      event.stopPropagation();
      deleteComponent(deleteButton.dataset.deleteComponentId);
      return;
    }
    const ungroupButton = target.closest(".crossover-module-group-ungroup");
    if (ungroupButton && crossoverSchematicBoard?.contains(ungroupButton)) {
      event.preventDefault();
      event.stopPropagation();
      const moduleGroupId = ungroupButton.closest("[data-module-group-id]")?.dataset.moduleGroupId;
      if (moduleGroupId) ungroupModuleGroup(moduleGroupId);
      return;
    }
    const wireHit = target.closest(".crossover-wire-hit[data-wire-id]");
    if (wireHit && crossoverSchematicBoard?.contains(wireHit)) {
      event.preventDefault();
      event.stopPropagation();
      if (shouldSuppressWireClick(wireHit.dataset.wireId)) return;
      addWireJunction(wireHit.dataset.wireId, event, { connectFromNodeId: isWireDrawingActive() ? selectedNodeId : "" });
    }
  }

  function handleSchematicElementContextMenu(event) {
    const target = event.target;
    if (!target?.closest) return;
    const junction = target.closest(".crossover-schematic-junction[data-node-id]");
    if (junction && crossoverSchematicBoard?.contains(junction)) {
      event.preventDefault();
      event.stopPropagation();
      deleteJunctionNode(junction.dataset.nodeId);
      return;
    }
    const component = target.closest("[data-component-id]");
    if (component && crossoverSchematicBoard?.contains(component)) {
      event.preventDefault();
      event.stopPropagation();
      deleteComponent(component.dataset.componentId);
      return;
    }
    const wireHit = target.closest(".crossover-wire-hit[data-wire-id]");
    if (wireHit && crossoverSchematicBoard?.contains(wireHit)) {
      event.preventDefault();
      event.stopPropagation();
      deleteWire(wireHit.dataset.wireId);
    }
  }

  function handleSchematicWirePointer(event) {
    const wireHit = event.target?.closest?.(".crossover-wire-hit[data-wire-id]");
    if (!wireHit || !crossoverSchematicBoard?.contains(wireHit)) return;
    lastWirePointer = { x: event.clientX, y: event.clientY };
    highlightWireNetwork(currentWireNetworkIdsByWireId.get(wireHit.dataset.wireId) || new Set([wireHit.dataset.wireId]));
  }

  function handleSchematicWirePointerOut(event) {
    const wireHit = event.target?.closest?.(".crossover-wire-hit[data-wire-id]");
    if (!wireHit || !crossoverSchematicBoard?.contains(wireHit)) return;
    lastWirePointer = { x: event.clientX, y: event.clientY };
    scheduleWireNetworkHighlightClear();
  }

  function handleSchematicElementInput(event) {
    const control = event.target?.closest?.("[data-component-value]");
    if (!control || !crossoverSchematicBoard?.contains(control)) return;
    const value = control.type === "number" ? parseNumericInputValue(control) : Number(control.value);
    if (!Number.isFinite(value)) return;
    applySchematicComponentValue(control.dataset.componentValue, value, control);
  }

  function handleSchematicElementWheel(event) {
    const control = event.target?.closest?.("input[type='range'][data-component-value]");
    if (!control || !crossoverSchematicBoard?.contains(control)) return;
    const component = activeCrossoverGroup()?.crossover?.circuit?.components?.find((item) => item.id === control.dataset.componentValue);
    const defaults = component ? CROSSOVER_CIRCUIT_COMPONENT_DEFAULTS[component.type] : null;
    if (!defaults) return;
    event.preventDefault();
    event.stopPropagation();
    const step = Number(defaults.step) || 1;
    const multiplier = event.shiftKey ? 10 : 1;
    const direction = event.deltaY < 0 ? 1 : -1;
    applySchematicComponentValue(component.id, Number(control.value) + direction * step * multiplier, control);
  }

  function applySchematicComponentValue(componentId, value, sourceControl) {
    const component = activeCrossoverGroup()?.crossover?.circuit?.components?.find((item) => item.id === componentId);
    if (!component) return;
    const defaults = CROSSOVER_CIRCUIT_COMPONENT_DEFAULTS[component.type] || CROSSOVER_CIRCUIT_COMPONENT_DEFAULTS.resistor;
    const clamped = clampComponentValue(value, defaults);
    const componentElement = sourceControl?.closest?.("[data-component-id]");
    componentElement?.querySelectorAll(`[data-component-value="${cssEscape(componentId)}"]`).forEach((control) => {
      control.value = control.type === "number"
        ? String(roundTo(clamped, defaults.step < 0.1 ? 3 : 2))
        : String(clamped);
    });
    updateComponent(componentId, { value: clamped }, { replaceHistory: true, renderControls: false });
  }

  function handleWireCancelPointer(event) {
    if (event.button !== 2 || !isWireDrawingActive()) return;
    event.preventDefault();
    event.stopPropagation();
    cancelWireDrawing();
  }

  function handleWireCancelContextMenu(event) {
    if (!isWireDrawingActive()) return;
    event.preventDefault();
    event.stopPropagation();
    cancelWireDrawing();
  }

  function isWireDrawingActive() {
    return wireMode !== WIRE_MODE_IDLE || Boolean(selectedNodeId || wireDraft);
  }

  function cancelWireDrawing() {
    wireMode = WIRE_MODE_IDLE;
    selectedNodeId = "";
    wireDraft = null;
    clearWireTargetHighlight();
    document.removeEventListener("pointermove", handleWirePaint);
    document.removeEventListener("pointerup", finishWirePaint);
    document.removeEventListener("pointercancel", finishWirePaint);
    updateWiringState();
    drawCurrentWires(activeCrossoverGroup()?.crossover?.circuit?.wires || []);
  }

  function renderCrossoverSchematic() {
    state = getState();
    if (!crossoverSchematicBoard) return;
    const group = activeCrossoverGroup();
    const members = crossoverGroupMembers(group);
    if (!group) return;

    const selectedCrossoverDesign = syncCrossoverFilterSelect(group);
    const hasSelectedCrossover = Boolean(selectedCrossoverDesign);
    setSchematicToolsEnabled(hasSelectedCrossover);
    crossoverSchematicBoard.classList.toggle("is-empty", !hasSelectedCrossover);
    if (!hasSelectedCrossover) {
      wireMode = WIRE_MODE_IDLE;
      selectedNodeId = "";
      wireDraft = null;
      updateWiringState();
      const emptyRenderSignature = `empty:${group.id}:${(group.crossover?.designs || []).map((design) => design.id).join(",")}`;
      if (emptyRenderSignature !== lastRenderSignature) syncSchematicBoard({ empty: true });
      lastRenderSignature = emptyRenderSignature;
      applyBoardBackground();
      return;
    }

    const circuit = group.crossover?.circuit || { components: [], wires: [] };
    const renderSignature = schematicRenderSignature(group, members, circuit, selectedCrossoverDesign);
    if (preserveNextRender) {
      preserveNextRender = false;
      lastRenderSignature = renderSignature;
      applyCamera(crossoverSchematicBoard.querySelector(".crossover-schematic-canvas"));
      applyBoardBackground();
      drawCurrentWires(circuit.wires);
      return;
    }
    if (renderSignature === lastRenderSignature && crossoverSchematicBoard.querySelector(".crossover-schematic-canvas")) {
      applyCamera(crossoverSchematicBoard.querySelector(".crossover-schematic-canvas"));
      applyBoardBackground();
      drawCurrentWires(circuit.wires);
      return;
    }
    lastRenderSignature = renderSignature;

    const height = Math.max(360, 150 + Math.max(members.length * 2, circuit.components.length, 2) * 92);
    const width = Math.max(920, 520 + circuit.components.length * 36);
    crossoverSchematicBoard.style.setProperty("--schematic-width", `${width}px`);
    crossoverSchematicBoard.style.setProperty("--schematic-height", `${height}px`);
    syncSchematicBoard(createSchematicBoardSnapshot({ circuit, members, width, height }));
    window.requestAnimationFrame(() => {
      const canvas = crossoverSchematicBoard?.querySelector(".crossover-schematic-canvas");
      const svg = crossoverSchematicBoard?.querySelector(".crossover-schematic-wires");
      applyCamera(canvas);
      if (materializeWireCornersFromDom(circuit.wires)) return;
      if (canvas) renderModuleGroupBoxes(canvas, circuit);
      applyBoardBackground();
      if (svg) drawWires(svg, circuit.wires);
    });
  }

  function syncSchematicBoard(detail = {}) {
    window.dispatchEvent(new CustomEvent("cabio:crossover-schematic-board-sync", {
      detail: {
        empty: true,
        camera: { x: cameraX, y: cameraY, scale: cameraScale },
        endpoints: [],
        speakers: [],
        components: [],
        junctions: [],
        ...detail,
      },
    }));
  }

  function createSchematicBoardSnapshot({ circuit, members, width, height }) {
    const endpoints = [
      schematicEndpointSnapshot({
        id: crossoverCircuitFixedNodeId("positive"),
        label: "Vin",
        symbol: "voltage",
        ...endpointPosition(circuit, crossoverCircuitFixedNodeId("positive"), 42, 62),
        accent: "var(--accent)",
      }),
      schematicEndpointSnapshot({
        id: crossoverCircuitFixedNodeId("ground"),
        label: "GND",
        symbol: "ground",
        ...endpointPosition(circuit, crossoverCircuitFixedNodeId("ground"), 42, height - 88),
        accent: "var(--muted)",
      }),
    ];
    const speakers = members.map((design, index) => {
      const y = 86 + index * 118;
      const plusId = crossoverCircuitDesignNodeId(design.id, "positive");
      const minusId = crossoverCircuitDesignNodeId(design.id, "negative");
      const legacyPosition = endpointPosition(circuit, `design:${design.id}`, width - 176, y);
      const speakerPosition = endpointPosition(circuit, plusId, legacyPosition.x, legacyPosition.y);
      return {
        designId: design.id,
        name: design.name,
        plusId,
        minusId,
        x: speakerPosition.x,
        y: speakerPosition.y,
        accent: designColorForDesign(design),
        selected: selectedSpeakerIds.has(design.id) || selectedNodeId === plusId || selectedNodeId === minusId,
        plusSelected: selectedNodeId === plusId || selectedNodeIds.has(plusId),
        minusSelected: selectedNodeId === minusId || selectedNodeIds.has(minusId),
      };
    });
    return {
      empty: false,
      camera: { x: cameraX, y: cameraY, scale: cameraScale },
      endpoints,
      speakers,
      components: (circuit.components || []).map(schematicComponentSnapshot),
      junctions: (circuit.nodes || [])
        .filter((node) => isJunctionNodeId(node.id))
        .map((node) => ({
          id: node.id,
          x: node.x,
          y: node.y,
          selected: selectedNodeId === node.id || selectedNodeIds.has(node.id),
        })),
    };
  }

  function schematicEndpointSnapshot(endpoint) {
    return {
      ...endpoint,
      selected: selectedNodeId === endpoint.id || selectedNodeIds.has(endpoint.id),
    };
  }

  function schematicComponentSnapshot(component) {
    const portAId = crossoverCircuitComponentPortId(component.id, "a");
    const portBId = crossoverCircuitComponentPortId(component.id, "b");
    if (component.type === "wire-segment") {
      return {
        id: component.id,
        type: "wire-segment",
        x: component.x,
        y: component.y,
        length: Math.max(Number(component.value) || 0, WIRE_SEGMENT_MIN_LENGTH),
        orientation: component.orientation === "vertical" ? "vertical" : "horizontal",
        selected: selectedComponentIds.has(component.id),
        portAId,
        portBId,
        portASelected: selectedNodeId === portAId || selectedNodeIds.has(portAId),
        portBSelected: selectedNodeId === portBId || selectedNodeIds.has(portBId),
      };
    }
    const defaults = CROSSOVER_CIRCUIT_COMPONENT_DEFAULTS[component.type] || CROSSOVER_CIRCUIT_COMPONENT_DEFAULTS.resistor;
    return {
      id: component.id,
      type: component.type,
      typeLabel: componentTypeLabel(component.type),
      x: component.x,
      y: component.y,
      value: component.value,
      numberValue: roundTo(component.value, defaults.step < 0.1 ? 3 : 2),
      valueLabel: formatComponentValue(component, defaults),
      min: defaults.min,
      max: defaults.max,
      step: defaults.step,
      unit: defaults.unit,
      selected: selectedComponentIds.has(component.id),
      portAId,
      portBId,
      portASelected: selectedNodeId === portAId || selectedNodeIds.has(portAId),
      portBSelected: selectedNodeId === portBId || selectedNodeIds.has(portBId),
    };
  }

  function syncCrossoverFilterSelect(group) {
    const designs = group.crossover?.designs || [];
    if (group.id !== lastSelectionGroupId) {
      selectedCrossoverDesignId = getSelectedCrossoverDesignId(group.id);
      wireMode = WIRE_MODE_IDLE;
      selectedNodeId = "";
      wireDraft = null;
      clearSchematicSelection();
      lastSelectionGroupId = group.id;
    }
    if (!designs.some((design) => design.id === selectedCrossoverDesignId)) {
      if (selectedCrossoverDesignId) setSelectedCrossoverDesignId(group.id, "");
      selectedCrossoverDesignId = "";
    }
    const nextSelectSignature = [
      "placeholder:Select crossover",
      ...designs.map((design, index) => `${design.id}:${crossoverFilterOptionLabel(design, index)}`),
      `action:${NEW_CROSSOVER_FOR_GROUP_OPTION}`,
    ].join("|");
    if (nextSelectSignature !== lastSelectSignature) {
      lastSelectSignature = nextSelectSignature;
    }
    syncSchematicToolbar({
      options: [
        { value: "", label: "Select crossover" },
        ...designs.map((design, index) => ({
          value: design.id,
          label: crossoverFilterOptionLabel(design, index),
        })),
        { value: NEW_CROSSOVER_FOR_GROUP_OPTION, label: "New Crossover for this Group" },
      ],
      selectedId: selectedCrossoverDesignId,
    });
    return designs.find((design) => design.id === selectedCrossoverDesignId) || null;
  }

  function crossoverFilterOptionLabel(design, index) {
    const stateLabel = design.enabled === false ? " off" : "";
    return `${index + 1}. Crossover design${stateLabel}`;
  }

  function syncSchematicToolbar(detail = {}) {
    window.dispatchEvent(new CustomEvent("cabio:crossover-schematic-toolbar-sync", {
      detail: {
        selectedId: selectedCrossoverDesignId,
        toolsEnabled: Boolean(selectedCrossoverDesignId),
        moduleGroupEnabled: Boolean(selectedCrossoverDesignId) && selectedSchematicObjectCount() >= 2,
        ...detail,
      },
    }));
  }

  function setSchematicToolsEnabled(enabled) {
    syncSchematicToolbar({
      toolsEnabled: Boolean(enabled),
      moduleGroupEnabled: Boolean(enabled) && selectedSchematicObjectCount() >= 2,
    });
  }

  function schematicRenderSignature(group, members, circuit, selectedCrossoverDesign) {
    return JSON.stringify({
      groupId: group?.id || "",
      selectedCrossoverDesignId: selectedCrossoverDesign?.id || "",
      selectedNodeId,
      selectedComponentIds: [...selectedComponentIds].sort(),
      selectedNodeIds: [...selectedNodeIds].sort(),
      selectedSpeakerIds: [...selectedSpeakerIds].sort(),
      members: members.map((design) => ({
        id: design.id,
        name: design.name,
        color: design.color || "",
      })),
      circuit,
    });
  }

  function endpointPosition(circuit, id, fallbackX, fallbackY) {
    const node = circuit.nodes?.find((item) => item.id === id);
    return {
      x: Number.isFinite(node?.x) ? node.x : fallbackX,
      y: Number.isFinite(node?.y) ? node.y : fallbackY,
    };
  }

  function componentTypeLabel(type) {
    if (type === "capacitor") return "Capacitor";
    if (type === "inductor") return "Inductor";
    return "Resistor";
  }

  function formatComponentValue(component, defaults) {
    const step = Number(defaults.step);
    const decimals = step < 0.1 ? 2 : step < 1 ? 1 : 0;
    return `${roundTo(component.value, decimals)} ${defaults.unit}`;
  }

  function clampComponentValue(value, defaults) {
    const min = Number(defaults.min);
    const max = Number(defaults.max);
    const step = Number(defaults.step) || 1;
    const clamped = Math.min(Math.max(Number(value) || min, min), max);
    const stepped = Math.round((clamped - min) / step) * step + min;
    return Math.min(Math.max(roundTo(stepped, step < 0.1 ? 3 : 2), min), max);
  }

  function handleNodeClick(nodeId) {
    if (!selectedNodeId) {
      startWireFromNode(nodeId);
      return;
    }
    if (selectedNodeId === nodeId) {
      cancelWireDrawing();
      return;
    }
    const fromNodeId = selectedNodeId;
    completeWireToNode(fromNodeId, nodeId);
  }

  function drawWires(svg, wires) {
    if (!svg || !crossoverSchematicBoard) return;
    const boardRect = svg.closest(".crossover-schematic-canvas")?.getBoundingClientRect();
    if (!boardRect) return;
    const connectedWireIdsByWireId = wireNetworkIdsByWireId(wires);
    currentWireNetworkIdsByWireId = connectedWireIdsByWireId;
    preserveExistingWireHover(wires);
    const wireViews = wires.map((wire) => {
      const from = crossoverSchematicBoard.querySelector(`[data-node-id="${cssEscape(wire.from)}"]`);
      const to = crossoverSchematicBoard.querySelector(`[data-node-id="${cssEscape(wire.to)}"]`);
      if (!from || !to) return null;
      const fromRect = from.getBoundingClientRect();
      const toRect = to.getBoundingClientRect();
      const fromPoint = wireAnchorPoint(from, fromRect, boardRect);
      const toPoint = wireAnchorPoint(to, toRect, boardRect);
      const x1 = fromPoint.x;
      const y1 = fromPoint.y;
      const x2 = toPoint.x;
      const y2 = toPoint.y;
      const pathD = wireSegmentD(x1, y1, x2, y2);
      return { id: wire.id, pathD, hovered: hoveredWireIds.has(wire.id) };
    }).filter(Boolean);
    window.dispatchEvent(new CustomEvent("cabio:crossover-schematic-wires-sync", {
      detail: {
        wires: wireViews,
        wirePreviewD: wireDraftPathD(boardRect),
      },
    }));
  }

  function preserveExistingWireHover(wires) {
    if (!hoveredWireIds.size) return;
    const renderedWireIds = new Set(wires.map((wire) => wire.id));
    hoveredWireIds = new Set([...hoveredWireIds].filter((wireId) => renderedWireIds.has(wireId)));
    hoveredWireNetworkKey = [...hoveredWireIds].sort().join("|");
  }

  function wireNetworkIdsByWireId(wires) {
    const nodeToWireIds = new Map();
    wires.forEach((wire) => {
      [wire.from, wire.to].forEach((nodeId) => {
        if (!isWireNetworkPassThroughNode(nodeId)) return;
        const wireIds = nodeToWireIds.get(nodeId) || [];
        wireIds.push(wire.id);
        nodeToWireIds.set(nodeId, wireIds);
      });
    });

    const neighborsByWireId = new Map(wires.map((wire) => [wire.id, new Set()]));
    nodeToWireIds.forEach((wireIds) => {
      wireIds.forEach((wireId) => {
        const neighbors = neighborsByWireId.get(wireId);
        wireIds.forEach((candidateId) => {
          if (candidateId !== wireId) neighbors?.add(candidateId);
        });
      });
    });

    const networkByWireId = new Map();
    wires.forEach((wire) => {
      if (networkByWireId.has(wire.id)) return;
      const network = new Set();
      const stack = [wire.id];
      while (stack.length) {
        const wireId = stack.pop();
        if (!wireId || network.has(wireId)) continue;
        network.add(wireId);
        (neighborsByWireId.get(wireId) || []).forEach((neighborId) => {
          if (!network.has(neighborId)) stack.push(neighborId);
        });
      }
      network.forEach((wireId) => networkByWireId.set(wireId, network));
    });
    return networkByWireId;
  }

  function isWireNetworkPassThroughNode(nodeId) {
    const value = String(nodeId || "");
    return value.startsWith("junction:") || value.startsWith("fixed:") || value.startsWith("design:");
  }

  function highlightWireNetwork(wireIds) {
    if (wireHoverClearTimer) {
      window.clearTimeout(wireHoverClearTimer);
      wireHoverClearTimer = 0;
    }
    const nextWireIds = new Set(wireIds);
    const networkKey = [...nextWireIds].sort().join("|");
    if (networkKey && networkKey === hoveredWireNetworkKey) return;
    hoveredWireNetworkKey = networkKey;
    hoveredWireIds = nextWireIds;
    crossoverSchematicBoard?.querySelectorAll(".crossover-wire").forEach((wireElement) => {
      const hovered = nextWireIds.has(wireElement.dataset.wireId);
      wireElement.classList.toggle("network-hovered", hovered);
      wireElement.classList.toggle("hovered", hovered);
    });
  }

  function clearWireNetworkHighlight() {
    if (wireHoverClearTimer) {
      window.clearTimeout(wireHoverClearTimer);
      wireHoverClearTimer = 0;
    }
    if (!hoveredWireNetworkKey) return;
    hoveredWireNetworkKey = "";
    hoveredWireIds = new Set();
    crossoverSchematicBoard?.querySelectorAll(".crossover-wire.network-hovered, .crossover-wire.hovered").forEach((wireElement) => {
      wireElement.classList.remove("network-hovered", "hovered");
    });
  }

  function scheduleWireNetworkHighlightClear() {
    if (wireHoverClearTimer) window.clearTimeout(wireHoverClearTimer);
    wireHoverClearTimer = window.setTimeout(() => {
      wireHoverClearTimer = 0;
      const wireId = wireIdFromViewportPoint(lastWirePointer);
      if (wireId) {
        highlightWireNetwork(currentWireNetworkIdsByWireId.get(wireId) || new Set([wireId]));
        return;
      }
      clearWireNetworkHighlight();
    }, 90);
  }

  function wireIdFromViewportPoint(point) {
    if (!point) return "";
    const element = document.elementFromPoint(point.x, point.y);
    return wireIdFromEventTarget(element);
  }

  function wireDraftPathD(boardRect) {
    if (!wireDraft?.point || !wireDraft.fromNodeId) return "";
    const from = crossoverSchematicBoard.querySelector(`[data-node-id="${cssEscape(wireDraft.fromNodeId)}"]`);
    if (!from) return "";
    const fromPoint = wireAnchorPoint(from, from.getBoundingClientRect(), boardRect);
    const route = orthogonalWireRoutePoints(fromPoint, wireDraft.point, wireDraft.posture || wirePosture);
    return wirePathD(route);
  }

  function wireSegmentD(x1, y1, x2, y2) {
    return wirePathD([{ x: x1, y: y1 }, { x: x2, y: y2 }]);
  }

  function constrainedWirePoint(fromPoint, toPoint) {
    if (Math.abs(fromPoint.x - toPoint.x) >= Math.abs(fromPoint.y - toPoint.y)) {
      return { x: toPoint.x, y: fromPoint.y };
    }
    return { x: fromPoint.x, y: toPoint.y };
  }

  function wireAnchorPoint(element, elementRect, boardRect) {
    if (element.classList.contains("crossover-schematic-endpoint")) {
      return {
        x: (elementRect.left - boardRect.left) / cameraScale + (elementRect.width / cameraScale) - 16,
        y: (elementRect.top - boardRect.top) / cameraScale + (elementRect.height / cameraScale) / 2,
      };
    }
    return {
      x: (elementRect.left - boardRect.left) / cameraScale + (elementRect.width / cameraScale) / 2,
      y: (elementRect.top - boardRect.top) / cameraScale + (elementRect.height / cameraScale) / 2,
    };
  }

  function drawCurrentWires(wires) {
    const svg = crossoverSchematicBoard?.querySelector(".crossover-schematic-wires");
    if (svg) drawWires(svg, wires);
  }

  function materializeWireCornersFromDom(wires = []) {
    if (!wires.length || !crossoverSchematicBoard) return false;
    const canvas = crossoverSchematicBoard.querySelector(".crossover-schematic-canvas");
    const boardRect = canvas?.getBoundingClientRect();
    if (!boardRect) return false;

    const routedWires = [];
    const newNodes = [];
    const junctionIdsByPoint = existingJunctionIdsByAnchorPoint(boardRect);
    let changed = false;

    wires.forEach((wire) => {
      const from = crossoverSchematicBoard.querySelector(`[data-node-id="${cssEscape(wire.from)}"]`);
      const to = crossoverSchematicBoard.querySelector(`[data-node-id="${cssEscape(wire.to)}"]`);
      if (!from || !to) {
        routedWires.push(wire);
        return;
      }

      const points = orthogonalWirePoints(
        wireAnchorPoint(from, from.getBoundingClientRect(), boardRect),
        wireAnchorPoint(to, to.getBoundingClientRect(), boardRect),
      );
      if (points.length <= 2) {
        routedWires.push(wire);
        return;
      }

      changed = true;
      const nodeIds = [wire.from];
      points.slice(1, -1).forEach((point) => {
        const key = pointKey(point);
        let junctionId = junctionIdsByPoint.get(key);
        if (!junctionId) {
          junctionId = `junction:${createCrossoverCircuitJunctionId()}`;
          junctionIdsByPoint.set(key, junctionId);
          newNodes.push({ id: junctionId, ...junctionNodePosition(point) });
        }
        nodeIds.push(junctionId);
      });
      nodeIds.push(wire.to);

      for (let index = 1; index < nodeIds.length; index += 1) {
        routedWires.push({
          id: index === 1 ? wire.id : createCrossoverCircuitWireId(),
          from: nodeIds[index - 1],
          to: nodeIds[index],
        });
      }
    });

    if (!changed) return false;
    const group = activeCrossoverGroup();
    if (!group) return false;
    const nextState = cloneProject(state);
    const nextGroup = mutableCrossoverGroup(nextState, group);
    if (!nextGroup) return false;
    nextGroup.crossover = normalizeGroupCrossover(nextGroup.crossover);
    nextGroup.crossover.circuit.nodes.push(...newNodes);
    nextGroup.crossover.circuit.wires = dedupeWires(routedWires, nextGroup.crossover.circuit);
    preserveNextRender = false;
    lastRenderSignature = "";
    commitState(nextState, { renderControls: false });
    return true;
  }

  function existingJunctionIdsByAnchorPoint(boardRect) {
    const idsByPoint = new Map();
    crossoverSchematicBoard?.querySelectorAll(".crossover-schematic-junction").forEach((junction) => {
      const point = wireAnchorPoint(junction, junction.getBoundingClientRect(), boardRect);
      idsByPoint.set(pointKey(point), junction.dataset.nodeId);
    });
    return idsByPoint;
  }

  function orthogonalWirePoints(fromPoint, toPoint) {
    if (!fromPoint || !toPoint) return [];
    if (Math.abs(fromPoint.x - toPoint.x) < 1 || Math.abs(fromPoint.y - toPoint.y) < 1) return [fromPoint, toPoint];
    const midX = (fromPoint.x + toPoint.x) / 2;
    return [
      fromPoint,
      { x: midX, y: fromPoint.y },
      { x: midX, y: toPoint.y },
      toPoint,
    ];
  }

  function junctionNodePosition(point) {
    return {
      x: point.x - JUNCTION_ANCHOR_OFFSET,
      y: point.y - JUNCTION_ANCHOR_OFFSET,
    };
  }

  function pointKey(point) {
    return `${Math.round(point.x)}:${Math.round(point.y)}`;
  }

  function dedupeWires(wires, circuit = null, options = {}) {
    const seen = new Set();
    const directionsByNodeId = new Map();
    return wires.filter((wire) => {
      if (!wire.from || !wire.to || wire.from === wire.to) return false;
      const key = [wire.from, wire.to].sort().join("|");
      if (seen.has(key)) return false;
      const fromDirection = circuit ? wireDirectionBetween(circuit, wire.from, wire.to, options) : "";
      const toDirection = circuit ? wireDirectionBetween(circuit, wire.to, wire.from, options) : "";
      if (!reserveWireDirection(directionsByNodeId, wire.from, fromDirection)) return false;
      if (!reserveWireDirection(directionsByNodeId, wire.to, toDirection)) {
        releaseWireDirection(directionsByNodeId, wire.from, fromDirection);
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  function reserveWireDirection(directionsByNodeId, nodeId, direction) {
    if (!direction) return true;
    const directions = directionsByNodeId.get(nodeId) || new Set();
    if (directions.has(direction)) return false;
    directions.add(direction);
    directionsByNodeId.set(nodeId, directions);
    return true;
  }

  function releaseWireDirection(directionsByNodeId, nodeId, direction) {
    if (!direction) return;
    const directions = directionsByNodeId.get(nodeId);
    if (!directions) return;
    directions.delete(direction);
  }

  function renderModuleGroupBoxes(canvas, circuit) {
    const groups = Array.isArray(circuit?.moduleGroups) ? circuit.moduleGroups : [];
    const moduleGroups = groups
      .map((group, index) => {
        const bounds = moduleGroupBounds(canvas, group);
        if (!bounds) return null;
        return {
          id: group.id,
          index: index + 1,
          selected: isModuleGroupSelected(group),
          ...bounds,
        };
      })
      .filter(Boolean);
    window.dispatchEvent(new CustomEvent("cabio:crossover-schematic-module-groups-sync", {
      detail: { moduleGroups },
    }));
  }

  function refreshModuleGroupBoxes() {
    const canvas = crossoverSchematicBoard?.querySelector(".crossover-schematic-canvas");
    if (!canvas) return;
    renderModuleGroupBoxes(canvas, activeCrossoverGroup()?.crossover?.circuit || {});
  }

  function moduleGroupBounds(canvas, group) {
    const elements = moduleGroupElements(canvas, group);
    if (elements.length < 2) return null;
    const boxes = elements.map(canvasElementBox).filter(Boolean);
    if (boxes.length < 2) return null;
    const padding = 18;
    const left = Math.min(...boxes.map((box) => box.left)) - padding;
    const top = Math.min(...boxes.map((box) => box.top)) - padding;
    const right = Math.max(...boxes.map((box) => box.right)) + padding;
    const bottom = Math.max(...boxes.map((box) => box.bottom)) + padding;
    return {
      left,
      top,
      width: right - left,
      height: bottom - top,
    };
  }

  function moduleGroupElements(canvas, group) {
    const elements = [];
    (group.componentIds || []).forEach((id) => {
      const element = canvas.querySelector(`[data-component-id="${cssEscape(id)}"]`);
      if (element) elements.push(element);
    });
    (group.nodeIds || []).forEach((id) => {
      const element = canvas.querySelector(`[data-node-id="${cssEscape(id)}"]`);
      if (element) elements.push(element);
    });
    (group.speakerIds || []).forEach((id) => {
      const element = canvas.querySelector(`[data-speaker-design-id="${cssEscape(id)}"]`);
      if (element) elements.push(element);
    });
    return elements;
  }

  function canvasElementBox(element) {
    const x = Number(String(element.style.left || "").replace("px", "")) || 0;
    const y = Number(String(element.style.top || "").replace("px", "")) || 0;
    const width = element.offsetWidth || 1;
    const height = element.offsetHeight || 1;
    return {
      left: x,
      top: y,
      right: x + width,
      bottom: y + height,
    };
  }

  function startWireFromNode(nodeId, point = null) {
    wireMode = WIRE_MODE_WIRING;
    selectedNodeId = nodeId;
    wireDraft = {
      fromNodeId: nodeId,
      point: point || nodeAnchorCanvasPoint(nodeId),
      activePress: false,
      posture: wirePosture,
    };
    updateWiringState();
    renderCrossoverSchematic();
  }

  function nodeAnchorCanvasPoint(nodeId) {
    const canvas = crossoverSchematicBoard?.querySelector(".crossover-schematic-canvas");
    const element = crossoverSchematicBoard?.querySelector(`[data-node-id="${cssEscape(nodeId)}"]`);
    const boardRect = canvas?.getBoundingClientRect();
    if (!element || !boardRect) return null;
    return wireAnchorPoint(element, element.getBoundingClientRect(), boardRect);
  }

  function addComponent(type) {
    const group = activeCrossoverGroup();
    if (!group || !selectedCrossoverDesignId) return;
    const defaults = CROSSOVER_CIRCUIT_COMPONENT_DEFAULTS[type] || CROSSOVER_CIRCUIT_COMPONENT_DEFAULTS.resistor;
    const nextState = cloneProject(state);
    const nextGroup = mutableCrossoverGroup(nextState, group);
    if (!nextGroup) return;
    nextGroup.crossover = normalizeGroupCrossover(nextGroup.crossover);
    const count = nextGroup.crossover.circuit.components.length;
    nextGroup.crossover.circuit.components.push({
      id: createCrossoverCircuitComponentId(),
      type,
      value: defaults.value,
      x: 230 + (count % 4) * 138,
      y: 88 + Math.floor(count / 4) * 118,
    });
    commitState(nextState, { renderControls: false });
  }

  function addPreset(presetId) {
    const group = activeCrossoverGroup();
    const preset = CROSSOVER_SCHEMATIC_PRESETS[presetId];
    if (!group || !selectedCrossoverDesignId || !preset) return;
    const nextState = cloneProject(state);
    const nextGroup = mutableCrossoverGroup(nextState, group);
    if (!nextGroup) return;
    nextGroup.crossover = normalizeGroupCrossover(nextGroup.crossover);
    const circuit = nextGroup.crossover.circuit;
    const origin = schematicInsertionOrigin(circuit);
    const nodes = {};
    Object.entries(preset.nodes).forEach(([key, point]) => {
      const id = `junction:${createCrossoverCircuitJunctionId()}`;
      nodes[key] = id;
      circuit.nodes.push({
        id,
        x: origin.x + point.x - JUNCTION_ANCHOR_OFFSET,
        y: origin.y + point.y - JUNCTION_ANCHOR_OFFSET,
      });
    });
    const components = {};
    preset.components.forEach((componentSpec) => {
      const defaults = CROSSOVER_CIRCUIT_COMPONENT_DEFAULTS[componentSpec.type] || CROSSOVER_CIRCUIT_COMPONENT_DEFAULTS.resistor;
      const id = createCrossoverCircuitComponentId();
      components[componentSpec.key] = id;
      circuit.components.push({
        id,
        type: componentSpec.type,
        value: componentSpec.value ?? defaults.value,
        x: origin.x + componentSpec.x,
        y: origin.y + componentSpec.y,
      });
    });
    preset.wires.forEach(([from, to]) => {
      const fromNode = presetNodeId(from, nodes, components);
      const toNode = presetNodeId(to, nodes, components);
      if (!fromNode || !toNode) return;
      appendUniqueWire(circuit, fromNode, toNode);
    });
    selectedNodeId = "";
    wireDraft = null;
    updateWiringState();
    commitState(nextState, { renderControls: false });
  }

  function createModuleGroupFromSelection() {
    if (selectedSchematicObjectCount() < 2) return;
    const group = activeCrossoverGroup();
    if (!group || !selectedCrossoverDesignId) return;
    const nextState = cloneProject(state);
    const nextGroup = mutableCrossoverGroup(nextState, group);
    if (!nextGroup) return;
    nextGroup.crossover = normalizeGroupCrossover(nextGroup.crossover);
    const circuit = nextGroup.crossover.circuit;
    const selectedGroup = {
      id: createCrossoverModuleGroupId(),
      componentIds: [...selectedComponentIds],
      nodeIds: [...selectedNodeIds],
      speakerIds: [...selectedSpeakerIds],
    };
    circuit.moduleGroups = [
      ...removeModuleGroupMembers(circuit.moduleGroups || [], selectedGroup),
      selectedGroup,
    ];
    nextGroup.crossover = normalizeGroupCrossover(nextGroup.crossover);
    commitState(nextState, { renderControls: false });
  }

  function removeModuleGroupMembers(moduleGroups, selection) {
    const componentIds = new Set(selection.componentIds || []);
    const nodeIds = new Set(selection.nodeIds || []);
    const speakerIds = new Set(selection.speakerIds || []);
    return moduleGroups
      .map((group) => ({
        ...group,
        componentIds: (group.componentIds || []).filter((id) => !componentIds.has(id)),
        nodeIds: (group.nodeIds || []).filter((id) => !nodeIds.has(id)),
        speakerIds: (group.speakerIds || []).filter((id) => !speakerIds.has(id)),
      }))
      .filter((group) => (group.componentIds.length + group.nodeIds.length + group.speakerIds.length) >= 2);
  }

  function ungroupModuleGroup(moduleGroupId) {
    if (!moduleGroupId) return;
    const group = activeCrossoverGroup();
    if (!group) return;
    const nextState = cloneProject(state);
    const nextGroup = mutableCrossoverGroup(nextState, group);
    if (!nextGroup) return;
    nextGroup.crossover = normalizeGroupCrossover(nextGroup.crossover);
    const circuit = nextGroup.crossover.circuit;
    const currentGroup = (circuit.moduleGroups || []).find((item) => item.id === moduleGroupId);
    if (!currentGroup) return;
    circuit.moduleGroups = (circuit.moduleGroups || []).filter((item) => item.id !== moduleGroupId);
    wireMode = WIRE_MODE_IDLE;
    selectedNodeId = "";
    selectedComponentIds = new Set(currentGroup.componentIds || []);
    selectedNodeIds = new Set(currentGroup.nodeIds || []);
    selectedSpeakerIds = new Set(currentGroup.speakerIds || []);
    wireDraft = null;
    updateWiringState();
    commitState(nextState, { renderControls: false });
  }

  function presetNodeId(token, nodes, components) {
    if (nodes[token]) return nodes[token];
    const [componentKey, port] = String(token).split(".");
    const componentId = components[componentKey];
    if (!componentId || !port) return "";
    return crossoverCircuitComponentPortId(componentId, port);
  }

  function schematicInsertionOrigin(circuit = null) {
    const components = circuit?.components || [];
    if (components.length) {
      const maxX = Math.max(...components.map((component) => Number(component.x) || 0));
      const minY = Math.min(...components.map((component) => Number(component.y) || 0));
      return {
        x: maxX + 220,
        y: Math.max(70, minY),
      };
    }
    const boardRect = crossoverSchematicBoard?.getBoundingClientRect();
    if (!boardRect) {
      return { x: 230, y: 88 };
    }
    return {
      x: Math.max(80, (boardRect.width / 2 - cameraX) / cameraScale - 180),
      y: Math.max(70, (boardRect.height / 2 - cameraY) / cameraScale - 80),
    };
  }

  function addWire(from, to) {
    const group = activeCrossoverGroup();
    if (!group) return;
    const nextState = cloneProject(state);
    const nextGroup = mutableCrossoverGroup(nextState, group);
    if (!nextGroup) return;
    nextGroup.crossover = normalizeGroupCrossover(nextGroup.crossover);
    appendUniqueWire(nextGroup.crossover.circuit, from, to);
    commitState(nextState, { renderControls: false });
  }

  function completeWireToNode(from, to) {
    if (!from || !to || from === to) {
      cancelWireDrawing();
      return;
    }
    const group = activeCrossoverGroup();
    if (!group) return;
    const nextState = cloneProject(state);
    const nextGroup = mutableCrossoverGroup(nextState, group);
    if (!nextGroup) return;
    nextGroup.crossover = normalizeGroupCrossover(nextGroup.crossover);
    const circuit = nextGroup.crossover.circuit;
    if (!appendWireRoute(circuit, from, to)) return;
    wireMode = WIRE_MODE_IDLE;
    selectedNodeId = "";
    wireDraft = null;
    clearWireTargetHighlight();
    updateWiringState();
    commitState(nextState, { renderControls: false });
  }

  function normalizeCrossoverJunctions(circuit) {
    if (!circuit) return false;
    let changed = false;
    for (let pass = 0; pass < 8; pass += 1) {
      let passChanged = false;
      passChanged = mergeOverlappingJunctionNodes(circuit) || passChanged;
      passChanged = collapseStraightThroughJunctionNodes(circuit) || passChanged;
      passChanged = materializeCircuitWireCorners(circuit) || passChanged;
      circuit.wires = dedupeWires(circuit.wires, circuit, { useDom: false });
      if (!passChanged) break;
      changed = true;
    }
    return changed;
  }

  function mergeOverlappingJunctionNodes(circuit) {
    const junctionIdByPoint = new Map();
    const replacementByNodeId = new Map();
    circuit.nodes
      .filter((node) => isJunctionNodeId(node.id))
      .forEach((node) => {
        const point = circuitNodeAnchorPoint(circuit, node.id, { useDom: false });
        if (!point) return;
        const key = pointKey(point);
        const existingId = junctionIdByPoint.get(key);
        if (existingId && existingId !== node.id) {
          replacementByNodeId.set(node.id, existingId);
        } else {
          junctionIdByPoint.set(key, node.id);
        }
      });
    if (!replacementByNodeId.size) return false;

    circuit.wires = circuit.wires
      .map((wire) => ({
        ...wire,
        from: replacementByNodeId.get(wire.from) || wire.from,
        to: replacementByNodeId.get(wire.to) || wire.to,
      }))
      .filter((wire) => wire.from !== wire.to);
    circuit.nodes = circuit.nodes.filter((node) => !replacementByNodeId.has(node.id));
    updateModuleGroupNodeReferences(circuit, replacementByNodeId);
    replacementByNodeId.forEach((replacementId, nodeId) => {
      replaceSelectedNodeReference(nodeId, replacementId);
    });
    return true;
  }

  function collapseStraightThroughJunctionNodes(circuit) {
    let changed = false;
    const junctionNodes = circuit.nodes.filter((node) => isJunctionNodeId(node.id));
    junctionNodes.forEach((node) => {
      const connectedWires = circuit.wires.filter((wire) => wire.from === node.id || wire.to === node.id);
      const neighborIds = [...new Set(connectedWires.map((wire) => wire.from === node.id ? wire.to : wire.from))];
      if (connectedWires.length !== 2 || neighborIds.length !== 2) return;
      const [firstNeighborId, secondNeighborId] = neighborIds;
      if (!isStraightThroughJunction(circuit, node.id, firstNeighborId, secondNeighborId)) return;
      const previousWires = circuit.wires;
      circuit.wires = circuit.wires.filter((wire) => wire.from !== node.id && wire.to !== node.id);
      const alreadyConnected = circuit.wires.some((wire) =>
        (wire.from === firstNeighborId && wire.to === secondNeighborId)
        || (wire.from === secondNeighborId && wire.to === firstNeighborId)
      );
      if (!alreadyConnected && !appendUniqueWireFromState(circuit, firstNeighborId, secondNeighborId)) {
        circuit.wires = previousWires;
        return;
      }
      circuit.nodes = circuit.nodes.filter((item) => item.id !== node.id);
      removeNodeFromModuleGroups(circuit, node.id);
      selectedNodeIds.delete(node.id);
      if (selectedNodeId === node.id) selectedNodeId = "";
      changed = true;
    });
    return changed;
  }

  function isStraightThroughJunction(circuit, nodeId, firstNeighborId, secondNeighborId) {
    const firstDirection = wireDirectionBetween(circuit, nodeId, firstNeighborId, { useDom: false });
    const secondDirection = wireDirectionBetween(circuit, nodeId, secondNeighborId, { useDom: false });
    return (firstDirection === "left" && secondDirection === "right")
      || (firstDirection === "right" && secondDirection === "left")
      || (firstDirection === "up" && secondDirection === "down")
      || (firstDirection === "down" && secondDirection === "up");
  }

  function materializeCircuitWireCorners(circuit) {
    const junctionIdsByPoint = new Map();
    circuit.nodes
      .filter((node) => isJunctionNodeId(node.id))
      .forEach((node) => {
        const point = circuitNodeAnchorPoint(circuit, node.id, { useDom: false });
        if (point) junctionIdsByPoint.set(pointKey(point), node.id);
      });

    const routedWires = [];
    let changed = false;
    circuit.wires.forEach((wire) => {
      const points = orthogonalWirePoints(
        circuitNodeAnchorPoint(circuit, wire.from, { useDom: false }),
        circuitNodeAnchorPoint(circuit, wire.to, { useDom: false }),
      );
      if (points.length <= 2) {
        routedWires.push(wire);
        return;
      }

      changed = true;
      const nodeIds = [wire.from];
      points.slice(1, -1).forEach((point) => {
        const key = pointKey(point);
        let junctionId = junctionIdsByPoint.get(key);
        if (!junctionId) {
          junctionId = `junction:${createCrossoverCircuitJunctionId()}`;
          junctionIdsByPoint.set(key, junctionId);
          circuit.nodes.push({ id: junctionId, ...junctionNodePosition(point) });
        }
        nodeIds.push(junctionId);
      });
      nodeIds.push(wire.to);

      for (let index = 1; index < nodeIds.length; index += 1) {
        routedWires.push({
          id: index === 1 ? wire.id : createCrossoverCircuitWireId(),
          from: nodeIds[index - 1],
          to: nodeIds[index],
        });
      }
    });
    if (!changed) return false;
    circuit.wires = dedupeWires(routedWires, circuit, { useDom: false });
    return true;
  }

  function updateModuleGroupNodeReferences(circuit, replacementByNodeId) {
    circuit.moduleGroups = (circuit.moduleGroups || []).map((group) => ({
      ...group,
      nodeIds: [...new Set((group.nodeIds || []).map((id) => replacementByNodeId.get(id) || id))],
    }));
  }

  function removeNodeFromModuleGroups(circuit, nodeId) {
    circuit.moduleGroups = (circuit.moduleGroups || [])
      .map((group) => ({
        ...group,
        nodeIds: (group.nodeIds || []).filter((id) => id !== nodeId),
      }))
      .filter((group) => ((group.componentIds || []).length + (group.nodeIds || []).length + (group.speakerIds || []).length) >= 2);
  }

  function replaceSelectedNodeReference(nodeId, replacementId) {
    if (selectedNodeIds.has(nodeId)) {
      selectedNodeIds.delete(nodeId);
      selectedNodeIds.add(replacementId);
    }
    if (selectedNodeId === nodeId) selectedNodeId = replacementId;
  }

  function appendUniqueWire(circuit, from, to) {
    if (!from || !to || from === to) return false;
    const exists = circuit.wires.some((wire) =>
      (wire.from === from && wire.to === to) || (wire.from === to && wire.to === from)
    );
    if (exists) return false;
    if (!wireDirectionAvailable(circuit, from, wireDirectionBetween(circuit, from, to))) return false;
    if (!wireDirectionAvailable(circuit, to, wireDirectionBetween(circuit, to, from))) return false;
    circuit.wires.push({ id: createCrossoverCircuitWireId(), from, to });
    return true;
  }

  function appendWireRoute(circuit, from, to, options = {}) {
    if (!from || !to || from === to) return false;
    const fromPoint = options.fromPoint || circuitNodeAnchorPoint(circuit, from);
    const toPoint = options.toPoint || circuitNodeAnchorPoint(circuit, to);
    if (!fromPoint || !toPoint) return appendUniqueWire(circuit, from, to);
    const route = orthogonalWireRoutePoints(fromPoint, toPoint, options.posture || wirePosture);
    const nodeIds = [from];
    route.slice(1, -1).forEach((point) => {
      nodeIds.push(findOrCreateJunctionAtPoint(circuit, point));
    });
    nodeIds.push(to);
    for (let index = 1; index < nodeIds.length; index += 1) {
      if (!appendUniqueWire(circuit, nodeIds[index - 1], nodeIds[index])) return false;
    }
    return true;
  }

  function findOrCreateJunctionAtPoint(circuit, point) {
    const existing = (circuit.nodes || []).find((node) => {
      if (!isJunctionNodeId(node.id)) return false;
      const anchor = circuitNodePositionAnchor(node);
      return anchor && pointKey(anchor) === pointKey(point);
    });
    if (existing) return existing.id;
    const junctionId = `junction:${createCrossoverCircuitJunctionId()}`;
    circuit.nodes.push({ id: junctionId, ...junctionNodePosition(point) });
    return junctionId;
  }

  function appendUniqueWireFromState(circuit, from, to) {
    if (!from || !to || from === to) return false;
    const exists = circuit.wires.some((wire) =>
      (wire.from === from && wire.to === to) || (wire.from === to && wire.to === from)
    );
    if (exists) return false;
    if (!wireDirectionAvailable(circuit, from, wireDirectionBetween(circuit, from, to, { useDom: false }), { useDom: false })) return false;
    if (!wireDirectionAvailable(circuit, to, wireDirectionBetween(circuit, to, from, { useDom: false }), { useDom: false })) return false;
    circuit.wires.push({ id: createCrossoverCircuitWireId(), from, to });
    return true;
  }

  function wireDirectionAvailable(circuit, nodeId, direction, options = {}) {
    if (!direction) return true;
    return !circuit.wires.some((wire) => {
      if (wire.from !== nodeId && wire.to !== nodeId) return false;
      const otherNodeId = wire.from === nodeId ? wire.to : wire.from;
      return wireDirectionBetween(circuit, nodeId, otherNodeId, options) === direction;
    });
  }

  function wireDirectionBetween(circuit, from, to, options = {}) {
    const fromPoint = circuitNodeAnchorPoint(circuit, from, options);
    const toPoint = circuitNodeAnchorPoint(circuit, to, options);
    if (!fromPoint || !toPoint) return "";
    const dx = toPoint.x - fromPoint.x;
    const dy = toPoint.y - fromPoint.y;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return "";
    if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "right" : "left";
    return dy >= 0 ? "down" : "up";
  }

  function circuitNodeAnchorPoint(circuit, nodeId, options = {}) {
    const domPoint = options.useDom === false ? null : domNodeAnchorPoint(nodeId);
    if (domPoint) return domPoint;
    const componentPort = componentPortFromNodeId(nodeId);
    if (componentPort) return componentPortAnchorPoint(circuit, componentPort);
    const node = circuit.nodes?.find((item) => item.id === nodeId);
    if (node) return circuitNodePositionAnchor(node);
    return fallbackCircuitNodeAnchorPoint(nodeId);
  }

  function domNodeAnchorPoint(nodeId) {
    const canvas = crossoverSchematicBoard?.querySelector(".crossover-schematic-canvas");
    const element = crossoverSchematicBoard?.querySelector(`[data-node-id="${cssEscape(nodeId)}"]`);
    const boardRect = canvas?.getBoundingClientRect();
    if (!element || !boardRect) return null;
    return wireAnchorPoint(element, element.getBoundingClientRect(), boardRect);
  }

  function componentPortFromNodeId(nodeId) {
    const match = String(nodeId || "").match(/^component:(.+):(a|b)$/);
    if (!match) return null;
    return { componentId: match[1], port: match[2] };
  }

  function componentPortAnchorPoint(circuit, { componentId, port }) {
    const component = circuit.components?.find((item) => item.id === componentId);
    if (!component) return null;
    if (component.type === "wire-segment") {
      const length = Math.max(Number(component.value) || 0, WIRE_SEGMENT_MIN_LENGTH);
      if (component.orientation === "vertical") {
        return {
          x: (Number(component.x) || 0) + WIRE_SEGMENT_PORT_OFFSET,
          y: (Number(component.y) || 0) + (port === "b" ? length + WIRE_SEGMENT_PORT_OFFSET : WIRE_SEGMENT_PORT_OFFSET),
        };
      }
      return {
        x: (Number(component.x) || 0) + (port === "b" ? length + WIRE_SEGMENT_PORT_OFFSET : WIRE_SEGMENT_PORT_OFFSET),
        y: (Number(component.y) || 0) + WIRE_SEGMENT_PORT_OFFSET,
      };
    }
    return {
      x: (Number(component.x) || 0) + (port === "b" ? 139 : 7),
      y: (Number(component.y) || 0) + 37,
    };
  }

  function circuitNodePositionAnchor(node) {
    if (isJunctionNodeId(node.id)) {
      return {
        x: (Number(node.x) || 0) + JUNCTION_ANCHOR_OFFSET,
        y: (Number(node.y) || 0) + JUNCTION_ANCHOR_OFFSET,
      };
    }
    if (String(node.id || "").startsWith("fixed:")) {
      return {
        x: (Number(node.x) || 0) + 110,
        y: (Number(node.y) || 0) + 31,
      };
    }
    if (String(node.id || "").startsWith("design:")) {
      return {
        x: (Number(node.x) || 0) + 8,
        y: (Number(node.y) || 0) + (String(node.id).endsWith(":negative") ? 47 : 21),
      };
    }
    return null;
  }

  function fallbackCircuitNodeAnchorPoint(nodeId) {
    if (nodeId === crossoverCircuitFixedNodeId("positive")) return { x: 152, y: 93 };
    if (nodeId === crossoverCircuitFixedNodeId("ground")) return { x: 152, y: 303 };
    return null;
  }

  function addWireToJunction(from, point, options = {}) {
    const group = activeCrossoverGroup();
    if (!group || !point) return;
    const nextState = cloneProject(state);
    const nextGroup = mutableCrossoverGroup(nextState, group);
    if (!nextGroup) return;
    nextGroup.crossover = normalizeGroupCrossover(nextGroup.crossover);
    const circuit = nextGroup.crossover.circuit;
    const junctionId = findOrCreateJunctionAtPoint(circuit, point);
    if (!appendWireRoute(circuit, from, junctionId, { toPoint: point })) return;
    wireMode = options.continueDrawing ? WIRE_MODE_WIRING : WIRE_MODE_IDLE;
    selectedNodeId = junctionId;
    wireDraft = options.continueDrawing
      ? { fromNodeId: junctionId, point: options.draftPoint || point, activePress: false, posture: wirePosture }
      : null;
    if (!options.continueDrawing) selectedNodeId = "";
    clearWireTargetHighlight();
    updateWiringState();
    commitState(nextState, { renderControls: false });
  }

  function addWireSegmentFromDrag(fromNodeId, fromPoint, rawToPoint, targetNodeId = "") {
    if (!fromNodeId || !fromPoint || !rawToPoint) return;
    const toPoint = constrainedWirePoint(fromPoint, rawToPoint);
    const dx = toPoint.x - fromPoint.x;
    const dy = toPoint.y - fromPoint.y;
    const isHorizontal = Math.abs(dx) >= Math.abs(dy);
    const length = Math.max(Math.abs(isHorizontal ? dx : dy), WIRE_SEGMENT_MIN_LENGTH);
    if (length < WIRE_SEGMENT_MIN_LENGTH) return;

    const group = activeCrossoverGroup();
    if (!group) return;
    const nextState = cloneProject(state);
    const nextGroup = mutableCrossoverGroup(nextState, group);
    if (!nextGroup) return;
    nextGroup.crossover = normalizeGroupCrossover(nextGroup.crossover);
    const circuit = nextGroup.crossover.circuit;
    const id = createCrossoverCircuitComponentId();
    const orientation = isHorizontal ? "horizontal" : "vertical";
    const x = isHorizontal
      ? Math.min(fromPoint.x, toPoint.x) - WIRE_SEGMENT_PORT_OFFSET
      : fromPoint.x - WIRE_SEGMENT_PORT_OFFSET;
    const y = isHorizontal
      ? fromPoint.y - WIRE_SEGMENT_PORT_OFFSET
      : Math.min(fromPoint.y, toPoint.y) - WIRE_SEGMENT_PORT_OFFSET;
    const startPort = (isHorizontal ? dx >= 0 : dy >= 0) ? "a" : "b";
    const endPort = startPort === "a" ? "b" : "a";
    const startPortId = crossoverCircuitComponentPortId(id, startPort);
    const endPortId = crossoverCircuitComponentPortId(id, endPort);

    circuit.components.push({
      id,
      type: "wire-segment",
      value: length,
      orientation,
      x,
      y,
    });
    if (!appendUniqueWire(circuit, fromNodeId, startPortId)) {
      circuit.components = circuit.components.filter((component) => component.id !== id);
      return;
    }
    if (targetNodeId && targetNodeId !== fromNodeId && pointsAreClose(toPoint, rawToPoint, 8)) {
      appendUniqueWire(circuit, endPortId, targetNodeId);
    }

    wireMode = WIRE_MODE_IDLE;
    selectedNodeId = "";
    wireDraft = null;
    updateWiringState();
    commitState(nextState, { renderControls: false });
  }

  function pointsAreClose(left, right, threshold = 6) {
    return Math.hypot((left?.x || 0) - (right?.x || 0), (left?.y || 0) - (right?.y || 0)) <= threshold;
  }

  function pointOnWireSegment(circuit, wire, rawPoint) {
    const fromPoint = circuitNodeAnchorPoint(circuit, wire.from);
    const toPoint = circuitNodeAnchorPoint(circuit, wire.to);
    if (!fromPoint || !toPoint || !rawPoint) return rawPoint;
    if (Math.abs(fromPoint.x - toPoint.x) >= Math.abs(fromPoint.y - toPoint.y)) {
      const minX = Math.min(fromPoint.x, toPoint.x);
      const maxX = Math.max(fromPoint.x, toPoint.x);
      const snapped = snapWirePointToGrid(rawPoint, GRID_SIZE);
      return {
        x: Math.min(Math.max(snapped.x, minX), maxX),
        y: fromPoint.y,
      };
    }
    const minY = Math.min(fromPoint.y, toPoint.y);
    const maxY = Math.max(fromPoint.y, toPoint.y);
    const snapped = snapWirePointToGrid(rawPoint, GRID_SIZE);
    return {
      x: fromPoint.x,
      y: Math.min(Math.max(snapped.y, minY), maxY),
    };
  }

  function addWireJunction(wireId, event, options = {}) {
    const group = activeCrossoverGroup();
    if (!group) return;
    const rawPoint = boardPointFromClient(event.clientX, event.clientY);
    if (!rawPoint) return;
    const nextState = cloneProject(state);
    const nextGroup = mutableCrossoverGroup(nextState, group);
    if (!nextGroup) return;
    nextGroup.crossover = normalizeGroupCrossover(nextGroup.crossover);
    const wire = nextGroup.crossover.circuit.wires.find((item) => item.id === wireId);
    if (!wire) return;
    const circuit = nextGroup.crossover.circuit;
    const canvasPoint = pointOnWireSegment(circuit, wire, rawPoint);
    const junctionId = `junction:${createCrossoverCircuitJunctionId()}`;
    const { x, y } = junctionNodePosition(canvasPoint);
    circuit.nodes.push({ id: junctionId, x, y });
    circuit.wires = circuit.wires.filter((item) => item.id !== wireId);
    if (!appendUniqueWire(circuit, wire.from, junctionId) || !appendUniqueWire(circuit, junctionId, wire.to)) return;
    if (options.connectFromNodeId) {
      if (!appendWireRoute(circuit, options.connectFromNodeId, junctionId, { toPoint: canvasPoint })) return;
      wireMode = WIRE_MODE_IDLE;
      selectedNodeId = "";
      wireDraft = null;
    } else {
      wireMode = WIRE_MODE_WIRING;
      selectedNodeId = junctionId;
      wireDraft = { fromNodeId: junctionId, point: canvasPoint, activePress: false, posture: wirePosture };
    }
    clearWireTargetHighlight();
    updateWiringState();
    commitState(nextState, { renderControls: false });
  }

  function deleteWire(wireId) {
    const group = activeCrossoverGroup();
    if (!group) return;
    const nextState = cloneProject(state);
    const nextGroup = mutableCrossoverGroup(nextState, group);
    if (!nextGroup) return;
    nextGroup.crossover = normalizeGroupCrossover(nextGroup.crossover);
    nextGroup.crossover.circuit.wires = nextGroup.crossover.circuit.wires.filter((wire) => wire.id !== wireId);
    removeOrphanJunctionNodes(nextGroup.crossover.circuit);
    if (selectedNodeId && !nextGroup.crossover.circuit.nodes.some((node) => node.id === selectedNodeId)) selectedNodeId = "";
    commitState(nextState, { renderControls: false });
  }

  function deleteJunctionNode(nodeId) {
    const group = activeCrossoverGroup();
    if (!group) return;
    const nextState = cloneProject(state);
    const nextGroup = mutableCrossoverGroup(nextState, group);
    if (!nextGroup) return;
    nextGroup.crossover = normalizeGroupCrossover(nextGroup.crossover);
    const connectedWires = nextGroup.crossover.circuit.wires.filter((wire) => wire.from === nodeId || wire.to === nodeId);
    const neighborNodeIds = [...new Set(connectedWires.map((wire) => wire.from === nodeId ? wire.to : wire.from))];
    nextGroup.crossover.circuit.nodes = nextGroup.crossover.circuit.nodes.filter((node) => node.id !== nodeId);
    nextGroup.crossover.circuit.wires = nextGroup.crossover.circuit.wires.filter((wire) => wire.from !== nodeId && wire.to !== nodeId);
    for (let index = 1; index < neighborNodeIds.length; index += 1) {
      appendUniqueWire(nextGroup.crossover.circuit, neighborNodeIds[index - 1], neighborNodeIds[index]);
    }
    removeOrphanJunctionNodes(nextGroup.crossover.circuit);
    if (selectedNodeId === nodeId) selectedNodeId = "";
    selectedNodeIds.delete(nodeId);
    wireMode = WIRE_MODE_IDLE;
    wireDraft = null;
    updateWiringState();
    commitState(nextState, { renderControls: false });
  }

  function removeOrphanJunctionNodes(circuit) {
    const connectedNodeIds = new Set(circuit.wires.flatMap((wire) => [wire.from, wire.to]));
    circuit.nodes = circuit.nodes.filter((node) => !isJunctionNodeId(node.id) || connectedNodeIds.has(node.id));
  }

  function deleteComponent(componentId) {
    const group = activeCrossoverGroup();
    if (!group) return;
    const nextState = cloneProject(state);
    const nextGroup = mutableCrossoverGroup(nextState, group);
    if (!nextGroup) return;
    nextGroup.crossover = normalizeGroupCrossover(nextGroup.crossover);
    nextGroup.crossover.circuit.components = nextGroup.crossover.circuit.components.filter((component) => component.id !== componentId);
    nextGroup.crossover.circuit.wires = nextGroup.crossover.circuit.wires.filter((wire) =>
      !wire.from.includes(`component:${componentId}:`) && !wire.to.includes(`component:${componentId}:`)
    );
    removeOrphanJunctionNodes(nextGroup.crossover.circuit);
    selectedComponentIds.delete(componentId);
    wireMode = WIRE_MODE_IDLE;
    wireDraft = null;
    updateWiringState();
    commitState(nextState, { renderControls: false });
  }

  function deleteSelectedSchematicObjects() {
    const componentIds = new Set(selectedComponentIds);
    const nodeIds = new Set(selectedNodeIds);
    const speakerIds = new Set(selectedSpeakerIds);
    if (selectedNodeId) nodeIds.add(selectedNodeId);
    if (!componentIds.size && !nodeIds.size && !speakerIds.size) return false;

    const group = activeCrossoverGroup();
    if (!group) return false;
    const nextState = cloneProject(state);
    const nextGroup = mutableCrossoverGroup(nextState, group);
    if (!nextGroup) return false;
    nextGroup.crossover = normalizeGroupCrossover(nextGroup.crossover);
    const circuit = nextGroup.crossover.circuit;

    circuit.components = circuit.components.filter((component) => !componentIds.has(component.id));
    circuit.nodes = circuit.nodes.filter((node) => !nodeIds.has(node.id));
    const removedSpeakerNodeIds = selectedSpeakerNodeIds(speakerIds);
    circuit.wires = circuit.wires.filter((wire) => (
      !nodeIds.has(wire.from)
      && !nodeIds.has(wire.to)
      && !removedSpeakerNodeIds.has(wire.from)
      && !removedSpeakerNodeIds.has(wire.to)
      && ![...componentIds].some((componentId) => wire.from.includes(`component:${componentId}:`) || wire.to.includes(`component:${componentId}:`))
    ));
    circuit.moduleGroups = (circuit.moduleGroups || [])
      .map((moduleGroup) => ({
        ...moduleGroup,
        componentIds: (moduleGroup.componentIds || []).filter((id) => !componentIds.has(id)),
        nodeIds: (moduleGroup.nodeIds || []).filter((id) => !nodeIds.has(id) && !removedSpeakerNodeIds.has(id)),
        speakerIds: (moduleGroup.speakerIds || []).filter((id) => !speakerIds.has(id)),
      }))
      .filter((moduleGroup) => (moduleGroup.componentIds.length + moduleGroup.nodeIds.length + moduleGroup.speakerIds.length) >= 2);

    removeOrphanJunctionNodes(circuit);
    selectedComponentIds.clear();
    selectedNodeIds.clear();
    selectedSpeakerIds.clear();
    wireMode = WIRE_MODE_IDLE;
    selectedNodeId = "";
    wireDraft = null;
    updateWiringState();
    commitState(nextState, { renderControls: false });
    return true;
  }

  function selectedSpeakerNodeIds(speakerIds) {
    const nodeIds = new Set();
    speakerIds.forEach((designId) => {
      nodeIds.add(crossoverCircuitDesignNodeId(designId, "positive"));
      nodeIds.add(crossoverCircuitDesignNodeId(designId, "negative"));
    });
    return nodeIds;
  }

  function startWirePaint(event, nodeId) {
    if (event.button !== 0) return;
    if (!crossoverSchematicBoard) return;
    event.preventDefault();
    event.stopPropagation();
    clearSchematicSelection();
    if (selectedNodeId && !wireDraft?.activePress) {
      handleNodeClick(nodeId);
      return;
    }
    wireMode = WIRE_MODE_WIRING;
    selectedNodeId = nodeId;
    const point = nodeAnchorCanvasPoint(nodeId) || boardPointFromClient(event.clientX, event.clientY);
    wireDraft = {
      fromNodeId: nodeId,
      point,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      activePress: true,
      posture: wirePosture,
    };
    updateWiringState();
    drawCurrentWires(activeCrossoverGroup()?.crossover?.circuit?.wires || []);
    document.addEventListener("pointermove", handleWirePaint);
    document.addEventListener("pointerup", finishWirePaint);
    document.addEventListener("pointercancel", finishWirePaint);
  }

  function handleWirePaint(event) {
    if (!wireDraft?.activePress) return;
    const distance = Math.hypot(event.clientX - wireDraft.startX, event.clientY - wireDraft.startY);
    if (distance > 3) wireDraft.moved = true;
    const targetNodeId = nodeIdFromViewportPoint(event.clientX, event.clientY);
    const point = targetNodeId
      ? nodeAnchorCanvasPoint(targetNodeId)
      : snapWirePointToGrid(boardPointFromClient(event.clientX, event.clientY), GRID_SIZE);
    if (!point) return;
    wireDraft.point = point;
    syncWireTargetHighlight(event);
    drawCurrentWires(activeCrossoverGroup()?.crossover?.circuit?.wires || []);
  }

  function finishWirePaint(event) {
    if (!wireDraft?.activePress) return;
    const draft = wireDraft;
    document.removeEventListener("pointermove", handleWirePaint);
    document.removeEventListener("pointerup", finishWirePaint);
    document.removeEventListener("pointercancel", finishWirePaint);

    if (event.type === "pointercancel") {
      cancelWireDrawing();
      return;
    }

    const targetElement = document.elementFromPoint(event.clientX, event.clientY) || event.target;
    const targetNodeId = nodeIdFromEventTarget(targetElement);
    const group = activeCrossoverGroup();
    const wires = group?.crossover?.circuit?.wires || [];
    const releasePoint = snapWirePointToGrid(boardPointFromClient(event.clientX, event.clientY), GRID_SIZE);
    const point = releasePoint || draft.point;
    wireDraft = null;

    if (!draft.moved) {
      startWireFromNode(draft.fromNodeId, nodeAnchorCanvasPoint(draft.fromNodeId) || point);
      return;
    }

    if (targetNodeId && targetNodeId !== draft.fromNodeId) {
      completeWireToNode(draft.fromNodeId, targetNodeId);
      return;
    }

    const targetWireId = wireIdFromEventTarget(targetElement);
    if (targetWireId) {
      event.preventDefault();
      event.stopPropagation();
      suppressNextWireClick(targetWireId);
      addWireJunction(targetWireId, event, { connectFromNodeId: draft.fromNodeId });
      return;
    }

    if (point) {
      addWireToJunction(draft.fromNodeId, point, { continueDrawing: true, draftPoint: point });
      return;
    }

    selectedNodeId = draft.fromNodeId;
    updateWiringState();
    drawCurrentWires(wires);
  }

  function handleBoardPointerMove(event) {
    if (!selectedNodeId || wireDraft?.activePress || drag || endpointDrag || speakerDrag || boardPan) return;
    const targetNodeId = nodeIdFromViewportPoint(event.clientX, event.clientY);
    const point = targetNodeId
      ? nodeAnchorCanvasPoint(targetNodeId)
      : snapWirePointToGrid(boardPointFromClient(event.clientX, event.clientY), GRID_SIZE);
    if (!point) return;
    wireDraft = { fromNodeId: selectedNodeId, point, activePress: false, posture: wirePosture };
    syncWireTargetHighlight(event);
    updateWiringState();
    drawCurrentWires(activeCrossoverGroup()?.crossover?.circuit?.wires || []);
  }

  function placeWireCorner(event, options = {}) {
    if (!selectedNodeId || (!options.ignoreButton && event.button !== 0)) return;
    event.preventDefault();
    event.stopPropagation();
    const point = snapWirePointToGrid(boardPointFromClient(event.clientX, event.clientY), GRID_SIZE);
    if (!point) return;
    addWireToJunction(selectedNodeId, point, { continueDrawing: true, draftPoint: point });
  }

  function updateComponent(componentId, patch, options = {}) {
    const group = activeCrossoverGroup();
    if (!group) return;
    const nextState = cloneProject(state);
    const nextGroup = mutableCrossoverGroup(nextState, group);
    if (!nextGroup) return;
    nextGroup.crossover = normalizeGroupCrossover(nextGroup.crossover);
    const component = nextGroup.crossover.circuit.components.find((item) => item.id === componentId);
    if (!component) return;
    Object.assign(component, patch);
    if (options.renderControls === false) preserveNextRender = true;
    commitState(nextState, options);
  }

  function startComponentDrag(event, componentId) {
    if (event.button !== 0) return;
    if (event.target.closest(".crossover-component-port, .crossover-component-controls, .crossover-component-delete")) return;
    if (!crossoverSchematicBoard) return;
    const components = activeCrossoverGroup()?.crossover?.circuit?.components || [];
    const component = components.find((item) => item.id === componentId);
    if (!component) return;
    event.preventDefault();
    event.stopPropagation();
    wireMode = WIRE_MODE_IDLE;
    selectedNodeId = "";
    wireDraft = null;
    updateWiringState();
    const moduleGroup = moduleGroupForObject({ componentId });
    if (moduleGroup) {
      selectModuleGroup(moduleGroup);
    } else if (!selectedComponentIds.has(componentId)) {
      clearSchematicSelection();
      selectedComponentIds.add(componentId);
    }
    syncSelectedSchematicClasses();
    startSelectedSchematicDrag(event);
    if (!drag) return;
    document.addEventListener("pointermove", handleComponentDrag);
    document.addEventListener("pointerup", finishComponentDrag);
  }

  function handleComponentDrag(event) {
    if (!drag) return;
    const positions = schematicDragPositions(drag, event);
    Object.entries(positions.components).forEach(([componentId, position]) => {
      const element = crossoverSchematicBoard?.querySelector(`[data-component-id="${cssEscape(componentId)}"]`);
      if (!element) return;
      element.style.left = `${position.x}px`;
      element.style.top = `${position.y}px`;
    });
    Object.entries(positions.nodes).forEach(([nodeId, position]) => {
      const element = crossoverSchematicBoard?.querySelector(`[data-node-id="${cssEscape(nodeId)}"]`);
      if (!element) return;
      element.style.left = `${position.x}px`;
      element.style.top = `${position.y}px`;
    });
    Object.entries(positions.speakers).forEach(([designId, position]) => {
      const element = crossoverSchematicBoard?.querySelector(`[data-speaker-design-id="${cssEscape(designId)}"]`);
      if (!element) return;
      element.style.left = `${position.x}px`;
      element.style.top = `${position.y}px`;
    });
    const svg = crossoverSchematicBoard?.querySelector(".crossover-schematic-wires");
    const group = activeCrossoverGroup();
    if (svg && group) drawWires(svg, group.crossover?.circuit?.wires || []);
    refreshModuleGroupBoxes();
  }

  function finishComponentDrag(event) {
    if (!drag) return;
    const positions = schematicDragPositions(drag, event);
    drag = null;
    document.removeEventListener("pointermove", handleComponentDrag);
    document.removeEventListener("pointerup", finishComponentDrag);
    updateSchematicPositions(positions, { replaceHistory: true, renderControls: false });
  }

  function startSelectedSchematicDrag(event) {
    const group = activeCrossoverGroup();
    const circuit = group?.crossover?.circuit;
    if (!circuit || !crossoverSchematicBoard) return;
    const componentOrigins = {};
    selectedComponentIds.forEach((componentId) => {
      const component = circuit.components.find((item) => item.id === componentId);
      if (component) componentOrigins[componentId] = { x: component.x, y: component.y };
    });
    const nodeOrigins = {};
    selectedNodeIds.forEach((nodeId) => {
      const element = crossoverSchematicBoard.querySelector(`[data-node-id="${cssEscape(nodeId)}"]`);
      const position = schematicElementPosition(element);
      if (position) nodeOrigins[nodeId] = position;
    });
    const speakerOrigins = {};
    selectedSpeakerIds.forEach((designId) => {
      const element = crossoverSchematicBoard.querySelector(`[data-speaker-design-id="${cssEscape(designId)}"]`);
      const position = schematicElementPosition(element);
      if (!position) return;
      speakerOrigins[designId] = {
        ...position,
        plusId: element.dataset.plusNodeId,
        minusId: element.dataset.minusNodeId,
      };
    });
    if (!Object.keys(componentOrigins).length && !Object.keys(nodeOrigins).length && !Object.keys(speakerOrigins).length) return;
    drag = {
      startX: event.clientX,
      startY: event.clientY,
      componentOrigins,
      nodeOrigins,
      speakerOrigins,
    };
  }

  function schematicElementPosition(element) {
    if (!element) return null;
    return {
      x: Number(String(element.style.left || "").replace("px", "")) || 0,
      y: Number(String(element.style.top || "").replace("px", "")) || 0,
    };
  }

  function schematicDragPositions(currentDrag, event) {
    const deltaX = (event.clientX - currentDrag.startX) / cameraScale;
    const deltaY = (event.clientY - currentDrag.startY) / cameraScale;
    return {
      components: shiftedDragPositions(currentDrag.componentOrigins, deltaX, deltaY, event.ctrlKey),
      nodes: shiftedDragPositions(currentDrag.nodeOrigins, deltaX, deltaY, event.ctrlKey),
      speakers: shiftedDragPositions(currentDrag.speakerOrigins, deltaX, deltaY, event.ctrlKey),
    };
  }

  function shiftedDragPositions(origins, deltaX, deltaY, snapToGrid) {
    return Object.fromEntries(Object.entries(origins).map(([id, origin]) => {
      const rawX = origin.x + deltaX;
      const rawY = origin.y + deltaY;
      const position = snapToGrid
        ? {
          x: Math.round(rawX / GRID_SIZE) * GRID_SIZE,
          y: Math.round(rawY / GRID_SIZE) * GRID_SIZE,
        }
        : { x: rawX, y: rawY };
      return [id, {
        ...position,
        ...(origin.plusId ? { plusId: origin.plusId } : {}),
        ...(origin.minusId ? { minusId: origin.minusId } : {}),
      }];
    }));
  }

  function startEndpointDrag(event, nodeId) {
    if (event.button !== 0) return;
    const moduleGroup = moduleGroupForObject({ nodeId });
    if (moduleGroup) {
      event.preventDefault();
      event.stopPropagation();
      wireMode = WIRE_MODE_IDLE;
      selectedNodeId = "";
      wireDraft = null;
      updateWiringState();
      selectModuleGroup(moduleGroup);
      startSelectedSchematicDrag(event);
      if (!drag) return;
      document.addEventListener("pointermove", handleComponentDrag);
      document.addEventListener("pointerup", finishComponentDrag);
      return;
    }
    if (selectedNodeIds.has(nodeId)) {
      event.preventDefault();
      event.stopPropagation();
      wireMode = WIRE_MODE_IDLE;
      selectedNodeId = "";
      wireDraft = null;
      updateWiringState();
      startSelectedSchematicDrag(event);
      if (!drag) return;
      document.addEventListener("pointermove", handleComponentDrag);
      document.addEventListener("pointerup", finishComponentDrag);
      return;
    }
    clearSchematicSelection();
    event.preventDefault();
    event.stopPropagation();
    const endpoint = event.currentTarget;
    endpointDrag = {
      nodeId,
      startX: event.clientX,
      startY: event.clientY,
      originX: Number(String(endpoint.style.left || "").replace("px", "")) || 0,
      originY: Number(String(endpoint.style.top || "").replace("px", "")) || 0,
      moved: false,
    };
    document.addEventListener("pointermove", handleEndpointDrag);
    document.addEventListener("pointerup", finishEndpointDrag);
  }

  function startSpeakerDrag(event, designId, plusId, minusId) {
    if (event.button !== 0) return;
    if (event.target.closest(".crossover-speaker-port")) return;
    const moduleGroup = moduleGroupForObject({ speakerId: designId });
    if (moduleGroup) {
      event.preventDefault();
      event.stopPropagation();
      wireMode = WIRE_MODE_IDLE;
      selectedNodeId = "";
      wireDraft = null;
      updateWiringState();
      selectModuleGroup(moduleGroup);
      startSelectedSchematicDrag(event);
      if (!drag) return;
      document.addEventListener("pointermove", handleComponentDrag);
      document.addEventListener("pointerup", finishComponentDrag);
      return;
    }
    if (selectedSpeakerIds.has(designId)) {
      event.preventDefault();
      event.stopPropagation();
      wireMode = WIRE_MODE_IDLE;
      selectedNodeId = "";
      wireDraft = null;
      updateWiringState();
      startSelectedSchematicDrag(event);
      if (!drag) return;
      document.addEventListener("pointermove", handleComponentDrag);
      document.addEventListener("pointerup", finishComponentDrag);
      return;
    }
    clearSchematicSelection();
    event.preventDefault();
    event.stopPropagation();
    wireMode = WIRE_MODE_IDLE;
    selectedNodeId = "";
    wireDraft = null;
    updateWiringState();
    const speaker = event.currentTarget;
    speakerDrag = {
      designId,
      plusId,
      minusId,
      startX: event.clientX,
      startY: event.clientY,
      originX: Number(String(speaker.style.left || "").replace("px", "")) || 0,
      originY: Number(String(speaker.style.top || "").replace("px", "")) || 0,
      moved: false,
    };
    document.addEventListener("pointermove", handleSpeakerDrag);
    document.addEventListener("pointerup", finishSpeakerDrag);
  }

  function handleSpeakerDrag(event) {
    if (!speakerDrag) return;
    const distance = Math.hypot(event.clientX - speakerDrag.startX, event.clientY - speakerDrag.startY);
    if (distance > 3) speakerDrag.moved = true;
    const { x, y } = pointerDragPosition(speakerDrag, event);
    const speaker = crossoverSchematicBoard?.querySelector(`[data-speaker-design-id="${cssEscape(speakerDrag.designId)}"]`);
    if (speaker) {
      speaker.style.left = `${x}px`;
      speaker.style.top = `${y}px`;
    }
    const group = activeCrossoverGroup();
    drawCurrentWires(group?.crossover?.circuit?.wires || []);
  }

  function finishSpeakerDrag(event) {
    if (!speakerDrag) return;
    const currentDrag = speakerDrag;
    speakerDrag = null;
    document.removeEventListener("pointermove", handleSpeakerDrag);
    document.removeEventListener("pointerup", finishSpeakerDrag);

    if (!currentDrag.moved) return;

    const { x, y } = pointerDragPosition(currentDrag, event);
    updateSpeakerPosition(currentDrag.plusId, currentDrag.minusId, x, y, { replaceHistory: true, renderControls: false });
  }

  function handleEndpointDrag(event) {
    if (!endpointDrag) return;
    const distance = Math.hypot(event.clientX - endpointDrag.startX, event.clientY - endpointDrag.startY);
    if (distance > 3) endpointDrag.moved = true;
    const { x, y } = pointerDragPosition(endpointDrag, event);
    const endpoint = crossoverSchematicBoard?.querySelector(`[data-node-id="${cssEscape(endpointDrag.nodeId)}"]`);
    if (endpoint) {
      endpoint.style.left = `${x}px`;
      endpoint.style.top = `${y}px`;
    }
    const group = activeCrossoverGroup();
    drawCurrentWires(group?.crossover?.circuit?.wires || []);
  }

  function finishEndpointDrag(event) {
    if (!endpointDrag) return;
    const currentDrag = endpointDrag;
    endpointDrag = null;
    document.removeEventListener("pointermove", handleEndpointDrag);
    document.removeEventListener("pointerup", finishEndpointDrag);

    if (!currentDrag.moved) {
      handleNodeClick(currentDrag.nodeId);
      return;
    }

    const { x, y } = pointerDragPosition(currentDrag, event);
    updateEndpointPosition(currentDrag.nodeId, x, y, { replaceHistory: true, renderControls: false });
  }

  function pointerDragPosition(currentDrag, event) {
    const rawX = currentDrag.originX + (event.clientX - currentDrag.startX) / cameraScale;
    const rawY = currentDrag.originY + (event.clientY - currentDrag.startY) / cameraScale;
    if (!event.ctrlKey) return snapDraggedNodePosition(currentDrag.nodeId, rawX, rawY);
    return {
      x: Math.round(rawX / GRID_SIZE) * GRID_SIZE,
      y: Math.round(rawY / GRID_SIZE) * GRID_SIZE,
    };
  }

  function snapDraggedNodePosition(nodeId, rawX, rawY) {
    if (!nodeId || !isJunctionNodeId(nodeId)) return { x: rawX, y: rawY };
    const circuit = activeCrossoverGroup()?.crossover?.circuit;
    if (!circuit) return { x: rawX, y: rawY };
    const proposedAnchor = anchorPointFromNodePosition(nodeId, rawX, rawY);
    if (!proposedAnchor) return { x: rawX, y: rawY };
    const snapDistance = 10 / Math.max(cameraScale, 0.25);
    const connectedNeighborIds = circuit.wires
      .filter((wire) => wire.from === nodeId || wire.to === nodeId)
      .map((wire) => wire.from === nodeId ? wire.to : wire.from);

    const snappedAnchor = connectedNeighborIds.reduce((anchor, neighborId) => {
      const neighborAnchor = circuitNodeAnchorPoint(circuit, neighborId, { useDom: false });
      if (!neighborAnchor) return anchor;
      return {
        x: Math.abs(anchor.x - neighborAnchor.x) <= snapDistance ? neighborAnchor.x : anchor.x,
        y: Math.abs(anchor.y - neighborAnchor.y) <= snapDistance ? neighborAnchor.y : anchor.y,
      };
    }, proposedAnchor);
    return nodePositionFromAnchorPoint(nodeId, snappedAnchor);
  }

  function anchorPointFromNodePosition(nodeId, x, y) {
    if (isJunctionNodeId(nodeId)) {
      return {
        x: x + JUNCTION_ANCHOR_OFFSET,
        y: y + JUNCTION_ANCHOR_OFFSET,
      };
    }
    if (String(nodeId || "").startsWith("fixed:")) {
      return { x: x + 110, y: y + 31 };
    }
    if (String(nodeId || "").startsWith("design:")) {
      return {
        x: x + 8,
        y: y + (String(nodeId).endsWith(":negative") ? 47 : 21),
      };
    }
    return null;
  }

  function nodePositionFromAnchorPoint(nodeId, point) {
    if (isJunctionNodeId(nodeId)) {
      return {
        x: point.x - JUNCTION_ANCHOR_OFFSET,
        y: point.y - JUNCTION_ANCHOR_OFFSET,
      };
    }
    if (String(nodeId || "").startsWith("fixed:")) {
      return { x: point.x - 110, y: point.y - 31 };
    }
    if (String(nodeId || "").startsWith("design:")) {
      return {
        x: point.x - 8,
        y: point.y - (String(nodeId).endsWith(":negative") ? 47 : 21),
      };
    }
    return point;
  }

  function updateEndpointPosition(nodeId, x, y, options = {}) {
    const group = activeCrossoverGroup();
    if (!group) return;
    const nextState = cloneProject(state);
    const nextGroup = mutableCrossoverGroup(nextState, group);
    if (!nextGroup) return;
    nextGroup.crossover = normalizeGroupCrossover(nextGroup.crossover);
    const nodes = nextGroup.crossover.circuit.nodes;
    const node = nodes.find((item) => item.id === nodeId);
    if (node) {
      node.x = x;
      node.y = y;
    } else {
      nodes.push({ id: nodeId, x, y });
    }
    normalizeCrossoverJunctions(nextGroup.crossover.circuit);
    if (options.renderControls === false) preserveNextRender = true;
    commitState(nextState, options);
  }

  function updateComponentPositions(positions, options = {}) {
    const group = activeCrossoverGroup();
    if (!group) return;
    const nextState = cloneProject(state);
    const nextGroup = mutableCrossoverGroup(nextState, group);
    if (!nextGroup) return;
    nextGroup.crossover = normalizeGroupCrossover(nextGroup.crossover);
    nextGroup.crossover.circuit.components.forEach((component) => {
      const position = positions[component.id];
      if (!position) return;
      component.x = position.x;
      component.y = position.y;
    });
    normalizeCrossoverJunctions(nextGroup.crossover.circuit);
    if (options.renderControls === false) preserveNextRender = true;
    commitState(nextState, options);
  }

  function updateSchematicPositions(positions, options = {}) {
    const group = activeCrossoverGroup();
    if (!group) return;
    const nextState = cloneProject(state);
    const nextGroup = mutableCrossoverGroup(nextState, group);
    if (!nextGroup) return;
    nextGroup.crossover = normalizeGroupCrossover(nextGroup.crossover);
    const circuit = nextGroup.crossover.circuit;
    circuit.components.forEach((component) => {
      const position = positions.components[component.id];
      if (!position) return;
      component.x = position.x;
      component.y = position.y;
    });
    Object.entries(positions.nodes).forEach(([nodeId, position]) => {
      setCircuitNodePosition(circuit.nodes, nodeId, position.x, position.y);
    });
    Object.values(positions.speakers).forEach((position) => {
      if (position.plusId) setCircuitNodePosition(circuit.nodes, position.plusId, position.x, position.y);
      if (position.minusId) setCircuitNodePosition(circuit.nodes, position.minusId, position.x, position.y);
    });
    normalizeCrossoverJunctions(circuit);
    if (options.renderControls === false) preserveNextRender = true;
    commitState(nextState, options);
  }

  function updateSpeakerPosition(plusId, minusId, x, y, options = {}) {
    const group = activeCrossoverGroup();
    if (!group) return;
    const nextState = cloneProject(state);
    const nextGroup = mutableCrossoverGroup(nextState, group);
    if (!nextGroup) return;
    nextGroup.crossover = normalizeGroupCrossover(nextGroup.crossover);
    setCircuitNodePosition(nextGroup.crossover.circuit.nodes, plusId, x, y);
    setCircuitNodePosition(nextGroup.crossover.circuit.nodes, minusId, x, y);
    normalizeCrossoverJunctions(nextGroup.crossover.circuit);
    if (options.renderControls === false) preserveNextRender = true;
    commitState(nextState, options);
  }

  function setCircuitNodePosition(nodes, nodeId, x, y) {
    const node = nodes.find((item) => item.id === nodeId);
    if (node) {
      node.x = x;
      node.y = y;
    } else {
      nodes.push({ id: nodeId, x, y });
    }
  }

  function startBoardPan(event) {
    if (!crossoverSchematicBoard) return;
    if (event.cabioSchematicHandled) return;
    if (!isEditableTarget(event.target)) crossoverSchematicBoard.focus?.({ preventScroll: true });
    if (isMobileLayout() && event.pointerType === "touch") {
      trackBoardTouchPointer(event);
      if (boardTouchPointers.size >= 2) {
        startBoardPinch();
        return;
      }
    }
    if (boardPan || boardPinch || selectionDrag || drag || endpointDrag || speakerDrag) return;
    const isMiddleDrag = event.button === 1;
    const isLeftBoardDrag = event.button === 0 && !event.target.closest(".crossover-schematic-component, .crossover-schematic-endpoint, .crossover-schematic-speaker, .crossover-schematic-junction, .crossover-schematic-wires path, button, input, select, textarea");
    const isMobileBoardDrag = isMobileLayout() && isLeftBoardDrag;
    if (wireMode === WIRE_MODE_ARMED && isLeftBoardDrag) {
      event.preventDefault();
      event.stopPropagation();
      clearSchematicSelection();
      return;
    }
    if (selectedNodeId && isLeftBoardDrag && !isMobileBoardDrag) {
      startBoardSelection(event, { placeCornerOnClick: true });
      return;
    }
    if (isLeftBoardDrag && !isMobileBoardDrag) {
      startBoardSelection(event);
      return;
    }
    if (!isMiddleDrag && !isMobileBoardDrag) return;

    event.preventDefault();
    event.stopPropagation();
    const placeCornerOnClick = isMobileBoardDrag && Boolean(selectedNodeId);
    if (!placeCornerOnClick) {
      wireMode = WIRE_MODE_IDLE;
      selectedNodeId = "";
      wireDraft = null;
      updateWiringState();
    }
    clearSchematicSelection();
    boardPan = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      cameraX,
      cameraY,
      moved: false,
      placeCornerOnClick,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    crossoverSchematicBoard.classList.add("is-panning");
    document.addEventListener("pointermove", handleBoardPan);
    document.addEventListener("pointerup", finishBoardPan);
    document.addEventListener("pointercancel", finishBoardPan);
  }

  function handleBoardKeyDown(event) {
    if (!crossoverSchematicBoard || !crossoverSchematicBoard.querySelector(".crossover-schematic-canvas")) return;
    const key = String(event.key || "").toLowerCase();
    if (key === "escape") {
      if (isWireDrawingActive()) {
        event.preventDefault();
        event.stopPropagation();
        cancelWireDrawing();
      }
      return;
    }
    if (key === "delete" || key === "backspace") {
      if (!isTextEntryTarget(event.target) && deleteSelectedSchematicObjects()) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }
    if (isEditableTarget(event.target) || event.altKey || event.ctrlKey || event.metaKey) return;
    if (key === "w") {
      event.preventDefault();
      event.stopPropagation();
      wireMode = WIRE_MODE_ARMED;
      selectedNodeId = "";
      wireDraft = null;
      clearSchematicSelection();
      updateWiringState();
      drawCurrentWires(activeCrossoverGroup()?.crossover?.circuit?.wires || []);
      return;
    }
    if (key === "/" || key === "divide") {
      if (isWireDrawingActive()) {
        event.preventDefault();
        event.stopPropagation();
        wirePosture = toggleWirePosture(wirePosture);
        if (wireDraft) wireDraft.posture = normalizeWirePosture(wirePosture);
        drawCurrentWires(activeCrossoverGroup()?.crossover?.circuit?.wires || []);
      }
      return;
    }
    if (key === "g") {
      if (selectedSchematicObjectCount() >= 2) {
        event.preventDefault();
        event.stopPropagation();
        createModuleGroupFromSelection();
      }
      return;
    }
    const directions = {
      arrowup: [0, 1],
      w: [0, 1],
      arrowdown: [0, -1],
      s: [0, -1],
      arrowleft: [1, 0],
      a: [1, 0],
      arrowright: [-1, 0],
      d: [-1, 0],
    };
    const direction = directions[key];
    if (!direction) return;
    event.preventDefault();
    event.stopPropagation();
    const step = event.shiftKey ? 120 : 48;
    panBoardCamera(direction[0] * step, direction[1] * step);
  }

  function trackBoardTouchPointer(event) {
    boardTouchPointers.set(event.pointerId, { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY });
  }

  function forgetBoardTouchPointer(event) {
    if (event.pointerType !== "touch") return;
    boardTouchPointers.delete(event.pointerId);
  }

  function startBoardPinch() {
    if (!crossoverSchematicBoard) return;
    const points = [...boardTouchPointers.values()].slice(-2);
    if (points.length < 2) return;
    if (boardPan) {
      boardPan.placeCornerOnClick = false;
      clearBoardPanState(boardPan.pointerId);
    }
    wireMode = WIRE_MODE_IDLE;
    selectedNodeId = "";
    wireDraft = null;
    updateWiringState();
    clearSchematicSelection();
    const metrics = boardPinchMetrics(points);
    const boardRect = crossoverSchematicBoard.getBoundingClientRect();
    const pointerX = metrics.midX - boardRect.left;
    const pointerY = metrics.midY - boardRect.top;
    boardPinch = {
      pointerIds: points.map((point) => point.pointerId),
      startDistance: Math.max(metrics.distance, 1),
      startScale: cameraScale,
      worldX: (pointerX - cameraX) / cameraScale,
      worldY: (pointerY - cameraY) / cameraScale,
    };
    crossoverSchematicBoard.classList.add("is-panning");
    document.addEventListener("pointermove", handleBoardPan);
    document.addEventListener("pointerup", finishBoardPinch);
    document.addEventListener("pointercancel", finishBoardPinch);
  }

  function boardPinchMetrics(points) {
    const [first, second] = points;
    return {
      distance: Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY),
      midX: (first.clientX + second.clientX) / 2,
      midY: (first.clientY + second.clientY) / 2,
    };
  }

  function startBoardSelection(event, options = {}) {
    event.preventDefault();
    if (!options.placeCornerOnClick) {
      wireMode = WIRE_MODE_IDLE;
      selectedNodeId = "";
      wireDraft = null;
      updateWiringState();
    }
    selectionDrag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      placeCornerOnClick: Boolean(options.placeCornerOnClick),
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    clearSchematicSelection();
    if (!selectionDrag.placeCornerOnClick) {
      updateSelectionBox(event);
    }
    crossoverSchematicBoard.classList.add("is-selecting");
    document.addEventListener("pointermove", handleBoardSelection);
    document.addEventListener("pointerup", finishBoardSelection);
    document.addEventListener("pointercancel", cancelBoardSelection);
  }

  function handleBoardSelection(event) {
    if (!selectionDrag) return;
    if (event.pointerId !== selectionDrag.pointerId) return;
    event.preventDefault();
    if (Math.hypot(event.clientX - selectionDrag.startX, event.clientY - selectionDrag.startY) > 3) selectionDrag.moved = true;
    if (selectionDrag.placeCornerOnClick) {
      const point = boardPointFromClient(event.clientX, event.clientY);
      if (point && selectedNodeId) {
        wireDraft = { fromNodeId: selectedNodeId, point, activePress: false };
        drawCurrentWires(activeCrossoverGroup()?.crossover?.circuit?.wires || []);
      }
      return;
    }
    updateSelectionBox(event);
    selectComponentsInBox(selectionRectFromEvent(event));
  }

  function finishBoardSelection(event) {
    if (!selectionDrag) return;
    if (event.pointerId !== selectionDrag.pointerId) return;
    const moved = selectionDrag.moved;
    const placeCornerOnClick = selectionDrag.placeCornerOnClick;
    if (placeCornerOnClick) {
      placeWireCorner(event, { ignoreButton: true });
    } else if (moved) {
      selectComponentsInBox(selectionRectFromEvent(event));
    } else {
      clearSchematicSelection();
    }
    crossoverSchematicBoard?.releasePointerCapture?.(event.pointerId);
    clearBoardSelectionDrag();
    lastRenderSignature = "";
    renderCrossoverSchematic();
  }

  function cancelBoardSelection(event) {
    if (!selectionDrag) return;
    if (event.pointerId !== selectionDrag.pointerId) return;
    clearSchematicSelection();
    clearBoardSelectionDrag();
  }

  function clearBoardSelectionDrag() {
    selectionDrag = null;
    syncSelectionBox(null);
    crossoverSchematicBoard?.classList.remove("is-selecting");
    document.removeEventListener("pointermove", handleBoardSelection);
    document.removeEventListener("pointerup", finishBoardSelection);
    document.removeEventListener("pointercancel", cancelBoardSelection);
  }

  function updateSelectionBox(event) {
    if (!selectionDrag) return;
    const rect = selectionRectFromEvent(event);
    syncSelectionBox(rect);
  }

  function syncSelectionBox(box) {
    window.dispatchEvent(new CustomEvent("cabio:crossover-selection-box-sync", {
      detail: { box },
    }));
  }

  function selectionRectFromEvent(event) {
    const left = Math.min(selectionDrag.startX, event.clientX);
    const top = Math.min(selectionDrag.startY, event.clientY);
    const right = Math.max(selectionDrag.startX, event.clientX);
    const bottom = Math.max(selectionDrag.startY, event.clientY);
    return { left, top, right, bottom, width: right - left, height: bottom - top };
  }

  function selectComponentsInBox(rect) {
    const componentIds = new Set();
    const nodeIds = new Set();
    const speakerIds = new Set();
    crossoverSchematicBoard?.querySelectorAll(".crossover-schematic-component").forEach((element) => {
      const componentRect = element.getBoundingClientRect();
      if (rectsIntersect(rect, componentRect)) componentIds.add(element.dataset.componentId);
    });
    crossoverSchematicBoard?.querySelectorAll(".crossover-schematic-endpoint, .crossover-schematic-junction").forEach((element) => {
      const nodeRect = element.getBoundingClientRect();
      if (rectsIntersect(rect, nodeRect)) nodeIds.add(element.dataset.nodeId);
    });
    crossoverSchematicBoard?.querySelectorAll(".crossover-schematic-speaker").forEach((element) => {
      const speakerRect = element.getBoundingClientRect();
      if (rectsIntersect(rect, speakerRect)) speakerIds.add(element.dataset.speakerDesignId);
    });
    selectedComponentIds = componentIds;
    selectedNodeIds = nodeIds;
    selectedSpeakerIds = speakerIds;
    syncSelectedSchematicClasses();
  }

  function rectsIntersect(a, b) {
    return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
  }

  function clearSchematicSelection() {
    selectedComponentIds.clear();
    selectedNodeIds.clear();
    selectedSpeakerIds.clear();
    syncSelectedSchematicClasses();
  }

  function moduleGroupForObject({ componentId = "", nodeId = "", speakerId = "" } = {}) {
    const moduleGroups = activeCrossoverGroup()?.crossover?.circuit?.moduleGroups || [];
    return moduleGroups.find((group) => (
      (componentId && group.componentIds?.includes(componentId))
      || (nodeId && group.nodeIds?.includes(nodeId))
      || (speakerId && group.speakerIds?.includes(speakerId))
    )) || null;
  }

  function isModuleGroupSelected(group) {
    if (!group) return false;
    const componentIds = group.componentIds || [];
    const nodeIds = group.nodeIds || [];
    const speakerIds = group.speakerIds || [];
    const count = componentIds.length + nodeIds.length + speakerIds.length;
    if (!count || selectedSchematicObjectCount() !== count) return false;
    return componentIds.every((id) => selectedComponentIds.has(id))
      && nodeIds.every((id) => selectedNodeIds.has(id))
      && speakerIds.every((id) => selectedSpeakerIds.has(id));
  }

  function selectModuleGroup(group) {
    selectedComponentIds = new Set(group.componentIds || []);
    selectedNodeIds = new Set(group.nodeIds || []);
    selectedSpeakerIds = new Set(group.speakerIds || []);
    syncSelectedSchematicClasses();
  }

  function syncSelectedSchematicClasses() {
    crossoverSchematicBoard?.querySelectorAll(".crossover-schematic-component").forEach((element) => {
      element.classList.toggle("selected", selectedComponentIds.has(element.dataset.componentId));
    });
    crossoverSchematicBoard?.querySelectorAll(".crossover-schematic-endpoint, .crossover-schematic-junction").forEach((element) => {
      element.classList.toggle("selected", selectedNodeIds.has(element.dataset.nodeId) || selectedNodeId === element.dataset.nodeId);
    });
    crossoverSchematicBoard?.querySelectorAll(".crossover-schematic-speaker").forEach((element) => {
      const plusId = element.dataset.plusNodeId || "";
      const minusId = element.dataset.minusNodeId || "";
      element.classList.toggle("selected", selectedSpeakerIds.has(element.dataset.speakerDesignId) || selectedNodeId === plusId || selectedNodeId === minusId);
    });
    crossoverSchematicBoard?.querySelectorAll(".crossover-module-group-box").forEach((element) => {
      const group = activeCrossoverGroup()?.crossover?.circuit?.moduleGroups?.find((item) => item.id === element.dataset.moduleGroupId);
      element.classList.toggle("selected", isModuleGroupSelected(group));
    });
    updateModuleGroupButtonState();
  }

  function handleBoardPan(event) {
    if (event.pointerType === "touch" && boardTouchPointers.has(event.pointerId)) {
      trackBoardTouchPointer(event);
    }
    if (boardPinch) {
      handleBoardPinch(event);
      return;
    }
    if (!boardPan || !crossoverSchematicBoard) return;
    if (event.pointerId !== boardPan.pointerId) return;
    event.preventDefault();
    if (Math.hypot(event.clientX - boardPan.startX, event.clientY - boardPan.startY) > 3) {
      boardPan.moved = true;
      if (boardPan.placeCornerOnClick) {
        boardPan.placeCornerOnClick = false;
        wireMode = WIRE_MODE_IDLE;
        selectedNodeId = "";
        wireDraft = null;
        updateWiringState();
      }
    }
    cameraX = boardPan.cameraX + event.clientX - boardPan.startX;
    cameraY = boardPan.cameraY + event.clientY - boardPan.startY;
    updateBoardCamera();
  }

  function handleBoardPinch(event) {
    if (!boardPinch || !crossoverSchematicBoard) return;
    event.preventDefault();
    event.stopPropagation();
    const points = boardPinch.pointerIds.map((pointerId) => boardTouchPointers.get(pointerId)).filter(Boolean);
    if (points.length < 2) return;
    const metrics = boardPinchMetrics(points);
    const boardRect = crossoverSchematicBoard.getBoundingClientRect();
    const pointerX = metrics.midX - boardRect.left;
    const pointerY = metrics.midY - boardRect.top;
    cameraScale = clampNumber(boardPinch.startScale * (metrics.distance / boardPinch.startDistance), 0.25, 3);
    cameraX = pointerX - boardPinch.worldX * cameraScale;
    cameraY = pointerY - boardPinch.worldY * cameraScale;
    updateBoardCamera();
  }

  function finishBoardPan(event) {
    if (!boardPan) return;
    if (event.pointerId !== boardPan.pointerId) return;
    forgetBoardTouchPointer(event);
    const finishedPan = boardPan;
    clearBoardPanState(event.pointerId);
    if (finishedPan.placeCornerOnClick && !finishedPan.moved && event.type !== "pointercancel") {
      placeWireCorner(event, { ignoreButton: true });
    }
  }

  function clearBoardPanState(pointerId) {
    boardPan = null;
    crossoverSchematicBoard?.releasePointerCapture?.(pointerId);
    crossoverSchematicBoard?.classList.remove("is-panning");
    document.removeEventListener("pointermove", handleBoardPan);
    document.removeEventListener("pointerup", finishBoardPan);
    document.removeEventListener("pointercancel", finishBoardPan);
  }

  function finishBoardPinch(event) {
    forgetBoardTouchPointer(event);
    if (!boardPinch) return;
    if (!boardPinch.pointerIds.includes(event.pointerId) && boardTouchPointers.size >= 2) return;
    clearBoardPinchState();
  }

  function clearBoardPinchState() {
    boardPinch = null;
    boardTouchPointers = new Map();
    crossoverSchematicBoard?.classList.remove("is-panning");
    document.removeEventListener("pointermove", handleBoardPan);
    document.removeEventListener("pointerup", finishBoardPinch);
    document.removeEventListener("pointercancel", finishBoardPinch);
  }

  function handleBoardWheel(event) {
    if (!crossoverSchematicBoard || !crossoverSchematicBoard.querySelector(".crossover-schematic-canvas")) return;
    if (event.target.closest(".crossover-schematic-component")) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = crossoverSchematicBoard.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    const worldX = (pointerX - cameraX) / cameraScale;
    const worldY = (pointerY - cameraY) / cameraScale;
    const zoomStep = event.deltaY < 0 ? 1.12 : 1 / 1.12;
    cameraScale = clampNumber(cameraScale * zoomStep, 0.25, 3);
    cameraX = pointerX - worldX * cameraScale;
    cameraY = pointerY - worldY * cameraScale;
    updateBoardCamera();
    drawCurrentWires(activeCrossoverGroup()?.crossover?.circuit?.wires || []);
  }

  function panBoardCamera(deltaX, deltaY) {
    cameraX += deltaX;
    cameraY += deltaY;
    updateBoardCamera();
    drawCurrentWires(activeCrossoverGroup()?.crossover?.circuit?.wires || []);
  }

  function updateBoardCamera() {
    applyCamera(crossoverSchematicBoard?.querySelector(".crossover-schematic-canvas"));
    applyBoardBackground();
  }

  function applyCamera(canvas) {
    if (!canvas) return;
    canvas.style.transform = `translate(${cameraX}px, ${cameraY}px) scale(${cameraScale})`;
  }

  function applyBoardBackground() {
    if (!crossoverSchematicBoard) return;
    crossoverSchematicBoard.style.backgroundPosition = `${cameraX}px ${cameraY}px`;
    const gridSize = GRID_SIZE * cameraScale;
    crossoverSchematicBoard.style.backgroundSize = `${gridSize}px ${gridSize}px`;
  }

  function boardPointFromClient(clientX, clientY) {
    const boardRect = crossoverSchematicBoard?.getBoundingClientRect();
    if (!boardRect) return null;
    return {
      x: (clientX - boardRect.left - cameraX) / cameraScale,
      y: (clientY - boardRect.top - cameraY) / cameraScale,
    };
  }

  function nodeIdFromEventTarget(target) {
    return target?.closest?.("[data-node-id]")?.dataset?.nodeId || "";
  }

  function nodeIdFromViewportPoint(clientX, clientY) {
    return nodeIdFromEventTarget(document.elementFromPoint(clientX, clientY));
  }

  function wireIdFromEventTarget(target) {
    return target?.closest?.(".crossover-wire-hit")?.dataset?.wireId || "";
  }

  function syncWireTargetHighlight(event) {
    if (!isWireDrawingActive()) {
      clearWireTargetHighlight();
      return;
    }
    const target = document.elementFromPoint(event.clientX, event.clientY);
    const targetNode = target?.closest?.("[data-node-id]");
    const targetWire = target?.closest?.(".crossover-wire-hit")?.closest?.(".crossover-wire");
    crossoverSchematicBoard?.querySelectorAll(".wire-target").forEach((element) => {
      if (element !== targetNode && element !== targetWire) element.classList.remove("wire-target");
    });
    targetNode?.classList.add("wire-target");
    targetWire?.classList.add("wire-target");
  }

  function clearWireTargetHighlight() {
    crossoverSchematicBoard?.querySelectorAll(".wire-target").forEach((element) => element.classList.remove("wire-target"));
  }

  function suppressNextWireClick(wireId) {
    suppressedWireClick = { wireId, expiresAt: Date.now() + 300 };
  }

  function shouldSuppressWireClick(wireId) {
    if (!suppressedWireClick) return false;
    const shouldSuppress = suppressedWireClick.wireId === wireId && Date.now() <= suppressedWireClick.expiresAt;
    if (shouldSuppress || Date.now() > suppressedWireClick.expiresAt) suppressedWireClick = null;
    return shouldSuppress;
  }

  function updateWiringState() {
    if (wireMode === WIRE_MODE_WIRING && !selectedNodeId && !wireDraft) wireMode = WIRE_MODE_IDLE;
    crossoverSchematicBoard?.classList.toggle("is-wiring", isWireDrawingActive());
    crossoverSchematicBoard?.classList.toggle("is-wire-armed", wireMode === WIRE_MODE_ARMED);
    crossoverSchematicBoard?.classList.toggle("is-wire-active", wireMode === WIRE_MODE_WIRING);
    syncSelectedSchematicClasses();
  }

  function selectedSchematicObjectCount() {
    return selectedComponentIds.size + selectedNodeIds.size + selectedSpeakerIds.size;
  }

  function updateModuleGroupButtonState(enabled = Boolean(selectedCrossoverDesignId)) {
    syncSchematicToolbar({
      moduleGroupEnabled: Boolean(enabled) && selectedSchematicObjectCount() >= 2,
    });
  }

  function clampNumber(value, min, max) {
    return Math.min(Math.max(Number(value) || min, min), max);
  }

  function isEditableTarget(target) {
    return Boolean(target?.closest?.("input, textarea, select, button, [contenteditable='true']"));
  }

  function isTextEntryTarget(target) {
    return Boolean(target?.closest?.("input, textarea, select, [contenteditable='true']"));
  }

  function activeCrossoverGroup() {
    const activeDesign = getActiveDesign();
    const fallbackGroupId = activeDesign?.groupId || (activeDesign ? UNGROUPED_CROSSOVER_GROUP_ID : state.configGroups[0]?.id || UNGROUPED_CROSSOVER_GROUP_ID);
    const activeGroupId = getActiveCrossoverGroupId() || fallbackGroupId;
    return crossoverGroups().find((group) => group.id === activeGroupId)
      || crossoverGroups().find((group) => group.id === fallbackGroupId)
      || state.configGroups[0]
      || ungroupedCrossoverGroup();
  }

  function crossoverGroupMembers(group = activeCrossoverGroup()) {
    if (!group) return [];
    const memberGroupId = group.id === UNGROUPED_CROSSOVER_GROUP_ID ? UNGROUPED_CONFIG_GROUP_ID : group.id;
    return state.designs.filter((design) => (design.groupId || UNGROUPED_CONFIG_GROUP_ID) === memberGroupId);
  }

  function crossoverGroups() {
    return [
      ...state.configGroups,
      ungroupedCrossoverGroup(),
    ];
  }

  function ungroupedCrossoverGroup() {
    return {
      id: UNGROUPED_CROSSOVER_GROUP_ID,
      name: "No group",
      crossover: normalizeGroupCrossover(state.ungroupedCrossover),
    };
  }

  function mutableCrossoverGroup(project, group = activeCrossoverGroup()) {
    if (!group) return null;
    if (group.id === UNGROUPED_CROSSOVER_GROUP_ID) {
      project.ungroupedCrossover = normalizeGroupCrossover(project.ungroupedCrossover);
      return {
        id: UNGROUPED_CROSSOVER_GROUP_ID,
        get crossover() {
          return project.ungroupedCrossover;
        },
        set crossover(value) {
          project.ungroupedCrossover = value;
        },
      };
    }
    return project.configGroups.find((item) => item.id === group.id) || null;
  }

  function cssEscape(value) {
    return String(value).replace(/["\\]/g, "\\$&");
  }

  function isJunctionNodeId(nodeId) {
    return String(nodeId || "").startsWith("junction:");
  }

  return {
    renderCrossoverSchematic,
  };
}
