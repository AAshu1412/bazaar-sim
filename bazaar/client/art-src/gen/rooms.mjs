// The interiors the game shows (shop panel and auction). Each matches its shopfront's colours and has someone in it.
// Composed to survive cropping: shop panels crop to 2:1 (y 24..408), the auction to 3:1 (y 88..344).
import { shell, barrel, sack, crate, counter, table, shelf, bottle, jar, loaf, book, books, candle, kettle, plantPot, ladder, banner, rugI, flameI, crystalI } from "./interior.mjs";
import { shade } from "./engine.mjs";
import { GLYPH } from "./glyphs.mjs";

const O = "#2a1c15", f = (n) => +n.toFixed(1);
const rect = (S, x, y, w, h, fill, rx = 4, sw = 2.4) => S.add(`<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${rx}" fill="${fill}" stroke="${O}" stroke-width="${sw}"/>`);
const circ = (S, x, y, r, fill, sw = 2) => S.add(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}" stroke="${O}" stroke-width="${sw}"/>`);
const path = (S, d, fill = "none", stroke = O, sw = 2.2) => S.add(`<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`);
const lg = (S, c, d = [0, 0, 0, 1]) => S.grad([[0, shade(c, 1.18)], [1, shade(c, 0.78)]], d);
const glow = (S, x, y, r, c, a = 0.55) => S.add(`<circle cx="${x}" cy="${y}" r="${r}" fill="${S.radial([[0, c, a], [1, c, 0]])}"/>`);

