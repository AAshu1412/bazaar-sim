// npm run check: sanity checks for the demand model (node strips the TypeScript types itself)
import assert from "node:assert/strict";
import { TRADES, clockAt, period, pickTrade, chooseShop, outcomeFor, priceCurve, nextRivalPrice, seeded, CALM, DAY_SECONDS } from "../src/engine/economy.ts";

assert.deepEqual(clockAt(0), { day: 1, hour: 6 });
assert.equal(clockAt(DAY_SECONDS - 0.01).hour, 21);
assert.equal(clockAt(DAY_SECONDS).day, 2);
for (let h = 6; h < 22; h++) assert.equal(period(h).weights.reduce((a, b) => a + b), 100);
const rnd = seeded(1);
for (let i = 0; i < 500; i++) assert.ok(TRADES.includes(pickTrade(8, rnd)));

const me = { id: 0, type: "CoffeeCart", priceCents: 300, stock: 10, tier: "Corner", brand: false };
const rival = { id: 5, type: "CoffeeCart", priceCents: 290, stock: 10, tier: "MainStreet", brand: false };
const books = { id: 4, type: "Bookshop", priceCents: 100, stock: 10, tier: "Corner", brand: true };
for (let i = 0; i < 500; i++) assert.notEqual(chooseShop([me, rival, books], "CoffeeCart", CALM, rnd).winner?.id, 4, "coffee shoppers never buy books");
assert.equal(chooseShop([{ ...me, priceCents: 900 }], "CoffeeCart", CALM, rnd).winner, null, "nobody pays far over the going rate");
assert.equal(outcomeFor({ ...me, stock: 0 }, { winner: rival, budget: 400 }), "soldout");
assert.equal(outcomeFor({ ...me, priceCents: 500 }, { winner: rival, budget: 400 }), "price");
assert.equal(outcomeFor(me, { winner: rival, budget: 400 }), "rival");

const curve = priceCurve([me, rival, books], 0, 137, [220, 260, 300, 340, 380, 420]);
for (let i = 1; i < curve.length; i++) assert.ok(curve[i].share <= curve[i - 1].share + 1e-9, "dearer never wins more shoppers");
const best = curve.reduce((a, b) => (b.profitPer100 > a.profitPer100 ? b : a));
assert.ok(best.priceCents > 220 && best.priceCents < 420, "profit peaks between the extremes");

assert.equal(nextRivalPrice(300, 40, 45, "CoffeeCart"), 310);
assert.equal(nextRivalPrice(300, 0, 45, "CoffeeCart"), 290);
assert.equal(nextRivalPrice(255, 0, 45, "CoffeeCart"), 255);
console.log("economy ok:", curve.map((c) => `$${c.priceCents / 100} ${Math.round(c.share * 100)}%`).join(" | "), "-> best $" + best.priceCents / 100);
