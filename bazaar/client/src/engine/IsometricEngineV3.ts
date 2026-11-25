import * as PIXI from "pixi.js";
import { Viewport } from "pixi-viewport";
import { BUILDING_SPRITES } from "./buildingRegistry";
import { TOWN, GRID as TOWN_GRID, type Lot, type TileKind } from "./townLayout";
import { GridPathfinder, Point } from "./pathfinding";
import { sfx } from "../audio/sfx";

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
  overheadPill?: PIXI.Container;
  stockBarFill?: PIXI.Graphics;
  haloGraphic?: PIXI.Graphics;
  forLeaseSign?: PIXI.Container;
}

export interface LandmarkInfo {
  id: string;
  label: string;
  modal: string;
  gx: number;
  gy: number;
  sprite: PIXI.Sprite;
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
  public uiLayer: PIXI.Container = new PIXI.Container();

  public readonly GRID_SIZE = 28;
  public readonly TILE_W = 96;
  public readonly TILE_H = 48;

  public pathfinder: GridPathfinder;
  public plots: PlotInfo[] = [];
  public landmarks: LandmarkInfo[] = [];
  public npcs: CustomerNPC[] = [];
  /** buildings are clicked through the viewport (Pixi hit-testing only caught a sliver of each sprite) */
  private clickTargets: { container: PIXI.Container; top: number; bottom: number; highlight?: PIXI.Graphics; onClick: () => void }[] = [];
  public floatingTexts: { container: PIXI.Container; yVelocity: number; alphaVelocity: number }[] = [];

  // Callbacks for React HUD
  public onPlotClick?: (plot: PlotInfo) => void;
  public onLandmarkClick?: (modal: string) => void;
  public onCustomerServed?: (plotId: number, priceCents: number) => void;

  private isNight: boolean = false;
  private nightFilter: PIXI.Graphics = new PIXI.Graphics();
  private haloPulseTimer: number = 0;

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
      backgroundColor: 0x090d16,
      antialias: false,
      roundPixels: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

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
      .clampZoom({ minScale: 0.35, maxScale: 2.4 });

    viewport.on("clicked", (e: { world: { x: number; y: number } }) => {
      const t = this.pickAt(e.world.x, e.world.y);
      if (t) {
        sfx.playPriceClick();
        t.onClick();
      }
    });
    viewport.on("pointermove", (e: PIXI.FederatedPointerEvent) => {
      const w = viewport.toWorld(e.global.x, e.global.y);
      const t = this.pickAt(w.x, w.y);
      this.clickTargets.forEach((c) => c.highlight && (c.highlight.visible = c === t));
      app.canvas.style.cursor = t ? "pointer" : "";
    });

    viewport.addChild(this.groundLayer);
    viewport.addChild(this.entitiesLayer);
    viewport.addChild(this.uiLayer);
    app.stage.addChild(this.nightFilter);

    this.entitiesLayer.sortableChildren = true;

    // Load textures with scaleMode = 'nearest'
    await this.preloadTextures();

    // Build 28x28 terrain grid
    this.buildTerrain();

    // Place landmarks, plots & perimeter
    this.placeLandmarks();
    this.place20Plots();
    this.placeScenery();

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

  public toIso(gx: number, gy: number): Point {
    return {
      x: (gx - gy) * (this.TILE_W / 2),
      y: (gx + gy) * (this.TILE_H / 2),
    };
  }

