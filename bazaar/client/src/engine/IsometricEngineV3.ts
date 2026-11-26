import * as PIXI from "pixi.js";
import { Viewport } from "pixi-viewport";
import { BUILDING_SPRITES } from "./buildingRegistry";
import { TOWN, GRID as TOWN_GRID, type Lot, type TileKind } from "./townLayout";
import { GridPathfinder, Point } from "./pathfinding";
import { sfx } from "../audio/sfx";
import { demandModifiers } from "./cityEvents";
import { OPEN_HOUR, pickTrade, chooseShop, outcomeFor, nextRivalPrice, type Seller, type Trade } from "./economy";
import type { ShopperRow } from "../store/statsStore";
import { useGameStore } from "../store/gameStore";
import { PLACES, shopKind, uiIcon, price, type PlaceId } from "./shopKinds";
import { ROOF_TOPS } from "./roofTops";
import { WORLD, DISTRICT, buildSurroundings, surroundingAssets } from "./surroundings";
import { Night, lampAssets } from "./lamps";
import { createSign, drawShopSign, drawPlaceSign, drawLeaseSign, label, SIGN_FONT, type Sign } from "./signs";

export type PlotOwnerType = "player" | "rivalHuman" | "bot" | "unclaimed";

export interface PlotInfo {
  id: number;
  streetName: string;
  tier: "Corner" | "MainStreet" | "SideStreet" | "Alley";
  gx: number;
  gy: number;
  entrance: Point;
  owner: string | null;
  ownerType: PlotOwnerType;
  businessType: string;
  isUpgraded: boolean;
  priceCents: number;
  inventory: number;
  maxInventory: number;
  isMarginCalled: boolean;
  customersServed: number;
  revenueTodayCents: number;
  sprite: PIXI.Sprite;
  container: PIXI.Container;
  sign?: Sign;
  haloGraphic?: PIXI.Graphics;
  /** stock the shop opens each day with, and its sales count at that moment */
  openingStock: number;
  servedAtOpen: number;
}

export interface LandmarkInfo {
  id: string;
  label: string;
  modal: string;
  gx: number;
  gy: number;
  sprite: PIXI.Sprite;
}

/** something on the map that can be hovered and clicked */
interface Target {
  key: string;
  container: PIXI.Container;
  sprite: PIXI.Sprite;
  ring: PIXI.Graphics;
  sign: Sign;
  /** the sign always shows its full board (your shop) / only appears on hover (empty lots) */
  pinned?: boolean;
  onHoverOnly?: boolean;
  onClick: () => void;
}

export interface CustomerNPC {
  id: string;
  gx: number;
  gy: number;
  path: Point[];
  pathIdx: number;
  container: PIXI.Container;
  targetPlot: PlotInfo;
  speed: number;
  stepT: number;
  state: "WALKING_TO_SHOP" | "PURCHASING" | "WALKING_TO_EXIT";
  pauseTimer: number;
  exitGate: Point;
}

/** buildings are drawn 302x256 around a footprint centred at (151,200); 0.85 makes their footprint fill a 2x2 lot */
const SPRITE_SCALE = 0.78;
const SPRITE_ANCHOR_Y = 200 / 256;
const hash = (x: number, y: number, s = 0) => (((x * 73856093) ^ (y * 19349663) ^ ((s + 1) * 83492791)) >>> 0) % 1000 / 1000;

export class IsometricEngineV3 {
  public app: PIXI.Application | null = null;
  public viewport: Viewport | null = null;

  public groundLayer: PIXI.Container = new PIXI.Container();
  public entitiesLayer: PIXI.Container = new PIXI.Container();
  public signLayer: PIXI.Container = new PIXI.Container();
  public uiLayer: PIXI.Container = new PIXI.Container();

  public readonly GRID_SIZE = 28;
  public readonly TILE_W = 96;
  public readonly TILE_H = 48;

  public pathfinder: GridPathfinder;
  public plots: PlotInfo[] = [];
  public landmarks: LandmarkInfo[] = [];
  public npcs: CustomerNPC[] = [];
  /** buildings are clicked through the viewport (Pixi hit-testing only caught a sliver of each sprite) */
  private targets: Target[] = [];
  private hovered: Target | null = null;
  private selected: string | null = null;
  /** lot silhouette in lot-local coordinates: the 2x2 footprint plus the building above it */
  private static readonly HIT = new PIXI.Polygon([-82, 50, -80, -4, 0, -60, 80, -4, 82, 50, 0, 95]);
  public floatingTexts: { container: PIXI.Container; yVelocity: number; alphaVelocity: number }[] = [];

  // Callbacks for React HUD
  public onPlotClick?: (plot: PlotInfo) => void;
  public onLandmarkClick?: (modal: string) => void;
  public onCustomerServed?: (plotId: number, priceCents: number) => void;
  public onEmptyClick?: () => void;
  /** a shopper arrived: how it went for every shop selling what they wanted */
  public onShopper?: (hour: number, rows: ShopperRow[]) => void;
  public onTurnedAway?: (plotId: number) => void;
  public hour = OPEN_HOUR;

  private night: Night | null = null;
  private mist: PIXI.Sprite[] = [];
  private mistTimer = 0;
  private lastGrumble = 0;
  private haloPulseTimer: number = 0;
  private destroyed = false;

