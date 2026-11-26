/**
 * Planned town on the 28x28 grid (tile (x,y) occupies x..x+1, y..y+1; buildings are 2x2 lots).
 *
 *   x:  0-3 outskirts | 4 ring road | 5 sidewalk | 6-11 block | 12 sidewalk | 13-14 AVENUE | 15 sidewalk | 16-21 block | 22 sidewalk | 23 ring road | 24-27 outskirts
 *   (same on y). The avenues cross at a plaza with a fountain; each of the four blocks is a 3x3 grid of 2x2 lots
 *   with a small park in the middle, so every building faces a sidewalk.
 */
import type { Point } from "./pathfinding";
import { GROUND_KINDS } from "./groundKinds";

export const GRID = 28;
export type TileKind = "grass" | "road" | "sidewalk" | "plaza" | "dirt" | "field";
export type LotRole = "plot" | "landmark" | "accent" | "park" | "outskirt" | "fountain";
export type PlotTier = "Corner" | "MainStreet" | "SideStreet" | "Alley";

export interface Lot {
  gx: number;
  gy: number;
  role: LotRole;
  /** sprite file name without extension */
  sprite: string;
  folder: "exterior" | "scenery";
  landmarkId?: "bank" | "townHall" | "intel" | "manager" | "spectator" | "uncleRavi";
}
export interface PlotSlot {
  gx: number;
  gy: number;
  tier: PlotTier;
  entrance: Point;
}
export interface Prop { sprite: string; gx: number; gy: number; scale: number; flip?: boolean }

const hash = (x: number, y: number, s = 0) => (((x * 73856093) ^ (y * 19349663) ^ ((s + 1) * 83492791)) >>> 0) % 1000 / 1000;

// ---------- street network ----------
const net: TileKind[][] = Array.from({ length: GRID }, () => Array<TileKind>(GRID).fill("grass"));
const set = (x: number, y: number, k: TileKind) => { if (x >= 0 && x < GRID && y >= 0 && y < GRID) net[y][x] = k; };
for (let i = 5; i <= 22; i++) for (const k of [5, 12, 15, 22]) { set(i, k, "sidewalk"); set(k, i, "sidewalk"); }
for (let i = 4; i <= 23; i++) { set(i, 4, "road"); set(i, 23, "road"); set(4, i, "road"); set(23, i, "road"); }
for (let i = 0; i < GRID; i++) { set(13, i, "road"); set(14, i, "road"); set(i, 13, "road"); set(i, 14, "road"); }
for (let x = 12; x <= 15; x++) for (let y = 12; y <= 15; y++) set(x, y, "plaza");

// ---------- lots ----------
const BLOCKS = [
  { id: "NW", bx: 6, by: 6 }, { id: "NE", bx: 16, by: 6 }, { id: "SW", bx: 6, by: 16 }, { id: "SE", bx: 16, by: 16 },
] as const;
type Cell = { role: LotRole; sprite?: string; folder?: Lot["folder"]; landmarkId?: Lot["landmarkId"]; corner?: boolean };
const P = (): Cell => ({ role: "plot" });
const A = (sprite: string): Cell => ({ role: "accent", sprite, folder: "exterior" });
const L = (landmarkId: NonNullable<Lot["landmarkId"]>, sprite: string): Cell => ({ role: "landmark", sprite, folder: "exterior", landmarkId });
const K = (sprite: string): Cell => ({ role: "park", sprite, folder: "scenery" });
const C = (): Cell => ({ role: "plot", corner: true });

// cells[j][i]: row j (y), column i (x) inside the block
const PLAN: Record<string, Cell[][]> = {
  NW: [[P(), P(), A("guardhouse")], [A("jewelers-shop"), K("park-garden"), L("bank", "bank-vault")], [P(), L("spectator", "theater-hall"), C()]],
  NE: [[P(), P(), P()], [L("townHall", "town-hall"), K("park-statue"), A("tavern-lounge")], [C(), P(), A("music-shop")]],
  SW: [[P(), P(), C()], [P(), K("park-pond"), L("intel", "map-shop")], [A("toy-shop"), P(), P()]],
  SE: [[C(), L("uncleRavi", "bazaar-merchant-shop"), P()], [L("manager", "town-clerk-office"), K("park-orchard"), P()], [P(), A("fortune-teller-tent"), P()]],
};

const CENTER = { x: 13.5, y: 13.5 };
export const lots: Lot[] = [];
const plotCandidates: { gx: number; gy: number; entrance: Point; corner: boolean; d: number }[] = [];

for (const b of BLOCKS) {
  PLAN[b.id].forEach((row, j) => row.forEach((cell, i) => {
    const gx = b.bx + i * 2, gy = b.by + j * 2;
    if (cell.role === "plot") {
      // entrance = walkable ring tile next to the lot; pick the side facing the plaza
      const cands: Point[] = [];
      if (i === 0) cands.push({ x: b.bx - 1, y: gy });
      if (i === 2) cands.push({ x: b.bx + 6, y: gy });
      if (j === 0) cands.push({ x: gx, y: b.by - 1 });
      if (j === 2) cands.push({ x: gx, y: b.by + 6 });
      cands.sort((p, q) => Math.hypot(p.x - CENTER.x, p.y - CENTER.y) - Math.hypot(q.x - CENTER.x, q.y - CENTER.y));
      plotCandidates.push({ gx, gy, entrance: cands[0], corner: !!cell.corner, d: Math.hypot(gx + 1 - CENTER.x, gy + 1 - CENTER.y) });
    } else {
      lots.push({ gx, gy, role: cell.role, sprite: cell.sprite!, folder: cell.folder!, landmarkId: cell.landmarkId });
    }
  }));
}

