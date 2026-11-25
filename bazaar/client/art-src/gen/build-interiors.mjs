// node art-src/gen/build-interiors.mjs [name ...] [--png]  -> project/interior/<name>.svg and public/assets/interior/<name>.png
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import { Room } from "./interior.mjs";
import { INTERIORS } from "./interiors.mjs";

const here = fileURLToPath(new URL(".", import.meta.url));
const svgDir = `${here}../project/interior/`, pngDir = `${here}../../public/assets/interior/`;
fs.mkdirSync(svgDir, { recursive: true });
const names = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const png = process.argv.includes("--png");
if (png) fs.mkdirSync(pngDir, { recursive: true });
for (const name of names.length ? names : Object.keys(INTERIORS)) {
  const S = new Room(name);
  INTERIORS[name](S);
  const svg = S.svgRoom();
  fs.writeFileSync(`${svgDir}${name}.svg`, svg);
  if (png) fs.writeFileSync(`${pngDir}${name}.png`, new Resvg(svg, { fitTo: { mode: "width", value: 768 } }).render().asPng());
  console.log("built", name);
}
