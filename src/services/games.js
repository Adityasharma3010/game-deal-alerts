import { supabase } from "../lib/supabase";

export async function searchSteamGames(query) {
  const response = await fetch(
    `/api/steam-search?q=${encodeURIComponent(query.trim())}`,
  );

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "Steam search failed.");
  }

  return payload.games ?? [];
}

export async function getSteamGameDetails(steamAppId) {
  const response = await fetch(
    `/api/steam-details?appid=${encodeURIComponent(steamAppId)}`,
  );

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "Unable to verify this Steam game.");
  }

  return payload;
}

export async function saveTrackedGame({
  steamAppId,
  title,
  coverImageUrl,
  edition,
  steamPackageId,
  alertType,
  targetPrice,
  minimumDiscount,
}) {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError) throw sessionError;

  if (!sessionData.session) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  const { data, error } = await supabase.rpc("track_steam_game", {
    p_steam_app_id: steamAppId,
    p_title: title,
    p_cover_image_url: coverImageUrl,
    p_edition: edition,
    p_steam_package_id: steamPackageId,
    p_store: "steam",
    p_alert_type: alertType,
    p_target_price: alertType === "target_price" ? Number(targetPrice) : null,
    p_minimum_discount:
      alertType === "minimum_discount" ? Number(minimumDiscount) : null,
  });

  if (error) throw error;

  return data;
}

export async function getMyTrackedGames() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;

  if (!user) {
    throw new Error("You must be signed in to view tracked games.");
  }

  const { data, error } = await supabase
    .from("tracked_games")
    .select(
      `
      id,
      user_id,
      game_id,
      edition,
      steam_package_id,
      created_at,
      game:game_catalog (
        id,
        title,
        cover_image_url,
        steam_app_id
      ),
      alert_rules (
        id,
        store,
        alert_type,
        target_price,
        minimum_discount,
        currency,
        is_enabled,
        notify_on_first_listing
      )
    `,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((trackedGame) => ({
    id: trackedGame.id,
    gameId: trackedGame.game_id,
    title: trackedGame.game?.title ?? "Unknown game",
    edition: trackedGame.edition,
    steamPackageId: trackedGame.steam_package_id ?? null,
    coverImageUrl: trackedGame.game?.cover_image_url ?? null,
    steamAppId: trackedGame.game?.steam_app_id ?? null,
    createdAt: trackedGame.created_at,
    rules: (trackedGame.alert_rules ?? []).map((rule) => ({
      id: rule.id,
      store: rule.store,
      type: rule.alert_type,
      targetPrice: rule.target_price,
      minimumDiscount: rule.minimum_discount,
      currency: rule.currency,
      enabled: rule.is_enabled,
      notifyOnFirstListing: rule.notify_on_first_listing,
    })),
  }));
}

export function formatStores(rules = []) {
  const stores = [
    ...new Set(
      rules
        .filter((rule) => rule.enabled)
        .flatMap((rule) => {
          if (rule.store === "both") return ["Steam", "GMG"];
          if (rule.store === "steam") return ["Steam"];
          if (rule.store === "gmg") return ["GMG"];
          return [];
        }),
    ),
  ];

  return stores.length ? stores.join(" + ") : "No active stores";
}

export function formatAlertThreshold(rules = []) {
  const activeRules = rules.filter((rule) => rule.enabled);

  if (!activeRules.length) return "No active alerts";

  return [
    ...new Set(
      activeRules.map((rule) => {
        if (rule.type === "target_price") {
          return `≤ ${new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: rule.currency || "INR",
            maximumFractionDigits: 2,
          }).format(Number(rule.targetPrice))}`;
        }

        if (rule.type === "minimum_discount") {
          return `≥ ${Number(rule.minimumDiscount)}% off`;
        }

        if (rule.type === "first_listing") return "First listing";

        return "Custom alert";
      }),
    ),
  ].join(", ");
}

export function formatAlertStatus(rules = []) {
  if (!rules.length) return "No alerts configured";

  const activeCount = rules.filter((rule) => rule.enabled).length;

  if (activeCount === 0) return "Paused";
  if (activeCount === rules.length) return "Active";

  return "Partially active";
}
