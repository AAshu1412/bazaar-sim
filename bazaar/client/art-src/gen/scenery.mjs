// Town scenery sprites (302x256, same footprint convention as buildings; no baked ground).
import * as E from "./engine.mjs";
const { box, barrel, bush, tree, lamppost, planter, cyl, P, shade } = E;
const O = "#2a1c15", f = (n) => +n.toFixed(1);

function water(S, x, y, z, r, c1 = "#9fe0f4", c2 = "#3f9ac4") {
  const [cx, cy] = P(x, y, z), rx = r * 1.414, ry = r * 0.707;
  S.add(`<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${S.grad([[0, c1], [1, c2]])}" stroke="${O}" stroke-width="1.4"/><ellipse cx="${f(cx - rx * 0.2)}" cy="${f(cy - ry * 0.1)}" rx="${f(rx * 0.55)}" ry="${f(ry * 0.45)}" fill="none" stroke="#fff" stroke-width="1.2" opacity=".55"/><ellipse cx="${f(cx + rx * 0.25)}" cy="${f(cy + ry * 0.2)}" rx="${f(rx * 0.3)}" ry="${f(ry * 0.25)}" fill="none" stroke="#fff" stroke-width="1" opacity=".45"/>`);
}
function bed(S, x, y, dx, dy, cols) {
  box(S, x, y, 0, dx, dy, 4, "#8b6a46", { sw: 1.1 });
  const [cx, cy] = P(x + dx / 2, y + dy / 2, 4);
  let g = `<polygon points="${[P(x + 2, y + 2, 4.2), P(x + dx - 2, y + 2, 4.2), P(x + dx - 2, y + dy - 2, 4.2), P(x + 2, y + dy - 2, 4.2)].map((p) => p.map(f).join(",")).join(" ")}" fill="#4a7a35"/>`;
  for (let i = 0; i < 16; i++) { const p = P(x + 4 + S.r() * (dx - 8), y + 4 + S.r() * (dy - 8), 4.5); g += `<circle cx="${f(p[0])}" cy="${f(p[1] - 1)}" r="2.3" fill="${cols[i % cols.length]}" stroke="#2a3a1e" stroke-width=".7"/>`; }
  S.add(g);
}
function bench(S, x, y) { box(S, x, y, 0, 3, 3, 6, "#6b4a2e", { sw: 1 }); box(S, x + 16, y, 0, 3, 3, 6, "#6b4a2e", { sw: 1 }); box(S, x, y, 6, 19, 6, 3, "#a9763f", { sw: 1.1 }); box(S, x, y - 1, 9, 19, 2, 8, "#8b5f31", { sw: 1 }); }
function pineTree(S, x, y, s = 1) {
  const [cx, cy] = P(x, y, 0);
  let g = `<ellipse cx="${f(cx + 5)}" cy="${f(cy + 2)}" rx="${f(20 * s)}" ry="${f(6 * s)}" fill="#000" opacity=".22"/><rect x="${f(cx - 3 * s)}" y="${f(cy - 14 * s)}" width="${f(6 * s)}" height="${f(14 * s)}" fill="#6b4a2e" stroke="${O}" stroke-width="1.2"/>`;
  [[0, 26, 24, "#2f6a3a"], [-14, 20, 20, "#3a7a44"], [-28, 14, 15, "#468a4e"]].forEach(([dy, hw, h, c], i) => {
    const yb = cy - 12 * s + dy * s * 0.0 - i * 20 * s;
    g += `<path d="M${f(cx - hw * s)} ${f(yb)}L${f(cx)} ${f(yb - h * 1.7 * s)}L${f(cx + hw * s)} ${f(yb)}Q${f(cx)} ${f(yb + 6 * s)} ${f(cx - hw * s)} ${f(yb)}Z" fill="${S.grad([[0, shade(c, 1.2)], [1, shade(c, 0.78)]], [0, 0, 1, 1])}" stroke="${shade(c, 0.4)}" stroke-width="1.4"/>`;
  });
  S.add(g);
}

