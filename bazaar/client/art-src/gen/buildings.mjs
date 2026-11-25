import * as E from "./engine.mjs";
const { volume, ground, box, barrel, sack, bush, tree, lamppost, planter, cyl, flame, brazier, crystal, cauldron, anvil, fence, hay, cheeseStack, produceCrate, hideRack, vat, barberPole, clothesline, skep, globe, lumber, stoneBlock, signpost, cart, rug, battlements } = E;

// ---- item helpers (local wall coords: u across, v down from the wall top) ----
const win = (u, v, o = {}) => ({ t: "win", u, v, w: 16, h: 22, ...o });
const door = (u, w, h, o = {}) => ({ t: "door", u, w, h, ...o });
const sign = (u, v, icon, o = {}) => ({ t: "sign", u, v, icon, ...o });
const lamp = (u, v) => ({ t: "lamp", u, v });
const awn = (u0, u1, o = {}) => ({ t: "awning", u0, u1, ...o });
const banner = (u, v, icon, o = {}) => ({ t: "banner", u, v, icon, ...o });
const clock = (u, v, o = {}) => ({ t: "clock", u, v, ...o });
const wheel = (u, v, o = {}) => ({ t: "wheel", u, v, ...o });
const row = (n, u0, step, v, o = {}) => Array.from({ length: n }, (_, i) => win(u0 + i * step, v, o));
const gableWin = (u, v = -30, o = {}) => win(u, v, { w: 14, h: 16, arch: true, ...o });

// columns flanking a door on the right wall (plane x=W), with entablature and steps
const portico = (S, W, H, ud, wd, c = "#ecebe6") => {
  const ph = H - 8;
  for (const y of [ud - 9, ud + wd + 3]) box(S, W + 1, y, 0, 6, 6, ph, c, { sw: 1.2 });
  box(S, W - 1, ud - 12, ph, 10, wd + 24, 6, E.shade(c, 0.95));
  box(S, W + 2, ud - 12, 0, 9, wd + 24, 3, E.shade(c, 0.9));
};
const house = (o) => ({ x0: 0, y0: 0, W: 92, D: 86, H: 60, ...o });
const gable = (c, o = {}) => ({ t: "gable", axis: "x", rh: 44, ov: 7, style: "tile", c, ...o });
const hip = (c, o = {}) => ({ t: "hip", rh: 52, ov: 5, style: "tile", c, ...o });

