// npm run voice:audio -- <file.mp3> [more…]   or   -- --all
// Turns lines of ../voice/lines.csv into public/voice/<file>. Files that already exist are skipped (no credits spent).
// The key comes from client/.env (ELEVENLABS_API_KEY), loaded by node; it is never printed.
import fs from "node:fs";

const MODEL = "eleven_v4";
/** ElevenLabs premade voices (usable on the free plan) */
const VOICES = {
  "Narrator (intro only)": "nPczCjzI2devNBz1zQrb", // Brian
  "Uncle Ravi": process.env.RAVI_VOICE ?? "JBFqnCBsd6RMkjVDRZzb", // George
  Mira: "FGY2WhTYpPnrIDTdsKH5", // Laura
  "Mr. Quill": "onwK4e9ZLuTAKqWW03F9", // Daniel
  "Madame Fennick": "pFZP5JQG7iQjIQuC4Bku", // Lily
};
const key = process.env.ELEVENLABS_API_KEY;
if (!key) throw new Error("ELEVENLABS_API_KEY is not set: run `elevenlabs onboard connect --env-path .env` in client/");
const api = (path, init = {}) => fetch(`https://api.elevenlabs.io${path}`, { ...init, headers: { "xi-api-key": key, "content-type": "application/json" } });
const credits = async () => { const s = await (await api("/v1/user/subscription")).json(); return s.character_limit - s.character_count; };

const lines = fs.readFileSync(new URL("../../voice/lines.csv", import.meta.url), "utf8").trim().split("\n").slice(1)
  .map((row) => { const [file, who, , , text] = [...row.matchAll(/"((?:[^"]|"")*)"/g)].map((m) => m[1].replaceAll('""', '"')); return { file, who, text }; });
const out = new URL(process.env.VOICE_OUT ?? "../public/voice/", import.meta.url);
fs.mkdirSync(out, { recursive: true });
const args = process.argv.slice(2);
const wanted = args.includes("--all") ? lines : args.map((a) => lines.find((l) => l.file === a) ?? (() => { throw new Error(`no such line: ${a}`); })());
const todo = wanted.filter((l) => !fs.existsSync(new URL(l.file, out)));
const need = todo.reduce((n, l) => n + l.text.length, 0), before = await credits();
console.log(`${todo.length} clips to make (${wanted.length - todo.length} already there), ${need} characters, ${before} credits left`);
if (need > before) throw new Error("not enough credits: nothing was generated");

for (const l of todo) {
  const res = await api(`/v1/text-to-speech/${VOICES[l.who]}?output_format=mp3_44100_64`, { method: "POST", body: JSON.stringify({ text: l.text, model_id: MODEL, voice_settings: { stability: 0.5, similarity_boost: 0.75 } }) });
  if (!res.ok) throw new Error(`${l.file}: ${res.status} ${(await res.text()).slice(0, 300)}`);
  const audio = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(new URL(l.file, out), audio);
  console.log(`  ${l.file}  ${(audio.length / 1024).toFixed(0)} KB  cost ${res.headers.get("character-cost") ?? "?"}`);
}
await new Promise((r) => setTimeout(r, 1500));
const after = await credits();
console.log(`done: used ${before - after} credits, ${after} left`);
