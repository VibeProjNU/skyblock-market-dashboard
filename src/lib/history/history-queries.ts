import "server-only";
import { summarizeProductHistory } from "@/lib/history/investment-signals";
import type { ProductHistorySummary } from "@/lib/history/investment-signals";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { BazaarSnapshotRow } from "@/lib/supabase/server";

const HISTORY_PAGE_SIZE = 1_000;
const MAX_HISTORY_ROWS = 50_000;

export type InvestmentHistoryData =
  | {
      isConfigured: false;
      error: string;
      products: [];
      selectedProductId: null;
      selectedProduct: null;
      latestCapturedAt: null;
      snapshotCount: 0;
    }
  | {
      isConfigured: true;
      error: string | null;
      products: ProductHistorySummary[];
      selectedProductId: string | null;
      selectedProduct: ProductHistorySummary | null;
      latestCapturedAt: string | null;
      snapshotCount: number;
    };

export async function getInvestmentHistoryData(
  selectedProductId?: string,
): Promise<InvestmentHistoryData> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      isConfigured: false,
      error:
        "Supabase is not configured yet. Add the required environment variables to load real history.",
      products: [],
      selectedProductId: null,
      selectedProduct: null,
      latestCapturedAt: null,
      snapshotCount: 0,
    };
  }

  try {
    const rows = await fetchSnapshotRows();
    const byProduct = groupRowsByProduct(rows);
    const products = Array.from(byProduct.entries())
      .map(([productId, productRows]) =>
        summarizeProductHistory(productId, productRows),
      )
      .filter((product): product is ProductHistorySummary => product !== null)
      .sort((a, b) => scoreSignal(b) - scoreSignal(a));
    const selectedProduct =
      selectedProductId && byProduct.has(selectedProductId)
        ? summarizeProductHistory(selectedProductId, byProduct.get(selectedProductId) ?? [])
        : products.at(0) ?? null;

    return {
      isConfigured: true,
      error: null,
      products,
      selectedProductId: selectedProduct?.productId ?? null,
      selectedProduct,
      latestCapturedAt: rows.at(0)?.captured_at ?? null,
      snapshotCount: rows.length,
    };
  } catch (error) {
    return {
      isConfigured: true,
      error:
        error instanceof Error
          ? error.message
          : "Could not load saved Bazaar history.",
      products: [],
      selectedProductId: selectedProductId ?? null,
      selectedProduct: null,
      latestCapturedAt: null,
      snapshotCount: 0,
    };
  }
}

async function fetchSnapshotRows() {
  const supabase = getSupabaseAdminClient();
  const rows: BazaarSnapshotRow[] = [];

  for (let start = 0; start < MAX_HISTORY_ROWS; start += HISTORY_PAGE_SIZE) {
    const end = start + HISTORY_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("bazaar_snapshots")
      .select("*")
      .order("captured_at", { ascending: false })
      .range(start, end);

    if (error) {
      throw new Error(error.message);
    }

    rows.push(...((data ?? []) as BazaarSnapshotRow[]));

    if (!data || data.length < HISTORY_PAGE_SIZE) {
      break;
    }
  }

  return rows;
}

function groupRowsByProduct(rows: BazaarSnapshotRow[]) {
  const groups = new Map<string, BazaarSnapshotRow[]>();

  for (const row of rows) {
    const group = groups.get(row.product_id) ?? [];
    group.push(row);
    groups.set(row.product_id, group);
  }

  return groups;
}

function scoreSignal(product: ProductHistorySummary) {
  const signalScore =
    product.signal === "buy"
      ? 3
      : product.signal === "watch"
        ? 2
        : product.signal === "avoid"
          ? 1
          : 0;

  return signalScore * 1_000_000 + product.snapshotCount;
}
