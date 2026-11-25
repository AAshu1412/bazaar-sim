// The five playable businesses, each recognisable at a glance: its own silhouette, colour and rooftop emblem.
import * as E from "./engine.mjs";
import { GLYPH } from "./glyphs.mjs";
const { ground, volume, box, barrel, sack, bush, tree, planter, cyl, lamppost, crystal, produceCrate, P, shade } = E;
const O = "#2a1c15", f = (n) => +n.toFixed(1);

const win = (u, v, o = {}) => ({ t: "win", u, v, w: 16, h: 22, ...o });
const door = (u, w, h, o = {}) => ({ t: "door", u, w, h, ...o });
const lamp = (u, v) => ({ t: "lamp", u, v });
const awn = (u0, u1, o = {}) => ({ t: "awning", u0, u1, ...o });

/** Big round trade sign on a pole above the roof. */
function emblem(S, icon, color, x, y, z, k = 1.55) {
  const [cx, cy] = P(x, y, z);
  S.add(`<rect x="${f(cx - 2.5)}" y="${f(cy)}" width="5" height="${f(20 * k)}" fill="#4a2a19" stroke="${O}" stroke-width="1.2"/>` +
    `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(18 * k)}" fill="#f6ead0" stroke="${O}" stroke-width="2.4"/><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(14.5 * k)}" fill="${color}" stroke="${O}" stroke-width="1.4"/>` +
    `<g transform="translate(${f(cx)} ${f(cy)}) scale(${k * 0.9})">${GLYPH[icon]}</g>`);
}
/** Flower bucket: a pail with a bunch of blooms. */
function bouquet(S, x, y, col, z = 0, k = 1) {
  const [cx, cy] = P(x, y, z);
  let g = `<path d="M${f(cx - 7 * k)} ${f(cy - 10 * k)}H${f(cx + 7 * k)}L${f(cx + 5 * k)} ${f(cy)}H${f(cx - 5 * k)}Z" fill="#8fa6b8" stroke="${O}" stroke-width="1.2"/>`;
  for (const [dx, dy] of [[-6, -14], [0, -19], [6, -14], [-3, -12], [4, -11], [0, -14]])
    g += `<circle cx="${f(cx + dx * k)}" cy="${f(cy + dy * k)}" r="${f(4 * k)}" fill="${col}" stroke="${O}" stroke-width="1"/><circle cx="${f(cx + dx * k)}" cy="${f(cy + dy * k)}" r="${f(1.3 * k)}" fill="#ffe27a"/>`;
  S.add(g);
}
function cafeTable(S, x, y, top = "#f6ead0") {
  const [cx, cy] = P(x, y, 0);
  S.add(`<ellipse cx="${f(cx)}" cy="${f(cy + 1)}" rx="10" ry="4" fill="#000" opacity=".2"/><rect x="${f(cx - 1.5)}" y="${f(cy - 13)}" width="3" height="13" fill="#3b2a1e"/><ellipse cx="${f(cx)}" cy="${f(cy - 13)}" rx="12" ry="6" fill="${top}" stroke="${O}" stroke-width="1.3"/><rect x="${f(cx - 3)}" y="${f(cy - 19)}" width="6" height="5" rx="1" fill="#fff" stroke="${O}" stroke-width="1"/>`);
}
function umbrella(S, x, y, c1, c2) {
  const [cx, cy] = P(x, y, 0), top = cy - 38;
  let g = `<rect x="${f(cx - 1.2)}" y="${f(top)}" width="2.4" height="38" fill="#3b2a1e"/>`;
  for (let i = 0; i < 6; i++) g += `<path d="M${f(cx)} ${f(top - 10)}L${f(cx - 21 + i * 7)} ${f(top + 4)}L${f(cx - 14 + i * 7)} ${f(top + 4)}Z" fill="${i % 2 ? c2 : c1}" stroke="${O}" stroke-width="1"/>`;
  S.add(g);
}
function shelfBooks(S, x, y, n = 6) {
  const cols = ["#b5402f", "#2e6f9a", "#3f7a45", "#c9953f", "#6b4aa0"];
  box(S, x, y, 0, 8, n * 6 + 4, 4, "#7a4a28");
  for (let i = 0; i < n; i++) box(S, x + 1, y + 2 + i * 6, 4, 6, 5, 12 + (i % 3) * 2, cols[i % cols.length], { sw: 0.9 });
}
/** Four posts, a counter and a striped canopy: the open market stall. */
function stall(S, { c1, c2, counter, H = 52 }) {
  const posts = [[6, 6], [82, 6], [6, 74]];
  for (const [x, y] of posts) box(S, x, y, 0, 6, 6, H, "#8b5a34", { sw: 1.1 });
  box(S, 10, 10, 0, 70, 12, H - 10, shade(counter, 0.85), { planks: 4 }); // back wall
  box(S, 10, 56, 0, 70, 18, 20, counter, { planks: 3 }); // counter
  box(S, 8, 54, 20, 74, 22, 3, "#e9d3a4");
  box(S, 82, 74, 0, 6, 6, H, "#8b5a34", { sw: 1.1 });
  volume(S, { x0: 2, y0: 2, W: 90, D: 82, H: 4, z0: H, wall: { k: "plank", c: shade(c1, 0.8) }, roof: { t: "gable", axis: "x", rh: 30, ov: 8, style: "stripe", c: c1, c2 }, L: { items: [] }, R: { items: [] } });
}
const cafe = (S, tall) => {
  ground(S, "cobble");
  const H = tall ? 78 : 56;
  volume(S, { x0: 0, y0: 0, W: 90, D: 82, H, wall: { k: "plaster", c: "#f0d9b0", timber: "#6a4026", plinth: "#8d7a68" }, roof: { t: "gable", axis: "x", rh: 34, ov: 8, style: "tile", c: "#8a4a2c" },
    chimney: { x: 16, y: 26, w: 12, h: 24, c: "#8a5a44" },
    L: { items: [win(10, 18, { w: 22, h: 24, glow: "warm" }), win(48, 18, { w: 22, h: 24, glow: "warm" }), ...(tall ? [win(12, 50, { shut: "#6a4026" }), win(54, 50, { shut: "#6a4026" })] : []), awn(4, 82, { z: 48, d: 20, drop: 12, c1: "#7a3f22", c2: "#f6ead0", n: 10 })] },
    R: { items: [door(28, 26, 40, { c: "#5a3320", window: true }), win(6, 20, { w: 14, glow: "warm" }), ...(tall ? [win(10, 50, { shut: "#6a4026" }), win(54, 50, { shut: "#6a4026" })] : []), lamp(66, 24)] } });
};

