import { shell, finish, barrel, sack, crate, counter, table, shelf, bottle, jar, loaf, book, books, coins, candle, kettle, clockI, gear, crystalI, plantPot, hanging, ladder, banner, rugI, hangRug, flameI } from "./interior.mjs";
import { shade } from "./engine.mjs";
const O = "#2a1c15";
const poly = (S, pts, fill, sw = 2) => S.add(`<polygon points="${pts.map((p) => p.join(",")).join(" ")}" fill="${fill}" stroke="${O}" stroke-width="${sw}" stroke-linejoin="round"/>`);

export const INTERIORS = {
  "coffee-cart": (S) => {
    shell(S, { wall: "plank", wc: "#c49a6c", floor: "#7a5a3a", windows: [215], lamps: [384, 556] });
    shelf(S, 470, 142, 190); shelf(S, 470, 210, 190);
    [420, 452, 484, 516].forEach((x, i) => jar(S, x, 142, 0.9, ["#6b3f26", "#8a5a30", "#a0703c", "#5a3a22"][i], "#2a1c15"));
    [425, 462, 499, 526].forEach((x, i) => jar(S, x, 210, 0.8, "#f3ead8", "#8a5a2a"));
    sack(S, 300, 300, 1.05, "#b98a5a"); sack(S, 332, 306, 0.95, "#a8794a"); sack(S, 590, 306, 1.1, "#c49a6c"); barrel(S, 640, 316, 1.1);
    const sy = counter(S, 384, 398, 420, 1.15, "#8b5a34");
    kettle(S, 300, sy + 2, 1.15); kettle(S, 480, sy + 2, 0.9, "#a9652d"); jar(S, 390, sy + 2, 1.1, "#4a2c18", "#d9ad4b");
    for (const x of [340, 430]) S.add(`<path d="M${x - 11} ${sy - 22}h22l-3 24h-16z" fill="#f3ead8" stroke="${O}" stroke-width="2"/><path d="M${x + 11} ${sy - 16}q10 3 0 12" fill="none" stroke="#f3ead8" stroke-width="3"/>`);
    finish(S, "#ffc880");
  },
  "coffee-cart-upgraded": (S) => {
    shell(S, { wall: "brick", wc: "#a96a50", floor: "#6a5a4a", windows: [230], lamps: [384, 560], floorKind: "tile" });
    // big copper still
    S.add(`<path d="M324 288V196Q324 150 384 140Q444 150 444 196V288Z" fill="${S.grad([[0, "#e09a58"], [0.5, "#b87333"], [1, "#6e3f18"]], [0, 0, 1, 0])}" stroke="${O}" stroke-width="3"/><ellipse cx="384" cy="140" rx="30" ry="10" fill="#8a5a2a" stroke="${O}" stroke-width="2.4"/><path d="M384 130V92Q384 70 420 70H500Q520 70 520 96V150" fill="none" stroke="#b87333" stroke-width="14"/><path d="M384 130V92Q384 70 420 70H500Q520 70 520 96V150" fill="none" stroke="#e6a868" stroke-width="5" opacity=".7"/>`);
    S.add(`<rect x="470" y="150" width="100" height="140" rx="8" fill="${S.grad([[0, "#d8944f"], [1, "#7a4a22"]], [0, 0, 1, 0])}" stroke="${O}" stroke-width="3"/><path d="M470 190H570M470 240H570" stroke="${O}" stroke-width="3"/>`);
    S.add(`<circle cx="384" cy="224" r="22" fill="#2a1c15" stroke="${O}" stroke-width="2.4"/><circle cx="384" cy="224" r="16" fill="#f28c28"/><circle cx="384" cy="228" r="9" fill="#ffd166"/>`);
    [[110, 312, 1.1], [150, 324, 1.2], [200, 316, 1.1], [650, 312, 1.2], [700, 326, 1.1]].forEach(([x, y, s], i) => barrel(S, x, y, s, i % 2 ? "#a9763f" : "#8b5f31"));
    barrel(S, 130, 260, 0.95); barrel(S, 680, 262, 0.95);
    const sy = counter(S, 384, 406, 360, 1.2, "#7a4a28");
    kettle(S, 300, sy + 2, 1.1); kettle(S, 470, sy + 2, 1.0, "#a9652d"); jar(S, 384, sy + 2, 1.1, "#4a2c18", "#d9ad4b");
    finish(S, "#ffb870");
  },
  "street-food": (S) => {
    shell(S, { wall: "plaster", wc: "#e6cfa3", floor: "#9b7653", beam: "#6b4a2e", windows: [], lamps: [200, 570] });
    // brick oven with fire
    S.add(`<path d="M252 290V150Q252 96 384 84Q516 96 516 150V290Z" fill="${S.grad([[0, "#b8654a"], [1, "#7e3f2b"]])}" stroke="${O}" stroke-width="3"/>`);
    for (let y = 110; y < 290; y += 22) S.add(`<path d="M256 ${y}H512" stroke="#7e3f2b" stroke-width="2"/>` + [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => `<path d="M${260 + i * 29 + (y % 44 ? 14 : 0)} ${y}v22" stroke="#7e3f2b" stroke-width="2"/>`).join(""));
    S.add(`<path d="M298 290V206Q384 120 470 206V290Z" fill="#241410" stroke="${O}" stroke-width="3"/><path d="M322 290V230Q384 170 446 230V290Z" fill="#f28c28"/><path d="M344 290V252Q384 214 424 252V290Z" fill="#ffd166"/>`);
    flameI(S, 384, 286, 1.15);
    S.add(`<rect x="356" y="56" width="56" height="34" fill="#7e3f2b" stroke="${O}" stroke-width="2.4"/>`);
    shelf(S, 100, 142, 120); shelf(S, 100, 212, 120); shelf(S, 668, 142, 120); shelf(S, 668, 212, 120);
    [70, 100, 130].forEach((x, i) => loaf(S, x, 142, 0.9 - i * 0.05, ["#d9a05b", "#c58a42", "#e0b070"][i])); [72, 108, 140].forEach((x, i) => loaf(S, x, 212, 0.85, ["#c58a42", "#d9a05b", "#e0b070"][i]));
    [640, 672, 700].forEach((x, i) => loaf(S, x, 142, 0.9, ["#d9a05b", "#e0b070", "#c58a42"][i])); [645, 685].forEach((x) => loaf(S, x, 212, 0.9));
    sack(S, 214, 304, 1.1, "#efe7d4"); sack(S, 250, 310, 0.95, "#e6dcc4"); barrel(S, 560, 316, 1.0);
    const sy = counter(S, 384, 404, 460, 1.2, "#8d6238");
    [250, 330, 440, 520].forEach((x, i) => loaf(S, x, sy + 4, 1.25, ["#d9a05b", "#c58a42", "#e0b070", "#d9a05b"][i]));
    S.add(`<rect x="620" y="170" width="12" height="150" fill="#8d6238" stroke="${O}" stroke-width="2"/><ellipse cx="626" cy="162" rx="30" ry="16" fill="#a9763f" stroke="${O}" stroke-width="2.4"/>`);
    finish(S, "#ffb060");
  },
  "street-food-upgraded": (S) => {
    shell(S, { wall: "plank", wc: "#a07a56", floor: "#6a4a30", beam: "#4a3220", windows: [210], lamps: [384, 560] });
    // hearth
    S.add(`<path d="M470 290V170H590V290Z" fill="${S.grad([[0, "#9a9a96"], [1, "#6a6a66"]])}" stroke="${O}" stroke-width="3"/><path d="M490 290V206Q530 170 570 206V290Z" fill="#241410" stroke="${O}" stroke-width="2.4"/>`);
    flameI(S, 530, 286, 0.95);
    S.add(`<path d="M510 150V176M550 150V176" stroke="#2a2420" stroke-width="3"/><path d="M500 178h60l-6 30h-48z" fill="#3a3a40" stroke="${O}" stroke-width="2.4"/>`);
    [[300, 96], [340, 106], [380, 96]].forEach(([x, y]) => S.add(`<path d="M${x} ${y - 20}V${y}" stroke="#4a3220" stroke-width="2.4"/><path d="M${x - 14} ${y}Q${x - 18} ${y + 38} ${x} ${y + 48}Q${x + 18} ${y + 38} ${x + 14} ${y}Z" fill="${S.grad([[0, "#d9856a"], [1, "#a8452f"]], [0, 0, 1, 0])}" stroke="${O}" stroke-width="2"/>`));
    const t1 = table(S, 200, 372, 280, 1.2), t2 = table(S, 560, 380, 260, 1.25);
    [150, 250].forEach((x) => S.add(`<ellipse cx="${x}" cy="${t1 - 4}" rx="22" ry="6" fill="#f3ead8" stroke="${O}" stroke-width="1.8"/>`)); kettle(S, 200, t1 + 2, 0.8);
    [510, 600].forEach((x) => S.add(`<ellipse cx="${x}" cy="${t2 - 4}" rx="22" ry="6" fill="#f3ead8" stroke="${O}" stroke-width="1.8"/>`)); loaf(S, 556, t2 + 4, 1.2);
    barrel(S, 120, 312, 1.1); barrel(S, 660, 312, 1.1, "#8b5f31");
    finish(S, "#ffb468");
  },
  electronics: (S) => {
    shell(S, { wall: "plaster", wc: "#7fb3b8", floor: "#6a5a48", beam: "#4a3a2c", windows: [], lamps: [384] });
    [[200, 150, 30], [290, 190, 22], [384, 130, 36], [478, 190, 22], [568, 150, 30], [330, 110, 16], [440, 108, 16]].forEach(([x, y, r]) => clockI(S, x, y, r));
    [[200, 150, 30], [384, 130, 36], [568, 150, 30]].forEach(([x, y, r]) => S.add(`<path d="M${x} ${y + r + 6}V${y + r + 40}" stroke="#4a3a2c" stroke-width="3"/><circle cx="${x}" cy="${y + r + 46}" r="9" fill="${S.grad([[0, "#e0b45a"], [1, "#9a6f2a"]])}" stroke="${O}" stroke-width="2"/>`));
    gear(S, 130, 250, 22); gear(S, 650, 246, 20, "#b8864a");
    const sy = counter(S, 384, 402, 440, 1.2, "#7a5a3a", "#9a7a56");
    gear(S, 300, sy - 6, 15); gear(S, 340, sy - 2, 10, "#b8864a"); clockI(S, 450, sy - 20, 20); candle(S, 520, sy + 2, 1);
    for (let i = 0; i < 4; i++) S.add(`<rect x="${580 + i * 8}" y="${sy - 4 - i * 2}" width="4" height="14" fill="#c9a24a" stroke="${O}" stroke-width="1.2"/>`);
    crate(S, 130, 318, 1.1); crate(S, 650, 322, 1.1);
    finish(S, "#ffd9a0");
  },
  "electronics-upgraded": (S) => {
    shell(S, { wall: "stone", wc: "#5a4a88", floor: "#3a3258", beam: "#2f2750", windows: [], lamps: [200, 570], floorKind: "tile" });
    // glowing rune circle on floor + machine
    S.add(`<ellipse cx="384" cy="360" rx="190" ry="44" fill="${S.radial([[0, "#a56bff", 0.45], [1, "#a56bff", 0]])}"/><ellipse cx="384" cy="360" rx="150" ry="34" fill="none" stroke="#c9a8ff" stroke-width="3" opacity=".8"/><ellipse cx="384" cy="360" rx="110" ry="24" fill="none" stroke="#c9a8ff" stroke-width="2" opacity=".7" stroke-dasharray="8 6"/>`);
    S.add(`<rect x="334" y="120" width="100" height="170" rx="10" fill="${S.grad([[0, "#b88a4a"], [1, "#6a4a22"]], [0, 0, 1, 0])}" stroke="${O}" stroke-width="3"/><circle cx="384" cy="176" r="34" fill="#1a1230" stroke="#c9a24a" stroke-width="5"/><circle cx="384" cy="176" r="26" fill="${S.radial([[0, "#e6d0ff"], [1, "#7a4ad6"]])}"/>`);
    gear(S, 350, 250, 14); gear(S, 418, 252, 12, "#b8864a");
    crystalI(S, 214, 312, 100, "#a56bff"); crystalI(S, 560, 312, 120, "#59d0ff"); crystalI(S, 130, 300, 60, "#ff7ad9"); crystalI(S, 650, 300, 70, "#6fe08a");
    for (const [x, y] of [[300, 110], [470, 120], [250, 160], [520, 170]]) S.add(`<circle cx="${x}" cy="${y}" r="5" fill="#e6d0ff" opacity=".8"/><circle cx="${x}" cy="${y}" r="16" fill="${S.radial([[0, "#c9a8ff", 0.5], [1, "#c9a8ff", 0]])}"/>`);
    const sy = counter(S, 384, 410, 300, 1.1, "#4a3a6a", "#6a58a0"); crystalI(S, 330, sy + 4, 34, "#a56bff"); candle(S, 450, sy + 4, 1);
    finish(S, "#b898ff");
  },
  "flower-stall": (S) => {
    shell(S, { wall: "plaster", wc: "#c9dcb4", floor: "#8a6a48", beam: "#5a3a26", windows: [218], lamps: [384, 570] });
    [310, 380, 450, 520, 590].forEach((x, i) => hanging(S, x, Y(78), 120, ["#5fae4f", "#7bbf5a", "#4f8a47", "#9bcf6a", "#6aa65a"][i]));
    shelf(S, 520, 170, 220); shelf(S, 520, 232, 220);
    [440, 480, 520, 560, 600].forEach((x, i) => bottle(S, x, 170, 34, ["#6bd1a0", "#e6d36a", "#d9856a", "#6aa0d9", "#a56bff"][i]));
    [450, 500, 550, 600].forEach((x, i) => jar(S, x, 232, 0.9, ["#7bbf5a", "#e8c25a", "#d9856a", "#9a7ad9"][i]));
    plantPot(S, 140, 306, 1.4); plantPot(S, 300, 312, 1.0);
    const sy = table(S, 400, 396, 380, 1.25);
    S.add(`<ellipse cx="300" cy="${sy + 2}" rx="30" ry="9" fill="#9a9a96" stroke="${O}" stroke-width="2"/><path d="M276 ${sy} q24 22 48 0z" fill="#b8b8b2" stroke="${O}" stroke-width="2"/>`);
    plantPot(S, 450, sy + 4, 0.8); crate(S, 600, 330, 1.0, "#a9763f", ["#e66f9a", "#f2c94c", "#ffffff"]);
    finish(S, "#ffe0a0");
  },
  "flower-stall-upgraded": (S) => {
    shell(S, { wall: "stone", wc: "#5a6a5a", floor: "#4a4a42", beam: "#3a2a22", windows: [], lamps: [200, 570], floorKind: "tile" });
    // cauldron
    S.add(`<ellipse cx="384" cy="300" rx="70" ry="14" fill="#000" opacity=".4"/>`); flameI(S, 384, 306, 1.1);
    S.add(`<path d="M312 252Q304 316 384 322Q464 316 456 252Z" fill="${S.grad([[0, "#52525a"], [1, "#1f1f25"]], [0, 0, 1, 0])}" stroke="${O}" stroke-width="3"/><ellipse cx="384" cy="252" rx="72" ry="20" fill="#2a2a30" stroke="${O}" stroke-width="3"/><ellipse cx="384" cy="252" rx="62" ry="15" fill="#6fe08a"/><circle cx="360" cy="246" r="7" fill="#fff" opacity=".55"/><circle cx="398" cy="256" r="5" fill="#fff" opacity=".5"/><circle cx="420" cy="244" r="4" fill="#fff" opacity=".5"/>`);
    S.add(`<circle cx="384" cy="190" r="90" fill="${S.radial([[0, "#6fe08a", 0.35], [1, "#6fe08a", 0]])}"/>`);
    shelf(S, 150, 150, 200); shelf(S, 150, 222, 200); shelf(S, 618, 150, 200); shelf(S, 618, 222, 200);
    [90, 130, 170, 210].forEach((x, i) => bottle(S, x, 150, 38, ["#6bd1a0", "#a56bff", "#e66f9a", "#59d0ff"][i])); [100, 150, 200].forEach((x, i) => jar(S, x, 222, 0.9, ["#6fe08a", "#e8c25a", "#d9856a"][i]));
    [560, 600, 640, 680].forEach((x, i) => bottle(S, x, 150, 38, ["#e6d36a", "#6aa0d9", "#d9856a", "#6bd1a0"][i])); [570, 620, 670].forEach((x, i) => jar(S, x, 222, 0.9, ["#a56bff", "#59d0ff", "#6fe08a"][i]));
    crystalI(S, 230, 310, 50, "#6fe08a"); crystalI(S, 540, 312, 56, "#a56bff");
    const sy = table(S, 200, 400, 240, 1.2); bottle(S, 160, sy + 3, 34, "#6fe08a"); bottle(S, 210, sy + 3, 28, "#e66f9a"); candle(S, 250, sy + 3, 1);
    finish(S, "#9affc0");
  },
  bookshop: (S) => {
    shell(S, { wall: "plank", wc: "#a07a56", floor: "#6a4a30", beam: "#4a3220", windows: [384], lamps: [210, 560] });
    for (const [x, ys] of [[170, [110, 180, 250]], [600, [110, 180, 250]]]) for (const y of ys) { shelf(S, x, y, 150); books(S, x - 68, y, 8, S.r); }
    const sy1 = table(S, 230, 392, 250, 1.2, "#7a4a28"), sy2 = table(S, 560, 400, 240, 1.25, "#7a4a28");
    S.add(`<rect x="170" y="${sy1 - 14}" width="60" height="10" fill="#f3ead8" stroke="${O}" stroke-width="2"/><path d="M270 ${sy1} l10 -32 l8 4 z" fill="#f3ead8" stroke="${O}" stroke-width="2"/><rect x="300" y="${sy1 - 14}" width="12" height="14" rx="2" fill="#2a2a3a" stroke="${O}" stroke-width="2"/>`);
    candle(S, 200, sy1 + 2, 0.9); books(S, 480, sy2 + 2, 5, S.r, 20); S.add(`<path d="M560 ${sy2} q40 -14 80 0 l-6 10 q-34 -12 -68 0z" fill="#f3ead8" stroke="${O}" stroke-width="2"/>`);
    S.add(`<path d="M384 300 l0 0" /><rect x="360" y="296" width="48" height="12" rx="3" fill="#b3402e" stroke="${O}" stroke-width="2"/><rect x="364" y="284" width="40" height="12" rx="3" fill="#2e6f9a" stroke="${O}" stroke-width="2"/>`);
    finish(S, "#ffc890");
  },
  "bookshop-upgraded": (S) => {
    shell(S, { wall: "plank", wc: "#6a4a30", floor: "#4a3220", beam: "#3a2418", windows: [384], lamps: [250, 520] });
    for (const x of [110, 190, 590, 668]) for (const y of [100, 160, 220]) { shelf(S, x, y, 80, "#3a2418"); books(S, x - 36, y, 4, S.r, 38); }
    for (const [x, n] of [[500, 4], [270, 4]]) { /* centre bookcase fillers */ }
    ladder(S, 150, 300, 200);
    const sy = table(S, 384, 396, 340, 1.3, "#5a3a22");
    S.add(`<path d="M300 ${sy} q42 -18 84 0 q42 -18 84 0 l-6 12 q-36 -14 -78 0 q-42 -14 -78 0z" fill="#f3ead8" stroke="${O}" stroke-width="2.4"/>`); candle(S, 330, sy + 2, 1); candle(S, 440, sy + 2, 1);
    S.add(`<path d="M600 300V288M586 300h28" stroke="#4a3220" stroke-width="4"/><circle cx="600" cy="268" r="22" fill="${S.grad([[0, "#7fc4e0"], [1, "#2f6f98"]], [0, 0, 1, 1])}" stroke="${O}" stroke-width="2.4"/><path d="M588 262q8 -8 14 0q-2 8 -10 6zM602 272q6 -2 10 4q-6 4 -10 -4z" fill="#6fae5a"/>`);
    finish(S, "#ffb878");
  },
  vacant: (S) => {
    shell(S, { wall: "plaster", wc: "#c9b898", floor: "#7a6a56", beam: "#5a4a3a", windows: [384], lamps: [] });
    for (let i = 0; i < 40; i++) S.add(`<circle cx="${230 + S.r() * 300}" cy="${110 + S.r() * 260}" r="${1 + S.r() * 1.8}" fill="#fff6d0" opacity="${0.25 + S.r() * 0.4}"/>`);
    S.add(`<path d="M160 76Q200 140 230 100M600 76Q560 130 520 92" fill="none" stroke="#e8e8e8" stroke-width="1.6" opacity=".7"/><path d="M160 76Q170 118 190 104M608 76Q590 118 576 96" fill="none" stroke="#e8e8e8" stroke-width="1.2" opacity=".6"/>`);
    S.add(`<g transform="rotate(-14 560 300)"><rect x="520" y="228" width="100" height="62" rx="4" fill="#d9534f" stroke="${O}" stroke-width="2.4"/><rect x="530" y="240" width="80" height="8" fill="#f3ead8"/><rect x="530" y="256" width="56" height="8" fill="#f3ead8"/></g>`);
    S.add(`<path d="M230 306l24 -70" stroke="#6b4a2e" stroke-width="5"/><path d="M240 296l-20 22l36 0z" fill="#c9a24a" stroke="${O}" stroke-width="2"/>`);
    crate(S, 640, 320, 0.9); sack(S, 140, 312, 0.9, "#d9d0b8");
    finish(S, "#d8d0c0");
  },
  bank: (S) => {
    shell(S, { wall: "stone", wc: "#b8bdc4", floor: "#cfc8b8", beam: "#6a6e76", windows: [], lamps: [200, 570], floorKind: "tile" });
    S.add(`<circle cx="384" cy="170" r="124" fill="#4c5058" stroke="${O}" stroke-width="3"/><circle cx="384" cy="170" r="102" fill="${S.grad([[0, "#9ca1a9"], [1, "#5e636b"]], [0, 0, 1, 1])}" stroke="${O}" stroke-width="3"/><circle cx="384" cy="170" r="78" fill="#63686f" stroke="${O}" stroke-width="3"/><circle cx="384" cy="170" r="42" fill="#8d929a" stroke="${O}" stroke-width="3"/><path d="M384 126V214M340 170H428M353 139L415 201M353 201L415 139" stroke="#d9ad4b" stroke-width="10"/><circle cx="384" cy="170" r="14" fill="#d9ad4b" stroke="${O}" stroke-width="3"/>`);
    for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4; S.add(`<circle cx="${384 + Math.cos(a) * 112}" cy="${170 + Math.sin(a) * 112}" r="8" fill="#d9ad4b" stroke="${O}" stroke-width="2"/>`); }
    S.add(`<rect x="40" y="0" width="54" height="300" fill="${S.grad([[0, "#f0f1f3"], [1, "#b9bcc0"]], [0, 0, 1, 0])}" stroke="${O}" stroke-width="3"/><rect x="674" y="0" width="54" height="300" fill="${S.grad([[0, "#f0f1f3"], [1, "#b9bcc0"]], [0, 0, 1, 0])}" stroke="${O}" stroke-width="3"/>`);
    const sy = counter(S, 384, 408, 520, 1.2, "#7a5a3a", "#9a7a56");
    for (const x of [200, 270, 340, 430, 500, 570]) S.add(`<path d="M${x} ${sy - 4}V${sy - 90}" stroke="#d9ad4b" stroke-width="5"/>`);
    S.add(`<path d="M180 ${sy - 90}H600" stroke="#d9ad4b" stroke-width="8"/>`);
    coins(S, 240, sy + 2, 5, 1.2); coins(S, 300, sy + 2, 3, 1.1); coins(S, 470, sy + 2, 6, 1.2); S.add(`<polygon points="520,${sy + 2} 590,${sy + 2} 600,${sy - 14} 510,${sy - 14}" fill="#8a2f2a" stroke="${O}" stroke-width="2"/><polygon points="526,${sy - 2} 584,${sy - 2} 592,${sy - 11} 518,${sy - 11}" fill="#f3ead8"/>`);
    finish(S, "#fff0d0");
  },
  "town-hall": (S) => {
    shell(S, { wall: "stone", wc: "#cdbf9f", floor: "#8a6a48", beam: "#5a3a26", windows: [200, 568], lamps: [384] });
    banner(S, 300, 96, 50, 120, "#a8322d"); banner(S, 468, 96, 50, 120, "#2f4f8a");
    // podium + gavel
    poly(S, [[344, 290], [424, 290], [432, 210], [336, 210]], S.grad([[0, "#9a6a3a"], [1, "#5a3a22"]]), 2.6);
    poly(S, [[330, 210], [438, 210], [450, 196], [318, 196]], "#b8864a", 2.4);
    S.add(`<rect x="372" y="164" width="40" height="12" rx="3" fill="#6a4a2a" stroke="${O}" stroke-width="2"/><path d="M392 176V196" stroke="#6a4a2a" stroke-width="6"/>`);
    // benches rows
    for (const [y, w, s] of [[352, 520, 1], [404, 620, 1.2]]) { for (const x of [150, 384, 618]) { S.add(`<ellipse cx="${x}" cy="${y + 6}" rx="${w / 6}" ry="9" fill="#000" opacity=".3"/><rect x="${x - w / 6}" y="${y - 26 * s}" width="${w / 3}" height="${12 * s}" fill="#8b5a34" stroke="${O}" stroke-width="2"/><rect x="${x - w / 6}" y="${y - 12 * s}" width="${w / 3}" height="${12 * s}" fill="#a9763f" stroke="${O}" stroke-width="2"/>`); } }
    finish(S, "#ffe0b0");
  },
  "intel-guild": (S) => {
    shell(S, { wall: "stone", wc: "#5a5a68", floor: "#3a3a44", beam: "#2a2a34", windows: [], lamps: [200, 580] });
    // wall map w/ pins and red string
    S.add(`<rect x="250" y="96" width="270" height="170" fill="${S.grad([[0, "#e6d6a8"], [1, "#c9b583"]])}" stroke="${O}" stroke-width="3.4"/><path d="M270 130q40 -20 70 10t70 -4t80 20M280 200q50 30 90 0t100 10" fill="none" stroke="#8a6a3a" stroke-width="2.4" opacity=".8"/><path d="M300 150L380 210L470 140L420 236" fill="none" stroke="#c0392b" stroke-width="2.4"/>` + [[300, 150], [380, 210], [470, 140], [420, 236]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#c0392b" stroke="${O}" stroke-width="1.6"/>`).join(""));
    S.add(`<path d="M385 120l8 22l24 2l-18 14l6 24l-20 -12l-20 12l6 -24l-18 -14l24 -2z" fill="#d9ad4b" stroke="${O}" stroke-width="1.6" opacity=".9"/>`);
    const sy = table(S, 384, 402, 440, 1.3, "#4a3a2c");
    S.add(`<polygon points="190,${sy + 4} 580,${sy + 4} 560,${sy - 20} 210,${sy - 20}" fill="#e6d6a8" stroke="${O}" stroke-width="2.2"/><path d="M240 ${sy - 10}q50 -10 90 2t110 -6" fill="none" stroke="#8a6a3a" stroke-width="2"/>`);
    candle(S, 250, sy - 14, 1.1); candle(S, 520, sy - 14, 1.1); S.add(`<circle cx="400" cy="${sy - 10}" r="9" fill="#2a2a34" stroke="${O}" stroke-width="2"/>`);
    S.add(`<path d="M120 300q-14 -60 30 -70q44 10 30 70z" fill="#2a2a3a" stroke="${O}" stroke-width="2.4"/><ellipse cx="150" cy="226" rx="22" ry="20" fill="#2a2a3a" stroke="${O}" stroke-width="2.4"/><ellipse cx="150" cy="230" rx="12" ry="9" fill="#0e0e16"/><circle cx="145" cy="230" r="2" fill="#e6d36a"/><circle cx="156" cy="230" r="2" fill="#e6d36a"/>`);
    finish(S, "#9aa8ff");
  },
  "manager-office": (S) => {
    shell(S, { wall: "plaster", wc: "#cbb99a", floor: "#6a4a30", beam: "#4a3220", windows: [180], lamps: [420, 600] });
    for (const y of [110, 190, 262]) { shelf(S, 560, y, 220, "#4a3220"); books(S, 462, y, 10, S.r, 30); }
    for (const [x, y] of [[300, 150], [340, 150]]) S.add(`<rect x="${x - 15}" y="${y}" width="30" height="60" fill="${S.grad([[0, "#8a8f98"], [1, "#4f545c"]])}" stroke="${O}" stroke-width="2.4"/><path d="M${x - 8} ${y + 14}h16M${x - 8} ${y + 38}h16" stroke="${O}" stroke-width="2"/>`);
    const sy = table(S, 330, 400, 380, 1.3, "#6a4a2a");
    S.add(`<rect x="250" y="${sy - 16}" width="90" height="12" fill="#f3ead8" stroke="${O}" stroke-width="2"/><rect x="262" y="${sy - 26}" width="66" height="10" fill="#e6d6a8" stroke="${O}" stroke-width="2"/><rect x="390" y="${sy - 18}" width="22" height="16" rx="3" fill="#2a2a3a" stroke="${O}" stroke-width="2"/><rect x="420" y="${sy - 22}" width="26" height="20" rx="2" fill="#8a2f2a" stroke="${O}" stroke-width="2"/>`);
    plantPot(S, 130, 308, 1.3); candle(S, 360, sy + 2, 0.9);
    finish(S, "#ffd8a8");
  },
  "spectator-hall": (S) => {
    shell(S, { wall: "plaster", wc: "#7a2a2a", floor: "#4a3220", beam: "#2a1a14", windows: [], lamps: [] });
    // stage + curtains
    poly(S, [[150, 290], [618, 290], [640, 322], [128, 322]], S.grad([[0, "#a9763f"], [1, "#6a4a2a"]]), 2.6);
    S.add(`<rect x="170" y="96" width="428" height="194" fill="${S.grad([[0, "#3a2a50"], [1, "#2a1f3a"]])}" stroke="${O}" stroke-width="3"/>`);
    S.add(`<path d="M150 70Q190 160 160 290H255Q230 160 270 70Z" fill="${S.grad([[0, "#c0392b"], [1, "#7a1f1a"]], [0, 0, 1, 0])}" stroke="${O}" stroke-width="2.6"/><path d="M618 70Q578 160 608 290H513Q538 160 498 70Z" fill="${S.grad([[0, "#c0392b"], [1, "#7a1f1a"]], [1, 0, 0, 0])}" stroke="${O}" stroke-width="2.6"/><path d="M150 70H618V104Q580 124 540 104Q500 124 460 104Q420 124 384 104Q340 124 300 104Q260 124 220 104Q184 124 150 104Z" fill="#a8261f" stroke="${O}" stroke-width="2.6"/>`);
    for (const x of [290, 384, 478]) S.add(`<polygon points="${x - 6},96 ${x + 6},96 ${x + 60},300 ${x - 60},300" fill="${S.grad([[0, "#fff6d0", 0.5], [1, "#fff6d0", 0]])}"/>`);
    S.add(`<circle cx="384" cy="280" r="9" fill="#e6b84a"/>`);
    for (const [y, n, sc] of [[350, 6, 1], [394, 7, 1.15], [430, 8, 1.3]]) for (let i = 0; i < n; i++) { const x = 384 + (i - (n - 1) / 2) * 96 * sc; S.add(`<rect x="${x - 28 * sc}" y="${y - 36 * sc}" width="${56 * sc}" height="${34 * sc}" rx="8" fill="${S.grad([[0, "#a8261f"], [1, "#6a1612"]])}" stroke="${O}" stroke-width="2.2"/>`); }
    finish(S, "#ffb0a0");
  },
  "uncle-ravi": (S) => {
    shell(S, { wall: "plaster", wc: "#d9b86a", floor: "#7a4a30", beam: "#5a3a26", windows: [], lamps: [250, 384, 520] });
    hangRug(S, 190, 80, 90, 150, "#8a2f2a", "#e8b53a"); hangRug(S, 590, 80, 90, 150, "#2e5f8a", "#e6d6a0"); hangRug(S, 384, 100, 80, 120, "#2f6a4a", "#f2d36b");
    shelf(S, 150, 250, 110); shelf(S, 618, 250, 110);
    [120, 160].forEach((x, i) => jar(S, x, 250, 0.9, ["#d9ad4b", "#6bd1a0"][i])); bottle(S, 590, 250, 34, "#e66f9a"); bottle(S, 630, 250, 34, "#6aa0d9");
    barrel(S, 120, 316, 1.15); crate(S, 660, 322, 1.1, "#a9763f", ["#e6b84a", "#d9534f", "#6bbf59"]);
    rugI(S, 384, 330, 300, 90, "#8a2f2a", "#e8b53a");
    const sy = counter(S, 384, 410, 360, 1.15, "#8a5a2a", "#a9763f");
    // brass scales
    S.add(`<path d="M384 ${sy + 2}V${sy - 64}M340 ${sy - 64}H428" stroke="#c9a24a" stroke-width="5"/><path d="M340 ${sy - 64}L322 ${sy - 30}H358zM428 ${sy - 64}L410 ${sy - 30}H446z" fill="#e6c25f" stroke="${O}" stroke-width="2"/><circle cx="384" cy="${sy - 68}" r="7" fill="#d9ad4b" stroke="${O}" stroke-width="2"/>`);
    jar(S, 290, sy + 2, 1.1, "#c9552e", "#d9ad4b"); candle(S, 480, sy + 2, 1.1); coins(S, 530, sy + 2, 3, 1);
    finish(S, "#ffc070");
  },
};
function Y(n) { return n; }
