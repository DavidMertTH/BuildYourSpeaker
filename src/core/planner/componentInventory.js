export const DEFAULT_INVENTORY = {
  driverCount: 1,
  preference: "balanced",
  alignment: "auto",
  constraints: {
    hasMaxVolume: true,
    maxVolumeL: 75,
    maxWidthCm: 40,
    maxHeightCm: 60,
    maxDepthCm: 40,
    materialThicknessMm: 18,
    maxPortVelocityMs: 20,
    maxPortLengthCm: 60,
  },
  portFabrication: {
    mode: "printed",
    shape: "round",
    minDiameterCm: 4,
    maxDiameterCm: 12,
    wallThicknessMm: 2.4,
    flareAllowed: true,
    bendAllowed: true,
  },
};

export function normalizeInventory(input = {}) {
  const constraints = { ...DEFAULT_INVENTORY.constraints, ...(input.constraints || {}) };
  const portFabrication = { ...DEFAULT_INVENTORY.portFabrication, ...(input.portFabrication || {}) };
  const minDiameterCm = positiveOrDefault(portFabrication.minDiameterCm, DEFAULT_INVENTORY.portFabrication.minDiameterCm);
  const maxDiameterCm = Math.max(
    minDiameterCm,
    positiveOrDefault(portFabrication.maxDiameterCm, DEFAULT_INVENTORY.portFabrication.maxDiameterCm),
  );

  return {
    ...DEFAULT_INVENTORY,
    ...input,
    driverCount: Math.max(1, Math.round(positiveOrDefault(input.driverCount, DEFAULT_INVENTORY.driverCount))),
    preference: normalizePreference(input.preference),
    alignment: normalizeAlignment(input.alignment),
    constraints: {
      hasMaxVolume: constraints.hasMaxVolume !== false,
      maxVolumeL: positiveOrDefault(constraints.maxVolumeL, DEFAULT_INVENTORY.constraints.maxVolumeL),
      maxWidthCm: positiveOrDefault(constraints.maxWidthCm, DEFAULT_INVENTORY.constraints.maxWidthCm),
      maxHeightCm: positiveOrDefault(constraints.maxHeightCm, DEFAULT_INVENTORY.constraints.maxHeightCm),
      maxDepthCm: positiveOrDefault(constraints.maxDepthCm, DEFAULT_INVENTORY.constraints.maxDepthCm),
      materialThicknessMm: positiveOrDefault(constraints.materialThicknessMm, DEFAULT_INVENTORY.constraints.materialThicknessMm),
      maxPortVelocityMs: positiveOrDefault(constraints.maxPortVelocityMs, DEFAULT_INVENTORY.constraints.maxPortVelocityMs),
      maxPortLengthCm: positiveOrDefault(constraints.maxPortLengthCm, DEFAULT_INVENTORY.constraints.maxPortLengthCm),
    },
    portFabrication: {
      mode: portFabrication.mode === "standard" ? "standard" : "printed",
      shape: ["round", "slot", "auto"].includes(portFabrication.shape) ? portFabrication.shape : "round",
      minDiameterCm,
      maxDiameterCm,
      wallThicknessMm: positiveOrDefault(portFabrication.wallThicknessMm, DEFAULT_INVENTORY.portFabrication.wallThicknessMm),
      flareAllowed: portFabrication.flareAllowed !== false,
      bendAllowed: portFabrication.bendAllowed !== false,
    },
  };
}

export function maxBuildableVolumeLiters(inventory) {
  const { constraints } = normalizeInventory(inventory);
  if (constraints.hasMaxVolume) return constraints.maxVolumeL;
  return Number.POSITIVE_INFINITY;
}

export function maxEnvelopeVolumeLiters(inventory) {
  const { constraints } = normalizeInventory(inventory);
  const wallCm = constraints.materialThicknessMm / 10;
  const internalWidth = Math.max(0, constraints.maxWidthCm - wallCm * 2);
  const internalHeight = Math.max(0, constraints.maxHeightCm - wallCm * 2);
  const internalDepth = Math.max(0, constraints.maxDepthCm - wallCm * 2);
  return (internalWidth * internalHeight * internalDepth) / 1000;
}

export function estimateBoxDimensions(volumeL, inventory) {
  const { constraints } = normalizeInventory(inventory);
  const wallCm = constraints.materialThicknessMm / 10;
  const targetRatio = { width: 0.72, height: 1, depth: 0.78 };
  const scale = Math.cbrt((volumeL * 1000) / (targetRatio.width * targetRatio.height * targetRatio.depth));
  const internal = {
    widthCm: targetRatio.width * scale,
    heightCm: targetRatio.height * scale,
    depthCm: targetRatio.depth * scale,
  };
  const external = {
    widthCm: internal.widthCm + wallCm * 2,
    heightCm: internal.heightCm + wallCm * 2,
    depthCm: internal.depthCm + wallCm * 2,
  };
  const fits =
    !constraints.hasMaxVolume ||
    (volumeL <= constraints.maxVolumeL &&
      external.widthCm <= constraints.maxWidthCm &&
      external.heightCm <= constraints.maxHeightCm &&
      external.depthCm <= constraints.maxDepthCm);

  return { internal, external, fits };
}

function normalizePreference(value) {
  return ["compact", "balanced", "deep", "loud"].includes(value) ? value : "balanced";
}

function normalizeAlignment(value) {
  return ["auto", "sealed", "vented", "passive", "bandpass"].includes(value) ? value : "auto";
}

function positiveOrDefault(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}