// player corner first (NW), then the other corners, then by distance to the plaza
const cornerOrder = ["10,10", "16,10", "10,16", "16,16"];
const corners = cornerOrder.map((k) => plotCandidates.find((c) => c.corner && `${c.gx},${c.gy}` === k)!);
const rest = plotCandidates.filter((c) => !c.corner).sort((a, b) => a.d - b.d);
export const plotSlots: PlotSlot[] = [
  ...corners.map((c) => ({ gx: c.gx, gy: c.gy, tier: "Corner" as const, entrance: c.entrance })),
  ...rest.map((c, i) => ({ gx: c.gx, gy: c.gy, tier: (i < 6 ? "MainStreet" : i < 12 ? "SideStreet" : "Alley") as PlotTier, entrance: c.entrance })),
];

// outskirts: farms, workshops and a grove outside the ring road
const OUTSKIRTS: [string, number, number][] = [
  ["sacred-grove", 1, 1], ["farmhouse-cottage", 6, 1], ["stable-horse-market", 19, 1], ["blacksmith-forge", 25, 1],
  ["apiary-beekeeper", 1, 7], ["mill-house", 25, 7], ["shrine-chapel", 1, 19], ["weavers-workshop", 25, 19],
  ["stonemason-workshop", 1, 25], ["potters-workshop", 6, 25], ["dairy-barn", 19, 25], ["tannery", 25, 25],
];
for (const [sprite, gx, gy] of OUTSKIRTS) lots.push({ gx, gy, role: "outskirt", sprite, folder: "exterior" });
lots.push({ gx: 13, gy: 13, role: "fountain", sprite: "fountain", folder: "scenery" });

// ---------- ground under lots, fields ----------
const KIND_TO_TILE = { stone: "plaza", cobble: "sidewalk", grass: "grass", dirt: "dirt" } as const;
export const tiles: TileKind[][] = net.map((r) => [...r]);
export const occupied: boolean[][] = Array.from({ length: GRID }, () => Array<boolean>(GRID).fill(false));
for (const lot of lots) {
  const tile: TileKind = lot.role === "fountain" ? "plaza" : lot.folder === "scenery" ? "grass" : KIND_TO_TILE[GROUND_KINDS[lot.sprite] ?? "stone"];
  for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
    if (lot.role !== "fountain") tiles[lot.gy + dy][lot.gx + dx] = tile;
    occupied[lot.gy + dy][lot.gx + dx] = true;
  }
}
for (const p of plotSlots) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) occupied[p.gy + dy][p.gx + dx] = true;
for (const [x0, y0, x1, y1] of [[8, 1, 11, 3], [8, 24, 11, 26], [16, 24, 18, 26], [16, 1, 18, 3]] as const)
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (!occupied[y][x] && net[y][x] === "grass") { tiles[y][x] = "field"; occupied[y][x] = true; }

// walkability: roads=1, sidewalks/plaza=2, everything else 0 (lots, fountain, grass)
export const walk: number[][] = net.map((r) => r.map((k) => (k === "road" ? 1 : k === "sidewalk" || k === "plaza" ? 2 : 0)));
for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) walk[13 + dy][13 + dx] = 0; // fountain

// ---------- props: street lamps + scattered trees ----------
export const props: Prop[] = [];
for (const [x, y] of [[12, 11], [15, 11], [12, 16], [15, 16], [11, 12], [11, 15], [16, 12], [16, 15], [5, 5], [22, 5], [5, 22], [22, 22],
  [12, 7], [15, 7], [12, 20], [15, 20], [7, 12], [20, 12], [7, 15], [20, 15], [5, 12], [22, 15], [12, 5], [15, 22]])
  if (net[y][x] === "sidewalk") props.push({ sprite: "street-lamp", gx: x, gy: y, scale: 0.8 });
const TREES = ["tree-oak", "tree-pine", "tree-birch", "tree-oak", "tree-pine"];
for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
  const outside = x < 4 || x > 23 || y < 4 || y > 23;
  if (!outside || occupied[y][x] || tiles[y][x] !== "grass" || net[y][x] !== "grass") continue;
  if (hash(x, y) < 0.3) props.push({ sprite: TREES[Math.floor(hash(x, y, 3) * TREES.length)], gx: x, gy: y, scale: 0.7 + hash(x, y, 5) * 0.2 });
}
// a few hedges/trees framing the ring road inside the blocks' corners
for (const [x, y] of [[5, 6], [22, 6], [5, 21], [22, 21]]) if (net[y][x] === "sidewalk") props.push({ sprite: "tree-birch", gx: x, gy: y, scale: 0.6 });

/** a prop standing at grid point (x, y) rather than in the middle of tile (x, y) */
const at = (sprite: string, x: number, y: number, scale: number, flip = false) => props.push({ sprite, gx: x - 0.5, gy: y - 0.5, scale, flip });
// the plaza: an ornamental lamp on each side of the fountain, a bench in each corner facing it
for (const [x, y] of [[13.12, 14.88], [14.88, 13.12]]) at("plaza-lamp", x, y, 0.85);
at("bench-back", 12.55, 12.55, 0.9);
at("bench-back", 15.45, 12.55, 0.9);
at("bench-back", 12.55, 15.45, 0.9, true);
at("bench-front", 15.45, 15.45, 0.9);
// park lamps, placed here so they switch on and off like the others
for (const lot of lots) {
  if (lot.sprite === "park-garden") at("street-lamp", lot.gx + 1, lot.gy + 1, 0.62);
  if (lot.sprite === "park-statue") for (const dx of [-0.7, 0.7]) at("street-lamp", lot.gx + 1 + dx, lot.gy + 1, 0.62);
}

export const TOWN = { tiles, walk, lots, plotSlots, props };
