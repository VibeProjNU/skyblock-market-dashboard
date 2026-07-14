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

export function hasSupabaseServerConfig() {
  return Boolean(process.env.SUPABASE_URL && getSupabaseSecretKey());
}

export function getSupabaseAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const secretKey = getSupabaseSecretKey();

  if (!supabaseUrl || !secretKey) {
    throw new Error(
      "Supabase is not configured. Add SUPABASE_URL and SUPABASE_SECRET_KEY to your environment variables.",
    );
  }

  return createClient(supabaseUrl, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function getSupabaseSecretKey() {
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
}
