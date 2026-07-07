export type HypixelBazaarOrderSummary = {
  amount: number;
  pricePerUnit: number;
  orders: number;
};

export type HypixelBazaarQuickStatus = {
  productId: string;
  sellPrice: number;
  sellVolume: number;
  sellMovingWeek?: number;
  sellOrders?: number;
  buyPrice: number;
  buyVolume: number;
  buyMovingWeek?: number;
  buyOrders?: number;
};

export type HypixelBazaarProduct = {
  product_id: string;
  sell_summary: HypixelBazaarOrderSummary[];
  buy_summary: HypixelBazaarOrderSummary[];
  quick_status: HypixelBazaarQuickStatus;
};

export type HypixelBazaarResponse = {
  success: boolean;
  lastUpdated: number;
  products: Record<string, HypixelBazaarProduct>;
  cause?: string;
};

export type BazaarMarketProduct = {
  productId: string;
  displayName: string;
  instantBuyPrice: number;
  instantSellPrice: number;
  entryPrice: number;
  exitPrice: number;
  spread: number;
  marginPercent: number;
  buyVolume: number;
  sellVolume: number;
  buyMovingWeek?: number;
  sellMovingWeek?: number;
  buyOrders?: number;
  sellOrders?: number;
  liquidityScore: number;
  fillConfidence: number;
  flipScore: number;
};

export type BazaarSnapshotRecord = {
  product_id: string;
  buy_order_price: number;
  sell_offer_price: number;
  spread: number;
  margin_percent: number;
  buy_volume: number;
  sell_volume: number;
  buy_moving_week?: number;
  sell_moving_week?: number;
  buy_orders?: number;
  sell_orders?: number;
  captured_at: string;
};

export type BazaarSnapshot = {
  lastUpdated: string;
  sourceLastUpdated: string;
  productCount: number;
  products: BazaarMarketProduct[];
};
