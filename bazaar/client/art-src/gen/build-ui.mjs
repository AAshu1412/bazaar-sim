// node art-src/gen/build-ui.mjs  -> public/assets/ui/<badge>.png, ravi.png and public/assets/people/person<n>.png
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import { GLYPH } from "./glyphs.mjs";

const here = fileURLToPath(new URL(".", import.meta.url));
const ui = `${here}../../public/assets/ui/`, people = `${here}../../public/assets/people/`;
fs.mkdirSync(ui, { recursive: true }); fs.mkdirSync(people, { recursive: true });
const O = "#2a1c15";
const png = (path, svg, width) => fs.writeFileSync(path, new Resvg(svg, { fitTo: { mode: "width", value: width } }).render().asPng());

const BADGES = { coffee: "#8a4a2c", food: "#d0452f", tech: "#2c8f9a", flower: "#c53f74", book: "#2f5f86", gavel: "#8a4a2c", bank: "#3f7a55", eye: "#6b4aa0", mask: "#b5402f", clerk: "#56647f", help: "#c9742f", pin: "#3f6fb5", coin: "#a8721f", crate: "#7a4a28", people: "#3f7a55", tag: "#b5402f", chart: "#3f6fb5" };
for (const [name, c] of Object.entries(BADGES)) {
  png(`${ui}${name}.png`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 -20 40 40"><circle r="18.2" fill="${c}" stroke="${O}" stroke-width="2.6"/><path d="M-13 -6A14 14 0 0 1 4 -14" fill="none" stroke="#fff" stroke-width="2" opacity=".35" stroke-linecap="round"/>${GLYPH[name]}</svg>`, 96);
}

// Uncle Ravi, the guide
png(`${ui}ravi.png`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<circle cx="50" cy="50" r="48" fill="#f2c566" stroke="${O}" stroke-width="3"/>
<path d="M16 92Q20 68 50 68Q80 68 84 92Q68 99 50 98Q32 99 16 92Z" fill="#3f7a55" stroke="${O}" stroke-width="2.5"/>
<path d="M42 68L50 82L58 68" fill="#f6ead0" stroke="${O}" stroke-width="2"/>
<ellipse cx="50" cy="48" rx="22" ry="24" fill="#c98a5e" stroke="${O}" stroke-width="2.5"/>
<path d="M25 38Q24 14 50 14Q76 14 75 38Q62 28 50 30Q38 28 25 38Z" fill="#d0452f" stroke="${O}" stroke-width="2.5"/>
<path d="M29 27Q50 14 71 27M34 21Q50 12 66 21" fill="none" stroke="#f2a08a" stroke-width="2"/>
<circle cx="41" cy="46" r="7" fill="#fff" fill-opacity=".35" stroke="${O}" stroke-width="2"/><circle cx="59" cy="46" r="7" fill="#fff" fill-opacity=".35" stroke="${O}" stroke-width="2"/><path d="M48 46h4" stroke="${O}" stroke-width="2"/>
<circle cx="41" cy="46" r="2.2" fill="${O}"/><circle cx="59" cy="46" r="2.2" fill="${O}"/>
<path d="M34 37q6 -4 12 -1M54 36q6 -3 12 1" fill="none" stroke="#e8e4da" stroke-width="3" stroke-linecap="round"/>
<path d="M50 56Q40 52 32 62Q42 66 50 61Q58 66 68 62Q60 52 50 56Z" fill="#eeeae0" stroke="${O}" stroke-width="2"/>
<path d="M44 65q6 5 12 0" fill="none" stroke="${O}" stroke-width="2" stroke-linecap="round"/></svg>`, 192);

// six townspeople
const LOOKS = [
  ["#3f6fb5", "#3b2a1e", "#f0c39a", "bag"], ["#d0452f", "#1f1a18", "#c98a5e", "hat"], ["#3f7a55", "#a8612f", "#f5d2b0", "bun"],
  ["#8a5fd0", "#2a1c15", "#a8704a", "none"], ["#e0a030", "#6a3a22", "#eab68c", "hat"], ["#d6618f", "#d9b04a", "#f5d2b0", "bun"],
];
LOOKS.forEach(([shirt, hair, skin, extra], i) => {
  const head = `<circle cx="20" cy="17" r="10" fill="${skin}" stroke="${O}" stroke-width="2"/><path d="M10 16Q10 5 20 6Q30 5 30 16Q25 11 20 12Q14 11 10 16Z" fill="${hair}" stroke="${O}" stroke-width="1.6"/><circle cx="16.5" cy="18" r="1.4" fill="${O}"/><circle cx="23.5" cy="18" r="1.4" fill="${O}"/><path d="M17.5 22q2.5 2 5 0" fill="none" stroke="${O}" stroke-width="1.2"/>`;
  const acc = extra === "hat" ? `<path d="M7 11H33M12 11Q13 2 20 2Q27 2 28 11Z" fill="#7a4a28" stroke="${O}" stroke-width="2" stroke-linejoin="round"/>`
    : extra === "bun" ? `<circle cx="20" cy="5" r="4.5" fill="${hair}" stroke="${O}" stroke-width="1.6"/>`
    : extra === "bag" ? `<rect x="28" y="34" width="9" height="11" rx="2" fill="#c9953f" stroke="${O}" stroke-width="1.8"/>` : "";
  png(`${people}person${i}.png`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 56"><ellipse cx="20" cy="52" rx="12" ry="3.5" fill="#000" opacity=".28"/>
<path d="M15 41V51M25 41V51" stroke="${O}" stroke-width="6" stroke-linecap="round"/><path d="M15 41V50M25 41V50" stroke="#4a5568" stroke-width="2.6" stroke-linecap="round"/>
<path d="M10 43Q9 27 20 27Q31 27 30 43Z" fill="${shirt}" stroke="${O}" stroke-width="2.2" stroke-linejoin="round"/>${head}${acc}</svg>`, 80);
});
console.log("ui art built:", Object.keys(BADGES).length, "badges,", LOOKS.length, "people");
