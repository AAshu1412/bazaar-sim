import * as PIXI from "pixi.js";
import { sfx } from "../audio/sfx";

export interface CustomerNPC {
  id: string;
  gridX: number;
  gridY: number;
  targetStall: number;
  speed: number;
  color: number;
  graphics: PIXI.Graphics;
  purchased: boolean;
  state: "WALKING_TO_STALL" | "LEAVING";
  walkCycle: number;
}

export interface FloatingText {
  container: PIXI.Container;
  yVelocity: number;
  alphaVelocity: number;
}

export class IsometricEngine {
  private app: PIXI.Application | null = null;
  private rootContainer: PIXI.Container = new PIXI.Container();
  private groundLayer: PIXI.Container = new PIXI.Container();
  private shadowLayer: PIXI.Container = new PIXI.Container();
  private entityLayer: PIXI.Container = new PIXI.Container();
  private particleLayer: PIXI.Container = new PIXI.Container();
  private uiLayer: PIXI.Container = new PIXI.Container();

  private tileW = 68;
  private tileH = 34;
  private gridSize = 16;

  // Stalls: 4 corners of intersection
  private stallCoords = [
    { x: -3.8, y: -3.8, name: "Corner Roast (You)", theme: "amber" },
    { x: 3.8, y: -3.8, name: "Undercutter Bot", theme: "blue" },
    { x: -3.8, y: 3.8, name: "Margin Hawk Bot", theme: "emerald" },
    { x: 3.8, y: 3.8, name: "Aggressive Bot", theme: "purple" },
  ];

  private stallContainers: PIXI.Container[] = [];
  private npcs: CustomerNPC[] = [];
  private floatingTexts: FloatingText[] = [];
  private steamParticles: { g: PIXI.Graphics; vx: number; vy: number; life: number; stallIndex: number }[] = [];

  // Weather / Event overlays
  private weatherGlow: PIXI.Graphics = new PIXI.Graphics();
  private rainDrops: { x: number; y: number; speed: number; len: number }[] = [];
  private rainGraphics: PIXI.Graphics = new PIXI.Graphics();
  private timeTick: number = 0;

  private originX = 0;
  private originY = 0;

