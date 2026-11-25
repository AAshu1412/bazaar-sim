// Isometric building generator. World axes: x runs right-down, y runs left-down, z up.
// screen = (CX + (x - y), CY + (x + y)/2 - z)   (2:1 dimetric, matches the game's tiles)
export const W0 = 302, H0 = 256, CX = 151, CY = 150;
export const P = (x, y, z = 0) => [CX + (x - y), CY + (x + y) / 2 - z];
const f1 = (n) => +n.toFixed(1);
const pts = (a) => a.map((p) => `${f1(p[0])},${f1(p[1])}`).join(" ");

// ---------- colour + rng ----------
const hex2 = (h) => { h = h.replace("#", ""); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const toHex = (a) => "#" + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
export const shade = (c, f) => toHex(hex2(c).map((v) => v * f));
export const mix = (a, b, t) => { const A = hex2(a), B = hex2(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
export function rng(seed) {
  let a = [...seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const OUT = "#2a1c15";

export class Scene {
  constructor(name, scale = 0.97) { this.name = name; this.r = rng(name); this.defs = []; this.layers = []; this.n = 0; this.scale = scale; this.mark = 0; }
  uid(p) { return `${p}${this.n++}`; }
  grad(stops, v = [0, 0, 0, 1]) {
    const id = this.uid("g");
    this.defs.push(`<linearGradient id="${id}" x1="${v[0]}" y1="${v[1]}" x2="${v[2]}" y2="${v[3]}">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join("")}</linearGradient>`);
    return `url(#${id})`;
  }
  radial(stops) {
    const id = this.uid("r");
    this.defs.push(`<radialGradient id="${id}">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join("")}</radialGradient>`);
    return `url(#${id})`;
  }
  clip(poly) { const id = this.uid("c"); this.defs.push(`<clipPath id="${id}"><polygon points="${pts(poly)}"/></clipPath>`); return id; }
  add(s) { this.layers.push(s); }
  svg() {
    const [px, py] = [CX, CY + 50], k = this.scale;
    const body = this.layers.slice(0, this.mark).join("") + `<g transform="matrix(${k} 0 0 ${k} ${f1(px - px * k)} ${f1(py - py * k)})">` + this.layers.slice(this.mark).join("") + "</g>";
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W0} ${H0}" width="${W0}" height="${H0}"><defs><filter id="blur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4"/></filter>${this.defs.join("")}</defs>${body}</svg>`;
  }
}

// ---------- ground ----------
const GROUNDS = { stone: ["#9b9a92", "#b4b2a8"], grass: ["#5f8a3a", "#74a047"], dirt: ["#a88a62", "#bda076"], cobble: ["#8d8a84", "#a6a39b"] };
export function ground(S, kind = "stone") {
  const [edge, top] = GROUNDS[kind], lo = -8, hi = 104, span = hi - lo;
  const c = [P(lo, lo), P(hi, lo), P(hi, hi), P(lo, hi)];
  const rim = c.map((p) => [p[0], p[1] + 5]).reverse();
  S.add(`<polygon points="${pts([...c, ...rim])}" fill="${shade(edge, 0.7)}" stroke="${OUT}" stroke-width="1.4" stroke-linejoin="round"/>`);
  const id = S.clip(c);
  let g = `<polygon points="${pts(c)}" fill="${top}"/>`;
  if (kind === "grass") {
    for (let i = 0; i < 80; i++) {
      const p = P(lo + S.r() * span, lo + S.r() * span);
      g += `<path d="M${f1(p[0])} ${f1(p[1])}l-1.5 -4M${f1(p[0])} ${f1(p[1])}l1.5 -5" stroke="${shade(top, S.r() > 0.5 ? 0.78 : 1.15)}" stroke-width="1.2" fill="none"/>`;
    }
  } else {
    const step = kind === "dirt" ? 0 : 14;
    for (let t = lo; step && t <= hi; t += step) {
      g += `<path d="M${pts([P(t, lo)])}L${pts([P(t, hi)])}M${pts([P(lo, t)])}L${pts([P(hi, t)])}" stroke="${shade(top, 0.8)}" stroke-width="1" fill="none"/>`;
    }
    for (let i = 0; i < 50; i++) {
      const p = P(lo + S.r() * span, lo + S.r() * span);
      g += `<ellipse cx="${f1(p[0])}" cy="${f1(p[1])}" rx="${f1(2 + S.r() * 3)}" ry="1.3" fill="${shade(top, 0.9 + S.r() * 0.2)}" opacity=".7"/>`;
    }
  }
  S.add(`<g clip-path="url(#${id})">${g}</g><polygon points="${pts(c)}" fill="none" stroke="${OUT}" stroke-width="1.4"/>`);
  S.mark = S.layers.length;
}
export function shadow(S, vol) {
  const { x0, y0, W, D, H } = vol, o = Math.min(36, H * 0.55);
  const poly = [P(x0 + 4, y0 + 4), P(x0 + W + o, y0 + 4 + o * 0.5), P(x0 + W + o, y0 + D + o * 0.2), P(x0 + W, y0 + D + 4), P(x0 + 4, y0 + D + 4)];
  S.add(`<polygon points="${pts(poly)}" fill="#000" opacity=".28" filter="url(#blur)"/>`);
}

// ---------- 3D primitives ----------
export function box(S, x, y, z, dx, dy, dz, c, o = {}) {
  const top = [P(x, y, z + dz), P(x + dx, y, z + dz), P(x + dx, y + dy, z + dz), P(x, y + dy, z + dz)];
  const lf = [P(x, y + dy, z), P(x + dx, y + dy, z), P(x + dx, y + dy, z + dz), P(x, y + dy, z + dz)];
  const rt = [P(x + dx, y, z), P(x + dx, y + dy, z), P(x + dx, y + dy, z + dz), P(x + dx, y, z + dz)];
  const sw = o.sw ?? 1.3;
  const gl = S.grad([[0, shade(c, 1.08)], [1, shade(c, 0.88)]]);
  let s = `<polygon points="${pts(lf)}" fill="${gl}" stroke="${OUT}" stroke-width="${sw}" stroke-linejoin="round"/>`;
  s += `<polygon points="${pts(rt)}" fill="${shade(c, 0.7)}" stroke="${OUT}" stroke-width="${sw}" stroke-linejoin="round"/>`;
  s += `<polygon points="${pts(top)}" fill="${o.top ?? shade(c, 1.22)}" stroke="${OUT}" stroke-width="${sw}" stroke-linejoin="round"/>`;
  if (o.planks) for (let i = 1; i < o.planks; i++) { const t = i / o.planks; s += `<path d="M${pts([P(x, y + dy, z + dz * t)])}L${pts([P(x + dx, y + dy, z + dz * t)])}" stroke="${shade(c, 0.6)}" stroke-width="1"/>`; }
  S.add(s);
}
export function barrel(S, x, y, r = 8, h = 14, c = "#a9763f") {
  const [cx, cy] = P(x, y, 0), rx = r * 1.414, ry = r * 0.707, top = cy - h;
  const body = S.grad([[0, shade(c, 1.25)], [0.5, c], [1, shade(c, 0.6)]], [0, 0, 1, 0]);
  S.add(`<path d="M${f1(cx - rx)} ${f1(top)}V${f1(cy)}A${f1(rx)} ${f1(ry)} 0 0 0 ${f1(cx + rx)} ${f1(cy)}V${f1(top)}Z" fill="${body}" stroke="${OUT}" stroke-width="1.3"/>` +
    [0.25, 0.75].map((t) => `<path d="M${f1(cx - rx)} ${f1(top + h * t)}A${f1(rx)} ${f1(ry)} 0 0 0 ${f1(cx + rx)} ${f1(top + h * t)}" fill="none" stroke="#3b2a1e" stroke-width="1.6"/>`).join("") +
    `<ellipse cx="${f1(cx)}" cy="${f1(top)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="${shade(c, 1.3)}" stroke="${OUT}" stroke-width="1.3"/><ellipse cx="${f1(cx)}" cy="${f1(top)}" rx="${f1(rx * 0.7)}" ry="${f1(ry * 0.7)}" fill="none" stroke="${shade(c, 0.8)}" stroke-width="1"/>`);
}
export function sack(S, x, y, c = "#e9dfc6", s = 1) {
  const [cx, cy] = P(x, y, 0);
  S.add(`<path d="M${f1(cx - 9 * s)} ${f1(cy)}Q${f1(cx - 13 * s)} ${f1(cy - 14 * s)} ${f1(cx - 3 * s)} ${f1(cy - 18 * s)}L${f1(cx + 3 * s)} ${f1(cy - 18 * s)}Q${f1(cx + 13 * s)} ${f1(cy - 14 * s)} ${f1(cx + 9 * s)} ${f1(cy)}Q${f1(cx)} ${f1(cy + 5 * s)} ${f1(cx - 9 * s)} ${f1(cy)}Z" fill="${S.grad([[0, shade(c, 1.1)], [1, shade(c, 0.78)]])}" stroke="${OUT}" stroke-width="1.3"/><path d="M${f1(cx - 4 * s)} ${f1(cy - 17 * s)}Q${f1(cx)} ${f1(cy - 13 * s)} ${f1(cx + 4 * s)} ${f1(cy - 17 * s)}" stroke="#7a5a3a" stroke-width="1.6" fill="none"/>`);
}
export function bush(S, x, y, s = 1, c = "#4f8a3f") {
  const [cx, cy] = P(x, y, 0);
  const blobs = [[-8, -6, 9], [6, -7, 10], [0, -13, 9], [-1, -4, 11]];
  S.add(`<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(14 * s)}" ry="${f1(5 * s)}" fill="#000" opacity=".2"/>` +
    blobs.map(([dx, dy, r], i) => `<circle cx="${f1(cx + dx * s)}" cy="${f1(cy + dy * s)}" r="${f1(r * s)}" fill="${shade(c, [0.8, 1, 1.15, 0.92][i])}" stroke="${shade(c, 0.45)}" stroke-width="1.2"/>`).join("") +
    `<circle cx="${f1(cx - 3 * s)}" cy="${f1(cy - 15 * s)}" r="${f1(2.5 * s)}" fill="${shade(c, 1.45)}"/>`);
}
export function tree(S, x, y, s = 1, c = "#4a8a3a", trunk = "#6b4a2e") {
  const [cx, cy] = P(x, y, 0);
  let g = `<ellipse cx="${f1(cx + 6)}" cy="${f1(cy + 2)}" rx="${f1(26 * s)}" ry="${f1(8 * s)}" fill="#000" opacity=".22"/>`;
  g += `<path d="M${f1(cx - 5 * s)} ${f1(cy)}L${f1(cx - 3 * s)} ${f1(cy - 34 * s)}L${f1(cx + 3 * s)} ${f1(cy - 34 * s)}L${f1(cx + 5 * s)} ${f1(cy)}Z" fill="${S.grad([[0, shade(trunk, 1.2)], [1, shade(trunk, 0.7)]], [0, 0, 1, 0])}" stroke="${OUT}" stroke-width="1.3"/>`;
  const blobs = [[-14, -40, 17, 0.8], [14, -42, 17, 0.9], [0, -58, 19, 1.12], [-4, -34, 20, 0.95], [16, -30, 14, 0.82]];
  for (const [dx, dy, r, k] of blobs) g += `<circle cx="${f1(cx + dx * s)}" cy="${f1(cy + dy * s)}" r="${f1(r * s)}" fill="${shade(c, k)}" stroke="${shade(c, 0.4)}" stroke-width="1.3"/>`;
  for (let i = 0; i < 9; i++) g += `<circle cx="${f1(cx + (S.r() - 0.5) * 36 * s)}" cy="${f1(cy - (30 + S.r() * 34) * s)}" r="${f1(2.2 * s)}" fill="${shade(c, 1.4)}" opacity=".7"/>`;
  S.add(g);
}
export function lamppost(S, x, y, h = 40) {
  const [cx, cy] = P(x, y, 0);
  S.add(`<circle cx="${f1(cx)}" cy="${f1(cy - h)}" r="16" fill="${S.radial([[0, "#ffd98a", 0.55], [1, "#ffd98a", 0]])}"/><rect x="${f1(cx - 1.6)}" y="${f1(cy - h)}" width="3.2" height="${h}" fill="#2f2a26"/><ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="5" ry="2.5" fill="#2f2a26"/><polygon points="${f1(cx - 5)},${f1(cy - h)} ${f1(cx + 5)},${f1(cy - h)} ${f1(cx + 3.5)},${f1(cy - h - 9)} ${f1(cx - 3.5)},${f1(cy - h - 9)}" fill="#ffcf6b" stroke="${OUT}" stroke-width="1.2"/><polygon points="${f1(cx - 6.5)},${f1(cy - h - 9)} ${f1(cx + 6.5)},${f1(cy - h - 9)} ${f1(cx)},${f1(cy - h - 15)}" fill="#2f2a26"/>`);
}
export function planter(S, x, y, flowers = ["#e66f9a", "#f2c94c", "#ffffff"]) {
  box(S, x, y, 0, 14, 8, 8, "#8b5a34");
  const [cx, cy] = P(x + 7, y + 4, 8);
  let g = "";
  for (let i = 0; i < 8; i++) g += `<circle cx="${f1(cx + (i - 3.5) * 3.6)}" cy="${f1(cy - 2 - S.r() * 4)}" r="2.6" fill="${flowers[i % flowers.length]}" stroke="#2a3a1e" stroke-width=".8"/>`;
  S.add(`<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="12" ry="4" fill="#3f7a35"/>${g}`);
}

// ---------- textures (drawn in a face's local flat coords: u across, v down) ----------
function texWall(S, kind, w, h, c, o = {}) {
  const r = S.r;
  let g = `<rect x="-2" y="-2" width="${w + 4}" height="${h + 4}" fill="${c}"/>`;
  if (kind === "brick") {
    for (let row = 0, v = 0; v < h; row++, v += 7) {
      g += `<path d="M0 ${v}H${w}" stroke="${shade(c, 0.62)}" stroke-width="1"/>`;
      for (let u = row % 2 ? -7 : 0; u < w; u += 14) {
        g += `<rect x="${u + 0.5}" y="${v + 0.5}" width="13" height="6" fill="${shade(c, 0.88 + r() * 0.28)}" opacity=".85"/><path d="M${u + 14} ${v}V${v + 7}" stroke="${shade(c, 0.62)}" stroke-width="1"/>`;
      }
    }
  } else if (kind === "stone") {
    for (let v = 0, row = 0; v < h; row++) {
      const bh = 8 + Math.floor(r() * 6);
      for (let u = -r() * 10; u < w; ) {
        const bw = 14 + Math.floor(r() * 14);
        g += `<rect x="${f1(u + 0.5)}" y="${v + 0.5}" width="${bw - 1}" height="${bh - 1}" rx="2" fill="${shade(c, 0.86 + r() * 0.3)}" stroke="${shade(c, 0.6)}" stroke-width="1"/><path d="M${f1(u + 2)} ${v + 2.5}h${f1(bw * 0.4)}" stroke="${shade(c, 1.3)}" stroke-width="1" opacity=".7"/>`;
        u += bw;
      }
      v += bh;
    }
  } else if (kind === "plank") {
    for (let u = 0, i = 0; u < w; u += 9, i++) {
      g += `<rect x="${u}" y="0" width="9" height="${h}" fill="${shade(c, 0.9 + (i % 3) * 0.07)}"/><path d="M${u} 0V${h}" stroke="${shade(c, 0.55)}" stroke-width="1.1"/>`;
      for (let k = 0; k < 2; k++) g += `<ellipse cx="${u + 4.5}" cy="${f1(r() * h)}" rx="1.2" ry="2.6" fill="${shade(c, 0.72)}" opacity=".7"/>`;
    }
  } else { // plaster
    for (let i = 0; i < w * h / 70; i++) g += `<circle cx="${f1(r() * w)}" cy="${f1(r() * h)}" r="${f1(0.8 + r() * 1.6)}" fill="${shade(c, 0.9 + r() * 0.2)}" opacity=".6"/>`;
    if (o.crack) g += `<path d="M${w * 0.6} ${h * 0.2}l3 8 -4 7 3 9" stroke="${shade(c, 0.7)}" fill="none"/>`;
  }
  return g;
}
function texTimber(w, h, c = "#5a3a26", o = {}) {
  const post = (u) => `<rect x="${u - 2.5}" y="0" width="5" height="${h}" fill="${c}"/><path d="M${u - 1} 0V${h}" stroke="${shade(c, 1.4)}" stroke-width="1" opacity=".6"/>`;
  const beam = (v) => `<rect x="0" y="${v - 2.5}" width="${w}" height="5" fill="${c}"/>`;
  let g = beam(h - 14) + beam(3);
  const n = Math.max(2, Math.round(w / 34));
  for (let i = 0; i <= n; i++) g += post((i * w) / n);
  if (o.braces !== false) for (let i = 0; i < n; i++) {
    const u0 = (i * w) / n, u1 = ((i + 1) * w) / n;
    g += `<path d="M${u0 + 3} ${h - 14}L${u1 - 3} 6" stroke="${c}" stroke-width="3.6"/>`;
  }
  return g;
}

// roof textures drawn in slope-local coords: u along eave, v up-slope from eave (v grows toward ridge)
function texRoof(S, style, lu, lv, c, c2 = "#f3ead8") {
  const r = S.r;
  let g = `<rect x="-3" y="-3" width="${lu + 6}" height="${lv + 6}" fill="${c}"/>`;
  if (style === "thatch") {
    for (let v = lv; v > -6; v -= 4) {
      for (let u = -4; u < lu + 4; u += 5) {
        const k = 0.82 + r() * 0.4;
        g += `<path d="M${f1(u)} ${f1(v)}l${f1(2 + r() * 2)} -6" stroke="${shade(c, k)}" stroke-width="2.2" fill="none"/>`;
      }
      g += `<path d="M0 ${v}H${lu}" stroke="${shade(c, 0.66)}" stroke-width="1.1" opacity=".7"/>`;
    }
    return g;
  }
  if (style === "copper") {
    for (let u = 0; u < lu; u += 11) g += `<rect x="${u}" y="0" width="11" height="${lv}" fill="${shade(c, 0.92 + ((u / 11) % 2) * 0.12)}"/><path d="M${u} 0V${lv}" stroke="${shade(c, 0.6)}" stroke-width="1.5"/>`;
    return g;
  }
  if (style === "stripe") {
    for (let u = 0, i = 0; u < lu; u += 16, i++) g += `<rect x="${u}" y="0" width="16" height="${lv}" fill="${i % 2 ? c2 : c}"/>`;
    return g;
  }
  const rowH = style === "slate" ? 7 : 8, tw = style === "slate" ? 12 : 14;
  for (let v = lv + rowH, row = 0; v > -rowH; v -= rowH, row++) {
    for (let u = row % 2 ? -tw / 2 : 0; u < lu + tw; u += tw) {
      const k = 0.84 + r() * 0.3;
      if (style === "slate") g += `<rect x="${f1(u)}" y="${f1(v - rowH)}" width="${tw - 0.6}" height="${rowH + 1}" fill="${shade(c, k)}" stroke="${shade(c, 0.5)}" stroke-width=".8"/>`;
      else g += `<path d="M${f1(u)} ${f1(v - rowH)}h${tw}v${rowH - 3}q-${tw / 2} 6 -${tw} 0z" fill="${shade(c, k)}" stroke="${shade(c, 0.55)}" stroke-width=".9"/>`;
    }
  }
  return g;
}

// ---------- icons for hanging signs (centred on 0,0; ~10px) ----------
const ICONS = {
  bread: `<ellipse rx="7" ry="4.5" fill="#c58a42" stroke="#5a3a1a" stroke-width="1.2"/><path d="M-3 -2l1.5 3M0 -3l1.5 3.5M3 -2l1.5 3" stroke="#8a5a22" stroke-width="1.2"/>`,
  mug: `<rect x="-5" y="-5" width="9" height="10" rx="1.5" fill="#f1e6c8" stroke="#5a3a1a" stroke-width="1.2"/><path d="M4 -2q5 0 0 5" fill="none" stroke="#5a3a1a" stroke-width="1.4"/><path d="M-5 -5q2 -3 4.5 0t4.5 0" fill="#fff" stroke="#c9b88a" stroke-width=".8"/>`,
  clock: `<circle r="6.5" fill="#f3ead8" stroke="#5a3a1a" stroke-width="1.3"/><path d="M0 0V-4M0 0l3 1.5" stroke="#3a2a1a" stroke-width="1.3"/>`,
  book: `<rect x="-6" y="-5" width="12" height="10" rx="1" fill="#b3402e" stroke="#4a1a12" stroke-width="1.2"/><path d="M-4 -2h8M-4 1h8" stroke="#f0d9a8" stroke-width="1"/>`,
  herb: `<path d="M0 6V-5" stroke="#2f6b2a" stroke-width="1.4"/><path d="M0 -4q-6 -1 -6 -5q5 0 6 5zM0 0q6 -1 6 -5q-5 0 -6 5zM0 3q-6 -1 -6 -5q5 0 6 5z" fill="#5fae4f" stroke="#2f6b2a" stroke-width=".9"/>`,
  coin: `<circle r="6.5" fill="#e6b84a" stroke="#7a5410" stroke-width="1.3"/><circle r="4" fill="none" stroke="#b58420" stroke-width="1.1"/><path d="M0 -2.5V2.5" stroke="#7a5410" stroke-width="1.4"/>`,
  anvil: `<path d="M-7 -3h12l2 -2v4l-4 2v3h-8v-3l-4 -2z" fill="#6c7078" stroke="#262a30" stroke-width="1.2"/>`,
  fish: `<path d="M-7 0q5 -6 10 0q-5 6 -10 0zM3 0l4 -3v6z" fill="#7fb7d6" stroke="#244a62" stroke-width="1.2"/><circle cx="-3.5" cy="-.5" r=".9" fill="#244a62"/>`,
  cheese: `<path d="M-7 4L-5 -4L7 0V4z" fill="#f0c94c" stroke="#7a5a10" stroke-width="1.2"/><circle cx="-1" cy="1.5" r="1.2" fill="#c99a20"/><circle cx="3" cy="2" r=".9" fill="#c99a20"/>`,
  bottle: `<path d="M-2 -7h4v4q4 2 4 6v3h-12v-3q0 -4 4 -6z" fill="#6bd1a0" stroke="#1d5a40" stroke-width="1.2"/>`,
  quill: `<path d="M-5 6q2 -10 10 -13q-1 8 -10 13z" fill="#f3ead8" stroke="#5a3a1a" stroke-width="1.2"/><path d="M-5 6l5 -7" stroke="#5a3a1a" stroke-width="1"/>`,
  scissors: `<circle cx="-3" cy="4" r="2.2" fill="none" stroke="#3a3f48" stroke-width="1.3"/><circle cx="3" cy="4" r="2.2" fill="none" stroke="#3a3f48" stroke-width="1.3"/><path d="M-2 2l5 -9M2 2l-5 -9" stroke="#8c929c" stroke-width="1.6"/>`,
  lute: `<ellipse cx="-1" cy="2" rx="5" ry="4" fill="#b27a3a" stroke="#4a2c10" stroke-width="1.2"/><path d="M2 -1l6 -6" stroke="#4a2c10" stroke-width="1.6"/><circle cx="-1" cy="2" r="1.4" fill="#4a2c10"/>`,
  gem: `<path d="M-6 -2l3 -4h6l3 4l-6 8z" fill="#6ec3ea" stroke="#1f5a78" stroke-width="1.2"/><path d="M-6 -2h12M-1 -6l-2 4l4 8M1 -6l2 4" stroke="#1f5a78" stroke-width=".8" fill="none"/>`,
  star: `<path d="M0 -7l2 4.6l5 .4l-3.8 3.3l1.2 4.9l-4.4 -2.7l-4.4 2.7l1.2 -4.9l-3.8 -3.3l5 -.4z" fill="#ffd45a" stroke="#7a5410" stroke-width="1"/>`,
  pot: `<path d="M-5 -4h10l-1.5 9h-7z" fill="#c4683d" stroke="#5a2a12" stroke-width="1.2"/><rect x="-6" y="-6" width="12" height="3" fill="#d27a4c" stroke="#5a2a12" stroke-width="1"/>`,
  mask: `<path d="M-7 -4q7 -3 14 0q0 8 -7 10q-7 -2 -7 -10z" fill="#f3ead8" stroke="#3a2a1a" stroke-width="1.2"/><circle cx="-2.5" cy="-1" r="1.4" fill="#3a2a1a"/><circle cx="2.5" cy="-1" r="1.4" fill="#3a2a1a"/><path d="M-2.5 3q2.5 2 5 0" fill="none" stroke="#3a2a1a" stroke-width="1"/>`,
  toy: `<rect x="-5" y="-1" width="10" height="7" fill="#d9534f" stroke="#4a1a18" stroke-width="1.2"/><circle cx="0" cy="-4" r="3.5" fill="#f5c542" stroke="#4a3a10" stroke-width="1.2"/>`,
  pole: `<rect x="-3" y="-7" width="6" height="14" rx="3" fill="#f3ead8" stroke="#3a2a1a" stroke-width="1.2"/><path d="M-3 -4l6 3M-3 0l6 3" stroke="#c0392b" stroke-width="2"/>`,
  steam: `<path d="M-4 5q-3 -4 0 -7q3 -3 0 -7M3 5q-3 -4 0 -7q3 -3 0 -7" fill="none" stroke="#9fc4d6" stroke-width="2"/><path d="M-7 6h14" stroke="#3a2a1a" stroke-width="1.6"/>`,
  key: `<circle cx="-3" cy="-1" r="3.4" fill="none" stroke="#c99a20" stroke-width="1.8"/><path d="M0 1l7 5M4 4l-2 2M6 5.5l-2 2" stroke="#c99a20" stroke-width="1.8"/>`,
  feather: `<path d="M-6 6q2 -12 11 -13q-1 9 -11 13z" fill="#6aa0d6" stroke="#1f3a5a" stroke-width="1.2"/>`,
};

// ---------- wall items (local coords: u across, v down) ----------
const GLOW = { warm: ["#ffe9a8", "#f2a940"], cool: ["#cfeaf5", "#6fa3c2"], dark: ["#3b4a5e", "#1b232e"], green: ["#e4f6c8", "#8fc46a"], red: ["#ffd0b0", "#d9703a"] };
function winItem(S, it) {
  const { u, v, w, h } = it, fc = it.frame ?? "#4a3425", [g1, g2] = GLOW[it.glow ?? "warm"];
  let s = "";
  if ((it.glow ?? "warm") === "warm") s += `<ellipse cx="${u + w / 2}" cy="${v + h / 2}" rx="${w}" ry="${h * 0.8}" fill="${S.radial([[0, "#ffd98a", 0.4], [1, "#ffd98a", 0]])}"/>`;
  if (it.shut) {
    const sw = w * 0.5, sc = it.shut;
    for (const su of [u - sw - 2.5, u + w + 2.5]) {
      s += `<rect x="${f1(su)}" y="${v - 1}" width="${f1(sw)}" height="${h + 2}" rx="1.5" fill="${sc}" stroke="${shade(sc, 0.4)}" stroke-width="1.1"/>`;
      for (let k = 4; k < h; k += 4) s += `<path d="M${f1(su + 1)} ${v + k}h${f1(sw - 2)}" stroke="${shade(sc, 0.65)}" stroke-width="1"/>`;
    }
  }
  s += `<rect x="${u - 4}" y="${v - 5}" width="${w + 8}" height="4.5" rx="1" fill="${it.stone ?? "#a39a8a"}" stroke="${OUT}" stroke-width="1"/>`;
  s += `<rect x="${u - 1.8}" y="${v - 1.8}" width="${w + 3.6}" height="${h + 3.6}" rx="2" fill="${fc}" stroke="${OUT}" stroke-width="1.1"/>`;
  const arch = it.arch ? `M${u} ${v + h}V${v + w / 2}A${w / 2} ${w / 2} 0 0 1 ${u + w} ${v + w / 2}V${v + h}Z` : `M${u} ${v}h${w}v${h}h${-w}Z`;
  s += `<path d="${arch}" fill="${S.grad([[0, g1], [1, g2]])}"/>`;
  s += `<path d="M${u + w / 2} ${v}V${v + h}M${u} ${v + h * (it.panes === 3 ? 0.36 : 0.5)}H${u + w}${it.panes === 3 ? `M${u} ${v + h * 0.68}H${u + w}` : ""}" stroke="${fc}" stroke-width="1.7"/>`;
  s += `<path d="M${u + 2} ${v + h - 2}L${u + w * 0.45} ${v + 2}L${u + w * 0.62} ${v + 2}L${u + 4 + w * 0.15} ${v + h - 2}Z" fill="#fff" opacity=".22"/>`;
  s += `<rect x="${u - 4}" y="${v + h + 1.5}" width="${w + 8}" height="3.5" rx="1" fill="${it.stone ?? "#a39a8a"}" stroke="${OUT}" stroke-width="1"/>`;
  if (it.flowers) {
    s += `<rect x="${u - 3}" y="${v + h + 5}" width="${w + 6}" height="6" rx="1" fill="#7a4a28" stroke="${OUT}" stroke-width="1"/>`;
    const cols = it.flowers === true ? ["#e66f9a", "#f2c94c", "#ffffff", "#d9534f"] : it.flowers;
    for (let k = 0; k < Math.floor((w + 6) / 3.2); k++) s += `<circle cx="${f1(u - 1 + k * 3.2)}" cy="${f1(v + h + 4.5 - S.r() * 3)}" r="2.2" fill="${cols[k % cols.length]}" stroke="#2a3a1e" stroke-width=".7"/><circle cx="${f1(u - 1 + k * 3.2 + 1.2)}" cy="${f1(v + h + 6)}" r="2" fill="#3f7a35"/>`;
  }
  if (it.curtain) s += `<path d="M${u} ${v}q4 6 0 ${h * 0.5}M${u + w} ${v}q-4 6 0 ${h * 0.5}" stroke="${it.curtain}" stroke-width="3.4" fill="none" opacity=".9"/>`;
  return s;
}
function doorItem(S, it, H) {
  const { u, w, h } = it, v = H - h, c = it.c ?? "#6b3f26", fr = it.stone ?? "#a39a8a";
  const r = w / 2;
  const shape = it.arch === false ? `M${u} ${H}V${v}H${u + w}V${H}Z` : `M${u} ${H}V${v + r}A${r} ${r} 0 0 1 ${u + w} ${v + r}V${H}Z`;
  const frame = it.arch === false ? `M${u - 3} ${H}V${v - 3}H${u + w + 3}V${H}Z` : `M${u - 3} ${H}V${v + r}A${r + 3} ${r + 3} 0 0 1 ${u + w + 3} ${v + r}V${H}Z`;
  let s = `<path d="${frame}" fill="${fr}" stroke="${OUT}" stroke-width="1.2"/>`;
  s += `<path d="${shape}" fill="${S.grad([[0, shade(c, 1.2)], [1, shade(c, 0.78)]])}" stroke="${OUT}" stroke-width="1.2"/>`;
  const id = S.uid("dc"); S.defs.push(`<clipPath id="${id}"><path d="${shape}"/></clipPath>`);
  let pl = "";
  for (let k = 1; k < 5; k++) pl += `<path d="M${f1(u + (w * k) / 5)} ${v}V${H}" stroke="${shade(c, 0.58)}" stroke-width="1"/>`;
  pl += `<path d="M${u} ${v + h * 0.28}H${u + w}M${u} ${v + h * 0.72}H${u + w}" stroke="#2c2a28" stroke-width="2.2"/>`;
  if (it.window) pl += `<rect x="${u + w * 0.3}" y="${v + 4}" width="${w * 0.4}" height="${h * 0.22}" rx="2" fill="${S.grad([[0, "#ffe9a8"], [1, "#f2a940"]])}" stroke="${OUT}" stroke-width="1"/>`;
  s += `<g clip-path="url(#${id})">${pl}</g><circle cx="${u + w * 0.8}" cy="${v + h * 0.55}" r="1.8" fill="#e8c35a" stroke="${OUT}" stroke-width=".8"/>`;
  return s;
}
function signItem(S, it) {
  const { u, v } = it, c = it.c ?? "#c9953f", w = it.w ?? 22, h = it.h ?? 20;
  return `<path d="M${u - 3} ${v}H${u + w + 4}" stroke="#2c2a28" stroke-width="2.4"/><path d="M${u + 3} ${v}L${u + 3} ${v + 5}M${u + w - 3} ${v}L${u + w - 3} ${v + 5}" stroke="#2c2a28" stroke-width="1.2"/>` +
    `<rect x="${u}" y="${v + 5}" width="${w}" height="${h}" rx="2.5" fill="${S.grad([[0, shade(c, 1.2)], [1, shade(c, 0.8)]])}" stroke="${OUT}" stroke-width="1.3"/><rect x="${u + 2}" y="${v + 7}" width="${w - 4}" height="${h - 4}" rx="1.5" fill="none" stroke="${shade(c, 0.6)}" stroke-width="1"/>` +
    `<g transform="translate(${u + w / 2} ${v + 5 + h / 2})">${ICONS[it.icon] ?? ""}</g>`;
}
function lampItem(S, it) {
  const { u, v } = it;
  return `<circle cx="${u}" cy="${v + 6}" r="15" fill="${S.radial([[0, "#ffd98a", 0.55], [1, "#ffd98a", 0]])}"/><path d="M${u - 6} ${v - 2}H${u}" stroke="#2c2a28" stroke-width="2.2"/><path d="M${u} ${v - 2}V${v + 1}" stroke="#2c2a28" stroke-width="1.2"/>` +
    `<path d="M${u - 3.5} ${v + 1}h7l-1 9h-5z" fill="#ffcf6b" stroke="${OUT}" stroke-width="1.1"/><path d="M${u - 4.5} ${v + 1}h9l-4.5 -3z" fill="#2c2a28"/>`;
}
function bannerItem(S, it) {
  const { u, v, w = 14, h = 34 } = it, c = it.c ?? "#a8322d";
  return `<path d="M${u - 2} ${v}H${u + w + 2}" stroke="#2c2a28" stroke-width="2.4"/><path d="M${u} ${v + 1}H${u + w}V${v + h}L${u + w / 2} ${v + h - 7}L${u} ${v + h}Z" fill="${S.grad([[0, shade(c, 1.15)], [1, shade(c, 0.78)]])}" stroke="${OUT}" stroke-width="1.2"/>` +
    `<path d="M${u + 3} ${v + 6}H${u + w - 3}" stroke="${it.trim ?? "#e6b84a"}" stroke-width="2"/><g transform="translate(${u + w / 2} ${v + 17}) scale(.7)">${ICONS[it.icon] ?? ICONS.star}</g>`;
}
function clockItem(S, it) {
  const { u, v, r = 12 } = it;
  let s = `<circle cx="${u}" cy="${v}" r="${r + 3}" fill="${it.rim ?? "#c9953f"}" stroke="${OUT}" stroke-width="1.3"/><circle cx="${u}" cy="${v}" r="${r}" fill="#f6efdc" stroke="${OUT}" stroke-width="1.1"/>`;
  for (let k = 0; k < 12; k++) { const a = (k * Math.PI) / 6; s += `<path d="M${f1(u + Math.sin(a) * (r - 3))} ${f1(v - Math.cos(a) * (r - 3))}L${f1(u + Math.sin(a) * (r - 1))} ${f1(v - Math.cos(a) * (r - 1))}" stroke="#3a2a1a" stroke-width="1.2"/>`; }
  return s + `<path d="M${u} ${v}V${v - r * 0.7}M${u} ${v}L${u + r * 0.5} ${v + r * 0.25}" stroke="#2a1c15" stroke-width="1.8" stroke-linecap="round"/><circle cx="${u}" cy="${v}" r="1.6" fill="#2a1c15"/>`;
}
function wheelItem(S, it) {
  const { u, v, r = 22 } = it;
  let s = `<circle cx="${u}" cy="${v}" r="${r}" fill="none" stroke="#5a3a1e" stroke-width="5"/><circle cx="${u}" cy="${v}" r="${r}" fill="none" stroke="#8a5a2e" stroke-width="2"/>`;
  for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4; s += `<path d="M${u} ${v}L${f1(u + Math.cos(a) * r)} ${f1(v + Math.sin(a) * r)}" stroke="#6b4423" stroke-width="3"/><rect x="${f1(u + Math.cos(a) * r - 3)}" y="${f1(v + Math.sin(a) * r - 3)}" width="6" height="6" fill="#4a3018"/>`; }
  return s + `<circle cx="${u}" cy="${v}" r="4" fill="#3a2a1a"/>`;
}
function itemsFor(S, face, vol, side, wu, H) {
  let g = "", front = "";
  for (const it of face.items ?? []) {
    if (it.t === "win") g += winItem(S, it);
    else if (it.t === "door") g += doorItem(S, it, H);
    else if (it.t === "sign") g += signItem(S, it);
    else if (it.t === "lamp") g += lampItem(S, it);
    else if (it.t === "banner") g += bannerItem(S, it);
    else if (it.t === "clock") g += clockItem(S, it);
    else if (it.t === "wheel") g += wheelItem(S, it);
    else if (it.t === "awning") front += awning(S, it, vol, side, H);
  }
  return [g, front];
}
function awning(S, it, vol, side, H) {
  const Pz = (x, y, z = 0) => P(x, y, z + (vol.z0 || 0));
  const { x0, y0, W, D } = vol, { u0, u1, z = 36, d = 18, drop = 11, c1 = "#c0392b", c2 = "#f3ead8", n = 6 } = it;
  const at = (u, o, zz) => (side === "L" ? Pz(x0 + u, y0 + D + o, zz) : Pz(x0 + W + o, y0 + u, zz));
  let s = "";
  for (let k = 0; k < n; k++) {
    const a = u0 + ((u1 - u0) * k) / n, b = u0 + ((u1 - u0) * (k + 1)) / n, c = k % 2 ? c2 : c1;
    const q = [at(a, 0, z), at(b, 0, z), at(b, d, z - drop), at(a, d, z - drop)];
    s += `<polygon points="${pts(q)}" fill="${S.grad([[0, shade(c, 1.12)], [1, shade(c, 0.82)]])}" stroke="${OUT}" stroke-width="1"/>`;
    const v = [at(a, d, z - drop), at(b, d, z - drop), at(b, d, z - drop - 4), at(a, d, z - drop - 4)];
    s += `<polygon points="${pts(v)}" fill="${shade(c, 0.78)}" stroke="${OUT}" stroke-width="1"/>`;
  }
  return s;
}

// ---------- volumes ----------
export function volume(S, vol) {
  const Z0 = vol.z0 || 0; const Pz = (x, y, z = 0) => P(x, y, z + Z0);
  const v = { x0: 0, y0: 0, W: 100, D: 100, H: 70, wall: {}, roof: { t: "gable", axis: "x", rh: 44, ov: 7, style: "tile", c: "#b8553a" }, L: {}, R: {}, ...vol };
  const { x0, y0, W, D, H } = v, roof = v.roof;
  if (!v.z0) shadow(S, v);
  // gable axis decides which wall gets the triangular gable
  const gableOn = roof.t === "gable" ? (roof.axis === "x" ? "R" : "L") : null;
  const out = { front: "" };
  for (const side of ["L", "R"]) {
    const face = v[side], wu = side === "L" ? W : D;
    const k = side === "L" ? 1 : 0.8;
    const base = shade(v.wall.c ?? "#e5d3ad", k);
    const o = side === "L" ? Pz(x0, y0 + D, H) : Pz(x0 + W, y0, H), M = side === "L" ? [1, 0.5, 0, 1, o[0], o[1]] : [-1, 0.5, 0, 1, o[0], o[1]];
    const rh = gableOn === side ? roof.rh : 0;
    const poly = side === "L"
      ? [Pz(x0, y0 + D, 0), Pz(x0 + W, y0 + D, 0), Pz(x0 + W, y0 + D, H), ...(rh ? [Pz(x0 + W / 2, y0 + D, H + rh)] : []), Pz(x0, y0 + D, H)]
      : [Pz(x0 + W, y0, 0), Pz(x0 + W, y0 + D, 0), Pz(x0 + W, y0 + D, H), ...(rh ? [Pz(x0 + W, y0 + D / 2, H + rh)] : []), Pz(x0 + W, y0, H)];
    const cid = S.clip(poly);
    // local coords: v=0 at wall top; gable region above is negative v, so shift texture by rh and draw items un-shifted
    let tex = `<g transform="translate(0 ${-rh})">${texWall(S, v.wall.k ?? "plaster", wu, H + rh, base, v.wall)}</g>`;
    if (v.wall.timber) tex += `<g transform="translate(0 ${-rh})" opacity=".95">${texTimber(wu, H + rh, v.wall.timber === true ? "#5a3a26" : v.wall.timber, { braces: true })}</g>`;
    if (v.wall.plinth) tex += `<rect x="0" y="${H - 8}" width="${wu}" height="8" fill="${shade(v.wall.plinth, k)}"/><path d="M0 ${H - 8}H${wu}" stroke="${shade(v.wall.plinth, 0.55)}" stroke-width="1.4"/>`;
    if (v.wall.band) tex += `<rect x="0" y="${H * 0.52}" width="${wu}" height="4" fill="${shade(v.wall.band, k)}"/>`;
    const [items, front] = itemsFor(S, face, v, side, wu, H);
    const shadeTop = S.grad([[0, "#000", 0.38], [1, "#000", 0]]), shadeBot = S.grad([[0, "#000", 0], [1, "#000", 0.3]]);
    const light = side === "L" ? S.grad([[0, "#fff", 0.0], [1, "#fff", 0.16]], [0, 0, 1, 0]) : S.grad([[0, "#000", 0.0], [1, "#000", 0.2]], [0, 0, 1, 0]);
    S.add(`<g clip-path="url(#${cid})"><g transform="matrix(${M.join(" ")})">${tex}<rect x="0" y="${-rh}" width="${wu}" height="${H + rh}" fill="${light}"/><rect x="0" y="0" width="${wu}" height="16" fill="${shadeTop}"/><rect x="0" y="${H - 30}" width="${wu}" height="30" fill="${shadeBot}"/>${items}</g></g><polygon points="${pts(poly)}" fill="none" stroke="${OUT}" stroke-width="1.8" stroke-linejoin="round"/>`);
    out.front += front;
    // corner highlight
    if (side === "L") S.add(`<path d="M${pts([Pz(x0 + W, y0 + D, 0)])}L${pts([Pz(x0 + W, y0 + D, H)])}" stroke="#fff" stroke-width="1.2" opacity=".35"/>`);
  }
  drawRoof(S, v);
  if (v.chimney) {
    const c = v.chimney, top = roofZ(v, c.x, c.y) + (v.z0 || 0);
    box(S, x0 + c.x, y0 + c.y, top - 6, c.w ?? 12, c.w ?? 12, (c.h ?? 30) + 6, c.c ?? "#8a5a44", { top: "#3a2a22", planks: 0 });
    const [sx, sy] = Pz(x0 + c.x + (c.w ?? 12) / 2, y0 + c.y + (c.w ?? 12) / 2, top + (c.h ?? 30) + 4);
    if (c.smoke !== false) S.add(`<g fill="#f2efe8"><circle cx="${f1(sx + 2)}" cy="${f1(sy - 5)}" r="5" opacity=".75"/><circle cx="${f1(sx + 7)}" cy="${f1(sy - 13)}" r="6.5" opacity=".55"/><circle cx="${f1(sx + 14)}" cy="${f1(sy - 23)}" r="8" opacity=".35"/></g>`);
  }
  S.add(out.front);
  return v;
}
function roofZ(v, x, y) {
  const { W, D, H, roof } = v;
  if (roof.t === "gable") return roof.axis === "x" ? H + roof.rh * (1 - Math.abs(y - D / 2) / (D / 2)) : H + roof.rh * (1 - Math.abs(x - W / 2) / (W / 2));
  return H + roof.rh * Math.max(0, Math.min(1, Math.min(x, W - x, y, D - y) / (Math.min(W, D) / 2)));
}
function slope(S, poly, E0, E1, Bv, style, color, lit, c2) {
  const A = [E1[0] - E0[0], E1[1] - E0[1]], la = Math.hypot(...A), lb = Math.hypot(...Bv);
  const M = [A[0] / la, A[1] / la, Bv[0] / lb, Bv[1] / lb, E0[0], E0[1]];
  const cid = S.clip(poly), base = shade(color, lit);
  S.add(`<g clip-path="url(#${cid})"><g transform="matrix(${M.map(f1).join(" ")})">${texRoof(S, style, la, lb, base, c2 ? shade(c2, lit) : undefined)}<rect x="0" y="0" width="${la}" height="${lb}" fill="${S.grad([[0, "#000", 0.28], [0.25, "#000", 0], [1, "#fff", 0.1]], [0, 0, 0, 1])}"/></g></g><polygon points="${pts(poly)}" fill="none" stroke="${OUT}" stroke-width="1.8" stroke-linejoin="round"/>`);
}
function drawRoof(S, v) {
  const Pz = (x, y, z = 0) => P(x, y, z + (v.z0 || 0));
  const { x0, y0, W, D, H, roof } = v, { rh, ov, style, c } = roof;
  const edge = (a, b, t = 5) => S.add(`<polygon points="${pts([a, b, [b[0], b[1] + t], [a[0], a[1] + t]])}" fill="${shade(c, 0.5)}" stroke="${OUT}" stroke-width="1.3" stroke-linejoin="round"/>`);
  if (roof.t === "flat") {
    const ph = roof.parapet ?? 8, z = H + ph;
    const top = [Pz(x0, y0, z), Pz(x0 + W, y0, z), Pz(x0 + W, y0 + D, z), Pz(x0, y0 + D, z)];
    S.add(`<polygon points="${pts([Pz(x0, y0 + D, H), Pz(x0 + W, y0 + D, H), Pz(x0 + W, y0 + D, z), Pz(x0, y0 + D, z)])}" fill="${shade(c, 1.0)}" stroke="${OUT}" stroke-width="1.5"/><polygon points="${pts([Pz(x0 + W, y0, H), Pz(x0 + W, y0 + D, H), Pz(x0 + W, y0 + D, z), Pz(x0 + W, y0, z)])}" fill="${shade(c, 0.75)}" stroke="${OUT}" stroke-width="1.5"/><polygon points="${pts(top)}" fill="${shade(c, 1.18)}" stroke="${OUT}" stroke-width="1.5"/>`);
    return;
  }
  const s = rh / (roof.axis === "x" ? D / 2 : W / 2), zE = H - ov * s;
  if (roof.t === "gable" && roof.axis === "x") {
    const E0 = Pz(x0 - ov, y0 + D + ov, zE), E1 = Pz(x0 + W + ov, y0 + D + ov, zE), R1 = Pz(x0 + W + ov, y0 + D / 2, H + rh), R0 = Pz(x0 - ov, y0 + D / 2, H + rh);
    slope(S, [E0, E1, R1, R0], E0, E1, [R0[0] - E0[0], R0[1] - E0[1]], style, c, 1, roof.c2);
    edge(E0, E1); S.add(`<path d="M${pts([E1])}L${pts([R1])}" stroke="${shade(c, 0.45)}" stroke-width="3.5" stroke-linecap="round"/><path d="M${pts([R0])}L${pts([R1])}" stroke="${shade(c, 1.25)}" stroke-width="3" stroke-linecap="round"/>`);
  } else if (roof.t === "gable") {
    const E0 = Pz(x0 + W + ov, y0 - ov, zE), E1 = Pz(x0 + W + ov, y0 + D + ov, zE), R1 = Pz(x0 + W / 2, y0 + D + ov, H + rh), R0 = Pz(x0 + W / 2, y0 - ov, H + rh);
    slope(S, [E0, E1, R1, R0], E0, E1, [R0[0] - E0[0], R0[1] - E0[1]], style, c, 0.8, roof.c2);
    edge(E0, E1); S.add(`<path d="M${pts([E0])}L${pts([R0])}" stroke="${shade(c, 0.45)}" stroke-width="3.5" stroke-linecap="round"/><path d="M${pts([R0])}L${pts([R1])}" stroke="${shade(c, 1.1)}" stroke-width="3" stroke-linecap="round"/>`);
  } else { // hip (pyramid when W==D)
    const m = Math.min(W, D) / 2, sl = rh / m, z0 = H - ov * sl;
    const rx0 = x0 + m, rx1 = x0 + W - m, ry = y0 + D / 2;
    const A0 = Pz(x0 - ov, y0 + D + ov, z0), A1 = Pz(x0 + W + ov, y0 + D + ov, z0), RA1 = Pz(rx1, ry, H + rh), RA0 = Pz(rx0, ry, H + rh);
    slope(S, [A0, A1, RA1, RA0], A0, A1, [RA0[0] - A0[0], RA0[1] - A0[1]], style, c, 1, roof.c2);
    edge(A0, A1);
    const B0 = Pz(x0 + W + ov, y0 - ov, z0), B1 = Pz(x0 + W + ov, y0 + D + ov, z0);
    slope(S, [B0, B1, RA1], B0, B1, [RA1[0] - B0[0], RA1[1] - B0[1]], style, c, 0.78, roof.c2);
    S.add(`<polygon points="${pts([B0, B1, [B1[0], B1[1] + 5], [B0[0], B0[1] + 5]])}" fill="${shade(c, 0.42)}" stroke="${OUT}" stroke-width="1.3"/><path d="M${pts([A1])}L${pts([RA1])}" stroke="${shade(c, 0.62)}" stroke-width="2.2" stroke-linecap="round"/>`);
    if (roof.finial) S.add(`<path d="M${pts([RA1])}l0 -14" stroke="${OUT}" stroke-width="2.4"/><circle cx="${f1(RA1[0])}" cy="${f1(RA1[1] - 15)}" r="3" fill="#e6b84a" stroke="${OUT}"/>`);
  }
}

// ---------- extra props ----------
export function cyl(S, x, y, r, h, c, topC, z = 0) {
  const [cx, cy0] = P(x, y, z), cy = cy0, rx = r * 1.414, ry = r * 0.707, top = cy - h;
  const body = S.grad([[0, shade(c, 1.25)], [0.5, c], [1, shade(c, 0.62)]], [0, 0, 1, 0]);
  S.add(`<path d="M${f1(cx - rx)} ${f1(top)}V${f1(cy)}A${f1(rx)} ${f1(ry)} 0 0 0 ${f1(cx + rx)} ${f1(cy)}V${f1(top)}Z" fill="${body}" stroke="${OUT}" stroke-width="1.3"/><ellipse cx="${f1(cx)}" cy="${f1(top)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="${topC ?? shade(c, 1.3)}" stroke="${OUT}" stroke-width="1.3"/>`);
}
export function flame(S, sx, sy, s = 1) {
  S.add(`<circle cx="${f1(sx)}" cy="${f1(sy - 4 * s)}" r="${f1(16 * s)}" fill="${S.radial([[0, "#ffb347", 0.55], [1, "#ff8a1f", 0]])}"/><path d="M${f1(sx)} ${f1(sy)}q${f1(-8 * s)} ${f1(-6 * s)} ${f1(-4 * s)} ${f1(-16 * s)}q${f1(2 * s)} ${f1(5 * s)} ${f1(5 * s)} ${f1(2 * s)}q${f1(1 * s)} ${f1(-9 * s)} ${f1(5 * s)} ${f1(-12 * s)}q${f1(4 * s)} ${f1(10 * s)} ${f1(-1 * s)} ${f1(26 * s)}z" fill="#ff8a1f" stroke="#7a2a08" stroke-width="1"/><path d="M${f1(sx)} ${f1(sy)}q${f1(-4 * s)} ${f1(-4 * s)} ${f1(-1 * s)} ${f1(-9 * s)}q${f1(3 * s)} ${f1(3 * s)} ${f1(3 * s)} ${f1(9 * s)}z" fill="#ffe27a"/>`);
}
export function brazier(S, x, y, h = 14) {
  const [cx, cy] = P(x, y, 0);
  S.add(`<path d="M${f1(cx - 4)} ${f1(cy)}L${f1(cx - 2)} ${f1(cy - h)}M${f1(cx + 4)} ${f1(cy)}L${f1(cx + 2)} ${f1(cy - h)}" stroke="#2a2a2e" stroke-width="2.4"/><path d="M${f1(cx - 9)} ${f1(cy - h)}h18l-3 7h-12z" fill="#3b3b42" stroke="${OUT}" stroke-width="1.3"/>`);
  flame(S, cx, cy - h, 0.9);
}
export function crystal(S, x, y, h = 24, c = "#a56bff", z = 0) {
  const [cx, cy] = P(x, y, z);
  S.add(`<circle cx="${f1(cx)}" cy="${f1(cy - h / 2)}" r="${f1(h * 0.9)}" fill="${S.radial([[0, c, 0.5], [1, c, 0]])}"/>` +
    [[-6, 0.65, 0.9], [6, 0.8, 0.75], [0, 1, 1.15]].map(([dx, k, l]) => `<path d="M${f1(cx + dx - 4)} ${f1(cy)}L${f1(cx + dx - 3)} ${f1(cy - h * k * 0.7)}L${f1(cx + dx)} ${f1(cy - h * k)}L${f1(cx + dx + 3)} ${f1(cy - h * k * 0.7)}L${f1(cx + dx + 4)} ${f1(cy)}Z" fill="${shade(c, l)}" stroke="${shade(c, 0.35)}" stroke-width="1.2"/><path d="M${f1(cx + dx)} ${f1(cy - h * k)}L${f1(cx + dx - 1)} ${f1(cy)}" stroke="#fff" stroke-width="1" opacity=".5"/>`).join(""));
}
export function cauldron(S, x, y, liquid = "#6fe08a") {
  const [cx, cy] = P(x, y, 0);
  flame(S, cx, cy - 1, 0.7);
  S.add(`<path d="M${f1(cx - 11)} ${f1(cy - 14)}Q${f1(cx - 14)} ${f1(cy + 2)} ${f1(cx)} ${f1(cy + 3)}Q${f1(cx + 14)} ${f1(cy + 2)} ${f1(cx + 11)} ${f1(cy - 14)}Z" fill="${S.grad([[0, "#4a4a52"], [1, "#1f1f25"]])}" stroke="${OUT}" stroke-width="1.3"/><ellipse cx="${f1(cx)}" cy="${f1(cy - 14)}" rx="11" ry="4.5" fill="#2a2a30" stroke="${OUT}" stroke-width="1.3"/><ellipse cx="${f1(cx)}" cy="${f1(cy - 14)}" rx="8.5" ry="3.2" fill="${liquid}"/><circle cx="${f1(cx - 3)}" cy="${f1(cy - 17)}" r="2" fill="#fff" opacity=".6"/><circle cx="${f1(cx + 3)}" cy="${f1(cy - 20)}" r="1.5" fill="#fff" opacity=".5"/>`);
}
export function anvil(S, x, y) {
  const [cx, cy] = P(x, y, 0);
  S.add(`<rect x="${f1(cx - 5)}" y="${f1(cy - 8)}" width="10" height="8" fill="#4a3a2c" stroke="${OUT}" stroke-width="1.2"/><path d="M${f1(cx - 13)} ${f1(cy - 14)}h24l4 -4v5l-5 3h-3v4h-12v-4h-3z" fill="${S.grad([[0, "#8a8f98"], [1, "#43474f"]])}" stroke="${OUT}" stroke-width="1.3"/>`);
}
export function fence(S, x0, y0, x1, y1, c = "#a9763f", n = 5) {
  const a = [x0, y0], b = [x1, y1];
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
    if (i) S.add(`<path d="M${pts([P(x - (b[0] - a[0]) / n, y - (b[1] - a[1]) / n, 9)])}L${pts([P(x, y, 9)])}M${pts([P(x - (b[0] - a[0]) / n, y - (b[1] - a[1]) / n, 5)])}L${pts([P(x, y, 5)])}" stroke="${OUT}" stroke-width="3.6"/><path d="M${pts([P(x - (b[0] - a[0]) / n, y - (b[1] - a[1]) / n, 9)])}L${pts([P(x, y, 9)])}M${pts([P(x - (b[0] - a[0]) / n, y - (b[1] - a[1]) / n, 5)])}L${pts([P(x, y, 5)])}" stroke="${c}" stroke-width="2"/>`);
    box(S, x - 1.5, y - 1.5, 0, 3, 3, 13, c, { sw: 1 });
  }
}
export function hay(S, x, y, c = "#e0bf55") { box(S, x, y, 0, 16, 10, 10, c, { planks: 3 }); }
export function cheeseStack(S, x, y) {
  cyl(S, x, y, 8, 6, "#e8be3c", "#f4d56a"); cyl(S, x, y, 8, 6, "#d9ac2a", "#f0cb55", 6); cyl(S, x, y, 7, 6, "#e8be3c", "#f6dc7a", 12);
}
export function produceCrate(S, x, y, cols = ["#c0392b", "#e67e22", "#27ae60"]) {
  box(S, x, y, 0, 14, 10, 7, "#a9763f", { planks: 2 });
  const [cx, cy] = P(x + 7, y + 5, 7);
  S.add(cols.map((c, i) => `<circle cx="${f1(cx + (i - 1) * 5.5)}" cy="${f1(cy - 1 - (i % 2) * 1.5)}" r="3.6" fill="${c}" stroke="${shade(c, 0.4)}" stroke-width="1"/>`).join(""));
}
export function hideRack(S, x, y, c = "#9b6a43") {
  const [cx, cy] = P(x, y, 0);
  S.add(`<path d="M${f1(cx - 18)} ${f1(cy)}V${f1(cy - 30)}M${f1(cx + 18)} ${f1(cy)}V${f1(cy - 30)}M${f1(cx - 20)} ${f1(cy - 30)}H${f1(cx + 20)}" stroke="#4a3220" stroke-width="3.2"/>` +
    [-10, 8].map((d, i) => `<path d="M${f1(cx + d - 7)} ${f1(cy - 29)}h14l2 7l-3 5l3 6l-4 6l2 6h-12l2 -6l-4 -6l3 -6z" fill="${shade(c, i ? 1.1 : 0.9)}" stroke="${OUT}" stroke-width="1.1"/>`).join(""));
}
export function vat(S, x, y, liquid = "#7a5a2a") { cyl(S, x, y, 11, 12, "#7a5230", liquid); }
export function barberPole(S, x, y) {
  const [cx, cy] = P(x, y, 0);
  S.add(`<rect x="${f1(cx - 3.5)}" y="${f1(cy - 30)}" width="7" height="30" rx="3.5" fill="#f3ead8" stroke="${OUT}" stroke-width="1.2"/><path d="M${f1(cx - 3.5)} ${f1(cy - 25)}l7 4M${f1(cx - 3.5)} ${f1(cy - 17)}l7 4M${f1(cx - 3.5)} ${f1(cy - 9)}l7 4" stroke="#c0392b" stroke-width="3"/><circle cx="${f1(cx)}" cy="${f1(cy - 32)}" r="3.6" fill="#d9ad4b" stroke="${OUT}" stroke-width="1.1"/>`);
}
export function clothesline(S, x0, y0, x1, y1) {
  const a = P(x0, y0, 0), b = P(x1, y1, 0), top = 30;
  const cols = ["#e8e0d0", "#c9545a", "#5a8fc9", "#e6c25a", "#f3ead8"];
  let s = `<path d="M${f1(a[0])} ${f1(a[1])}V${f1(a[1] - top)}M${f1(b[0])} ${f1(b[1])}V${f1(b[1] - top)}" stroke="#4a3220" stroke-width="3"/><path d="M${f1(a[0])} ${f1(a[1] - top + 2)}Q${f1((a[0] + b[0]) / 2)} ${f1((a[1] + b[1]) / 2 - top + 9)} ${f1(b[0])} ${f1(b[1] - top + 2)}" fill="none" stroke="#2a2a2a" stroke-width="1.2"/>`;
  for (let i = 1; i < 6; i++) { const t = i / 6, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t - top + 4 + Math.sin(t * Math.PI) * 6; s += `<path d="M${f1(x - 3.4)} ${f1(y)}h7v${f1(11 + (i % 3) * 3)}q-3.5 2 -7 0z" fill="${cols[i % 5]}" stroke="${OUT}" stroke-width="1"/>`; }
  S.add(s);
}
export function skep(S, x, y) {
  const [cx, cy] = P(x, y, 0);
  S.add(`<path d="M${f1(cx - 9)} ${f1(cy)}Q${f1(cx - 10)} ${f1(cy - 17)} ${f1(cx)} ${f1(cy - 19)}Q${f1(cx + 10)} ${f1(cy - 17)} ${f1(cx + 9)} ${f1(cy)}Z" fill="${S.grad([[0, "#f0cf6a"], [1, "#c9962e"]], [0, 0, 1, 0])}" stroke="${OUT}" stroke-width="1.2"/><path d="M${f1(cx - 9.5)} ${f1(cy - 5)}q9.5 3 19 0M${f1(cx - 9)} ${f1(cy - 10)}q9 3 18 0M${f1(cx - 6)} ${f1(cy - 15)}q6 2.5 12 0" fill="none" stroke="#8a5c14" stroke-width="1.2"/><ellipse cx="${f1(cx)}" cy="${f1(cy - 4)}" rx="2.6" ry="3.2" fill="#2a1c15"/>`);
}
export function globe(S, x, y) {
  const [cx, cy] = P(x, y, 0);
  S.add(`<path d="M${f1(cx)} ${f1(cy)}V${f1(cy - 8)}M${f1(cx - 6)} ${f1(cy)}h12" stroke="#4a3220" stroke-width="2.4"/><circle cx="${f1(cx)}" cy="${f1(cy - 15)}" r="9" fill="${S.grad([[0, "#7fc4e0"], [1, "#2f6f98"]], [0, 0, 1, 1])}" stroke="${OUT}" stroke-width="1.2"/><path d="M${f1(cx - 5)} ${f1(cy - 18)}q4 -3 7 0q-1 4 -4 3zM${f1(cx + 1)} ${f1(cy - 11)}q3 -1 5 2q-3 2 -5 -2z" fill="#6fae5a"/>`);
}
export function lumber(S, x, y) {
  box(S, x, y, 0, 26, 10, 5, "#c79a5c", { planks: 1 }); box(S, x + 1, y + 1, 5, 24, 8, 5, "#b98a4e"); box(S, x + 2, y + 1, 10, 22, 8, 4, "#d2a96a");
}
export function stoneBlock(S, x, y, dx = 14, dy = 12, dz = 10, c = "#aeb0b3") { box(S, x, y, 0, dx, dy, dz, c, { planks: 0 }); }
export function signpost(S, x, y, c1 = "#c0392b") {
  const [cx, cy] = P(x, y, 0);
  S.add(`<rect x="${f1(cx - 1.8)}" y="${f1(cy - 34)}" width="3.6" height="34" fill="#5a3a26" stroke="${OUT}" stroke-width="1"/><path d="M${f1(cx - 15)} ${f1(cy - 36)}h30v14h-30z" fill="${c1}" stroke="${OUT}" stroke-width="1.3"/><path d="M${f1(cx - 10)} ${f1(cy - 32)}h20M${f1(cx - 10)} ${f1(cy - 27)}h14" stroke="#f3ead8" stroke-width="2"/>`);
}
export function cart(S, x, y) {
  box(S, x, y, 6, 24, 12, 6, "#9a6a3a", { planks: 1 });
  for (const [dx, dy] of [[3, 14], [18, 14]]) { const [cx, cy] = P(x + dx, y + dy, 6); S.add(`<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="6" ry="6" fill="#6b4423" stroke="${OUT}" stroke-width="1.3"/><circle cx="${f1(cx)}" cy="${f1(cy)}" r="1.6" fill="#2a1c15"/>`); }
}
export function rug(S, x, y, dx, dy, c1, c2) {
  const q = [P(x, y, 0.5), P(x + dx, y, 0.5), P(x + dx, y + dy, 0.5), P(x, y + dy, 0.5)];
  const q2 = [P(x + 2, y + 2, 0.6), P(x + dx - 2, y + 2, 0.6), P(x + dx - 2, y + dy - 2, 0.6), P(x + 2, y + dy - 2, 0.6)];
  S.add(`<polygon points="${pts(q)}" fill="${c1}" stroke="${OUT}" stroke-width="1"/><polygon points="${pts(q2)}" fill="${c2}" stroke="${shade(c1, 0.5)}" stroke-width=".8"/>`);
}
export function battlements(S, v, ph = 8) {
  const { x0, y0, W, D, H } = v, z = H + ph;
  for (let u = 4; u < W - 4; u += 12) box(S, x0 + u, y0 + D - 5, z, 7, 5, 7, v.roof.c, { sw: 1 });
  for (let u = 4; u < D - 4; u += 12) box(S, x0 + W - 5, y0 + u, z, 5, 7, 7, shade(v.roof.c, 0.9), { sw: 1 });
}
