import type { BazaarSnapshotRow } from "@/lib/supabase/server";

export type InvestmentSignal = "buy" | "watch" | "avoid" | "insufficient-data";

export type ProductHistorySummary = {
  productId: string;
  latest: BazaarSnapshotRow;
  snapshotCount: number;
  average24h: number | null;
  average7d: number | null;
  average30d: number | null;
  volumeSpike: boolean;
  volatilityPercent: number | null;
  signal: InvestmentSignal;
  reason: string;
};

export function summarizeProductHistory(
  productId: string,
  rows: BazaarSnapshotRow[],
): ProductHistorySummary | null {
  const sortedRows = [...rows].sort(
    (a, b) =>
      new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime(),
  );
  const latest = sortedRows.at(-1);

  if (!latest) {
    return null;
  }

  const now = new Date(latest.captured_at).getTime();
  const rows24h = rowsSince(sortedRows, now, 24);
  const rows7d = rowsSince(sortedRows, now, 24 * 7);
  const rows30d = rowsSince(sortedRows, now, 24 * 30);
  const average24h = averagePrice(rows24h);
  const average7d = averagePrice(rows7d);
  const average30d = averagePrice(rows30d);
  const latestVolume = latest.buy_volume + latest.sell_volume;
  const averageRecentVolume = averageVolume(rows7d.slice(0, -1));
  const volumeSpike =
    averageRecentVolume !== null && latestVolume > averageRecentVolume * 2;
  const volatilityPercent = calculateVolatilityPercent(rows7d);
  const signal = calculateSignal({
    latestPrice: latest.buy_order_price,
    average7d,
    snapshotCount: sortedRows.length,
    volumeSpike,
    volatilityPercent,
  });

  return {
    productId,
    latest,
    snapshotCount: sortedRows.length,
    average24h,
    average7d,
    average30d,
    volumeSpike,
    volatilityPercent,
    signal: signal.signal,
    reason: signal.reason,
  };
}

function calculateSignal({
  latestPrice,
  average7d,
  snapshotCount,
  volumeSpike,
  volatilityPercent,
}: {
  latestPrice: number;
  average7d: number | null;
  snapshotCount: number;
  volumeSpike: boolean;
  volatilityPercent: number | null;
}): { signal: InvestmentSignal; reason: string } {
  if (snapshotCount < 12 || average7d === null || volatilityPercent === null) {
    return {
      signal: "insufficient-data",
      reason: "Needs more saved snapshots before this signal is reliable.",
    };
  }

  const discountPercent = ((average7d - latestPrice) / average7d) * 100;

  if (discountPercent >= 10 && volumeSpike && volatilityPercent < 20) {
    return {
      signal: "buy",
      reason: "Below saved 7d average with a volume spike and controlled volatility.",
    };
  }

  if (discountPercent >= 5) {
    return {
      signal: "watch",
      reason: "Below saved 7d average, but confirmation is not strong enough yet.",
    };
  }

  return {
    signal: "avoid",
    reason: "No meaningful discount versus saved history.",
  };
}

function rowsSince(rows: BazaarSnapshotRow[], now: number, hours: number) {
  const cutoff = now - hours * 60 * 60 * 1000;
  return rows.filter((row) => new Date(row.captured_at).getTime() >= cutoff);
}

function averagePrice(rows: BazaarSnapshotRow[]) {
  if (rows.length === 0) {
    return null;
  }

  return (
    rows.reduce((sum, row) => sum + row.buy_order_price, 0) / rows.length
  );
}

function averageVolume(rows: BazaarSnapshotRow[]) {
  if (rows.length === 0) {
    return null;
  }

  return (
    rows.reduce((sum, row) => sum + row.buy_volume + row.sell_volume, 0) /
    rows.length
  );
}

function calculateVolatilityPercent(rows: BazaarSnapshotRow[]) {
  if (rows.length < 2) {
    return null;
  }

  const prices = rows.map((row) => row.buy_order_price);
  const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;

  if (average <= 0) {
    return null;
  }

  const variance =
    prices.reduce((sum, price) => sum + (price - average) ** 2, 0) /
    prices.length;
  const standardDeviation = Math.sqrt(variance);

  return (standardDeviation / average) * 100;
}
