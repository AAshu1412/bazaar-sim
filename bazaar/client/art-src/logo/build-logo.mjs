// node art-src/logo/build-logo.mjs  -> art-src/logo/<concept>-{logo,icon}.svg and a preview sheet
// Lettering is drawn as paths (only B, A, Z, R are needed), so the logo needs no font anywhere.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const here = fileURLToPath(new URL(".", import.meta.url));
const INK = "#2a1c15", PAPER = "#f6ead0", WOOD = "#6b3f26", BERRY = "#d0452f", LEAF = "#256b42";

// each letter is 100 tall: [width, outer contour, counters]
const GLYPHS = {
  B: [76, "M0 0H44Q72 0 72 25Q72 40 60 48Q76 55 76 73Q76 100 46 100H0Z", "M25 21H40Q49 21 49 29.5Q49 38 40 38H25ZM25 60H43Q53 60 53 69.5Q53 79 43 79H25Z"],
  A: [86, "M0 100L24 8Q27 0 36 0H50Q59 0 62 8L86 100H59L55 82H31L27 100Z", "M35 62H51L43 27Z"],
  Z: [76, "M4 0H74V23L36 76H76V100H2V77L40 24H4Z", ""],
  R: [78, "M0 0H44Q74 0 74 30Q74 49 58 57L79 100H50L35 64H26V100H0Z", "M26 22H40Q49 22 49 31.5Q49 41 40 41H26Z"],
};
const WORD = "BAZAAR", GAP = 7;
const TILT = [-4, 2, -2, 3, -2, 4], LIFT = [5, 0, 2, -1, 1, 5];
export const WORD_W = [...WORD].reduce((w, c) => w + GLYPHS[c][0] + GAP, -GAP);

