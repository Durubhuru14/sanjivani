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
 */
import { spawn } from "node:child_process";
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

const nextCli = require.resolve("next/dist/bin/next");

const commands = {
  dev: () => ({ args: ["dev", "-p", "3000"] }),
  build: () => ({ args: ["build"] }),
  start: () => ({ args: ["start", "-p", "3000"] }),
};

const pick = commands[arg];
if (!pick) {
  console.error(`Unknown argument: ${arg}\nUsage: node scripts/demo.mjs [dev|build|start]`);
  process.exit(1);
}

const { args } = pick();
console.log(`\n  Sanjivani demo mode — seeded data, no Supabase required\n`);

// Resolve the Next CLI through node_modules so the launcher works
// regardless of whether node_modules/.bin is on PATH.
const child = spawn(process.execPath, [nextCli, ...args], {
  env,
  stdio: "inherit",
});
child.on("exit", (code) => process.exit(code ?? 0));
