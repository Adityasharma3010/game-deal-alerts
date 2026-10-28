import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { sendPendingAlertEmails } from "./_lib/alert-email.js";

function authorized(req) {
  const secret = process.env.GAMEPULSE_CRON_SECRET;
  const authorization = req.headers.authorization || "";
  const provided = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!secret || !provided) return false;
  const a = Buffer.from(secret);
  const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}

function parsePriceFromHtml(html) {
  const candidates = [];
  const addCandidate = (price, currency, title = null) => {
    const amount = Number(price);
    const code = String(currency || "").trim().toUpperCase();
    if (Number.isFinite(amount) && amount >= 0 && code === "INR") {
      candidates.push({ price: amount, currency: code, title });
    }
  };

  // First prefer structured Product/Offer data, which ties the amount to a product.
  const scripts = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const match of scripts) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const visit = (value) => {
        if (!value || typeof value !== "object") return;
        if (Array.isArray(value)) return value.forEach(visit);
        const type = value["@type"];
        const types = Array.isArray(type) ? type : [type];
        if (types.some((entry) => String(entry || "").split("/").pop() === "Product")) {
          const offers = Array.isArray(value.offers) ? value.offers : [value.offers];
          for (const offer of offers) {
            if (offer && typeof offer === "object") {
              addCandidate(offer.price ?? offer.lowPrice, offer.priceCurrency, value.name);
            }
          }
        }
        Object.values(value).forEach(visit);
      };
      visit(parsed);
    } catch { /* Ignore malformed JSON-LD blocks. */ }
  }

  // Some localized storefront pages publish the same verified price in meta tags
  // rather than JSON-LD. Require an explicit INR currency tag; never infer currency
  // from the user's region or convert a foreign-currency price.
  const metaTags = [...html.matchAll(/<meta\b[^>]*>/gi)].map((match) => match[0]);
  const metaValue = (tag, attribute, expected) => {
    const attr = tag.match(new RegExp(`\\b${attribute}\\s*=\\s*["']([^"']+)["']`, "i"));
    return attr && attr[1].toLowerCase() === expected.toLowerCase()
      ? (tag.match(/\bcontent\s*=\s*["']([^"']+)["']/i) || [])[1] || null
      : null;
  };
  const currencyMeta = metaTags.map((tag) =>
    metaValue(tag, "property", "product:price:currency")
      || metaValue(tag, "itemprop", "priceCurrency")
      || metaValue(tag, "name", "priceCurrency")
  ).find(Boolean);
  const amountMeta = metaTags.map((tag) =>
    metaValue(tag, "property", "product:price:amount")
      || metaValue(tag, "itemprop", "price")
      || metaValue(tag, "name", "price")
  ).find(Boolean);
  if (currencyMeta && amountMeta) addCandidate(amountMeta, currencyMeta);

  // Also support itemprop attributes directly on price elements, but only when
  // the page explicitly declares INR in a currency meta tag.
  if (currencyMeta) {
    const itempropPrice = html.match(/<[^>]*itemprop=["']price["'][^>]*content=["']([^"']+)["'][^>]*>/i)
      || html.match(/<[^>]*content=["']([^"']+)["'][^>]*itemprop=["']price["'][^>]*>/i);
    if (itempropPrice) addCandidate(itempropPrice[1], currencyMeta);
  }

  const valid = candidates[0];
  if (!valid) {
    throw new Error("Could not find a verified INR product price in Green Man Gaming page metadata. Confirm the product URL is localized to India and exposes an INR price; foreign-currency prices are intentionally not converted.");
  }
  return {
    currentPrice: valid.price,
    currency: "INR",
    name: valid.title || null,
    originalPrice: null,
    discountPercent: 0,
  };
}

async function fetchGmgProduct(url) {
  const parsedUrl = new URL(url);
  if (parsedUrl.protocol !== "https:" || !/(^|\.)greenmangaming\.com$/i.test(parsedUrl.hostname)) {
    throw new Error("GMG product URL must be an HTTPS URL on greenmangaming.com.");
  }
  const response = await fetch(parsedUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; GamePulsePriceMonitor/1.0)", Accept: "text/html,application/xhtml+xml" },
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Green Man Gaming returned HTTP ${response.status}.`);
  const finalUrl = new URL(response.url);
  if (!/(^|\.)greenmangaming\.com$/i.test(finalUrl.hostname)) throw new Error("GMG redirected outside its official domain.");
  const html = await response.text();
  const price = parsePriceFromHtml(html);
  const discountMatch = html.match(/(?:discountPercentage|discount_percent|discountPercent)["']?\s*[:=]\s*["']?(\d{1,3})/i);
  if (discountMatch) price.discountPercent = Math.max(0, Math.min(100, Number(discountMatch[1])));
  const originalMatch = html.match(/(?:highPrice|originalPrice|listPrice)["']?\s*[:=]\s*["']?(\d+(?:\.\d{1,2})?)/i);
  if (originalMatch && Number(originalMatch[1]) > price.currentPrice) {
    price.originalPrice = Number(originalMatch[1]);
    if (!price.discountPercent) price.discountPercent = Math.round((1 - price.currentPrice / price.originalPrice) * 100);
  }
  return { ...price, productUrl: response.url };
}

async function mapLimit(items, limit, callback) {
  const results = new Array(items.length);
  let index = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const current = index++;
      if (current >= items.length) return;
      try { results[current] = { ok: true, value: await callback(items[current]) }; }
      catch (error) { results[current] = { ok: false, error }; }
    }
  }));
  return results;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Method not allowed. Use POST." }); }
  if (!authorized(req)) return res.status(401).json({ error: "Unauthorized." });

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(500).json({ error: "Monitoring is not configured on the server." });
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    const { data: trackedGames, error: queryError } = await supabase.from("tracked_games").select(`id,user_id,game_id,edition,gmg_region_code,game:game_catalog(id,title),alert_rules(id,store,alert_type,is_enabled)`).not("game_id", "is", null);
    if (queryError) throw queryError;
    const eligible = (trackedGames || []).filter((game) => (game.alert_rules || []).some((rule) => rule.is_enabled && ["gmg", "both"].includes(rule.store)));
    const gameIds = [...new Set(eligible.map((game) => game.game_id))];
    let products = [];
    if (gameIds.length) {
      const { data, error } = await supabase.from("store_products").select("id,game_id,region_code,product_url,product_title,edition,is_verified,last_checked_at").eq("store", "gmg").in("game_id", gameIds);
      if (error) throw error;
      products = data || [];
    }
    const mappingKey = (gameId, region, edition) => `${gameId}:${String(region || "IN").toUpperCase()}:${String(edition || "").trim().toLowerCase()}`;
    const byGameRegionEdition = new Map(products.map((product) => [mappingKey(product.game_id, product.region_code, product.edition), product]));
    const mappedByProduct = new Map(eligible.map((game) => {
      const region = String(game.gmg_region_code || "IN").toUpperCase();
      const product = byGameRegionEdition.get(mappingKey(game.game_id, region, game.edition));
      return product ? [product.id, { product, game }] : null;
    }).filter(Boolean));
    const items = [...mappedByProduct.values()];
    const unmapped = eligible.filter((game) => {
      const region = String(game.gmg_region_code || "IN").toUpperCase();
      return !byGameRegionEdition.has(mappingKey(game.game_id, region, game.edition));
    });

    const results = await mapLimit(items, 3, async ({ product, game }) => {
      const price = await fetchGmgProduct(product.product_url);
      const { data: recordedProduct, error: updateError } = await supabase.from("store_products").update({
        product_url: price.productUrl,
        product_title: price.name || product.product_title || game.game?.title || "Green Man Gaming listing",
        edition: product.edition || game.edition,
        currency: "INR", is_verified: true, last_checked_at: new Date().toISOString(),
      }).eq("id", product.id).select("id").single();
      if (updateError) throw updateError;
      const { data: snapshot, error: snapshotError } = await supabase.rpc("process_store_price_snapshot", {
        p_store_product_id: recordedProduct.id,
        p_price: price.currentPrice,
        p_original_price: price.originalPrice,
        p_discount_percent: price.discountPercent,
        p_is_first_listing: !product.is_verified,
      });
      if (snapshotError) throw snapshotError;
      return { game: game.game?.title, edition: game.edition, price: price.currentPrice, discountPercent: price.discountPercent, eventsCreated: Number(snapshot?.eventsCreated || 0) };
    });

    const successful = results.filter((item) => item?.ok);
    const failed = results.filter((item) => item && !item.ok);
    const mappingFailures = unmapped.map((game) => ({
      message: `No GMG product mapping for ${game.game?.title || "game"} (${game.edition}) in region ${String(game.gmg_region_code || "IN").toUpperCase()}. Add the exact regional product URL again.`,
    }));
    const allFailures = [...failed.map((item) => ({ message: item.error?.message || "Unknown GMG error" })), ...mappingFailures];
    let emailDelivery = { attempted: 0, sent: 0, failed: 0, skipped: true };
    try { emailDelivery = await sendPendingAlertEmails(supabase); }
    catch (error) { console.error("Pending alert email delivery failed:", error.message); emailDelivery = { attempted: 0, sent: 0, failed: 1, skipped: false }; }

    return res.status(allFailures.length ? 502 : 200).json({ success: allFailures.length === 0, checkedAt: new Date().toISOString(), eligibleTrackedEditions: eligible.length, mappedGmgProducts: items.length, packagesChecked: successful.length, packagesFailed: allFailures.length, alertEventsCreated: successful.reduce((sum, item) => sum + Number(item.value.eventsCreated || 0), 0), emailDelivery, results: successful.map((item) => item.value), failures: allFailures });
  } catch (error) {
    console.error("GMG monitor failed:", error);
    return res.status(500).json({ error: "Green Man Gaming monitoring failed. Check server logs for details." });
  }
}