  public async init(containerElement: HTMLDivElement) {
    const width = containerElement.clientWidth || 920;
    const height = containerElement.clientHeight || 560;

    const app = new PIXI.Application();
    await app.init({
      width,
      height,
      backgroundColor: 0x080c14,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    this.app = app;
    containerElement.appendChild(app.canvas);

    this.originX = width / 2;
    this.originY = height / 2 - 25;

    this.rootContainer.x = this.originX;
    this.rootContainer.y = this.originY;

    this.rootContainer.addChild(this.groundLayer);
    this.rootContainer.addChild(this.shadowLayer);
    this.rootContainer.addChild(this.entityLayer);
    this.rootContainer.addChild(this.particleLayer);
    this.rootContainer.addChild(this.uiLayer);

    this.app.stage.addChild(this.rootContainer);
    this.app.stage.addChild(this.weatherGlow);
    this.app.stage.addChild(this.rainGraphics);

    this.drawIsometricGround();
    this.createStalls();

    // Start render/update loop
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
      this.originX = parent.clientWidth / 2;
      this.originY = parent.clientHeight / 2 - 25;
      this.rootContainer.x = this.originX;
      this.rootContainer.y = this.originY;
    }
  };

  public toIso(gx: number, gy: number): { x: number; y: number } {
    return {
      x: (gx - gy) * (this.tileW / 2),
      y: (gx + gy) * (this.tileH / 2),
    };
  }

  /**
   * Procedural Townscaper/Big Ambitions District Crossroads
   */
  private drawIsometricGround() {
    this.groundLayer.removeChildren();
    const g = new PIXI.Graphics();

    const half = this.gridSize / 2;
    for (let x = -half; x < half; x++) {
      for (let y = -half; y < half; y++) {
        const iso = this.toIso(x, y);

        const isRoadX = Math.abs(x) <= 2;
        const isRoadY = Math.abs(y) <= 2;
        const isRoad = isRoadX || isRoadY;
        const isIntersection = isRoadX && isRoadY;
        const isSidewalkEdge = (Math.abs(x) === 3 && Math.abs(y) <= 3) || (Math.abs(y) === 3 && Math.abs(x) <= 3);

        let fillColor = 0x141c2c; // plaza cobblestone
        let strokeColor = 0x212d45;
        let strokeAlpha = 0.5;

        if (isIntersection) {
          fillColor = 0x101622; // central asphalt junction
        } else if (isRoad) {
          fillColor = 0x181f2f; // asphalt road
        } else if (isSidewalkEdge) {
          fillColor = 0x222d42; // curb border
        }

        g.poly([
          iso.x, iso.y,
          iso.x + this.tileW / 2, iso.y + this.tileH / 2,
          iso.x, iso.y + this.tileH,
          iso.x - this.tileW / 2, iso.y + this.tileH / 2,
        ]);
        g.fill({ color: fillColor });
        g.stroke({ width: 1, color: strokeColor, alpha: strokeAlpha });

        // Yellow Road Markings & Pedestrian Crosswalk stripes
        if (isRoad && !isIntersection) {
          if (x === 0 || y === 0) {
            g.poly([
              iso.x - 3, iso.y + this.tileH / 2 - 1,
              iso.x + 3, iso.y + this.tileH / 2 - 1,
              iso.x + 3, iso.y + this.tileH / 2 + 1,
              iso.x - 3, iso.y + this.tileH / 2 + 1,
            ]);
            g.fill({ color: 0xf59e0b, alpha: 0.8 });
          }
        }
      }
    }

    // Street Props: Lamps, Plant Benches, Bollards
    this.drawTownProps(g);
    this.groundLayer.addChild(g);
  }

  private drawTownProps(g: PIXI.Graphics) {
    const lampPositions = [
      { x: -2.6, y: -2.6 },
      { x: 2.6, y: -2.6 },
      { x: -2.6, y: 2.6 },
      { x: 2.6, y: 2.6 },
    ];

    lampPositions.forEach((lp) => {
      const iso = this.toIso(lp.x, lp.y);

      // Warm ground light bloom pool
      g.ellipse(iso.x, iso.y + 16, 26, 13);
      g.fill({ color: 0xfde047, alpha: 0.09 });

      // Lamp Base & Post
      g.moveTo(iso.x, iso.y + 16);
      g.lineTo(iso.x, iso.y - 32);
      g.stroke({ width: 3, color: 0x334155 });

      // Curved lantern arm
      g.moveTo(iso.x, iso.y - 32);
      g.lineTo(iso.x + 4, iso.y - 36);
      g.lineTo(iso.x + 4, iso.y - 32);
      g.stroke({ width: 2, color: 0x475569 });

      // Glowing Lantern head
      g.circle(iso.x + 4, iso.y - 30, 4);
      g.fill({ color: 0xfef08a, alpha: 0.95 });
    });

    // Planter Benches near sidewalks
    const planterPositions = [
      { x: -1.5, y: -4.5 },
      { x: 1.5, y: -4.5 },
      { x: -1.5, y: 4.5 },
      { x: 1.5, y: 4.5 },
    ];

    planterPositions.forEach((pp) => {
      const iso = this.toIso(pp.x, pp.y);
      // Planter box
      this.drawIsoPrism(g, iso.x, iso.y + 10, 22, 14, 8, 0x1e293b, 0x0f172a, 0x334155);
      // Lush green foliage
      g.circle(iso.x, iso.y - 2, 7);
      g.fill({ color: 0x10b981, alpha: 0.85 });
      g.circle(iso.x + 3, iso.y - 5, 5);
      g.fill({ color: 0x059669, alpha: 0.85 });
    });
  }

  /**
   * Procedural 2.5D Isometric Coffee Stalls (Big Ambitions Aesthetic)
   */
  private createStalls() {
    this.stallContainers = [];

    const stallPalettes = [
      { primary: 0xf59e0b, dark: 0xb45309, roof: 0xd97706, accent: 0xfef08a }, // Stall 0 (Player - Gold)
      { primary: 0x3b82f6, dark: 0x1d4ed8, roof: 0x2563eb, accent: 0x93c5fd }, // Stall 1 (Undercutter - Blue)
      { primary: 0x10b981, dark: 0x047857, roof: 0x059669, accent: 0x6ee7b7 }, // Stall 2 (Margin Hawk - Green)
      { primary: 0x8b5cf6, dark: 0x6d28d9, roof: 0x7c3aed, accent: 0xc4b5fd }, // Stall 3 (Aggressive - Purple)
    ];

    this.stallCoords.forEach((coord, idx) => {
      const container = new PIXI.Container();
      const iso = this.toIso(coord.x, coord.y);
      container.x = iso.x;
      container.y = iso.y;

      const pal = stallPalettes[idx];
      const g = new PIXI.Graphics();

      // Soft stall ambient shadow
      g.ellipse(0, 16, 44, 22);
      g.fill({ color: 0x000000, alpha: 0.45 });

      // Wooden Foundation Deck
      this.drawIsoPrism(g, 0, 12, 52, 34, 7, 0x1e293b, 0x0f172a, 0x334155);

      // Stall Cabin Body
      this.drawIsoPrism(g, 0, 5, 38, 26, 26, pal.dark, 0x111827, pal.primary);

      // Serving Counter Window cut-out
      g.poly([
        -12, 2,
        0, 10,
        0, 0,
        -12, -8,
      ]);
      g.fill({ color: 0x0a0f1d });

      // Striped Awning / Roof Canopy (Townscaper style)
      this.drawIsoCanopy(g, 0, -22, 46, 32, 14, pal.roof, 0xffffff);

      // Espresso Machine on the counter
      g.roundRect(-8, -12, 14, 12, 2);
      g.fill({ color: 0x94a3b8 });
      g.circle(-1, -13, 4);
      g.fill({ color: 0x475569 });

      // Coffee Shop Menu Board Chalkboard
      g.rect(14, -8, 8, 14);
      g.fill({ color: 0x1e293b });
      g.stroke({ width: 1, color: pal.primary });

      container.addChild(g);

      // Floating Billboard UI: Price + Inventory
      const uiContainer = new PIXI.Container();
      uiContainer.y = -72;
      container.addChild(uiContainer);

      container.zIndex = iso.y + 120;
      this.entityLayer.addChild(container);
      this.stallContainers.push(container);
    });

    this.entityLayer.sortableChildren = true;
  }

  private drawIsoPrism(
    g: PIXI.Graphics,
    x: number,
    y: number,
    w: number,
    d: number,
    h: number,
    leftColor: number,
    rightColor: number,
    topColor: number
  ) {
    const hw = w / 2;
    const hd = d / 2;

    // Left face
    g.poly([
      x - hw, y,
      x, y + hd,
      x, y + hd - h,
      x - hw, y - h,
    ]);
    g.fill({ color: leftColor });

    // Right face
    g.poly([
      x, y + hd,
      x + hw, y,
      x + hw, y - h,
      x, y + hd - h,
    ]);
    g.fill({ color: rightColor });

    // Top face
    g.poly([
      x, y - h - hd,
      x + hw, y - h,
      x, y - h + hd,
      x - hw, y - h,
    ]);
    g.fill({ color: topColor });
  }

  private drawIsoCanopy(
    g: PIXI.Graphics,
    x: number,
    y: number,
    w: number,
    d: number,
    h: number,
    color1: number,
    color2: number
  ) {
    const hw = w / 2;
    const hd = d / 2;

    // Slanted Roof
    g.poly([
      x, y - h,
      x + hw, y,
      x, y + hd,
      x - hw, y,
    ]);
    g.fill({ color: color1 });

    // Striped overhang
    g.poly([
      x - hw, y,
      x, y + hd,
      x, y + hd + 5,
      x - hw, y + 5,
    ]);
    g.fill({ color: color2 });
  }

  public updateStallsData(
    stalls: {
      index: number;
      priceCents: number;
      inventory: number;
      revenue: number;
      isFlashSale: boolean;
      isViral: boolean;
    }[],
    localPlayerIndex: number
  ) {
    stalls.forEach((stall) => {
      const container = this.stallContainers[stall.index];
      if (!container) return;

      const ui = container.children[1] as PIXI.Container;
      ui.removeChildren();

      const bg = new PIXI.Graphics();
      const isLocal = stall.index === localPlayerIndex;
      const isSoldOut = stall.inventory <= 0;

      // Local player golden spotlight ground ring
      if (isLocal) {
        const ring = new PIXI.Graphics();
        ring.ellipse(0, 16, 52, 28);
        ring.stroke({ width: 3, color: 0xf59e0b, alpha: 0.95 });
        ring.fill({ color: 0xf59e0b, alpha: 0.16 });
        ui.addChild(ring);
      }

      // Billboard Box
      const boxW = 94;
      const boxH = 40;
      bg.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, 8);
      bg.fill({ color: isSoldOut ? 0x221313 : 0x0b1329, alpha: 0.95 });
      bg.stroke({
        width: isLocal ? 2.5 : 1.2,
        color: isLocal ? 0xf59e0b : stall.isFlashSale ? 0xef4444 : 0x334155,
      });

      ui.addChild(bg);

      // Price Tag Text
      const priceText = isSoldOut
        ? "SOLD OUT"
        : `$${(stall.priceCents / 100).toFixed(2)}`;

      const text = new PIXI.Text({
        text: priceText,
        style: {
          fontFamily: "JetBrains Mono, monospace",
          fontSize: isSoldOut ? 11 : 14,
          fontWeight: "bold",
          fill: isSoldOut
            ? 0xef4444
            : stall.isFlashSale
            ? 0xf87171
            : 0xffffff,
          align: "center",
        },
      });
      text.anchor.set(0.5, 0.5);
      text.y = -7;
      ui.addChild(text);

      // Inventory bar inside billboard
      const barW = 76;
      const barH = 5;
      const barY = 9;
      const barBg = new PIXI.Graphics();
      barBg.roundRect(-barW / 2, barY, barW, barH, 2.5);
      barBg.fill({ color: 0x1e293b });
      ui.addChild(barBg);

      if (stall.inventory > 0) {
        const fillPct = Math.min(1, stall.inventory / 100);
        const barFill = new PIXI.Graphics();
        barFill.roundRect(-barW / 2, barY, barW * fillPct, barH, 2.5);
        barFill.fill({
          color:
            stall.inventory < 15
              ? 0xef4444
              : stall.inventory < 40
              ? 0xf59e0b
              : 0x10b981,
        });
        ui.addChild(barFill);
      }

      // Viral / Flash sale indicators
      if (stall.isViral) {
        const viralBadge = new PIXI.Text({
          text: "🔥 VIRAL 2x",
          style: {
            fontFamily: "Inter, sans-serif",
            fontSize: 9,
            fontWeight: "900",
            fill: 0xf59e0b,
          },
        });
        viralBadge.anchor.set(0.5, 0.5);
        viralBadge.y = -28;
        ui.addChild(viralBadge);
      }
    });
  }

