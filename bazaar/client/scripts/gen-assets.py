#!/usr/bin/env python3
"""Generate exterior (map sprite) + interior (shop/modal scene) art with the Higgsfield CLI.

  higgsfield auth login                      # once
  python3 scripts/gen-assets.py --sample     # 1 exterior + 1 interior, review before spending more
  python3 scripts/gen-assets.py              # everything missing (resumable: existing files are skipped)
  python3 scripts/gen-assets.py --only bakery,bank

Outputs: public/assets/exterior/<name>.png (302x256, transparent) and public/assets/interior/<name>.png (768x432).
Edit STYLE_* to change the look of the whole set.
"""
import argparse, io, json, re, subprocess, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / "public" / "assets"
MODEL = "gpt_image_2"

STYLE_EXT = (
    "clean hand-painted isometric game art, warm medieval-fantasy market town, soft shading, crisp outlines, "
    "consistent palette, 30-degree isometric view of the WHOLE building seen from the outside"
)
STYLE_INT = (
    "clean hand-painted isometric game art, warm medieval-fantasy market town, cozy interior scene, "
    "rich props, warm lantern lighting, soft shading, consistent palette"
)
KEY = (255, 0, 255)  # exterior backdrop colour we key out

# ---- exterior sprites actually referenced by the game (name -> description) ----
EXTERIOR = {
    "spice-merchant": "spice merchant shop with sacks and hanging chili strings, Bazaar Brew House",
    "brewery-distillery": "grand brewery and distillery with copper kettles and barrels (upgraded coffee house)",
    "bakery": "artisan bakery with a brick chimney and bread sign",
    "tavern-inn": "two-storey tavern and inn with hanging sign",
    "clockmakers-workshop": "clockmaker's workshop with a big clock face on the facade",
    "arcane-goods-shop": "arcane goods shop with glowing crystals in the windows (upgraded electronics store)",
    "herbalist-apothecary": "herbalist apothecary with hanging herbs and green bottles",
    "alchemists-shop": "alchemist's shop with bubbling flasks and purple smoke",
    "scribe-bookshop": "small scribe and bookshop with stacked books in the window",
    "library-bookshop": "grand library with columns and a domed roof",
    "carpenters-yard": "empty carpenter's yard plot with lumber piles and a 'for lease' post",
    "bank-vault": "stone bank with a heavy vault door and gold coin emblem",
    "goldsmith-vault": "goldsmith vault with a golden sign",
    "town-hall": "town hall with a clock tower and steps",
    "bell-tower": "tall stone bell tower",
    "map-shop": "cartographer's map shop with rolled maps and a compass sign",
    "messenger-post": "messenger post with pigeon coop and mail satchels",
    "town-clerk-office": "town clerk's office with ledgers and a stamp sign",
    "theater-hall": "theater hall with red curtains and a stage front",
    "bazaar-merchant-shop": "curio merchant stall with colorful awnings and rugs (Uncle Ravi's Curios)",
    "city-gate": "stone city gate with a portcullis and flags",
    "watchtower-brazier": "stone watchtower with a burning brazier on top",
    "guardhouse": "guardhouse with shields and spears",
    "jewelers-shop": "jeweler's shop with gem display",
    "tailors-shop": "tailor's shop with bolts of fabric",
    "music-shop": "music shop with lutes and drums",
    "toy-shop": "toy shop with wooden toys in the window",
    "barbershop": "barbershop with a striped pole",
    "bathhouse": "bathhouse with steam rising",
    "cheesemonger": "cheesemonger with wheels of cheese",
    "greengrocer-shop": "greengrocer with crates of vegetables and fruit",
    "fishmonger": "fishmonger with a fish sign and ice crates",
    "tavern-lounge": "cozy tavern lounge with lanterns",
    "fortune-teller-tent": "fortune teller's striped tent with stars",
    "blacksmith-forge": "blacksmith forge with anvil and glowing furnace",
    "potters-workshop": "potter's workshop with clay pots outside",
    "glassblowers-workshop": "glassblower's workshop with blue glass bottles",
    "weavers-workshop": "weaver's workshop with looms and colored yarn",
    "leatherworkers-workshop": "leatherworker's workshop with hides on racks",
    "tannery": "tannery with stretched hides and tanning barrels",
    "stonemason-workshop": "stonemason workshop with carved blocks",
    "laundry-house": "laundry house with clothes lines",
    "sacred-grove": "sacred grove with ancient trees and a small stone altar",
    "farmhouse-cottage": "farmhouse cottage with thatched roof and garden",
    "mill-house": "watermill house with a wooden wheel",
    "apiary-beekeeper": "beekeeper's apiary with wooden hives",
    "dairy-barn": "dairy barn with milk churns",
    "stable-horse-market": "stable and horse market with a paddock",
    "shrine-chapel": "small stone shrine chapel",
    "merchants-house": "wealthy merchant's townhouse with banners",
}

