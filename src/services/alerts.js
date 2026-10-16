import { supabase } from "../lib/supabase";

export async function getMyAlertEvents(limit = 100) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error("You must be signed in to view alert activity.");

  const { data, error } = await supabase
    .from("alert_events")
    .select(`
      id,
      event_type,
      price,
      original_price,
      discount_percent,
      currency,
      message,
      created_at,
      tracked_game:tracked_games (
        id,
        edition,
        game:game_catalog ( title, cover_image_url )
      ),
      store_product:store_products ( store, product_url, product_title, edition )
    `)
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(Number(limit) || 100, 250)));

  if (error) throw error;
  return data ?? [];
}

export function describeAlertType(type) {
  if (type === "target_price") return "Target price reached";
  if (type === "minimum_discount") return "Discount threshold reached";
  if (type === "first_listing") return "First verified listing";
  return "Price alert";
}
