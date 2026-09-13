/**
 * Renders public/logo.svg → public/sanjivani-icon.png (512×512)
 * Used for social/share previews. Run: node scripts/generate-icon.mjs
 */
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const svg = await readFile(new URL("../public/logo.svg", import.meta.url));

await sharp(svg, { density: 300 })
  .resize(512, 512)
  .png()
  .toFile(fileURLToPath(new URL("../public/sanjivani-icon.png", import.meta.url)));

console.log("Wrote public/sanjivani-icon.png (512x512)");