  // Cardinal Gates on Walkable Roads
  public readonly GATES: Point[] = [
    { x: 13, y: 1 },  // North Gate Road
    { x: 26, y: 13 }, // East Gate Road
    { x: 13, y: 26 }, // South Gate Road
    { x: 1, y: 13 },  // West Gate Road
  ];

  constructor() {
    this.pathfinder = new GridPathfinder(this.GRID_SIZE, this.GRID_SIZE);
  }

  public async init(containerEl: HTMLDivElement) {
    const width = containerEl.clientWidth || window.innerWidth;
    const height = containerEl.clientHeight || window.innerHeight;

    const app = new PIXI.Application();
    await app.init({
      width,
      height,
      backgroundColor: 0x14231d,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    if (this.destroyed) { app.destroy(true, { children: true }); return; } // unmounted while Pixi was starting
    this.app = app;
    containerEl.appendChild(app.canvas);

    // Initialize Pixi Viewport
    const viewport = new Viewport({
      screenWidth: width,
      screenHeight: height,
      worldWidth: 3200,
      worldHeight: 2400,
      events: app.renderer.events,
    });

    this.viewport = viewport;
    app.stage.addChild(viewport);

    viewport
      .drag({ mouseButtons: "left" })
      .pinch()
      .wheel({ trackpadPinch: true, smooth: 8 })
      .decelerate({ friction: 0.88 })
;
    this.limitCamera();

    viewport.on("clicked", (e: { world: { x: number; y: number } }) => {
      const t = this.pickAt(e.world.x, e.world.y);
      if (t) {
        sfx.playPriceClick();
        t.onClick();
      } else this.onEmptyClick?.();
    });
    viewport.on("pointermove", (e: PIXI.FederatedPointerEvent) => {
      const w = viewport.toWorld(e.global.x, e.global.y);
      this.hovered = this.pickAt(w.x, w.y);
      app.canvas.style.cursor = this.hovered ? "pointer" : "";
    });

    viewport.addChild(this.groundLayer);
    viewport.addChild(this.entitiesLayer);
    viewport.addChild(this.signLayer);
    viewport.addChild(this.uiLayer);
    this.signLayer.sortableChildren = true;

    this.entitiesLayer.sortableChildren = true;

    await Promise.all([this.preloadTextures(), document.fonts.load(`600 14px ${SIGN_FONT}`).catch(() => [])]);
    if (this.destroyed) { app.destroy(true, { children: true }); this.app = null; return; }

    // countryside first, so the town is drawn over it
    const countryside = new PIXI.Container();
    this.mist = buildSurroundings(this.groundLayer, countryside, (x, y) => this.toIso(x, y), this.TILE_H);
    viewport.addChildAt(countryside, viewport.getChildIndex(this.entitiesLayer));
    this.night = new Night();
    viewport.addChildAt(this.night.layer, viewport.getChildIndex(this.signLayer));

    // Build 28x28 terrain grid
    this.buildTerrain();

    // Place landmarks, plots & perimeter
    this.placeLandmarks();
    this.place20Plots();
    this.placeScenery();
    this.placeDistrict();

    // Center viewport on player's corner shop
    this.focusPlayerPlot();

    // Start render ticker
    app.ticker.add((ticker) => {
      this.update(ticker.deltaTime);
    });

    window.addEventListener("resize", this.handleResize);
    window.addEventListener("keydown", this.handleKeyDown);
  }

  private handleResize = () => {
    if (!this.app || !this.viewport) return;
    const parent = this.app.canvas.parentElement;
    if (parent) {
      this.app.renderer.resize(parent.clientWidth, parent.clientHeight);
      this.viewport.resize(parent.clientWidth, parent.clientHeight);
      this.limitCamera();
    }
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.viewport) return;
    const target = e.target as HTMLElement;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;

    const panSpeed = 35;
    if (e.key === "w" || e.key === "ArrowUp") this.viewport.top -= panSpeed;
    if (e.key === "s" || e.key === "ArrowDown") this.viewport.top += panSpeed;
    if (e.key === "a" || e.key === "ArrowLeft") this.viewport.left -= panSpeed;
    if (e.key === "d" || e.key === "ArrowRight") this.viewport.left += panSpeed;
  };

  /** the camera stays inside the countryside, however far you zoom or drag */
  private limitCamera() {
    const v = this.viewport;
    if (!v) return;
    const minScale = Math.max(0.35, v.screenWidth / (WORLD.right - WORLD.left), v.screenHeight / (WORLD.bottom - WORLD.top));
    v.clampZoom({ minScale, maxScale: 2.4 });
    v.clamp({ left: WORLD.left, right: WORLD.right, top: WORLD.top, bottom: WORLD.bottom, underflow: "center" });
  }

  public toIso(gx: number, gy: number): Point {
    return {
      x: (gx - gy) * (this.TILE_W / 2),
      y: (gx + gy) * (this.TILE_H / 2),
    };
  }

  private async preloadTextures() {
    const allUrls = new Set<string>();

    for (const n of ["coffee", "food", "tech", "flower", "book", "gavel", "bank", "eye", "mask", "clerk", "help", "chart"]) allUrls.add(uiIcon(n));
    for (let i = 0; i < 6; i++) allUrls.add(`/assets/people/person${i}.png`);
    for (const url of [...surroundingAssets(), ...lampAssets]) allUrls.add(url);
    allUrls.add(uiIcon("pin"));

    Object.values(BUILDING_SPRITES.businesses).forEach((bz) => {
      allUrls.add(bz.base);
      allUrls.add(bz.upgraded);
    });
    allUrls.add("/assets/exterior/city-gate.png");
    allUrls.add("/assets/exterior/city-gate-ew.png");
    TOWN.lots.forEach((l) => allUrls.add(`/assets/${l.folder}/${l.sprite}.png`));
    TOWN.props.forEach((pr) => allUrls.add(`/assets/scenery/${pr.sprite}.png`));
    const tileSets: Record<string, number> = { grass: 4, road: 3, sidewalk: 3, plaza: 2, dirt: 2, field: 2 };
    for (const [k, n] of Object.entries(tileSets)) for (let v = 0; v < n; v++) allUrls.add(`/assets/tiles/${k}${v}.png`);

    await Promise.all(
      [...allUrls].map(async (url) => {
        try {
          const tex = await PIXI.Assets.load(url);
          if (tex && tex.source) tex.source.scaleMode = "linear";
        } catch (err) {
          console.warn("Preload warning:", url, err);
        }
      })
    );
  }

  private pickAt(wx: number, wy: number): Target | null {
    // signs are drawn above everything, so they win
    for (const t of this.targets) {
      const r = t.sign.root;
      if (!r.visible) continue;
      const w = ((t.sign.compact.visible ? 36 : t.sign.width + 10) / 2) * r.scale.x, h = 20 * r.scale.y;
      if (Math.abs(wx - r.x) <= w && Math.abs(wy - r.y) <= h) return t;
    }
    let best: Target | null = null;
    for (const t of this.targets) {
      const c = t.container;
      if (IsometricEngineV3.HIT.contains(wx - c.x, wy - c.y) && (!best || c.zIndex > best.container.zIndex)) best = t;
    }
    return best;
  }

  private diamond(g: PIXI.Graphics, color: number, fill: number, width: number) {
    g.clear().poly([0, 4, 90, 49, 0, 94, -90, 49]).fill({ color, alpha: fill }).stroke({ width, color, alpha: 0.95, join: "round" });
  }

  /** register a clickable lot: ground ring, name sign, hover and selection state */
  private addTarget(key: string, container: PIXI.Container, sprite: PIXI.Sprite, sign: Sign, onClick: () => void, signY = 2 * this.TILE_H - 12): Target {
    const ring = new PIXI.Graphics();
    ring.visible = false;
    container.addChildAt(ring, 0);
    sign.root.position.set(container.x, container.y + signY);
    sign.root.zIndex = container.y;
    this.signLayer.addChild(sign.root);
    const t: Target = { key, container, sprite, ring, sign, onClick };
    this.targets.push(t);
    return t;
  }

  /** signs keep a readable size at any zoom, collapse to badges far out, and react to hover and selection */
  private syncTargets() {
    const zoom = this.viewport?.scale.x ?? 1;
    const k = Math.max(0.72, Math.min(1.75, 0.95 / zoom));
    for (const t of this.targets) {
      const hot = t === this.hovered, sel = t.key === this.selected;
      const compact = zoom < 0.68 && !hot && !sel && !t.pinned;
      t.sign.root.visible = !t.onHoverOnly || hot || sel;
      t.sign.full.visible = !compact;
      t.sign.compact.visible = compact;
      t.sign.tip.visible = hot;
      t.sign.root.scale.set(k * (hot ? 1.12 : 1));
      t.sign.root.zIndex = hot || sel ? 1e6 : t.pinned ? 5e5 : t.container.y; // nearer lots on top
      t.sprite.y = this.TILE_H - (hot || sel ? 4 : 0);
      if (sel !== (t.ring.label === "sel") || hot !== t.ring.visible) {
        t.ring.label = sel ? "sel" : "";
        this.diamond(t.ring, sel ? 0xffc23f : 0xfff1c8, sel ? 0.28 : 0.18, sel ? 5 : 3);
      }
      t.ring.visible = hot || sel;
    }
  }

  /** highlight a plot (by id) or a place; null clears it */
  public select(key: number | PlaceId | null) {
    this.selected = key === null ? null : typeof key === "number" ? `plot-${key}` : key;
  }

  private tileVariant(kind: TileKind, x: number, y: number): number {
    const h = hash(x, y, 1);
    if (kind === "grass") return ((x + y) % 2) * 2 + (h < 0.5 ? 0 : 1);
    if (kind === "road") return Math.floor(h * 3);
    if (kind === "sidewalk") return Math.floor(h * 3);
    if (kind === "plaza") return x >= 13 && x <= 14 && y >= 12 && y <= 15 ? 1 : 0;
    return Math.floor(h * 2);
  }

  /** point on the continuous grid (tile (x,y) spans x..x+1, y..y+1) */
  private gp(gx: number, gy: number): [number, number] {
    const i = this.toIso(gx, gy);
    return [i.x, i.y];
  }

  /**
   * Planned town ground: tile sprites (grass, cobbled road, sidewalk, plaza, fields) with curbs,
   * lane markings and crosswalks drawn on top.
   */
  private buildTerrain() {
    const tiles = TOWN.tiles;
    for (let y = 0; y < TOWN_GRID; y++) {
      for (let x = 0; x < TOWN_GRID; x++) {
        const kind = tiles[y][x];
        const tex = PIXI.Assets.get(`/assets/tiles/${kind}${this.tileVariant(kind, x, y)}.png`);
        const sp = new PIXI.Sprite(tex);
        const iso = this.toIso(x, y);
        sp.anchor.set(0.5, 0);
        sp.position.set(iso.x, iso.y);
        this.groundLayer.addChild(sp);
        this.pathfinder.setTile(x, y, TOWN.walk[y][x]);
      }
    }

    const g = new PIXI.Graphics();
    const line = (a: [number, number], b: [number, number], width: number, color: number, alpha: number) => {
      g.moveTo(a[0], a[1]);
      g.lineTo(b[0], b[1]);
      g.stroke({ width, color, alpha });
    };
    const quad = (x0: number, y0: number, x1: number, y1: number, color: number, alpha: number) => {
      const pts = [this.gp(x0, y0), this.gp(x1, y0), this.gp(x1, y1), this.gp(x0, y1)];
      g.poly(pts.flat());
      g.fill({ color, alpha });
    };
    const isRoadish = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= TOWN_GRID || y >= TOWN_GRID) return true;
      const k = tiles[y][x];
      return k === "road" || k === "plaza";
    };

