/**
 * The story: who says what, where the camera goes, and what the player must actually do to move on.
 * Pure data and checks (no React), so `npm run check` can walk through it.
 */
import type { PlaceId } from "../engine/shopKinds";

export const CAST = {
  ravi: { name: "Uncle Ravi", role: "Retired shopkeeper, your mentor" },
  mira: { name: "Mira", role: "Runs Mocha Corner" },
  quill: { name: "Mr. Quill", role: "Town auctioneer" },
  fennick: { name: "Madame Fennick", role: "Manager of the bank" },
} as const;
export type Speaker = keyof typeof CAST;

/** plot numbers the story points at */
export const MY_PLOT = 0, MIRA_PLOT = 10, EMPTY_PLOT = 9;

/** what the story can see of the game */
export interface World {
  live: boolean;
  /** the shop is on the Ephemeral Rollup, so auctions, rent, events and Settle exist */
  rollup: boolean;
  selected: number | null;
  selectedEmpty: boolean;
  boardOpen: boolean;
  reportsFor: number | null;
  auctionOpen: boolean;
  eventActive: boolean;
  myPrice: number;
  /** totals since the visit began */
  sold: number;
  stockSpend: number;
  /** things that have happened (counted from the activity feed and clicks) */
  marks: { auction: number; rent: number; settle: number; bank: number };
}

/** "Show me" buttons */
export type Action = "shop" | "board" | "reports" | "auction" | "mira" | "lot" | "bank" | "town" | "close" | "dismiss";

export interface Task {
  text: string;
  hint?: string;
  show?: Action;
  /** `start` is the world as it was when this task appeared */
  done: (now: World, start: World) => boolean;
}
export interface Beat {
  who: Speaker;
  say: string;
  task?: Task;
  /** where the camera looks, and what gets the bouncing arrow */
  look?: number | PlaceId | "town";
  /** data-tour name of a piece of the interface to ring */
  spot?: string;
  /** a window or panel this line talks about: opened for the player */
  open?: Action;
  /** only possible on the rollup; otherwise the task is skipped */
  rollup?: boolean;
}
export interface Chapter { title: string; reward: string; beats: Beat[] }

