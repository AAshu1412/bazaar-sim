import * as PIXI from "pixi.js";
import { sfx } from "../audio/sfx";

export type PlotTier = "Corner" | "MainStreet" | "SideStreet" | "Alley";
export type BusinessType = "CoffeeCart" | "StreetFood" | "Electronics" | "FlowerStall" | "Bookshop";

export interface PlotData {
  id: number;
  streetIndex: number; // 0: MagicBlock Blvd, 1: Main St, 2: Side St, 3: Alley
  streetName: string;
  tier: PlotTier;
  gridX: number;
  gridY: number;
  owner: string | null;
  businessType: BusinessType;
  priceCents: number;
  inventory: number;
  isMarginCalled: boolean;
  isSponsored: boolean;
  hasSignage: boolean;
  hasBrand: boolean;
}

export interface CustomerNPC {
  id: string;
  gridX: number;
  gridY: number;
  targetPlotId: number;
  speed: number;
  color: number;
  graphics: PIXI.Graphics;
  purchased: boolean;
  state: "WALKING" | "LEAVING";
  walkCycle: number;
  isVip: boolean;
}

export interface FloatingText {
  container: PIXI.Container;
  yVelocity: number;
  alphaVelocity: number;
}

export class IsometricEngineV2 {
  private app: PIXI.Application | null = null;
  private rootContainer: PIXI.Container = new PIXI.Container();
  private groundLayer: PIXI.Container = new PIXI.Container();
  private propLayer: PIXI.Container = new PIXI.Container();
  private entityLayer: PIXI.Container = new PIXI.Container();
  private particleLayer: PIXI.Container = new PIXI.Container();
  private uiLayer: PIXI.Container = new PIXI.Container();

  private tileW = 56;
  private tileH = 28;

  // 20 plots across 4 streets:
  // Street 0: "MagicBlock Boulevard" (Top-Left diagonal)
  // Street 1: "Main Street" (Top-Right diagonal)
  // Street 2: "Side Street" (Bottom-Left diagonal)
  // Street 3: "Alley" (Bottom-Right diagonal)
  public plots: PlotData[] = [];
  private plotContainers: PIXI.Container[] = [];
  private npcs: CustomerNPC[] = [];
  private floatingTexts: FloatingText[] = [];

  // Lighting & Day/Night
  private ambientFilter: PIXI.Graphics = new PIXI.Graphics();
  public isNightMode: boolean = false;
  private timeTick: number = 0;

