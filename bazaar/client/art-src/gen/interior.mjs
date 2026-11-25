// Interior scenes (768x432): one-point-perspective room + props. Standalone renderer sharing Scene/colour helpers.
import { Scene, shade, mix } from "./engine.mjs";
const O = "#2a1c15", f1 = (n) => +n.toFixed(1);
const X0 = 150, X1 = 618, Y0 = 70, Y1 = 290, CXr = 384;

export class Room extends Scene {
  svgRoom() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 768 432" width="768" height="432"><defs>${this.defs.join("")}</defs>${this.layers.join("")}</svg>`;
  }
}

// ---------- room shell ----------
export function shell(S, o = {}) {
  const { wall = "plank", wc = "#b8895f", floor = "#8a6a48", beam = "#5a3a26", windows = [], lamps = [], tint, floorKind = "plank" } = o;
  const r = S.r;
  // side walls + ceiling + floor polygons
  const left = [[0, 0], [X0, Y0], [X0, Y1], [0, 432]], right = [[768, 0], [X1, Y0], [X1, Y1], [768, 432]];
  const ceil = [[0, 0], [768, 0], [X1, Y0], [X0, Y0]], flo = [[0, 432], [X0, Y1], [X1, Y1], [768, 432]];
  const P = (a) => a.map((p) => p.join(",")).join(" ");
  const id = (n, poly) => { const k = S.uid(n); S.defs.push(`<clipPath id="${k}"><polygon points="${P(poly)}"/></clipPath>`); return k; };
  // back wall
  const bw = id("bw", [[X0, Y0], [X1, Y0], [X1, Y1], [X0, Y1]]);
  let g = `<rect x="${X0}" y="${Y0}" width="${X1 - X0}" height="${Y1 - Y0}" fill="${wc}"/>`;
  if (wall === "plank") for (let x = X0, i = 0; x < X1; x += 22, i++) g += `<rect x="${x}" y="${Y0}" width="22" height="${Y1 - Y0}" fill="${shade(wc, 0.92 + (i % 3) * 0.06)}"/><path d="M${x} ${Y0}V${Y1}" stroke="${shade(wc, 0.55)}" stroke-width="1.4"/>`;
  else if (wall === "brick") for (let y = Y0, row = 0; y < Y1; y += 14, row++) { g += `<path d="M${X0} ${y}H${X1}" stroke="${shade(wc, 0.6)}" stroke-width="1.5"/>`; for (let x = X0 + (row % 2 ? -14 : 0); x < X1; x += 28) g += `<rect x="${x + 1}" y="${y + 1}" width="26" height="12" fill="${shade(wc, 0.86 + r() * 0.3)}" opacity=".9"/><path d="M${x + 28} ${y}v14" stroke="${shade(wc, 0.6)}" stroke-width="1.5"/>`; }
  else if (wall === "stone") for (let y = Y0; y < Y1; ) { const bh = 20 + Math.floor(r() * 14); for (let x = X0 - r() * 20; x < X1; ) { const bw2 = 34 + Math.floor(r() * 30); g += `<rect x="${f1(x + 1)}" y="${y + 1}" width="${bw2 - 2}" height="${bh - 2}" rx="3" fill="${shade(wc, 0.84 + r() * 0.32)}" stroke="${shade(wc, 0.55)}" stroke-width="1.4"/>`; x += bw2; } y += bh; }
  else { for (let i = 0; i < 260; i++) g += `<circle cx="${f1(X0 + r() * (X1 - X0))}" cy="${f1(Y0 + r() * (Y1 - Y0))}" r="${f1(1 + r() * 2)}" fill="${shade(wc, 0.9 + r() * 0.2)}" opacity=".5"/>`; }
  // wainscot
  g += `<rect x="${X0}" y="${Y1 - 62}" width="${X1 - X0}" height="62" fill="${shade(beam, 1.15)}"/><rect x="${X0}" y="${Y1 - 66}" width="${X1 - X0}" height="6" fill="${beam}"/>`;
  for (let x = X0 + 6; x < X1; x += 52) g += `<rect x="${x}" y="${Y1 - 54}" width="42" height="44" rx="2" fill="none" stroke="${shade(beam, 0.7)}" stroke-width="2"/>`;
  S.add(`<g clip-path="url(#${bw})">${g}<rect x="${X0}" y="${Y0}" width="${X1 - X0}" height="60" fill="${S.grad([[0, "#000", 0.45], [1, "#000", 0]])}"/></g>`);
  // side walls
  for (const [poly, k, dir] of [[left, 0.74, 1], [right, 0.6, -1]]) {
    const c = id("sw", poly);
    let s = `<polygon points="${P(poly)}" fill="${shade(wc, k)}"/>`;
    for (let i = 1; i < 9; i++) { const t = i / 9; const x = dir > 0 ? X0 * t : 768 - (768 - X1) * t - 0, ya = Y0 * (1 - t) * 0 + 0; s += `<path d="M${f1(dir > 0 ? X0 * (1 - t) : X1 + (768 - X1) * t)} ${f1(Y0 * (1 - t) + 0 * t)}L${f1(dir > 0 ? X0 * (1 - t) : X1 + (768 - X1) * t)} ${f1(Y1 + (432 - Y1) * t)}" stroke="${shade(wc, k * 0.62)}" stroke-width="1.3" opacity=".7"/>`; }
    S.add(`<g clip-path="url(#${c})">${s}</g><polygon points="${P(poly)}" fill="${S.grad([[0, "#000", 0.35], [1, "#000", 0]], [dir > 0 ? 0 : 1, 0, dir > 0 ? 1 : 0, 0])}"/>`);
  }
  // ceiling + beams
  S.add(`<polygon points="${P(ceil)}" fill="${shade(beam, 0.8)}"/>`);
  for (let i = 0; i < 5; i++) { const t = (i + 0.5) / 5, y = Y0 * (1 - 0) * (1 - t) + 0, x0 = X0 * (1 - t) + 0, x1 = 768 - (768 - X1) * (1 - t) - 0; const yy = Y0 * (1 - t) * 1; S.add(`<path d="M${f1(X0 * (1 - t))} ${f1(Y0 * (1 - t))}H${f1(768 - (768 - X1) * (1 - t))}" stroke="${beam}" stroke-width="${f1(6 + 10 * (1 - t))}"/><path d="M${f1(X0 * (1 - t))} ${f1(Y0 * (1 - t) + 4)}H${f1(768 - (768 - X1) * (1 - t))}" stroke="${shade(beam, 0.6)}" stroke-width="2"/>`); }
  S.add(`<polygon points="${P(ceil)}" fill="${S.grad([[0, "#000", 0.5], [1, "#000", 0.1]])}"/>`);
  // floor planks in perspective
  const fc = id("fl", flo);
  let fg = `<polygon points="${P(flo)}" fill="${floor}"/>`;
  const n = floorKind === "tile" ? 14 : 20;
  for (let i = 0; i <= n; i++) { const xb = X0 + ((X1 - X0) * i) / n, xf = CXr + (xb - CXr) * 1.65; fg += `<path d="M${f1(xb)} ${Y1}L${f1(xf)} 432" stroke="${shade(floor, 0.55)}" stroke-width="1.6"/>`; if (i < n) fg += `<polygon points="${f1(xb)},${Y1} ${f1(X0 + ((X1 - X0) * (i + 1)) / n)},${Y1} ${f1(CXr + (X0 + ((X1 - X0) * (i + 1)) / n - CXr) * 1.65)},432 ${f1(xf)},432" fill="${shade(floor, floorKind === "tile" ? (i % 2 ? 0.8 : 1.1) : 0.9 + (i % 3) * 0.07)}"/>`; }
  for (let k = 1; k < 7; k++) { const t = Math.pow(k / 7, 1.4), y = Y1 + (432 - Y1) * t; fg += `<path d="M0 ${f1(y)}H768" stroke="${shade(floor, 0.55)}" stroke-width="${f1(1 + t * 1.4)}" opacity="${floorKind === "tile" ? 1 : 0.55}"/>`; }
  S.add(`<g clip-path="url(#${fc})">${fg}</g><polygon points="${P(flo)}" fill="${S.grad([[0, "#000", 0.45], [0.5, "#000", 0.05], [1, "#000", 0.25]])}"/>`);
  // windows (back wall) with light shafts
  for (const wx of windows) {
    const w = 70, h = 96, y = Y0 + 22;
    S.add(`<polygon points="${wx - w / 2},${y + 10} ${wx + w / 2},${y + 10} ${wx + w / 2 + 120},${Y1 + 120} ${wx - w / 2 + 40},${Y1 + 120}" fill="${S.grad([[0, "#fff6d0", 0.34], [1, "#fff6d0", 0]])}"/>`);
    S.add(`<rect x="${wx - w / 2 - 6}" y="${y - 6}" width="${w + 12}" height="${h + 12}" rx="${w / 2 + 6}" fill="${beam}" stroke="${O}" stroke-width="2.4"/><path d="M${wx - w / 2} ${y + h}V${y + w / 2}A${w / 2} ${w / 2} 0 0 1 ${wx + w / 2} ${y + w / 2}V${y + h}Z" fill="${S.grad([[0, "#dff3ff"], [1, "#8fc4e6"]])}" stroke="${O}" stroke-width="2"/><path d="M${wx} ${y}V${y + h}M${wx - w / 2} ${y + h * 0.55}H${wx + w / 2}" stroke="${beam}" stroke-width="4"/><path d="M${wx - w / 2 + 8} ${y + h - 6}L${wx - 6} ${y + 14}" stroke="#fff" stroke-width="5" opacity=".28"/><rect x="${wx - w / 2 - 10}" y="${y + h + 4}" width="${w + 20}" height="9" rx="2" fill="${shade(beam, 1.3)}" stroke="${O}" stroke-width="2"/>`);
  }
  // hanging lamps
  for (const lx of lamps) {
    S.add(`<circle cx="${lx}" cy="${Y0 + 66}" r="110" fill="${S.radial([[0, "#ffd98a", 0.5], [1, "#ffd98a", 0]])}"/><path d="M${lx} ${Y0 - 6}V${Y0 + 34}" stroke="#2a2420" stroke-width="3"/><path d="M${lx - 16} ${Y0 + 36}h32l-5 36h-22z" fill="${S.grad([[0, "#ffe9a8"], [1, "#f2a940"]])}" stroke="${O}" stroke-width="2.2"/><path d="M${lx - 20} ${Y0 + 36}h40l-20 -14z" fill="#2a2420" stroke="${O}" stroke-width="2"/><path d="M${lx - 6} ${Y0 + 40}v28M${lx + 6} ${Y0 + 40}v28" stroke="#2a2420" stroke-width="1.6" opacity=".6"/>`);
  }
}
export function finish(S, tint = "#ffcc88") {
  S.add(`<rect width="768" height="432" fill="${S.radial([[0.55, "#000", 0], [1, "#000", 0.5]])}"/><rect width="768" height="432" fill="${tint}" opacity=".07"/>`);
}

