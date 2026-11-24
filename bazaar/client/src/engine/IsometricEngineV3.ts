import * as PIXI from "pixi.js";
import { Viewport } from "pixi-viewport";
import { BUILDING_SPRITES } from "./buildingRegistry";
import { GridPathfinder, Point } from "./pathfinding";
import { sfx } from "../audio/sfx";

export interface PlotInfo {
  id: number;
  streetName: string;
  tier: "Corner" | "MainStreet" | "SideStreet" | "Alley";
  gx: number;
  gy: number;
  entrance: Point;
  owner: string | null;
  businessType: string;
  isUpgraded: boolean;
  priceCents: number;
  inventory: number;
  isMarginCalled: boolean;
  sprite: PIXI.Sprite;
  container: PIXI.Container;
}

export interface LandmarkInfo {
  id: string;
  label: string;
  modal: string;
  gx: number;
  gy: number;
  sprite: PIXI.Sprite;
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
  public npcs: {
    id: string;
    gx: number;
    gy: number;
    path: Point[];
    pathIdx: number;
    container: PIXI.Container;
    targetPlot: PlotInfo;
    speed: number;
    stepT: number;
  }[] = [];
  public floatingTexts: { container: PIXI.Container; yVelocity: number; alphaVelocity: number }[] = [];

  // Callbacks for React HUD
  public onPlotClick?: (plot: PlotInfo) => void;
  public onLandmarkClick?: (modal: string) => void;

  private isNight: boolean = false;
  private nightFilter: PIXI.Graphics = new PIXI.Graphics();
  private brazierLights: PIXI.Graphics[] = [];

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

    // Load textures with scaleMode = 'nearest' for crisp pixel art
    await this.preloadTextures();

    // Build 28x28 terrain grid
    this.buildTerrain();

    // Place 20 plots & landmarks
    this.placeLandmarks();
    this.place20Plots();
    this.placePerimeterFiller();

    // Center viewport on central intersection
    const centerIso = this.toIso(14, 14);
    viewport.moveCenter(centerIso.x, centerIso.y);
    viewport.setZoom(0.85);

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
    // Don't pan if focused in an input
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
    allUrls.add(BUILDING_SPRITES.landmarks.townHall.bellTower);
    allUrls.add(BUILDING_SPRITES.landmarks.intelGuild.sprite);
    allUrls.add(BUILDING_SPRITES.landmarks.managerOffice.sprite);
    allUrls.add(BUILDING_SPRITES.landmarks.spectatorHall.sprite);
    allUrls.add(BUILDING_SPRITES.landmarks.uncleRavi.sprite);
    allUrls.add(BUILDING_SPRITES.landmarks.cityGate);

    BUILDING_SPRITES.townAccents.forEach((url) => allUrls.add(url));
    BUILDING_SPRITES.countryside.forEach((url) => allUrls.add(url));

