import test from "node:test";
import assert from "node:assert/strict";
import { loadKnownDrivers } from "../src/state.js";
import { filteredSortedLibraryEntries, librarySearchScore, libraryTextMatches } from "../src/app/libraryUtils.js";
import { completeDriverParameters } from "../src/app/driverParameters.js";
import { normalizeDriver, validateDriver } from "../src/core/driver.js";

const knownDrivers = await loadKnownDrivers();
const sbId = "sb-acoustics-sb23nrxs45-8";
const search = (filter, options = {}) => filteredSortedLibraryEntries(knownDrivers, {
  kind: "driver", filter, ...options,
});

test("model search accepts case, omitted hyphens, and pasted typographic dashes", () => {
  for (const query of ["SB23NRXS45-8", "sb23nrxs458", "  SB23NRXS45–8  ", "SB Acoustics SB23NRXS45-8"]) {
    assert.deepEqual(search(query).map((entry) => entry.id), [sbId], query);
  }
});

test("precise search requires every term instead of accepting just the brand", () => {
  assert.equal(search("SB Acoustics model-that-does-not-exist").length, 0);
  assert.equal(search("Dayton SB23NRXS45-8").length, 0);
  assert.equal(search("SB23NRXS45-4").some((entry) => entry.id === sbId), false);
  const sb = knownDrivers.find((entry) => entry.id === sbId);
  assert.equal(librarySearchScore(sb, "SB Acoustics nonexistent-model"), null);
  assert.equal(libraryTextMatches(sb.name, "SB23NRXS45-4"), false);
  assert.equal(libraryTextMatches(sb.name, "sb23nrxs458"), true);
});

test("the SB23 is found under its nominal 8 inch diameter and manufacturer", () => {
  const result = search("SB23", { filtersEnabled: true, brand: "SB Acoustics", diameter: "8" });
  assert.deepEqual(result.map((entry) => entry.id), [sbId]);
  assert.equal(search("SB23", { filtersEnabled: true, diameter: "6.5" }).length, 0);
  assert.equal(search("SB23", { filtersEnabled: false, brand: "Dayton Audio", diameter: "6.5" }).length, 1);
});

test("the built-in SB23 supplies a complete simulation driver and one-way excursion", () => {
  const entry = knownDrivers.find((entry) => entry.id === sbId);
  assert.ok(entry);
  const completed = completeDriverParameters({}, entry.driver);
  const normalized = normalizeDriver(completed);
  assert.deepEqual(validateDriver(normalized), []);
  assert.equal(normalized.xmax, 0.0065);
  assert.equal(normalized.fs, 27);
  assert.ok(Math.abs(normalized.qts - 0.38) < 0.002);
  assert.ok(Math.abs(normalized.vas - 0.094) < 1e-9);
});
