import { C, solveLinearSystem } from "../core/complex.js";
import {
  crossoverCircuitComponentPortId,
  crossoverCircuitDesignNodeId,
  crossoverCircuitFixedNodeId,
  normalizeCrossoverCircuit,
} from "./crossoverModel.js";

const GROUND_NODE = crossoverCircuitFixedNodeId("ground");
const POSITIVE_NODE = crossoverCircuitFixedNodeId("positive");
const GMIN = 1e-12;

export function crossoverCircuitResponses(circuitInput = {}, frequencies = [], designLoads = []) {
  const circuit = normalizeCrossoverCircuit(circuitInput);
  if (!hasRoutableCircuit(circuit)) return new Map();

  const loads = designLoads
    .filter((load) => load?.designId && Array.isArray(load.impedance))
    .map((load) => ({
      designId: load.designId,
      plus: crossoverCircuitDesignNodeId(load.designId, "positive"),
      minus: crossoverCircuitDesignNodeId(load.designId, "negative"),
      impedance: load.impedance,
    }));
  if (!loads.length) return new Map();

  const responses = new Map(loads.map((load) => [load.designId, {
    voltage: [],
    inputImpedance: [],
  }]));

  frequencies.forEach((frequency, index) => {
    const result = solveCrossoverCircuitAtFrequency(circuit, frequency, loads, index);
    loads.forEach((load) => {
      const response = responses.get(load.designId);
      response.voltage.push(result.loadVoltages.get(load.designId) || C(0));
      response.inputImpedance.push(result.inputImpedance);
    });
  });

  return responses;
}

export function solveCrossoverCircuitAtFrequency(circuitInput = {}, frequency = 1000, designLoads = [], frequencyIndex = 0) {
  const circuit = normalizeCrossoverCircuit(circuitInput);
  const elements = [
    ...circuit.components.map((component) => ({
      from: crossoverCircuitComponentPortId(component.id, "a"),
      to: crossoverCircuitComponentPortId(component.id, "b"),
      impedance: componentImpedance(component, frequency),
    })),
    ...designLoads.map((load) => ({
      from: load.plus || crossoverCircuitDesignNodeId(load.designId, "positive"),
      to: load.minus || crossoverCircuitDesignNodeId(load.designId, "negative"),
      impedance: loadImpedanceAt(load.impedance, frequencyIndex),
      loadDesignId: load.designId,
    })),
  ].filter((element) => element.from && element.to && element.impedance?.abs?.() > 0);

  const union = createUnionFind();
  [GROUND_NODE, POSITIVE_NODE].forEach((node) => union.add(node));
  circuit.wires.forEach((wire) => union.union(wire.from, wire.to));
  elements.forEach((element) => {
    union.add(element.from);
    union.add(element.to);
  });

  const groundRoot = union.find(GROUND_NODE);
  const positiveRoot = union.find(POSITIVE_NODE);
  if (groundRoot === positiveRoot) return emptyCircuitResult(designLoads, C(0));

  const knownVoltages = new Map([
    [groundRoot, C(0)],
    [positiveRoot, C(1)],
  ]);
  const elementRoots = elements.map((element) => ({
    ...element,
    fromRoot: union.find(element.from),
    toRoot: union.find(element.to),
    admittance: C(1).div(element.impedance),
  })).filter((element) => element.fromRoot !== element.toRoot);

  const unknownRoots = [...new Set(elementRoots.flatMap((element) => [element.fromRoot, element.toRoot]))]
    .filter((root) => !knownVoltages.has(root));
  const unknownIndex = new Map(unknownRoots.map((root, index) => [root, index]));
  const matrix = unknownRoots.map(() => unknownRoots.map(() => C(0)));
  const rhs = unknownRoots.map(() => C(0));

  elementRoots.forEach((element) => {
    stampAdmittance(matrix, rhs, unknownIndex, knownVoltages, element.fromRoot, element.toRoot, element.admittance);
  });
  unknownRoots.forEach((root) => {
    stampAdmittance(matrix, rhs, unknownIndex, knownVoltages, root, groundRoot, C(GMIN));
  });

  let solution = [];
  if (unknownRoots.length) {
    try {
      solution = solveLinearSystem(matrix, rhs);
    } catch {
      return emptyCircuitResult(designLoads, C(Number.POSITIVE_INFINITY));
    }
  }

  const voltages = new Map(knownVoltages);
  unknownRoots.forEach((root, index) => voltages.set(root, solution[index] || C(0)));

  const loadVoltages = new Map();
  designLoads.forEach((load) => {
    const plusRoot = union.find(load.plus || crossoverCircuitDesignNodeId(load.designId, "positive"));
    const minusRoot = union.find(load.minus || crossoverCircuitDesignNodeId(load.designId, "negative"));
    const voltage = voltageForRoot(voltages, plusRoot).sub(voltageForRoot(voltages, minusRoot));
    loadVoltages.set(load.designId, voltage);
  });

  return {
    loadVoltages,
    inputImpedance: inputImpedanceForElements(elementRoots, voltages, positiveRoot),
  };
}

