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
  console.error([
    "Production build output is missing: dist/index.html.",
    "Build the application during deployment, before starting the server.",
    "Render Build Command: npm ci --include=dev && npm run build",
    "Render Start Command: npm start",
    "Set these commands in the Render service settings, then redeploy.",
    "The start command does not run a build because it shares the service's memory limit.",
  ].join("\n"));
  process.exitCode = 1;
}