export const SHOPS = {
  "shop-coffee": (S) => { cafe(S, false); cafeTable(S, 112, 22); cafeTable(S, 108, 70); sack(S, 22, 104, "#b98a5a"); sack(S, 38, 108, "#a97c4f", 0.9); emblem(S, "coffee", "#8a4a2c", 46, 42, 128); },
  "shop-coffee-plus": (S) => { cafe(S, true); umbrella(S, 110, 24, "#8a4a2c", "#f6ead0"); cafeTable(S, 112, 24); umbrella(S, 106, 76, "#8a4a2c", "#f6ead0"); cafeTable(S, 108, 76); planter(S, 20, 102); lamppost(S, 56, 106, 38); emblem(S, "coffee", "#c9862f", 46, 42, 150, 1.7); },
  "shop-food": (S) => {
    ground(S, "stone"); stall(S, { c1: "#d0452f", c2: "#ffd45a", counter: "#c9742f" });
    cyl(S, 108, 28, 9, 18, "#4a4f5a", "#2c2f36"); E.flame(S, ...P(108, 28, 20), 1.1); umbrella(S, 106, 78, "#ffd45a", "#d0452f"); cafeTable(S, 108, 78); barrel(S, 24, 104, 8, 14); sack(S, 44, 108, "#e9dfc6", 0.9);
    emblem(S, "food", "#d0452f", 46, 42, 120);
  },
  "shop-food-plus": (S) => {
    ground(S, "stone");
    volume(S, { x0: 0, y0: 0, W: 92, D: 84, H: 60, wall: { k: "brick", c: "#c2553c", plinth: "#6f665c", band: "#ffd45a" }, roof: { t: "hip", rh: 30, ov: 7, style: "tile", c: "#d89a2f" }, chimney: { x: 62, y: 20, w: 14, h: 34, c: "#5f5a58" },
      L: { items: [win(10, 18, { w: 26, h: 24, glow: "warm" }), win(50, 18, { w: 26, h: 24, glow: "warm" }), awn(4, 84, { z: 50, d: 22, drop: 12, c1: "#ffd45a", c2: "#d0452f", n: 10 })] },
      R: { items: [door(28, 28, 42, { c: "#6b2f1e", window: true }), win(6, 20, { glow: "warm", w: 14 }), lamp(66, 24)] } });
    umbrella(S, 112, 20, "#d0452f", "#ffd45a"); cafeTable(S, 112, 20); umbrella(S, 106, 76, "#ffd45a", "#d0452f"); cafeTable(S, 106, 76); produceCrate(S, 24, 102); produceCrate(S, 44, 104, ["#e67e22", "#f1c40f", "#c0392b"]);
    emblem(S, "food", "#d0452f", 46, 42, 134, 1.7);
  },
  "shop-tech": (S) => {
    ground(S, "stone");
    volume(S, { x0: 0, y0: 0, W: 90, D: 82, H: 58, wall: { k: "plank", c: "#35617f", plinth: "#263e52" }, roof: { t: "flat", c: "#4a7f99" },
      L: { items: [win(8, 14, { w: 32, h: 30, glow: "cool" }), win(50, 14, { w: 32, h: 30, glow: "cool" }), awn(4, 86, { z: 54, d: 10, drop: 5, c1: "#4fe0d0", c2: "#24506a", n: 12 })] },
      R: { items: [door(28, 28, 42, { c: "#1d3446", window: true, arch: false }), win(6, 16, { w: 14, h: 28, glow: "cool" }), win(62, 16, { w: 14, h: 28, glow: "cool" })] } });
    cyl(S, 20, 18, 2.5, 34, "#9aa6b0", "#c9d2da", 62); crystal(S, 20, 18, 14, "#4fe0d0", 96);
    crystal(S, 108, 24, 24, "#4fe0d0"); crystal(S, 108, 66, 18, "#8fd0ff"); box(S, 26, 100, 0, 18, 12, 12, "#4a5560"); box(S, 29, 102, 12, 12, 8, 9, "#8fd0ff");
    emblem(S, "tech", "#2c8f9a", 52, 40, 118);
  },
  "shop-tech-plus": (S) => {
    ground(S, "stone");
    volume(S, { x0: 0, y0: 0, W: 92, D: 84, H: 66, wall: { k: "plank", c: "#3d3f7a", plinth: "#272852" }, roof: { t: "flat", c: "#6466b0" },
      L: { items: [win(8, 14, { w: 20, h: 40, glow: "cool" }), win(36, 14, { w: 20, h: 40, glow: "cool" }), win(64, 14, { w: 20, h: 40, glow: "cool" })] },
      R: { items: [door(28, 28, 44, { c: "#1d1e46", window: true, arch: false }), win(6, 18, { w: 14, h: 34, glow: "cool" }), win(64, 18, { w: 14, h: 34, glow: "cool" })] } });
    volume(S, { x0: 22, y0: 20, W: 44, D: 40, H: 26, z0: 70, wall: { k: "plank", c: "#5557a0", plinth: "#35366a" }, roof: { t: "flat", c: "#8486c8" }, L: { items: [win(10, 6, { w: 24, h: 14, glow: "cool" })] }, R: { items: [win(8, 6, { w: 22, h: 14, glow: "cool" })] } });
    cyl(S, 12, 12, 2.5, 44, "#9aa6b0", "#c9d2da", 70); crystal(S, 12, 12, 16, "#ff7ad9", 114);
    crystal(S, 108, 22, 28, "#a56bff"); crystal(S, 108, 66, 20, "#4fe0d0"); lamppost(S, 40, 104, 40);
    emblem(S, "tech", "#6b4aa0", 46, 40, 140, 1.6);
  },
  "shop-flower": (S) => {
    ground(S, "grass"); stall(S, { c1: "#e0558a", c2: "#fff1f5", counter: "#5a8f4a" });
    const C = ["#e0558a", "#ffd23f", "#8a5fd0", "#ff7a45", "#ffffff"];
    for (let i = 0; i < 4; i++) bouquet(S, 20 + i * 18, 66, C[i], 23, 0.9);
    for (let i = 0; i < 4; i++) bouquet(S, 106, 14 + i * 19, C[(i + 2) % 5]);
    for (let i = 0; i < 4; i++) bouquet(S, 16 + i * 21, 100, C[(i + 1) % 5], 0, 1.15);
    emblem(S, "flower", "#c53f74", 46, 42, 120);
  },
  "shop-flower-plus": (S) => {
    ground(S, "grass"); stall(S, { c1: "#8a5fd0", c2: "#fbe9ff", counter: "#4f8a5a", H: 62 });
    const C = ["#e0558a", "#ffd23f", "#8a5fd0", "#ff7a45", "#ffffff"];
    for (let i = 0; i < 5; i++) bouquet(S, 16 + i * 15, 66, C[i], 23, 0.85);
    for (let i = 0; i < 5; i++) bouquet(S, 106, 8 + i * 17, C[(i + 2) % 5], 0, 1.1);
    for (let i = 0; i < 5; i++) bouquet(S, 8 + i * 20, 102, C[(i + 1) % 5], 0, 1.2);
    tree(S, -2, 100, 0.6, "#e58ab0"); bush(S, 112, 98, 0.9);
    emblem(S, "flower", "#8a5fd0", 46, 42, 140, 1.7);
  },
  "shop-book": (S) => {
    ground(S, "cobble");
    volume(S, { x0: 0, y0: 0, W: 90, D: 82, H: 60, wall: { k: "plank", c: "#7d93b8", plinth: "#56647f" }, roof: { t: "gable", axis: "x", rh: 36, ov: 8, style: "slate", c: "#2f4f7a" },
      L: { items: [win(8, 18, { w: 30, h: 28, panes: 3, glow: "warm" }), win(50, 18, { w: 30, h: 28, panes: 3, glow: "warm" }), awn(4, 84, { z: 52, d: 14, drop: 8, c1: "#2f5f86", c2: "#f6ead0", n: 8 })] },
      R: { items: [door(28, 26, 40, { c: "#2c3f5c", window: true }), win(6, 20, { glow: "warm", w: 14 }), lamp(66, 24)] } });
    shelfBooks(S, 104, 10, 6); shelfBooks(S, 106, 58, 4); box(S, 24, 100, 0, 18, 13, 5, "#b5402f"); box(S, 26, 101, 5, 16, 12, 5, "#3f7a45"); box(S, 25, 100, 10, 17, 12, 5, "#c9953f");
    emblem(S, "book", "#2f5f86", 46, 42, 130);
  },
  "shop-book-plus": (S) => {
    ground(S, "stone");
    volume(S, { x0: 0, y0: 0, W: 94, D: 84, H: 80, wall: { k: "stone", c: "#c9d0de", plinth: "#7f879a", band: "#9aa6c0" }, roof: { t: "hip", rh: 34, ov: 6, style: "copper", c: "#2f5f86" },
      L: { items: [win(8, 16, { w: 16, h: 30, arch: true, glow: "warm" }), win(38, 16, { w: 16, h: 30, arch: true, glow: "warm" }), win(68, 16, { w: 16, h: 30, arch: true, glow: "warm" }), win(22, 52, { arch: true }), win(54, 52, { arch: true })] },
      R: { items: [door(30, 30, 46, { c: "#2c3f5c", window: true }), win(6, 22, { arch: true, w: 14, h: 28 }), win(70, 22, { arch: true, w: 14, h: 28 })] } });
    shelfBooks(S, 108, 8, 5); shelfBooks(S, 108, 62, 4); lamppost(S, 30, 106, 40); bush(S, 104, 100, 0.8);
    emblem(S, "book", "#2f5f86", 46, 42, 146, 1.7);
  },
};
