import { portLengthFromTuning } from "../ventedBox.js";

export function designRoundPorts({ volumeL, fb, portVelocityMs, referenceDiameterCm, inventory }) {
  const { constraints, portFabrication } = inventory;
  const options = [];
  const minDiameter = Number(portFabrication.minDiameterCm);
  const maxDiameter = Number(portFabrication.maxDiameterCm);
  const maxLength = Number(constraints.maxPortLengthCm);
  const diameterStep = Math.max(0.25, (maxDiameter - minDiameter) / 18);

  for (let diameterCm = minDiameter; diameterCm <= maxDiameter + 1e-9; diameterCm += diameterStep) {
    const port = portLengthFromTuning(volumeL, fb, diameterCm, portFabrication.flareAllowed ? 1.7 : 1.46);
    const physicalLengthCm = port.physicalLength * 100;
    if (!Number.isFinite(physicalLengthCm) || physicalLengthCm <= 0) continue;

    const projectedVelocityMs = projectVelocity(portVelocityMs, referenceDiameterCm || minDiameter, diameterCm);
    const lengthRatio = physicalLengthCm / maxLength;
    const velocityRatio = projectedVelocityMs / constraints.maxPortVelocityMs;
    const warnings = [];
    if (physicalLengthCm > maxLength && !portFabrication.bendAllowed) continue;
    if (physicalLengthCm > maxLength) warnings.push(`Folded port needed: ${physicalLengthCm.toFixed(1)} cm path`);
    if (velocityRatio > 1) warnings.push(`Port velocity ${projectedVelocityMs.toFixed(1)} m/s exceeds target`);

    const outerDiameterCm = diameterCm + (Number(portFabrication.wallThicknessMm) / 10) * 2;
    options.push({
      shape: "round",
      diameterCm,
      outerDiameterCm,
      physicalLengthCm,
      effectiveLengthCm: port.effectiveLength * 100,
      endCorrectionCm: port.endCorrection * 100,
      flareRadiusCm: portFabrication.flareAllowed ? Math.max(0.8, diameterCm * 0.12) : 0,
      projectedVelocityMs,
      warnings,
      score: scorePort({ velocityRatio, lengthRatio, diameterCm, minDiameter, maxDiameter }),
    });
  }

  return options.sort((left, right) => right.score - left.score);
}

function projectVelocity(portVelocityMs, referenceDiameterCm, diameterCm) {
  if (!Number.isFinite(portVelocityMs) || !Number.isFinite(referenceDiameterCm) || !Number.isFinite(diameterCm) || diameterCm <= 0) {
    return Number.POSITIVE_INFINITY;
  }
  return portVelocityMs * (referenceDiameterCm / diameterCm) ** 2;
}

function scorePort({ velocityRatio, lengthRatio, diameterCm, minDiameter, maxDiameter }) {
  const diameterMiddle = (minDiameter + maxDiameter) / 2;
  const diameterSpread = Math.max(0.001, maxDiameter - minDiameter);
  const diameterPenalty = Math.abs(diameterCm - diameterMiddle) / diameterSpread;
  const velocityPenalty = Math.max(0, velocityRatio - 0.85) * 42;
  const lengthPenalty = Math.max(0, lengthRatio - 0.8) * 28;
  return 100 - velocityPenalty - lengthPenalty - diameterPenalty * 10;
}
