/** Night over the town: a darkening sheet, and street lamps that switch on and light what is around them. */
import * as PIXI from "pixi.js";
import { WORLD } from "./surroundings";

const LIT = "/assets/scenery/street-lamp.png", OFF = "/assets/scenery/street-lamp-off.png";
export const lampAssets = [LIT, OFF];
/** darkness at which the lamps switch on */
const SWITCH_ON = 0.08;

function glow(): PIXI.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!, g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(255,196,110,0.85)");
  g.addColorStop(0.35, "rgba(255,170,75,0.34)");
  g.addColorStop(1, "rgba(255,160,60,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return PIXI.Texture.from(canvas);
}

export class Night {
  /** goes above the world and below the shop signs, so signs stay readable after dark */
  public readonly layer = new PIXI.Container();
  private shade = new PIXI.Graphics().rect(WORLD.left, WORLD.top, WORLD.right - WORLD.left, WORLD.bottom - WORLD.top).fill({ color: 0x0a1138 });
  private light = new PIXI.Container();
  private lamps: PIXI.Sprite[] = [];
  private texture: PIXI.Texture | null = null;
  private darkness = 0;
  private target = 0;

  constructor() {
    this.layer.addChild(this.shade, this.light);
    this.layer.eventMode = "none";
    this.apply();
  }

  /** `sprite` is the lamp post; (x, y) is where it stands */
  addLamp(sprite: PIXI.Sprite, x: number, y: number) {
    this.texture ??= glow();
    const spill = (dy: number, w: number, h: number, alpha: number) => {
      const s = new PIXI.Sprite(this.texture!);
      s.anchor.set(0.5);
      s.position.set(x, y + dy);
      s.setSize(w, h);
      s.alpha = alpha;
      s.blendMode = "add";
      this.light.addChild(s);
    };
    spill(0, 230, 122, 0.5); // pool on the ground
    spill(-38, 46, 46, 0.6); // the lamp head
    this.lamps.push(sprite);
    this.apply();
  }

  /** 0 = noon; about 0.5 = late evening. The change is eased in by `step`. */
  set(darkness: number) { this.target = darkness; }
  step(delta: number) {
    if (Math.abs(this.target - this.darkness) < 0.001) return;
    this.darkness += (this.target - this.darkness) * Math.min(1, delta * 0.025);
    this.apply();
  }

  private apply() {
    const on = this.darkness > SWITCH_ON;
    this.shade.alpha = this.darkness;
    this.light.alpha = on ? Math.min(1, (this.darkness - SWITCH_ON) / 0.3) : 0;
    this.light.visible = on;
    const texture = PIXI.Assets.get<PIXI.Texture>(on ? LIT : OFF);
    if (texture) for (const lamp of this.lamps) if (lamp.texture !== texture) lamp.texture = texture;
  }
}