/** Ornamental plaza lamp: two lanterns on curled arms, a flower basket and a gold finial. */
function plazaLamp(S, lit) {
  const [cx, cy] = P(50, 50, 0), iron = "#24433d", gold = "#e6b84a", top = cy - 62;
  const stroke = (d, c, w) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
  const curl = `M${cx} ${top + 8}C${cx - 8} ${top - 6} ${cx - 20} ${top - 2} ${cx - 17} ${top + 9}M${cx} ${top + 8}C${cx + 8} ${top - 6} ${cx + 20} ${top - 2} ${cx + 17} ${top + 9}`;
  let g = `<ellipse cx="${cx}" cy="${cy + 1}" rx="13" ry="6" fill="#000" opacity=".25"/>`;
  g += `<path d="M${cx - 9} ${cy}Q${cx - 8} ${cy - 5} ${cx - 3.5} ${cy - 9}L${cx - 2.5} ${top}H${cx + 2.5}L${cx + 3.5} ${cy - 9}Q${cx + 8} ${cy - 5} ${cx + 9} ${cy}Q${cx} ${cy + 5} ${cx - 9} ${cy}Z" fill="${S.grad([[0, "#3f6f64"], [1, "#1b332e"]], [0, 0, 1, 0])}" stroke="${O}" stroke-width="1.4"/>`;
  g += `<ellipse cx="${cx}" cy="${cy - 11}" rx="5" ry="2.4" fill="${gold}" stroke="${O}" stroke-width="1"/>`;
  g += stroke(curl, O, 5) + stroke(curl, iron, 2.8);
  for (const x of [cx - 17, cx + 17]) {
    const y = top + 10;
    if (lit) g += `<circle cx="${x}" cy="${y + 8}" r="15" fill="${S.radial([[0, "#ffe2a0", 0.7], [1, "#ffe2a0", 0]])}"/>`;
    g += `<path d="M${x - 7} ${y + 1}L${x} ${y - 5}L${x + 7} ${y + 1}Z" fill="${iron}" stroke="${O}" stroke-width="1.2"/>`;
    g += `<path d="M${x - 5.5} ${y + 1}H${x + 5.5}L${x + 3.8} ${y + 13}H${x - 3.8}Z" fill="${lit ? "#ffe39a" : "#a9bcc4"}" stroke="${O}" stroke-width="1.3"/>`;
    g += stroke(`M${x} ${y + 2}V${y + 12}`, iron, 1.1) + `<circle cx="${x}" cy="${y + 15}" r="1.8" fill="${gold}" stroke="${O}" stroke-width=".8"/>`;
  }
  // flower basket and finial
  const by = cy - 34;
  g += `<path d="M${cx - 9} ${by}H${cx + 9}Q${cx + 6} ${by + 8} ${cx} ${by + 8}Q${cx - 6} ${by + 8} ${cx - 9} ${by}Z" fill="#8a5a34" stroke="${O}" stroke-width="1.2"/>`;
  for (const [dx, dy, c] of [[-8, -1, "#e66f9a"], [-3, -4, "#ffd23f"], [3, -3, "#e66f9a"], [8, -1, "#ffffff"], [0, -1, "#ff7a45"]]) g += `<circle cx="${cx + dx}" cy="${by + dy}" r="3" fill="${c}" stroke="#2a3a1e" stroke-width=".8"/>`;
  g += `<path d="M${cx} ${top - 12}l3.5 6l-3.5 5l-3.5 -5Z" fill="${gold}" stroke="${O}" stroke-width="1.1"/>`;
  S.add(g);
}
/** A park bench along the x axis, centred in the tile; `back` says which side the backrest is on. */
function plazaBench(S, back) {
  const x = 30, y = 43, w = 40, d = 13, wood = "#b57a42", iron = "#24433d";
  const rest = () => { const ry = back === "far" ? y - 1 : y + d - 2; for (const px of [x + 2, x + w - 5]) box(S, px, ry, 7, 3, 3, 18, iron, { sw: 1 }); box(S, x, ry, 14, w, 3, 5, wood, { sw: 1.1 }); box(S, x, ry, 21, w, 3, 5, wood, { sw: 1.1 }); };
  const seat = () => { for (const [px, py] of [[x + 2, y], [x + w - 5, y], [x + 2, y + d - 3], [x + w - 5, y + d - 3]]) box(S, px, py, 0, 3, 3, 8, iron, { sw: 1 }); for (const i of [0, 1, 2]) box(S, x, y + i * 4.4, 8, w, 3.6, 3, wood, { sw: 1 }); };
  if (back === "far") { rest(); seat(); } else { seat(); rest(); }
}

