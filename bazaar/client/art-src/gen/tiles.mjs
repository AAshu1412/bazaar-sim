// Ground tiles: 96x48 diamonds. Variants are picked by the engine from a coordinate hash.
import { rng, shade } from "./engine.mjs";
const W = 96, H = 48, f = (n) => +n.toFixed(1);
const DIA = "M48 -0.8L96.8 24L48 48.8L-0.8 24Z";
const inDia = (x, y, m = 0.9) => Math.abs(x - 48) / 48 + Math.abs(y - 24) / 24 <= m;
const iso = (u, v) => [48 + 48 * (u - v), 24 * (u + v)]; // u runs down-right, v down-left, both 0..1
const pt = (r, m = 0.86) => { for (;;) { const x = r() * W, y = r() * H; if (inDia(x, y, m)) return [x, y]; } };
const wrap = (body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><clipPath id="d"><path d="${DIA}"/></clipPath></defs><g clip-path="url(#d)">${body}</g></svg>`;
const slab = (u0, v0, u1, v1, fill, stroke) => `<polygon points="${[iso(u0, v0), iso(u1, v0), iso(u1, v1), iso(u0, v1)].map((p) => p.map(f).join(",")).join(" ")}" fill="${fill}" stroke="${stroke}" stroke-width=".9" stroke-linejoin="round"/>`;

export const TILES = {
  grass: (r, v) => {
    const light = v < 2, base = light ? "#62954a" : "#5a8c42";
    let g = `<path d="${DIA}" fill="${base}"/>`;
    for (let i = 0; i < 3; i++) { const [x, y] = pt(r, 0.7); g += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(8 + r() * 8)}" ry="${f(3 + r() * 3)}" fill="${shade(base, r() > 0.5 ? 0.9 : 1.1)}" opacity=".5"/>`; }
    for (let i = 0; i < 9; i++) { const [x, y] = pt(r); g += `<path d="M${f(x)} ${f(y)}l-1.6 -4M${f(x)} ${f(y)}l1.4 -5" stroke="${shade(base, r() > 0.5 ? 0.75 : 1.25)}" stroke-width="1.1" fill="none"/>`; }
    if (v % 2) for (let i = 0; i < 2; i++) { const [x, y] = pt(r, 0.75); g += `<circle cx="${f(x)}" cy="${f(y)}" r="1.4" fill="${["#fff", "#f4d35e", "#f2a0c0"][Math.floor(r() * 3)]}"/>`; }
    return g;
  },
  road: (r) => {
    let g = `<path d="${DIA}" fill="#4b4640"/>`;
    for (let i = 0; i < 26; i++) { const [x, y] = pt(r, 0.92), rx = 4 + r() * 3.6; g += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(rx / 2)}" fill="${shade("#5a544d", 0.7 + r() * 0.5)}" stroke="#2f2b27" stroke-width=".8"/>`; }
    for (let i = 0; i < 6; i++) { const [x, y] = pt(r, 0.85); g += `<ellipse cx="${f(x)}" cy="${f(y - 0.6)}" rx="2" ry="1" fill="#7a736a" opacity=".6"/>`; }
    return g;
  },
  sidewalk: (r) => {
    let g = `<path d="${DIA}" fill="#a9a090"/>`;
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) g += slab(a / 3, b / 3, (a + 1) / 3, (b + 1) / 3, shade("#b0a898", 0.93 + r() * 0.14), "#857d6e");
    for (let i = 0; i < 8; i++) { const [x, y] = pt(r, 0.8); g += `<circle cx="${f(x)}" cy="${f(y)}" r=".8" fill="#8a8274" opacity=".7"/>`; }
    return g;
  },
  plaza: (r, v) => {
    let g = `<path d="${DIA}" fill="#c7b891"/>`;
    for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) g += slab(a / 4, b / 4, (a + 1) / 4, (b + 1) / 4, (a + b) % 2 ? "#cdbf98" : "#bcad86", "#a09470");
    if (v) g += slab(0.3, 0.3, 0.7, 0.7, "#a9453a", "#6a2a22") + slab(0.4, 0.4, 0.6, 0.6, "#e6c25a", "#8a6a22");
    return g;
  },
  dirt: (r) => {
    let g = `<path d="${DIA}" fill="#a98a60"/>`;
    for (let i = 0; i < 4; i++) { const [x, y] = pt(r, 0.7); g += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(8 + r() * 8)}" ry="${f(3 + r() * 3)}" fill="${shade("#a98a60", 0.85 + r() * 0.3)}" opacity=".6"/>`; }
    for (let i = 0; i < 14; i++) { const [x, y] = pt(r); g += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(0.8 + r() * 1.3)}" ry=".7" fill="${shade("#a98a60", 0.6 + r() * 0.7)}"/>`; }
    return g;
  },
  field: (r, v) => {
    let g = `<path d="${DIA}" fill="#7e5f38"/>`;
    for (let k = 1; k < 6; k++) {
      const a = iso(0, k / 6), b = iso(1, k / 6);
      g += `<path d="M${a.map(f).join(" ")}L${b.map(f).join(" ")}" stroke="#5a4226" stroke-width="2.2"/>`;
      for (let i = 0; i < 6; i++) { const t = (i + 0.5) / 6, p = iso(t, k / 6 - 0.03); g += v ? `<path d="M${f(p[0])} ${f(p[1])}v-5M${f(p[0] - 1.6)} ${f(p[1])}v-4M${f(p[0] + 1.6)} ${f(p[1])}v-4" stroke="#d9b84a" stroke-width="1.3"/>` : `<circle cx="${f(p[0])}" cy="${f(p[1] - 2)}" r="2.1" fill="#5aa044" stroke="#2a5a1e" stroke-width=".7"/>`; }
    }
    return g;
  },
};
export const VARIANTS = { grass: 4, road: 3, sidewalk: 3, plaza: 2, dirt: 2, field: 2 };
export const tileSvg = (kind, v) => wrap(TILES[kind](rng(`${kind}${v}`), v));
