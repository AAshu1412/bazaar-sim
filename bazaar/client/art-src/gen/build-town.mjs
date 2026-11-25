// node art-src/gen/build-town.mjs  -> public/assets/tiles/<kind><n>.png and public/assets/scenery/<name>.png
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import { Scene } from "./engine.mjs";
import { SCENERY } from "./scenery.mjs";
import { tileSvg, VARIANTS } from "./tiles.mjs";

const here = fileURLToPath(new URL(".", import.meta.url));
const tiles = `${here}../../public/assets/tiles/`, scenery = `${here}../../public/assets/scenery/`;
fs.mkdirSync(tiles, { recursive: true }); fs.mkdirSync(scenery, { recursive: true });
for (const [kind, n] of Object.entries(VARIANTS)) for (let v = 0; v < n; v++) {
  fs.writeFileSync(`${tiles}${kind}${v}.png`, new Resvg(tileSvg(kind, v), { fitTo: { mode: "width", value: 96 } }).render().asPng());
}
console.log("tiles", Object.values(VARIANTS).reduce((a, b) => a + b, 0));
for (const [name, fn] of Object.entries(SCENERY)) {
  const S = new Scene(name);
  fn(S);
  fs.writeFileSync(`${scenery}${name}.png`, new Resvg(S.svg(), { fitTo: { mode: "width", value: 302 } }).render().asPng());
  console.log("scenery", name);
}