    for (const url of allUrls) {
      try {
        const tex = await PIXI.Assets.load(url);
        if (tex && tex.source) {
          tex.source.scaleMode = "nearest";
        }
      } catch (err) {
        console.warn("Failed to preload sprite:", url, err);
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
        // Central crossroads around x=13..15, y=13..15
        const isRoadX = x === 13 || x === 14; // MagicBlock Boulevard (wide 2-tile road)
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
    const gates = [
      { gx: 13, gy: 1 },  // North Gate
      { gx: 26, gy: 13 }, // East Gate
      { gx: 13, gy: 26 }, // South Gate
      { gx: 1, gy: 13 },  // West Gate
    ];
    gates.forEach((g) => {
      this.addBuildingSprite(BUILDING_SPRITES.landmarks.cityGate, g.gx, g.gy, false);
    });
  }

  /**
   * Place 20 Playable Plots along Sidewalks
   */
  private place20Plots() {
    this.plots = [];

    // Clean coordinates alongside sidewalks
    const plotCoords: { gx: number; gy: number; tier: "Corner" | "MainStreet" | "SideStreet" | "Alley"; street: string; entrance: Point }[] = [
      // 4 Corners at central intersection
      { gx: 11, gy: 11, tier: "Corner", street: "MagicBlock Blvd", entrance: { x: 12, y: 12 } },
      { gx: 16, gy: 11, tier: "Corner", street: "MagicBlock Blvd", entrance: { x: 15, y: 12 } },
      { gx: 11, gy: 16, tier: "Corner", street: "MagicBlock Blvd", entrance: { x: 12, y: 15 } },
      { gx: 16, gy: 16, tier: "Corner", street: "MagicBlock Blvd", entrance: { x: 15, y: 15 } },

      // 6 Main Street Plots
      { gx: 13, gy: 8, tier: "MainStreet", street: "Main Street", entrance: { x: 13, y: 11 } },
      { gx: 14, gy: 8, tier: "MainStreet", street: "Main Street", entrance: { x: 14, y: 11 } },
      { gx: 13, gy: 19, tier: "MainStreet", street: "Main Street", entrance: { x: 13, y: 16 } },
      { gx: 14, gy: 19, tier: "MainStreet", street: "Main Street", entrance: { x: 14, y: 16 } },
      { gx: 8, gy: 13, tier: "MainStreet", street: "Main Street", entrance: { x: 11, y: 13 } },
      { gx: 19, gy: 13, tier: "MainStreet", street: "Main Street", entrance: { x: 16, y: 13 } },

      // 6 Side Street Plots
      { gx: 10, gy: 7, tier: "SideStreet", street: "Side Street", entrance: { x: 11, y: 11 } },
      { gx: 17, gy: 7, tier: "SideStreet", street: "Side Street", entrance: { x: 16, y: 11 } },
      { gx: 10, gy: 20, tier: "SideStreet", street: "Side Street", entrance: { x: 11, y: 16 } },
      { gx: 17, gy: 20, tier: "SideStreet", street: "Side Street", entrance: { x: 16, y: 16 } },
      { gx: 7, gy: 10, tier: "SideStreet", street: "Side Street", entrance: { x: 11, y: 11 } },
      { gx: 20, gy: 10, tier: "SideStreet", street: "Side Street", entrance: { x: 16, y: 11 } },

      // 4 Alley Plots
      { gx: 7, gy: 17, tier: "Alley", street: "Alley", entrance: { x: 11, y: 16 } },
      { gx: 20, gy: 17, tier: "Alley", street: "Alley", entrance: { x: 16, y: 16 } },
      { gx: 6, gy: 7, tier: "Alley", street: "Alley", entrance: { x: 11, y: 11 } },
      { gx: 21, gy: 20, tier: "Alley", street: "Alley", entrance: { x: 16, y: 16 } },
    ];

    const types = ["CoffeeCart", "StreetFood", "Electronics", "FlowerStall", "Bookshop"];

    plotCoords.forEach((p, id) => {
      const bType = types[id % types.length];
      const isUpgraded = id === 0 || id % 4 === 0;
      const bConfig = BUILDING_SPRITES.businesses[bType as keyof typeof BUILDING_SPRITES.businesses] || BUILDING_SPRITES.businesses.CoffeeCart;
      const spritePath = isUpgraded ? bConfig.upgraded : bConfig.base;

      const plotInfo: PlotInfo = {
        id,
        streetName: p.street,
        tier: p.tier,
        gx: p.gx,
        gy: p.gy,
        entrance: p.entrance,
        owner: id === 0 ? "You" : id % 3 === 0 ? `Rival #${(id % 4) + 1}` : null,
        businessType: bType,
        isUpgraded,
        priceCents: 250 + (id % 5) * 50,
        inventory: 45 + (id % 3) * 20,
        isMarginCalled: id === 7,
        sprite: null as any,
        container: null as any,
      };

      const cont = this.addBuildingSprite(spritePath, p.gx, p.gy, true, () => {
        if (this.onPlotClick) this.onPlotClick(plotInfo);
      });

      plotInfo.container = cont;
      this.plots.push(plotInfo);
    });
  }

  /**
   * Place Atmospheric Filler to ensure zero empty space
   */
  private placePerimeterFiller() {
    // Inner town accents (corners and alleys)
    const innerCoords = [
      { gx: 9, gy: 13, file: "/assets/buildings/watchtower-brazier.png" },
      { gx: 18, gy: 14, file: "/assets/buildings/watchtower-brazier.png" },
      { gx: 14, gy: 9, file: "/assets/buildings/guardhouse.png" },
      { gx: 13, gy: 18, file: "/assets/buildings/guardhouse.png" },
      { gx: 8, gy: 8, file: "/assets/buildings/blacksmith-forge.png" },
      { gx: 19, gy: 8, file: "/assets/buildings/jewelers-shop.png" },
      { gx: 8, gy: 19, file: "/assets/buildings/tailors-shop.png" },
      { gx: 19, gy: 19, file: "/assets/buildings/potters-workshop.png" },
    ];

    innerCoords.forEach((ic) => {
      this.addBuildingSprite(ic.file, ic.gx, ic.gy, false);
    });

    // Outer Countryside framing (ring around perimeter)
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

    outerCoords.forEach((oc) => {
      this.addBuildingSprite(oc.file, oc.gx, oc.gy, false);
    });
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

    // Mark footprint as blocked in pathfinder (2x2 tiles)
    for (let dy = 0; dy <= 1; dy++) {
      for (let dx = 0; dx <= 1; dx++) {
        this.pathfinder.setTile(gx + dx, gy + dy, 0);
      }
    }

    // Soft ground shadow
    const shadow = new PIXI.Graphics();
    shadow.ellipse(0, 16, 44, 22);
    shadow.fill({ color: 0x000000, alpha: 0.38 });
    container.addChild(shadow);

    // Building PNG Sprite
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

      // Hover selection highlight ring
      const highlight = new PIXI.Graphics();
      highlight.ellipse(0, 16, 48, 24);
      highlight.stroke({ width: 2.5, color: 0xf59e0b, alpha: 0.9 });
      highlight.fill({ color: 0xf59e0b, alpha: 0.12 });
      highlight.visible = false;
      container.addChild(highlight);

      container.on("pointerover", () => {
        highlight.visible = true;
      });
      container.on("pointerout", () => {
        highlight.visible = false;
      });
      container.on("pointertap", () => {
        sfx.playPriceClick();
        if (onClick) onClick();
      });
    }

    // Strict isometric depth sorting
    container.zIndex = iso.y;
    this.entitiesLayer.addChild(container);

    return container;
  }