# ---- interior scenes ----
INTERIOR = {
    "coffee-cart": "brew house interior with copper kettles, coffee sacks and a wooden counter",
    "coffee-cart-upgraded": "grand brewery interior with large copper stills, oak barrels and lanterns",
    "street-food": "bakery interior with a glowing brick oven, bread racks and a flour-dusted counter",
    "street-food-upgraded": "busy tavern kitchen and dining room, long tables, hanging pots",
    "electronics": "clockmaker's workshop interior with gears, pendulum clocks and workbenches",
    "electronics-upgraded": "arcane tech workshop with glowing crystals, brass machines and floating runes",
    "flower-stall": "herbalist apothecary interior with hanging herbs, jars and a mortar",
    "flower-stall-upgraded": "alchemy lab with bubbling flasks, shelves of potions and a cauldron",
    "bookshop": "scribe bookshop interior with writing desks, scrolls and ink pots",
    "bookshop-upgraded": "grand library interior with tall bookshelves, ladders and reading tables",
    "vacant": "empty shop interior with bare wooden floor, dust, a for-lease sign leaning on the wall",
    "bank": "bank vault interior with a huge round vault door, gold coins and ledgers",
    "town-hall": "town hall auction chamber with a gavel, podium and rows of benches",
    "intel-guild": "spy guild map room with a big table of maps, candles and pinned notes",
    "manager-office": "clerk's office with ledgers, stamps and filing shelves",
    "spectator-hall": "theater hall interior with stage, red curtains and tiered seats",
    "uncle-ravi": "curio shop interior crammed with rugs, lamps, trinkets and a friendly old merchant's counter",
}


def run_cli(prompt: str, extra: list[str]) -> str:
    cmd = ["higgsfield", "generate", "create", MODEL, "--prompt", prompt, "--wait", "--json", *extra]
    out = subprocess.run(cmd, capture_output=True, text=True)
    if out.returncode != 0:
        raise RuntimeError((out.stderr or out.stdout).strip()[:300])
    m = re.findall(r"https?://[^\s\"']+", out.stdout)
    urls = [u for u in m if re.search(r"\.(png|jpe?g|webp)(\?|$)", u, re.I)] or m
    if not urls:
        raise RuntimeError("no result URL in CLI output: " + out.stdout[:300])
    return urls[-1]


def fetch(url: str) -> Image.Image:
    with urllib.request.urlopen(url, timeout=60) as r:
        return Image.open(io.BytesIO(r.read())).convert("RGB")


def key_out(img: Image.Image) -> Image.Image:
    """Magenta backdrop -> alpha, with soft edge and magenta-fringe suppression."""
    a = np.asarray(img).astype(np.float32)
    dist = np.sqrt(((a - np.array(KEY, np.float32)) ** 2).sum(axis=2))
    alpha = np.clip((dist - 60) / 90, 0, 1)
    rgba = np.dstack([a, alpha * 255]).astype(np.uint8)
    # de-fringe: where partially transparent, pull colour away from magenta
    edge = (alpha > 0) & (alpha < 1)
    rgba[..., 0][edge] = np.minimum(rgba[..., 0][edge], rgba[..., 1][edge] + 40)
    rgba[..., 2][edge] = np.minimum(rgba[..., 2][edge], rgba[..., 1][edge] + 40)
    return Image.fromarray(rgba, "RGBA")


def to_sprite(img: Image.Image) -> Image.Image:
    """Trim, fit into the engine's 302x256 canvas (anchor 0.5,0.78): building centred, base near bottom."""
    img = key_out(img)
    img = img.crop(img.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox())
    img.thumbnail((290, 232), Image.LANCZOS)
    canvas = Image.new("RGBA", (302, 256), (0, 0, 0, 0))
    canvas.paste(img, ((302 - img.width) // 2, 244 - img.height), img)
    return canvas


def to_interior(img: Image.Image) -> Image.Image:
    w, h = img.size
    th = int(w * 9 / 16)
    top = max(0, (h - th) // 2)
    return img.crop((0, top, w, min(h, top + th))).resize((768, 432), Image.LANCZOS)


def job(kind: str, name: str, desc: str, extra: list[str]):
    out = ROOT / kind / f"{name}.png"
    if out.exists():
        return f"skip  {kind}/{name}"
    if kind == "exterior":
        prompt = (f"{STYLE_EXT}. A single {desc}. Centered, nothing else in frame, "
                  f"on a perfectly flat solid pure magenta #FF00FF background, no ground plane beyond the building base, no text, no watermark.")
    else:
        prompt = f"{STYLE_INT}. {desc}. Isometric cutaway room view, wide 16:9 composition, no text, no watermark."
    try:
        img = fetch(run_cli(prompt, extra))
        out.parent.mkdir(parents=True, exist_ok=True)
        (to_sprite(img) if kind == "exterior" else to_interior(img)).save(out, optimize=True)
        return f"ok    {kind}/{name}"
    except Exception as e:  # keep going; rerun to retry failures
        return f"FAIL  {kind}/{name}: {e}"


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--sample", action="store_true", help="only bakery (exterior) + bank (interior)")
    ap.add_argument("--only", help="comma-separated names")
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--extra", default="", help="extra CLI params, e.g. '--aspect_ratio 16:9'")
    args = ap.parse_args()
    extra = args.extra.split()

    jobs = [("exterior", n, d) for n, d in EXTERIOR.items()] + [("interior", n, d) for n, d in INTERIOR.items()]
    if args.sample:
        jobs = [j for j in jobs if (j[0], j[1]) in {("exterior", "bakery"), ("interior", "bank")}]
    if args.only:
        want = set(args.only.split(","))
        jobs = [j for j in jobs if j[1] in want]
    print(f"{len(jobs)} jobs, model {MODEL}")
    with ThreadPoolExecutor(args.workers) as ex:
        for line in ex.map(lambda j: job(*j, extra), jobs):
            print(line, flush=True)
