export const DEFAULT_INVENTORY = {
  driverCount: 1,
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

function positiveOrDefault(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}