  /**
   * Spawn customer NPC at an entrance gate that uses A* pathfinding along roads
   */
  public spawnNpcCustomer(targetPlot: PlotInfo) {
    const gates: Point[] = [
      { x: 13, y: 2 },
      { x: 25, y: 13 },
      { x: 13, y: 25 },
      { x: 2, y: 13 },
    ];
    const spawnGate = gates[Math.floor(Math.random() * gates.length)];
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

    g.circle(0, -9, 4); // head
    g.fill({ color: 0xffedd5 });
    g.roundRect(-3.5, -4, 7, 9, 2); // body
    g.fill({ color: col });
    g.ellipse(0, 6, 5, 2.5); // shadow
    g.fill({ color: 0x000000, alpha: 0.35 });

    container.addChild(g);
    container.zIndex = iso.y;
    this.entitiesLayer.addChild(container);

    this.npcs.push({
      id: Math.random().toString(),
      gx: spawnGate.x,
      gy: spawnGate.y,
      path,
      pathIdx: 0,
      container,
      targetPlot,
      speed: 0.045 + Math.random() * 0.02,
      stepT: 0,
    });
  }

  /**
   * Recalculate A* path mid-route when a rival undercuts or SOL pumps
   */
  public rerouteNpcs(newCheapestPlot: PlotInfo) {
    this.npcs.forEach((npc) => {
      const currentPoint: Point = { x: Math.round(npc.gx), y: Math.round(npc.gy) };
      const newPath = this.pathfinder.findPath(currentPoint, newCheapestPlot.entrance);
      if (newPath.length > 0) {
        npc.path = newPath;
        npc.pathIdx = 0;
        npc.targetPlot = newCheapestPlot;
      }
    });
  }

