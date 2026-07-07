import { BazaarDashboard } from "@/components/bazaar-dashboard";
import { getBazaarSnapshot } from "@/lib/hypixel/bazaar-api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const snapshot = await getBazaarSnapshot();

  return <BazaarDashboard initialSnapshot={snapshot} />;
}
