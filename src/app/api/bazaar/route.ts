import { NextResponse } from "next/server";
import { saveBazaarSnapshot } from "@/lib/history/snapshot-collector";
import { getBazaarSnapshot } from "@/lib/hypixel/bazaar-api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const snapshot = await getBazaarSnapshot();

    try {
      const collection = await saveBazaarSnapshot(snapshot, {
        capturedAt: snapshot.lastUpdated,
      });

      return NextResponse.json({
        ...snapshot,
        savedSnapshot: collection,
      });
    } catch (snapshotError) {
      console.error("Could not save Bazaar refresh snapshot.", snapshotError);

      return NextResponse.json({
        ...snapshot,
        savedSnapshot: {
          skipped: true,
          insertedRows: 0,
          capturedAt: snapshot.lastUpdated,
          reason:
            snapshotError instanceof Error
              ? snapshotError.message
              : "Could not save this refresh to Supabase.",
        },
      });
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "The Bazaar request failed for an unknown reason.";

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
