import type {
  BazaarMarketProduct,
  BazaarSnapshotRecord,
} from "@/lib/hypixel/bazaar-types";

export function toBazaarSnapshotRecord(
  product: BazaarMarketProduct,
  timestamp: string,
): BazaarSnapshotRecord {
  return {
    product_id: product.productId,
    buy_order_price: product.instantSellPrice,
    sell_offer_price: product.instantBuyPrice,
    spread: product.spread,
    margin_percent: product.marginPercent,
    buy_volume: product.buyVolume,
    sell_volume: product.sellVolume,
    buy_moving_week: product.buyMovingWeek,
    sell_moving_week: product.sellMovingWeek,
    buy_orders: product.buyOrders,
    sell_orders: product.sellOrders,
    captured_at: timestamp,
  };
}
