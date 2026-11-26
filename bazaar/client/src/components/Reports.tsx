import React, { useState } from "react";
import { useStats, profitOf, shopOn, type ShopDay } from "../store/statsStore";
import { OPEN_HOUR, priceCurve, type Seller } from "../engine/economy";
import { price, shopKind, money as cash } from "../engine/shopKinds";
import { Modal, PanelHead } from "./ui";

// validated on the parchment surface (CVD and contrast): you vs everyone else
const YOU = "#2f5f9a", OTHERS = "#c9701f", GONE = "#8a7560";
const usd = (cents: number) => cash(cents / 100);
const hh = (i: number) => `${String(OPEN_HOUR + i).padStart(2, "0")}:00`;
const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0);

const Section: React.FC<{ title: string; note?: React.ReactNode; tour?: string; children: React.ReactNode }> = ({ title, note, tour, children }) => (
  <section data-tour={tour} className="well p-3">
    <h3 className="font-display text-base font-semibold leading-tight">{title}</h3>
    {note && <p className="mb-2 text-xs font-bold text-soft">{note}</p>}
    {children}
  </section>
);
const Key: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm" style={{ background: color }} aria-hidden />{label}</span>
);

/** Stacked columns: shoppers who wanted your trade, hour by hour. */
const ByHour: React.FC<{ day: ShopDay; who: string }> = ({ day, who }) => {
  const [at, setAt] = useState<number | null>(null);
  const max = Math.max(4, ...day.hours.map((h) => h.mine + h.others));
  const h = at === null ? null : day.hours[at];
  return (
    <>
      <div className="flex justify-between gap-2 text-xs font-bold">
        <div className="flex gap-3"><Key color={YOU} label={`Came to ${who}`} /><Key color={OTHERS} label="Did not" /></div>
        <span aria-live="polite" className="tabular-nums">{h ? `${hh(at!)} · ${h.mine} came, ${h.others} did not` : `Peak: ${max} an hour`}</span>
      </div>
      <div className="mt-2 flex h-28 items-end gap-1 border-b border-ink/40" onPointerLeave={() => setAt(null)}>
        {day.hours.map((v, i) => (
          <button key={i} type="button" aria-label={`${hh(i)}: ${v.mine} came to ${who}, ${v.others} did not`} onPointerEnter={() => setAt(i)} onFocus={() => setAt(i)} onBlur={() => setAt(null)}
            className={`flex h-full flex-1 flex-col items-center justify-end gap-[2px] rounded-t ${at === i ? "bg-ink/10" : ""}`}>
            {v.others > 0 && <span className="w-full max-w-[22px] rounded-t" style={{ height: `${(v.others / max) * 100}%`, background: OTHERS }} />}
            {v.mine > 0 && <span className={`w-full max-w-[22px] ${v.others ? "" : "rounded-t"}`} style={{ height: `${(v.mine / max) * 100}%`, background: YOU }} />}
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] font-bold text-soft"><span>06:00</span><span>10:00</span><span>14:00</span><span>18:00</span><span>21:00</span></div>
    </>
  );
};

/** Horizontal bars: every destination of the shoppers who wanted your trade. */
const WhereTheyWent: React.FC<{ day: ShopDay; mine: boolean }> = ({ day, mine }) => {
  const rows = [
    { name: mine ? "Your shop" : "This shop", n: day.won, color: YOU },
    ...Object.entries(day.rivals).sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, n, color: OTHERS })),
    { name: mine ? "Your price too high" : "Its price too high", n: day.tooPricey, color: GONE },
    { name: mine ? "You were sold out" : "It was sold out", n: day.soldOut, color: GONE },
  ];
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <ul className="space-y-1.5">
      {rows.map((r) => (
        <li key={r.name} className="grid grid-cols-[minmax(0,11rem)_1fr_5.5rem] items-center gap-2 text-xs font-bold">
          <span className="truncate">{r.name}</span>
          <span className="h-4"><span className="block h-full rounded-r" style={{ width: `${(r.n / max) * 100}%`, background: r.color }} /></span>
          <span className="text-right tabular-nums">{r.n} · {pct(r.n, day.wanted)}%</span>
        </li>
      ))}
    </ul>
  );
};

