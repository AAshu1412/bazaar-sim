/** Everything beyond the town wall: countryside to look at, and the misty district that is not open yet. */
import * as PIXI from "pixi.js";
import { GRID } from "./townLayout";

/** the part of the world the camera may show, in world pixels (the town spans x ±1344, y 0..1344) */
export const WORLD = { left: -2400, right: 2700, top: -820, bottom: 2160 };
/** the locked district east of town, in grid tiles */
export const DISTRICT = { x0: 32, y0: 7, x1: 45, y1: 20, landmark: { gx: 38, gy: 10 } };

const ANCHOR_Y = 200 / 256;
const hash = (x: number, y: number, s = 0) => (((x * 73856093) ^ (y * 19349663) ^ ((s + 1) * 83492791)) >>> 0) % 1000 / 1000;
const SCENERY = ["forest", "pines", "hill", "mountain", "rocks", "cloud", "tree-oak", "tree-pine", "tree-birch"];
const COTTAGES: [string, number, number][] = [["farmhouse-cottage", -15, 5], ["mill-house", 6, -13], ["dairy-barn", 21, 36], ["apiary-beekeeper", -4, 33], ["shrine-chapel", 35, -3], ["stable-horse-market", 37, 28]];
const DISTRICT_LOTS: [string, number, number][] = [
  ["merchants-house", 33, 8], ["tailors-shop", 35, 10], ["jewelers-shop", 40, 8], ["music-shop", 43, 10], ["toy-shop", 33, 17],
  ["barbershop", 36, 17], ["cheesemonger", 39, 17], ["bathhouse", 42, 17], ["glassblowers-workshop", 43, 8], ["greengrocer-shop", 33, 10],
];

export const surroundingAssets = () => [
  ...SCENERY.map((n) => `/assets/scenery/${n}.png`),
  ...[...COTTAGES, ...DISTRICT_LOTS].map(([n]) => `/assets/exterior/${n}.png`),
  "/assets/tiles/water0.png", "/assets/tiles/water1.png",
];

const within = (gx: number, gy: number, x0: number, y0: number, x1: number, y1: number) => gx >= x0 && gx <= x1 && gy >= y0 && gy <= y1;
const isRoad = (gx: number, gy: number) => gx === 13 || gx === 14 || gy === 13 || gy === 14;
function groundAt(gx: number, gy: number): "road" | "water" | "field" | "sidewalk" | "grass" {
  if (isRoad(gx, gy)) return "road";
  if (within(gx, gy, DISTRICT.x0, DISTRICT.y0, DISTRICT.x1, DISTRICT.y1)) return "sidewalk";
  const river = -9 + Math.round(Math.sin(gy / 5) * 1.6);
  if (gx === river || gx === river - 1 || ((gx - 7) / 5.5) ** 2 + ((gy - 36) / 3.5) ** 2 < 1) return "water";
  if (within(gx, gy, 3, -7, 9, -4) || within(gx, gy, 18, 31, 25, 34) || within(gx, gy, 31, 23, 35, 26) || within(gx, gy, -6, 18, -4, 25)) return "field";
  return "grass";
}

type Iso = (gx: number, gy: number) => { x: number; y: number };

/** A 96x48 patch holding both grass shades, so one tiling sprite continues the town's checkered lawn. */
function lawn(): PIXI.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 48;
  const ctx = canvas.getContext("2d")!;
  const image = (n: number) => PIXI.Assets.get<PIXI.Texture>(`/assets/tiles/grass${n}.png`).source.resource as CanvasImageSource;
  for (const [x, y] of [[-48, -24], [48, -24], [-48, 24], [48, 24]]) ctx.drawImage(image(2), x, y, 96, 48);
  ctx.drawImage(image(0), 0, 0, 96, 48);
  return PIXI.Texture.from(canvas);
}

