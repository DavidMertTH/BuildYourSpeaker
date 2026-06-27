import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { join } from "node:path";

if (process.env.NODE_ENV !== "production") {
  process.exit(0);
}

const root = process.cwd();
const indexPath = join(root, "dist", "index.html");

try {
  await access(indexPath);
  process.exit(0);
} catch {
  console.log("Production build output is missing; running npm run build before start.");
}

await new Promise((resolve, reject) => {
  const command = process.platform === "win32" ? "cmd.exe" : "npm";
  const args = process.platform === "win32" ? ["/d", "/s", "/c", "npm run build"] : ["run", "build"];
  const child = spawn(command, args, {
    cwd: root,
    stdio: "inherit",
  });

  child.on("error", reject);
  child.on("exit", (code) => {
    if (code === 0) {
      resolve();
      return;
    }
    reject(new Error(`Production build failed with exit code ${code}.`));
  });
});