  public setNightMode(night: boolean) {
    this.isNight = night;
    this.nightFilter.clear();

    if (night && this.app) {
      // Cozy twilight filter
      this.nightFilter.rect(0, 0, this.app.screen.width, this.app.screen.height);
      this.nightFilter.fill({ color: 0x06091c, alpha: 0.6 });
    }
  }

  public focusPlot(plotId: number) {
    const plot = this.plots.find((p) => p.id === plotId);
    if (plot && this.viewport) {
      const iso = this.toIso(plot.gx, plot.gy);
      this.viewport.animate({
        position: { x: iso.x, y: iso.y },
        scale: 1.25,
        time: 500,
        ease: "easeInOutQuad",
      });
    }
  }

  public resetView() {
    if (!this.viewport) return;
    const centerIso = this.toIso(14, 14);
    this.viewport.animate({
      position: { x: centerIso.x, y: centerIso.y },
      scale: 0.85,
      time: 600,
      ease: "easeInOutQuad",
    });
  }

  private update(delta: number) {
    // Update A* NPC movement along road tiles
    for (let i = this.npcs.length - 1; i >= 0; i--) {
      const npc = this.npcs[i];
      if (npc.pathIdx >= npc.path.length - 1) {
        // Reached destination! Buy purchase
        sfx.playChing();
        this.spawnFloatingText(npc.container.x, npc.container.y - 25, `+$${(npc.targetPlot.priceCents / 100).toFixed(2)}`);
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

    // Floating particles
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

  private spawnFloatingText(x: number, y: number, textStr: string) {
    const cont = new PIXI.Container();
    cont.x = x;
    cont.y = y;

    const t = new PIXI.Text({
      text: textStr,
      style: {
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 14,
        fontWeight: "bold",
        fill: 0x10b981,
        stroke: { color: 0x000000, width: 3 },
      },
    });
    t.anchor.set(0.5, 0.5);
    cont.addChild(t);

    this.uiLayer.addChild(cont);
    this.floatingTexts.push({ container: cont, yVelocity: -1.2, alphaVelocity: -0.02 });
  }

  public spawnCustomer(targetPlotId?: number) {
    if (this.plots.length === 0) return;
    const target =
      targetPlotId !== undefined
        ? this.plots.find((p) => p.id === targetPlotId) || this.plots[0]
        : this.plots[Math.floor(Math.random() * this.plots.length)];
    this.spawnNpcCustomer(target);
  }

  public zoomIn() {
    if (!this.viewport) return;
    this.viewport.zoom(100, true);
  }

  public zoomOut() {
    if (!this.viewport) return;
    this.viewport.zoom(-100, true);
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

  public focusPlayerPlot() {
    if (!this.viewport) return;
    const playerPlot = this.plots.find((p) => p.id === 0) || this.plots[0];
    const iso = this.toIso(playerPlot.gx, playerPlot.gy);
    this.viewport.animate({
      position: { x: iso.x, y: iso.y },
      scale: 1.2,
      time: 500,
    });
  }

  public updatePlotData(plotId: number, data: Partial<PlotInfo>) {
    const plot = this.plots.find((p) => p.id === plotId);
    if (!plot) return;
    Object.assign(plot, data);

    // Update floating price billboard
    const billboard = plot.container.children.find((c) => (c as any).isBillboard) as PIXI.Container | undefined;
    if (billboard && data.priceCents !== undefined) {
      const textChild = billboard.children.find((c) => c instanceof PIXI.Text) as PIXI.Text | undefined;
      if (textChild) {
        textChild.text = `$${(data.priceCents / 100).toFixed(2)}`;
      }
    }
  }

  public destroy() {
    window.removeEventListener("resize", this.handleResize);
    window.removeEventListener("keydown", this.handleKeyDown);
    this.app?.destroy(true, { children: true });
  }
}
