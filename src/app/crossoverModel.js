import {
  CROSSOVER_CIRCUIT_COMPONENT_DEFAULTS,
  CROSSOVER_CIRCUIT_COMPONENT_TYPES,
  CROSSOVER_DESIGN_BANDS,
  CROSSOVER_FAMILIES,
  CROSSOVER_ORDERS,
  SIGNAL_FILTER_DEFAULTS,
  SIGNAL_FILTER_TARGET_GROUP,
  SIGNAL_FILTER_TYPES,
  SUBSONIC_PRESETS,
} from "./constants.js";
import { clampCrossoverFrequency, clampDb, clampNumberValue } from "./crossoverUtils.js";
import {
  createCrossoverCircuitComponentId,
  createCrossoverCircuitWireId,
  createCrossoverDesignId,
  createCrossoverTransitionId,
  createSignalFilterId,
} from "./idUtils.js";

export function normalizeGroupCrossover(crossoverInput = {}) {
  const designs = Array.isArray(crossoverInput?.designs) ? crossoverInput.designs : [];
  const transitions = Array.isArray(crossoverInput?.transitions) ? crossoverInput.transitions : [];
  const signalFilters = Array.isArray(crossoverInput?.signalFilters) ? crossoverInput.signalFilters : [];
  return {
    designs: designs.map(normalizeCrossoverDesign).filter(Boolean),
    transitions: transitions
      .map((transition) => ({
        id: transition.id || createCrossoverTransitionId(),
        fromDesignId: String(transition.fromDesignId || ""),
        toDesignId: String(transition.toDesignId || ""),
        frequencyHz: clampCrossoverFrequency(transition.frequencyHz),
        family: CROSSOVER_FAMILIES.includes(transition.family) ? transition.family : "linkwitz-riley",
        order: CROSSOVER_ORDERS.includes(Number(transition.order)) ? Number(transition.order) : 4,
        enabled: transition.enabled !== false,
        showAnnotation: transition.showAnnotation !== false,
      }))
      .filter((transition) => transition.fromDesignId && transition.toDesignId && transition.fromDesignId !== transition.toDesignId),
    signalFilters: signalFilters.map(normalizeSignalFilter).filter(Boolean),
    circuit: normalizeCrossoverCircuit(crossoverInput?.circuit),
  };
}

export function normalizeCrossoverCircuit(circuitInput = {}) {
  const components = Array.isArray(circuitInput?.components)
    ? circuitInput.components.map(normalizeCrossoverCircuitComponent).filter(Boolean)
    : [];
  const nodes = Array.isArray(circuitInput?.nodes)
    ? circuitInput.nodes.map(normalizeCrossoverCircuitNode).filter(Boolean)
    : [];
  const componentPortIds = new Set(components.flatMap((component) => [
    crossoverCircuitComponentPortId(component.id, "a"),
    crossoverCircuitComponentPortId(component.id, "b"),
  ]));
  const wires = Array.isArray(circuitInput?.wires)
    ? circuitInput.wires
        .map(normalizeCrossoverCircuitWire)
        .filter((wire) => wire.from && wire.to && wire.from !== wire.to && (
          isCrossoverCircuitFixedNodeId(wire.from) || isCrossoverCircuitDesignNodeId(wire.from) || isCrossoverCircuitJunctionNodeId(wire.from) || componentPortIds.has(wire.from)
        ) && (
          isCrossoverCircuitFixedNodeId(wire.to) || isCrossoverCircuitDesignNodeId(wire.to) || isCrossoverCircuitJunctionNodeId(wire.to) || componentPortIds.has(wire.to)
        ))
    : [];
  return { components, wires, nodes };
}

export function normalizeCrossoverCircuitComponent(component = {}) {
  const type = CROSSOVER_CIRCUIT_COMPONENT_TYPES.includes(component.type) ? component.type : "resistor";
  const defaults = CROSSOVER_CIRCUIT_COMPONENT_DEFAULTS[type];
  return {
    id: component.id || createCrossoverCircuitComponentId(),
    type,
    value: clampNumberValue(component.value ?? defaults.value, defaults.min, defaults.max),
    x: clampNumberValue(component.x ?? 260, 40, 5000),
    y: clampNumberValue(component.y ?? 160, 40, 5000),
  };
}

export function normalizeCrossoverCircuitWire(wire = {}) {
  return {
    id: wire.id || createCrossoverCircuitWireId(),
    from: normalizeCrossoverCircuitWireNodeId(wire.from),
    to: normalizeCrossoverCircuitWireNodeId(wire.to),
  };
}

export function normalizeCrossoverCircuitNode(node = {}) {
  const id = normalizeCrossoverCircuitDesignNodeId(node.id) || String(node.id || "");
  if (!isCrossoverCircuitFixedNodeId(id) && !isCrossoverCircuitDesignNodeId(id) && !isCrossoverCircuitJunctionNodeId(id)) return null;
  return {
    id,
    x: clampNumberValue(node.x ?? 0, -5000, 5000),
    y: clampNumberValue(node.y ?? 0, -5000, 5000),
  };
}

export function crossoverCircuitComponentPortId(componentId, port) {
  return `component:${componentId}:${port === "b" ? "b" : "a"}`;
}

export function crossoverCircuitDesignNodeId(designId, pole = "positive") {
  return `design:${designId}:${pole === "negative" ? "negative" : "positive"}`;
}

export function crossoverCircuitFixedNodeId(node) {
  return `fixed:${node}`;
}

export function isCrossoverCircuitDesignNodeId(nodeId) {
  return Boolean(normalizeCrossoverCircuitDesignNodeId(nodeId));
}

export function isCrossoverCircuitFixedNodeId(nodeId) {
  return ["fixed:positive", "fixed:ground"].includes(String(nodeId || ""));
}