function hasRoutableCircuit(circuit) {
  return circuit.components.length > 0 || circuit.wires.length > 0;
}

function componentImpedance(component, frequency) {
  const value = Math.max(Number(component.value) || 0, 1e-12);
  const omega = Math.max(2 * Math.PI * Number(frequency), 1e-12);
  if (component.type === "capacitor") return C(0, -1 / (omega * value * 1e-6));
  if (component.type === "inductor") return C(0, omega * value * 1e-3);
  return C(value);
}

function loadImpedanceAt(values = [], index = 0) {
  const value = Math.max(Number(values[index]) || 0, 1e-9);
  return C(value);
}

function stampAdmittance(matrix, rhs, unknownIndex, knownVoltages, fromRoot, toRoot, admittance) {
  stampNode(matrix, rhs, unknownIndex, knownVoltages, fromRoot, toRoot, admittance);
  stampNode(matrix, rhs, unknownIndex, knownVoltages, toRoot, fromRoot, admittance);
  const fromIndex = unknownIndex.get(fromRoot);
  const toIndex = unknownIndex.get(toRoot);
  if (fromIndex !== undefined && toIndex !== undefined) {
    matrix[fromIndex][toIndex] = matrix[fromIndex][toIndex].sub(admittance);
    matrix[toIndex][fromIndex] = matrix[toIndex][fromIndex].sub(admittance);
  }
}

function stampNode(matrix, rhs, unknownIndex, knownVoltages, nodeRoot, otherRoot, admittance) {
  const nodeIndex = unknownIndex.get(nodeRoot);
  if (nodeIndex === undefined) return;
  matrix[nodeIndex][nodeIndex] = matrix[nodeIndex][nodeIndex].add(admittance);
  const knownVoltage = knownVoltages.get(otherRoot);
  if (knownVoltage) rhs[nodeIndex] = rhs[nodeIndex].add(admittance.mul(knownVoltage));
}

function voltageForRoot(voltages, root) {
  return voltages.get(root) || C(0);
}

function inputImpedanceForElements(elements, voltages, positiveRoot) {
  let current = C(0);
  elements.forEach((element) => {
    const fromVoltage = voltageForRoot(voltages, element.fromRoot);
    const toVoltage = voltageForRoot(voltages, element.toRoot);
    const branchCurrent = fromVoltage.sub(toVoltage).mul(element.admittance);
    if (element.fromRoot === positiveRoot) current = current.add(branchCurrent);
    if (element.toRoot === positiveRoot) current = current.sub(branchCurrent);
  });
  return current.abs() > 1e-12 ? C(1).div(current).abs() : Number.POSITIVE_INFINITY;
}

function emptyCircuitResult(designLoads, inputImpedance) {
  return {
    loadVoltages: new Map(designLoads.map((load) => [load.designId, C(0)])),
    inputImpedance,
  };
}

function createUnionFind() {
  const parent = new Map();
  function add(value) {
    if (!parent.has(value)) parent.set(value, value);
  }
  function find(value) {
    add(value);
    const current = parent.get(value);
    if (current === value) return value;
    const root = find(current);
    parent.set(value, root);
    return root;
  }
  function union(left, right) {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) parent.set(rightRoot, leftRoot);
  }
  return { add, find, union };
}
