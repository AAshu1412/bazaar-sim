/** The wooden-and-parchment boards that name every shop and landmark on the map. */
import * as PIXI from "pixi.js";
import { uiIcon } from "./shopKinds";

const INK = 0x2a1c15, PAPER = 0xf6ead0, GOLD = 0xffd36b, BERRY = 0xa8372a, LEAF = 0x256b42, MUTED = 0xcbbfa8;
export const SIGN_FONT = "Fredoka, system-ui, sans-serif";

/** A sign has a full board (name / price) and a compact badge used when the map is zoomed far out. */
export interface Sign { root: PIXI.Container; full: PIXI.Container; compact: PIXI.Container; tip: PIXI.Container; width: number }

export const label = (text: string, size: number, fill: number, weight: "500" | "600" | "700" = "600") => {
  const t = new PIXI.Text({ text, style: { fontFamily: SIGN_FONT, fontSize: size, fontWeight: weight, fill }, resolution: 4 });
  t.anchor.set(0, 0.5);
  return t;
};
const icon = (name: string, size: number, x = 0) => {
  const s = PIXI.Sprite.from(uiIcon(name));
  s.anchor.set(0.5);
  s.setSize(size, size);
  s.x = x;
  return s;
};
const board = (x: number, w: number, h: number, fill: number) =>
  new PIXI.Graphics()
    .roundRect(x, -h / 2 + 3, w, h, 10).fill({ color: INK, alpha: 0.35 })
    .roundRect(x, -h / 2, w, h, 10).fill({ color: fill }).stroke({ width: 2.5, color: INK });

export function createSign(): Sign {
  const root = new PIXI.Container(), full = new PIXI.Container(), compact = new PIXI.Container(), tip = new PIXI.Container();
  tip.visible = false; // the shop's name, shown on hover
  root.addChild(full, compact, tip);
  return { root, full, compact, tip, width: 0 };
}
const clear = (s: Sign) => { for (const c of [s.full, s.compact, s.tip]) c.removeChildren().forEach((x) => x.destroy({ children: true })); };

export function drawShopSign(sign: Sign, o: { name: string; icon: string; price: string; stock: number; mine: boolean }) {
  clear(sign);
  const tipText = label(o.name, 12, PAPER);
  const tw = Math.ceil(tipText.width) + 18, ty = o.mine ? -42 : -29;
  tipText.position.set(-tw / 2 + 9, ty);
  sign.tip.addChild(new PIXI.Graphics().roundRect(-tw / 2, ty - 11, tw, 22, 8).fill({ color: INK }), tipText);
  const w = 88, soldOut = o.stock <= 0;
  sign.width = w;
  const fill = soldOut ? BERRY : o.mine ? GOLD : PAPER;
  sign.full.addChild(new PIXI.Graphics().poly([-8, 13, 8, 13, 0, 25]).fill({ color: fill }).stroke({ width: 2.5, color: INK, join: "round" })); // points at its shop
  sign.full.addChild(board(-w / 2, w, 32, fill));
  const t = label(soldOut ? "Sold out" : o.price, soldOut ? 13 : 15, soldOut ? PAPER : INK);
  t.position.set(-w / 2 + 27, soldOut ? 0 : -4);
  sign.full.addChild(t);
  if (!soldOut) {
    const ratio = Math.min(1, o.stock);
    sign.full.addChild(new PIXI.Graphics()
      .roundRect(-w / 2 + 27, 6, 50, 5, 2.5).fill({ color: INK, alpha: 0.22 })
      .roundRect(-w / 2 + 27, 6, Math.max(5, 50 * ratio), 5, 2.5).fill({ color: ratio > 0.35 ? LEAF : ratio > 0.15 ? 0xc9782a : BERRY }));
  }
  sign.full.addChild(icon(o.icon, 38, -w / 2 + 6));
  if (o.mine) {
    const tag = label("YOUR SHOP", 9, PAPER, "700");
    tag.anchor.set(0.5);
    sign.full.addChild(new PIXI.Graphics().roundRect(-31, -29, 62, 15, 6).fill({ color: LEAF }).stroke({ width: 2, color: INK }));
    tag.position.set(0, -21.5);
    sign.full.addChild(tag);
    sign.compact.addChild(new PIXI.Graphics().circle(0, 0, 21).fill({ color: GOLD }).stroke({ width: 2.5, color: INK }));
  }
  sign.compact.addChild(icon(o.icon, o.mine ? 34 : 30));
  if (soldOut) sign.compact.addChild(new PIXI.Graphics().circle(11, -11, 6).fill({ color: BERRY }).stroke({ width: 2, color: PAPER }));
}

export function drawPlaceSign(sign: Sign, o: { icon: string; name: string; soon: boolean }) {
  clear(sign);
  const name = label(o.name, 12, o.soon ? INK : PAPER), soon = o.soon ? label("soon", 9, INK, "500") : null;
  const w = Math.ceil(name.width + (soon ? soon.width + 6 : 0)) + 38;
  sign.width = w;
  sign.full.addChild(board(-w / 2, w, 26, o.soon ? MUTED : 0x6b3f26));
  name.position.set(-w / 2 + 24, 0);
  sign.full.addChild(name);
  if (soon) { soon.alpha = 0.7; soon.position.set(name.x + name.width + 6, 1); sign.full.addChild(soon); }
  sign.full.addChild(icon(o.icon, 32, -w / 2 + 5));
  sign.compact.addChild(icon(o.icon, 26));
  if (o.soon) { sign.full.alpha = 0.85; sign.compact.alpha = 0.55; }
}

export function drawLeaseSign(sign: Sign) {
  clear(sign);
  const t = label("For lease · soon", 12, INK);
  const w = Math.ceil(t.width) + 18;
  sign.width = w;
  t.position.set(-w / 2 + 9, 0);
  sign.full.addChild(board(-w / 2, w, 24, PAPER), t);
}
