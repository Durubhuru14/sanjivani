#!/usr/bin/env node
/**
 * Launch Sanjivani in demo mode (separate from a normal deployment).
 *
 *   node scripts/demo.mjs            → demo dev server on :3000
 *   node scripts/demo.mjs build      → production build with demo baked in
 *   node scripts/demo.mjs start      → start the demo production build
 *
 * Demo mode is opt-in and self-contained: no Supabase project needed,
 * data lives in the server's memory, seeded from the README accounts.
 *
 * `build`/`start` mirror `npm run build` + `npm start` exactly (standalone
 * output + static/public copies + standalone server), so the demo exercises
 * the same production code path a real deployment uses.
 */
import { spawnSync } from "node:child_process";
import { cpSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

const arg = process.argv[2] ?? "dev";
const env = {
  ...process.env,
  NEXT_PUBLIC_DEMO_MODE: "1",
  DEMO_MODE: "1",
  // keep the demo console clean — no telemetry notice in the log
  NEXT_TELEMETRY_DISABLED: "1",
};

const nextCli = require.resolve("next/dist/bin/next");

const commands = {
  dev: () => ({ args: ["dev", "-p", "3000"] }),
  build: () => ({ args: ["build"], after: copyStaticAssets }),
  // standalone server — the same server `npm start` runs (node works where
  // bun is unavailable; PORT/HOSTNAME come from the environment)
  start: () => ({ node: [path.join(root, ".next/standalone/server.js")] }),
};

/** next build with output:standalone emits the server WITHOUT the static
 * chunks and public dir — both must be copied in (same as npm run build). */
function copyStaticAssets() {
  cpSync(path.join(root, ".next/static"), path.join(root, ".next/standalone/.next/static"), {
    recursive: true,
  });
  cpSync(path.join(root, "public"), path.join(root, ".next/standalone/public"), {
    recursive: true,
  });
  console.log("  demo build: static + public copied into .next/standalone\n");
}

const pick = commands[arg];
if (!pick) {
  console.error(`Unknown argument: ${arg}\nUsage: node scripts/demo.mjs [dev|build|start]`);
  process.exit(1);
}

const { args, after, node } = pick();
console.log(`\n  Sanjivani demo mode — seeded data, no Supabase required\n`);

// Resolve the Next CLI through node_modules so the launcher works
// regardless of whether node_modules/.bin is on PATH.
if (node) {
  const child = spawnSync(process.execPath, node, {
    env: { ...env, NODE_ENV: "production" },
    stdio: "inherit",
  });
  process.exit(child.status ?? 0);
}

const child = spawnSync(process.execPath, [nextCli, ...args], {
  env,
  stdio: "inherit",
});
if (child.status === 0 && after) after();
process.exit(child.status ?? 0);