export const CHAPTERS: Chapter[] = [
  {
    title: "The Keys",
    reward: "Keyholder",
    beats: [
      { who: "ravi", look: "town", say: "There you are! Forty years I swept that doorstep, and now it's yours. Welcome to Bazaar, kid. Sit, sit. Actually, don't. You've got a shop to run." },
      { who: "ravi", look: "town", say: "Four quarters, one fountain, and more opinions about coffee than any town needs. Those people walking in from the gates? Every one of them is a sale you can win or lose." },
      { who: "ravi", spot: "stats", say: "Up here is your life in three numbers: your cash, your stock, your price. The cash is yours, written on Solana as GD tokens. You started with $10,000 and spent $5,000 on the plot and the shop." },
      { who: "ravi", spot: "clock", say: "And that's the town clock. A whole day passes in two and a half minutes, six in the morning to ten at night. What people want changes by the hour, so keep one eye on it." },
      { who: "ravi", look: MY_PLOT, spot: "dock-myshop", say: "Enough from me. Go and look at your shop. The one under the arrow. Yes, that one. Don't let it hear you ask.", task: { text: "Open your shop", hint: "Click Corner Roast, or the My shop button", show: "shop", done: (w) => w.selected === MY_PLOT } },
    ],
  },
  {
    title: "Behind the Counter",
    reward: "Barista",
    beats: [
      { who: "ravi", look: MY_PLOT, spot: "price", open: "shop", say: "Your price. The single most powerful thing in your hands. Five cents up or down changes who walks through your door. Don't touch it yet. A good shopkeeper looks before they fiddle." },
      { who: "ravi", spot: "today", open: "shop", say: "Today's ledger: cups sold, money taken, and your share of the coffee drinkers. Share is the one I watched. Money tells you what happened; share tells you who's winning." },
      { who: "ravi", spot: "rent", open: "shop", say: "And the part nobody frames on the wall: rent. Twenty dollars every day, collected whether you sold a cup or not. We'll watch the collector arrive later." },
      { who: "ravi", say: "Your corner is worth money by itself. Two busy streets meet there, so people favour you as if you were 45 cents cheaper than the same shop down an alley. I fought hard for that corner. Well, I bought it first." },
    ],
  },
  {
    title: "Who Walks In",
    reward: "First Sale",
    beats: [
      { who: "ravi", look: MY_PLOT, say: "See the little picture over each head? That's what they came for. A cup means coffee. A burger means they're walking straight past you, and that's fine." },
      { who: "ravi", spot: "clock", say: "Mornings are coffee: more than half the town wants a cup. Lunch belongs to the food stalls, evenings to food and flowers. Stock up before your rush, never during it." },
      { who: "ravi", say: "Each of them carries a budget. Charge more than they'll pay and they sigh and leave. You'll see it float up over your door: Too pricey. Hurts the first time. Hurts every time." },
      { who: "ravi", look: MY_PLOT, say: "Now stand back and watch your door. Nothing in this world sounds like your own first coin.", task: { text: "Sell a cup of coffee", hint: "Close any panels and watch the crowd. The morning rush helps.", show: "close", done: (w, s) => w.sold > s.sold } },
      { who: "ravi", say: "HA! Hear that? That one went straight from the town into your account. I'd frame it, but you'll want to spend it." },
    ],
  },
  {
    title: "The Neighbours",
    reward: "Street Smart",
    beats: [
      { who: "ravi", spot: "dock-town", say: "You are not the only kettle in town. Open the town board. It lists every shop, cheapest first. Know your neighbours before they know you.", task: { text: "Open the town board", show: "board", done: (w) => w.boardOpen } },
      { who: "ravi", look: MIRA_PLOT, say: "Three rival coffee houses. The loudest is Mocha Corner. Go say hello. Be polite. Count their cups.", task: { text: "Visit Mocha Corner", hint: "Click the coffee house under the arrow", show: "mira", done: (w) => w.selected === MIRA_PLOT } },
      { who: "mira", look: MIRA_PLOT, say: "So YOU'RE Ravi's replacement! Cute. I roast at dawn, I sell all day, and I'm cheaper than your uncle ever was. Look all you like. Everyone does." },
      { who: "mira", spot: "analytics", open: "mira", say: "Oh, you can even read my books from here: sales, share, where my customers go. Transparency, darling. Won't help you." },
      { who: "ravi", say: "Don't let her rattle you. Every night the rivals refill their shelves and change their prices: up after a busy day, down after a slow one. Yesterday's perfect price may be wrong today." },
    ],
  },
  {
    title: "Read the Numbers",
    reward: "Analyst",
    beats: [
      { who: "ravi", spot: "dock-reports", say: "Guessing is for people with spare money. Open your reports.", task: { text: "Open your reports", show: "reports", done: (w) => w.reportsFor === MY_PLOT } },
      { who: "ravi", open: "reports", say: "Top row: what you sold and what you kept. Below: coffee drinkers hour by hour, blue came to you, orange didn't. Then where the others went. 'Your price too high' is the town telling you something." },
      { who: "ravi", spot: "advisor", open: "reports", say: "And here's my favourite toy: the price advisor. It marches six hundred imaginary shoppers past today's rivals at every price. The diamond marks the most profit, not the most cups. Those are rarely the same." },
      { who: "ravi", spot: "advisor", open: "reports", say: "Your turn. Change your price: take the advisor's button, or trust your gut on the shop panel. Either way, own it.", task: { text: "Change your price", hint: "Use 'Set price' in reports, or + and − on your shop", show: "reports", done: (w, s) => w.myPrice !== s.myPrice } },
      { who: "ravi", say: "Did a window pop up asking you to approve that? No. You approved once, when you started your session. Your session key signs the rest, and it can only play this game." },
    ],
  },
  {
    title: "Never Run Dry",
    reward: "Quartermaster",
    beats: [
      { who: "ravi", look: MY_PLOT, spot: "restock", say: "An empty shelf is the most expensive thing a shop can own. Twenty more units cost about $27, near $1.37 a cup. Open your shop and restock.", task: { text: "Restock your shelves", hint: "My shop, then Restock +20", show: "shop", done: (w, s) => w.stockSpend > s.stockSpend } },
      { who: "ravi", say: "That money goes to the town treasury, the same purse your customers are paid from. Round and round it goes. Your job is to keep a little more each lap." },
      { who: "ravi", say: "Shelves hold two hundred. The sign over your door turns orange when you run low, and red when you're out. Rivals notice. Customers notice faster." },
    ],
  },
  {
    title: "Going Once",
    reward: "Bidder",
    beats: [
      { who: "quill", look: "auction", spot: "dock-auction", say: "Mr. Quill, auctioneer. A hundred units on the block, sold to whoever wants them most. Step into my hall.", task: { text: "Open the wholesale auction", show: "auction", done: (w) => w.auctionOpen } },
      { who: "quill", rollup: true, say: "Write your bid. Three rival bidders will answer between sixty and a hundred and nineteen percent of what the lot is worth. Their bids do not exist until yours is locked in. MagicBlock's randomness draws them afterwards. Nobody peeks. Not even me." },
      { who: "quill", rollup: true, say: "Highest bid takes the crates. Lose, and every cent comes back. Bid when ready.", task: { text: "Place a bid and see the result", hint: "Win or lose, either counts", show: "auction", done: (w, s) => w.marks.auction > s.marks.auction } },
      { who: "ravi", say: "Win cheap and you've bought tomorrow's profit today. Win dear and you've bought a story. Both are education." },
    ],
  },
  {
    title: "Rent Day",
    reward: "Tenant in Good Standing",
    beats: [
      { who: "ravi", rollup: true, say: "Remember the collector? There isn't one. MagicBlock's scheduler, a crank, charges your rent on the rollup every game day. No clerk, no server of ours, no forgetting." },
      { who: "ravi", rollup: true, spot: "activity", say: "Keep trading. Within a couple of days you'll see 'Rent paid' arrive in your activity feed all by itself. If you can't afford it, it waits for you. It always waits.", task: { text: "Wait for rent to be collected", hint: "Up to five minutes after connecting. Skip if you'd rather carry on.", show: "close", done: (w, s) => w.marks.rent > 0 || w.marks.rent > s.marks.rent } },
      { who: "ravi", say: "One warning: walk away and the rent keeps coming for up to half an hour. Close shop when you mean it." },
    ],
  },
  {
    title: "The Town Has Moods",
    reward: "Weather Eye",
    beats: [
      { who: "ravi", rollup: true, say: "Every minute or so the town changes its mind: a market rush, a rainy spell, a bargain frenzy, one shop suddenly the talk of the square. MagicBlock draws it at random, so nobody can rig it. Not Mira. Not you." },
      { who: "ravi", rollup: true, spot: "event", say: "Wait for the next one. A golden banner appears up top, with a bar counting down how long it lasts.", task: { text: "Catch a town event", hint: "One arrives about every minute", show: "close", done: (w) => w.eventActive } },
      { who: "ravi", say: "In a bargain frenzy, cut. In a supply scare, people put up with more, so charge it. Reading the mood is the difference between a shopkeeper and a shelf." },
    ],
  },
  {
    title: "Bank Your Earnings",
    reward: "Bookkeeper",
    beats: [
      { who: "ravi", rollup: true, say: "A secret about your shop: while you trade, it lives on an Ephemeral Rollup, a fast side counter next to Solana. That's why prices and sales land in a blink. Your cash is held by the town while you're there." },
      { who: "ravi", rollup: true, spot: "settle", say: "Settle brings the shop home: your earnings are paid into your token account on devnet, written for good, and the shop goes straight back to the rollup. Press it.", task: { text: "Press Settle", hint: "Top right. It takes a few seconds.", show: "close", done: (w, s) => w.marks.settle > s.marks.settle } },
      { who: "ravi", say: "Done in one move: the rollup closed the books and a Magic Action paid you on the other side. The game also saves a copy home every few minutes while you play." },
    ],
  },
  {
    title: "Room to Grow",
    reward: "Visionary",
    beats: [
      { who: "ravi", look: MY_PLOT, spot: "signage", open: "shop", say: "Someday, signage. A thousand dollars, and shoppers treat you as 35 cents cheaper than you are. Handsome building too. It earns back slowly, so buy it with spare money, not rent money." },
      { who: "ravi", look: EMPTY_PLOT, say: "Now look at the empty lots. Go on, click the one with the arrow.", task: { text: "Inspect an empty lot", show: "lot", done: (w) => w.selectedEmpty } },
      { who: "ravi", spot: "traffic", open: "lot", say: "Foot traffic, one to four. It's the first thing to check and the thing you can never change afterwards. A cheap alley lot costs you every single day." },
      { who: "ravi", say: "Leasing them isn't open yet. When it is, you'll want money you haven't earned yet. Which brings me to a woman who has some." },
    ],
  },
  {
    title: "The Vault Next Door",
    reward: "Friend of the Bank",
    beats: [
      { who: "ravi", look: "bank", say: "The stone building beside you. Knock. Be on your best behaviour, she counts your buttons.", task: { text: "Visit the bank", hint: "Click the building under the arrow", show: "bank", done: (w, s) => w.marks.bank > s.marks.bank } },
      { who: "fennick", look: "bank", say: "Ah. Ravi's protégé. Our vault is not yet open to the public, so do wipe your feet and lower your expectations. For now." },
      { who: "fennick", say: "But soon: loans against a shop that proves itself. Fresh capital for stock, signage, a second counter. I shall be reading your sales, your share, and whether your rent arrives on time." },
      { who: "fennick", look: "district", say: "And beyond the east gate, behind that mist, a whole district waits to be leased. Managers to run your counters. Partners to be courted. Capital goes where the books are tidy. Keep yours tidy." },
      { who: "mira", look: MIRA_PLOT, say: "A loan? For YOU? Ha! ...Wait. Is she offering them to everyone? Madame! Madame, a word!" },
      { who: "ravi", look: MY_PLOT, say: "That's everything I know, kid, and a few things I made up. Price with your head, restock before the rush, pay the rent, and never let Mira see you sweat. The shop is yours." },
    ],
  },
];

export const BEATS = CHAPTERS.flatMap((c, chapter) => c.beats.map((b, i) => ({ ...b, chapter, first: i === 0, last: i === c.beats.length - 1 })));
export const chapterStart = (chapter: number) => BEATS.findIndex((b) => b.chapter === chapter);
/** a rollup-only task cannot be done without the rollup */
export const taskOf = (beat: Beat, w: World) => (beat.task && !(beat.rollup && !w.rollup) ? beat.task : undefined);
