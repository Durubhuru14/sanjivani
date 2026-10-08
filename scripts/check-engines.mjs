#!/usr/bin/env node
/* Check every installed package's engines.node against a target Node version
   (simulates npm's EBADENGINE check on the user's machine). Usage:
   node scripts/check-engines.mjs [nodeVersion]  (default 22.16.0)            */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = process.argv[2] ?? "22.16.0";

// Use npm's bundled semver (no project dep needed)
const require = createRequire(import.meta.url);
let semver;
for (const p of ["/usr/lib/node_modules/npm/node_modules/semver/index.js",
                 "/usr/local/lib/node_modules/npm/node_modules/semver/index.js",
                 "semver"]) {
  try { semver = require(p); break; } catch { /* try next */ }
}
if (!semver) { console.error("semver not found"); process.exit(1); }

const pkgs = [];
function walk(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith(".")) continue;
    if (entry.name.startsWith("@")) { walk(join(dir, entry.name)); continue; }
    const pkgJson = join(dir, entry.name, "package.json");
    if (existsSync(pkgJson)) pkgs.push(pkgJson);
  }
}
walk(join(root, "node_modules"));

const bad = [];
for (const p of pkgs) {
  let json;
  try { json = JSON.parse(readFileSync(p, "utf8")); } catch { continue; }
  const range = json.engines?.node;
  if (!range) continue;
  if (!semver.satisfies(target, range)) bad.push(`${json.name}@${json.version} needs ${range}`);
}

console.log(`Checked ${pkgs.length} packages for Node ${target}`);
if (bad.length) {
  console.log(`INCOMPATIBLE (${bad.length}):`);
  bad.forEach((b) => console.log("  " + b));
  process.exit(1);
} else {
  console.log("All installed packages are engine-compatible with Node " + target);
}