  private async preloadTextures() {
    const allUrls = new Set<string>();

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
          if (tex && tex.source) tex.source.scaleMode = url.includes("/tiles/") ? "linear" : "nearest";
        } catch (err) {
          console.warn("Preload warning:", url, err);
        }
      })
    );
  }

  private pickAt(wx: number, wy: number) {
    let best: (typeof this.clickTargets)[number] | null = null;
    for (const t of this.clickTargets) {
      const c = t.container;
      if (Math.abs(wx - c.x) <= 100 && wy >= c.y + t.top && wy <= c.y + t.bottom && (!best || c.zIndex > best.container.zIndex)) best = t;
    }
    return best;
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
    const labels: Record<string, { modal: string; label: string }> = {
      bank: { modal: "bank", label: "Bank of Bazaar" },
      townHall: { modal: "auction", label: "Town Hall & Auction" },
      intel: { modal: "intel", label: "Intel & Scouting" },
      manager: { modal: "manager", label: "Manager Office" },
      spectator: { modal: "spectator", label: "Spectator Hall" },
      uncleRavi: { modal: "uncleRavi", label: "Uncle Ravi's Shop" },
    };
    TOWN.lots
      .filter((l) => l.role === "landmark")
      .forEach((lot) => {
        const info = labels[lot.landmarkId!];
        const c = this.addLotSprite(lot, true, () => {
          if (this.onLandmarkClick) this.onLandmarkClick(info.modal);
        });
        this.landmarks.push({ id: lot.landmarkId!, label: info.label, modal: info.modal, gx: lot.gx, gy: lot.gy, container: c } as unknown as LandmarkInfo);
      });

    // four gates on the avenue ends; arches face along the avenue
    const gates: [string, number, number][] = [
      ["city-gate", 13, 0],
      ["city-gate-ew", 26, 13],
      ["city-gate", 13, 26],
      ["city-gate-ew", 0, 13],
    ];
    gates.forEach(([sprite, gx, gy]) => this.addLotSprite({ gx, gy, role: "outskirt", sprite, folder: "exterior" }, false, undefined, false));
  }

  /**
   * Place 20 Playable Plots along Sidewalks
   */
  private place20Plots() {
    this.plots = [];

    // owner / economy data in slot order: 4 corners, 6 main street, 6 side street, 4 alley (positions come from townLayout)
    const owners: { ownerType: PlotOwnerType; ownerName: string | null; priceCents: number; inventory: number }[] = [
      { ownerType: "player", ownerName: "You (Corner Roast)", priceCents: 300, inventory: 50 },
      { ownerType: "rivalHuman", ownerName: "Player 2 (Gourmet)", priceCents: 310, inventory: 45 },
      { ownerType: "bot", ownerName: "Undercutter Bot", priceCents: 290, inventory: 50 },
      { ownerType: "bot", ownerName: "Margin Hawk Bot", priceCents: 320, inventory: 50 },
      { ownerType: "bot", ownerName: "Value Balanced Bot", priceCents: 280, inventory: 40 },
      { ownerType: "unclaimed", ownerName: null, priceCents: 300, inventory: 0 },
      { ownerType: "bot", ownerName: "Scribe Guild AI", priceCents: 350, inventory: 35 },
      { ownerType: "unclaimed", ownerName: null, priceCents: 300, inventory: 0 },
      { ownerType: "bot", ownerName: "Apex Merchant", priceCents: 295, inventory: 60 },
      { ownerType: "unclaimed", ownerName: null, priceCents: 300, inventory: 0 },
      { ownerType: "unclaimed", ownerName: null, priceCents: 300, inventory: 0 },
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
      const bType = types[id % types.length];
      const isUpgraded = id === 0 || id % 4 === 0;
      const bConfig = BUILDING_SPRITES.businesses[bType as keyof typeof BUILDING_SPRITES.businesses] || BUILDING_SPRITES.businesses.CoffeeCart;
      const spritePath = o.ownerType === "unclaimed" ? BUILDING_SPRITES.businesses.Vacant.base : (isUpgraded ? bConfig.upgraded : bConfig.base);

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

    // 1. Ground Halo (Distinct Visual Ownership Marker)
    const halo = new PIXI.Graphics();
    plot.haloGraphic = halo;
    this.refreshPlotHalo(plot);
    container.addChild(halo);

    // 2. Soft building shadow
    // 3. Building Sprite
    let sprite: PIXI.Sprite;
    try {
      sprite = PIXI.Sprite.from(spritePath);
    } catch (_) {
      sprite = new PIXI.Sprite();
    }
    sprite.anchor.set(0.5, SPRITE_ANCHOR_Y);
    sprite.scale.set(SPRITE_SCALE);
    sprite.y = this.TILE_H; // lot centre
    plot.sprite = sprite;
    container.addChild(sprite);

    // 4. Floating Overhead Pill (Ownership, Price & Stock)
    const pill = new PIXI.Container();
    pill.y = -86;
    plot.overheadPill = pill;
    this.buildOverheadPill(plot);
    container.addChild(pill);

    // 5. Interactivity
    this.clickTargets.push({ container, top: -132, bottom: 76, onClick: () => { if (this.onPlotClick) this.onPlotClick(plot); } });

    container.zIndex = iso.y + this.TILE_H;
    this.entitiesLayer.addChild(container);

    return container;
  }

  private refreshPlotHalo(plot: PlotInfo) {
    if (!plot.haloGraphic) return;
    const g = plot.haloGraphic;
    g.clear();

    if (plot.ownerType === "player") {
      // Emerald / Gold Glowing Halo
      g.ellipse(0, this.TILE_H, 84, 42);
      g.stroke({ width: 3, color: 0x10b981, alpha: 0.95 });
      g.fill({ color: 0xf59e0b, alpha: 0.16 });
    } else if (plot.ownerType === "rivalHuman") {
      // Crimson / Ruby Halo
      g.ellipse(0, this.TILE_H, 80, 40);
      g.stroke({ width: 2.5, color: 0xef4444, alpha: 0.85 });
      g.fill({ color: 0xef4444, alpha: 0.12 });
    } else if (plot.ownerType === "bot") {
      // Sleek Indigo Halo
      g.ellipse(0, this.TILE_H, 78, 39);
      g.stroke({ width: 2, color: 0x6366f1, alpha: 0.75 });
      g.fill({ color: 0x6366f1, alpha: 0.08 });
    } else {
      // Unclaimed / For Lease (Cobblestone Dashed Border)
      g.ellipse(0, this.TILE_H, 76, 38);
      g.stroke({ width: 1.5, color: 0xd4a359, alpha: 0.5 });
    }
  }

  private buildOverheadPill(plot: PlotInfo) {
    if (!plot.overheadPill) return;
    const pill = plot.overheadPill;
    pill.removeChildren();

    if (plot.ownerType === "unclaimed") {
      // Wooden "FOR AUCTION / LEASE" Sign
      const sign = new PIXI.Graphics();
      sign.roundRect(-42, -12, 84, 22, 6);
      sign.fill({ color: 0x1c1815, alpha: 0.92 });
      sign.stroke({ width: 1.5, color: 0xd4a359, alpha: 0.8 });
      pill.addChild(sign);

      const txt = new PIXI.Text({
        text: "📜 FOR LEASE",
        style: {
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 9,
          fontWeight: "bold",
          fill: 0xf59e0b,
        },
      });
      txt.anchor.set(0.5, 0.5);
      pill.addChild(txt);
      return;
    }

    const isSoldOut = plot.inventory <= 0;
    const pillBg = new PIXI.Graphics();

    // Background pill dimensions
    const w = plot.ownerType === "player" ? 110 : 96;
    const h = 24;
    pillBg.roundRect(-w / 2, -h / 2, w, h, 8);

    if (plot.ownerType === "player") {
      pillBg.fill({ color: 0x091b14, alpha: 0.94 });
      pillBg.stroke({ width: 2, color: 0x10b981 });
    } else if (plot.ownerType === "rivalHuman") {
      pillBg.fill({ color: 0x1c0f12, alpha: 0.94 });
      pillBg.stroke({ width: 1.5, color: 0xef4444 });
    } else {
      pillBg.fill({ color: 0x11162b, alpha: 0.92 });
      pillBg.stroke({ width: 1.5, color: 0x6366f1 });
    }
    pill.addChild(pillBg);

    // Label Text
    let label = `$${(plot.priceCents / 100).toFixed(2)}`;
    if (plot.ownerType === "player") label = `★ YOU • $${(plot.priceCents / 100).toFixed(2)}`;
    else if (isSoldOut) label = `SOLD OUT`;

    const labelText = new PIXI.Text({
      text: label,
      style: {
        fontFamily: "JetBrains Mono, monospace",
        fontSize: plot.ownerType === "player" ? 10 : 9,
        fontWeight: "bold",
        fill: isSoldOut ? 0xef4444 : (plot.ownerType === "player" ? 0x34d399 : 0xf7f0e3),
      },
    });
    labelText.anchor.set(0.5, 0.5);
    labelText.y = -2;
    pill.addChild(labelText);

    // Compact Stock Bar underneath
    const barW = w - 16;
    const barH = 3;
    const stockBarBg = new PIXI.Graphics();
    stockBarBg.roundRect(-barW / 2, 6, barW, barH, 1.5);
    stockBarBg.fill({ color: 0x27272a });
    pill.addChild(stockBarBg);

    const stockRatio = Math.max(0, Math.min(1, plot.inventory / plot.maxInventory));
    const stockFill = new PIXI.Graphics();
    stockFill.roundRect(-barW / 2, 6, barW * stockRatio, barH, 1.5);
    const stockColor = stockRatio > 0.4 ? 0x10b981 : stockRatio > 0.15 ? 0xf59e0b : 0xef4444;
    stockFill.fill({ color: stockColor });
    plot.stockBarFill = stockFill;
    pill.addChild(stockFill);
  }

  /** outskirts, accents, parks, fountain, street lamps and trees */
  private placeScenery() {
    TOWN.lots
      .filter((l) => l.role !== "landmark" && l.role !== "plot")
      .forEach((l) => this.addLotSprite(l, false));

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
    });
  }

  /** 2x2 sprite centred on its lot; landmarks are clickable with a hover ring */
  private addLotSprite(lot: Pick<Lot, "gx" | "gy" | "sprite" | "folder" | "role">, interactive: boolean, onClick?: () => void, block = true): PIXI.Container {
    const container = new PIXI.Container();
    const iso = this.toIso(lot.gx, lot.gy);
    container.x = iso.x;
    container.y = iso.y;

    let sprite: PIXI.Sprite;
    try {
      sprite = PIXI.Sprite.from(`/assets/${lot.folder}/${lot.sprite}.png`);
    } catch (_) {
      sprite = new PIXI.Sprite();
    }
    sprite.anchor.set(0.5, SPRITE_ANCHOR_Y);
    sprite.scale.set(SPRITE_SCALE);
    sprite.y = this.TILE_H;
    container.addChild(sprite);

    if (interactive) {
      const highlight = new PIXI.Graphics();
      highlight.ellipse(0, this.TILE_H, 84, 42);
      highlight.stroke({ width: 2.5, color: 0xf59e0b, alpha: 0.9 });
      highlight.fill({ color: 0xf59e0b, alpha: 0.12 });
      highlight.visible = false;
      container.addChildAt(highlight, 0);
      this.clickTargets.push({ container, top: -110, bottom: 76, highlight, onClick: () => { if (onClick) onClick(); } });
    }

    container.zIndex = iso.y + this.TILE_H;
    this.entitiesLayer.addChild(container);
    return container;
  }

  /**
   * Utility Score Calculation for All Open Shops
   * utility = -price + (brand_tolerance * price) + traffic_bonus + vrf_noise
   */
  public getBestShopForCustomer(): PlotInfo | null {
    const availablePlots = this.plots.filter((p) => p.ownerType !== "unclaimed" && p.inventory > 0);
    if (availablePlots.length === 0) return null;

    let bestPlot: PlotInfo = availablePlots[0];
    let highestUtility = -Infinity;

    availablePlots.forEach((plot) => {
      const priceFactor = -(plot.priceCents / 100);
      const brandBonus = plot.isUpgraded ? 0.35 : 0;
      const tierBonus = plot.tier === "Corner" ? 0.45 : plot.tier === "MainStreet" ? 0.25 : 0.1;
      const noise = (Math.random() - 0.5) * 0.2;

      const utility = priceFactor + brandBonus + tierBonus + noise;
      if (utility > highestUtility) {
        highestUtility = utility;
        bestPlot = plot;
      }
    });

    return bestPlot;
  }

  /**
   * Guaranteed Active Spawner: Spawns customer NPC at cardinal city gates
   */
  public spawnCustomer() {
    const targetPlot = this.getBestShopForCustomer();
    if (!targetPlot) return;

    const spawnGate = this.GATES[Math.floor(Math.random() * this.GATES.length)];
    const exitGate = this.GATES[Math.floor(Math.random() * this.GATES.length)];
    const path = this.pathfinder.findPath(spawnGate, targetPlot.entrance);

    if (path.length <= 1) return;

    const container = new PIXI.Container();
    const iso = this.toIso(spawnGate.x, spawnGate.y);
    container.x = iso.x;
    container.y = iso.y + this.TILE_H / 2;

    // Stylized Pixel NPC
    const g = new PIXI.Graphics();
    const colors = [0x38bdf8, 0xf43f5e, 0xa855f7, 0x34d399, 0xfbbf24];
    const col = colors[Math.floor(Math.random() * colors.length)];

    g.circle(0, -9, 4); // Head
    g.fill({ color: 0xffedd5 });
    g.roundRect(-3.5, -4, 7, 9, 2); // Body
    g.fill({ color: col });
    g.ellipse(0, 6, 5, 2.5); // Shadow
    g.fill({ color: 0x000000, alpha: 0.35 });

    container.addChild(g);
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
        npc.container.x = iso.x;
        npc.container.y = iso.y + this.TILE_H / 2 + Math.sin(npc.stepT * Math.PI) * 2;
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

            // Trigger sound & gold particle
            sfx.playChing();
            this.spawnFloatingText(
              npc.container.x,
              npc.container.y - 30,
              `+$${(plot.priceCents / 100).toFixed(2)}`
            );

            // Rebuild overhead stock pill
            this.buildOverheadPill(plot);

            if (this.onCustomerServed) {
              this.onCustomerServed(plot.id, plot.priceCents);
            }
          } else {
            // Plot is sold out!
            this.spawnFloatingText(npc.container.x, npc.container.y - 30, "SOLD OUT", 0xef4444);
            this.buildOverheadPill(plot);
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
        npc.container.x = iso.x;
        npc.container.y = iso.y + this.TILE_H / 2 + Math.sin(npc.stepT * Math.PI) * 2;
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
  }

  public spawnFloatingText(x: number, y: number, textStr: string, fillColor: number = 0x10b981) {
    const cont = new PIXI.Container();
    cont.x = x;
    cont.y = y;

    const t = new PIXI.Text({
      text: textStr,
      style: {
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 13,
        fontWeight: "bold",
        fill: fillColor,
        stroke: { color: 0x000000, width: 3 },
      },
    });
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

  public focusPlot(plotId: number) {
    const plot = this.plots.find((p) => p.id === plotId);
    if (plot && this.viewport) {
      const iso = this.toIso(plot.gx, plot.gy);
      this.viewport.animate({
        position: { x: iso.x, y: iso.y + this.TILE_H },
        scale: 1.25,
        time: 500,
      });
    }
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

  public setNightMode(night: boolean) {
    this.isNight = night;
    this.nightFilter.clear();
    if (night && this.app) {
      this.nightFilter.rect(0, 0, this.app.screen.width, this.app.screen.height);
      this.nightFilter.fill({ color: 0x06091c, alpha: 0.6 });
    }
  }

  public updatePlotData(plotId: number, data: Partial<PlotInfo>) {
    const plot = this.plots.find((p) => p.id === plotId);
    if (!plot) return;
    Object.assign(plot, data);
    this.refreshPlotHalo(plot);
    this.buildOverheadPill(plot);
  }

  public destroy() {
    window.removeEventListener("resize", this.handleResize);
    window.removeEventListener("keydown", this.handleKeyDown);
    this.app?.destroy(true, { children: true });
  }
}
