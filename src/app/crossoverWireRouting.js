export const WIRE_POSTURE_HORIZONTAL_FIRST = "horizontal-first";
export const WIRE_POSTURE_VERTICAL_FIRST = "vertical-first";

export function normalizeWirePosture(posture) {
  return posture === WIRE_POSTURE_VERTICAL_FIRST ? WIRE_POSTURE_VERTICAL_FIRST : WIRE_POSTURE_HORIZONTAL_FIRST;
}

export function toggleWirePosture(posture) {
  return normalizeWirePosture(posture) === WIRE_POSTURE_HORIZONTAL_FIRST
    ? WIRE_POSTURE_VERTICAL_FIRST
    : WIRE_POSTURE_HORIZONTAL_FIRST;
}

export function snapWirePointToGrid(point, gridSize) {
  const size = Math.max(Number(gridSize) || 1, 1);
  if (!point) return null;
  return {
    x: Math.round((Number(point.x) || 0) / size) * size,
    y: Math.round((Number(point.y) || 0) / size) * size,
  };
}

export function orthogonalWireRoutePoints(fromPoint, toPoint, posture = WIRE_POSTURE_HORIZONTAL_FIRST) {
  if (!fromPoint || !toPoint) return [];
  const from = { x: Number(fromPoint.x) || 0, y: Number(fromPoint.y) || 0 };
  const to = { x: Number(toPoint.x) || 0, y: Number(toPoint.y) || 0 };
  const points = [from];
  if (Math.abs(from.x - to.x) >= 1 && Math.abs(from.y - to.y) >= 1) {
    points.push(normalizeWirePosture(posture) === WIRE_POSTURE_VERTICAL_FIRST
      ? { x: from.x, y: to.y }
      : { x: to.x, y: from.y });
  }
  points.push(to);
  return dedupeAdjacentPoints(points);
}

export function wirePathD(points) {
  const route = dedupeAdjacentPoints(points || []);
  if (!route.length) return "";
  return route.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function dedupeAdjacentPoints(points) {
  const route = [];
  points.forEach((point) => {
    if (!point) return;
    const normalized = { x: Number(point.x) || 0, y: Number(point.y) || 0 };
    const previous = route[route.length - 1];
    if (previous && Math.abs(previous.x - normalized.x) < 1 && Math.abs(previous.y - normalized.y) < 1) return;
    route.push(normalized);
  });
  return route;
}