    // curbs where the road meets sidewalk / grass
    for (let y = 0; y < TOWN_GRID; y++) {
      for (let x = 0; x < TOWN_GRID; x++) {
        if (tiles[y][x] !== "road") continue;
        const edges: [number, number, [number, number], [number, number]][] = [
          [1, 0, this.gp(x + 1, y), this.gp(x + 1, y + 1)],
          [-1, 0, this.gp(x, y), this.gp(x, y + 1)],
          [0, 1, this.gp(x, y + 1), this.gp(x + 1, y + 1)],
          [0, -1, this.gp(x, y), this.gp(x + 1, y)],
        ];
        for (const [dx, dy, a, b] of edges) {
          if (isRoadish(x + dx, y + dy)) continue;
          line(a, b, 3.2, 0xd2cab8, 0.95);
          line([a[0], a[1] + 1.8], [b[0], b[1] + 1.8], 1.2, 0x1f1812, 0.45);
        }
      }
    }

    // dashed centre line between the two avenue lanes (skip the plaza)
    for (let t = 0; t < TOWN_GRID; t++) {
      if (t >= 11 && t <= 16) continue;
      line(this.gp(14, t + 0.25), this.gp(14, t + 0.7), 2.2, 0xf0dc8c, 0.8);
      line(this.gp(t + 0.25, 14), this.gp(t + 0.7, 14), 2.2, 0xf0dc8c, 0.8);
    }
    // ring road centre dashes
    for (let t = 5; t < 23; t++) {
      if (t === 13) { t++; continue; }
      line(this.gp(4.5, t + 0.3), this.gp(4.5, t + 0.7), 1.6, 0xd8cfa8, 0.55);
      line(this.gp(23.5, t + 0.3), this.gp(23.5, t + 0.7), 1.6, 0xd8cfa8, 0.55);
      line(this.gp(t + 0.3, 4.5), this.gp(t + 0.7, 4.5), 1.6, 0xd8cfa8, 0.55);
      line(this.gp(t + 0.3, 23.5), this.gp(t + 0.7, 23.5), 1.6, 0xd8cfa8, 0.55);
    }
    // zebra crossings on the four avenue approaches
    for (let k = 0; k < 7; k++) {
      const o = 13.1 + k * 0.3;
      quad(o, 11.2, o + 0.14, 11.8, 0xf3efe4, 0.85);
      quad(o, 16.2, o + 0.14, 16.8, 0xf3efe4, 0.85);
      quad(11.2, o, 11.8, o + 0.14, 0xf3efe4, 0.85);
      quad(16.2, o, 16.8, o + 0.14, 0xf3efe4, 0.85);
    }
    this.groundLayer.addChild(g);
  }

  /**
   * Place Clickable Town Landmarks
   */
  private placeLandmarks() {
    const ids: Record<string, PlaceId> = { bank: "bank", townHall: "auction", intel: "intel", manager: "manager", spectator: "spectator", uncleRavi: "uncleRavi" };
    TOWN.lots
      .filter((l) => l.role === "landmark")
      .forEach((lot) => {
        const place = PLACES.find((p) => p.id === ids[lot.landmarkId!])!;
        const { container, sprite } = this.addLotSprite(lot);
        const sign = createSign();
        drawPlaceSign(sign, place);
        const target = this.addTarget(place.id, container, sprite, sign, () => this.onLandmarkClick?.(place.id), -44);
        target.onHoverOnly = place.soon; // unbuilt places stay out of the shop signs' way
        this.landmarks.push({ id: place.id, label: place.name, modal: place.id, gx: lot.gx, gy: lot.gy, sprite });
      });

    // four gates on the avenue ends; arches face along the avenue
    const gates: [string, number, number][] = [
      ["city-gate", 13, 0],
      ["city-gate-ew", 26, 13],
      ["city-gate", 13, 26],
      ["city-gate-ew", 0, 13],
    ];
    gates.forEach(([sprite, gx, gy]) => this.addLotSprite({ gx, gy, role: "outskirt", sprite, folder: "exterior" }));
  }

  /**
   * Place 20 Playable Plots along Sidewalks
   */
  private place20Plots() {
    this.plots = [];

    // owner / economy data in slot order: 4 corners, 6 main street, 6 side street, 4 alley (positions come from townLayout)
    const owners: { ownerType: PlotOwnerType; ownerName: string | null; priceCents: number; inventory: number; type?: string }[] = [
      { ownerType: "player", ownerName: "You (Corner Roast)", priceCents: 300, inventory: 50 },
      { ownerType: "rivalHuman", ownerName: "Player 2 (Gourmet)", priceCents: 310, inventory: 45 },
      { ownerType: "bot", ownerName: "Undercutter Bot", priceCents: 290, inventory: 50 },
      { ownerType: "bot", ownerName: "Margin Hawk Bot", priceCents: 320, inventory: 50 },
      { ownerType: "bot", ownerName: "Value Balanced Bot", priceCents: 280, inventory: 40 },
      { ownerType: "bot", ownerName: "Bean There", priceCents: 290, inventory: 45, type: "CoffeeCart" },
      { ownerType: "bot", ownerName: "Scribe Guild AI", priceCents: 350, inventory: 35 },
      { ownerType: "bot", ownerName: "Daily Grind", priceCents: 315, inventory: 40, type: "CoffeeCart" },
      { ownerType: "bot", ownerName: "Apex Merchant", priceCents: 295, inventory: 60 },
      { ownerType: "unclaimed", ownerName: null, priceCents: 300, inventory: 0 },
      { ownerType: "bot", ownerName: "Mocha Corner", priceCents: 285, inventory: 35, type: "CoffeeCart" },
      { ownerType: "bot", ownerName: "Clockwork Trader", priceCents: 420, inventory: 25 },
      { ownerType: "unclaimed", ownerName: null, priceCents: 300, inventory: 0 },
      { ownerType: "unclaimed", ownerName: null, priceCents: 300, inventory: 0 },
      { ownerType: "bot", ownerName: "Apothecary Bot", priceCents: 275, inventory: 30 },
      { ownerType: "unclaimed", ownerName: null, priceCents: 300, inventory: 0 },
      { ownerType: "unclaimed", ownerName: null, priceCents: 250, inventory: 0 },
      { ownerType: "unclaimed", ownerName: null, priceCents: 250, inventory: 0 },
      { ownerType: "unclaimed", ownerName: null, priceCents: 240, inventory: 0 },
      { ownerType: "unclaimed", ownerName: null, priceCents: 240, inventory: 0 },
    ];
    const streets: Record<string, string> = { Corner: "MagicBlock Blvd", MainStreet: "Main Street", SideStreet: "Side Street", Alley: "Alley" };

    const types = ["CoffeeCart", "StreetFood", "Electronics", "FlowerStall", "Bookshop"];

    TOWN.plotSlots.forEach((slot, id) => {
      const o = owners[id];
      const bType = o.type ?? types[id % types.length];
      const isUpgraded = id !== 0 && id % 4 === 0; // a few rivals have a stronger brand; yours comes from signage
      const bConfig = BUILDING_SPRITES.businesses[bType as keyof typeof BUILDING_SPRITES.businesses] || BUILDING_SPRITES.businesses.CoffeeCart;
      const spritePath = o.ownerType === "unclaimed" ? BUILDING_SPRITES.businesses.Vacant.base : (isUpgraded && id !== 0 ? bConfig.upgraded : bConfig.base);

      const plotInfo: PlotInfo = {
        id,
        streetName: streets[slot.tier],
        tier: slot.tier,
        gx: slot.gx,
        gy: slot.gy,
        entrance: slot.entrance,
        owner: o.ownerName,
        ownerType: o.ownerType,
        businessType: bType,
        isUpgraded,
        priceCents: o.priceCents,
        inventory: o.inventory,
        maxInventory: 100,
        openingStock: o.inventory,
        servedAtOpen: 0,
        isMarginCalled: false,
        customersServed: 0,
        revenueTodayCents: 0,
        sprite: new PIXI.Sprite(),
        container: new PIXI.Container(),
      };

      const container = this.addPlotContainer(plotInfo, spritePath);
      plotInfo.container = container;
      this.plots.push(plotInfo);
    });
  }

  private addPlotContainer(plot: PlotInfo, spritePath: string): PIXI.Container {
    const container = new PIXI.Container();
    const iso = this.toIso(plot.gx, plot.gy);
    container.x = iso.x;
    container.y = iso.y;

    const halo = new PIXI.Graphics(); // permanent ground marker under the player's own shop
    plot.haloGraphic = halo;
    this.refreshPlotHalo(plot);
    container.addChild(halo);

    const sprite = PIXI.Sprite.from(spritePath);
    sprite.anchor.set(0.5, SPRITE_ANCHOR_Y);
    sprite.scale.set(SPRITE_SCALE);
    sprite.y = this.TILE_H; // lot centre
    plot.sprite = sprite;
    container.addChild(sprite);

    container.zIndex = iso.y + this.TILE_H;
    this.entitiesLayer.addChild(container);

    plot.sign = createSign();
    this.buildSign(plot);
    const t = this.addTarget(`plot-${plot.id}`, container, sprite, plot.sign, () => this.onPlotClick?.(plot), plot.ownerType === "unclaimed" ? undefined : this.roofY(spritePath));
    t.pinned = plot.ownerType === "player";
    t.onHoverOnly = plot.ownerType === "unclaimed";

    return container;
  }

  private refreshPlotHalo(plot: PlotInfo) {
    if (!plot.haloGraphic) return;
    plot.haloGraphic.clear();
    if (plot.ownerType === "player") this.diamond(plot.haloGraphic, 0x3fd68a, 0.22, 4);
  }

  /** where a shop's sign hangs: just above its own roof */
  private roofY(spritePath: string) {
    const name = spritePath.split("/").pop()!.replace(".png", "");
    return this.TILE_H + ((ROOF_TOPS[name] ?? 110) - SPRITE_ANCHOR_Y * 256) * SPRITE_SCALE - 14;
  }

  private buildSign(plot: PlotInfo) {
    if (!plot.sign) return;
    if (plot.ownerType === "unclaimed") drawLeaseSign(plot.sign);
    else drawShopSign(plot.sign, { name: shopKind(plot.businessType).name, icon: shopKind(plot.businessType).icon, price: price(plot.priceCents), stock: plot.inventory / plot.maxInventory, mine: plot.ownerType === "player" });
  }

  /** outskirts, accents, parks, fountain, street lamps and trees */
  private placeScenery() {
    TOWN.lots
      .filter((l) => l.role !== "landmark" && l.role !== "plot")
      .forEach((l) => this.addLotSprite(l));

    TOWN.props.forEach((pr) => {
      const container = new PIXI.Container();
      const iso = this.toIso(pr.gx, pr.gy);
      container.x = iso.x;
      container.y = iso.y;
      let sprite: PIXI.Sprite;
      try {
        sprite = PIXI.Sprite.from(`/assets/scenery/${pr.sprite}.png`);
      } catch (_) {
        sprite = new PIXI.Sprite();
      }
      sprite.anchor.set(0.5, SPRITE_ANCHOR_Y);
      sprite.scale.set(pr.scale);
      sprite.y = this.TILE_H / 2; // 1x1 tile centre
      container.addChild(sprite);
      container.zIndex = iso.y + this.TILE_H / 2;
      this.entitiesLayer.addChild(container);
      if (pr.sprite === "street-lamp") this.night?.addLamp(sprite, iso.x, iso.y + this.TILE_H / 2);
    });
  }

  /** the neighbourhood that is not open yet: one signed building peeking out of the mist */
  private placeDistrict() {
    const place = PLACES.find((p) => p.id === "district")!, { gx, gy } = DISTRICT.landmark;
    const { container, sprite } = this.addLotSprite({ gx, gy, role: "outskirt", sprite: "town-clerk-office", folder: "exterior" });
    sprite.tint = 0xaab6d0;
    const sign = createSign();
    drawPlaceSign(sign, place);
    this.addTarget(place.id, container, sprite, sign, () => this.onLandmarkClick?.(place.id), -52);
    this.landmarks.push({ id: place.id, label: place.name, modal: place.id, gx, gy, sprite });
  }

  /** 2x2 sprite centred on its lot */
  private addLotSprite(lot: Pick<Lot, "gx" | "gy" | "sprite" | "folder" | "role">) {
    const container = new PIXI.Container();
    const iso = this.toIso(lot.gx, lot.gy);
    container.x = iso.x;
    container.y = iso.y;

    const sprite = PIXI.Sprite.from(`/assets/${lot.folder}/${lot.sprite}.png`);
    sprite.anchor.set(0.5, SPRITE_ANCHOR_Y);
    sprite.scale.set(SPRITE_SCALE);
    sprite.y = this.TILE_H;
    container.addChild(sprite);

    container.zIndex = iso.y + this.TILE_H;
    this.entitiesLayer.addChild(container);
    return { container, sprite };
  }

  /** open shops as the demand model sees them */
  public sellers(): Seller[] {
    return this.plots.filter((p) => p.ownerType !== "unclaimed")
      .map((p) => ({ id: p.id, type: p.businessType, priceCents: p.priceCents, stock: p.inventory, tier: p.tier, brand: p.isUpgraded }));
  }

  /** One shopper arrives wanting something (it depends on the hour) and picks a shop, or leaves. */
  public spawnCustomer() {
    const sellers = this.sellers(), me = sellers.find((s) => s.id === 0);
    if (!me) return;
    const want: Trade = pickTrade(this.hour, Math.random);
    const { activeEvent, eventTarget } = useGameStore.getState();
    const mods = demandModifiers(activeEvent), inStock = sellers.filter((s) => s.stock > 0);
    const viralId = inStock.length ? inStock[eventTarget % inStock.length].id : null;
    const choice = chooseShop(sellers, want, { priceWeight: mods.priceWeight, viralId, viralBonus: mods.viralBonus }, Math.random);

    const nameOf = (id: number) => (id === 0 ? "Your shop" : this.plots[id].owner ?? "Rival");
    this.onShopper?.(this.hour, sellers.filter((s) => s.type === want).map((s) => ({
      id: s.id, priceCents: s.priceCents, outcome: outcomeFor(s, choice), rival: choice.winner ? nameOf(choice.winner.id) : undefined,
    })));
    if (want === me.type && outcomeFor(me, choice) === "price" && performance.now() - this.lastGrumble > 4000) {
      this.lastGrumble = performance.now();
      const p = this.plots[0].container;
      this.spawnFloatingText(p.x, p.y + 20, "Too pricey!", 0xff8a75);
    }
    const targetPlot = choice.winner && this.plots[choice.winner.id];
    if (!targetPlot) return;

    const spawnGate = this.GATES[Math.floor(Math.random() * this.GATES.length)];
    const exitGate = this.GATES[Math.floor(Math.random() * this.GATES.length)];
    const path = this.pathfinder.findPath(spawnGate, targetPlot.entrance);

    if (path.length <= 1) return;

    const container = new PIXI.Container();
    const iso = this.toIso(spawnGate.x, spawnGate.y);
    container.x = iso.x;
    container.y = iso.y + this.TILE_H / 2;

    const person = PIXI.Sprite.from(`/assets/people/person${Math.floor(Math.random() * 6)}.png`);
    person.anchor.set(0.5, 0.9);
    person.scale.set(0.34);
    container.addChild(person);
    // a little bubble showing what they came for
    const wants = PIXI.Sprite.from(uiIcon(shopKind(want).icon));
    wants.anchor.set(0.5);
    wants.setSize(15, 15);
    wants.position.set(0, -33);
    container.addChild(wants);
    container.zIndex = iso.y + 10;
    this.entitiesLayer.addChild(container);

    this.npcs.push({
      id: Math.random().toString(),
      gx: spawnGate.x,
      gy: spawnGate.y,
      path,
      pathIdx: 0,
      container,
      targetPlot,
      speed: 0.05 + Math.random() * 0.02,
      stepT: 0,
      state: "WALKING_TO_SHOP",
      pauseTimer: 0,
      exitGate,
    });
  }

  /**
   * Update Loop: A* Pathing, Doorway Buying Pause, Particle Emitters
   */
  private update(delta: number) {
    // Pulse Player Shop Halo
    this.haloPulseTimer += delta * 0.05;
    const playerPlot = this.plots.find((p) => p.ownerType === "player");
    if (playerPlot && playerPlot.haloGraphic) {
      playerPlot.haloGraphic.alpha = 0.75 + Math.sin(this.haloPulseTimer) * 0.25;
    }

    // NPC State Machine
    for (let i = this.npcs.length - 1; i >= 0; i--) {
      const npc = this.npcs[i];

      if (npc.state === "WALKING_TO_SHOP") {
        if (npc.pathIdx >= npc.path.length - 1) {
          // Reached shop entrance! Pause for 0.6s and buy
          npc.state = "PURCHASING";
          npc.pauseTimer = 36; // ~0.6 seconds at 60fps
          continue;
        }

        npc.stepT += npc.speed * delta;
        if (npc.stepT >= 1) {
          npc.stepT = 0;
          npc.pathIdx++;
        }

        const curr = npc.path[npc.pathIdx];
        const next = npc.path[Math.min(npc.path.length - 1, npc.pathIdx + 1)];
        const gx = curr.x + (next.x - curr.x) * npc.stepT;
        const gy = curr.y + (next.y - curr.y) * npc.stepT;
        npc.gx = gx;
        npc.gy = gy;

        const iso = this.toIso(gx, gy);
        const face = iso.x >= npc.container.x ? 1 : -1;
        npc.container.x = iso.x;
        npc.container.y = iso.y + this.TILE_H / 2;
        const body = npc.container.children[0];
        body.y = -Math.abs(Math.sin(npc.stepT * Math.PI * 2)) * 3;
        body.scale.x = Math.abs(body.scale.x) * face;
        npc.container.zIndex = iso.y + 10;
      } else if (npc.state === "PURCHASING") {
        npc.pauseTimer -= delta;
        if (npc.pauseTimer <= 0) {
          // Process purchase!
          const plot = npc.targetPlot;
          if (plot.inventory > 0) {
            plot.inventory = Math.max(0, plot.inventory - 1);
            plot.customersServed += 1;
            plot.revenueTodayCents += plot.priceCents;

            if (plot.ownerType === "player") {
              sfx.playChing();
              this.spawnFloatingText(npc.container.x, npc.container.y - 40, `+${price(plot.priceCents)}`);
            }
            this.buildSign(plot);

            if (this.onCustomerServed) {
              this.onCustomerServed(plot.id, plot.priceCents);
            }
          } else {
            // Plot is sold out!
            if (plot.ownerType === "player") this.spawnFloatingText(npc.container.x, npc.container.y - 40, "Sold out!", 0xff8a75);
            this.onTurnedAway?.(plot.id);
            this.buildSign(plot);
          }

          // Path out through city gate
          npc.state = "WALKING_TO_EXIT";
          const exitPath = this.pathfinder.findPath(
            { x: Math.round(npc.gx), y: Math.round(npc.gy) },
            npc.exitGate
          );
          npc.path = exitPath;
          npc.pathIdx = 0;
          npc.stepT = 0;
        }
      } else if (npc.state === "WALKING_TO_EXIT") {
        if (npc.pathIdx >= npc.path.length - 1) {
          // Left through gate
          this.entitiesLayer.removeChild(npc.container);
          this.npcs.splice(i, 1);
          continue;
        }

        npc.stepT += npc.speed * delta;
        if (npc.stepT >= 1) {
          npc.stepT = 0;
          npc.pathIdx++;
        }

        const curr = npc.path[npc.pathIdx];
        const next = npc.path[Math.min(npc.path.length - 1, npc.pathIdx + 1)];
        const gx = curr.x + (next.x - curr.x) * npc.stepT;
        const gy = curr.y + (next.y - curr.y) * npc.stepT;
        npc.gx = gx;
        npc.gy = gy;

        const iso = this.toIso(gx, gy);
        const face = iso.x >= npc.container.x ? 1 : -1;
        npc.container.x = iso.x;
        npc.container.y = iso.y + this.TILE_H / 2;
        const body = npc.container.children[0];
        body.y = -Math.abs(Math.sin(npc.stepT * Math.PI * 2)) * 3;
        body.scale.x = Math.abs(body.scale.x) * face;
        npc.container.zIndex = iso.y + 10;
      }
    }

    // Floating Particles
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.container.y += ft.yVelocity * delta;
      ft.container.alpha += ft.alphaVelocity * delta;
      if (ft.container.alpha <= 0) {
        this.uiLayer.removeChild(ft.container);
        this.floatingTexts.splice(i, 1);
      }
    }

    this.entitiesLayer.sortChildren();
    this.syncTargets();
    this.night?.step(delta);
    this.mistTimer += delta * 0.008;
    this.mist.forEach((m, i) => (m.pivot.x = Math.sin(this.mistTimer + i) * 14));
  }

  public spawnFloatingText(x: number, y: number, textStr: string, fillColor: number = 0x10b981) {
    const cont = new PIXI.Container();
    cont.x = x;
    cont.y = y;

    const t = label(textStr, 17, fillColor === 0x10b981 ? 0xffd34d : fillColor, "700");
    t.style.stroke = { color: 0x2a1c15, width: 4, join: "round" };
    t.anchor.set(0.5, 0.5);
    cont.addChild(t);

    this.uiLayer.addChild(cont);
    this.floatingTexts.push({ container: cont, yVelocity: -1.2, alphaVelocity: -0.022 });
  }

  public focusPlayerPlot() {
    if (!this.viewport) return;
    const playerPlot = this.plots.find((p) => p.ownerType === "player") || this.plots[0];
    if (!playerPlot) return;
    const iso = this.toIso(playerPlot.gx, playerPlot.gy);
    this.viewport.animate({
      position: { x: iso.x, y: iso.y + this.TILE_H },
      scale: 1.15,
      time: 500,
    });
  }

  /** pan to a plot; `panel` keeps it clear of the inspector on the right */
  public focusPlot(plotId: number, panel = false) {
    const plot = this.plots.find((p) => p.id === plotId);
    if (plot) this.panTo(plot.gx, plot.gy, panel);
  }
  public focusPlace(id: PlaceId) {
    const place = this.landmarks.find((l) => l.id === id);
    if (place) this.panTo(place.gx, place.gy, false);
  }
  private panTo(gx: number, gy: number, panel: boolean) {
    if (!this.viewport) return;
    const iso = this.toIso(gx, gy), scale = Math.max(1.05, Math.min(1.4, this.viewport.scale.x));
    this.viewport.animate({ position: { x: iso.x + (panel ? 190 / scale : 0), y: iso.y + this.TILE_H }, scale, time: 450, ease: "easeOutCubic" });
  }

  public zoomIn() {
    this.viewport?.zoom(120, true);
  }

  public zoomOut() {
    this.viewport?.zoom(-120, true);
  }

  public resetCamera() {
    if (!this.viewport) return;
    const centerIso = this.toIso(14, 14);
    this.viewport.animate({
      position: { x: centerIso.x, y: centerIso.y },
      scale: 0.85,
      time: 500,
    });
  }

  /** Morning: every rival restocks and moves its price according to how yesterday went. Returns how many repriced. */
  public newDay() {
    let repriced = 0;
    for (const p of this.plots) {
      if (p.ownerType === "player" || p.ownerType === "unclaimed") continue;
      const next = nextRivalPrice(p.priceCents, p.customersServed - p.servedAtOpen, p.openingStock, p.businessType as Trade);
      if (next !== p.priceCents) repriced++;
      p.priceCents = next;
      p.inventory = p.openingStock;
      p.servedAtOpen = p.customersServed;
      this.buildSign(p);
    }
    return repriced;
  }

  /** 0 = noon, about 0.5 = late evening: darkens the town and lights the lamps */
  public setDaylight(darkness: number) {
    this.night?.set(darkness);
  }

  public updatePlotData(plotId: number, data: Partial<PlotInfo>) {
    const plot = this.plots.find((p) => p.id === plotId);
    if (!plot) return;
    const changed = Object.entries(data).some(([k, v]) => plot[k as keyof PlotInfo] !== v);
    if (!changed) return;
    Object.assign(plot, data);
    if (data.isUpgraded !== undefined) {
      const b = BUILDING_SPRITES.businesses[plot.businessType as keyof typeof BUILDING_SPRITES.businesses];
      const path = plot.isUpgraded ? b.upgraded : b.base;
      plot.sprite.texture = PIXI.Assets.get(path);
      if (plot.sign && plot.ownerType !== "unclaimed") plot.sign.root.y = plot.container.y + this.roofY(path);
    }
    this.refreshPlotHalo(plot);
    this.buildSign(plot);
  }

  public destroy() {
    this.destroyed = true;
    window.removeEventListener("resize", this.handleResize);
    window.removeEventListener("keydown", this.handleKeyDown);
    this.app?.destroy(true, { children: true });
  }
}