export function normalizeCrossoverCircuitWireNodeId(nodeId) {
  const value = String(nodeId || "");
  if (isCrossoverCircuitFixedNodeId(value)) return value;
  if (isCrossoverCircuitComponentPortId(value)) return value;
  if (isCrossoverCircuitJunctionNodeId(value)) return value;
  return normalizeCrossoverCircuitDesignNodeId(value) || value;
}

export function isCrossoverCircuitComponentPortId(nodeId) {
  return /^component:.+:(a|b)$/.test(String(nodeId || ""));
}

export function normalizeCrossoverCircuitDesignNodeId(nodeId) {
  const value = String(nodeId || "");
  if (!value.startsWith("design:")) return "";
  if (value === "design:") return "";
  if (value.endsWith(":positive") || value.endsWith(":negative")) return value;
  return `${value}:positive`;
}

export function crossoverCircuitJunctionNodeId(junctionId) {
  return String(junctionId || "").startsWith("junction:") ? String(junctionId) : `junction:${junctionId}`;
}

export function isCrossoverCircuitJunctionNodeId(nodeId) {
  return /^junction:.+/.test(String(nodeId || ""));
}

export function normalizeCrossoverDesign(design = {}) {
  return {
    id: design.id || createCrossoverDesignId(),
    enabled: design.enabled !== false,
  };
}

export function hasActiveCrossoverDesign(crossoverInput = {}) {
  const designs = Array.isArray(crossoverInput?.designs) ? crossoverInput.designs : [];
  return designs.some((design) => normalizeCrossoverDesign(design).enabled !== false);
}

export function normalizeCrossoverDesignAssignments(type, assignmentsInput = []) {
  const bands = crossoverDesignBands(type);
  const assignments = Array.isArray(assignmentsInput) ? assignmentsInput : [];
  return bands.map((band) => {
    const match = assignments.find((assignment) => assignment?.band === band);
    return {
      band,
      designId: String(match?.designId || ""),
    };
  });
}

export function crossoverDesignBands(type) {
  return CROSSOVER_DESIGN_BANDS[type] || CROSSOVER_DESIGN_BANDS["two-way"];
}

export function crossoverDesignBandLabel(type, band) {
  if (type === "sub-sat") {
    return { sub: "Sub", sat: "Sat" }[band] || band;
  }
  return { low: "Low", mid: "Mid", high: "High" }[band] || band;
}

export function crossoverDesignFiltersForDesignId(designCrossover, designId, memberDesignIds = []) {
  void designCrossover;
  void designId;
  void memberDesignIds;
  return [];
}

export function crossoverDesignBandForDesignId(designCrossover, designId, memberDesignIds = []) {
  const normalized = normalizeCrossoverDesign(designCrossover);
  const direct = normalized.assignments?.find((assignment) => assignment.designId === designId);
  if (direct?.band) return direct.band;
  const index = memberDesignIds.indexOf(designId);
  const bands = crossoverDesignBands(normalized.type);
  return index >= 0 && index < bands.length ? bands[index] : "";
}

export function normalizeSignalFilter(filter = {}) {
  const type = SIGNAL_FILTER_TYPES.includes(filter.type) ? filter.type : "parametric";
  const defaults = SIGNAL_FILTER_DEFAULTS[type] || SIGNAL_FILTER_DEFAULTS.parametric;
  const normalized = {
    id: filter.id || createSignalFilterId(),
    type,
    target: normalizeSignalFilterTarget(filter.target),
    enabled: filter.enabled !== false,
    showAnnotation: filter.showAnnotation !== false,
    ...defaults,
  };

  if (type === "parametric" || type === "low-shelf" || type === "high-shelf" || type === "subsonic") {
    normalized.frequencyHz = clampCrossoverFrequency(filter.frequencyHz ?? defaults.frequencyHz);
  }
  if (type === "parametric") {
    normalized.gainDb = clampDb(filter.gainDb ?? defaults.gainDb, -24, 24);
    normalized.q = clampNumberValue(filter.q ?? defaults.q, 0.1, 20);
  }
  if (type === "low-shelf" || type === "high-shelf") {
    normalized.gainDb = clampDb(filter.gainDb ?? defaults.gainDb, -24, 24);
    normalized.q = clampNumberValue(filter.q ?? defaults.q, 0.1, 4);
  }
  if (type === "subsonic") {
    normalized.preset = Object.hasOwn(SUBSONIC_PRESETS, filter.preset) ? filter.preset : defaults.preset;
    normalized.order = CROSSOVER_ORDERS.includes(Number(filter.order)) ? Number(filter.order) : defaults.order;
    normalized.family = CROSSOVER_FAMILIES.includes(filter.family) ? filter.family : defaults.family;
  }
  if (type === "linkwitz-transform") {
    normalized.sourceFrequencyHz = clampCrossoverFrequency(filter.sourceFrequencyHz ?? defaults.sourceFrequencyHz);
    normalized.sourceQ = clampNumberValue(filter.sourceQ ?? defaults.sourceQ, 0.1, 4);
    normalized.targetFrequencyHz = clampCrossoverFrequency(filter.targetFrequencyHz ?? defaults.targetFrequencyHz);
    normalized.targetQ = clampNumberValue(filter.targetQ ?? defaults.targetQ, 0.1, 4);
  }
  return normalized;
}

export function normalizeSignalFilterTarget(target) {
  const value = String(target || SIGNAL_FILTER_TARGET_GROUP);
  if (value === SIGNAL_FILTER_TARGET_GROUP || value.startsWith("design:") || value.startsWith("driverGroup:")) return value;
  return SIGNAL_FILTER_TARGET_GROUP;
}
