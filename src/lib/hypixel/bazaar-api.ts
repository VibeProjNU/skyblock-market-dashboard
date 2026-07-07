import { fetchBazaarSnapshot } from "@/lib/hypixel/bazaar-fetch";

export async function getBazaarSnapshot() {
  return fetchBazaarSnapshot();
}