/** Softer than the old vignette, so props at the edges stay colourful. */
const finish = (S, tint) => S.add(`<rect width="768" height="432" fill="${S.radial([[0.62, "#000", 0], [1, "#000", 0.28]])}"/><rect width="768" height="432" fill="${tint}" opacity=".05"/>`);
/** Bright daylight wash behind the room's contents, so small thumbnails read clearly. */
const light = (S, c = "#ffe9b8", x = 384, y = 200) => glow(S, x, y, 260, c, 0.35);
/** Striped scalloped valance along the ceiling, in the shopfront's colours. */
function valance(S, c1, c2, y = 24) {
  for (let i = 0, x = 0; x < 768; i++, x += 48) path(S, `M${x} ${y}H${x + 48}V${y + 40}Q${x + 24} ${y + 66} ${x} ${y + 40}Z`, lg(S, i % 2 ? c2 : c1), O, 2);
  rect(S, -6, y - 12, 780, 16, "#5a3a26", 2);
}
/** The round trade sign, same glyphs as outside. */
function emblem(S, x, y, r, icon, color) {
  glow(S, x, y, r * 2.2, "#fff0c0", 0.4);
  circ(S, x, y, r, "#f6ead0", 3.4); circ(S, x, y, r * 0.8, color, 2.2);
  S.add(`<g transform="translate(${x} ${y}) scale(${f(r / 18)})">${GLYPH[icon]}</g>`);
}
/** Window onto a sunny street. */
function view(S, x, y, w, h, frame = "#6b3f26") {
  rect(S, x - 8, y - 8, w + 16, h + 16, frame, w / 2 + 6);
  const arch = `M${x} ${y + h}V${y + w / 2}A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2}V${y + h}Z`, id = S.uid("v");
  S.defs.push(`<clipPath id="${id}"><path d="${arch}"/></clipPath>`);
  S.add(`<g clip-path="url(#${id})"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${S.grad([[0, "#8fd0f5"], [1, "#e8f7ff"]])}"/><circle cx="${x + w * 0.72}" cy="${y + h * 0.26}" r="${w * 0.12}" fill="#fff4b8"/><path d="M${x} ${y + h}V${y + h * 0.7}l${w * 0.25} ${-h * 0.18}l${w * 0.25} ${h * 0.18}V${y + h * 0.62}l${w * 0.2} ${-h * 0.14}l${w * 0.3} ${h * 0.16}V${y + h}Z" fill="#c96a48" stroke="${O}" stroke-width="1.6"/><path d="M${x} ${y + h}q${w * 0.2} ${-h * 0.24} ${w * 0.42} 0q${w * 0.28} ${-h * 0.2} ${w * 0.58} 0Z" fill="#5f9a48"/></g>`);
  path(S, arch, "none", O, 2.4); path(S, `M${x + w / 2} ${y}V${y + h}M${x} ${y + h * 0.55}H${x + w}`, "none", frame, 5);
  rect(S, x - 12, y + h + 6, w + 24, 10, shade(frame, 1.3), 2);
}
/** A townsperson. `y` is the waist; draw counters afterwards to stand them behind one. */
function person(S, x, y, s, { shirt = "#3f6fb5", skin = "#eab68c", hair = "#3b2a1e", apron, hat, glasses, moustache, arm } = {}) {
  const X = (v) => f(x + v * s), Y = (v) => f(y + v * s);
  path(S, `M${X(-46)} ${Y(18)}Q${X(-50)} ${Y(-58)} ${X(0)} ${Y(-60)}Q${X(50)} ${Y(-58)} ${X(46)} ${Y(18)}Z`, lg(S, shirt));
  if (apron) { path(S, `M${X(-26)} ${Y(18)}V${Y(-30)}Q${X(0)} ${Y(-20)} ${X(26)} ${Y(-30)}V${Y(18)}Z`, lg(S, apron)); path(S, `M${X(-24)} ${Y(-30)}L${X(-14)} ${Y(-56)}M${X(24)} ${Y(-30)}L${X(14)} ${Y(-56)}`, "none", apron, 5 * s); }
  if (arm) { path(S, `M${X(38)} ${Y(-36)}Q${X(66)} ${Y(-40)} ${X(62)} ${Y(-76)}`, "none", O, 19 * s); path(S, `M${X(38)} ${Y(-36)}Q${X(66)} ${Y(-40)} ${X(62)} ${Y(-76)}`, "none", shirt, 14 * s); circ(S, X(62), Y(-82), 9 * s, skin); }
  rect(S, X(-9), Y(-72), 18 * s, 18 * s, shade(skin, 0.88), 3, 2);
  circ(S, X(0), Y(-94), 31 * s, lg(S, skin), 2.4);
  path(S, `M${X(-31)} ${Y(-94)}Q${X(-34)} ${Y(-132)} ${X(0)} ${Y(-128)}Q${X(34)} ${Y(-132)} ${X(31)} ${Y(-94)}Q${X(18)} ${Y(-116)} ${X(-2)} ${Y(-110)}Q${X(-20)} ${Y(-114)} ${X(-31)} ${Y(-94)}Z`, hair);
  for (const d of [-11, 11]) circ(S, X(d), Y(-92), 3.4 * s, O, 0);
  if (glasses) { for (const d of [-11, 11]) circ(S, X(d), Y(-92), 9 * s, "none", 2.4); path(S, `M${X(-2)} ${Y(-92)}H${X(2)}`); }
  for (const d of [-18, 18]) S.add(`<ellipse cx="${X(d)}" cy="${Y(-81)}" rx="${6 * s}" ry="${3.6 * s}" fill="#e8766a" opacity=".5"/>`);
  if (moustache) path(S, `M${X(0)} ${Y(-81)}Q${X(-10)} ${Y(-86)} ${X(-18)} ${Y(-76)}Q${X(-8)} ${Y(-73)} ${X(0)} ${Y(-77)}Q${X(8)} ${Y(-73)} ${X(18)} ${Y(-76)}Q${X(10)} ${Y(-86)} ${X(0)} ${Y(-81)}Z`, "#e8e2d6");
  else path(S, `M${X(-9)} ${Y(-79)}Q${X(0)} ${Y(-70)} ${X(9)} ${Y(-79)}`, "none", O, 2.6);
  if (hat === "chef") { path(S, `M${X(-24)} ${Y(-118)}V${Y(-134)}Q${X(-44)} ${Y(-146)} ${X(-26)} ${Y(-158)}Q${X(-18)} ${Y(-178)} ${X(0)} ${Y(-166)}Q${X(20)} ${Y(-178)} ${X(26)} ${Y(-158)}Q${X(44)} ${Y(-146)} ${X(24)} ${Y(-134)}V${Y(-118)}Z`, "#fbf7ee"); path(S, `M${X(-24)} ${Y(-130)}H${X(24)}`); }
  if (hat === "straw") { S.add(`<ellipse cx="${X(0)}" cy="${Y(-118)}" rx="${48 * s}" ry="${12 * s}" fill="#e8c25a" stroke="${O}" stroke-width="2.2"/>`); path(S, `M${X(-25)} ${Y(-119)}Q${X(-22)} ${Y(-148)} ${X(0)} ${Y(-148)}Q${X(22)} ${Y(-148)} ${X(25)} ${Y(-119)}Z`, "#f0d070"); path(S, `M${X(-25)} ${Y(-124)}H${X(25)}`, "none", "#c53f74", 7 * s); }
  if (hat === "cap") { path(S, `M${X(-31)} ${Y(-108)}Q${X(-28)} ${Y(-138)} ${X(0)} ${Y(-136)}Q${X(28)} ${Y(-138)} ${X(31)} ${Y(-108)}Z`, "#2c8f9a"); path(S, `M${X(8)} ${Y(-108)}H${X(46)}`, "none", O, 7 * s); }
  if (hat === "phones") { path(S, `M${X(-33)} ${Y(-96)}Q${X(-38)} ${Y(-140)} ${X(0)} ${Y(-136)}Q${X(38)} ${Y(-140)} ${X(33)} ${Y(-96)}`, "none", "#2c2f36", 6 * s); for (const d of [-34, 34]) rect(S, X(d) - 8 * s, Y(-106), 16 * s, 26 * s, "#4fe0d0", 6); }
}
function mug(S, x, y, s = 1, c = "#f6ead0") { path(S, `M${x - 13 * s} ${y - 24 * s}H${x + 13 * s}L${x + 10 * s} ${y}H${x - 10 * s}Z`, lg(S, c)); path(S, `M${x + 12 * s} ${y - 19 * s}q${13 * s} ${2 * s} ${-1 * s} ${14 * s}`, "none", c, 4 * s); path(S, `M${x - 4 * s} ${y - 30 * s}q${-7 * s} ${-9 * s} 0 ${-17 * s}M${x + 6 * s} ${y - 30 * s}q${-7 * s} ${-9 * s} 0 ${-17 * s}`, "none", "#fff", 3); }
function menuBoard(S, x, y, w, h, icons) {
  rect(S, x, y, w, h, "#8a5a34", 5); rect(S, x + 7, y + 7, w - 14, h - 14, "#233a30", 3);
  icons.forEach((ic, i) => { const yy = y + 24 + i * ((h - 36) / icons.length); S.add(`<g transform="translate(${x + 24} ${yy}) scale(.75)">${GLYPH[ic]}</g>`); path(S, `M${x + 44} ${yy - 3}H${x + w - 36}M${x + 44} ${yy + 6}H${x + w - 56}`, "none", "#e8efe4", 3); circ(S, x + w - 22, yy, 4, "#ffd23f", 0); });
}
function bunch(S, x, y, c, s = 1) {
  path(S, `M${x - 18 * s} ${y - 30 * s}H${x + 18 * s}L${x + 13 * s} ${y}H${x - 13 * s}Z`, lg(S, "#8fa6b8"));
  for (const [dx, dy] of [[-18, -42], [16, -44], [-6, -56], [10, -60], [-16, -62], [0, -42], [2, -74]]) {
    path(S, `M${x} ${y - 28 * s}L${x + dx * s} ${y + dy * s}`, "none", "#3f7a35", 3 * s);
    for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; circ(S, x + dx * s + Math.cos(a) * 7 * s, y + dy * s + Math.sin(a) * 7 * s, 6 * s, c, 1.4); }
    circ(S, x + dx * s, y + dy * s, 4.6 * s, "#ffe27a", 1.4);
  }
}
function burger(S, x, y, s = 1) { S.add(`<g transform="translate(${x} ${y - 13 * s}) scale(${1.9 * s})">${GLYPH.food.replace(/#fff/g, "#e8a24a")}</g>`); }
function screen(S, x, y, w, h, kind = 0, c = "#4fe0d0") {
  glow(S, x + w / 2, y + h / 2, w * 0.8, c, 0.4); rect(S, x, y, w, h, "#2c2f36", 6); rect(S, x + 6, y + 6, w - 12, h - 12, "#0f2a36", 3, 1.4);
  if (kind === 0) path(S, `M${x + 12} ${y + h - 16}L${x + w * 0.32} ${y + h * 0.52}L${x + w * 0.52} ${y + h * 0.68}L${x + w - 14} ${y + 16}`, "none", c, 4);
  else if (kind === 1) for (let i = 0; i < 5; i++) { const bh = (h - 24) * [0.4, 0.7, 0.5, 0.95, 0.65][i]; rect(S, x + 12 + i * ((w - 24) / 5), y + h - 10 - bh, (w - 24) / 5 - 4, bh, c, 1, 0); }
  else S.add(`<g transform="translate(${x + w / 2} ${y + h / 2}) scale(${f(h / 34)})">${GLYPH.tech}</g>`);
}
function gadget(S, x, y, kind) {
  if (kind === 0) { rect(S, x - 20, y - 26, 40, 26, "#d0452f", 6); circ(S, x - 8, y - 13, 7, "#f6ead0"); path(S, `M${x + 6} ${y - 18}h9M${x + 6} ${y - 10}h9`); path(S, `M${x + 12} ${y - 26}l10 -16`); }
  else if (kind === 1) { rect(S, x - 11, y - 38, 22, 38, "#2c2f36", 5); rect(S, x - 7, y - 33, 14, 25, "#8fd0ff", 2, 1.4); }
  else { rect(S, x - 17, y - 30, 34, 30, "#e8c25a", 8); for (const d of [-8, 8]) circ(S, x + d, y - 18, 5, "#4fe0d0"); path(S, `M${x - 8} ${y - 7}h16M${x} ${y - 30}v-9`); circ(S, x, y - 42, 4, "#d0452f"); }
}
function robot(S, x, y, s = 1) {
  const X = (v) => x + v * s, Y = (v) => y + v * s;
  rect(S, X(-24), Y(-50), 48 * s, 50 * s, lg(S, "#c9d2da"), 10); rect(S, X(-30), Y(-94), 60 * s, 42 * s, lg(S, "#dfe6ec"), 14); rect(S, X(-22), Y(-86), 44 * s, 26 * s, "#10222e", 9, 1.6);
  for (const d of [-10, 10]) circ(S, X(d), Y(-73), 5 * s, "#4fe0d0", 0);
  path(S, `M${X(0)} ${Y(-94)}V${Y(-108)}`); circ(S, X(0), Y(-112), 6 * s, "#ff7ad9"); circ(S, X(0), Y(-28), 9 * s, "#ffd23f");
  path(S, `M${X(-24)} ${Y(-38)}q${-20 * s} ${4 * s} ${-18 * s} ${28 * s}M${X(24)} ${Y(-38)}q${24 * s} ${-8 * s} ${20 * s} ${-34 * s}`, "none", "#9aa6b0", 8 * s);
}
function cat(S, x, y, c = "#d98a3a") {
  S.add(`<ellipse cx="${x}" cy="${y - 15}" rx="34" ry="17" fill="${lg(S, c)}" stroke="${O}" stroke-width="2.2"/>`); path(S, `M${x + 28} ${y - 10}q24 2 18 -22`, "none", c, 8);
  circ(S, x - 28, y - 22, 17, c); path(S, `M${x - 43} ${y - 28}l-1 -18l15 8ZM${x - 22} ${y - 38}l13 -9l1 17Z`, c);
  path(S, `M${x - 38} ${y - 23}q4 4 8 0M${x - 24} ${y - 23}q4 4 8 0M${x - 29} ${y - 15}l2 3l2 -3`, "none", O, 2);
}
/** A wall of books: `rows` shelves between y0 and y1. */
function bookcase(S, x, w, y0, y1, rows) {
  rect(S, x, y0, w, y1 - y0, lg(S, "#6b4423"), 4);
  const h = (y1 - y0 - 8) / rows;
  for (let i = 0; i < rows; i++) { const base = y0 + 4 + h * (i + 1); rect(S, x + 6, base - h + 5, w - 12, h - 7, "#2f1d12", 2, 0); let bx = x + 9; while (bx < x + w - 20) bx = books(S, bx, base - 2, 1, S.r, h - 8); }
}
function checker(S, c1, c2) {
  const rows = [290, 306, 326, 352, 386, 432];
  for (let j = 0; j < rows.length - 1; j++) for (let i = -4; i < 14; i++) {
    const at = (i2, y) => { const k = 1 + ((y - 290) / 142) * 0.65; return `${f(384 + (150 + i2 * 46.8 - 384) * k)},${y}`; };
    S.add(`<polygon points="${at(i, rows[j])} ${at(i + 1, rows[j])} ${at(i + 1, rows[j + 1])} ${at(i, rows[j + 1])}" fill="${(i + j) % 2 ? c1 : c2}" stroke="${O}" stroke-width="1"/>`);
  }
}
function stringLights(S, y = 92) {
  path(S, `M30 ${y - 20}Q210 ${y + 30} 384 ${y - 6}Q560 ${y + 30} 738 ${y - 20}`, "none", O, 2);
  [[90, 2], [150, 9], [230, 10], [300, 2], [470, 2], [540, 10], [618, 9], [680, 1]].forEach(([x, d], i) => { const c = ["#ffd23f", "#ff7a45", "#7fe0d0", "#ff8ac0"][i % 4]; glow(S, x, y + d + 6, 20, c, 0.7); circ(S, x, y + d + 6, 6, c, 1.6); });
}

