function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function formatPrice(value, currency = "INR") {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "Price unavailable";
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency, maximumFractionDigits: 2,
  }).format(amount);
}

function emailContent(event) {
  const game = event.tracked_game?.game?.title || event.store_product?.product_title || "Tracked game";
  const edition = event.tracked_game?.edition || event.store_product?.edition || "";
  const store = event.store_product?.store === "gmg" ? "Green Man Gaming" : "Steam";
  const url = event.store_product?.product_url || "https://store.steampowered.com/";
  const price = formatPrice(event.price, event.currency);
  const original = event.original_price == null ? "" : formatPrice(event.original_price, event.currency);
  const discount = Number.isFinite(Number(event.discount_percent)) ? `${Number(event.discount_percent)}% off` : "";
  const subject = `GamePulse deal alert: ${game}${discount ? ` — ${discount}` : ""}`;
  const details = [edition, store, price, original ? `Was ${original}` : "", discount].filter(Boolean);
  const text = [
    `GamePulse deal alert`, "", `${game}${edition ? ` (${edition})` : ""}`,
    event.message || "Your alert condition has been reached.", "",
    ...details, "", `View listing: ${url}`, "",
    "You received this because you enabled a price alert in GamePulse.",
  ].join("\n");
  const html = `<!doctype html><html><body style="margin:0;background:#09090b;color:#f4f4f5;font-family:Arial,sans-serif;padding:32px"><div style="max-width:560px;margin:auto;border:1px solid #27272a;border-radius:18px;padding:28px;background:#111113"><p style="color:#a1a1aa;font-size:12px;letter-spacing:2px;text-transform:uppercase">GamePulse alert</p><h1 style="font-size:24px;margin:8px 0 16px">${escapeHtml(game)}</h1><p style="color:#d4d4d8;line-height:1.6">${escapeHtml(event.message || "Your alert condition has been reached.")}</p><div style="background:#18181b;border-radius:12px;padding:16px;margin:22px 0"><p style="font-size:22px;font-weight:700;margin:0 0 8px">${escapeHtml(price)}</p><p style="margin:0;color:#a1a1aa">${escapeHtml([edition, store, original ? `Was ${original}` : "", discount].filter(Boolean).join(" · "))}</p></div><a href="${escapeHtml(url)}" style="display:inline-block;background:#d9f99d;color:#18181b;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:9px">View deal</a><p style="font-size:12px;line-height:1.5;color:#71717a;margin-top:28px">You received this because you enabled a price alert in GamePulse.</p></div></body></html>`;
  return { subject, text, html };
}

export async function sendPendingAlertEmails(supabase, { limit = 50 } = {}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY is not configured; alert email delivery skipped.");
    return { attempted: 0, sent: 0, failed: 0, skipped: true };
  }

  const { data: events, error } = await supabase
    .from("alert_events")
    .select(`id,user_id,message,event_type,price,original_price,discount_percent,currency,created_at,
      tracked_game:tracked_games ( edition, game:game_catalog ( title ) ),
      store_product:store_products ( store,product_title,product_url,edition )`)
    .is("email_sent_at", null)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;

  let sent = 0;
  let failed = 0;
  for (const event of events || []) {
    try {
      const { data: userResult, error: userError } = await supabase.auth.admin.getUserById(event.user_id);
      if (userError) throw userError;
      const email = userResult?.user?.email;
      if (!email) throw new Error("The account has no email address.");

      const content = emailContent(event);
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || "GamePulse <alerts@send.adityasharma.site>",
          to: [email],
          subject: content.subject,
          text: content.text,
          html: content.html,
          tags: [{ name: "category", value: "game-deal-alert" }, { name: "event_id", value: event.id }],
        }),
        signal: AbortSignal.timeout(15000),
      });
      const responseBody = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(responseBody.message || responseBody.error || `Resend returned HTTP ${response.status}.`);

      const { error: updateError } = await supabase
        .from("alert_events")
        .update({ email_sent_at: new Date().toISOString(), email_error: null })
        .eq("id", event.id)
        .is("email_sent_at", null);
      if (updateError) throw updateError;
      sent += 1;
    } catch (sendError) {
      failed += 1;
      const message = String(sendError?.message || "Email delivery failed.").slice(0, 1000);
      console.error(`Alert email failed for event ${event.id}:`, message);
      await supabase.from("alert_events").update({ email_error: message }).eq("id", event.id);
    }
  }

  return { attempted: (events || []).length, sent, failed, skipped: false };
}
