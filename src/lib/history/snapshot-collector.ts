import "server-only";
import type {
  BazaarSnapshot,
  BazaarSnapshotRecord,
} from "@/lib/hypixel/bazaar-types";
import { fetchBazaarSnapshot } from "@/lib/hypixel/bazaar-fetch";
import { toBazaarSnapshotRecord } from "@/lib/market/snapshot-records";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

const DUPLICATE_WINDOW_MS = 4 * 60 * 1000;
const INSERT_CHUNK_SIZE = 500;

export type SnapshotCollectionResult = {
  capturedAt: string;
  insertedRows: number;
  skipped: boolean;
  reason?: string;
};

export async function collectBazaarSnapshot({
  force = false,
}: {
  force?: boolean;
} = {}): Promise<SnapshotCollectionResult> {
  const supabase = getSupabaseAdminClient();
  const capturedAt = new Date().toISOString();

  if (!force) {
    const { data: latestRows, error: latestError } = await supabase
      .from("bazaar_snapshots")
      .select("captured_at")
      .order("captured_at", { ascending: false })
      .limit(1);

    if (latestError) {
      throw new Error(`Could not check latest snapshot: ${latestError.message}`);
    }

    const latestCapturedAt = latestRows.at(0)?.captured_at;

    if (
      latestCapturedAt &&
      Date.now() - new Date(latestCapturedAt).getTime() < DUPLICATE_WINDOW_MS
    ) {
      return {
        capturedAt: latestCapturedAt,
        insertedRows: 0,
        skipped: true,
        reason: "A recent Bazaar snapshot already exists.",
      };
    }
  }

  const snapshot = await fetchFreshBazaarSnapshotForCollection();
  return saveBazaarSnapshot(snapshot, { capturedAt });
}

export async function saveBazaarSnapshot(
  snapshot: BazaarSnapshot,
  { capturedAt = new Date().toISOString() }: { capturedAt?: string } = {},
): Promise<SnapshotCollectionResult> {
  const rows = snapshot.products.map((product) =>
    toBazaarSnapshotRecord(product, capturedAt),
  );

  await insertRowsInChunks(rows);

  return {
    capturedAt,
    insertedRows: rows.length,
    skipped: false,
  };
}

async function fetchFreshBazaarSnapshotForCollection() {
  try {
    return await fetchBazaarSnapshot();
  } catch (error) {
    throw new Error(
      `Could not fetch fresh Bazaar data from the official Hypixel API: ${
        error instanceof Error ? error.message : "unknown fetch error"
      }`,
    );
  }
}

async function insertRowsInChunks(rows: BazaarSnapshotRecord[]) {
  const supabase = getSupabaseAdminClient();

  for (let index = 0; index < rows.length; index += INSERT_CHUNK_SIZE) {
    const chunk = rows.slice(index, index + INSERT_CHUNK_SIZE);
    const { error } = await supabase.from("bazaar_snapshots").insert(chunk);

    if (error) {
      throw new Error(`Could not insert Bazaar snapshot rows: ${error.message}`);
    }
  }
}
