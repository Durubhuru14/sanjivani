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

const arg = process.argv[2] ?? "dev";
const env = {
  ...process.env,
  NEXT_PUBLIC_DEMO_MODE: "1",
  DEMO_MODE: "1",
};

const commands = {
  dev: () => ({ cmd: "next", args: ["dev", "-p", "3000"] }),
  build: () => ({ cmd: "next", args: ["build"] }),
  start: () => ({ cmd: "next", args: ["start", "-p", "3000"] }),
};

const pick = commands[arg];
if (!pick) {
  console.error(`Unknown argument: ${arg}\nUsage: node scripts/demo.mjs [dev|build|start]`);
  process.exit(1);
}

const { cmd, args } = pick();
console.log(`\n  Sanjivani demo mode — seeded data, no Supabase required\n`);

const child = spawn(cmd, args, { env, stdio: "inherit", shell: process.platform === "win32" });
child.on("exit", (code) => process.exit(code ?? 0));