export const ROOMS = {
  "coffee-cart": (S) => {
    shell(S, { wall: "plaster", wc: "#f0d3a0", floor: "#9a6a44", beam: "#6a4026" }); light(S);
    view(S, 168, 108, 84, 118); menuBoard(S, 496, 100, 118, 128, ["coffee", "coffee", "food"]);
    emblem(S, 384, 120, 40, "coffee", "#8a4a2c");
    shelf(S, 70, 160, 112); shelf(S, 70, 228, 112); [34, 70, 106].forEach((x, i) => jar(S, x, 160, 1.1, ["#6b3f26", "#a0703c", "#5a3a22"][i], "#e8c25a")); [42, 92].forEach((x) => mug(S, x, 228, 1));
    sack(S, 668, 330, 1.5, "#c49a6c"); sack(S, 724, 346, 1.3, "#b98a5a");
    person(S, 340, 322, 1.05, { shirt: "#3f7a55", apron: "#7a3f22", hair: "#2a1c15", arm: true });
    const sy = counter(S, 384, 398, 440, 1.2, "#a2673a", "#d9ad6a");
    // espresso machine
    rect(S, 432, sy - 88, 128, 88, lg(S, "#d0452f"), 12); rect(S, 442, sy - 102, 108, 16, "#c9d2da"); circ(S, 496, sy - 62, 15, "#f6ead0"); path(S, `M496 ${sy - 62}l8 -7`);
    for (const x of [462, 530]) { rect(S, x - 12, sy - 40, 24, 12, "#c9d2da", 3); mug(S, x, sy, 0.9); }
    rect(S, 190, sy - 30, 96, 30, "#e8f4ff", 14); [208, 238, 268].forEach((x) => loaf(S, x, sy - 3, 0.75, "#e0a85a"));
    mug(S, 322, sy + 2, 1.2, "#c53f74");
    finish(S, "#ffc880");
  },
  "coffee-cart-upgraded": (S) => {
    shell(S, { wall: "brick", wc: "#c47a56", floor: "#6a4a38", beam: "#4a2a18" }); checker(S, "#7a4a30", "#e8d3a8"); light(S);
    valance(S, "#7a3f22", "#f6ead0"); view(S, 164, 122, 92, 126); view(S, 512, 122, 92, 126);
    emblem(S, 384, 138, 44, "coffee", "#c9862f"); stringLights(S, 96);
    plantPot(S, 74, 318, 1.5); plantPot(S, 700, 318, 1.5);
    person(S, 290, 324, 1.02, { shirt: "#f6ead0", apron: "#7a3f22", hair: "#a8612f", arm: true });
    person(S, 520, 324, 0.94, { shirt: "#3f6fb5", apron: "#2a1c15", skin: "#a8704a", hair: "#1f1a18", moustache: false });
    const sy = counter(S, 384, 400, 500, 1.2, "#7a4a2a", "#e8c88a");
    rect(S, 334, sy - 96, 120, 96, lg(S, "#c9953f"), 14); circ(S, 394, sy - 104, 20, "#e6b84a"); circ(S, 394, sy - 62, 17, "#f6ead0"); path(S, `M394 ${sy - 62}l-9 -8`); for (const x of [362, 426]) mug(S, x, sy, 1);
    // cake stand
    path(S, `M196 ${sy}h52M222 ${sy}v-18`, "none", O, 5); rect(S, 186, sy - 28, 72, 11, "#f6ead0", 5); path(S, `M196 ${sy - 28}V${sy - 54}Q222 ${sy - 66} 248 ${sy - 54}V${sy - 28}Z`, "#e8766a"); path(S, `M196 ${sy - 48}q13 10 26 0q13 10 26 0`, "none", "#fbf7ee", 6); circ(S, 222, sy - 66, 7, "#a8261f");
    [532, 566].forEach((x, i) => jar(S, x, sy, 1.3, ["#6b3f26", "#d9ad4b"][i])); mug(S, 600, sy + 2, 1.1, "#3f7a55");
    finish(S, "#ffbb70");
  },
  "street-food": (S) => {
    shell(S, { wall: "plank", wc: "#e0a060", floor: "#8a5a3a", beam: "#6a3a1e" }); light(S, "#ffd9a0");
    valance(S, "#d0452f", "#ffd45a"); menuBoard(S, 166, 118, 122, 132, ["food", "food", "coffee"]); emblem(S, 384, 108, 30, "food", "#d0452f");
    // grill with flames
    rect(S, 486, 190, 128, 100, lg(S, "#4a4f5a"), 8); rect(S, 498, 214, 104, 40, "#1f1410", 4); [522, 550, 578].forEach((x, i) => flameI(S, x, 254, 0.5 + (i === 1 ? 0.14 : 0)));
    for (let x = 506; x < 600; x += 15) path(S, `M${x} 212v44`, "none", "#9aa6b0", 3);
    [510, 556, 600].forEach((x) => { path(S, `M${x} 150v44`, "none", "#c9a06a", 4); for (let k = 0; k < 3; k++) circ(S, x, 160 + k * 13, 8, ["#c0522f", "#5fae4a", "#e8a24a"][k]); });
    crate(S, 74, 332, 1.3, "#a9763f", ["#d0452f", "#d0452f", "#d0452f", "#d0452f"]); crate(S, 700, 332, 1.3, "#a9763f", ["#5fae4a", "#7fc44a", "#5fae4a", "#7fc44a"]);
    person(S, 360, 322, 1.08, { shirt: "#fbf7ee", apron: "#d0452f", hat: "chef", moustache: true, hair: "#3b2a1e", arm: true });
    const sy = counter(S, 384, 400, 440, 1.2, "#c9742f", "#f0c880");
    [214, 270].forEach((x) => burger(S, x, sy, 1.1)); burger(S, 482, sy, 1.1);
    [528, 556].forEach((x, i) => bottle(S, x, sy + 2, 40, ["#d0452f", "#ffd23f"][i]));
    finish(S, "#ffb060");
  },
  "street-food-upgraded": (S) => {
    shell(S, { wall: "plaster", wc: "#f2c070", floor: "#6a2a22", beam: "#8a2f1e" }); checker(S, "#c0392b", "#f6ead0"); light(S, "#ffd9a0");
    valance(S, "#ffd45a", "#d0452f"); stringLights(S, 100); emblem(S, 384, 116, 34, "food", "#d0452f");
    // brick oven and menu
    path(S, "M168 290V190Q168 128 230 128Q292 128 292 190V290Z", lg(S, "#b8553a"), O, 3); path(S, "M194 290V214Q230 166 266 214V290Z", "#241410"); flameI(S, 230, 282, 0.9);
    menuBoard(S, 486, 132, 126, 126, ["food", "food", "coffee"]);
    for (const x of [62, 706]) { rect(S, x - 46, 262, 92, 78, lg(S, "#c0392b"), 22); path(S, `M${x - 20} 272v60M${x + 20} 272v60`, "none", "#8a1f16", 3); }
    person(S, 304, 322, 1, { shirt: "#fbf7ee", apron: "#d0452f", hat: "chef", hair: "#1f1a18", arm: true });
    person(S, 480, 322, 0.96, { shirt: "#fbf7ee", apron: "#ffd45a", hat: "chef", skin: "#a8704a", hair: "#2a1c15" });
    const sy = counter(S, 384, 402, 500, 1.2, "#c0392b", "#f6ead0");
    [188, 244].forEach((x) => burger(S, x, sy, 1.1)); burger(S, 394, sy, 1.35); [540, 568, 596].forEach((x, i) => bottle(S, x, sy + 2, 40, ["#d0452f", "#ffd23f", "#5fae4a"][i]));
    finish(S, "#ffb468");
  },
  electronics: (S) => {
    shell(S, { wall: "plaster", wc: "#3f7a8f", floor: "#33505f", beam: "#1f3a4a", floorKind: "tile" }); light(S, "#9ff4ff");
    valance(S, "#2c8f9a", "#d8f6f4"); emblem(S, 384, 130, 40, "tech", "#2c8f9a");
    screen(S, 166, 122, 112, 82, 0); screen(S, 490, 122, 112, 82, 1, "#ffd23f");
    for (const x of [222, 546]) { shelf(S, x, 262, 118, "#7a9aac"); [x - 38, x, x + 38].forEach((gx, i) => gadget(S, gx, 262, (i + (x > 384 ? 1 : 0)) % 3)); }
    for (const x of [66, 702]) { rect(S, x - 42, 170, 84, 170, lg(S, "#26485a"), 6); for (let y = 186; y < 326; y += 28) { rect(S, x - 30, y, 60, 18, "#0f2a36", 3, 1.4); circ(S, x - 18, y + 9, 3.6, "#4fe0d0", 0); circ(S, x - 6, y + 9, 3.6, y % 56 ? "#ff7ad9" : "#ffd23f", 0); } }
    person(S, 350, 322, 1.05, { shirt: "#e0792d", hat: "phones", glasses: true, hair: "#2a1c15", skin: "#c98a5e" });
    const sy = counter(S, 384, 400, 440, 1.2, "#2f6276", "#cfeaf0");
    robot(S, 500, sy + 2, 0.85); gadget(S, 214, sy, 0); gadget(S, 262, sy, 1); screen(S, 292, sy - 6, 40, 12, 1);
    finish(S, "#9fe8ff");
  },
  "electronics-upgraded": (S) => {
    shell(S, { wall: "stone", wc: "#4a4690", floor: "#2a2858", beam: "#1d1c46", floorKind: "tile" }); light(S, "#c9a8ff");
    valance(S, "#6b4aa0", "#8fd0ff");
    [[166, 114, 0], [166, 196, 1], [490, 114, 1], [490, 196, 2]].forEach(([x, y, k], i) => screen(S, x, y, 112, 74, k, ["#4fe0d0", "#ff7ad9", "#ffd23f", "#a56bff"][i]));
    // hologram globe
    glow(S, 384, 156, 100, "#4fe0d0", 0.6); circ(S, 384, 156, 52, "#123a52"); for (const rx of [14, 34]) S.add(`<ellipse cx="384" cy="156" rx="${rx}" ry="52" fill="none" stroke="#7ff4e8" stroke-width="2"/>`); path(S, "M334 140H434M334 172H434M332 156H436", "none", "#7ff4e8", 2); S.add(`<ellipse cx="384" cy="156" rx="82" ry="18" fill="none" stroke="#ff7ad9" stroke-width="3" transform="rotate(-16 384 156)"/>`);
    crystalI(S, 56, 330, 110, "#4fe0d0"); crystalI(S, 714, 330, 110, "#a56bff");
    person(S, 266, 324, 1, { shirt: "#2c2f6a", apron: "#4fe0d0", hat: "phones", hair: "#d9b04a" });
    const sy = counter(S, 384, 402, 500, 1.2, "#3a367a", "#b9b2ee");
    path(S, `M150 ${sy + 44}H618`, "none", "#4fe0d0", 5);
    robot(S, 500, sy + 2, 1.05); gadget(S, 370, sy, 2); gadget(S, 414, sy, 1); gadget(S, 580, sy, 0);
    finish(S, "#c0a8ff");
  },
  "flower-stall": (S) => {
    shell(S, { wall: "plank", wc: "#a8d0a0", floor: "#a87c58", beam: "#5a7a46" }); light(S, "#fff6d0");
    valance(S, "#e0558a", "#fff1f5"); view(S, 170, 120, 100, 130, "#5a8f4a"); view(S, 498, 120, 100, 130, "#5a8f4a"); emblem(S, 384, 134, 40, "flower", "#c53f74");
    for (const [x, c] of [[66, "#e0558a"], [702, "#8a5fd0"]]) { shelf(S, x, 190, 112); bunch(S, x - 24, 190, c, 0.75); bunch(S, x + 28, 190, "#ffd23f", 0.75); bunch(S, x, 292, "#ff7a45", 1); }
    person(S, 372, 322, 1.05, { shirt: "#ffd45a", apron: "#4f8a5a", hat: "straw", hair: "#a8612f", arm: true });
    const sy = counter(S, 384, 400, 420, 1.2, "#5a8f4a", "#f0dcae");
    bunch(S, 232, sy + 2, "#ff7a45", 0.95); bunch(S, 292, sy + 2, "#fbf7ee", 0.8); bunch(S, 500, sy + 2, "#8a5fd0", 0.95); jar(S, 546, sy + 2, 1.2, "#e8c25a");
    [[64, "#ffd23f"], [142, "#e0558a"], [626, "#8a5fd0"], [704, "#ff7a45"]].forEach(([x, c]) => bunch(S, x, 408, c, 1.2));
    finish(S, "#ffe0c0");
  },
  "flower-stall-upgraded": (S) => {
    shell(S, { wall: "plaster", wc: "#dcc4f0", floor: "#8a6a58", beam: "#6a4a8a" }); light(S, "#fff0ff");
    // greenhouse glass
    rect(S, 160, 82, 448, 208, S.grad([[0, "#a8dcf8"], [1, "#e8fbf0"]]), 8, 3); for (let x = 224; x < 600; x += 64) path(S, `M${x} 82V290`, "none", "#fbf7ee", 5); path(S, "M160 150H608M160 220H608", "none", "#fbf7ee", 5);
    // flower arch
    for (let i = 0; i <= 22; i++) { const a = Math.PI + (i / 22) * Math.PI, x = 384 + Math.cos(a) * 200, y = 262 + Math.sin(a) * 160; circ(S, x, y, 17, "#4f8a45"); circ(S, x + 3, y - 3, 9, ["#e0558a", "#fbf7ee", "#ffd23f", "#8a5fd0"][i % 4]); circ(S, x + 3, y - 3, 3, "#ffe27a", 1); }
    valance(S, "#8a5fd0", "#fbe9ff"); emblem(S, 384, 148, 38, "flower", "#8a5fd0");
    for (const [x, c] of [[64, "#e0558a"], [704, "#ffd23f"]]) { plantPot(S, x, 232, 1.2); bunch(S, x, 320, c, 1.3); }
    person(S, 330, 322, 1, { shirt: "#fbf7ee", apron: "#8a5fd0", hat: "straw", hair: "#2a1c15", skin: "#a8704a" });
    person(S, 500, 324, 0.92, { shirt: "#e0558a", apron: "#4f8a5a", hair: "#d9b04a", arm: true });
    const sy = counter(S, 384, 402, 460, 1.2, "#4f8a5a", "#fbf0d8");
    bunch(S, 216, sy + 2, "#e0558a", 1.05); bunch(S, 404, sy + 2, "#ffd23f", 0.9); bunch(S, 576, sy + 2, "#fbf7ee", 1);
    [[54, "#8a5fd0"], [124, "#ff7a45"], [644, "#e0558a"], [714, "#8a5fd0"]].forEach(([x, c]) => bunch(S, x, 414, c, 1.25));
    finish(S, "#f0d0ff");
  },
  bookshop: (S) => {
    shell(S, { wall: "plank", wc: "#6f8cb8", floor: "#8a5a3a", beam: "#2f4a6a" }); light(S);
    bookcase(S, 12, 124, 84, 336, 5); bookcase(S, 632, 124, 84, 336, 5); bookcase(S, 160, 112, 106, 290, 4); bookcase(S, 496, 112, 106, 290, 4);
    valance(S, "#2f5f86", "#f6ead0"); emblem(S, 384, 136, 42, "book", "#2f5f86");
    person(S, 358, 322, 1.05, { shirt: "#8a2f2a", glasses: true, moustache: true, hair: "#c9c2b4" });
    const sy = counter(S, 384, 400, 420, 1.2, "#7a4a28", "#d9ad6a");
    cat(S, 500, sy + 2); [["#b5402f", 0], ["#3f7a45", 13], ["#c9953f", 26]].forEach(([c, dy], i) => rect(S, 202 + i * 3, sy - 13 - dy, 78 - i * 6, 13, c, 2));
    path(S, `M312 ${sy - 6}q26 -16 44 0q18 -16 44 0v10q-26 -12 -44 2q-18 -14 -44 -2Z`, "#fbf3dc"); candle(S, 570, sy + 2, 1.3);
    finish(S, "#ffd0a0");
  },
  "bookshop-upgraded": (S) => {
    shell(S, { wall: "stone", wc: "#c9c0b0", floor: "#6a4430", beam: "#4a2c1a" }); light(S);
    bookcase(S, 10, 130, 60, 350, 6); bookcase(S, 628, 130, 60, 350, 6); bookcase(S, 158, 104, 82, 290, 5); bookcase(S, 506, 104, 82, 290, 5);
    // stained glass window
    rect(S, 316, 76, 136, 176, "#4a2c1a", 66); const cols = ["#e8b53a", "#2f8fb5", "#c0392b", "#4f9a5a", "#8a5fd0"];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) rect(S, 326 + c * 29, 108 + r * 33, 29, 33, cols[(r * 2 + c) % 5], r === 0 && (c === 0 || c === 3) ? 14 : 1, 2.4);
    glow(S, 384, 170, 130, "#fff0b0", 0.45); emblem(S, 384, 162, 34, "book", "#2f5f86");
    ladder(S, 566, 336, 230); rugI(S, 384, 352, 340, 70, "#8a2f2a", "#e8b53a");
    person(S, 262, 324, 1, { shirt: "#2f4a6a", glasses: true, hair: "#a8612f" });
    const sy = counter(S, 384, 402, 460, 1.2, "#6b3f26", "#c9a06a");
    cat(S, 392, sy + 2, "#4a4a52"); candle(S, 192, sy + 2, 1.3); candle(S, 582, sy + 2, 1.3);
    circ(S, 504, sy - 34, 28, "#4f9ac4"); path(S, `M486 ${sy - 46}q16 -8 24 6t-12 18q-18 -2 -12 -24Z`, "#5fae4a", O, 1.6); path(S, `M504 ${sy - 6}v6M486 ${sy}h36`, "none", O, 5);
    finish(S, "#ffd8a0");
  },
  vacant: (S) => {
    shell(S, { wall: "plaster", wc: "#b8ac98", floor: "#7a6a58", beam: "#4a4238", windows: [] }); light(S, "#e8f0ff", 270, 180);
    view(S, 214, 112, 108, 136, "#6a5a4a"); for (const [y, a] of [[148, -9], [198, 7]]) S.add(`<rect x="196" y="${y}" width="146" height="20" rx="3" fill="#a9825a" stroke="${O}" stroke-width="2.4" transform="rotate(${a} 268 ${y + 10})"/>`);
    S.add(`<polygon points="218,250 322,250 470,420 250,420" fill="${S.grad([[0, "#fff6d8", 0.35], [1, "#fff6d8", 0]])}"/>`);
    for (const [x, k] of [[150, 1], [618, -1]]) for (let i = 1; i <= 4; i++) path(S, `M${x} ${70 + i * 18}Q${x + k * i * 12} ${70 + i * 12} ${x + k * i * 22} 70M${x} 70L${x + k * 80} ${70 + 66}`, "none", "#e8e4dc", 1.2);
    // for-lease board
    path(S, "M466 100L500 138M566 100L532 138", "none", O, 3); rect(S, 436, 136, 160, 96, "#fbf3dc", 10); emblem(S, 516, 184, 32, "tag", "#b5402f");
    crate(S, 96, 340, 1.4); crate(S, 108, 292, 1); sack(S, 680, 344, 1.5, "#cfc4ae"); barrel(S, 610, 320, 1.2, "#8a7458");
    path(S, "M300 384Q320 316 386 318Q452 322 468 384Q426 398 384 388Q340 400 300 384Z", lg(S, "#ded8cc")); path(S, "M340 384q8 -34 30 -48M420 386q-2 -30 -22 -48", "none", "#a8a294", 3);
    path(S, "M160 396L214 268", "none", "#8a5a34", 7); path(S, "M142 388l42 14l-12 20l-44 -14Z", "#d9ad4b");
    finish(S, "#d0d8e8");
  },
  "town-hall": (S) => {
    shell(S, { wall: "stone", wc: "#ded0ae", floor: "#8a5a3a", beam: "#5a3a26" }); light(S);
    view(S, 172, 120, 66, 104); view(S, 530, 120, 66, 104); banner(S, 278, 92, 52, 140, "#b5402f"); banner(S, 490, 92, 52, 140, "#2f5f86");
    emblem(S, 384, 114, 26, "gavel", "#8a4a2c");
    // the lot on the block
    crate(S, 108, 322, 1.35); crate(S, 108, 276, 1.05); sack(S, 176, 330, 1.1, "#c49a6c"); barrel(S, 656, 326, 1.35); sack(S, 590, 332, 1.2, "#e6dcc4");
    person(S, 384, 262, 0.9, { shirt: "#2a2a3a", apron: "#8a2f2a", moustache: true, glasses: true, hair: "#c9c2b4", arm: true });
    S.add(`<g transform="translate(446 178) scale(2)">${GLYPH.gavel}</g>`);
    path(S, "M316 262H452L432 344H336Z", lg(S, "#8a5a2a"), O, 3); rect(S, 304, 250, 160, 20, "#c28b4d", 4); emblem(S, 384, 304, 20, "coin", "#a8721f");
    // bidders with paddles, seen from behind
    [[210, "#3f7a55", "#3b2a1e", 1], [292, "#e0a030", "#a8612f", 0], [480, "#8a5fd0", "#1f1a18", 0], [566, "#3f6fb5", "#d9b04a", 1]].forEach(([x, shirt, hair, up], i) => {
      const y = 328 + (i % 2) * 8;
      if (up) { path(S, `M${x + 26} ${y}L${x + 44} ${y - 46}`, "none", shirt, 13); path(S, `M${x + 44} ${y - 46}v-16`, "none", "#8a5a34", 5); circ(S, x + 44, y - 78, 19, "#fbf3dc", 2.6); S.add(`<g transform="translate(${x + 44} ${y - 78}) scale(.9)">${GLYPH.coin}</g>`); }
      path(S, `M${x - 40} 440Q${x - 44} ${y + 4} ${x} ${y}Q${x + 44} ${y + 4} ${x + 40} 440Z`, lg(S, shirt)); circ(S, x, y - 16, 25, hair, 2.6);
    });
    finish(S, "#ffd8a0");
  },
};
