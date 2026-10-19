import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { sendPendingAlertEmails } from "./_lib/alert-email.js";

const jsonHeaders = { "Cache-Control": "no-store" };

function isAuthorized(req, secret) {
  const authorization = req.headers.authorization || "";
  const provided = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";
  if (!secret || !provided) return false;
  const expectedBuffer = Buffer.from(secret);
  const providedBuffer = Buffer.from(provided);
  return (
    expectedBuffer.length === providedBuffer.length &&
    timingSafeEqual(expectedBuffer, providedBuffer)
  );
}

async function fetchPackage(packageId) {
  const url = new URL("https://store.steampowered.com/api/packagedetails");
  url.searchParams.set("packageids", String(packageId));
  url.searchParams.set("cc", "in");
  url.searchParams.set("l", "english");

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Steam returned HTTP ${response.status}`);

  const payload = await response.json();
  const result = payload[String(packageId)];
  if (!result?.success || !result.data) {
    throw new Error(`Steam could not verify package ${packageId}.`);
  }

  const data = result.data;
  const price = data.price || data.price_overview || null;
  if (!price) throw new Error(`Steam has no public price for package ${packageId}.`);

  const currency = String(price.currency || "").toUpperCase();
  if (currency !== "INR") {
    throw new Error(`Steam returned ${currency || "an unknown currency"} for package ${packageId}; INR-only monitoring skipped it.`);
  }

  const finalMinor = Number(price.final);
  const initialMinor = Number(price.initial);
  if (!Number.isFinite(finalMinor) || finalMinor < 0) {
    throw new Error(`Steam returned an invalid current price for package ${packageId}.`);
  }

  const currentPrice = Math.round((finalMinor / 100) * 100) / 100;
  const initialPrice = Number.isFinite(initialMinor) && initialMinor >= finalMinor
    ? Math.round((initialMinor / 100) * 100) / 100
    : null;
  const discount = Number(price.discount_percent);
  const discountPercent = Number.isFinite(discount)
    ? Math.max(0, Math.min(100, Math.trunc(discount)))
    : initialPrice && initialPrice > currentPrice
      ? Math.round((1 - currentPrice / initialPrice) * 100)
      : 0;

  return {
    currentPrice,
    originalPrice: initialPrice && initialPrice > currentPrice ? initialPrice : null,
    discountPercent,
    currency,
    name: typeof data.name === "string" ? data.name : null,
  };
}

async function mapWithConcurrency(items, limit, callback) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      try {
        results[index] = { ok: true, value: await callback(items[index]) };
      } catch (error) {
        results[index] = { ok: false, error };
      }
    }
  });
  await Promise.all(workers);
  return results;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", jsonHeaders["Cache-Control"]);

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  if (!isAuthorized(req, process.env.GAMEPULSE_CRON_SECRET)) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Steam monitor is missing server-side Supabase environment variables.");
    return res.status(500).json({ error: "Monitoring is not configured on the server." });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data: trackedGames, error: queryError } = await supabase
      .from("tracked_games")
      .select(`
        id, user_id, game_id, edition, steam_package_id,
        game:game_catalog ( id, title, steam_app_id ),
        alert_rules ( id, store, alert_type, is_enabled )
      `)
      .not("steam_package_id", "is", null);

    if (queryError) throw queryError;

    const eligibleGames = (trackedGames || []).filter((game) =>
      (game.alert_rules || []).some(
        (rule) => rule.is_enabled && ["steam", "both"].includes(rule.store),
      ),
    );
    const packageMap = new Map();
    for (const game of eligibleGames) {
      const packageId = Number(game.steam_package_id);
      if (!Number.isSafeInteger(packageId) || packageId <= 0 || !game.game?.id) continue;
      const key = `${game.game.id}:${packageId}`;
      if (!packageMap.has(key)) packageMap.set(key, {
        key,
        gameId: game.game.id,
        gameTitle: game.game.title,
        steamAppId: game.game.steam_app_id,
        packageId,
        edition: game.edition,
      });
    }

    const packages = [...packageMap.values()];
    const results = await mapWithConcurrency(packages, 4, async (item) => {
      const price = await fetchPackage(item.packageId);
      const productUrl = `https://store.steampowered.com/app/${item.steamAppId}/?packageid=${item.packageId}`;

      const { data: existing, error: existingError } = await supabase
        .from("store_products")
        .select("id,is_verified")
        .eq("store", "steam")
        .eq("game_id", item.gameId)
        .eq("steam_package_id", item.packageId)
        .maybeSingle();
      if (existingError) throw existingError;
      const isFirstListing = !existing?.is_verified;

      const { data: product, error: upsertError } = await supabase
        .from("store_products")
        .upsert({
          game_id: item.gameId,
          store: "steam",
          product_url: productUrl,
          product_title: price.name || item.gameTitle,
          edition: item.edition,
          steam_package_id: item.packageId,
          currency: "INR",
          is_verified: true,
          last_checked_at: new Date().toISOString(),
        }, { onConflict: "store,game_id,steam_package_id" })
        .select("id")
        .single();
      if (upsertError) throw upsertError;

      const { data: recorded, error: recordError } = await supabase.rpc(
        "process_steam_price_snapshot",
        {
          p_store_product_id: product.id,
          p_price: price.currentPrice,
          p_original_price: price.originalPrice,
          p_discount_percent: price.discountPercent,
          p_is_first_listing: isFirstListing,
        },
      );
      if (recordError) throw recordError;

      return {
        packageId: item.packageId,
        game: item.gameTitle,
        price: price.currentPrice,
        discountPercent: price.discountPercent,
        eventsCreated: Number(recorded?.eventsCreated || 0),
      };
    });

    const successful = results.filter((result) => result?.ok);
    const failed = results.filter((result) => result && !result.ok);
    const eventsCreated = successful.reduce((sum, result) => sum + result.value.eventsCreated, 0);
    let emailDelivery = { attempted: 0, sent: 0, failed: 0, skipped: true };
    try {
      emailDelivery = await sendPendingAlertEmails(supabase);
    } catch (emailError) {
      console.error("Pending alert email delivery failed:", emailError.message);
      emailDelivery = { attempted: 0, sent: 0, failed: 1, skipped: false };
    }

    if (failed.length) {
      console.error("Some Steam packages could not be checked:", failed.map((result) => result.error?.message));
    }

    return res.status(failed.length ? 502 : 200).json({
      success: failed.length === 0,
      checkedAt: new Date().toISOString(),
      eligibleTrackedEditions: eligibleGames.length,
      packagesChecked: successful.length,
      packagesFailed: failed.length,
      alertEventsCreated: eventsCreated,
      emailDelivery,
      skippedWithoutPackageId: (trackedGames || []).filter((game) => !game.steam_package_id).length,
      results: successful.map((result) => result.value),
      failures: failed.map((result) => ({ message: result.error?.message || "Unknown package error" })),
    });
  } catch (error) {
    console.error("Steam monitor failed:", error);
    return res.status(500).json({ error: "Steam monitoring failed. Check server logs for details." });
  }
}
