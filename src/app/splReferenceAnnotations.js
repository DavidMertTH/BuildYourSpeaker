const DEFAULT_SPL_DROPS_DB = [3, 6];

export function createSplReferenceAnnotations(series, dropsDb = DEFAULT_SPL_DROPS_DB) {
  const peakDb = Math.max(
    ...series.flatMap((item) => (item.values || []).filter(Number.isFinite)),
  );
  if (!Number.isFinite(peakDb)) return [];

  return dropsDb
    .map(Number)
    .filter((dropDb) => Number.isFinite(dropDb) && dropDb > 0)
    .map((dropDb, index) => ({
      referenceValue: peakDb - dropDb,
      label: `−${formatDrop(dropDb)} dB`,
      labelPosition: index % 2 === 0 ? "above" : "below",
      dash: index % 2 === 0 ? [7, 4] : [3, 4],
      width: 1.2,
      opacity: index % 2 === 0 ? 0.72 : 0.58,
    }));
}

function formatDrop(value) {
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1);
}
