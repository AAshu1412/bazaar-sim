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

export const SCENERY = {
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
    for (const [x, y] of [[8, 50], [92, 50]]) lamppost(S, x, y, 40);
    bush(S, 14, 14, 0.8, "#5a9a44"); bush(S, 86, 86, 0.8, "#5a9a44");
  },
  "park-garden": (S) => {
    bed(S, 12, 12, 32, 32, ["#e66f9a", "#f2c94c", "#ffffff"]); bed(S, 56, 12, 32, 32, ["#c9a8ff", "#ffffff", "#f2c94c"]); bed(S, 12, 56, 32, 32, ["#ff9f5a", "#f2c94c", "#e66f9a"]); bed(S, 56, 56, 32, 32, ["#ffffff", "#e66f9a", "#8fc3ff"]);
    bench(S, 40, 4); bench(S, 40, 90); tree(S, 2, 2, 0.8); tree(S, 94, 2, 0.8); tree(S, 2, 94, 0.8, "#6aa04a"); lamppost(S, 50, 50, 36);
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
    bench(S, 40, 90); bench(S, 40, 2); lamppost(S, 94, 50, 38); lamppost(S, 6, 50, 38);
  },
  "tree-oak": (S) => { tree(S, 50, 50, 1.05, "#4a8a3a"); },
  "tree-birch": (S) => { tree(S, 50, 50, 1.0, "#79a845", "#cfc7b4"); },
  "tree-pine": (S) => { pineTree(S, 50, 50, 1.15); },
  "street-lamp": (S) => { lamppost(S, 50, 50, 46); },
};
