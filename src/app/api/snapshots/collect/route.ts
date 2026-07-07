import { NextRequest, NextResponse } from "next/server";
import { collectBazaarSnapshot } from "@/lib/history/snapshot-collector";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.SNAPSHOT_ADMIN_SECRET;
  const providedSecret = request.headers.get("x-snapshot-secret");

  if (!expectedSecret) {
    return NextResponse.json(
      { error: "SNAPSHOT_ADMIN_SECRET is not configured." },
      { status: 500 },
    );
  }

  if (providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const force = request.nextUrl.searchParams.get("force") === "true";
    const result = await collectBazaarSnapshot({ force });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not collect Bazaar snapshot.",
      },
      { status: 500 },
    );
  }
}
