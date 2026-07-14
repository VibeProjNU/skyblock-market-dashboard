import { NextRequest, NextResponse } from "next/server";
import { collectBazaarSnapshot } from "@/lib/history/snapshot-collector";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest) {
  const authError = authorizeSnapshotRequest(request, "manual");

  if (authError) {
    return authError;
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

export async function GET(request: NextRequest) {
  const authError = authorizeSnapshotRequest(request, "cron");

  if (authError) {
    return authError;
  }

  try {
    const result = await collectBazaarSnapshot();
    return NextResponse.json({
      ...result,
      trigger: "hourly-cron",
    });
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

function authorizeSnapshotRequest(
  request: NextRequest,
  mode: "cron" | "manual",
) {
  const expectedSecret =
    mode === "cron"
      ? process.env.CRON_SECRET || process.env.SNAPSHOT_ADMIN_SECRET
      : process.env.SNAPSHOT_ADMIN_SECRET;

  if (!expectedSecret) {
    return NextResponse.json(
      {
        error:
          mode === "cron"
            ? "CRON_SECRET or SNAPSHOT_ADMIN_SECRET is not configured."
            : "SNAPSHOT_ADMIN_SECRET is not configured.",
      },
      { status: 500 },
    );
  }

  const authorization = request.headers.get("authorization");
  const bearerSecret = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;
  const providedSecret =
    request.headers.get("x-snapshot-secret") ||
    bearerSecret ||
    request.nextUrl.searchParams.get("secret");

  if (providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return null;
}