export const BUILDINGS = {
  // ======================= playable businesses =======================
  "spice-merchant": (S) => {
    ground(S, "cobble");
    volume(S, house({
      W: 96, D: 84, H: 54, wall: { k: "plaster", c: "#e8c98a", timber: "#7a4a2a", plinth: "#8d8478" },
      roof: gable("#b8602f", { style: "tile", rh: 40, ov: 9 }),
      chimney: { x: 66, y: 34, w: 12, h: 22, c: "#8a5a44" },
      L: { items: [win(10, 18, { shut: "#c0662a", flowers: ["#d9534f", "#f5b13d"] }), win(44, 18, { shut: "#c0662a" }), sign(72, 8, "pot", { c: "#d9a24a" })] },
      R: { items: [door(30, 24, 38, { c: "#6b3f26" }), win(6, 20, { shut: "#c0662a" }), win(60, 20, { shut: "#c0662a" }), awn(22, 58, { z: 50, d: 24, drop: 11, c1: "#e0792d", c2: "#f6e7b4", n: 8 }), lamp(66, 24), gableWin(42, -26)] },
    }));
    sack(S, 108, 18, "#c9552e"); sack(S, 108, 34, "#e8b53a"); sack(S, 104, 70, "#6a8f3a"); barrel(S, 20, 104, 8, 14); sack(S, 36, 106, "#a8442e", 0.9); rug(S, 98, 44, 12, 18, "#8a2f2a", "#e8b53a");
  },
  "brewery-distillery": (S) => {
    ground(S, "stone");
    volume(S, house({ x0: 0, y0: 0, W: 100, D: 90, H: 62, wall: { k: "brick", c: "#b06a52", plinth: "#6f665c", band: "#8a4a38" }, roof: hip("#4a4f5a", { style: "slate", rh: 46 }),
      chimney: { x: 24, y: 24, w: 18, h: 42, c: "#8a5a44" },
      L: { items: [win(10, 20, { shut: "#3f4a5a", w: 14 }), win(40, 20, { shut: "#3f4a5a", w: 14 }), win(70, 20, { shut: "#3f4a5a", w: 14 }), sign(84, 4, "mug", { c: "#b8863a" })] },
      R: { items: [door(32, 28, 40, { c: "#4a2f26", arch: false }), win(8, 22, { shut: "#3f4a5a" }), win(70, 22, { shut: "#3f4a5a" }), lamp(24, 20), lamp(72, 20)] } }));
    cyl(S, 108, 22, 10, 26, "#b87333", "#d89a58"); cyl(S, 108, 56, 8, 18, "#a9652d", "#cf8d4e"); barrel(S, 106, 80, 8, 15); barrel(S, 20, 104, 8, 15); barrel(S, 34, 108, 8, 15, "#b27f45");
  },
  bakery: (S) => {
    ground(S, "stone");
    volume(S, house({ W: 96, D: 86, H: 58, wall: { k: "plaster", c: "#efdbb0", timber: "#6a4630", plinth: "#8d8478" }, roof: gable("#c1553a", { rh: 44, ov: 8 }),
      chimney: { x: 66, y: 34, w: 13, h: 30, c: "#9a5a44" },
      L: { items: [win(10, 18, { shut: "#4f7a64", flowers: true }), win(44, 18, { shut: "#4f7a64", flowers: true }), sign(74, 8, "bread")] },
      R: { items: [door(30, 24, 38, { c: "#6b3f26", window: true }), win(6, 20, { shut: "#4f7a64" }), win(60, 20, { shut: "#4f7a64" }), gableWin(38, -24), awn(24, 58, { z: 50, d: 22, drop: 11, c1: "#c9473f", c2: "#f4ead6" }), lamp(66, 20)] } }));
    barrel(S, 110, 58, 8, 15); barrel(S, 108, 74, 7, 13, "#b27f45"); sack(S, 28, 104, "#efe6cf"); sack(S, 40, 108, "#e6dcc2", 0.9); bush(S, 112, 14, 0.9);
  },
  "tavern-inn": (S) => {
    ground(S, "cobble");
    volume(S, house({ W: 96, D: 84, H: 74, wall: { k: "plaster", c: "#eadfc6", timber: "#4f3220", plinth: "#7d7468" }, roof: { t: "gable", axis: "y", rh: 42, ov: 8, style: "slate", c: "#566a8c" },
      chimney: { x: 16, y: 26, w: 14, h: 28, c: "#7c6a5c" },
      L: { items: [win(10, 16, { shut: "#8a3b2c", flowers: true }), win(40, 16, { shut: "#8a3b2c", flowers: true }), win(70, 16, { shut: "#8a3b2c", flowers: true }), win(12, 46, { shut: "#8a3b2c" }), win(70, 46, { shut: "#8a3b2c" }), gableWin(28, -26), gableWin(56, -26), door(38, 24, 36, { c: "#5a3a26", window: true }), sign(84, 14, "mug", { c: "#b8863a" })] },
      R: { items: [win(8, 16, { shut: "#8a3b2c" }), win(40, 16, { shut: "#8a3b2c" }), win(8, 46, { shut: "#8a3b2c" }), win(40, 46, { shut: "#8a3b2c" }), lamp(64, 28)] } }));
    barrel(S, 108, 56, 8, 15); barrel(S, 106, 72, 8, 15, "#b27f45"); box(S, 30, 100, 0, 26, 10, 12, "#8b5a34", { planks: 3 }); lamppost(S, 108, 98, 40);
  },
  "clockmakers-workshop": (S) => {
    ground(S, "stone");
    const main = house({ W: 90, D: 86, H: 66, wall: { k: "brick", c: "#6aa0a6", plinth: "#6f7a7a", band: "#4f7e84" }, roof: hip("#8f5636", { rh: 40, ov: 6 }),
      L: { items: [win(8, 18, { shut: "#8f5636" }), win(36, 18, { shut: "#8f5636" }), win(64, 18, { shut: "#8f5636" }), sign(76, 40, "clock")] },
      R: { items: [door(28, 26, 40, { c: "#4a2f26", window: true }), win(6, 22, { shut: "#8f5636" }), win(58, 22, { shut: "#8f5636" }), lamp(22, 30)] } });
    volume(S, main);
    volume(S, { x0: 30, y0: 24, W: 30, D: 30, H: 50, z0: 70, wall: { k: "brick", c: "#7fb3b8", plinth: "#6f7a7a" }, roof: { t: "hip", rh: 38, ov: 3, style: "copper", c: "#9a5f3b", finial: true },
      L: { items: [clock(15, 20, { r: 10 })] }, R: { items: [win(8, 14, { w: 10, h: 16, arch: true, glow: "warm" })] } });
    barrel(S, 108, 50, 7, 12); box(S, 104, 70, 0, 14, 10, 10, "#a9763f", { planks: 2 }); bush(S, 16, 104, 0.9);
  },
  "arcane-goods-shop": (S) => {
    ground(S, "stone");
    volume(S, house({ W: 88, D: 84, H: 62, wall: { k: "stone", c: "#7a6aa8", plinth: "#4f4670", band: "#5a4a88" }, roof: hip("#3a2a6a", { rh: 60, ov: 5, style: "slate", finial: true }),
      L: { items: [win(8, 20, { glow: "cool", arch: true, w: 14, h: 26 }), win(34, 20, { glow: "cool", arch: true, w: 14, h: 26 }), win(60, 20, { glow: "cool", arch: true, w: 14, h: 26 }), sign(72, 6, "star", { c: "#6a58b0" })] },
      R: { items: [door(28, 24, 40, { c: "#2f2450", arch: true }), win(6, 22, { glow: "cool", w: 12 }), win(58, 22, { glow: "cool", w: 12 }), lamp(20, 26), banner(66, 10, "star", { c: "#3a2a6a" })] } }));
    crystal(S, 104, 22, 28, "#a56bff"); crystal(S, 108, 60, 20, "#59d0ff"); crystal(S, 24, 100, 22, "#ff7ad9"); lamppost(S, 100, 92, 38);
  },
  "herbalist-apothecary": (S) => {
    ground(S, "grass");
    volume(S, house({ W: 94, D: 84, H: 54, wall: { k: "plank", c: "#a9c795", plinth: "#8a8174" }, roof: gable("#cfae66", { style: "thatch", rh: 44, ov: 10 }),
      chimney: { x: 16, y: 32, w: 12, h: 22, c: "#8a8176" },
      L: { items: [win(8, 16, { shut: "#6b8f4f", flowers: true }), win(42, 16, { shut: "#6b8f4f", flowers: true }), sign(72, 6, "herb", { c: "#7aa35a" })] },
      R: { items: [door(28, 24, 38, { c: "#6b4a2a" }), win(6, 20, { shut: "#6b8f4f" }), win(58, 20, { shut: "#6b8f4f", flowers: true }), gableWin(36, -26), awn(22, 56, { z: 48, d: 18, drop: 10, c1: "#5a8f4a", c2: "#e8f0d0" })] } }));
    planter(S, 108, 58); planter(S, 100, 88); bush(S, 112, 12, 1.1, "#3f7a35"); bush(S, 14, 104, 1, "#5a9444"); tree(S, -4, 96, 0.75);
  },
  "alchemists-shop": (S) => {
    ground(S, "cobble");
    volume(S, { x0: 0, y0: 0, W: 38, D: 38, H: 108, wall: { k: "stone", c: "#8a8fa0", plinth: "#5f6370" }, roof: { t: "hip", rh: 50, ov: 4, style: "tile", c: "#6a4a98", finial: true },
      L: { items: [win(11, 30, { w: 12, h: 20, arch: true, glow: "green" }), win(11, 66, { w: 12, h: 20, arch: true, glow: "green" })] }, R: { items: [win(11, 40, { w: 12, h: 20, arch: true, glow: "green" })] } });
    volume(S, house({ x0: 10, y0: 30, W: 86, D: 56, H: 54, wall: { k: "plaster", c: "#b9b2d6", timber: "#4a3a66", plinth: "#6a6578" }, roof: gable("#4a8a6a", { rh: 36, ov: 7, style: "tile" }),
      chimney: { x: 60, y: 14, w: 12, h: 24, c: "#6a6578" },
      L: { items: [win(8, 16, { glow: "green", shut: "#4a3a66" }), win(34, 16, { glow: "green", shut: "#4a3a66" }), sign(62, 8, "bottle", { c: "#6a58b0" })] },
      R: { items: [door(14, 22, 36, { c: "#3a2a50" }), win(40, 18, { glow: "green", w: 10 }), lamp(32, 20)] } }));
    cauldron(S, 108, 54, "#6fe08a"); crystal(S, 104, 84, 18, "#6fe08a"); barrel(S, 28, 104, 7, 12, "#6a4a8a");
  },
  "scribe-bookshop": (S) => {
    ground(S, "cobble");
    volume(S, house({ W: 92, D: 84, H: 62, wall: { k: "plank", c: "#b8895f", plinth: "#807668" }, roof: { t: "gable", axis: "y", rh: 38, ov: 8, style: "tile", c: "#7c3a2e" },
      chimney: { x: 54, y: 22, w: 12, h: 24, c: "#7a5a46" },
      L: { items: [win(8, 20, { w: 26, h: 26, shut: "#3f5f7a", panes: 3 }), win(46, 20, { w: 26, h: 26, shut: "#3f5f7a", panes: 3 }), sign(78, 6, "book", { c: "#b8863a" }), gableWin(36, -22)] },
      R: { items: [door(28, 24, 38, { c: "#4a2e1c", window: true }), win(6, 20, { shut: "#3f5f7a" }), win(58, 20, { shut: "#3f5f7a" }), awn(22, 56, { z: 48, d: 18, drop: 10, c1: "#2f5f86", c2: "#efe2c0" }), lamp(66, 26)] } }));
    box(S, 110, 14, 0, 16, 12, 12, "#a9763f", { planks: 2 }); box(S, 106, 60, 0, 12, 14, 6, "#b3402e"); box(S, 106, 60, 6, 12, 14, 6, "#2e6f9a"); lamppost(S, 100, 94, 38);
  },
  "library-bookshop": (S) => {
    ground(S, "stone");
    volume(S, house({ W: 100, D: 88, H: 74, wall: { k: "stone", c: "#d2cbb8", plinth: "#8a8272", band: "#b9b19c" }, roof: hip("#4f8f7a", { rh: 36, ov: 6, style: "copper" }),
      L: { items: row(4, 8, 22, 22, { arch: true, w: 14, h: 30, stone: "#e3dccb" }) },
      R: { items: [door(30, 30, 46, { c: "#3a2a20", stone: "#e3dccb" }), win(6, 24, { arch: true, w: 12, h: 28 }), win(68, 24, { arch: true, w: 12, h: 28 }), banner(52, 6, "book", { c: "#2f4f6b", h: 36 })] } }));
    volume(S, { x0: 30, y0: 22, W: 38, D: 38, H: 34, z0: 90, wall: { k: "stone", c: "#d2cbb8", plinth: "#8a8272" }, roof: { t: "hip", rh: 30, ov: 3, style: "copper", c: "#4f8f7a", finial: true }, L: { items: [win(11, 8, { w: 14, h: 20, arch: true, glow: "warm" })] }, R: { items: [win(11, 8, { w: 14, h: 20, arch: true, glow: "warm" })] } });
    portico(S, 100, 74, 30, 30, "#ece6d6"); lamppost(S, 110, 100, 42);
  },
  "vacant-lot": (S) => {
    ground(S, "dirt", { force: true });
    fence(S, 4, 96, 44, 96, "#a9763f", 4); fence(S, 60, 96, 96, 96, "#a9763f", 4); fence(S, 96, 4, 96, 40, "#a9763f", 4); fence(S, 96, 56, 96, 96, "#a9763f", 4);
    signpost(S, 50, 88, "#c0392b"); stoneBlock(S, 20, 24, 10, 8, 6, "#9a968a"); stoneBlock(S, 70, 60, 8, 8, 5, "#a4a094"); bush(S, 14, 70, 0.7, "#6a8a3a"); bush(S, 78, 16, 0.6, "#7a9a44");
    box(S, 70, 24, 0, 12, 10, 8, "#a9763f", { planks: 2 });
  },
  "carpenters-yard": (S) => {
    ground(S, "dirt");
    volume(S, house({ x0: 4, y0: 6, W: 46, D: 40, H: 34, wall: { k: "plank", c: "#b08a5c", plinth: "#6f665a" }, roof: gable("#8a6a46", { style: "tile", rh: 24, ov: 5 }),
      L: { items: [win(8, 10, { w: 12, h: 14, shut: "#6a4a2c" }), win(26, 10, { w: 12, h: 14 })] }, R: { items: [door(10, 18, 26, { c: "#5a3a26", arch: false })] } }));
    lumber(S, 60, 14); lumber(S, 58, 30); lumber(S, 18, 70); signpost(S, 98, 80, "#c0392b"); cart(S, 60, 66); box(S, 40, 76, 0, 10, 10, 8, "#a9763f", { planks: 2 }); barrel(S, 80, 40, 6, 10, "#9a6a3a");
  },

  // ======================= landmarks =======================
  "bank-vault": (S) => {
    ground(S, "stone");
    const v = house({ W: 100, D: 90, H: 80, wall: { k: "stone", c: "#cfd2d6", plinth: "#8a8f96", band: "#b3b8be" }, roof: { t: "flat", c: "#9aa0a8", parapet: 12 },
      L: { items: [...row(3, 10, 32, 22, { glow: "dark", w: 14, h: 28, stone: "#e1e4e8" }), banner(84, 8, "coin", { c: "#2f4f6b", h: 40 })] },
      R: { items: [door(28, 34, 46, { c: "#5e626a", arch: false, stone: "#e8eaed" }), win(6, 20, { glow: "dark", w: 12, h: 28 }), win(70, 20, { glow: "dark", w: 12, h: 28 }), sign(54, 4, "coin", { c: "#d9ad4b", w: 24, h: 22 })] } });
    volume(S, v); battlements(S, v, 12);
    portico(S, 100, 80, 28, 34, "#eceef0"); lamppost(S, 114, 98, 42);
  },
  "goldsmith-vault": (S) => {
    ground(S, "cobble");
    volume(S, house({ W: 80, D: 76, H: 58, wall: { k: "stone", c: "#bdb8a8", plinth: "#7a7466", band: "#a8a290" }, roof: hip("#d9ad4b", { rh: 34, ov: 6, style: "copper", finial: true }),
      L: { items: [win(10, 16, { glow: "dark", w: 12, h: 24 }), win(34, 16, { glow: "dark", w: 12, h: 24 }), sign(58, 6, "gem", { c: "#2f4f6b" })] },
      R: { items: [door(24, 26, 38, { c: "#7a5a22", arch: true, stone: "#d9d3c0" }), win(6, 18, { glow: "dark", w: 10 }), win(52, 18, { glow: "dark", w: 10 }), lamp(18, 20)] } }));
    stoneBlock(S, 92, 26, 12, 12, 8, "#bdb8a8"); cyl(S, 96, 62, 6, 8, "#d9ad4b", "#f0cd6a"); cyl(S, 96, 62, 6, 8, "#c39a3b", "#e6c25f", 8); lamppost(S, 94, 84, 38);
  },
  "town-hall": (S) => {
    ground(S, "stone");
    volume(S, house({ W: 100, D: 88, H: 72, wall: { k: "stone", c: "#cdbf9f", plinth: "#857a62", band: "#b3a582" }, roof: hip("#a6432f", { rh: 40, ov: 6 }),
      L: { items: [...row(3, 10, 30, 20, { shut: "#3f5f7a", arch: true, w: 14, h: 28, stone: "#e0d4b6" }), banner(88, 6, "star", { c: "#a8322d", h: 40 })] },
      R: { items: [door(28, 30, 44, { c: "#4a2e1c", stone: "#e0d4b6" }), win(6, 20, { arch: true, w: 12, h: 28 }), win(66, 20, { arch: true, w: 12, h: 28 }), lamp(20, 24), lamp(66, 24)] } }));
    volume(S, { x0: 30, y0: 24, W: 36, D: 36, H: 46, z0: 82, wall: { k: "stone", c: "#cdbf9f", plinth: "#857a62" }, roof: { t: "hip", rh: 40, ov: 3, style: "tile", c: "#a6432f", finial: true }, L: { items: [clock(18, 20, { r: 11 })] }, R: { items: [win(11, 10, { w: 14, h: 22, arch: true, glow: "dark" })] } });
    portico(S, 100, 72, 28, 30, "#ece4cc"); lamppost(S, 112, 96, 42);
  },
  "bell-tower": (S) => {
    ground(S, "stone");
    volume(S, house({ x0: 4, y0: 40, W: 52, D: 46, H: 42, wall: { k: "stone", c: "#c4bcae", plinth: "#7d766a" }, roof: gable("#7a4a38", { rh: 28, ov: 6 }), L: { items: [win(10, 12, { arch: true, w: 12, h: 20, glow: "warm" }), win(30, 12, { arch: true, w: 12, h: 20, glow: "warm" })] }, R: { items: [door(14, 20, 30, { c: "#4a2e1c" })] } }));
    volume(S, { x0: 36, y0: 8, W: 44, D: 44, H: 128, wall: { k: "stone", c: "#cdc5b5", plinth: "#7d766a", band: "#b3ab9a" }, roof: { t: "hip", rh: 54, ov: 5, style: "slate", c: "#4f5f7a", finial: true },
      L: { items: [win(14, 14, { w: 14, h: 18, arch: true, glow: "dark" }), win(14, 56, { w: 14, h: 30, arch: true, glow: "dark", stone: "#e1dbcb" })] }, R: { items: [win(14, 14, { w: 14, h: 18, arch: true, glow: "dark" }), win(14, 56, { w: 14, h: 30, arch: true, glow: "dark", stone: "#e1dbcb" })] } });
    lamppost(S, 98, 96, 40); bush(S, 100, 30, 0.9);
  },
  "map-shop": (S) => {
    ground(S, "cobble");
    volume(S, house({ W: 92, D: 84, H: 62, wall: { k: "plank", c: "#a98a62", plinth: "#7a7060" }, roof: { t: "gable", axis: "y", rh: 40, ov: 8, style: "tile", c: "#2f6a74" },
      chimney: { x: 60, y: 22, w: 12, h: 22, c: "#6a5a4a" },
      L: { items: [win(8, 20, { shut: "#2f6a74", w: 22, h: 24, panes: 3 }), win(42, 20, { shut: "#2f6a74", w: 22, h: 24, panes: 3 }), sign(74, 6, "star", { c: "#d9a24a" }), gableWin(38, -22)] },
      R: { items: [door(28, 24, 38, { c: "#4a2e1c", window: true }), win(6, 20, { shut: "#2f6a74" }), win(58, 20, { shut: "#2f6a74" }), awn(22, 56, { z: 48, d: 18, drop: 10, c1: "#2f6a74", c2: "#efe2c0" })] } }));
    globe(S, 108, 40); box(S, 104, 62, 0, 14, 10, 8, "#8b5a34", { planks: 2 }); barrel(S, 24, 104, 7, 12); lamppost(S, 100, 92, 38);
  },
  "messenger-post": (S) => {
    ground(S, "dirt");
    volume(S, house({ W: 88, D: 80, H: 56, wall: { k: "plaster", c: "#e6dcc0", timber: "#5a4a3a", plinth: "#7a7060" }, roof: gable("#4f6f9a", { rh: 40, ov: 7, style: "slate" }),
      L: { items: [win(8, 18, { shut: "#3a5a86", flowers: true }), win(38, 18, { shut: "#3a5a86" }), banner(66, 6, "feather", { c: "#3a5a86" })] },
      R: { items: [door(26, 22, 36, { c: "#5a3a26" }), win(6, 20, { shut: "#3a5a86" }), win(52, 20, { shut: "#3a5a86" }), gableWin(32, -24), lamp(18, 24)] } }));
    volume(S, { x0: 26, y0: 28, W: 26, D: 22, H: 18, z0: 76, wall: { k: "plank", c: "#a98a62" }, roof: { t: "gable", axis: "x", rh: 14, ov: 3, style: "tile", c: "#7a4a38" }, L: { items: [win(6, 5, { w: 6, h: 6, glow: "dark" }), win(14, 5, { w: 6, h: 6, glow: "dark" })] }, R: { items: [win(6, 4, { w: 6, h: 6, glow: "dark" })] } });
    box(S, 102, 20, 0, 6, 6, 22, "#6b4a2e"); box(S, 98, 16, 22, 14, 10, 10, "#3a5a86"); signpost(S, 100, 80, "#3a5a86");
  },
  "town-clerk-office": (S) => {
    ground(S, "stone");
    volume(S, house({ W: 94, D: 86, H: 68, wall: { k: "brick", c: "#9a5a4a", plinth: "#6a6258", band: "#7a4636" }, roof: hip("#3f4a5a", { rh: 40, ov: 6, style: "slate", finial: true }),
      chimney: { x: 18, y: 18, w: 12, h: 26, c: "#7a4636" },
      L: { items: [...row(3, 8, 28, 20, { shut: "#2f3a4a", w: 14, h: 26, stone: "#d6d0c0" }), sign(78, 6, "quill", { c: "#b8863a" })] },
      R: { items: [door(28, 28, 44, { c: "#3a2a20", stone: "#d6d0c0", arch: false }), win(6, 22, { shut: "#2f3a4a" }), win(64, 22, { shut: "#2f3a4a" }), banner(48, 8, "key", { c: "#2f3a4a" }), lamp(20, 26)] } }));
    box(S, 98, 34, 0, 10, 28, 4, "#c9c2ae"); box(S, 100, 36, 4, 8, 24, 4, "#d6d0c0"); lamppost(S, 108, 92, 40);
  },
  "theater-hall": (S) => {
    ground(S, "stone");
    volume(S, house({ W: 100, D: 90, H: 72, wall: { k: "plaster", c: "#b8423a", timber: "#e6b84a", plinth: "#5a4034", band: "#e6b84a" }, roof: gable("#3a2a2a", { rh: 42, ov: 8, style: "slate" }),
      L: { items: [win(12, 20, { shut: "#e6b84a", flowers: false, w: 14, h: 26 }), win(44, 20, { shut: "#e6b84a", w: 14, h: 26 }), win(76, 20, { shut: "#e6b84a", w: 14, h: 26 }), sign(86, 0, "mask", { c: "#e6b84a" })] },
      R: { items: [door(26, 38, 48, { c: "#6a1f2a", arch: true, stone: "#e6b84a" }), win(6, 22, { w: 12, h: 26, shut: "#e6b84a" }), win(72, 22, { w: 12, h: 26, shut: "#e6b84a" }), banner(18, 6, "mask", { c: "#3a2a2a", trim: "#e6b84a" }), banner(64, 6, "star", { c: "#3a2a2a", trim: "#e6b84a" }), gableWin(42, -26, { glow: "warm" })] } }));
    portico(S, 100, 72, 26, 38, "#e6b84a"); rug(S, 106, 28, 12, 32, "#6a1f2a", "#e6b84a"); lamppost(S, 114, 96, 42);
  },
  "bazaar-merchant-shop": (S) => {
    ground(S, "cobble");
    volume(S, house({ W: 80, D: 70, H: 52, wall: { k: "plaster", c: "#e8d4a8", timber: "#8a3a2a", plinth: "#8a7a62" }, roof: gable("#2e7a8a", { rh: 34, ov: 12, style: "stripe", c2: "#e8c85a" }),
      L: { items: [win(8, 16, { shut: "#8a3a2a", curtain: "#c9473f" }), win(36, 16, { shut: "#8a3a2a" }), banner(62, 4, "star", { c: "#8a3a2a" })] },
      R: { items: [door(22, 22, 34, { c: "#5a2a22", arch: true }), win(4, 18, { shut: "#8a3a2a" }), win(48, 18, { shut: "#8a3a2a" }), awn(14, 48, { z: 46, d: 26, drop: 10, c1: "#2e7a8a", c2: "#e8c85a", n: 8 }), lamp(10, 22)] } }));
    rug(S, 96, 14, 16, 22, "#8a2f2a", "#e8b53a"); rug(S, 96, 44, 14, 18, "#2e5f8a", "#e6d6a0"); barrel(S, 22, 90, 7, 12); sack(S, 36, 94, "#c9552e"); lamppost(S, 100, 78, 36);
  },
  "city-gate": (S) => {
    ground(S, "stone");
    const wall = house({ x0: 0, y0: 30, W: 100, D: 32, H: 62, wall: { k: "stone", c: "#bdb6a8", plinth: "#7d766a" }, roof: { t: "flat", c: "#9a9488", parapet: 8 },
      L: { items: [] }, R: { items: [door(8, 24, 38, { c: "#2a2018", arch: true, stone: "#d4cdbd" })] } });
    wall.L.items = [{ t: "door", u: 34, w: 34, h: 46, c: "#2a2018", stone: "#d4cdbd" }, banner(10, 8, "star", { c: "#a8322d" }), banner(78, 8, "star", { c: "#a8322d" })];
    volume(S, { x0: -6, y0: 24, W: 34, D: 44, H: 100, wall: { k: "stone", c: "#c4bdae", plinth: "#7d766a" }, roof: { t: "hip", rh: 42, ov: 4, style: "slate", c: "#5a6478", finial: true }, L: { items: [win(11, 24, { w: 12, h: 24, arch: true, glow: "dark" })] }, R: { items: [win(14, 26, { w: 12, h: 22, glow: "dark" })] } });
    volume(S, wall); battlements(S, wall, 8);
    volume(S, { x0: 74, y0: 24, W: 34, D: 44, H: 100, wall: { k: "stone", c: "#c4bdae", plinth: "#7d766a" }, roof: { t: "hip", rh: 42, ov: 4, style: "slate", c: "#5a6478", finial: true }, L: { items: [win(11, 24, { w: 12, h: 24, arch: true, glow: "dark" })] }, R: { items: [win(14, 26, { w: 12, h: 22, glow: "dark" })] } });
    lamppost(S, 20, 84, 40); lamppost(S, 90, 84, 40);
  },

  "city-gate-ew": (S) => {
    ground(S, "stone");
    const wall = house({ x0: 30, y0: 0, W: 32, D: 100, H: 62, wall: { k: "stone", c: "#bdb6a8", plinth: "#7d766a" }, roof: { t: "flat", c: "#9a9488", parapet: 8 },
      L: { items: [win(8, 16, { w: 14, h: 24, arch: true, glow: "dark" })] },
      R: { items: [{ t: "door", u: 33, w: 34, h: 46, c: "#2a2018", stone: "#d4cdbd" }, banner(8, 8, "star", { c: "#a8322d" }), banner(78, 8, "star", { c: "#a8322d" })] } });
    const tower = (y0) => ({ x0: 22, y0, W: 46, D: 34, H: 100, wall: { k: "stone", c: "#c4bdae", plinth: "#7d766a" }, roof: { t: "hip", rh: 42, ov: 4, style: "slate", c: "#5a6478", finial: true }, L: { items: [win(16, 24, { w: 12, h: 24, arch: true, glow: "dark" })] }, R: { items: [win(11, 26, { w: 12, h: 22, glow: "dark" })] } });
    volume(S, tower(-6)); volume(S, wall); battlements(S, wall, 8); volume(S, tower(72));
    lamppost(S, 94, 20, 40); lamppost(S, 94, 92, 40);
  },

  // ======================= town accents =======================
  "watchtower-brazier": (S) => {
    ground(S, "stone");
    const v = { x0: 24, y0: 22, W: 50, D: 50, H: 118, wall: { k: "stone", c: "#bdb6a6", plinth: "#6f685c", band: "#a39c8c" }, roof: { t: "flat", c: "#9a9488", parapet: 8 },
      L: { items: [win(14, 24, { w: 12, h: 24, arch: true, glow: "dark" }), win(14, 68, { w: 12, h: 24, arch: true, glow: "warm" })] }, R: { items: [door(12, 26, 40, { c: "#3a2a20", arch: true })] } };
    volume(S, v); battlements(S, v, 8); brazier(S, 49, 47, 10); E.flame(S, ...E.P(49, 47, 140), 1.2);
    bush(S, 104, 70, 0.9); stoneBlock(S, 90, 20, 10, 10, 8); barrel(S, 20, 92, 7, 12);
  },
  guardhouse: (S) => {
    ground(S, "dirt");
    volume(S, house({ W: 84, D: 76, H: 52, wall: { k: "stone", c: "#a9a9a6", plinth: "#6f6f6a", band: "#8f8f8a" }, roof: gable("#7a3f34", { rh: 34, ov: 7 }),
      L: { items: [win(10, 16, { w: 10, h: 18, glow: "dark" }), win(32, 16, { w: 10, h: 18, glow: "dark" }), banner(58, 4, "star", { c: "#2f4f8a" })] },
      R: { items: [door(24, 24, 36, { c: "#3a2a20", arch: false }), win(6, 18, { w: 10, h: 18, glow: "dark" }), win(50, 18, { w: 10, h: 18, glow: "dark" }), lamp(18, 22)] } }));
    stoneBlock(S, 98, 26, 12, 12, 8); box(S, 96, 50, 0, 4, 4, 34, "#6b4a2e"); box(S, 104, 50, 0, 4, 4, 30, "#6b4a2e"); box(S, 94, 52, 14, 18, 4, 3, "#6b4a2e"); lamppost(S, 98, 86, 38);
  },
  "jewelers-shop": (S) => {
    ground(S, "stone");
    volume(S, house({ W: 86, D: 78, H: 62, wall: { k: "plaster", c: "#e9e1d0", timber: "#3a4a6a", plinth: "#8a8272", band: "#d9ad4b" }, roof: hip("#3a5a8a", { rh: 44, ov: 5, style: "slate", finial: true }),
      L: { items: [win(8, 20, { glow: "cool", shut: "#3a4a6a", w: 18, h: 24, panes: 3 }), win(38, 20, { glow: "cool", shut: "#3a4a6a", w: 18, h: 24, panes: 3 }), sign(66, 6, "gem", { c: "#3a4a6a" })] },
      R: { items: [door(24, 24, 38, { c: "#2a3450", arch: true, stone: "#d9ad4b" }), win(6, 22, { glow: "cool", w: 12 }), win(52, 22, { glow: "cool", w: 12 }), awn(18, 50, { z: 50, d: 18, drop: 10, c1: "#3a5a8a", c2: "#f1e6c8" }), lamp(60, 24)] } }));
    planter(S, 100, 26, ["#8fc3ff", "#ffffff", "#c9a8ff"]); planter(S, 100, 62, ["#8fc3ff", "#ffffff", "#c9a8ff"]); lamppost(S, 100, 90, 40);
  },
  "tailors-shop": (S) => {
    ground(S, "cobble");
    volume(S, house({ W: 90, D: 82, H: 60, wall: { k: "plaster", c: "#d9b8d0", timber: "#5a3a56", plinth: "#8a7a86" }, roof: gable("#6a3a6a", { rh: 42, ov: 8, style: "tile" }),
      L: { items: [win(8, 18, { shut: "#8a4a7a", flowers: true, w: 20 }), win(42, 18, { shut: "#8a4a7a", w: 20 }), sign(70, 6, "scissors", { c: "#b8a0c0" })] },
      R: { items: [door(26, 24, 38, { c: "#5a3a56", window: true }), win(6, 20, { shut: "#8a4a7a" }), win(56, 20, { shut: "#8a4a7a" }), gableWin(36, -24), awn(20, 54, { z: 48, d: 18, drop: 10, c1: "#8a4a7a", c2: "#f3e3ee" })] } }));
    box(S, 100, 20, 0, 14, 10, 8, "#c9545a"); box(S, 100, 20, 8, 14, 10, 7, "#5a8fc9"); box(S, 100, 20, 15, 14, 10, 6, "#e6c25a"); clothesline(S, 100, 50, 100, 90);
  },
  "music-shop": (S) => {
    ground(S, "cobble");
    volume(S, house({ W: 90, D: 82, H: 58, wall: { k: "plank", c: "#c08a5a", plinth: "#7a6a58" }, roof: { t: "gable", axis: "y", rh: 38, ov: 8, style: "tile", c: "#8a4a2a" },
      chimney: { x: 56, y: 22, w: 12, h: 22, c: "#7a5a46" },
      L: { items: [win(8, 20, { shut: "#4a6a4a", w: 20, panes: 3 }), win(42, 20, { shut: "#4a6a4a", w: 20, panes: 3 }), sign(70, 6, "lute", { c: "#c08a3a" }), win(38, -20, { w: 14, h: 14, arch: true })] },
      R: { items: [door(26, 24, 38, { c: "#5a3a26" }), win(6, 20, { shut: "#4a6a4a" }), win(56, 20, { shut: "#4a6a4a" }), awn(20, 54, { z: 48, d: 18, drop: 10, c1: "#4a6a4a", c2: "#f1e6c8" }), lamp(64, 24)] } }));
    barrel(S, 104, 22, 7, 12); box(S, 102, 56, 0, 12, 10, 8, "#8b5a34", { planks: 2 }); planter(S, 98, 80); lamppost(S, 20, 98, 36);
  },
  "toy-shop": (S) => {
    ground(S, "cobble");
    volume(S, house({ W: 88, D: 80, H: 58, wall: { k: "plaster", c: "#f2d36b", timber: "#d9534f", plinth: "#8a7a62" }, roof: gable("#3a8fd9", { rh: 42, ov: 9, style: "stripe", c2: "#f1f1f1" }),
      L: { items: [win(8, 18, { shut: "#d9534f", flowers: ["#d9534f", "#3a8fd9", "#f2d36b"], w: 20 }), win(40, 18, { shut: "#3a8fd9", w: 20 }), sign(66, 6, "toy", { c: "#d9534f" })] },
      R: { items: [door(24, 24, 36, { c: "#3a8fd9", window: true }), win(6, 18, { shut: "#d9534f" }), win(52, 18, { shut: "#3a8fd9" }), gableWin(32, -24, { glow: "warm" }), awn(18, 52, { z: 46, d: 18, drop: 10, c1: "#d9534f", c2: "#f1f1f1" })] } }));
    box(S, 100, 20, 0, 10, 10, 10, "#d9534f"); box(S, 100, 20, 10, 10, 10, 10, "#3a8fd9"); box(S, 100, 20, 20, 10, 10, 10, "#f2d36b"); box(S, 100, 52, 0, 12, 12, 8, "#6bbf59");
  },
  barbershop: (S) => {
    ground(S, "cobble");
    volume(S, house({ W: 80, D: 72, H: 54, wall: { k: "brick", c: "#c9a07a", plinth: "#7a6a5a" }, roof: gable("#3f5f86", { rh: 36, ov: 7, style: "tile" }),
      L: { items: [win(8, 16, { shut: "#3f5f86", w: 22, h: 24, panes: 3 }), win(38, 16, { shut: "#3f5f86", w: 18 }), sign(58, 4, "pole", { c: "#e8e0d0" })] },
      R: { items: [door(22, 22, 34, { c: "#3a2a20", window: true }), win(4, 18, { shut: "#3f5f86" }), win(46, 18, { shut: "#3f5f86" }), awn(16, 46, { z: 44, d: 18, drop: 10, c1: "#c0392b", c2: "#f3ead8", n: 6 })] } }));
    barberPole(S, 98, 66); barberPole(S, 98, 26); planter(S, 96, 46); lamppost(S, 98, 88, 38);
  },
  bathhouse: (S) => {
    ground(S, "stone");
    volume(S, house({ W: 96, D: 84, H: 56, wall: { k: "stone", c: "#d4d0c4", plinth: "#8a8678", band: "#bdb8a8" }, roof: hip("#6a9aa8", { rh: 30, ov: 7, style: "copper" }),
      chimney: { x: 66, y: 28, w: 14, h: 24, c: "#9a948a", smoke: true },
      L: { items: [win(8, 16, { w: 14, h: 22, arch: true, glow: "cool" }), win(32, 16, { w: 14, h: 22, arch: true, glow: "cool" }), win(56, 16, { w: 14, h: 22, arch: true, glow: "cool" })] },
      R: { items: [door(26, 28, 40, { c: "#4a5a66", arch: true, stone: "#e6e2d6" }), win(6, 18, { arch: true, w: 12, h: 22, glow: "cool" }), win(58, 18, { arch: true, w: 12, h: 22, glow: "cool" }), lamp(20, 22)] } }));
    cyl(S, 108, 24, 12, 8, "#8a8678", "#6fb8d9"); cyl(S, 106, 62, 7, 10, "#b87333", "#d89a58"); box(S, 100, 80, 0, 14, 8, 8, "#a9763f"); bush(S, 16, 104, 0.9);
  },
  cheesemonger: (S) => {
    ground(S, "cobble");
    volume(S, house({ W: 90, D: 80, H: 54, wall: { k: "plaster", c: "#f0d98a", timber: "#8a6a2a", plinth: "#8a7a5a" }, roof: gable("#a8662f", { rh: 40, ov: 8, style: "tile" }),
      chimney: { x: 62, y: 32, w: 12, h: 20, c: "#8a6a4a" },
      L: { items: [win(8, 16, { shut: "#8a6a2a", flowers: ["#ffffff", "#f2d36b"] }), win(40, 16, { shut: "#8a6a2a" }), sign(66, 6, "cheese", { c: "#d9a24a" })] },
      R: { items: [door(24, 24, 36, { c: "#6a4a26" }), win(6, 18, { shut: "#8a6a2a" }), win(54, 18, { shut: "#8a6a2a" }), gableWin(34, -24), awn(18, 52, { z: 46, d: 20, drop: 10, c1: "#e0b030", c2: "#f6efd8" })] } }));
    cheeseStack(S, 108, 24); cheeseStack(S, 108, 50); cheeseStack(S, 104, 74); barrel(S, 22, 100, 7, 12);
  },
  "greengrocer-shop": (S) => {
    ground(S, "cobble");
    volume(S, house({ W: 90, D: 80, H: 54, wall: { k: "plank", c: "#9cc08a", plinth: "#7a7a62" }, roof: gable("#a8582f", { rh: 38, ov: 8, style: "tile" }),
      L: { items: [win(8, 16, { shut: "#4f8f4a", flowers: true }), win(40, 16, { shut: "#4f8f4a" }), sign(66, 6, "herb", { c: "#7aa35a" })] },
      R: { items: [door(24, 24, 36, { c: "#5a4a2a" }), win(6, 18, { shut: "#4f8f4a" }), win(54, 18, { shut: "#4f8f4a" }), gableWin(34, -22), awn(16, 54, { z: 46, d: 24, drop: 10, c1: "#3f8f3f", c2: "#f1f5df", n: 8 })] } }));
    produceCrate(S, 100, 14); produceCrate(S, 100, 28, ["#e8c85a", "#e67e22", "#c0392b"]); produceCrate(S, 100, 42, ["#6bbf59", "#27ae60", "#8fd9a0"]); produceCrate(S, 100, 62, ["#9b59b6", "#c0392b", "#e67e22"]); barrel(S, 24, 100, 7, 12);
  },
  fishmonger: (S) => {
    ground(S, "stone");
    volume(S, house({ W: 88, D: 78, H: 52, wall: { k: "plank", c: "#7aa0b8", plinth: "#5a6a76" }, roof: gable("#3f5a76", { rh: 36, ov: 8, style: "slate" }),
      L: { items: [win(8, 16, { shut: "#2f4a62", w: 18 }), win(38, 16, { shut: "#2f4a62", w: 18 }), sign(64, 4, "fish", { c: "#d9d2b0" })] },
      R: { items: [door(24, 24, 34, { c: "#2f4a62", arch: false }), win(6, 16, { shut: "#2f4a62" }), win(52, 16, { shut: "#2f4a62" }), awn(16, 52, { z: 44, d: 22, drop: 10, c1: "#2f6a8f", c2: "#e6f0f3", n: 8 }), lamp(60, 20)] } }));
    box(S, 98, 18, 0, 16, 10, 8, "#c9d9e0", { planks: 2 }); box(S, 98, 40, 0, 16, 10, 8, "#c9d9e0", { planks: 2 }); barrel(S, 100, 66, 8, 14, "#4f6a8a"); barrel(S, 24, 98, 7, 12, "#4f6a8a"); lamppost(S, 98, 86, 36);
  },
  "tavern-lounge": (S) => {
    ground(S, "cobble");
    volume(S, house({ W: 94, D: 82, H: 58, wall: { k: "plank", c: "#7a5a3e", plinth: "#5a4a3a" }, roof: { t: "gable", axis: "y", rh: 36, ov: 9, style: "tile", c: "#5a2a2a" },
      L: { items: [win(8, 18, { shut: "#2a4a3a", w: 18, panes: 3 }), win(40, 18, { shut: "#2a4a3a", w: 18, panes: 3 }), sign(70, 6, "mug", { c: "#b8863a" }), lamp(86, 20)] },
      R: { items: [door(24, 26, 38, { c: "#3a2418", window: true }), win(6, 20, { shut: "#2a4a3a" }), win(54, 20, { shut: "#2a4a3a" }), lamp(18, 20), lamp(52, 20)] } }));
    cyl(S, 108, 30, 8, 12, "#6b4a2e", "#8a6a44"); cyl(S, 108, 62, 8, 12, "#6b4a2e", "#8a6a44"); barrel(S, 28, 102, 7, 12); lamppost(S, 100, 92, 40);
  },
  "fortune-teller-tent": (S) => {
    ground(S, "dirt");
    volume(S, { x0: 10, y0: 10, W: 76, D: 76, H: 10, wall: { k: "plaster", c: "#6a3a8a" }, roof: { t: "hip", rh: 78, ov: 8, style: "stripe", c: "#6a3a8a", c2: "#e6b84a", finial: true },
      L: { items: [door(24, 28, 10, { c: "#2a1a3a", arch: false })] }, R: { items: [] } });
    cyl(S, 98, 70, 7, 8, "#2a1a3a", "#4a2a6a"); crystal(S, 98, 70, 14, "#9be3ff", 8); crystal(S, 20, 98, 16, "#e6b84a"); lamppost(S, 100, 20, 36); rug(S, 40, 90, 22, 12, "#6a3a8a", "#e6b84a");
  },
  "blacksmith-forge": (S) => {
    ground(S, "stone");
    volume(S, house({ W: 92, D: 84, H: 54, wall: { k: "stone", c: "#9a9aa0", plinth: "#5f5f66", band: "#7a7a80" }, roof: gable("#4a4046", { rh: 38, ov: 9, style: "slate" }),
      chimney: { x: 16, y: 32, w: 16, h: 36, c: "#6a5a54", smoke: true },
      L: { items: [win(8, 16, { w: 22, h: 24, glow: "red", shut: "#3a3036" }), win(44, 16, { w: 14, glow: "dark", shut: "#3a3036" }), sign(70, 6, "anvil", { c: "#6a6a72" })] },
      R: { items: [door(22, 36, 38, { c: "#3a2a20", arch: false }), win(6, 20, { glow: "red", w: 10 }), win(64, 20, { w: 12, glow: "dark" }), lamp(14, 22)] } }));
    anvil(S, 108, 40); barrel(S, 106, 66, 7, 12, "#4a4a52"); box(S, 100, 10, 0, 16, 10, 8, "#6a6a72"); stoneBlock(S, 20, 98, 12, 10, 8, "#7a7a80"); flame(S, ...E.P(104, 28, 4), 0.6);
  },
  "potters-workshop": (S) => {
    ground(S, "dirt");
    volume(S, house({ W: 92, D: 82, H: 54, wall: { k: "plaster", c: "#d9a07a", plinth: "#8a6a4a" }, roof: gable("#b8602f", { rh: 38, ov: 9, style: "tile" }),
      chimney: { x: 64, y: 32, w: 14, h: 22, c: "#9a5a44" },
      L: { items: [win(8, 16, { shut: "#8a4a2a", flowers: ["#e66f9a", "#f2c94c"] }), win(40, 16, { shut: "#8a4a2a" }), sign(66, 6, "pot", { c: "#c4683d" })] },
      R: { items: [door(24, 28, 36, { c: "#5a3a26" }), win(6, 18, { shut: "#8a4a2a" }), win(56, 18, { shut: "#8a4a2a" }), awn(18, 54, { z: 46, d: 20, drop: 10, c1: "#b8602f", c2: "#f1e1c6" })] } }));
    for (const [x, y, h, c] of [[104, 20, 12, "#c4683d"], [112, 34, 16, "#b8602f"], [104, 52, 10, "#d27a4c"], [108, 72, 14, "#a9552f"]]) cyl(S, x, y, 6, h, c, "#5a3a2a");
    cyl(S, 26, 100, 9, 8, "#8a6a4a", "#5a4a3a");
  },
  "glassblowers-workshop": (S) => {
    ground(S, "stone");
    volume(S, house({ W: 92, D: 84, H: 56, wall: { k: "brick", c: "#5f8aa8", plinth: "#4a5a6a", band: "#4a6a88" }, roof: gable("#3a4a60", { rh: 38, ov: 8, style: "slate" }),
      chimney: { x: 20, y: 34, w: 16, h: 38, c: "#7a6a6a", smoke: true },
      L: { items: [win(8, 16, { w: 20, h: 24, glow: "red", shut: "#2f3a4a" }), win(40, 16, { glow: "cool", shut: "#2f3a4a" }), sign(66, 6, "bottle", { c: "#3a6a8a" })] },
      R: { items: [door(24, 26, 36, { c: "#2f3a4a", window: true }), win(6, 18, { glow: "red", w: 10 }), win(58, 18, { glow: "cool", w: 12 }), lamp(18, 22)] } }));
    for (const [x, y, c] of [[104, 22, "#6fd0e0"], [112, 36, "#a0e08a"], [104, 54, "#e08ad0"], [110, 74, "#6fd0e0"]]) { cyl(S, x, y, 4, 12, c, E.shade(c, 1.2)); }
    flame(S, ...E.P(100, 44, 4), 0.6); barrel(S, 24, 100, 7, 12);
  },
  "weavers-workshop": (S) => {
    ground(S, "grass");
    volume(S, house({ W: 100, D: 76, H: 48, wall: { k: "plank", c: "#b89a6a", plinth: "#7a6a50" }, roof: gable("#8a6a46", { rh: 34, ov: 10, style: "thatch" }),
      L: { items: [win(8, 14, { shut: "#6a4a8a", w: 22, panes: 3 }), win(44, 14, { shut: "#6a4a8a", w: 22, panes: 3 }), sign(76, 4, "star", { c: "#8a4a7a" })] },
      R: { items: [door(22, 24, 32, { c: "#5a3a26" }), win(4, 14, { shut: "#6a4a8a" }), win(50, 14, { shut: "#6a4a8a" }), awn(14, 46, { z: 42, d: 20, drop: 10, c1: "#8a4a7a", c2: "#e8dcc8" })] } }));
    box(S, 108, 16, 0, 12, 10, 10, "#c9545a"); box(S, 108, 16, 10, 12, 10, 8, "#e6c25a"); box(S, 108, 36, 0, 12, 10, 10, "#5a8fc9"); box(S, 108, 36, 10, 12, 10, 8, "#7ac95a"); clothesline(S, 100, 56, 100, 90); bush(S, 16, 100, 0.9);
  },
  "leatherworkers-workshop": (S) => {
    ground(S, "dirt");
    volume(S, house({ W: 90, D: 80, H: 52, wall: { k: "plank", c: "#8a6a4a", plinth: "#5a4a3a" }, roof: gable("#5a3a2a", { rh: 36, ov: 8, style: "tile" }),
      L: { items: [win(8, 16, { shut: "#4a3220", w: 18 }), win(40, 16, { shut: "#4a3220", w: 18 }), sign(66, 6, "scissors", { c: "#a9763f" })] },
      R: { items: [door(24, 24, 34, { c: "#3a2418" }), win(6, 18, { shut: "#4a3220" }), win(54, 18, { shut: "#4a3220" }), awn(18, 52, { z: 44, d: 20, drop: 10, c1: "#7a4a2a", c2: "#e6d6b0" })] } }));
    hideRack(S, 108, 36); barrel(S, 106, 66, 7, 12, "#5a3a2a"); box(S, 22, 98, 0, 18, 10, 8, "#7a4a2a", { planks: 2 });
  },
  tannery: (S) => {
    ground(S, "dirt");
    volume(S, house({ W: 88, D: 78, H: 50, wall: { k: "plank", c: "#7a6248", plinth: "#4f4636" }, roof: gable("#4f3f30", { rh: 34, ov: 9, style: "thatch" }),
      L: { items: [win(8, 14, { shut: "#3a2a1c", w: 16 }), win(36, 14, { shut: "#3a2a1c", w: 16 }), sign(60, 4, "scissors", { c: "#8a6a3a" })] },
      R: { items: [door(22, 24, 32, { c: "#2f2218", arch: false }), win(6, 16, { shut: "#3a2a1c" }), win(52, 16, { shut: "#3a2a1c" })] } }));
    vat(S, 104, 24, "#6a4a22"); vat(S, 108, 52, "#7a5a2a"); hideRack(S, 100, 84); barrel(S, 22, 98, 7, 12, "#4a3a2a");
  },
  "stonemason-workshop": (S) => {
    ground(S, "dirt");
    volume(S, house({ W: 90, D: 80, H: 50, wall: { k: "stone", c: "#b0aca0", plinth: "#6f6a60", band: "#9a968a" }, roof: gable("#6a5a4a", { rh: 34, ov: 8, style: "slate" }),
      L: { items: [win(8, 14, { shut: "#5a4a3a", w: 18 }), win(40, 14, { shut: "#5a4a3a", w: 18 }), sign(66, 4, "anvil", { c: "#8a8a90" })] },
      R: { items: [door(24, 26, 34, { c: "#3a2a20", arch: false }), win(6, 16, { shut: "#5a4a3a" }), win(54, 16, { shut: "#5a4a3a" }), lamp(18, 20)] } }));
    stoneBlock(S, 102, 14, 16, 14, 12); stoneBlock(S, 104, 34, 14, 12, 8, "#b8b4a8"); stoneBlock(S, 100, 56, 18, 12, 14, "#a4a094"); stoneBlock(S, 24, 98, 12, 10, 8); cart(S, 60, 94);
  },
  "laundry-house": (S) => {
    ground(S, "grass");
    volume(S, house({ W: 88, D: 78, H: 52, wall: { k: "plaster", c: "#f1ece0", timber: "#6a8aa8", plinth: "#8a8678" }, roof: gable("#6a8aa8", { rh: 38, ov: 8, style: "tile" }),
      chimney: { x: 60, y: 30, w: 12, h: 20, c: "#8a8678", smoke: true },
      L: { items: [win(8, 16, { shut: "#6a8aa8", flowers: true }), win(38, 16, { shut: "#6a8aa8" }), sign(62, 4, "steam", { c: "#c9d9e6" })] },
      R: { items: [door(22, 24, 34, { c: "#4a6a88" }), win(6, 18, { shut: "#6a8aa8" }), win(50, 18, { shut: "#6a8aa8", flowers: true }), gableWin(30, -22)] } }));
    clothesline(S, 100, 8, 100, 60); clothesline(S, 14, 100, 70, 100); barrel(S, 100, 74, 8, 12, "#7a8a9a"); bush(S, 108, 92, 0.8);
  },

  // ======================= countryside =======================
  "sacred-grove": (S) => {
    ground(S, "grass");
    for (const [x, y, s] of [[10, 10, 1.05], [88, 8, 1.1], [6, 84, 1], [92, 90, 1.1], [48, 0, 0.9]]) tree(S, x, y, s, "#3f7a35");
    for (const [x, y, h] of [[28, 34, 30], [64, 34, 26], [28, 64, 24], [64, 64, 28]]) { box(S, x, y, 0, 8, 8, h, "#9a9a96", { planks: 0 }); box(S, x - 1, y - 1, h, 10, 10, 4, "#b0b0aa"); }
    box(S, 40, 42, 0, 26, 16, 10, "#a4a4a0"); box(S, 44, 45, 10, 18, 10, 6, "#bdbdb6"); flame(S, ...E.P(53, 50, 20), 0.7); crystal(S, 48, 56, 12, "#7affb2"); bush(S, 26, 100, 0.9); bush(S, 80, 40, 0.8, "#6aa44a");
  },
  "farmhouse-cottage": (S) => {
    ground(S, "grass");
    volume(S, house({ W: 86, D: 78, H: 50, wall: { k: "plaster", c: "#f1ead8", timber: "#7a5a3a", plinth: "#8a8272" }, roof: gable("#c9a85e", { style: "thatch", rh: 42, ov: 10 }),
      chimney: { x: 60, y: 30, w: 14, h: 24, c: "#8a7260" },
      L: { items: [win(8, 14, { shut: "#4f7a64", flowers: true }), win(40, 14, { shut: "#4f7a64", flowers: true })] },
      R: { items: [door(22, 24, 34, { c: "#6b4a2a" }), win(4, 16, { shut: "#4f7a64" }), win(48, 16, { shut: "#4f7a64" }), gableWin(32, -24)] } }));
    fence(S, 96, 4, 96, 96, "#a9763f", 7); fence(S, 4, 98, 96, 98, "#a9763f", 7);
    for (let i = 0; i < 4; i++) { box(S, 104, 20 + i * 18, 0, 6, 14, 2, "#6a4a2a"); for (let k = 0; k < 3; k++) { const [cx, cy] = P_(107, 24 + i * 18 + k * 4, 2); S.add(`<circle cx="${cx}" cy="${cy - 3}" r="3" fill="${["#6bbf59", "#e67e22", "#c0392b", "#6bbf59"][i]}" stroke="#2a3a1e" stroke-width=".8"/>`); } }
    tree(S, 112, 98, 0.7); bush(S, 12, 98, 0.9);
  },
  "mill-house": (S) => {
    ground(S, "grass");
    volume(S, house({ W: 80, D: 78, H: 64, wall: { k: "stone", c: "#c8c0ae", plinth: "#7a7262" }, roof: gable("#7a4a30", { rh: 42, ov: 8, style: "tile" }),
      L: { items: [win(8, 16, { shut: "#5a4a3a" }), win(36, 16, { shut: "#5a4a3a" }), banner(62, 4, "star", { c: "#7a4a30" })] },
      R: { items: [door(24, 24, 36, { c: "#4a2e1c" }), win(6, 18, { shut: "#5a4a3a" }), win(52, 18, { shut: "#5a4a3a" }), wheel(66, 40, { r: 20 }), gableWin(28, -24)] } }));
    const [a, b, c, d] = [E.P(96, -8, 0), E.P(110, -8, 0), E.P(110, 104, 0), E.P(96, 104, 0)];
    S.add(`<polygon points="${[a, b, c, d].map((p) => p.join(",")).join(" ")}" fill="#5aa8d0" stroke="#2a1c15" stroke-width="1.2" opacity=".9"/>`);
    sack(S, 22, 98, "#efe6cf"); sack(S, 34, 102, "#e6dcc2", 0.9); barrel(S, 100, 8, 7, 12); bush(S, 12, 96, 0.9);
  },
  "apiary-beekeeper": (S) => {
    ground(S, "grass");
    volume(S, house({ x0: 0, y0: 0, W: 70, D: 66, H: 46, wall: { k: "plank", c: "#c9a86a", plinth: "#8a7a5a" }, roof: gable("#d9b84a", { style: "thatch", rh: 36, ov: 9 }),
      L: { items: [win(8, 14, { shut: "#8a6a2a", flowers: ["#f2c94c", "#ffffff"] }), win(34, 14, { shut: "#8a6a2a" })] },
      R: { items: [door(20, 22, 32, { c: "#6b4a2a" }), win(4, 14, { shut: "#8a6a2a" }), win(42, 14, { shut: "#8a6a2a" })] } }));
    for (const [x, y] of [[88, 14], [96, 34], [88, 54], [100, 74], [30, 90], [50, 96]]) { box(S, x - 6, y - 4, 0, 12, 8, 4, "#8a6a3a", { sw: 1 }); skep(S, x, y); }
    planter(S, 80, 84, ["#f2c94c", "#ffffff", "#e66f9a"]); bush(S, 10, 90, 1, "#5aa044"); tree(S, 110, 98, 0.65);
  },
  "dairy-barn": (S) => {
    ground(S, "grass");
    volume(S, house({ W: 94, D: 84, H: 54, wall: { k: "plank", c: "#b8442f", plinth: "#6a4a3a" }, roof: { t: "gable", axis: "y", rh: 44, ov: 9, style: "slate", c: "#4a4f5a" },
      L: { items: [door(24, 46, 40, { c: "#f3ead8", arch: false, stone: "#f3ead8" }), win(8, -18, { w: 14, h: 16, glow: "dark", stone: "#f3ead8" }), win(34, -18, { w: 14, h: 16, glow: "dark", stone: "#f3ead8" }), win(72, 14, { w: 10, h: 12, stone: "#f3ead8", glow: "dark" })] },
      R: { items: [win(6, 14, { w: 12, h: 12, stone: "#f3ead8", glow: "dark" }), win(36, 14, { w: 12, h: 12, stone: "#f3ead8", glow: "dark" }), win(62, 14, { w: 12, h: 12, stone: "#f3ead8", glow: "dark" })] } }));
    cyl(S, 112, 20, 7, 16, "#c9cfd6", "#9aa0a8"); cyl(S, 112, 38, 7, 16, "#c9cfd6", "#9aa0a8"); hay(S, 104, 62); fence(S, 100, 84, 100, 104, "#a9763f", 3); bush(S, 12, 100, 0.9);
  },
  "stable-horse-market": (S) => {
    ground(S, "dirt");
    volume(S, house({ x0: 4, y0: 4, W: 90, D: 52, H: 46, wall: { k: "plank", c: "#a98458", plinth: "#6a5a42" }, roof: gable("#7a5a3a", { rh: 30, ov: 9, style: "thatch" }),
      L: { items: [door(8, 24, 32, { c: "#4a3220", arch: false }), door(40, 24, 32, { c: "#4a3220", arch: false }), win(70, 12, { w: 12, h: 14, shut: "#4a3220" })] },
      R: { items: [door(10, 22, 30, { c: "#4a3220", arch: false }), win(32, 12, { shut: "#4a3220", w: 12, h: 14 })] } }));
    fence(S, 4, 66, 94, 66, "#a9763f", 8); fence(S, 94, 66, 94, 104, "#a9763f", 4); fence(S, 4, 104, 94, 104, "#a9763f", 8);
    hay(S, 100, 20); hay(S, 102, 36, "#d9b84a"); box(S, 56, 80, 0, 26, 8, 8, "#7a5a3a", { planks: 2 }); barrel(S, 20, 84, 7, 11, "#4f8aa8"); bush(S, 108, 70, 0.8);
  },
  "shrine-chapel": (S) => {
    ground(S, "stone");
    volume(S, house({ W: 70, D: 82, H: 56, wall: { k: "stone", c: "#d4cfc2", plinth: "#8a8578", band: "#bdb8aa" }, roof: { t: "gable", axis: "y", rh: 38, ov: 7, style: "slate", c: "#5a6a8a" },
      L: { items: [door(22, 26, 38, { c: "#4a2e1c", arch: true, stone: "#e6e2d6" }), win(6, 14, { arch: true, w: 10, h: 22, glow: "cool" }), win(52, 14, { arch: true, w: 10, h: 22, glow: "warm" }), win(30, -22, { arch: true, w: 10, h: 18, glow: "red" })] },
      R: { items: [win(8, 14, { arch: true, w: 12, h: 26, glow: "cool" }), win(32, 14, { arch: true, w: 12, h: 26, glow: "warm" }), win(56, 14, { arch: true, w: 12, h: 26, glow: "red" })] } }));
    volume(S, { x0: 20, y0: 24, W: 24, D: 24, H: 26, z0: 80, wall: { k: "stone", c: "#d4cfc2", plinth: "#8a8578" }, roof: { t: "hip", rh: 26, ov: 3, style: "slate", c: "#5a6a8a", finial: true }, L: { items: [win(7, 6, { arch: true, w: 10, h: 16, glow: "dark" })] }, R: { items: [win(7, 6, { arch: true, w: 10, h: 16, glow: "dark" })] } });
    box(S, 8, 90, 0, 54, 8, 4, "#c4bfb2"); box(S, 10, 92, 4, 50, 6, 4, "#d4cfc2"); planter(S, 96, 30, ["#ffffff", "#e6b8ff"]); planter(S, 96, 62, ["#ffffff", "#e6b8ff"]); bush(S, 104, 92, 0.8);
  },
  "merchants-house": (S) => {
    ground(S, "cobble");
    volume(S, house({ W: 92, D: 84, H: 88, wall: { k: "brick", c: "#b5775a", plinth: "#7a6a5a", band: "#d6c6a0" }, roof: hip("#3f4a5a", { rh: 40, ov: 6, style: "slate", finial: true }),
      chimney: { x: 14, y: 16, w: 12, h: 26, c: "#8a4a38" },
      L: { items: [...row(3, 8, 28, 14, { shut: "#2f5a4a", w: 14, h: 22 }), ...row(3, 8, 28, 52, { shut: "#2f5a4a", w: 14, h: 22 }), banner(78, 6, "coin", { c: "#2f5a4a" })] },
      R: { items: [door(28, 26, 40, { c: "#3a2418", stone: "#d6c6a0" }), win(6, 14, { shut: "#2f5a4a" }), win(58, 14, { shut: "#2f5a4a" }), win(6, 52, { shut: "#2f5a4a" }), win(58, 52, { shut: "#2f5a4a" }), win(28, 52, { w: 26, h: 22, arch: false, shut: "#2f5a4a", panes: 3 }), awn(22, 58, { z: 50, d: 18, drop: 10, c1: "#2f5a4a", c2: "#efe2c0" }), lamp(66, 36)] } }));
    planter(S, 104, 22); planter(S, 104, 62); lamppost(S, 106, 90, 42); bush(S, 12, 104, 0.9);
  },
};
const P_ = (x, y, z = 0) => E.P(x, y, z).map((n) => +n.toFixed(1));
