import { supabase } from "../lib/supabase";

export async function getMyPriceHistory(limit = 100) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error("You must be signed in to view price history.");

  const { data, error } = await supabase
    .from("price_history")
    .select(`
      id,
      price,
      original_price,
      discount_percent,
      currency,
      recorded_at,
      store_product:store_products (
        id,
        store,
        product_title,
        edition,
        game:game_catalog ( title, cover_image_url )
      )
    `)
    .order("recorded_at", { ascending: false })
    .limit(Math.max(1, Math.min(Number(limit) || 100, 250)));

  if (error) throw error;
  return data ?? [];
}

export function formatMoney(value, currency = "INR") {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatStoreName(store) {
  if (store === "steam") return "Steam";
  if (store === "gmg") return "Green Man Gaming";
  return store || "Unknown store";
}