/** Draws the countryside. Returns the mist sprites over the locked district so they can drift. */
export function buildSurroundings(ground: PIXI.Container, scenery: PIXI.Container, toIso: Iso, tileH: number) {
  const grass = new PIXI.TilingSprite({ texture: lawn(), width: WORLD.right - WORLD.left, height: WORLD.bottom - WORLD.top });
  grass.position.set(WORLD.left, WORLD.top);
  grass.tilePosition.set(-48 - WORLD.left, -WORLD.top);
  ground.addChild(grass);

  const place = (url: string, gx: number, gy: number, scale: number, dy: number) => {
    const iso = toIso(gx, gy), s = PIXI.Sprite.from(url);
    s.anchor.set(0.5, ANCHOR_Y);
    s.scale.set(scale);
    s.position.set(iso.x, iso.y + dy);
    s.zIndex = iso.y + dy;
    scenery.addChild(s);
    return s;
  };
  const taken = new Set<string>();
  const reserve = (gx: number, gy: number) => { for (let x = -1; x <= 2; x++) for (let y = -1; y <= 2; y++) taken.add(`${gx + x},${gy + y}`); };
  for (const [name, gx, gy] of COTTAGES) { reserve(gx, gy); place(`/assets/exterior/${name}.png`, gx, gy, 0.78, tileH); }

  const rails = new PIXI.Graphics();
  for (let gx = -45; gx <= 75; gx++) {
    for (let gy = -45; gy <= 75; gy++) {
      if (gx >= 0 && gx < GRID && gy >= 0 && gy < GRID) continue;
      const iso = toIso(gx, gy);
      if (iso.x < WORLD.left - 96 || iso.x > WORLD.right + 96 || iso.y < WORLD.top - 48 || iso.y > WORLD.bottom + 48) continue;
      const kind = groundAt(gx, gy);
      const bridge = kind === "road" && (gy === 13 || gy === 14) && gx >= -10 && gx <= -7;
      if (kind !== "grass") {
        const tile = new PIXI.Sprite(PIXI.Assets.get(`/assets/tiles/${kind}${Math.floor(hash(gx, gy) * (kind === "road" || kind === "sidewalk" ? 3 : 2))}.png`));
        tile.anchor.set(0.5, 0);
        tile.position.set(iso.x, iso.y);
        ground.addChild(tile);
        if (bridge) { // railings where the west road crosses the river
          const edge = gy === 13 ? 0 : 1, a = toIso(gx, gy + edge), b = toIso(gx + 1, gy + edge);
          rails.moveTo(a.x, a.y - 12).lineTo(b.x, b.y - 12).stroke({ width: 5, color: 0x6b3f26 });
          rails.moveTo(a.x, a.y).lineTo(a.x, a.y - 14).stroke({ width: 5, color: 0x4a2a19 });
        }
        continue;
      }
      // keep a clear verge along the town wall and the roads
      if (within(gx, gy, -2, -2, GRID + 1, GRID + 1) || isRoad(gx - 1, gy - 1) || isRoad(gx + 1, gy + 1) || taken.has(`${gx},${gy}`)) continue;
      if (within(gx, gy, DISTRICT.x0 - 2, DISTRICT.y0 - 2, DISTRICT.x1 + 2, DISTRICT.y1 + 2) || groundAt(gx + 1, gy + 1) !== "grass") continue;
      const r = hash(gx, gy, 2), pick = hash(gx, gy, 5), every2 = (gx & 1) === 0 && (gy & 1) === 0, every4 = gx % 4 === 0 && gy % 4 === 0;
      const far = gx + gy < -9 || gx + gy > 66; // top and bottom of the view
      if (far && every4 && r < 0.6) place(`/assets/scenery/${pick < 0.65 ? "mountain" : "hill"}.png`, gx, gy, 0.95 + pick * 0.35, tileH);
      else if (every4 && r > 0.87) place("/assets/scenery/hill.png", gx, gy, 0.7 + pick * 0.3, tileH);
      else if (every2 && hash(gx >> 3, gy >> 3, 7) > 0.45 && r < 0.78) place(`/assets/scenery/${pick < 0.5 ? "forest" : "pines"}.png`, gx, gy, 0.72 + r * 0.2, tileH);
      else if (r < 0.045) place(`/assets/scenery/${["tree-oak", "tree-pine", "tree-birch"][Math.floor(pick * 3)]}.png`, gx, gy, 0.65 + pick * 0.3, tileH / 2);
      else if (r > 0.992) place("/assets/scenery/rocks.png", gx, gy, 0.5 + pick * 0.3, tileH / 2);
    }
  }
  ground.addChild(rails);

  for (const [name, gx, gy] of DISTRICT_LOTS) place(`/assets/exterior/${name}.png`, gx, gy, 0.78, tileH).tint = 0x93a0bc;

  // mist over the district: drawn above everything in the countryside
  const mist: PIXI.Sprite[] = [];
  for (let gx = DISTRICT.x0 - 1; gx <= DISTRICT.x1 + 1; gx += 3) {
    for (let gy = DISTRICT.y0 - 1; gy <= DISTRICT.y1 + 1; gy += 3) {
      if (Math.hypot(gx - DISTRICT.landmark.gx - 1, gy - DISTRICT.landmark.gy - 1) < 3.5) continue; // leave its signed building visible
      const s = place("/assets/scenery/cloud.png", gx, gy, 0.8 + hash(gx, gy) * 0.45, 20 + hash(gy, gx) * 30);
      s.alpha = 0.5 + hash(gx, gy, 3) * 0.25;
      s.zIndex = 1e6;
      mist.push(s);
    }
  }
  scenery.sortableChildren = true;
  scenery.sortChildren();
  return mist;
}
