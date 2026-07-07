import type {
  BazaarMarketProduct,
  HypixelBazaarProduct,
} from "@/lib/hypixel/bazaar-types";

const numberFormatWords = new Set(["of", "the", "and"]);

export function formatProductName(productId: string) {
  return productId
    .split("_")
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase();
      if (numberFormatWords.has(lower)) {
        return lower;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

export function transformBazaarProduct(
  productId: string,
  product: HypixelBazaarProduct,
): BazaarMarketProduct {
  const status = product.quick_status;

  /*
   * Hypixel's Bazaar names are easy to read backward. The official docs say
   * sellPrice and buyPrice are weighted averages of the top 2% of each order
   * side. For player-facing instant actions in the live Bazaar:
   * - buyPrice / buy_summary is the current instant buy side.
   * - sellPrice / sell_summary is the current instant sell side.
   * This dashboard scores an order-style flip: place a buy order near the
   * instant sell side, then place a sell offer near the instant buy side.
   * That makes spread = sell opportunity price - buy opportunity price.
   */
  const instantBuyPrice = safeNumber(status.buyPrice);
  const instantSellPrice = safeNumber(status.sellPrice);
  const entryPrice = instantSellPrice;
  const exitPrice = instantBuyPrice;
  const spread = exitPrice - entryPrice;
  const marginPercent = entryPrice > 0 ? (spread / entryPrice) * 100 : 0;
  const buyVolume = safeNumber(status.buyVolume);
  const sellVolume = safeNumber(status.sellVolume);
  const buyMovingWeek = optionalNumber(status.buyMovingWeek);
  const sellMovingWeek = optionalNumber(status.sellMovingWeek);
  const buyOrders = optionalNumber(status.buyOrders);
  const sellOrders = optionalNumber(status.sellOrders);
  const liveTwoSidedVolume = Math.min(buyVolume, sellVolume);
  const weeklyTwoSidedVolume = Math.min(buyMovingWeek ?? 0, sellMovingWeek ?? 0);
  const orderBalance = balanceRatio(buyOrders ?? 0, sellOrders ?? 0);
  const liveVolumeBalance = balanceRatio(buyVolume, sellVolume);
  const weeklyVolumeBalance = balanceRatio(
    buyMovingWeek ?? 0,
    sellMovingWeek ?? 0,
  );

  const liveVolumeScore = Math.log10(liveTwoSidedVolume + 1);
  const weeklyVolumeScore = Math.log10(weeklyTwoSidedVolume + 1);
  const liveDepthPenalty = Math.min(1, liveTwoSidedVolume / 100_000) ** 1.5;
  const weeklyActivityPenalty = Math.min(1, weeklyTwoSidedVolume / 500_000) ** 0.75;
  const fillConfidence =
    weeklyVolumeBalance * 0.5 + liveVolumeBalance * 0.35 + orderBalance * 0.15;
  const liquidityScore =
    (liveVolumeScore * 0.7 + weeklyVolumeScore * 0.3) *
    liveDepthPenalty *
    weeklyActivityPenalty *
    fillConfidence;

  /*
   * This is only an opportunity-ranking metric, not a profit prediction. It
   * rewards positive order-flip spread, margin, and two-sided volume. The
   * live and weekly volume penalties are intentionally steep so low-volume
   * items do not rank highly just because their spread looks exciting on paper.
   * Fill confidence lowers the score when buy and sell side demand is badly
   * imbalanced, which can make one side of the flip slow to fill.
   */
  const flipScore =
    spread > 0 && marginPercent > 0
      ? marginPercent * Math.log10(spread + 1) * liquidityScore
      : 0;

  return {
    productId,
    displayName: formatProductName(productId),
    instantBuyPrice,
    instantSellPrice,
    entryPrice,
    exitPrice,
    spread,
    marginPercent,
    buyVolume,
    sellVolume,
    buyMovingWeek,
    sellMovingWeek,
    buyOrders,
    sellOrders,
    liquidityScore,
    fillConfidence,
    flipScore,
  };
}

function safeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function optionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function balanceRatio(a: number, b: number) {
  const larger = Math.max(a, b);

  if (larger <= 0) {
    return 0;
  }

  return Math.min(a, b) / larger;
}