  /**
   * Spawn NPC customer from one of the 4 street crossroads
   */
  public spawnCustomer(targetStall: number) {
    const entrances = [
      { x: 0, y: -7.5 }, // North
      { x: 7.5, y: 0 },  // East
      { x: 0, y: 7.5 },  // South
      { x: -7.5, y: 0 }, // West
    ];

    const entrance = entrances[Math.floor(Math.random() * entrances.length)];
    const g = new PIXI.Graphics();

    // Stylized procedural isometric pedestrians (with head, jacket, shadow)
    const clothes = [0x38bdf8, 0xf43f5e, 0xa855f7, 0x34d399, 0xfbbf24, 0xec4899];
    const color = clothes[Math.floor(Math.random() * clothes.length)];

    g.circle(0, -9, 4); // Head
    g.fill({ color: 0xffedd5 });
    g.roundRect(-4, -4, 8, 10, 3); // Jacket Body
    g.fill({ color });
    g.ellipse(0, 8, 6, 3); // Ground shadow
    g.fill({ color: 0x000000, alpha: 0.35 });

    const npc: CustomerNPC = {
      id: Math.random().toString(),
      gridX: entrance.x,
      gridY: entrance.y,
      targetStall,
      speed: 0.045 + Math.random() * 0.025,
      color,
      graphics: g,
      purchased: false,
      state: "WALKING_TO_STALL",
      walkCycle: Math.random() * Math.PI,
    };

    const iso = this.toIso(npc.gridX, npc.gridY);
    g.x = iso.x;
    g.y = iso.y;
    g.zIndex = iso.y;

    this.entityLayer.addChild(g);
    this.npcs.push(npc);
  }