  public async init(containerElement: HTMLDivElement) {
    const width = containerElement.clientWidth || 980;
    const height = containerElement.clientHeight || 560;

    const app = new PIXI.Application();
    await app.init({
      width,
      height,
      backgroundColor: 0x070b14,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    this.app = app;
    containerElement.appendChild(app.canvas);

    this.rootContainer.x = width / 2;
    this.rootContainer.y = height / 2 - 30;

    this.rootContainer.addChild(this.groundLayer);
    this.rootContainer.addChild(this.propLayer);
    this.rootContainer.addChild(this.entityLayer);
    this.rootContainer.addChild(this.particleLayer);
    this.rootContainer.addChild(this.uiLayer);

    this.app.stage.addChild(this.rootContainer);
    this.app.stage.addChild(this.ambientFilter);

    this.generatePlotsLayout();
    this.drawIsometricNeighborhood();
    this.build20PlotStructures();

    this.app.ticker.add((ticker) => {
      this.update(ticker.deltaTime);
    });

    window.addEventListener("resize", this.handleResize);
  }

  private handleResize = () => {
    if (!this.app || !this.app.renderer) return;
    const parent = this.app.canvas.parentElement;
    if (parent) {
      this.app.renderer.resize(parent.clientWidth, parent.clientHeight);
      this.rootContainer.x = parent.clientWidth / 2;
      this.rootContainer.y = parent.clientHeight / 2 - 30;
    }
  };

  public toIso(gx: number, gy: number): { x: number; y: number } {
    return {
      x: (gx - gy) * (this.tileW / 2),
      y: (gx + gy) * (this.tileH / 2),
    };
  }

  /**
   * Layout of 20 Plots across 4 Streets
   */
  private generatePlotsLayout() {
    this.plots = [];
    const streetConfigs = [
      { name: "MagicBlock Blvd", isSponsored: true, baseX: -5, baseY: -5, dirX: 1, dirY: -1 },
      { name: "Main Street", isSponsored: false, baseX: 5, baseY: -5, dirX: 1, dirY: 1 },
      { name: "Side Street", isSponsored: false, baseX: -5, baseY: 5, dirX: -1, dirY: -1 },
      { name: "Alley", isSponsored: false, baseX: 5, baseY: 5, dirX: -1, dirY: 1 },
    ];

    const businessRotation: BusinessType[] = [
      "CoffeeCart",
      "Electronics",
      "StreetFood",
      "FlowerStall",
      "Bookshop",
    ];

    let id = 0;
    streetConfigs.forEach((street, sIdx) => {
      for (let pos = 0; pos < 5; pos++) {
        const isCorner = pos === 0;
        const tier: PlotTier = isCorner
          ? "Corner"
          : sIdx <= 1
          ? "MainStreet"
          : sIdx === 2
          ? "SideStreet"
          : "Alley";

        // Space out plots along the street direction
        const gx = street.baseX + (pos - 2) * 2.2 * (sIdx % 2 === 0 ? 1 : -1);
        const gy = street.baseY + (pos - 2) * 2.2 * (sIdx < 2 ? 1 : -1);

        this.plots.push({
          id,
          streetIndex: sIdx,
          streetName: street.name,
          tier,
          gridX: gx,
          gridY: gy,
          owner: id === 0 ? "You (Owner)" : id % 3 === 0 ? `Rival #${(id % 4) + 1}` : null,
          businessType: businessRotation[id % businessRotation.length],
          priceCents: 250 + (id % 5) * 60,
          inventory: 40 + (id % 3) * 20,
          isMarginCalled: id === 7, // Demo margin call warning on Plot #7
          isSponsored: street.isSponsored,
          hasSignage: id % 2 === 0,
          hasBrand: isCorner,
        });
        id++;
      }
    });
  }

  private drawIsometricNeighborhood() {
    this.groundLayer.removeChildren();
    const g = new PIXI.Graphics();

    // Cobblestone ground plane
    for (let x = -10; x <= 10; x++) {
      for (let y = -10; y <= 10; y++) {
        const iso = this.toIso(x, y);
        const isMainAvenue = Math.abs(x) <= 1 || Math.abs(y) <= 1;
        const isCenterPlaza = Math.abs(x) <= 2 && Math.abs(y) <= 2;

        let fill = 0x111726;
        if (isCenterPlaza) fill = 0x1a233a;
        else if (isMainAvenue) fill = 0x151d30;

        g.poly([
          iso.x, iso.y,
          iso.x + this.tileW / 2, iso.y + this.tileH / 2,
          iso.x, iso.y + this.tileH,
          iso.x - this.tileW / 2, iso.y + this.tileH / 2,
        ]);
        g.fill({ color: fill });
        g.stroke({ width: 0.5, color: 0x1e293b, alpha: 0.4 });
      }
    }

    // Overhead "MagicBlock Boulevard" Street Arch Banner
    const archIso = this.toIso(-5, -5);
    g.moveTo(archIso.x - 30, archIso.y + 10);
    g.lineTo(archIso.x - 30, archIso.y - 45);
    g.lineTo(archIso.x + 30, archIso.y - 45);
    g.lineTo(archIso.x + 30, archIso.y + 10);
    g.stroke({ width: 3, color: 0x6366f1 });

    g.roundRect(archIso.x - 42, archIso.y - 58, 84, 18, 4);
    g.fill({ color: 0x4f46e5 });
    g.stroke({ width: 1, color: 0xa5b4fc });

    this.groundLayer.addChild(g);
  }

  /**
   * Procedural Buildings for 5 Business Types
   */
  private build20PlotStructures() {
    this.plotContainers = [];

    this.plots.forEach((plot) => {
      const container = new PIXI.Container();
      const iso = this.toIso(plot.gridX, plot.gridY);
      container.x = iso.x;
      container.y = iso.y;

      const g = new PIXI.Graphics();

      // Plot boundary tile
      g.poly([
        0, 0,
        this.tileW / 2, this.tileH / 2,
        0, this.tileH,
        -this.tileW / 2, this.tileH / 2,
      ]);
      g.fill({ color: plot.isSponsored ? 0x2e1065 : 0x182234, alpha: 0.7 });
      g.stroke({
        width: 1.5,
        color: plot.id === 0 ? 0xf59e0b : plot.isMarginCalled ? 0xef4444 : 0x334155,
      });

      // Distinct 3D Building Sprite by Type
      this.drawBusinessSprite(g, plot.businessType, plot.tier);

      // Margin call warning beacon
      if (plot.isMarginCalled) {
        g.circle(0, -38, 5);
        g.fill({ color: 0xef4444 });
        g.circle(0, -38, 9);
        g.stroke({ width: 2, color: 0xef4444, alpha: 0.8 });
      }

      container.addChild(g);

      // Billboard Overlay Container
      const uiContainer = new PIXI.Container();
      uiContainer.y = -55;
      container.addChild(uiContainer);

      container.zIndex = iso.y + 100;
      this.entityLayer.addChild(container);
      this.plotContainers.push(container);
    });

    this.entityLayer.sortableChildren = true;
    this.refreshBillboards();
  }

  private drawBusinessSprite(g: PIXI.Graphics, kind: BusinessType, tier: PlotTier) {
    const isBig = tier === "Corner";
    const h = isBig ? 24 : 18;
    const w = isBig ? 32 : 24;

    switch (kind) {
      case "CoffeeCart":
        // Striped Amber Awning
        this.drawPrism(g, 0, 4, w, 18, h, 0xb45309, 0x78350f, 0xf59e0b);
        g.circle(0, -h, 4);
        g.fill({ color: 0xfef08a }); // coffee cup
        break;

      case "Electronics":
        // Modern Glowing Glass Facade & Neon Blue Sign
        this.drawPrism(g, 0, 4, w, 18, h + 4, 0x1e3a8a, 0x0f172a, 0x3b82f6);
        g.rect(-6, -h - 2, 12, 6);
        g.fill({ color: 0x60a5fa }); // screen glow
        break;

      case "StreetFood":
        // Red Food Cart with Smoke Grill
        this.drawPrism(g, 0, 4, w, 18, h, 0x991b1b, 0x450a0a, 0xef4444);
        g.circle(-2, -h, 3);
        g.fill({ color: 0xf97316 }); // grill glow
        break;

      case "FlowerStall":
        // Vibrant Green Greenhouse Canopy with Floral Accents
        this.drawPrism(g, 0, 4, w, 18, h, 0x065f46, 0x022c22, 0x10b981);
        g.circle(-3, -h, 2.5);
        g.fill({ color: 0xf43f5e });
        g.circle(3, -h, 2.5);
        g.fill({ color: 0xfbbf24 });
        break;

      case "Bookshop":
        // Cozy Brick Red Classic Facade
        this.drawPrism(g, 0, 4, w, 18, h + 2, 0x78350f, 0x451a03, 0xa16207);
        break;
    }
  }

  private drawPrism(
    g: PIXI.Graphics,
    x: number,
    y: number,
    w: number,
    d: number,
    h: number,
    leftCol: number,
    rightCol: number,
    topCol: number
  ) {
    const hw = w / 2;
    const hd = d / 2;
    // Left
    g.poly([x - hw, y, x, y + hd, x, y + hd - h, x - hw, y - h]);
    g.fill({ color: leftCol });
    // Right
    g.poly([x, y + hd, x + hw, y, x + hw, y - h, x, y + hd - h]);
    g.fill({ color: rightCol });
    // Top
    g.poly([x, y - h - hd, x + hw, y - h, x, y - h + hd, x - hw, y - h]);
    g.fill({ color: topCol });
  }

  public refreshBillboards() {
    this.plots.forEach((plot) => {
      const container = this.plotContainers[plot.id];
      if (!container) return;

      const ui = container.children[1] as PIXI.Container;
      ui.removeChildren();

      const isLocal = plot.id === 0;

      // Golden ring for player's owned stall
      if (isLocal) {
        const ring = new PIXI.Graphics();
        ring.ellipse(0, 5, 36, 18);
        ring.stroke({ width: 2.5, color: 0xf59e0b, alpha: 0.95 });
        ring.fill({ color: 0xf59e0b, alpha: 0.15 });
        ui.addChild(ring);
      }

      // Small Badge
      const bg = new PIXI.Graphics();
      bg.roundRect(-28, -12, 56, 18, 4);
      bg.fill({ color: isLocal ? 0xf59e0b : 0x0f172a, alpha: 0.9 });
      bg.stroke({ width: 1, color: isLocal ? 0xffffff : 0x334155 });
      ui.addChild(bg);

      const priceText = new PIXI.Text({
        text: `$${(plot.priceCents / 100).toFixed(2)}`,
        style: {
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 10,
          fontWeight: "bold",
          fill: isLocal ? 0x000000 : 0xffffff,
          align: "center",
        },
      });
      priceText.anchor.set(0.5, 0.5);
      priceText.y = -3;
      ui.addChild(priceText);
    });
  }

  /**
   * Spawn NPC customer navigating along streets
   */
  public spawnCustomer(targetPlotId: number, isVip: boolean = false) {
    const entrances = [
      { x: -9, y: 0 },
      { x: 9, y: 0 },
      { x: 0, y: -9 },
      { x: 0, y: 9 },
    ];
    const ent = entrances[Math.floor(Math.random() * entrances.length)];
    const g = new PIXI.Graphics();

    const clothes = isVip
      ? 0xf59e0b // VIP Gold shopper for MagicBlock Blvd
      : [0x38bdf8, 0xa855f7, 0x34d399, 0xf43f5e][Math.floor(Math.random() * 4)];

    g.circle(0, -6, 3);
    g.fill({ color: 0xffedd5 });
    g.roundRect(-3, -2, 6, 7, 2);
    g.fill({ color: clothes });
    g.ellipse(0, 6, 4, 2);
    g.fill({ color: 0x000000, alpha: 0.3 });

    const npc: CustomerNPC = {
      id: Math.random().toString(),
      gridX: ent.x,
      gridY: ent.y,
      targetPlotId,
      speed: 0.05 + Math.random() * 0.03,
      color: clothes,
      graphics: g,
      purchased: false,
      state: "WALKING",
      walkCycle: Math.random() * Math.PI,
      isVip,
    };

    const iso = this.toIso(npc.gridX, npc.gridY);
    g.x = iso.x;
    g.y = iso.y;
    g.zIndex = iso.y;

    this.entityLayer.addChild(g);
    this.npcs.push(npc);
  }

  public setNightMode(night: boolean) {
    this.isNightMode = night;
    this.ambientFilter.clear();
    if (this.app) {
      if (night) {
        // Deep indigo twilight
        this.ambientFilter.rect(0, 0, this.app.screen.width, this.app.screen.height);
        this.ambientFilter.fill({ color: 0x060919, alpha: 0.55 });
      }
    }
  }

  private update(delta: number) {
    this.timeTick += delta * 0.05;

    for (let i = this.npcs.length - 1; i >= 0; i--) {
      const npc = this.npcs[i];
      const targetPlot = this.plots[npc.targetPlotId] || this.plots[0];

      if (npc.state === "WALKING") {
        const dx = targetPlot.gridX - npc.gridX;
        const dy = targetPlot.gridY - npc.gridY;
        const dist = Math.hypot(dx, dy);

        if (dist < 0.6) {
          npc.state = "LEAVING";
          npc.purchased = true;
          sfx.playChing();
        } else {
          npc.gridX += (dx / dist) * npc.speed * delta;
          npc.gridY += (dy / dist) * npc.speed * delta;
          npc.walkCycle += 0.2 * delta;
        }
      } else {
        npc.gridX += 0.06 * delta;
        npc.gridY += 0.06 * delta;

        if (Math.abs(npc.gridX) > 11 || Math.abs(npc.gridY) > 11) {
          this.entityLayer.removeChild(npc.graphics);
          this.npcs.splice(i, 1);
          continue;
        }
      }

      const iso = this.toIso(npc.gridX, npc.gridY);
      npc.graphics.x = iso.x;
      npc.graphics.y = iso.y + Math.sin(npc.walkCycle) * 1.5;
      npc.graphics.zIndex = iso.y;
    }

    this.entityLayer.sortChildren();
  }

  public destroy() {
    window.removeEventListener("resize", this.handleResize);
    this.app?.destroy(true, { children: true, texture: true });
  }
}
