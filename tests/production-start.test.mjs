import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const guardPath = fileURLToPath(new URL("../scripts/ensure-production-build.mjs", import.meta.url));

function withProject(run) {
  const prefix = join(tmpdir(), "cabio-production-start-");
  const root = mkdtempSync(prefix);
  try {
    run(root);
  } finally {
    assert.ok(resolve(root).startsWith(resolve(prefix)), "Only remove this test's temporary project");
    rmSync(root, { recursive: true, force: true });
  }
}

function checkStart(root, nodeEnv) {
  const result = spawnSync(process.execPath, [guardPath], {
    cwd: root,
    env: { ...process.env, NODE_ENV: nodeEnv },
    encoding: "utf8",
    timeout: 5000,
  });
  assert.ifError(result.error);
  return result;
}

test("production startup reports a missing build without running the compiler", () => {
  withProject((root) => {
    writeFileSync(join(root, "package.json"), JSON.stringify({
      scripts: { build: "node -e \"require('node:fs').writeFileSync('build-ran', 'yes')\"" },
    }));
    const result = checkStart(root, "production");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /dist\/index\.html/);
    assert.match(result.stderr, /Build Command: npm ci --include=dev && npm run build/);
    assert.match(result.stderr, /Start Command: npm start/);
    assert.equal(existsSync(join(root, "build-ran")), false);
  });
});

test("production startup accepts an existing build without invoking build tools", () => {
  withProject((root) => {
    mkdirSync(join(root, "dist"));
    writeFileSync(join(root, "dist", "index.html"), "<!doctype html><title>Cabio</title>");
    const result = checkStart(root, "production");
    assert.equal(result.status, 0);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, "");
  });
});

test("development startup does not require a production build", () => {
  withProject((root) => {
    const result = checkStart(root, "development");
    assert.equal(result.status, 0);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, "");
  });
});