// ---------- props (x centre, y base, s scale) ----------
const lg = (S, c, d = [0, 0, 0, 1]) => S.grad([[0, shade(c, 1.2)], [1, shade(c, 0.76)]], d);
export function barrel(S, x, y, s = 1, c = "#a9763f") {
  const w = 26 * s, h = 50 * s;
  S.add(`<ellipse cx="${x}" cy="${y}" rx="${w + 6}" ry="${8 * s}" fill="#000" opacity=".3"/><path d="M${x - w} ${y - h}Q${x - w - 7 * s} ${y - h / 2} ${x - w} ${y}Q${x} ${y + 9 * s} ${x + w} ${y}Q${x + w + 7 * s} ${y - h / 2} ${x + w} ${y - h}Z" fill="${S.grad([[0, shade(c, 1.3)], [0.5, c], [1, shade(c, 0.6)]], [0, 0, 1, 0])}" stroke="${O}" stroke-width="2"/>${[0.22, 0.78].map((t) => `<path d="M${x - w - 2} ${y - h + h * t}Q${x} ${y - h + h * t + 9 * s} ${x + w + 2} ${y - h + h * t}" fill="none" stroke="#3b2a1e" stroke-width="3.4"/>`).join("")}<ellipse cx="${x}" cy="${y - h}" rx="${w}" ry="${8 * s}" fill="${shade(c, 1.25)}" stroke="${O}" stroke-width="2"/>`);
}
export function sack(S, x, y, s = 1, c = "#e9dfc6") {
  S.add(`<ellipse cx="${x}" cy="${y}" rx="${30 * s}" ry="${7 * s}" fill="#000" opacity=".28"/><path d="M${x - 24 * s} ${y}Q${x - 34 * s} ${y - 38 * s} ${x - 8 * s} ${y - 50 * s}L${x + 8 * s} ${y - 50 * s}Q${x + 34 * s} ${y - 38 * s} ${x + 24 * s} ${y}Q${x} ${y + 9 * s} ${x - 24 * s} ${y}Z" fill="${S.grad([[0, shade(c, 1.15)], [1, shade(c, 0.74)]])}" stroke="${O}" stroke-width="2"/><path d="M${x - 10 * s} ${y - 47 * s}Q${x} ${y - 38 * s} ${x + 10 * s} ${y - 47 * s}" stroke="#7a5a3a" stroke-width="3" fill="none"/>`);
}
export function crate(S, x, y, s = 1, c = "#a9763f", fill) {
  const w = 40 * s, h = 34 * s;
  S.add(`<ellipse cx="${x}" cy="${y}" rx="${w + 6}" ry="${7 * s}" fill="#000" opacity=".28"/><rect x="${x - w}" y="${y - h}" width="${w * 2}" height="${h}" fill="${lg(S, c)}" stroke="${O}" stroke-width="2"/><path d="M${x - w} ${y - h * 0.5}H${x + w}M${x - w} ${y - h}L${x + w} ${y}M${x + w} ${y - h}L${x - w} ${y}" stroke="${shade(c, 0.55)}" stroke-width="2"/>` + (fill ? fill.map((col, i) => `<circle cx="${x - w + 10 * s + i * 14 * s}" cy="${y - h - 4 * s}" r="${8 * s}" fill="${col}" stroke="${O}" stroke-width="1.6"/>`).join("") : ""));
}
export function counter(S, x, y, w, s = 1, c = "#9a6a3a", topc) {
  const d = 22 * s, h = 54 * s, t = 8 * s;
  S.add(`<ellipse cx="${x}" cy="${y + 4}" rx="${w / 2 + 14}" ry="${9 * s}" fill="#000" opacity=".32"/><rect x="${x - w / 2}" y="${y - h}" width="${w}" height="${h}" fill="${S.grad([[0, shade(c, 1.1)], [1, shade(c, 0.7)]])}" stroke="${O}" stroke-width="2.4"/>` +
    Array.from({ length: Math.floor(w / 60) }, (_, i) => `<rect x="${x - w / 2 + 10 + i * 60}" y="${y - h + 10}" width="48" height="${h - 20}" rx="2" fill="none" stroke="${shade(c, 0.55)}" stroke-width="2"/>`).join("") +
    `<polygon points="${x - w / 2 - 8},${y - h} ${x + w / 2 + 8},${y - h} ${x + w / 2 - 4},${y - h - d} ${x - w / 2 + 4},${y - h - d}" fill="${topc ?? shade(c, 1.28)}" stroke="${O}" stroke-width="2.4"/><rect x="${x - w / 2 - 8}" y="${y - h}" width="${w + 16}" height="${t}" fill="${shade(topc ?? c, 1.05)}" stroke="${O}" stroke-width="2"/>`);
  return y - h - d / 2; // surface y for placing items
}
export function table(S, x, y, w, s = 1, c = "#8b5a34") {
  const d = 26 * s, h = 44 * s;
  S.add(`<ellipse cx="${x}" cy="${y + 2}" rx="${w / 2 + 10}" ry="${8 * s}" fill="#000" opacity=".28"/>` + [-1, 1].map((k) => `<rect x="${x + k * (w / 2 - 10) - 4 * s}" y="${y - h}" width="${8 * s}" height="${h}" fill="${shade(c, 0.7)}" stroke="${O}" stroke-width="1.6"/>`).join("") + `<polygon points="${x - w / 2 - 6},${y - h} ${x + w / 2 + 6},${y - h} ${x + w / 2 - 6},${y - h - d} ${x - w / 2 + 6},${y - h - d}" fill="${shade(c, 1.25)}" stroke="${O}" stroke-width="2.2"/><rect x="${x - w / 2 - 6}" y="${y - h}" width="${w + 12}" height="${7 * s}" fill="${c}" stroke="${O}" stroke-width="2"/>`);
  return y - h - d / 2;
}
export function shelf(S, x, y, w, c = "#6b4a2e") { S.add(`<rect x="${x - w / 2}" y="${y}" width="${w}" height="9" rx="1.5" fill="${lg(S, c)}" stroke="${O}" stroke-width="2"/><path d="M${x - w / 2 + 12} ${y + 9}l8 14M${x + w / 2 - 12} ${y + 9}l-8 14" stroke="${shade(c, 0.6)}" stroke-width="3.4"/>`); }
export function bottle(S, x, y, h = 30, c = "#6bd1a0") { S.add(`<path d="M${x - 3} ${y - h}h6v${h * 0.3}q9 ${h * 0.14} 9 ${h * 0.34}v${h * 0.36}h-24v${-h * 0.36}q0 ${-h * 0.2} 9 ${-h * 0.34}z" fill="${S.grad([[0, shade(c, 1.35)], [1, shade(c, 0.7)]], [0, 0, 1, 0])}" stroke="${O}" stroke-width="1.8"/><rect x="${x - 4}" y="${y - h - 5}" width="8" height="6" fill="#a9763f" stroke="${O}" stroke-width="1.4"/><path d="M${x - 6} ${y - h * 0.5}v${h * 0.3}" stroke="#fff" stroke-width="2" opacity=".5"/>`); }
export function jar(S, x, y, s = 1, c = "#e8c25a", lid = "#8a5a2a") { S.add(`<rect x="${x - 12 * s}" y="${y - 28 * s}" width="${24 * s}" height="${28 * s}" rx="${5 * s}" fill="${S.grad([[0, shade(c, 1.2)], [1, shade(c, 0.7)]], [0, 0, 1, 0])}" stroke="${O}" stroke-width="1.8"/><rect x="${x - 14 * s}" y="${y - 34 * s}" width="${28 * s}" height="${8 * s}" rx="2" fill="${lid}" stroke="${O}" stroke-width="1.8"/><path d="M${x - 7 * s} ${y - 24 * s}v${16 * s}" stroke="#fff" stroke-width="2" opacity=".45"/>`); }
export function loaf(S, x, y, s = 1, c = "#d9a05b") { S.add(`<ellipse cx="${x}" cy="${y - 8 * s}" rx="${22 * s}" ry="${12 * s}" fill="${S.grad([[0, shade(c, 1.2)], [1, shade(c, 0.78)]])}" stroke="${O}" stroke-width="2"/><path d="M${x - 10 * s} ${y - 12 * s}l5 -5M${x} ${y - 14 * s}l5 -5M${x + 10 * s} ${y - 12 * s}l5 -5" stroke="${shade(c, 0.6)}" stroke-width="2.4"/>`); }
export function book(S, x, y, w, h, c) { S.add(`<rect x="${x}" y="${y - h}" width="${w}" height="${h}" fill="${S.grad([[0, shade(c, 1.2)], [1, shade(c, 0.78)]], [0, 0, 1, 0])}" stroke="${O}" stroke-width="1.6"/><path d="M${x} ${y - h * 0.8}h${w}M${x} ${y - h * 0.2}h${w}" stroke="${shade(c, 0.5)}" stroke-width="1.4"/>`); }
export function books(S, x, y, n, rng, h0 = 44) { const cols = ["#b3402e", "#2e6f9a", "#3f8f5a", "#c98a2a", "#7a4a9a", "#8a2f2a", "#2f5a7a"]; let cx = x; for (let i = 0; i < n; i++) { const w = 9 + Math.floor(rng() * 8), h = h0 - 6 + Math.floor(rng() * 14); book(S, cx, y, w, h, cols[Math.floor(rng() * cols.length)]); cx += w + 1; } return cx; }
export function coins(S, x, y, n = 4, s = 1) { for (let i = 0; i < n; i++) S.add(`<ellipse cx="${x}" cy="${y - i * 6 * s}" rx="${15 * s}" ry="${6 * s}" fill="${i % 2 ? "#e6c25f" : "#d9ad4b"}" stroke="${O}" stroke-width="1.6"/><rect x="${x - 15 * s}" y="${y - (i + 1) * 6 * s + 1}" width="${30 * s}" height="${5 * s}" fill="${i % 2 ? "#d6b04e" : "#c39a3b"}" stroke="none"/>`); }
export function candle(S, x, y, s = 1) { S.add(`<circle cx="${x}" cy="${y - 30 * s}" r="${30 * s}" fill="${S.radial([[0, "#ffd98a", 0.5], [1, "#ffd98a", 0]])}"/><rect x="${x - 4 * s}" y="${y - 22 * s}" width="${8 * s}" height="${22 * s}" fill="#f3ead8" stroke="${O}" stroke-width="1.6"/><path d="M${x} ${y - 24 * s}q${-5 * s} ${-7 * s} 0 ${-14 * s}q${5 * s} ${7 * s} 0 ${14 * s}z" fill="#ffb347" stroke="#7a2a08" stroke-width="1.2"/>`); }
export function kettle(S, x, y, s = 1, c = "#b87333") { S.add(`<ellipse cx="${x}" cy="${y}" rx="${26 * s}" ry="${6 * s}" fill="#000" opacity=".25"/><path d="M${x - 24 * s} ${y - 6 * s}Q${x - 30 * s} ${y - 40 * s} ${x - 10 * s} ${y - 46 * s}h${20 * s}Q${x + 30 * s} ${y - 40 * s} ${x + 24 * s} ${y - 6 * s}z" fill="${S.grad([[0, shade(c, 1.35)], [0.5, c], [1, shade(c, 0.62)]], [0, 0, 1, 0])}" stroke="${O}" stroke-width="2"/><path d="M${x + 22 * s} ${y - 32 * s}q${18 * s} ${-4 * s} ${14 * s} ${-24 * s}" fill="none" stroke="${shade(c, 0.8)}" stroke-width="${5 * s}"/><ellipse cx="${x}" cy="${y - 47 * s}" rx="${11 * s}" ry="${4 * s}" fill="${shade(c, 0.6)}" stroke="${O}" stroke-width="1.6"/><path d="M${x - 5 * s} ${y - 54 * s}q${-6 * s} ${-12 * s} ${2 * s} ${-22 * s}M${x + 5 * s} ${y - 54 * s}q${6 * s} ${-12 * s} ${-2 * s} ${-22 * s}" fill="none" stroke="#fff" stroke-width="3" opacity=".45"/>`); }
export function clockI(S, x, y, r = 24) { let s = `<circle cx="${x}" cy="${y}" r="${r + 5}" fill="${S.grad([[0, "#e0b45a"], [1, "#9a6f2a"]])}" stroke="${O}" stroke-width="2.2"/><circle cx="${x}" cy="${y}" r="${r}" fill="#f6efdc" stroke="${O}" stroke-width="1.6"/>`; for (let k = 0; k < 12; k++) { const a = (k * Math.PI) / 6; s += `<path d="M${f1(x + Math.sin(a) * (r - 6))} ${f1(y - Math.cos(a) * (r - 6))}L${f1(x + Math.sin(a) * (r - 2))} ${f1(y - Math.cos(a) * (r - 2))}" stroke="#3a2a1a" stroke-width="2"/>`; } S.add(s + `<path d="M${x} ${y}V${y - r * 0.68}M${x} ${y}L${x + r * 0.5} ${y + r * 0.2}" stroke="#2a1c15" stroke-width="3" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="2.6" fill="#2a1c15"/>`); }
export function gear(S, x, y, r = 18, c = "#c9a24a") { let s = ""; for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4; s += `<rect x="${f1(x + Math.cos(a) * r - 4)}" y="${f1(y + Math.sin(a) * r - 4)}" width="8" height="8" fill="${c}" stroke="${O}" stroke-width="1.4" transform="rotate(${k * 45} ${f1(x + Math.cos(a) * r)} ${f1(y + Math.sin(a) * r)})"/>`; } S.add(s + `<circle cx="${x}" cy="${y}" r="${r}" fill="${S.grad([[0, shade(c, 1.2)], [1, shade(c, 0.7)]])}" stroke="${O}" stroke-width="2"/><circle cx="${x}" cy="${y}" r="${r * 0.38}" fill="#3a2a1a" stroke="${O}" stroke-width="1.6"/>`); }
export function crystalI(S, x, y, h = 60, c = "#a56bff") { S.add(`<circle cx="${x}" cy="${y - h / 2}" r="${h * 1.1}" fill="${S.radial([[0, c, 0.55], [1, c, 0]])}"/>` + [[-14, 0.62, 0.85], [14, 0.8, 0.75], [0, 1, 1.15]].map(([dx, k, l]) => `<path d="M${x + dx - 10} ${y}L${x + dx - 8} ${y - h * k * 0.7}L${x + dx} ${y - h * k}L${x + dx + 8} ${y - h * k * 0.7}L${x + dx + 10} ${y}Z" fill="${shade(c, l)}" stroke="${shade(c, 0.3)}" stroke-width="2"/><path d="M${x + dx} ${y - h * k}L${x + dx - 3} ${y}" stroke="#fff" stroke-width="2" opacity=".5"/>`).join("")); }
export function plantPot(S, x, y, s = 1) { S.add(`<path d="M${x - 16 * s} ${y - 30 * s}h${32 * s}l${-5 * s} ${30 * s}h${-22 * s}z" fill="${lg(S, "#c4683d")}" stroke="${O}" stroke-width="2"/>` + [[-14, -48, 18], [12, -52, 20], [0, -64, 18], [-4, -44, 16]].map(([dx, dy, r]) => `<ellipse cx="${x + dx * s}" cy="${y + dy * s}" rx="${r * s * 0.7}" ry="${r * s}" fill="#4f9a44" stroke="#1d4a1a" stroke-width="1.8" transform="rotate(${dx * 2} ${x + dx * s} ${y + dy * s})"/>`).join("")); }
export function hanging(S, x, y0, len, c = "#5fae4f") { S.add(`<path d="M${x} ${y0}V${y0 + len * 0.3}" stroke="#4a3220" stroke-width="2"/>` + [0, 1, 2].map((i) => `<ellipse cx="${x + (i - 1) * 6}" cy="${y0 + len * 0.3 + 14 + i * 3}" rx="7" ry="${len * 0.38}" fill="${shade(c, 0.85 + i * 0.12)}" stroke="#1d4a1a" stroke-width="1.6"/>`).join("")); }
export function ladder(S, x, y, h = 190) { S.add(`<path d="M${x - 16} ${y}L${x - 10} ${y - h}M${x + 16} ${y}L${x + 10} ${y - h}" stroke="${O}" stroke-width="9"/><path d="M${x - 16} ${y}L${x - 10} ${y - h}M${x + 16} ${y}L${x + 10} ${y - h}" stroke="#a9763f" stroke-width="5"/>` + Array.from({ length: 7 }, (_, i) => { const yy = y - 20 - i * 26, hw = 15 - ((y - yy) / h) * 5; return `<path d="M${x - hw} ${yy}H${x + hw}" stroke="${O}" stroke-width="7"/><path d="M${x - hw} ${yy}H${x + hw}" stroke="#c28b4d" stroke-width="3.6"/>`; }).join("")); }
export function banner(S, x, y, w, h, c, icon) { S.add(`<path d="M${x - w / 2 - 6} ${y}H${x + w / 2 + 6}" stroke="#2a2420" stroke-width="5"/><path d="M${x - w / 2} ${y + 2}H${x + w / 2}V${y + h}L${x} ${y + h - 18}L${x - w / 2} ${y + h}Z" fill="${S.grad([[0, shade(c, 1.2)], [1, shade(c, 0.74)]])}" stroke="${O}" stroke-width="2.4"/><path d="M${x - w / 2 + 6} ${y + 14}H${x + w / 2 - 6}" stroke="#e6b84a" stroke-width="3"/><circle cx="${x}" cy="${y + h * 0.45}" r="${w * 0.22}" fill="#e6b84a" stroke="${O}" stroke-width="1.8"/>`); }
export function rugI(S, x, y, w, h, c1, c2) { S.add(`<polygon points="${x - w / 2},${y} ${x + w / 2},${y} ${x + w / 2 + 40},${y + h} ${x - w / 2 - 40},${y + h}" fill="${c1}" stroke="${O}" stroke-width="2.2"/><polygon points="${x - w / 2 + 14},${y + 6} ${x + w / 2 - 14},${y + 6} ${x + w / 2 + 22},${y + h - 8} ${x - w / 2 - 22},${y + h - 8}" fill="${c2}" stroke="${shade(c1, 0.5)}" stroke-width="1.6"/><polygon points="${x - w / 4},${y + 12} ${x + w / 4},${y + 12} ${x + w / 4 + 16},${y + h - 14} ${x - w / 4 - 16},${y + h - 14}" fill="${c1}" opacity=".55"/>`); }
export function hangRug(S, x, y, w, h, c1, c2) { S.add(`<path d="M${x - w / 2 - 6} ${y}H${x + w / 2 + 6}" stroke="#2a2420" stroke-width="5"/><rect x="${x - w / 2}" y="${y + 2}" width="${w}" height="${h}" fill="${S.grad([[0, shade(c1, 1.15)], [1, shade(c1, 0.75)]])}" stroke="${O}" stroke-width="2.4"/><rect x="${x - w / 2 + 8}" y="${y + 12}" width="${w - 16}" height="${h - 20}" fill="${c2}" stroke="${shade(c1, 0.5)}" stroke-width="1.6"/><path d="M${x - w / 2 + 8} ${y + h / 2 + 2}h${w - 16}M${x} ${y + 12}V${y + h - 8}" stroke="${shade(c2, 0.6)}" stroke-width="2"/>`); }
export function flameI(S, x, y, s = 1) { S.add(`<circle cx="${x}" cy="${y - 20 * s}" r="${46 * s}" fill="${S.radial([[0, "#ffb347", 0.6], [1, "#ff8a1f", 0]])}"/><path d="M${x} ${y}q${-22 * s} ${-16 * s} ${-12 * s} ${-44 * s}q${6 * s} ${12 * s} ${14 * s} ${6 * s}q${3 * s} ${-24 * s} ${14 * s} ${-32 * s}q${12 * s} ${28 * s} ${-2 * s} ${70 * s}z" fill="#ff8a1f" stroke="#7a2a08" stroke-width="2"/><path d="M${x} ${y}q${-11 * s} ${-10 * s} ${-3 * s} ${-26 * s}q${8 * s} ${8 * s} ${8 * s} ${26 * s}z" fill="#ffe27a"/>`); }
