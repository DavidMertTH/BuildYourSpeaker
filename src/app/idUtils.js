export function createDesignId() {
  return createId("design");
}

export function createConfigGroupId() {
  return createId("config-group");
}

export function createCrossoverTransitionId() {
  return createId("crossover");
}

export function createCrossoverDesignId() {
  return createId("crossover-design");
}

export function createCrossoverCircuitComponentId() {
  return createId("crossover-component");
}

export function createCrossoverCircuitWireId() {
  return createId("crossover-wire");
}

export function createCrossoverCircuitJunctionId() {
  return createId("crossover-junction");
}

export function createCrossoverModuleGroupId() {
  return createId("crossover-module-group");
}

export function createSignalFilterId() {
  return createId("signal-filter");
}

export function createMeasurementGroupId() {
  return createId("measurement-group");
}

export function uniqueDesignName(designs, baseName) {
  return uniqueName(designs.map((design) => design.name), baseName);
}

export function uniqueConfigGroupName(groups, baseName) {
  return uniqueName(groups.map((group) => group.name), baseName);
}

export function uniqueMeasurementGroupName(groups, baseName) {
  return uniqueName((groups || []).map((group) => group.name), baseName);
}

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function uniqueName(existingNames, baseName) {
  const names = new Set(existingNames);
  if (!names.has(baseName)) return baseName;
  let index = 2;
  while (names.has(`${baseName} ${index}`)) index += 1;
  return `${baseName} ${index}`;
}
