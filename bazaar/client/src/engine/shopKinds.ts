/** One source for how each business and town place is named and drawn (map signs and HTML panels). */
export const SHOP_KINDS = {
  CoffeeCart: { name: "Coffee house", label: "Coffee", icon: "coffee", sprite: "shop-coffee" },
  StreetFood: { name: "Food stall", label: "Street food", icon: "food", sprite: "shop-food" },
  Electronics: { name: "Electronics shop", label: "Electronics", icon: "tech", sprite: "shop-tech" },
  FlowerStall: { name: "Flower stall", label: "Flowers", icon: "flower", sprite: "shop-flower" },
  Bookshop: { name: "Bookshop", label: "Books", icon: "book", sprite: "shop-book" },
} as const;
export type ShopKind = keyof typeof SHOP_KINDS;
export const shopKind = (type: string) => SHOP_KINDS[type as ShopKind] ?? SHOP_KINDS.CoffeeCart;

export const PLACES = [
  { id: "auction", name: "Town Hall", does: "Wholesale auction", icon: "gavel", soon: false },
  { id: "uncleRavi", name: "Uncle Ravi", does: "How to play", icon: "help", soon: false },
  { id: "bank", name: "Bank", does: "Loans", icon: "bank", soon: true },
  { id: "intel", name: "Intel Guild", does: "Scouting", icon: "eye", soon: true },
  { id: "manager", name: "Managers", does: "Hire staff", icon: "clerk", soon: true },
  { id: "spectator", name: "Theatre", does: "Spectating", icon: "mask", soon: true },
] as const;
export type PlaceId = (typeof PLACES)[number]["id"];

export const uiIcon = (name: string) => `/assets/ui/${name}.png`;
export const price = (cents: number) => `$${(cents / 100).toFixed(2)}`;
