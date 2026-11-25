/**
 * Exact mapping of Bazaar v2 businesses, landmarks, and town filler to PNGs in /assets/exterior/
 */
export const BUILDING_SPRITES = {
  // Playable Businesses: Base -> Upgraded
  businesses: {
    CoffeeCart: {
      base: "/assets/exterior/spice-merchant.png",
      upgraded: "/assets/exterior/brewery-distillery.png",
      label: "Bazaar Brew House",
    },
    StreetFood: {
      base: "/assets/exterior/bakery.png",
      upgraded: "/assets/exterior/tavern-inn.png",
      label: "Artisan Bakery & Tavern",
    },
    Electronics: {
      base: "/assets/exterior/clockmakers-workshop.png",
      upgraded: "/assets/exterior/arcane-goods-shop.png",
      label: "Clockwork & Arcane Tech",
    },
    FlowerStall: {
      base: "/assets/exterior/herbalist-apothecary.png",
      upgraded: "/assets/exterior/alchemists-shop.png",
      label: "Botanicals & Alchemy",
    },
    Bookshop: {
      base: "/assets/exterior/scribe-bookshop.png",
      upgraded: "/assets/exterior/library-bookshop.png",
      label: "Scribe & Grand Library",
    },
    Vacant: {
      base: "/assets/exterior/vacant-lot.png",
      upgraded: "/assets/exterior/vacant-lot.png",
      label: "Available Plot (Auction)",
    },
  },

  // Clickable Town Landmarks
  landmarks: {
    bank: {
      sprite: "/assets/exterior/bank-vault.png",
      secondary: "/assets/exterior/goldsmith-vault.png",
      label: "First District Bank",
      modal: "bank",
    },
    townHall: {
      sprite: "/assets/exterior/town-hall.png",
      bellTower: "/assets/exterior/bell-tower.png",
      label: "Town Hall & Auction House",
      modal: "auction",
    },
    intelGuild: {
      sprite: "/assets/exterior/map-shop.png",
      messenger: "/assets/exterior/messenger-post.png",
      label: "Intel & Scouting Guild",
      modal: "intel",
    },
    managerOffice: {
      sprite: "/assets/exterior/town-clerk-office.png",
      label: "Manager Hiring Guild",
      modal: "manager",
    },
    spectatorHall: {
      sprite: "/assets/exterior/theater-hall.png",
      label: "Spectator Betting Hall",
      modal: "spectator",
    },
    uncleRavi: {
      sprite: "/assets/exterior/bazaar-merchant-shop.png",
      label: "Uncle Ravi's Curios",
      modal: "uncleRavi",
    },
    cityGate: "/assets/exterior/city-gate.png",
  },

  // Atmospheric inner town & alley props
  townAccents: [
    "/assets/exterior/watchtower-brazier.png",
    "/assets/exterior/guardhouse.png",
    "/assets/exterior/jewelers-shop.png",
    "/assets/exterior/tailors-shop.png",
    "/assets/exterior/music-shop.png",
    "/assets/exterior/toy-shop.png",
    "/assets/exterior/barbershop.png",
    "/assets/exterior/bathhouse.png",
    "/assets/exterior/cheesemonger.png",
    "/assets/exterior/greengrocer-shop.png",
    "/assets/exterior/fishmonger.png",
    "/assets/exterior/tavern-lounge.png",
    "/assets/exterior/fortune-teller-tent.png",
    "/assets/exterior/blacksmith-forge.png",
    "/assets/exterior/potters-workshop.png",
    "/assets/exterior/glassblowers-workshop.png",
    "/assets/exterior/weavers-workshop.png",
    "/assets/exterior/leatherworkers-workshop.png",
    "/assets/exterior/stonemason-workshop.png",
    "/assets/exterior/laundry-house.png",
  ],

  // Outer greenbelt & countryside framing
  countryside: [
    "/assets/exterior/sacred-grove.png",
    "/assets/exterior/farmhouse-cottage.png",
    "/assets/exterior/mill-house.png",
    "/assets/exterior/apiary-beekeeper.png",
    "/assets/exterior/dairy-barn.png",
    "/assets/exterior/stable-horse-market.png",
    "/assets/exterior/shrine-chapel.png",
    "/assets/exterior/merchants-house.png",
  ],
};

/** Interior scene images: /assets/interior/<name>.png (see scripts/gen-assets.py) */
const kebab = (s: string) => s.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
export const interiorFor = (businessKind: string, upgraded = false) =>
  `/assets/interior/${kebab(businessKind)}${upgraded ? "-upgraded" : ""}.png`;
export const landmarkInterior = (id: "bank" | "town-hall" | "intel-guild" | "manager-office" | "spectator-hall" | "uncle-ravi") =>
  `/assets/interior/${id}.png`;