  public retargetCustomers(newCheapestStall: number) {
    this.npcs.forEach((npc) => {
      if (npc.state === "WALKING_TO_STALL" && npc.targetStall !== newCheapestStall) {
        npc.targetStall = newCheapestStall;
      }
    });
  }

  public spawnSaleParticle(stallIndex: number, amountCents: number) {
    sfx.playChing();

    const container = new PIXI.Container();
    const stallCoord = this.stallCoords[stallIndex];
    const iso = this.toIso(stallCoord.x, stallCoord.y);

    container.x = iso.x;
    container.y = iso.y - 85;

    const text = new PIXI.Text({
      text: `+$${(amountCents / 100).toFixed(2)}`,
      style: {
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 18,
        fontWeight: "900",
        fill: 0x10b981,
        stroke: { color: 0x000000, width: 4 },
      },
    });
    text.anchor.set(0.5, 0.5);
    container.addChild(text);

    this.uiLayer.addChild(container);
    this.floatingTexts.push({
      container,
      yVelocity: -1.4,
      alphaVelocity: -0.018,
    });

    // Spawn subtle espresso steam puffs
    for (let i = 0; i < 3; i++) {
      const steam = new PIXI.Graphics();
      steam.circle(0, 0, 3 + Math.random() * 3);
      steam.fill({ color: 0xffffff, alpha: 0.6 });
      steam.x = iso.x - 4 + (Math.random() * 8);
      steam.y = iso.y - 15;
      this.particleLayer.addChild(steam);
      this.steamParticles.push({
        g: steam,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -0.8 - Math.random() * 0.5,
        life: 1.0,
        stallIndex,
      });
    }
  }

