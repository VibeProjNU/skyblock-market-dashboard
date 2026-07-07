import "server-only";
import { createClient } from "@supabase/supabase-js";

export type BazaarSnapshotRow = {
  id: number;
  product_id: string;
  buy_order_price: number;
  sell_offer_price: number;
  spread: number;
  margin_percent: number;
  buy_volume: number;
  sell_volume: number;
  buy_moving_week: number | null;
  sell_moving_week: number | null;
  buy_orders: number | null;
  sell_orders: number | null;
  captured_at: string;
};

export function getSupabaseAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local.",
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
