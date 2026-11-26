// npm run voice -> ../voice/SCRIPT.md and lines.csv for ElevenLabs, built from the in-game story so they stay in step.
import fs from "node:fs";
import assert from "node:assert/strict";
import { BEATS, CHAPTERS, CAST } from "../src/story/script.ts";

/** what a voice should read: numbers and product names spelled the way they sound */
const SPOKEN = [
  ["$10,000", "ten thousand dollars"], ["$5,000", "five thousand dollars"], ["$27", "twenty-seven dollars"], ["$1.37", "a dollar thirty-seven"],
  ["45 cents", "forty-five cents"], ["35 cents", "thirty-five cents"], ["GD tokens", "G.D. tokens"], ["MagicBlock", "Magic Block"], ["devnet", "dev net"], ["HA!", "Ha!"], ["Mr. Quill", "Mister Quill"],
];
const speak = (text) => SPOKEN.reduce((t, [a, b]) => t.replaceAll(a, b), text);

/** ElevenLabs v3 delivery tags, keyed by the first words of a line */
const TAGS = {
  "There you are!": "[warmly]", "Enough from me.": "[chuckles]", "Your corner is worth": "[proudly]", "Each of them carries": "[sighs]", "HA! Hear that?": "[laughs]",
  "So YOU'RE": "[teasing]", "Oh, you can even": "[smugly]", "Mr. Quill, auctioneer.": "[announcing]", "Write your bid.": "[hushed]", "Highest bid takes": "[excited]",
  "Ah. Ravi's": "[dryly]", "And beyond the east": "[quietly]", "A loan? For YOU?": "[laughs]", "That's everything I know": "[warmly]",
};

const VOICES = {
  narrator: ["Narrator (intro only)", "Warm, energetic game-trailer narrator, any gender, clear and confident, smiles while speaking."],
  ravi: ["Uncle Ravi", "Elderly Indian man in his seventies, warm gravelly voice, gentle Indian English accent, unhurried, dry humour, sounds like a favourite uncle."],
  mira: ["Mira", "Woman in her late twenties, quick and confident, playful and smug, teasing smile in the voice."],
  quill: ["Mr. Quill", "Older British man, crisp and theatrical auctioneer, resonant, brisk, relishes every word."],
  fennick: ["Madame Fennick", "Woman in her sixties, cool and precise, low measured voice, formal, faintly amused."],
};

/** intro narration, one clip per scene; `seconds` is how long that scene stays on screen */
const INTRO = [
  [7, "A market town. A corner coffee house. And as of today, it's yours."],
  [11, "Set your price. Read the crowd. Study your books. Keep the shelves full, win the auctions, and make rent. Every single day."],
  [6, "Under the cobblestones: Magic Block. Five pieces, all proven on Solana dev net."],
  [13, "Ephemeral Rollups. Your shop moves into the fast lane, where blocks land about every ten milliseconds. Your cash waits in the town treasury until you settle."],
  [12, "Session keys. Approve once, then simply play. No pop-up for every coffee. And that key has no power over the funds in your wallet."],
  [12, "Verifiable randomness. Rival bids do not exist until yours is locked in. Nobody can rig them. But remember: your own bid is public."],
  [11, "Cranks. The rent collects itself, every game day, with no server of ours. The collector never sleeps."],
  [11, "Magic Actions. Press settle, and the payout lands on Solana in the same move. Game money, mind you. Not real money."],
  [16, "Could you build this without Magic Block? You'd get a slower cousin: pop-ups everywhere, your own server chasing rent, an outside oracle for luck, and a bot to pay people out. Not this."],
  [11, "Meet the neighbours. Ravi, who knows everything. Mira, who wants your customers. Mister Quill, going once. And Madame Fennick, who reads your books."],
  [10, "And soon: the bank, new leases, a whole district behind the mist. The town is only getting bigger."],
  [0, "The shutters are down. Open them."],
];

const two = (n) => String(n).padStart(2, "0");
const lines = [
  ...INTRO.map(([seconds, text], i) => {
    const words = text.split(/\s+/).length;
    if (seconds) assert.ok(words / seconds <= 2.6, `intro scene ${i + 1} is too long for ${seconds}s (${words} words)`);
    return { file: `intro_${two(i + 1)}_narrator.mp3`, who: "narrator", group: `Intro${seconds ? ` (scene ${i + 1}, fit in ${seconds}s)` : ` (scene ${i + 1})`}`, text, tagged: text };
  }),
  ...BEATS.map((b, i) => {
    const text = speak(b.say), tag = Object.entries(TAGS).find(([start]) => b.say.startsWith(start))?.[1];
    return { file: `story_${two(i + 1)}_${b.who}.mp3`, who: b.who, group: `Chapter ${b.chapter + 1}: ${CHAPTERS[b.chapter].title}`, text, tagged: tag ? `${tag} ${text}` : text };
  }),
];
for (const l of lines) assert.ok(!/[0-9$%]|MagicBlock/.test(l.text), `spell this out for the voice: ${l.text}`);
for (const key of Object.keys(CAST)) assert.ok(VOICES[key], `no voice for ${key}`);

const chars = (who) => lines.filter((l) => !who || l.who === who).reduce((n, l) => n + l.text.length, 0);
const out = new URL("../../voice/", import.meta.url);
fs.mkdirSync(out, { recursive: true });

const q = (s) => `"${s.replaceAll('"', '""')}"`;
fs.writeFileSync(new URL("lines.csv", out), ["file,character,section,text,text_v3", ...lines.map((l) => [l.file, VOICES[l.who][0], l.group, l.text, l.tagged].map(q).join(","))].join("\n") + "\n");

let md = `# Bazaar voice script (ElevenLabs)

${lines.length} clips, ${chars().toLocaleString("en-US")} characters. Generated by \`npm run voice\` from the in-game story; edit the story, not this file.

## Voices

Create each in ElevenLabs (Voice Design, or pick a library voice that matches).

| Character | Clips | Characters | Voice description to paste |
|---|---|---|---|
${Object.entries(VOICES).map(([k, [name, prompt]]) => `| ${name} | ${lines.filter((l) => l.who === k).length} | ${chars(k).toLocaleString("en-US")} | ${prompt} |`).join("\n")}

## How to generate

- Generate one clip per line and save it under the file name shown. The game can then be wired to play them by name.
- Lines in [square brackets] are delivery cues for the **Eleven v3** model. With any other model, use the \`text\` column of \`lines.csv\`, which has no cues, so they are not read aloud.
- Starting point: stability near the middle, a little style for Mira and Quill. Listen and adjust.
- Intro clips must fit their scene's time, or the scene moves on before the line ends.
`;
let group = "";
for (const l of lines) {
  if (l.group !== group) md += `\n## ${(group = l.group)}\n`;
  md += `\n**${VOICES[l.who][0]}** · \`${l.file}\`\n\n${l.tagged}\n`;
}
fs.writeFileSync(new URL("SCRIPT.md", out), md);
console.log(`voice script: ${lines.length} clips, ${chars()} characters ->`, Object.keys(VOICES).map((k) => `${k} ${chars(k)}`).join(", "));