export const SCENERY = {
  "plaza-lamp": (S) => plazaLamp(S, true),
  "plaza-lamp-off": (S) => plazaLamp(S, false),
  "bench-back": (S) => plazaBench(S, "far"),
  "bench-front": (S) => plazaBench(S, "near"),
  fountain: (S) => {
    cyl(S, 50, 50, 46, 10, "#bdb8aa", "#a6a294");
    water(S, 50, 50, 10, 38);
    cyl(S, 50, 50, 9, 30, "#c9c4b6", "#aeaa9c", 10);
    cyl(S, 50, 50, 22, 7, "#bdb8aa", "#a6a294", 36);
    water(S, 50, 50, 43, 17, "#b4eaf8", "#4aa6d0");
    cyl(S, 50, 50, 5, 14, "#c9c4b6", "#aeaa9c", 43);
    const [cx, cy] = P(50, 50, 58);
    let jets = "";
    for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2, dx = Math.cos(a) * 24, dy = Math.sin(a) * 12; jets += `<path d="M${f(cx)} ${f(cy)}Q${f(cx + dx * 0.5)} ${f(cy - 18)} ${f(cx + dx)} ${f(cy + 34 + dy)}" fill="none" stroke="#e6f8ff" stroke-width="2.2" opacity=".8" stroke-linecap="round"/>`; }
    S.add(jets + `<circle cx="${f(cx)}" cy="${f(cy - 2)}" r="3" fill="#fff"/>`);
    bush(S, 14, 14, 0.8, "#5a9a44"); bush(S, 86, 86, 0.8, "#5a9a44");
  },
  "park-garden": (S) => {
    bed(S, 12, 12, 32, 32, ["#e66f9a", "#f2c94c", "#ffffff"]); bed(S, 56, 12, 32, 32, ["#c9a8ff", "#ffffff", "#f2c94c"]); bed(S, 12, 56, 32, 32, ["#ff9f5a", "#f2c94c", "#e66f9a"]); bed(S, 56, 56, 32, 32, ["#ffffff", "#e66f9a", "#8fc3ff"]);
    bench(S, 40, 4); bench(S, 40, 90); tree(S, 2, 2, 0.8); tree(S, 94, 2, 0.8); tree(S, 2, 94, 0.8, "#6aa04a");
  },
  "park-orchard": (S) => {
    for (const [x, y] of [[18, 18], [50, 14], [82, 18], [18, 52], [50, 52], [82, 52], [18, 86], [50, 86], [82, 86]]) { tree(S, x, y, 0.72, "#4f8f3a"); const p = P(x, y, 0); for (let i = 0; i < 5; i++) S.add(`<circle cx="${f(p[0] + (S.r() - 0.5) * 24)}" cy="${f(p[1] - 28 - S.r() * 22)}" r="2.6" fill="${["#d9453a", "#e8a23a", "#d9453a"][i % 3]}" stroke="#4a1a14" stroke-width=".8"/>`); }
    box(S, 40, 70, 0, 22, 12, 8, "#8b5f31", { planks: 2 }); box(S, 40, 66, 0, 22, 3, 5, "#a9763f", { sw: 1 });
  },
  "park-pond": (S) => {
    const [cx, cy] = P(50, 52, 0);
    S.add(`<ellipse cx="${f(cx)}" cy="${f(cy + 3)}" rx="94" ry="48" fill="#6b4a2e" stroke="${O}" stroke-width="1.6"/>`);
    water(S, 50, 52, 0, 62, "#9ee0d0", "#3a8fa8");
    for (const [x, y] of [[40, 48], [62, 56], [52, 62]]) { const p = P(x, y, 0); S.add(`<ellipse cx="${f(p[0])}" cy="${f(p[1])}" rx="9" ry="4.5" fill="#4f9a44" stroke="#1d4a1a" stroke-width="1"/><circle cx="${f(p[0] + 2)}" cy="${f(p[1] - 2)}" r="2.2" fill="#ffd1e8"/>`); }
    const d = P(56, 44, 0); S.add(`<ellipse cx="${f(d[0])}" cy="${f(d[1])}" rx="7" ry="4" fill="#f6f2ea" stroke="${O}" stroke-width="1"/><circle cx="${f(d[0] + 6)}" cy="${f(d[1] - 4)}" r="3" fill="#2f6a3a"/>`);
    tree(S, 6, 8, 0.85, "#5a9a3a"); tree(S, 92, 10, 0.85, "#5a9a3a"); bench(S, 40, 92); bush(S, 94, 80, 0.8); bush(S, 8, 78, 0.8);
  },
  "park-statue": (S) => {
    cyl(S, 50, 50, 34, 4, "#c9c4b6", "#b8b3a4"); cyl(S, 50, 50, 15, 18, "#bdb8aa", "#a6a294", 4);
    const [cx, cy] = P(50, 50, 22);
    S.add(`<path d="M${f(cx - 7)} ${f(cy)}h14l-2 -22q6 -4 3 -12q-5 -6 -8 -6q-3 0 -8 6q-3 8 3 12z" fill="${S.grad([[0, "#d7d4ca"], [1, "#8f8c80"]], [0, 0, 1, 0])}" stroke="${O}" stroke-width="1.5"/><circle cx="${f(cx)}" cy="${f(cy - 38)}" r="6" fill="#d7d4ca" stroke="${O}" stroke-width="1.4"/><path d="M${f(cx + 6)} ${f(cy - 24)}l14 -18" stroke="#c9a24a" stroke-width="2.4"/><path d="M${f(cx + 19)} ${f(cy - 46)}l5 -7l3 8z" fill="#c9a24a" stroke="${O}" stroke-width="1"/>`);
    for (const [x, y] of [[6, 6], [84, 6], [6, 84], [84, 84]]) box(S, x, y, 0, 10, 10, 12, "#3f7a35", { sw: 1.2, top: "#5a9a44" });
    bench(S, 40, 90); bench(S, 40, 2);
  },
  "tree-oak": (S) => { tree(S, 50, 50, 1.05, "#4a8a3a"); },
  "tree-birch": (S) => { tree(S, 50, 50, 1.0, "#79a845", "#cfc7b4"); },
  "tree-pine": (S) => { pineTree(S, 50, 50, 1.15); },
  "street-lamp": (S) => { lamppost(S, 50, 50, 46); },
  "street-lamp-off": (S) => { lamppost(S, 50, 50, 46, false); },
  // ---------- countryside around the town ----------
  forest: (S) => {
    pineTree(S, 22, 18, 1.0); tree(S, 70, 24, 0.85, "#3f7f38"); pineTree(S, 18, 66, 0.85); tree(S, 48, 48, 1.0, "#4a8a3a"); pineTree(S, 82, 62, 1.05); tree(S, 46, 86, 0.8, "#5f9a40"); bush(S, 80, 90, 0.8, "#4a8a3a");
  },
  pines: (S) => { pineTree(S, 30, 22, 0.9); pineTree(S, 72, 34, 1.15); pineTree(S, 26, 66, 1.05); pineTree(S, 62, 76, 0.85); },
  rocks: (S) => {
    const rock = (x, y, r, h) => { const [cx, cy] = P(x, y, 0); S.add(`<path d="M${f(cx - r)} ${f(cy)}L${f(cx - r * 0.6)} ${f(cy - h)}L${f(cx + r * 0.15)} ${f(cy - h * 1.15)}L${f(cx + r * 0.8)} ${f(cy - h * 0.6)}L${f(cx + r)} ${f(cy)}Q${f(cx)} ${f(cy + r * 0.4)} ${f(cx - r)} ${f(cy)}Z" fill="${S.grad([[0, "#c4c1b6"], [1, "#807d72"]], [0, 0, 1, 1])}" stroke="${O}" stroke-width="1.6" stroke-linejoin="round"/><path d="M${f(cx + r * 0.15)} ${f(cy - h * 1.15)}L${f(cx)} ${f(cy - h * 0.3)}" stroke="#6e6b62" stroke-width="1.2" fill="none"/>`); };
    rock(38, 40, 26, 24); rock(66, 62, 18, 16); rock(30, 74, 12, 10); bush(S, 74, 28, 0.6, "#5a9a44");
  },
  hill: (S) => {
    const [cx, cy] = P(50, 56, 0);
    S.add(`<path d="M${f(cx - 130)} ${f(cy + 6)}Q${f(cx - 78)} ${f(cy - 84)} ${f(cx - 4)} ${f(cy - 82)}Q${f(cx + 82)} ${f(cy - 80)} ${f(cx + 130)} ${f(cy + 6)}Q${f(cx)} ${f(cy + 52)} ${f(cx - 130)} ${f(cy + 6)}Z" fill="${S.grad([[0, "#86bb55"], [1, "#4c7f37"]])}" stroke="#2f5426" stroke-width="1.8"/><path d="M${f(cx - 86)} ${f(cy - 26)}Q${f(cx - 44)} ${f(cy - 68)} ${f(cx + 6)} ${f(cy - 66)}" stroke="#b5da7e" stroke-width="5" fill="none" opacity=".6" stroke-linecap="round"/>`);
    pineTree(S, 30, 26, 0.6); pineTree(S, 48, 22, 0.75); tree(S, 74, 46, 0.5, "#3f7f38");
  },
  mountain: (S) => {
    const [cx, cy] = P(50, 62, 0);
    const peak = (dx, w, h, tone) => { const x = cx + dx; S.add(`<path d="M${f(x - w)} ${f(cy)}L${f(x - w * 0.18)} ${f(cy - h)}L${f(x + w * 0.04)} ${f(cy - h * 0.9)}L${f(x + w * 0.18)} ${f(cy - h * 0.96)}L${f(x + w)} ${f(cy)}Q${f(x)} ${f(cy + w * 0.3)} ${f(x - w)} ${f(cy)}Z" fill="${S.grad([[0, tone[0]], [1, tone[1]]], [0, 0, 1, 0])}" stroke="${O}" stroke-width="1.8" stroke-linejoin="round"/><path d="M${f(x - w * 0.46)} ${f(cy - h * 0.66)}L${f(x - w * 0.18)} ${f(cy - h)}L${f(x + w * 0.04)} ${f(cy - h * 0.9)}L${f(x + w * 0.18)} ${f(cy - h * 0.96)}L${f(x + w * 0.46)} ${f(cy - h * 0.64)}L${f(x + w * 0.2)} ${f(cy - h * 0.72)}L${f(x)} ${f(cy - h * 0.6)}L${f(x - w * 0.22)} ${f(cy - h * 0.74)}Z" fill="#f4f6fa" stroke="${O}" stroke-width="1.4" stroke-linejoin="round"/>`); };
    peak(-58, 72, 96, ["#a9a79c", "#6f6c63"]); peak(30, 100, 150, ["#b6b3a8", "#65625a"]);
    pineTree(S, 6, 88, 0.6); pineTree(S, 94, 72, 0.7); pineTree(S, 78, 98, 0.55);
  },
  cloud: (S) => {
    for (const [dx, dy, r] of [[-86, 0, 44], [-36, -18, 56], [30, -8, 62], [84, 8, 40], [0, 20, 52]]) S.add(`<circle cx="${151 + dx}" cy="${150 + dy}" r="${r}" fill="${S.radial([[0, "#ffffff", 0.95], [0.6, "#eef3fb", 0.7], [1, "#e4ecf8", 0]])}"/>`);
  },
};
