import type {
  BazaarSnapshot,
  HypixelBazaarResponse,
} from "@/lib/hypixel/bazaar-types";
import { transformBazaarProduct } from "@/lib/market/bazaar-calculations";

export const BAZAAR_URL = "https://api.hypixel.net/v2/skyblock/bazaar";

export async function fetchBazaarSnapshot(
  input: RequestInfo | URL = BAZAAR_URL,
): Promise<BazaarSnapshot> {
  const response = await fetch(input, {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Hypixel returned ${response.status} ${response.statusText}.`);
  }

  const data = (await response.json()) as HypixelBazaarResponse;

  if (!data.success) {
    throw new Error(data.cause ?? "Hypixel returned an unsuccessful Bazaar response.");
  }

  const products = Object.entries(data.products)
    .map(([productId, product]) => transformBazaarProduct(productId, product))
    .sort((a, b) => b.flipScore - a.flipScore);

  return {
    lastUpdated: new Date().toISOString(),
    sourceLastUpdated: new Date(data.lastUpdated).toISOString(),
    productCount: products.length,
    products,
  };
}