/** Line: expected profit at each price against today's rivals, with your price and the best one marked. */
const PriceAdvisor: React.FC<{ sellers: Seller[]; unitCostCents: number; onSetPrice: (cents: number) => void }> = ({ sellers, unitCostCents, onSetPrice }) => {
  const mine = sellers.find((s) => s.id === 0);
  const [at, setAt] = useState<number | null>(null);
  if (!mine) return null;
  const prices = Array.from({ length: 26 }, (_, i) => 200 + i * 10);
  const curve = priceCurve(sellers, 0, unitCostCents, prices);
  const best = curve.reduce((a, b) => (b.profitPer100 > a.profitPer100 ? b : a));
  const now = priceCurve(sellers, 0, unitCostCents, [mine.priceCents])[0];
  const W = 640, H = 150, top = 18, max = Math.max(1, best.profitPer100, now.profitPer100);
  const x = (c: number) => 8 + ((c - 200) / 250) * (W - 16);
  const y = (v: number) => H - 6 - (Math.max(0, v) / max) * (H - top - 6);
  const shown = at === null ? null : curve[at];
  const better = best.profitPer100 > now.profitPer100 * 1.03 && best.priceCents !== mine.priceCents;
  return (
    <>
      <p aria-live="polite" className="text-xs font-bold tabular-nums">
        {shown
          ? `At ${price(shown.priceCents)}: you win ${Math.round(shown.share * 100)}% of coffee shoppers, ${usd(shown.profitPer100)} profit per 100`
          : `At ${price(mine.priceCents)} you win about ${Math.round(now.share * 100)}% of coffee shoppers: ${usd(now.profitPer100)} profit per 100`}
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full" role="img" aria-label={`Expected profit by price. Highest at ${price(best.priceCents)}.`} onPointerLeave={() => setAt(null)}>
        <line x1="0" x2={W} y1={H - 6} y2={H - 6} stroke="#2a1c15" strokeOpacity=".4" />
        {shown && <line x1={x(shown.priceCents)} x2={x(shown.priceCents)} y1={top} y2={H - 6} stroke="#2a1c15" strokeOpacity=".35" />}
        <polyline points={curve.map((c) => `${x(c.priceCents)},${y(c.profitPer100)}`).join(" ")} fill="none" stroke={YOU} strokeWidth="2" strokeLinejoin="round" />
        <path d={`M${x(best.priceCents)} ${y(best.profitPer100) - 7}l7 7l-7 7l-7 -7Z`} fill={OTHERS} stroke="#f6ead0" strokeWidth="2" />
        <circle cx={x(mine.priceCents)} cy={y(now.profitPer100)} r="6" fill={YOU} stroke="#f6ead0" strokeWidth="2" />
        <text x={Math.min(W - 70, Math.max(70, x(best.priceCents)))} y="11" textAnchor="middle" fontSize="12" fontWeight="700" fill="#2a1c15">Best {price(best.priceCents)}</text>
        {curve.map((c, i) => <rect key={c.priceCents} x={x(c.priceCents) - 12} y="0" width="24" height={H} fill="transparent" onPointerEnter={() => setAt(i)} />)}
      </svg>
      <div className="flex justify-between text-[11px] font-bold text-soft"><span>$2.00</span><span>$2.50</span><span>$3.00</span><span>$3.50</span><span>$4.00</span><span>$4.50</span></div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-3 text-xs font-bold"><span><span aria-hidden style={{ color: YOU }}>● </span>your price</span><span><span aria-hidden style={{ color: OTHERS }}>◆ </span>best for profit</span></div>
        <button className="btn btn-gold" disabled={!better} onClick={() => onSetPrice(best.priceCents)}>{better ? `Set price to ${price(best.priceCents)}` : "Your price is about right"}</button>
      </div>
    </>
  );
};

export interface ReportShop { id: number; type: string; name: string; sub: string }

