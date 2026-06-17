export function mergeLibraryEntries(builtInEntries, customEntries, cloneEntry) {
  return [...builtInEntries.map(cloneEntry), ...customEntries].filter((entry, index, entries) => {
    return entries.findIndex((candidate) => candidate.id === entry.id) === index;
  });
}

export function readCustomLibrary(readJsonStorage, storageKey) {
  const parsed = readJsonStorage(storageKey, []);
  return Array.isArray(parsed) ? parsed : [];
}

export function customLibraryEntries(entries, builtInEntries) {
  const builtInIds = new Set(builtInEntries.map((entry) => entry.id));
  return entries.filter((entry) => !builtInIds.has(entry.id));
}

export function uniqueLibraryId(id, entries) {
  const existing = new Set(entries.map((entry) => entry.id));
  if (!existing.has(id)) return id;
  let suffix = 2;
  while (existing.has(`${id}-${suffix}`)) suffix += 1;
  return `${id}-${suffix}`;
}