/** The wordmark with its top-left at (0,0): drop shadow, ink outline, coloured face, top shine. */
function wordmark(id, [top, bottom], shadow = INK, bounce = true) {
  let x = 0;
  const placed = [...WORD].map((c, i) => {
    const [w, outer, holes] = GLYPHS[c];
    const t = `translate(${x} ${bounce ? LIFT[i] : 0}) rotate(${bounce ? TILT[i] : 0} ${w / 2} 50)`;
    x += w + GAP;
    return { t, outer, holes };
  });
  const layer = (draw) => placed.map((g, i) => `<g transform="${g.t}">${draw(g, i)}</g>`).join("");
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>
${placed.map((g, i) => `<clipPath id="${id}c${i}"><path d="${g.outer}"/></clipPath>`).join("")}</defs>
<g transform="translate(0 10)">${layer((g) => `<path d="${g.outer}" fill="${shadow}" stroke="${shadow}" stroke-width="16" stroke-linejoin="round"/>`)}</g>
${layer((g) => `<path d="${g.outer}" fill="${INK}" stroke="${INK}" stroke-width="14" stroke-linejoin="round"/>`)}
${layer((g, i) => `<path d="${g.outer}${g.holes}" fill="url(#${id})" fill-rule="evenodd"/><g clip-path="url(#${id}c${i})"><rect x="-4" y="-4" width="96" height="20" fill="#fff" opacity=".32"/></g>${g.holes ? `<path d="${g.holes}" fill="none" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>` : ""}`)}`;
}

/** Striped market awning with a scalloped hem, the same one the town's stalls wear. */
function awning(x, y, w, h, n, c1 = BERRY, c2 = PAPER, sw = 6) {
  const inset = Math.min(w * 0.07, h * 0.7), scallop = w / n / 2.1;
  let s = "";
  for (let i = 0; i < n; i++) {
    const tx0 = x + inset + ((w - 2 * inset) * i) / n, tx1 = x + inset + ((w - 2 * inset) * (i + 1)) / n;
    const bx0 = x + (w * i) / n, bx1 = x + (w * (i + 1)) / n;
    s += `<path d="M${tx0} ${y}H${tx1}L${bx1} ${y + h}Q${(bx0 + bx1) / 2} ${y + h + scallop * 2} ${bx0} ${y + h}Z" fill="${i % 2 ? c2 : c1}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"/>`;
  }
  return s + `<path d="M${x} ${y + h}H${x + w}" stroke="${INK}" stroke-width="${sw * 0.5}" opacity=".35"/>
<rect x="${x + inset - sw}" y="${y - sw * 1.6}" width="${w - 2 * inset + 2 * sw}" height="${sw * 2.2}" rx="${sw}" fill="${WOOD}" stroke="${INK}" stroke-width="${sw}"/>`;
}
const coin = (cx, cy, r, sw = r * 0.09) =>
  `<circle cx="${cx}" cy="${cy + r * 0.1}" r="${r}" fill="${INK}"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="#f2a62e" stroke="${INK}" stroke-width="${sw}"/><circle cx="${cx}" cy="${cy}" r="${r * 0.76}" fill="#ffd23f" stroke="#b5761a" stroke-width="${sw * 0.6}"/><path d="M${cx - r * 0.55} ${cy - r * 0.18}A${r * 0.58} ${r * 0.58} 0 0 1 ${cx + r * 0.08} ${cy - r * 0.56}" fill="none" stroke="#fff3b8" stroke-width="${sw}" stroke-linecap="round"/>`;
/** one letter, outlined, centred on (cx, cy) at height `h` */
function letter(c, cx, cy, h, face) {
  const [w, outer, holes] = GLYPHS[c], k = h / 100;
  return `<g transform="translate(${cx - (w * k) / 2} ${cy - h / 2}) scale(${k})"><path d="${outer}" transform="translate(0 8)" fill="${INK}" stroke="${INK}" stroke-width="16" stroke-linejoin="round"/><path d="${outer}" fill="${INK}" stroke="${INK}" stroke-width="14" stroke-linejoin="round"/><path d="${outer}${holes}" fill="${face}" fill-rule="evenodd"/><path d="${holes}" fill="none" stroke="${INK}" stroke-width="5"/></g>`;
}
/** a stall: awning, posts, counter and a coin on it; drawn in a 240 x 190 box */
const stall = () => `<rect x="34" y="60" width="16" height="108" rx="5" fill="${WOOD}" stroke="${INK}" stroke-width="6"/><rect x="190" y="60" width="16" height="108" rx="5" fill="${WOOD}" stroke="${INK}" stroke-width="6"/>
<rect x="22" y="128" width="196" height="52" rx="9" fill="#a9673a" stroke="${INK}" stroke-width="6"/><rect x="14" y="120" width="212" height="18" rx="7" fill="#e9c88a" stroke="${INK}" stroke-width="6"/><path d="M70 142v34M120 142v34M170 142v34" stroke="${INK}" stroke-width="4" opacity=".45"/>
${coin(120, 98, 24)}${awning(8, 18, 224, 48, 7)}`;

const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${body}</svg>`;
const tile = (fill, body) => svg(256, 256, `<rect x="8" y="16" width="240" height="232" rx="52" fill="${INK}"/><rect x="8" y="8" width="240" height="232" rx="52" fill="${fill}" stroke="${INK}" stroke-width="8"/>${body}`);

export const CONCEPTS = {
  /** A: the stall stands over the name */
  stall: {
    logo: svg(580, 350, `<g transform="translate(170 6)">${stall()}</g><g transform="translate(${(580 - WORD_W) / 2} 216)">${wordmark("a", ["#ffe07a", "#f0a02a"])}</g>`),
    icon: tile(LEAF, `<g transform="translate(20 38) scale(0.9)">${stall()}</g>`),
  },
  /** B: the name is a shopfront under one long awning */
  shopfront: {
    logo: svg(600, 250, `${awning(12, 26, 576, 58, 11)}<g transform="translate(${(600 - WORD_W) / 2} 112)">${wordmark("b", ["#fff6df", "#f0d7a4"], BERRY, false)}</g>`),
    icon: tile("#ffc94a", `${letter("B", 130, 160, 106, PAPER)}${awning(30, 52, 196, 42, 5, BERRY, PAPER, 7)}`),
  },
  /** C: a trader's coin beside the name */
  coin: {
    logo: svg(790, 200, `${coin(100, 94, 82)}${letter("B", 100, 104, 74, PAPER)}${awning(52, 30, 96, 20, 5, BERRY, PAPER, 4)}<g transform="translate(224 44)">${wordmark("c", ["#ffe07a", "#f0a02a"])}</g>`),
    icon: svg(256, 256, `${coin(128, 120, 112)}${letter("B", 128, 138, 100, PAPER)}${awning(62, 40, 132, 28, 5, BERRY, PAPER, 5)}`),
  },
};

// the chosen logo (A, the stall) goes to the app; the browser tab gets a simpler cut with just the awning and coin
const FAVICON = tile(LEAF, `${coin(128, 164, 54, 10)}${awning(26, 54, 204, 62, 5, BERRY, PAPER, 10)}`);
const app = `${here}../../public/logo/`;
fs.mkdirSync(app, { recursive: true });
for (const [file, art] of [["logo", CONCEPTS.stall.logo], ["icon", CONCEPTS.stall.icon], ["favicon", FAVICON]]) fs.writeFileSync(`${app}${file}.svg`, art);

for (const [name, c] of Object.entries(CONCEPTS)) {
  fs.writeFileSync(`${here}${name}-logo.svg`, c.logo);
  fs.writeFileSync(`${here}${name}-icon.svg`, c.icon);
}

// preview sheet: each lockup on light and dark, and the icon at real favicon sizes
const sheet = process.argv[2];
if (sheet) {
  const data = (s) => `data:image/svg+xml;base64,${Buffer.from(s).toString("base64")}`;
  const img = (s, x, y, w, h) => `<image href="${data(s)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`;
  let g = `<rect width="1400" height="960" fill="${PAPER}"/><rect x="520" width="500" height="960" fill="#14231d"/>`;
  Object.values(CONCEPTS).forEach((c, i) => {
    const y = i * 320;
    g += img(c.logo, 20, y + 20, 480, 280) + img(c.logo, 530, y + 20, 480, 280) + img(c.icon, 1040, y + 60, 180, 180) + img(c.icon, 1245, y + 80, 64, 64) + img(c.icon, 1325, y + 96, 32, 32) + img(c.icon, 1370, y + 104, 16, 16);
  });
  fs.writeFileSync(sheet, new Resvg(svg(1400, 960, g)).render().asPng());
}
console.log("logos built:", Object.keys(CONCEPTS).join(", "));
