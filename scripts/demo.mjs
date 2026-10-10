#!/usr/bin/env node
/**
 * Launch Sanjivani in demo mode (separate from a normal deployment).
 *
 *   node scripts/demo.mjs            → demo dev server on :3000
 *   node scripts/demo.mjs build      → production build with demo baked in
 *   node scripts/demo.mjs start      → start the demo production build
 *
 * Demo mode is opt-in and self-contained: no Supabase project needed, data
 * lives in the server's memory (basic + ephemeral — resets on restart),
 * seeded from the README accounts. Plain Node, no shell helpers, works the
 * same on macOS, Linux and Windows.
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const arg = process.argv[2] ?? "dev";
const env = {
  ...process.env,
  NEXT_PUBLIC_DEMO_MODE: "1",
  DEMO_MODE: "1",
  // keep the demo console clean — no telemetry notice in the log
  NEXT_TELEMETRY_DISABLED: "1",
};

// Resolve the Next CLI through node_modules so the launcher works
// regardless of whether node_modules/.bin is on PATH.
const nextCli = require.resolve("next/dist/bin/next");

const args = { dev: ["dev", "-p", "3000"], build: ["build"], start: ["start"] }[arg];
if (!args) {
  console.error(`Unknown argument: ${arg}\nUsage: node scripts/demo.mjs [dev|build|start]`);
  process.exit(1);
}

console.log(`\n  Sanjivani demo mode — seeded in-memory data, no Supabase required\n`);
console.log(`  (basic + ephemeral: everything resets when the server restarts)\n`);

const child = spawnSync(process.execPath, [nextCli, ...args], {
  env,
  stdio: "inherit",
});
process.exit(child.status ?? 0);
