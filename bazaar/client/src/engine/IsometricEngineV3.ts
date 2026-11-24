import * as PIXI from "pixi.js";
import { Viewport } from "pixi-viewport";
import { BUILDING_SPRITES } from "./buildingRegistry";
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
    this.placePerimeterFiller();

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

    Object.values(BUILDING_SPRITES.businesses).forEach((b) => {
      allUrls.add(b.base);
      allUrls.add(b.upgraded);
    });

    allUrls.add(BUILDING_SPRITES.landmarks.bank.sprite);
    allUrls.add(BUILDING_SPRITES.landmarks.townHall.sprite);
    allUrls.add(BUILDING_SPRITES.landmarks.intelGuild.sprite);
    allUrls.add(BUILDING_SPRITES.landmarks.managerOffice.sprite);
    allUrls.add(BUILDING_SPRITES.landmarks.spectatorHall.sprite);
    allUrls.add(BUILDING_SPRITES.landmarks.uncleRavi.sprite);
    allUrls.add(BUILDING_SPRITES.landmarks.cityGate);

    for (const url of allUrls) {
      try {
        const tex = await PIXI.Assets.load(url);
        if (tex && tex.source) {
          tex.source.scaleMode = "nearest";
        }
      } catch (err) {
        console.warn("Preload warning:", url, err);
      }
    }
  }

  /**
   * 28x28 Isometric Terrain (Roads, Sidewalks, Grass Meadow)
   */
  private buildTerrain() {
    const g = new PIXI.Graphics();

    for (let y = 0; y < this.GRID_SIZE; y++) {
      for (let x = 0; x < this.GRID_SIZE; x++) {
        const iso = this.toIso(x, y);

        // 4 Main Streets layout on 28x28:
        // Wide 2-tile road along x=13..14 and y=13..14
        const isRoadX = x === 13 || x === 14;
        const isRoadY = y === 13 || y === 14;
        const isRoad = isRoadX || isRoadY;

        // Sidewalks bordering road
        const isSidewalk = (x === 12 || x === 15) || (y === 12 || y === 15);

        let color = ((x + y) % 2 === 0) ? 0x3f6e3a : 0x4a7c44; // Meadow grass
        let tileType = 0; // blocked

        if (isRoad) {
          color = (x === 13 && y === 13) ? 0x4f46e5 : 0x5a544d; // Cobblestone road
          tileType = 1; // walkable road
        } else if (isSidewalk) {
          color = 0x9c9384; // Flagstone sidewalk
          tileType = 2; // walkable sidewalk
        }

        this.pathfinder.setTile(x, y, tileType);

        // Draw diamond isometric tile
        g.poly([
          iso.x, iso.y,
          iso.x + this.TILE_W / 2, iso.y + this.TILE_H / 2,
          iso.x, iso.y + this.TILE_H,
          iso.x - this.TILE_W / 2, iso.y + this.TILE_H / 2,
        ]);
        g.fill({ color });
        g.stroke({ width: 0.5, color: isRoad ? 0x3e3832 : 0x2d5029, alpha: 0.6 });

        // Boulevard Golden road inlays
        if (isRoadX && isRoadY) {
          g.poly([
            iso.x - 4, iso.y + this.TILE_H / 2 - 2,
            iso.x + 4, iso.y + this.TILE_H / 2 - 2,
            iso.x + 4, iso.y + this.TILE_H / 2 + 2,
            iso.x - 4, iso.y + this.TILE_H / 2 + 2,
          ]);
          g.fill({ color: 0xf59e0b, alpha: 0.8 });
        }
      }
    }

    this.groundLayer.addChild(g);
  }

  /**
   * Place Clickable Town Landmarks
   */
  private placeLandmarks() {
    const list = [
      { id: "bank", label: "Bank of Bazaar", modal: "bank", gx: 10, gy: 10, file: BUILDING_SPRITES.landmarks.bank.sprite },
      { id: "townHall", label: "Town Hall & Auction", modal: "auction", gx: 17, gy: 10, file: BUILDING_SPRITES.landmarks.townHall.sprite },
      { id: "intel", label: "Intel & Scouting", modal: "intel", gx: 10, gy: 17, file: BUILDING_SPRITES.landmarks.intelGuild.sprite },
      { id: "manager", label: "Manager Office", modal: "manager", gx: 17, gy: 17, file: BUILDING_SPRITES.landmarks.managerOffice.sprite },
      { id: "spectator", label: "Spectator Hall", modal: "spectator", gx: 6, gy: 13, file: BUILDING_SPRITES.landmarks.spectatorHall.sprite },
      { id: "uncleRavi", label: "Uncle Ravi's Shop", modal: "uncleRavi", gx: 21, gy: 13, file: BUILDING_SPRITES.landmarks.uncleRavi.sprite },
    ];

    list.forEach((lm) => {
      this.addBuildingSprite(lm.file, lm.gx, lm.gy, true, () => {
        if (this.onLandmarkClick) this.onLandmarkClick(lm.modal);
      });
    });

    // 4 Cardinal Entrance Gates
    this.GATES.forEach((g) => {
      this.addBuildingSprite(BUILDING_SPRITES.landmarks.cityGate, g.x, g.y, false);
      // Ensure the gate road tile itself is walkable
      this.pathfinder.setTile(g.x, g.y, 1);
    });
  }

  /**
   * Place 20 Playable Plots along Sidewalks
   */
  private place20Plots() {
    this.plots = [];

    // Verified entrance coordinates strictly on adjacent sidewalk/road tiles (x=12, 13, 14, 15 or y=12, 13, 14, 15)
    const plotConfigs: {
      gx: number;
      gy: number;
      tier: "Corner" | "MainStreet" | "SideStreet" | "Alley";
      street: string;
      entrance: Point;
      ownerType: PlotOwnerType;
      ownerName: string | null;
      priceCents: number;
      inventory: number;
    }[] = [
      // 4 Central Corner Plots (Plot 0 is the Player's Corner Shop)
      { gx: 11, gy: 11, tier: "Corner", street: "MagicBlock Blvd", entrance: { x: 12, y: 12 }, ownerType: "player", ownerName: "You (Corner Roast)", priceCents: 300, inventory: 50 },
      { gx: 16, gy: 11, tier: "Corner", street: "MagicBlock Blvd", entrance: { x: 15, y: 12 }, ownerType: "rivalHuman", ownerName: "Player 2 (Gourmet)", priceCents: 310, inventory: 45 },
      { gx: 11, gy: 16, tier: "Corner", street: "MagicBlock Blvd", entrance: { x: 12, y: 15 }, ownerType: "bot", ownerName: "Undercutter Bot", priceCents: 290, inventory: 50 },
      { gx: 16, gy: 16, tier: "Corner", street: "MagicBlock Blvd", entrance: { x: 15, y: 15 }, ownerType: "bot", ownerName: "Margin Hawk Bot", priceCents: 320, inventory: 50 },

      // 6 Main Street Plots
      { gx: 13, gy: 8, tier: "MainStreet", street: "Main Street", entrance: { x: 13, y: 12 }, ownerType: "bot", ownerName: "Value Balanced Bot", priceCents: 280, inventory: 40 },
      { gx: 14, gy: 8, tier: "MainStreet", street: "Main Street", entrance: { x: 14, y: 12 }, ownerType: "unclaimed", ownerName: null, priceCents: 300, inventory: 0 },
      { gx: 13, gy: 19, tier: "MainStreet", street: "Main Street", entrance: { x: 13, y: 15 }, ownerType: "bot", ownerName: "Scribe Guild AI", priceCents: 350, inventory: 35 },
      { gx: 14, gy: 19, tier: "MainStreet", street: "Main Street", entrance: { x: 14, y: 15 }, ownerType: "unclaimed", ownerName: null, priceCents: 300, inventory: 0 },
      { gx: 8, gy: 13, tier: "MainStreet", street: "Main Street", entrance: { x: 12, y: 13 }, ownerType: "bot", ownerName: "Apex Merchant", priceCents: 295, inventory: 60 },
      { gx: 19, gy: 13, tier: "MainStreet", street: "Main Street", entrance: { x: 15, y: 13 }, ownerType: "unclaimed", ownerName: null, priceCents: 300, inventory: 0 },

      // 6 Side Street Plots
      { gx: 10, gy: 7, tier: "SideStreet", street: "Side Street", entrance: { x: 12, y: 12 }, ownerType: "unclaimed", ownerName: null, priceCents: 300, inventory: 0 },
      { gx: 17, gy: 7, tier: "SideStreet", street: "Side Street", entrance: { x: 15, y: 12 }, ownerType: "bot", ownerName: "Clockwork Trader", priceCents: 420, inventory: 25 },
      { gx: 10, gy: 20, tier: "SideStreet", street: "Side Street", entrance: { x: 12, y: 15 }, ownerType: "unclaimed", ownerName: null, priceCents: 300, inventory: 0 },
      { gx: 17, gy: 20, tier: "SideStreet", street: "Side Street", entrance: { x: 15, y: 15 }, ownerType: "unclaimed", ownerName: null, priceCents: 300, inventory: 0 },
      { gx: 7, gy: 10, tier: "SideStreet", street: "Side Street", entrance: { x: 12, y: 12 }, ownerType: "bot", ownerName: "Apothecary Bot", priceCents: 275, inventory: 30 },
      { gx: 20, gy: 10, tier: "SideStreet", street: "Side Street", entrance: { x: 15, y: 12 }, ownerType: "unclaimed", ownerName: null, priceCents: 300, inventory: 0 },

      // 4 Alley Plots
      { gx: 7, gy: 17, tier: "Alley", street: "Alley", entrance: { x: 12, y: 15 }, ownerType: "unclaimed", ownerName: null, priceCents: 250, inventory: 0 },
      { gx: 20, gy: 17, tier: "Alley", street: "Alley", entrance: { x: 15, y: 15 }, ownerType: "unclaimed", ownerName: null, priceCents: 250, inventory: 0 },
      { gx: 6, gy: 7, tier: "Alley", street: "Alley", entrance: { x: 12, y: 12 }, ownerType: "unclaimed", ownerName: null, priceCents: 240, inventory: 0 },
      { gx: 21, gy: 20, tier: "Alley", street: "Alley", entrance: { x: 15, y: 15 }, ownerType: "unclaimed", ownerName: null, priceCents: 240, inventory: 0 },
    ];

    const types = ["CoffeeCart", "StreetFood", "Electronics", "FlowerStall", "Bookshop"];

    plotConfigs.forEach((p, id) => {
      const bType = types[id % types.length];
      const isUpgraded = id === 0 || id % 4 === 0;
      const bConfig = BUILDING_SPRITES.businesses[bType as keyof typeof BUILDING_SPRITES.businesses] || BUILDING_SPRITES.businesses.CoffeeCart;
      const spritePath = p.ownerType === "unclaimed" ? "/assets/buildings/carpenters-yard.png" : (isUpgraded ? bConfig.upgraded : bConfig.base);

      // Verify entrance is walkable on the grid
      this.pathfinder.setTile(p.entrance.x, p.entrance.y, 2);

      const plotInfo: PlotInfo = {
        id,
        streetName: p.street,
        tier: p.tier,
        gx: p.gx,
        gy: p.gy,
        entrance: p.entrance,
        owner: p.ownerName,
        ownerType: p.ownerType,
        businessType: bType,
        isUpgraded,
        priceCents: p.priceCents,
        inventory: p.inventory,
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

    // Block footprint (2x2)
    for (let dy = 0; dy <= 1; dy++) {
      for (let dx = 0; dx <= 1; dx++) {
        this.pathfinder.setTile(plot.gx + dx, plot.gy + dy, 0);
      }
    }

    // 1. Ground Halo (Distinct Visual Ownership Marker)
    const halo = new PIXI.Graphics();
    plot.haloGraphic = halo;
    this.refreshPlotHalo(plot);
    container.addChild(halo);

    // 2. Soft building shadow
    const shadow = new PIXI.Graphics();
    shadow.ellipse(0, 16, 44, 22);
    shadow.fill({ color: 0x000000, alpha: 0.38 });
    container.addChild(shadow);

    // 3. Building Sprite
    let sprite: PIXI.Sprite;
    try {
      sprite = PIXI.Sprite.from(spritePath);
    } catch (_) {
      sprite = new PIXI.Sprite();
    }
    sprite.anchor.set(0.5, 0.78);
    sprite.scale.set(0.58);
    plot.sprite = sprite;
    container.addChild(sprite);

    // 4. Floating Overhead Pill (Ownership, Price & Stock)
    const pill = new PIXI.Container();
    pill.y = -68;
    plot.overheadPill = pill;
    this.buildOverheadPill(plot);
    container.addChild(pill);

    // 5. Interactivity
    container.eventMode = "static";
    container.cursor = "pointer";
    container.on("pointertap", () => {
      sfx.playPriceClick();
      if (this.onPlotClick) this.onPlotClick(plot);
    });

    container.zIndex = iso.y;
    this.entitiesLayer.addChild(container);

    return container;
  }

  private refreshPlotHalo(plot: PlotInfo) {
    if (!plot.haloGraphic) return;
    const g = plot.haloGraphic;
    g.clear();

    if (plot.ownerType === "player") {
      // Emerald / Gold Glowing Halo
      g.ellipse(0, 16, 52, 26);
      g.stroke({ width: 3, color: 0x10b981, alpha: 0.95 });
      g.fill({ color: 0xf59e0b, alpha: 0.16 });
    } else if (plot.ownerType === "rivalHuman") {
      // Crimson / Ruby Halo
      g.ellipse(0, 16, 48, 24);
      g.stroke({ width: 2.5, color: 0xef4444, alpha: 0.85 });
      g.fill({ color: 0xef4444, alpha: 0.12 });
    } else if (plot.ownerType === "bot") {
      // Sleek Indigo Halo
      g.ellipse(0, 16, 46, 23);
      g.stroke({ width: 2, color: 0x6366f1, alpha: 0.75 });
      g.fill({ color: 0x6366f1, alpha: 0.08 });
    } else {
      // Unclaimed / For Lease (Cobblestone Dashed Border)
      g.ellipse(0, 16, 44, 22);
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

  private placePerimeterFiller() {
    const innerCoords = [
      { gx: 6, gy: 3, file: "/assets/buildings/blacksmith.png" },
      { gx: 21, gy: 3, file: "/assets/buildings/weaver-tailor.png" },
      { gx: 6, gy: 24, file: "/assets/buildings/pottery-workshop.png" },
      { gx: 21, gy: 24, file: "/assets/buildings/tanner-leather.png" },
    ];
    innerCoords.forEach((ic) => this.addBuildingSprite(ic.file, ic.gx, ic.gy, false));

    const outerCoords = [
      { gx: 3, gy: 3, file: "/assets/buildings/sacred-grove.png" },
      { gx: 24, gy: 3, file: "/assets/buildings/mill-house.png" },
      { gx: 3, gy: 24, file: "/assets/buildings/stable-horse-market.png" },
      { gx: 24, gy: 24, file: "/assets/buildings/dairy-barn.png" },
      { gx: 13, gy: 4, file: "/assets/buildings/farmhouse-cottage.png" },
      { gx: 14, gy: 23, file: "/assets/buildings/apiary-beekeeper.png" },
      { gx: 4, gy: 14, file: "/assets/buildings/shrine-chapel.png" },
      { gx: 23, gy: 13, file: "/assets/buildings/merchants-house.png" },
    ];
    outerCoords.forEach((oc) => this.addBuildingSprite(oc.file, oc.gx, oc.gy, false));
  }

  private addBuildingSprite(
    url: string,
    gx: number,
    gy: number,
    interactive: boolean,
    onClick?: () => void
  ): PIXI.Container {
    const container = new PIXI.Container();
    const iso = this.toIso(gx, gy);
    container.x = iso.x;
    container.y = iso.y;

    // Footprint (2x2)
    for (let dy = 0; dy <= 1; dy++) {
      for (let dx = 0; dx <= 1; dx++) {
        this.pathfinder.setTile(gx + dx, gy + dy, 0);
      }
    }

    const shadow = new PIXI.Graphics();
    shadow.ellipse(0, 16, 44, 22);
    shadow.fill({ color: 0x000000, alpha: 0.38 });
    container.addChild(shadow);

    let sprite: PIXI.Sprite;
    try {
      sprite = PIXI.Sprite.from(url);
    } catch (_) {
      sprite = new PIXI.Sprite();
    }
    sprite.anchor.set(0.5, 0.78);
    sprite.scale.set(0.58);
    container.addChild(sprite);

    if (interactive) {
      container.eventMode = "static";
      container.cursor = "pointer";

      const highlight = new PIXI.Graphics();
      highlight.ellipse(0, 16, 48, 24);
      highlight.stroke({ width: 2.5, color: 0xf59e0b, alpha: 0.9 });
      highlight.fill({ color: 0xf59e0b, alpha: 0.12 });
      highlight.visible = false;
      container.addChild(highlight);

      container.on("pointerover", () => (highlight.visible = true));
      container.on("pointerout", () => (highlight.visible = false));
      container.on("pointertap", () => {
        sfx.playPriceClick();
        if (onClick) onClick();
      });
    }

    container.zIndex = iso.y;
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
    container.y = iso.y;

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
        npc.container.y = iso.y + Math.sin(npc.stepT * Math.PI) * 2;
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
        npc.container.y = iso.y + Math.sin(npc.stepT * Math.PI) * 2;
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
      position: { x: iso.x, y: iso.y },
      scale: 1.15,
      time: 500,
    });
  }

  public focusPlot(plotId: number) {
    const plot = this.plots.find((p) => p.id === plotId);
    if (plot && this.viewport) {
      const iso = this.toIso(plot.gx, plot.gy);
      this.viewport.animate({
        position: { x: iso.x, y: iso.y },
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