/** The books of one shop: yours (with profit and the price advisor) or a rival's. */
export const Reports: React.FC<{ shop: ReportShop; sellers: Seller[]; unitCostCents: number; onSetPrice: (cents: number) => void; onClose: () => void }> = ({ shop, sellers, unitCostCents, onSetPrice, onClose }) => {
  const days = useStats((s) => s.days);
  const [pick, setPick] = useState<number | null>(null); // null follows today
  const picked = days.find((d) => d.day === pick) ?? days[days.length - 1];
  const today = days[days.length - 1].day;
  const day = shopOn(picked, shop.id);
  const mine = shop.id === 0, kind = shopKind(shop.type), trade = kind.label.toLowerCase();
  const money = (d: ShopDay) => (mine ? profitOf(d) : d.revenue);
  const max = Math.max(1, ...days.map((d) => Math.abs(money(shopOn(d, shop.id)))));

  return (
    <Modal label={`${shop.name} analytics`} onClose={onClose} className="max-w-2xl">
      <PanelHead icon={kind.icon} title={shop.name} sub={`${shop.sub} · analytics, this visit`} onClose={onClose} />
      <div className="space-y-3 overflow-y-auto p-4">
        {days.length > 1 && (
          <div role="group" aria-label="Day" className="flex flex-wrap gap-2">
            {days.map((d) => (
              <button key={d.day} aria-pressed={d.day === picked.day} onClick={() => setPick(d.day === today ? null : d.day)} className={`btn ${d.day === picked.day ? "btn-gold" : ""}`}>
                {d.day === today ? "Today" : `Day ${d.day}`}
              </button>
            ))}
          </div>
        )}
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["Sales", String(day.sold), ""],
            ["Revenue", usd(day.revenue), ""],
            mine ? ["Profit", usd(profitOf(day)), profitOf(day) < 0 ? "text-berry" : ""] : ["Price", price(sellers.find((s) => s.id === shop.id)?.priceCents ?? day.price), ""],
            ["Market share", day.wanted ? `${pct(day.won, day.wanted)}%` : "—", ""],
          ].map(([k, v, tone]) => (
            <div key={k} className="well px-3 py-2">
              <dt className="text-[11px] font-extrabold uppercase tracking-wide text-soft">{k}</dt>
              <dd className={`font-display text-2xl font-semibold ${tone}`}>{v}</dd>
            </div>
          ))}
        </dl>
        {mine && <p className="text-xs font-bold text-soft">Spent on stock {picked.day === today ? "today" : `on day ${picked.day}`}: {usd(day.stockSpend)}. Rent paid: {usd(day.rent)}. Profit is revenue minus rent and the wholesale cost of units sold.</p>}

        {day.wanted === 0 ? (
          <p className="well p-4 text-sm font-bold">No {trade} shoppers yet. Charts fill in as people arrive.</p>
        ) : (
          <>
            <Section title="Shoppers by hour" note={`Everyone who wanted ${trade}`}><ByHour day={day} who={mine ? "you" : "this shop"} /></Section>
            <Section title="Where they went" note={`${day.wanted} shoppers wanted ${trade}`}><WhereTheyWent day={day} mine={mine} /></Section>
          </>
        )}
        {mine && (
          <Section tour="advisor" title="Price advisor" note="A simulation of shoppers against today's rival prices and stock, with no city event">
            <PriceAdvisor sellers={sellers} unitCostCents={unitCostCents} onSetPrice={onSetPrice} />
          </Section>
        )}
        {days.length > 1 && (
          <Section title={mine ? "Profit by day" : "Revenue by day"} note="With the price and sales under each day; today is still running">
            <div className="flex h-32 items-end gap-3 border-b border-ink/40">
              {days.map((d) => {
                const v = money(shopOn(d, shop.id));
                return (
                  <div key={d.day} className="flex h-full flex-1 flex-col items-center justify-end">
                    <span className="text-xs font-bold tabular-nums">{usd(v)}</span>
                    <span className="w-full max-w-[24px] rounded-t" style={{ height: `${(Math.abs(v) / max) * 80}%`, background: v < 0 ? "#a8372a" : YOU }} />
                  </div>
                );
              })}
            </div>
            <div className="mt-1 flex gap-3 text-center text-[11px] font-bold text-soft">
              {days.map((d) => { const v = shopOn(d, shop.id); return <span key={d.day} className="flex-1">Day {d.day}<br />{v.price ? price(v.price) : "—"} · {v.sold} sold</span>; })}
            </div>
          </Section>
        )}
      </div>
    </Modal>
  );
};