  public animateAuctionDeliveryDrop(stallIndex: number) {
    sfx.playGavel();

    const stallCoord = this.stallCoords[stallIndex];
    const iso = this.toIso(stallCoord.x, stallCoord.y);

    const crate = new PIXI.Graphics();
    this.drawIsoPrism(crate, 0, 0, 22, 16, 16, 0xb45309, 0x78350f, 0xd97706);

    crate.x = iso.x;
    let currentY = iso.y - 140;
    crate.y = currentY;
    this.entityLayer.addChild(crate);

    const dropTicker = () => {
      currentY += 7;
      crate.y = currentY;
      if (currentY >= iso.y - 20) {
        this.app?.ticker.remove(dropTicker);
        this.spawnSaleParticle(stallIndex, 0);
        setTimeout(() => {
          this.entityLayer.removeChild(crate);
        }, 1500);
      }
    };
    this.app?.ticker.add(dropTicker);
  }

  public setWeatherEvent(event: string) {
    if (!this.app) return;
    this.weatherGlow.clear();

    const w = this.app.screen.width;
    const h = this.app.screen.height;

    if (event === "DemandSurge") {
      this.weatherGlow.rect(0, 0, w, h);
      this.weatherGlow.fill({ color: 0xf59e0b, alpha: 0.14 });
      sfx.playVrfAlert();
    } else if (event === "DemandDrop") {
      this.weatherGlow.rect(0, 0, w, h);
      this.weatherGlow.fill({ color: 0x1e3a8a, alpha: 0.22 });
      sfx.playVrfAlert();
      this.initRain();
    } else {
      this.rainDrops = [];
      this.rainGraphics.clear();
    }
  }

