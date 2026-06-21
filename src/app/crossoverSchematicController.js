import { UNGROUPED_CROSSOVER_GROUP_ID, UNGROUPED_CONFIG_GROUP_ID } from "./constants.js";

const CROSSOVER_PRESET_TOOLTIPS = {
  "lowpass-2": "Insert a 2nd order low-pass block with series inductor and shunt capacitor.",
  "lowpass-3": "Insert a 3rd order low-pass block with two series inductors and a shunt capacitor.",
  "highpass-2": "Insert a 2nd order high-pass block with series capacitor and shunt inductor.",
  "highpass-3": "Insert a 3rd order high-pass block with two series capacitors and a shunt inductor.",
  "lowpass-1": "Insert a 1st order low-pass block with a series inductor.",
  "highpass-1": "Insert a 1st order high-pass block with a series capacitor.",
  lpad: "Insert an L-pad block with series and shunt resistors.",
  zobel: "Insert a Zobel impedance compensation block with series resistor and capacitor.",
  notch: "Insert a shunt RLC notch / trap block.",
  "baffle-step": "Insert a simple baffle-step compensation block with a bypass resistor around an inductor.",
};

const NEW_CROSSOVER_FOR_GROUP_OPTION = "__new_crossover_for_group__";

const CROSSOVER_SCHEMATIC_PRESETS = {
  "lowpass-1": {
    nodes: {
      input: { x: 24, y: 23 },
      output: { x: 286, y: 23 },
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
      input: { x: 24, y: 23 },
      output: { x: 286, y: 23 },
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
      input: { x: 24, y: 23 },
      output: { x: 286, y: 23 },
      return: { x: 300, y: 127 },
    },
    components: [
      { key: "series", type: "inductor", value: 0.68, x: 72, y: 0 },
      { key: "shunt", type: "capacitor", value: 10, x: 116, y: 104 },
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
      input: { x: 24, y: 23 },
      output: { x: 420, y: 23 },
      return: { x: 300, y: 127 },
    },
    components: [
      { key: "seriesA", type: "inductor", value: 0.56, x: 72, y: 0 },
      { key: "shunt", type: "capacitor", value: 10, x: 182, y: 104 },
      { key: "seriesB", type: "inductor", value: 0.33, x: 232, y: 0 },
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
      input: { x: 24, y: 23 },
      output: { x: 286, y: 23 },
      return: { x: 300, y: 127 },
    },
    components: [
      { key: "series", type: "capacitor", value: 10, x: 72, y: 0 },
      { key: "shunt", type: "inductor", value: 0.68, x: 116, y: 104 },
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
      input: { x: 24, y: 23 },
      output: { x: 420, y: 23 },
      return: { x: 300, y: 127 },
    },
    components: [
      { key: "seriesA", type: "capacitor", value: 8.2, x: 72, y: 0 },
      { key: "shunt", type: "inductor", value: 0.47, x: 182, y: 104 },
      { key: "seriesB", type: "capacitor", value: 4.7, x: 232, y: 0 },
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
      input: { x: 24, y: 23 },
      output: { x: 286, y: 23 },
      return: { x: 300, y: 127 },
    },
    components: [
      { key: "series", type: "resistor", value: 2.2, x: 72, y: 0 },
      { key: "shunt", type: "resistor", value: 8.2, x: 116, y: 104 },
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
      input: { x: 24, y: 23 },
      output: { x: 360, y: 23 },
      return: { x: 360, y: 127 },
    },
    components: [
      { key: "resistor", type: "resistor", value: 6.8, x: 104, y: 104 },
      { key: "capacitor", type: "capacitor", value: 10, x: 230, y: 104 },
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
      input: { x: 24, y: 23 },
      output: { x: 440, y: 23 },
      return: { x: 440, y: 151 },
    },
    components: [
      { key: "resistor", type: "resistor", value: 6.8, x: 92, y: 128 },
      { key: "capacitor", type: "capacitor", value: 6.8, x: 218, y: 128 },
      { key: "inductor", type: "inductor", value: 0.33, x: 344, y: 128 },
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
      input: { x: 24, y: 23 },
      output: { x: 330, y: 23 },
    },
    components: [
      { key: "inductor", type: "inductor", value: 1.0, x: 78, y: 0 },
      { key: "bypass", type: "resistor", value: 6.8, x: 78, y: 74 },
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
    CROSSOVER_CIRCUIT_COMPONENT_DEFAULTS,
    addCrossoverDesign = () => "",
    crossoverAddCapacitorButton,
    crossoverAddInductorButton,
    crossoverAddResistorButton,
    crossoverPresetButtons = [],
    crossoverCircuitComponentPortId,
    crossoverCircuitDesignNodeId,
    crossoverCircuitFixedNodeId,
    crossoverSchematicFilterSelect,
    crossoverSchematicBoard,
    designColorForDesign,
    enableDecimalTextInput,
    getActiveCrossoverGroupId,
    getActiveDesign,
    getSelectedCrossoverDesignId = () => "",
    getState,
    isMobileLayout = () => false,
    normalizeGroupCrossover,
    parseNumericInputValue,
    roundTo,
    setSelectedCrossoverDesignId = () => {},
    setTooltip,
  } = deps;

  const GRID_SIZE = 28;
  let state = getState();
  let selectedNodeId = "";
  let selectedCrossoverDesignId = "";
  let drag = null;
  let endpointDrag = null;
  let speakerDrag = null;
  let boardPan = null;
  let boardPinch = null;
  let boardTouchPointers = new Map();
  let selectionDrag = null;
  let selectionBox = null;
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
    crossoverAddResistorButton?.addEventListener("click", () => addComponent("resistor"));
    crossoverAddCapacitorButton?.addEventListener("click", () => addComponent("capacitor"));
    crossoverAddInductorButton?.addEventListener("click", () => addComponent("inductor"));
    crossoverPresetButtons.forEach((button) => {
      button.addEventListener("click", () => {
        addPreset(button.dataset.crossoverPreset);
        button.closest("details")?.removeAttribute("open");
      });
    });
    crossoverSchematicFilterSelect?.addEventListener("change", () => {
      if (crossoverSchematicFilterSelect.value === NEW_CROSSOVER_FOR_GROUP_OPTION) {
        const groupId = activeCrossoverGroup()?.id || "";
        const newDesignId = addCrossoverDesign();
        if (newDesignId) {
          selectedCrossoverDesignId = newDesignId;
          setSelectedCrossoverDesignId(groupId, selectedCrossoverDesignId);
        }
        crossoverSchematicFilterSelect.value = selectedCrossoverDesignId || "";
        return;
      }
      selectedCrossoverDesignId = crossoverSchematicFilterSelect.value || "";
      setSelectedCrossoverDesignId(activeCrossoverGroup()?.id || "", selectedCrossoverDesignId);
      selectedNodeId = "";
      clearSchematicSelection();
      lastRenderSignature = "";
      renderCrossoverSchematic();
    });
    crossoverSchematicBoard?.addEventListener("pointerdown", startBoardPan);
    crossoverSchematicBoard?.addEventListener("pointerdown", handleWireCancelPointer, { capture: true });
    crossoverSchematicBoard?.addEventListener("pointermove", handleBoardPointerMove);
    crossoverSchematicBoard?.addEventListener("wheel", handleBoardWheel, { passive: false });
    crossoverSchematicBoard?.addEventListener("contextmenu", handleWireCancelContextMenu, { capture: true });
    crossoverSchematicBoard?.addEventListener("contextmenu", suppressBoardContextMenu);
    crossoverSchematicBoard?.addEventListener("auxclick", (event) => {
      if (event.button === 1) event.preventDefault();
    });
    setTooltip(crossoverAddResistorButton, "Add a resistor to the crossover schematic.");
    setTooltip(crossoverAddCapacitorButton, "Add a capacitor to the crossover schematic.");
    setTooltip(crossoverAddInductorButton, "Add an inductor to the crossover schematic.");
    crossoverPresetButtons.forEach((button) => {
      setTooltip(button, CROSSOVER_PRESET_TOOLTIPS[button.dataset.crossoverPreset] || "Insert this preset schematic block.");
    });
    setTooltip(crossoverSchematicFilterSelect, "Choose which crossover design shows the schematic editor.");
  }

  function suppressBoardContextMenu(event) {
    event.preventDefault();
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
    return Boolean(selectedNodeId || wireDraft);
  }

  function cancelWireDrawing() {
    selectedNodeId = "";
    wireDraft = null;
    document.removeEventListener("pointermove", handleWirePaint);
    document.removeEventListener("pointerup", finishWirePaint);
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
      selectedNodeId = "";
      wireDraft = null;
      updateWiringState();
      const emptyRenderSignature = `empty:${group.id}:${(group.crossover?.designs || []).map((design) => design.id).join(",")}`;
      if (emptyRenderSignature !== lastRenderSignature || crossoverSchematicBoard.children.length > 0) {
        crossoverSchematicBoard.replaceChildren();
      }
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
    crossoverSchematicBoard.replaceChildren();

    const height = Math.max(360, 150 + Math.max(members.length * 2, circuit.components.length, 2) * 92);
    const width = Math.max(920, 520 + circuit.components.length * 36);
    crossoverSchematicBoard.style.setProperty("--schematic-width", `${width}px`);
    crossoverSchematicBoard.style.setProperty("--schematic-height", `${height}px`);

    const canvas = document.createElement("div");
    canvas.className = "crossover-schematic-canvas";
    applyCamera(canvas);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("crossover-schematic-wires");
    svg.setAttribute("aria-hidden", "true");
    canvas.append(svg);

    canvas.append(
      createEndpoint({
        id: crossoverCircuitFixedNodeId("positive"),
        label: "Vin",
        symbol: "voltage",
        ...endpointPosition(circuit, crossoverCircuitFixedNodeId("positive"), 42, 62),
        accent: "var(--accent)",
      }),
      createEndpoint({
        id: crossoverCircuitFixedNodeId("ground"),
        label: "GND",
        symbol: "ground",
        ...endpointPosition(circuit, crossoverCircuitFixedNodeId("ground"), 42, height - 88),
        accent: "var(--muted)",
      }),
    );

    members.forEach((design, index) => {
      const y = 86 + index * 118;
      const plusId = crossoverCircuitDesignNodeId(design.id, "positive");
      const minusId = crossoverCircuitDesignNodeId(design.id, "negative");
      const legacyPosition = endpointPosition(circuit, `design:${design.id}`, width - 176, y);
      const speakerPosition = endpointPosition(circuit, plusId, legacyPosition.x, legacyPosition.y);
      canvas.append(
        createSpeakerEndpoint({
          design,
          plusId,
          minusId,
          x: speakerPosition.x,
          y: speakerPosition.y,
          accent: designColorForDesign(design),
        }),
      );
    });

    circuit.components.forEach((component) => {
      canvas.append(createComponent(component));
    });
    circuit.nodes
      ?.filter((node) => isJunctionNodeId(node.id))
      .forEach((node) => {
        canvas.append(createJunctionNode(node));
      });

    crossoverSchematicBoard.append(canvas);
    applyBoardBackground();
    window.requestAnimationFrame(() => drawWires(svg, circuit.wires));
  }

  function syncCrossoverFilterSelect(group) {
    const designs = group.crossover?.designs || [];
    if (group.id !== lastSelectionGroupId) {
      selectedCrossoverDesignId = getSelectedCrossoverDesignId(group.id);
      selectedNodeId = "";
      clearSchematicSelection();
      lastSelectionGroupId = group.id;
    }
    if (!designs.some((design) => design.id === selectedCrossoverDesignId)) {
      if (selectedCrossoverDesignId) setSelectedCrossoverDesignId(group.id, "");
      selectedCrossoverDesignId = "";
    }
    if (crossoverSchematicFilterSelect) {
      const previousValue = crossoverSchematicFilterSelect.value;
      const nextSelectSignature = [
        "placeholder:Select crossover",
        ...designs.map((design, index) => `${design.id}:${crossoverFilterOptionLabel(design, index)}`),
        `action:${NEW_CROSSOVER_FOR_GROUP_OPTION}`,
      ].join("|");
      if (nextSelectSignature !== lastSelectSignature) {
        crossoverSchematicFilterSelect.replaceChildren(
          new Option("Select crossover", ""),
          ...designs.map((design, index) => new Option(crossoverFilterOptionLabel(design, index), design.id)),
          new Option("New Crossover for this Group", NEW_CROSSOVER_FOR_GROUP_OPTION),
        );
        lastSelectSignature = nextSelectSignature;
      }
      crossoverSchematicFilterSelect.value = selectedCrossoverDesignId;
      if (previousValue !== crossoverSchematicFilterSelect.value) selectedNodeId = "";
    }
    return designs.find((design) => design.id === selectedCrossoverDesignId) || null;
  }

  function crossoverFilterOptionLabel(design, index) {
    const stateLabel = design.enabled === false ? " off" : "";
    return `${index + 1}. Crossover design${stateLabel}`;
  }

  function setSchematicToolsEnabled(enabled) {
    [crossoverAddResistorButton, crossoverAddCapacitorButton, crossoverAddInductorButton, ...crossoverPresetButtons]
      .filter(Boolean)
      .forEach((button) => {
        button.disabled = !enabled;
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

  function createEndpoint({ id, label, symbol, x, y, accent }) {
    const endpoint = document.createElement("button");
    endpoint.type = "button";
    endpoint.className = `crossover-schematic-endpoint endpoint-${symbol || "node"}`;
    endpoint.dataset.nodeId = id;
    endpoint.style.left = `${x}px`;
    endpoint.style.top = `${y}px`;
    endpoint.style.setProperty("--node-color", accent);
    endpoint.classList.toggle("selected", selectedNodeId === id || selectedNodeIds.has(id));
    endpoint.ariaLabel = `${label} terminal`;

    const symbolShell = document.createElement("span");
    symbolShell.className = "crossover-endpoint-symbol";
    symbolShell.append(createEndpointSymbol(symbol));

    const labelElement = document.createElement("span");
    labelElement.className = "crossover-endpoint-label";
    labelElement.textContent = label;

    endpoint.append(symbolShell, labelElement);
    setTooltip(endpoint, "Click one endpoint, then another endpoint to create a wire.");
    endpoint.addEventListener("pointerdown", (event) => startEndpointDrag(event, id));
    return endpoint;
  }

  function createEndpointSymbol(symbol) {
    const svg = svgElement("svg", {
      class: "crossover-endpoint-symbol-svg",
      viewBox: "0 0 54 46",
      "aria-hidden": "true",
    });
    if (symbol === "ground") {
      svg.append(
        svgElement("path", { class: "endpoint-stroke", d: "M27 8 V22" }),
        svgElement("path", { class: "endpoint-stroke", d: "M14 22 H40" }),
        svgElement("path", { class: "endpoint-stroke", d: "M18 29 H36" }),
        svgElement("path", { class: "endpoint-stroke", d: "M23 36 H31" }),
      );
      return svg;
    }
    svg.append(
      svgElement("circle", { class: "endpoint-stroke", cx: "27", cy: "23", r: "15" }),
      svgElement("path", { class: "endpoint-stroke", d: "M27 15 V23" }),
      svgElement("path", { class: "endpoint-stroke", d: "M21 19 H33" }),
      svgElement("path", { class: "endpoint-stroke endpoint-muted-stroke", d: "M21 29 H33" }),
    );
    return svg;
  }

  function createSpeakerEndpoint({ design, plusId, minusId, x, y, accent }) {
    const speaker = document.createElement("article");
    speaker.className = "crossover-schematic-speaker";
    speaker.dataset.speakerDesignId = design.id;
    speaker.dataset.plusNodeId = plusId;
    speaker.dataset.minusNodeId = minusId;
    speaker.style.left = `${x}px`;
    speaker.style.top = `${y}px`;
    speaker.style.setProperty("--node-color", accent);
    speaker.classList.toggle("selected", selectedSpeakerIds.has(design.id) || selectedNodeId === plusId || selectedNodeId === minusId);
    setTooltip(speaker, "Drag this speaker endpoint. Use the plus or minus terminal to create wires.");
    speaker.addEventListener("pointerdown", (event) => startSpeakerDrag(event, design.id, plusId, minusId));

    const name = document.createElement("div");
    name.className = "crossover-speaker-name";
    name.textContent = design.name;

    const symbol = document.createElement("div");
    symbol.className = "crossover-speaker-symbol";
    symbol.append(createSpeakerSymbol());

    speaker.append(
      createSpeakerPort(plusId, "positive", "+"),
      createSpeakerPort(minusId, "negative", "-"),
      symbol,
      name,
    );
    return speaker;
  }

  function createSpeakerPort(nodeId, pole, label) {
    const port = document.createElement("button");
    port.type = "button";
    port.className = `crossover-speaker-port speaker-port-${pole}`;
    port.dataset.nodeId = nodeId;
    port.textContent = label;
    port.classList.toggle("selected", selectedNodeId === nodeId);
    port.ariaLabel = pole === "positive" ? "Speaker plus terminal" : "Speaker minus terminal";
    setTooltip(port, `Click the speaker ${label} terminal to create a wire.`);
    port.addEventListener("pointerdown", (event) => startWirePaint(event, nodeId));
    return port;
  }

  function createSpeakerSymbol() {
    const svg = svgElement("svg", {
      class: "crossover-speaker-symbol-svg",
      viewBox: "0 0 58 46",
      "aria-hidden": "true",
    });
    svg.append(
      svgElement("path", { class: "speaker-stroke", d: "M8 17 H19 L34 7 V39 L19 29 H8 Z" }),
      svgElement("path", { class: "speaker-stroke", d: "M40 15 C46 20 46 26 40 31" }),
      svgElement("path", { class: "speaker-stroke speaker-wave", d: "M46 10 C56 19 56 27 46 36" }),
    );
    return svg;
  }

  function createJunctionNode(node) {
    const junction = document.createElement("button");
    junction.type = "button";
    junction.className = "crossover-schematic-junction";
    junction.dataset.nodeId = node.id;
    junction.style.left = `${node.x}px`;
    junction.style.top = `${node.y}px`;
    junction.classList.toggle("selected", selectedNodeId === node.id || selectedNodeIds.has(node.id));
    junction.ariaLabel = "Wire junction";
    junction.addEventListener("pointerdown", (event) => startEndpointDrag(event, node.id));
    const deleteJunctionFromPointer = (event) => {
      if (event.button !== 2) return;
      event.preventDefault();
      event.stopPropagation();
      deleteJunctionNode(node.id);
    };
    junction.addEventListener("mousedown", deleteJunctionFromPointer);
    junction.addEventListener("pointerdown", deleteJunctionFromPointer);
    junction.addEventListener("auxclick", deleteJunctionFromPointer);
    junction.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      event.stopPropagation();
      deleteJunctionNode(node.id);
    });
    return junction;
  }

  function endpointPosition(circuit, id, fallbackX, fallbackY) {
    const node = circuit.nodes?.find((item) => item.id === id);
    return {
      x: Number.isFinite(node?.x) ? node.x : fallbackX,
      y: Number.isFinite(node?.y) ? node.y : fallbackY,
    };
  }

  function createComponent(component) {
    const defaults = CROSSOVER_CIRCUIT_COMPONENT_DEFAULTS[component.type] || CROSSOVER_CIRCUIT_COMPONENT_DEFAULTS.resistor;
    const item = document.createElement("article");
    item.className = `crossover-schematic-component schematic-${component.type}`;
    item.dataset.componentId = component.id;
    item.style.left = `${component.x}px`;
    item.style.top = `${component.y}px`;
    item.classList.toggle("selected", selectedComponentIds.has(component.id));
    item.addEventListener("pointerdown", (event) => startComponentDrag(event, component.id));
    const deleteComponentFromPointer = (event) => {
      if (event.button !== 2) return;
      event.preventDefault();
      event.stopPropagation();
      deleteComponent(component.id);
    };
    item.addEventListener("mousedown", deleteComponentFromPointer);
    item.addEventListener("pointerdown", deleteComponentFromPointer);
    item.addEventListener("auxclick", deleteComponentFromPointer);
    item.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      event.stopPropagation();
      deleteComponent(component.id);
    });

    const portA = createPort(crossoverCircuitComponentPortId(component.id, "a"), "left");
    const portB = createPort(crossoverCircuitComponentPortId(component.id, "b"), "right");
    const preview = document.createElement("div");
    preview.className = "crossover-component-preview";

    const nameLabel = document.createElement("div");
    nameLabel.className = "crossover-component-name";
    nameLabel.textContent = componentTypeLabel(component.type);

    const symbol = document.createElement("div");
    symbol.className = "crossover-component-symbol";
    symbol.append(createSchematicSymbol(component.type));
    setTooltip(symbol, "Drag this component to position it on the schematic.");

    const valueLabel = document.createElement("div");
    valueLabel.className = "crossover-component-value";
    valueLabel.textContent = formatComponentValue(component, defaults);
    preview.append(nameLabel, symbol, valueLabel);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "crossover-component-delete";
    deleteButton.textContent = "x";
    setTooltip(deleteButton, "Delete this component and its connected wires.");
    deleteButton.addEventListener("click", () => deleteComponent(component.id));

    const controls = document.createElement("div");
    controls.className = "crossover-component-controls";
    const range = document.createElement("input");
    range.type = "range";
    range.min = String(defaults.min);
    range.max = String(defaults.max);
    range.step = String(defaults.step);
    range.value = String(component.value);
    range.dataset.componentValue = component.id;
    setTooltip(range, "Adjust the component value.");

    const number = document.createElement("input");
    number.type = "number";
    enableDecimalTextInput(number);
    number.min = String(defaults.min);
    number.max = String(defaults.max);
    number.step = String(defaults.step);
    number.value = String(roundTo(component.value, defaults.step < 0.1 ? 3 : 2));
    number.dataset.componentValue = component.id;
    setTooltip(number, "Set the component value.");

    const unit = document.createElement("span");
    unit.textContent = defaults.unit;

    const applyComponentValue = (value) => {
      const clamped = clampComponentValue(value, defaults);
      range.value = String(clamped);
      number.value = String(roundTo(clamped, defaults.step < 0.1 ? 3 : 2));
      valueLabel.textContent = formatComponentValue({ ...component, value: clamped }, defaults);
      updateComponent(component.id, { value: clamped }, { replaceHistory: true, renderControls: false });
    };
    range.addEventListener("input", () => {
      applyComponentValue(Number(range.value));
    });
    range.addEventListener("wheel", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const step = Number(defaults.step) || 1;
      const multiplier = event.shiftKey ? 10 : 1;
      const direction = event.deltaY < 0 ? 1 : -1;
      applyComponentValue(Number(range.value) + direction * step * multiplier);
    }, { passive: false });
    number.addEventListener("input", () => {
      const value = parseNumericInputValue(number);
      if (!Number.isFinite(value)) return;
      applyComponentValue(value);
    });

    controls.append(range, number, unit);
    item.append(portA, preview, portB, deleteButton, controls);
    return item;
  }

  function componentTypeLabel(type) {
    if (type === "capacitor") return "Capacitor";
    if (type === "inductor") return "Inductor";
    return "Resistor";
  }

  function createSchematicSymbol(type) {
    const svg = svgElement("svg", {
      class: "crossover-component-symbol-svg",
      viewBox: "0 0 132 42",
      preserveAspectRatio: "none",
      "aria-hidden": "true",
    });
    svg.append(svgElement("path", { class: "symbol-lead", d: "M0 21 H20" }));
    svg.append(svgElement("path", { class: "symbol-lead", d: "M112 21 H132" }));
    if (type === "capacitor") {
      svg.append(
        svgElement("path", { class: "symbol-stroke", d: "M20 21 H54 M54 8 V34 M78 8 V34 M78 21 H112" }),
      );
    } else if (type === "inductor") {
      svg.append(
        svgElement("path", { class: "symbol-stroke", d: "M20 21 C20 7 38 7 38 21 C38 35 56 35 56 21 C56 7 74 7 74 21 C74 35 92 35 92 21 C92 7 110 7 112 21" }),
      );
    } else {
      svg.append(
        svgElement("polyline", {
          class: "symbol-stroke",
          points: "20,21 28,9 40,33 52,9 64,33 76,9 88,33 100,9 112,21",
        }),
      );
    }
    return svg;
  }

  function svgElement(tagName, attributes = {}) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", tagName);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    return element;
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

  function createPort(nodeId, side) {
    const port = document.createElement("button");
    port.type = "button";
    port.className = `crossover-component-port port-${side}`;
    port.dataset.nodeId = nodeId;
    port.classList.toggle("selected", selectedNodeId === nodeId);
    port.ariaLabel = side === "left" ? "Component input node" : "Component output node";
    setTooltip(port, "Click one port, then another port or endpoint to create a wire.");
    port.addEventListener("pointerdown", (event) => startWirePaint(event, nodeId));
    return port;
  }

  function handleNodeClick(nodeId) {
    if (!selectedNodeId) {
      startWireFromNode(nodeId);
      return;
    }
    if (selectedNodeId === nodeId) {
      selectedNodeId = "";
      wireDraft = null;
      updateWiringState();
      renderCrossoverSchematic();
      return;
    }
    const fromNodeId = selectedNodeId;
    selectedNodeId = "";
    wireDraft = null;
    updateWiringState();
    addWire(fromNodeId, nodeId);
  }

  function drawWires(svg, wires) {
    if (!svg || !crossoverSchematicBoard) return;
    svg.replaceChildren();
    const boardRect = svg.closest(".crossover-schematic-canvas")?.getBoundingClientRect();
    if (!boardRect) return;
    const connectedWireIdsByWireId = wireNetworkIdsByWireId(wires);
    currentWireNetworkIdsByWireId = connectedWireIdsByWireId;
    preserveExistingWireHover(wires);
    wires.forEach((wire) => {
      const from = crossoverSchematicBoard.querySelector(`[data-node-id="${cssEscape(wire.from)}"]`);
      const to = crossoverSchematicBoard.querySelector(`[data-node-id="${cssEscape(wire.to)}"]`);
      if (!from || !to) return;
      const fromRect = from.getBoundingClientRect();
      const toRect = to.getBoundingClientRect();
      const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const fromPoint = wireAnchorPoint(from, fromRect, boardRect);
      const toPoint = wireAnchorPoint(to, toRect, boardRect);
      const x1 = fromPoint.x;
      const y1 = fromPoint.y;
      const x2 = toPoint.x;
      const y2 = toPoint.y;
      const wireGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
      const hitLine = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const pathD = wirePathD(x1, y1, x2, y2);
      wireGroup.classList.add("crossover-wire");
      wireGroup.dataset.wireId = wire.id;
      const isHovered = hoveredWireIds.has(wire.id);
      wireGroup.classList.toggle("network-hovered", isHovered);
      wireGroup.classList.toggle("hovered", isHovered);
      hitLine.classList.add("crossover-wire-hit");
      hitLine.dataset.wireId = wire.id;
      hitLine.setAttribute("d", pathD);
      line.classList.add("crossover-wire-line");
      line.dataset.wireId = wire.id;
      line.setAttribute("d", pathD);
      const deleteWireFromPointer = (event) => {
        if (event.button !== 2) return;
        event.preventDefault();
        event.stopPropagation();
        deleteWire(wire.id);
      };
      const setWireHover = (event) => {
        lastWirePointer = { x: event.clientX, y: event.clientY };
        highlightWireNetwork(connectedWireIdsByWireId.get(wire.id) || new Set([wire.id]));
      };
      const clearWireHover = (event) => {
        lastWirePointer = { x: event.clientX, y: event.clientY };
        scheduleWireNetworkHighlightClear();
      };
      hitLine.addEventListener("pointerenter", setWireHover);
      hitLine.addEventListener("pointermove", setWireHover);
      hitLine.addEventListener("pointerleave", clearWireHover);
      hitLine.addEventListener("mousedown", deleteWireFromPointer);
      hitLine.addEventListener("pointerdown", deleteWireFromPointer);
      hitLine.addEventListener("auxclick", deleteWireFromPointer);
      hitLine.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (shouldSuppressWireClick(wire.id)) return;
        addWireJunction(wire.id, event, { connectFromNodeId: isWireDrawingActive() ? selectedNodeId : "" });
      });
      hitLine.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        event.stopPropagation();
        deleteWire(wire.id);
      });
      wireGroup.append(hitLine, line);
      svg.append(wireGroup);
    });
    drawWireDraft(svg, boardRect);
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

  function drawWireDraft(svg, boardRect) {
    if (!wireDraft?.point || !wireDraft.fromNodeId) return;
    const from = crossoverSchematicBoard.querySelector(`[data-node-id="${cssEscape(wireDraft.fromNodeId)}"]`);
    if (!from) return;
    const fromPoint = wireAnchorPoint(from, from.getBoundingClientRect(), boardRect);
    const toPoint = constrainedWirePoint(fromPoint, wireDraft.point);
    const preview = document.createElementNS("http://www.w3.org/2000/svg", "path");
    preview.classList.add("crossover-wire-preview");
    preview.setAttribute("d", wireSegmentD(fromPoint.x, fromPoint.y, toPoint.x, toPoint.y));
    svg.append(preview);
  }

  function wirePathD(x1, y1, x2, y2) {
    if (Math.abs(x1 - x2) < 1 || Math.abs(y1 - y2) < 1) return wireSegmentD(x1, y1, x2, y2);
    const midX = (x1 + x2) / 2;
    return `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`;
  }

  function wireSegmentD(x1, y1, x2, y2) {
    if (Math.abs(x1 - x2) >= Math.abs(y1 - y2)) return `M ${x1} ${y1} H ${x2}`;
    return `M ${x1} ${y1} V ${y2}`;
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

  function startWireFromNode(nodeId, point = null) {
    selectedNodeId = nodeId;
    wireDraft = {
      fromNodeId: nodeId,
      point: point || nodeAnchorCanvasPoint(nodeId),
      activePress: false,
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
    const origin = schematicInsertionOrigin(circuit.components.length);
    const nodes = {};
    Object.entries(preset.nodes).forEach(([key, point]) => {
      const id = `junction:${createCrossoverCircuitJunctionId()}`;
      nodes[key] = id;
      circuit.nodes.push({
        id,
        x: origin.x + point.x - 6,
        y: origin.y + point.y - 6,
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
      circuit.wires.push({ id: createCrossoverCircuitWireId(), from: fromNode, to: toNode });
    });
    selectedNodeId = "";
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

  function schematicInsertionOrigin(componentCount = 0) {
    const boardRect = crossoverSchematicBoard?.getBoundingClientRect();
    if (!boardRect) {
      return { x: 230 + (componentCount % 4) * 138, y: 88 + Math.floor(componentCount / 4) * 118 };
    }
    return {
      x: Math.max(80, (boardRect.width / 2 - cameraX) / cameraScale - 180 + (componentCount % 3) * 24),
      y: Math.max(70, (boardRect.height / 2 - cameraY) / cameraScale - 80 + (componentCount % 4) * 24),
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

  function appendUniqueWire(circuit, from, to) {
    if (!from || !to || from === to) return false;
    const exists = circuit.wires.some((wire) =>
      (wire.from === from && wire.to === to) || (wire.from === to && wire.to === from)
    );
    if (exists) return false;
    circuit.wires.push({ id: createCrossoverCircuitWireId(), from, to });
    return true;
  }

  function addWireToJunction(from, point, options = {}) {
    const group = activeCrossoverGroup();
    if (!group) return;
    const nextState = cloneProject(state);
    const nextGroup = mutableCrossoverGroup(nextState, group);
    if (!nextGroup) return;
    nextGroup.crossover = normalizeGroupCrossover(nextGroup.crossover);
    const junctionId = `junction:${createCrossoverCircuitJunctionId()}`;
    nextGroup.crossover.circuit.nodes.push({ id: junctionId, x: point.x - 6, y: point.y - 6 });
    nextGroup.crossover.circuit.wires.push({ id: createCrossoverCircuitWireId(), from, to: junctionId });
    selectedNodeId = junctionId;
    wireDraft = options.continueDrawing
      ? { fromNodeId: junctionId, point: options.draftPoint || point, activePress: false }
      : null;
    updateWiringState();
    commitState(nextState, { renderControls: false });
  }

  function addWireJunction(wireId, event, options = {}) {
    const group = activeCrossoverGroup();
    if (!group) return;
    const canvasPoint = boardPointFromClient(event.clientX, event.clientY);
    if (!canvasPoint) return;
    const nextState = cloneProject(state);
    const nextGroup = mutableCrossoverGroup(nextState, group);
    if (!nextGroup) return;
    nextGroup.crossover = normalizeGroupCrossover(nextGroup.crossover);
    const wire = nextGroup.crossover.circuit.wires.find((item) => item.id === wireId);
    if (!wire) return;
    const junctionId = `junction:${createCrossoverCircuitJunctionId()}`;
    const x = canvasPoint.x - 6;
    const y = canvasPoint.y - 6;
    const circuit = nextGroup.crossover.circuit;
    circuit.nodes.push({ id: junctionId, x, y });
    circuit.wires = circuit.wires
      .filter((item) => item.id !== wireId)
      .concat([
        { id: createCrossoverCircuitWireId(), from: wire.from, to: junctionId },
        { id: createCrossoverCircuitWireId(), from: junctionId, to: wire.to },
      ]);
    if (options.connectFromNodeId) {
      appendUniqueWire(circuit, options.connectFromNodeId, junctionId);
      selectedNodeId = "";
      wireDraft = null;
    } else {
      selectedNodeId = junctionId;
    }
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
    wireDraft = null;
    updateWiringState();
    commitState(nextState, { renderControls: false });
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
    selectedNodeId = nodeId;
    const point = boardPointFromClient(event.clientX, event.clientY);
    wireDraft = {
      fromNodeId: nodeId,
      point,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      activePress: true,
    };
    updateWiringState();
    drawCurrentWires(activeCrossoverGroup()?.crossover?.circuit?.wires || []);
    document.addEventListener("pointermove", handleWirePaint);
    document.addEventListener("pointerup", finishWirePaint);
  }

  function handleWirePaint(event) {
    if (!wireDraft?.activePress) return;
    const distance = Math.hypot(event.clientX - wireDraft.startX, event.clientY - wireDraft.startY);
    if (distance > 3) wireDraft.moved = true;
    const point = boardPointFromClient(event.clientX, event.clientY);
    if (!point) return;
    wireDraft.point = point;
    drawCurrentWires(activeCrossoverGroup()?.crossover?.circuit?.wires || []);
  }

  function finishWirePaint(event) {
    if (!wireDraft?.activePress) return;
    const draft = wireDraft;
    document.removeEventListener("pointermove", handleWirePaint);
    document.removeEventListener("pointerup", finishWirePaint);

    const targetNodeId = nodeIdFromEventTarget(event.target);
    const group = activeCrossoverGroup();
    const wires = group?.crossover?.circuit?.wires || [];
    const fromElement = crossoverSchematicBoard?.querySelector(`[data-node-id="${cssEscape(draft.fromNodeId)}"]`);
    const boardRect = crossoverSchematicBoard?.querySelector(".crossover-schematic-canvas")?.getBoundingClientRect();
    const point = draft.point;
    wireDraft = null;

    if (!draft.moved) {
      startWireFromNode(draft.fromNodeId, point);
      return;
    }

    if (targetNodeId && targetNodeId !== draft.fromNodeId) {
      selectedNodeId = "";
      updateWiringState();
      addWire(draft.fromNodeId, targetNodeId);
      return;
    }

    const targetWireId = wireIdFromEventTarget(event.target);
    if (targetWireId) {
      event.preventDefault();
      event.stopPropagation();
      selectedNodeId = "";
      updateWiringState();
      suppressNextWireClick(targetWireId);
      addWireJunction(targetWireId, event, { connectFromNodeId: draft.fromNodeId });
      return;
    }

    if (fromElement && boardRect && point) {
      const fromPoint = wireAnchorPoint(fromElement, fromElement.getBoundingClientRect(), boardRect);
      const cornerPoint = constrainedWirePoint(fromPoint, point);
      addWireToJunction(draft.fromNodeId, cornerPoint, { continueDrawing: true, draftPoint: cornerPoint });
      return;
    }

    selectedNodeId = draft.fromNodeId;
    updateWiringState();
    drawCurrentWires(wires);
  }

  function handleBoardPointerMove(event) {
    if (!selectedNodeId || wireDraft?.activePress || drag || endpointDrag || speakerDrag || boardPan) return;
    const point = boardPointFromClient(event.clientX, event.clientY);
    if (!point) return;
    wireDraft = { fromNodeId: selectedNodeId, point, activePress: false };
    updateWiringState();
    drawCurrentWires(activeCrossoverGroup()?.crossover?.circuit?.wires || []);
  }

  function placeWireCorner(event, options = {}) {
    if (!selectedNodeId || (!options.ignoreButton && event.button !== 0)) return;
    event.preventDefault();
    event.stopPropagation();
    const point = boardPointFromClient(event.clientX, event.clientY);
    const boardRect = crossoverSchematicBoard?.querySelector(".crossover-schematic-canvas")?.getBoundingClientRect();
    const fromElement = crossoverSchematicBoard?.querySelector(`[data-node-id="${cssEscape(selectedNodeId)}"]`);
    if (!point || !boardRect || !fromElement) return;
    const fromPoint = wireAnchorPoint(fromElement, fromElement.getBoundingClientRect(), boardRect);
    const cornerPoint = constrainedWirePoint(fromPoint, point);
    addWireToJunction(selectedNodeId, cornerPoint, { continueDrawing: true, draftPoint: cornerPoint });
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
    selectedNodeId = "";
    wireDraft = null;
    if (!selectedComponentIds.has(componentId)) {
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
    if (selectedNodeIds.has(nodeId)) {
      event.preventDefault();
      event.stopPropagation();
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
    if (selectedSpeakerIds.has(designId)) {
      event.preventDefault();
      event.stopPropagation();
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
    if (!event.ctrlKey) return { x: rawX, y: rawY };
    return {
      x: Math.round(rawX / GRID_SIZE) * GRID_SIZE,
      y: Math.round(rawY / GRID_SIZE) * GRID_SIZE,
    };
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
      selectedNodeId = "";
      wireDraft = null;
      updateWiringState();
    }
    const boardRect = crossoverSchematicBoard.getBoundingClientRect();
    selectionDrag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      boardLeft: boardRect.left,
      boardTop: boardRect.top,
      moved: false,
      placeCornerOnClick: Boolean(options.placeCornerOnClick),
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    clearSchematicSelection();
    selectionBox = document.createElement("div");
    selectionBox.className = "crossover-selection-box";
    crossoverSchematicBoard.append(selectionBox);
    updateSelectionBox(event);
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
    updateSelectionBox(event);
    selectComponentsInBox(selectionRectFromEvent(event));
  }

  function finishBoardSelection(event) {
    if (!selectionDrag) return;
    if (event.pointerId !== selectionDrag.pointerId) return;
    const moved = selectionDrag.moved;
    const placeCornerOnClick = selectionDrag.placeCornerOnClick;
    if (moved) {
      if (placeCornerOnClick) {
        selectedNodeId = "";
        wireDraft = null;
        updateWiringState();
      }
      selectComponentsInBox(selectionRectFromEvent(event));
    } else if (placeCornerOnClick) {
      placeWireCorner(event);
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
    selectionBox?.remove();
    selectionBox = null;
    crossoverSchematicBoard?.classList.remove("is-selecting");
    document.removeEventListener("pointermove", handleBoardSelection);
    document.removeEventListener("pointerup", finishBoardSelection);
    document.removeEventListener("pointercancel", cancelBoardSelection);
  }

  function updateSelectionBox(event) {
    if (!selectionDrag || !selectionBox) return;
    const rect = selectionRectFromEvent(event);
    selectionBox.style.left = `${rect.left - selectionDrag.boardLeft}px`;
    selectionBox.style.top = `${rect.top - selectionDrag.boardTop}px`;
    selectionBox.style.width = `${rect.width}px`;
    selectionBox.style.height = `${rect.height}px`;
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
        selectedNodeId = "";
        wireDraft = null;
        updateWiringState();
      }
    }
    cameraX = boardPan.cameraX + event.clientX - boardPan.startX;
    cameraY = boardPan.cameraY + event.clientY - boardPan.startY;
    applyCamera(crossoverSchematicBoard.querySelector(".crossover-schematic-canvas"));
    applyBoardBackground();
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
    applyCamera(crossoverSchematicBoard.querySelector(".crossover-schematic-canvas"));
    applyBoardBackground();
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
    applyCamera(crossoverSchematicBoard.querySelector(".crossover-schematic-canvas"));
    applyBoardBackground();
    drawCurrentWires(activeCrossoverGroup()?.crossover?.circuit?.wires || []);
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

  function wireIdFromEventTarget(target) {
    return target?.closest?.(".crossover-wire-hit")?.dataset?.wireId || "";
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
    crossoverSchematicBoard?.classList.toggle("is-wiring", Boolean(selectedNodeId || wireDraft));
  }

  function clampNumber(value, min, max) {
    return Math.min(Math.max(Number(value) || min, min), max);
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
