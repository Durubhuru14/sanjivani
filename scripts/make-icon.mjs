/* Generate the 512px Sanjivani app-icon PNG from the favicon SVG. */
import sharp from "sharp";
import { readFile } from "node:fs/promises";

const svg = await readFile("app/icon.svg");
await sharp(svg, { density: 300 }).resize(512, 512).png().toFile("public/sanjivani-icon.png");
console.log("wrote public/sanjivani-icon.png");