  private initRain() {
    this.rainDrops = [];
    if (!this.app) return;
    for (let i = 0; i < 90; i++) {
      this.rainDrops.push({
        x: Math.random() * this.app.screen.width,
        y: Math.random() * this.app.screen.height,
        speed: 7 + Math.random() * 8,
        len: 12 + Math.random() * 12,
      });
    }
  }

  private update(delta: number) {
    this.timeTick += delta * 0.05;

    // 1. Move NPCs toward target stall
    for (let i = this.npcs.length - 1; i >= 0; i--) {
      const npc = this.npcs[i];
      const target = this.stallCoords[npc.targetStall];

      if (npc.state === "WALKING_TO_STALL") {
        const dx = target.x - npc.gridX;
        const dy = target.y - npc.gridY;
        const dist = Math.hypot(dx, dy);

        if (dist < 0.65) {
          npc.state = "LEAVING";
          npc.purchased = true;
          this.spawnSaleParticle(npc.targetStall, 300);
        } else {
          npc.gridX += (dx / dist) * npc.speed * delta;
          npc.gridY += (dy / dist) * npc.speed * delta;
          npc.walkCycle += 0.2 * delta;
        }
      } else {
        npc.gridX += 0.05 * delta;
        npc.gridY += 0.05 * delta;

        if (Math.abs(npc.gridX) > 9.5 || Math.abs(npc.gridY) > 9.5) {
          this.entityLayer.removeChild(npc.graphics);
          this.npcs.splice(i, 1);
          continue;
        }
      }

      const iso = this.toIso(npc.gridX, npc.gridY);
      npc.graphics.x = iso.x;
      // Slight vertical bobbing walk animation
      npc.graphics.y = iso.y + Math.sin(npc.walkCycle) * 1.5;
      npc.graphics.zIndex = iso.y;
    }

    // 2. Floating text particles
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.container.y += ft.yVelocity * delta;
      ft.container.alpha += ft.alphaVelocity * delta;

      if (ft.container.alpha <= 0) {
        this.uiLayer.removeChild(ft.container);
        this.floatingTexts.splice(i, 1);
      }
    }

    // 3. Steam particles
    for (let i = this.steamParticles.length - 1; i >= 0; i--) {
      const st = this.steamParticles[i];
      st.g.x += st.vx * delta;
      st.g.y += st.vy * delta;
      st.life -= 0.02 * delta;
      st.g.alpha = st.life * 0.6;
      st.g.scale.set(1 + (1 - st.life) * 0.8);

      if (st.life <= 0) {
        this.particleLayer.removeChild(st.g);
        this.steamParticles.splice(i, 1);
      }
    }

    // 4. Rain
    if (this.rainDrops.length > 0 && this.app) {
      this.rainGraphics.clear();
      const h = this.app.screen.height;
      this.rainDrops.forEach((drop) => {
        drop.y += drop.speed * delta;
        drop.x -= 1.5 * delta;
        if (drop.y > h) {
          drop.y = -10;
          drop.x = Math.random() * (this.app?.screen.width || 800);
        }
        this.rainGraphics.moveTo(drop.x, drop.y);
        this.rainGraphics.lineTo(drop.x - 2, drop.y + drop.len);
        this.rainGraphics.stroke({ width: 1.2, color: 0x93c5fd, alpha: 0.4 });
      });
    }

    this.entityLayer.sortChildren();
  }

  public destroy() {
    window.removeEventListener("resize", this.handleResize);
    this.app?.destroy(true, { children: true, texture: true });
  }
}
