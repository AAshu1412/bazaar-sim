// node art-src/gen/build.mjs [name ...]   -> project/exterior/<name>.svg  and  public/assets/exterior/<name>.png
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import { Scene } from "./engine.mjs";
import { BUILDINGS } from "./buildings.mjs";

const here = fileURLToPath(new URL(".", import.meta.url));
const svgDir = `${here}../project/exterior/`, pngDir = `${here}../../public/assets/exterior/`;
fs.mkdirSync(svgDir, { recursive: true });
const names = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const png = process.argv.includes("--png");
if (png) fs.mkdirSync(pngDir, { recursive: true });
for (const name of names.length ? names : Object.keys(BUILDINGS)) {
  const S = new Scene(name);
  BUILDINGS[name](S);
  const svg = S.svg();
  fs.writeFileSync(`${svgDir}${name}.svg`, svg);
  if (png) fs.writeFileSync(`${pngDir}${name}.png`, new Resvg(svg, { fitTo: { mode: "width", value: 302 } }).render().asPng());
  console.log("built", name);
}
