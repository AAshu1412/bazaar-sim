/**
 * Exact mapping of Bazaar v2 businesses, landmarks, and town filler to PNGs in /assets/buildings/
 */
export const BUILDING_SPRITES = {
  // Playable Businesses: Base -> Upgraded
  businesses: {
    CoffeeCart: {
      base: "/assets/buildings/spice-merchant.png",
      upgraded: "/assets/buildings/brewery-distillery.png",
      label: "Bazaar Brew House",
    },
    StreetFood: {
      base: "/assets/buildings/bakery.png",
      upgraded: "/assets/buildings/tavern-inn.png",
      label: "Artisan Bakery & Tavern",
    },
    Electronics: {
      base: "/assets/buildings/clockmakers-workshop.png",
      upgraded: "/assets/buildings/arcane-goods-shop.png",
      label: "Clockwork & Arcane Tech",
    },
    FlowerStall: {
      base: "/assets/buildings/herbalist-apothecary.png",
      upgraded: "/assets/buildings/alchemists-shop.png",
      label: "Botanicals & Alchemy",
    },
    Bookshop: {
      base: "/assets/buildings/scribe-bookshop.png",
      upgraded: "/assets/buildings/library-bookshop.png",
      label: "Scribe & Grand Library",
    },
    Vacant: {
      base: "/assets/buildings/carpenters-yard.png",
      upgraded: "/assets/buildings/carpenters-yard.png",
      label: "Available Plot (Auction)",
    },
  },

  // Clickable Town Landmarks
  landmarks: {
    bank: {
      sprite: "/assets/buildings/bank-vault.png",
      secondary: "/assets/buildings/goldsmith-vault.png",
      label: "First District Bank",
      modal: "bank",
    },
    townHall: {
      sprite: "/assets/buildings/town-hall.png",
      bellTower: "/assets/buildings/bell-tower.png",
      label: "Town Hall & Auction House",
      modal: "auction",
    },
    intelGuild: {
      sprite: "/assets/buildings/map-shop.png",
      messenger: "/assets/buildings/messenger-post.png",
      label: "Intel & Scouting Guild",
      modal: "intel",
    },
    managerOffice: {
      sprite: "/assets/buildings/town-clerk-office.png",
      label: "Manager Hiring Guild",
      modal: "manager",
    },
    spectatorHall: {
      sprite: "/assets/buildings/theater-hall.png",
      label: "Spectator Betting Hall",
      modal: "spectator",
    },
    uncleRavi: {
      sprite: "/assets/buildings/bazaar-merchant-shop.png",
      label: "Uncle Ravi's Curios",
      modal: "uncleRavi",
    },
    cityGate: "/assets/buildings/city-gate.png",
  },

  // Atmospheric inner town & alley props
  townAccents: [
    "/assets/buildings/watchtower-brazier.png",
    "/assets/buildings/guardhouse.png",
    "/assets/buildings/jewelers-shop.png",
    "/assets/buildings/tailors-shop.png",
    "/assets/buildings/music-shop.png",
    "/assets/buildings/toy-shop.png",
    "/assets/buildings/barbershop.png",
    "/assets/buildings/bathhouse.png",
    "/assets/buildings/cheesemonger.png",
    "/assets/buildings/greengrocer-shop.png",
    "/assets/buildings/fishmonger.png",
    "/assets/buildings/tavern-lounge.png",
    "/assets/buildings/fortune-teller-tent.png",
    "/assets/buildings/blacksmith-forge.png",
    "/assets/buildings/potters-workshop.png",
    "/assets/buildings/glassblowers-workshop.png",
    "/assets/buildings/weavers-workshop.png",
    "/assets/buildings/leatherworkers-workshop.png",
    "/assets/buildings/stonemason-workshop.png",
    "/assets/buildings/laundry-house.png",
  ],

  // Outer greenbelt & countryside framing
  countryside: [
    "/assets/buildings/sacred-grove.png",
    "/assets/buildings/farmhouse-cottage.png",
    "/assets/buildings/mill-house.png",
    "/assets/buildings/apiary-beekeeper.png",
    "/assets/buildings/dairy-barn.png",
    "/assets/buildings/stable-horse-market.png",
    "/assets/buildings/shrine-chapel.png",
    "/assets/buildings/merchants-house.png",
  ],
};
