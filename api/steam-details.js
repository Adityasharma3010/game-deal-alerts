export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const appId = Number(req.query?.appid);

  if (!Number.isSafeInteger(appId) || appId <= 0) {
    return res.status(400).json({ error: "A valid Steam app ID is required." });
  }

  try {
    const url = new URL("https://store.steampowered.com/api/appdetails");
    url.searchParams.set("appids", String(appId));
    url.searchParams.set("cc", "in");
    url.searchParams.set("l", "english");

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(`Steam returned HTTP ${response.status}`);
    }

    const payload = await response.json();
    const result = payload[String(appId)];

    if (!result?.success || !result.data) {
      return res.status(404).json({
        error: "Steam could not verify this item.",
      });
    }

    const data = result.data;
    const type = String(data.type || "").toLowerCase();

    if (type !== "game") {
      return res.status(422).json({
        error:
          type === "dlc"
            ? "This Steam listing is DLC, not a full game. Select the main game instead."
            : `This Steam listing is "${type || "an unknown type"}", not a verified full game.`,
      });
    }

    function decodeHtml(value) {
      return String(value || "")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&#(\d+);/g, (match, code) => {
          const parsed = Number(code);
          return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : match;
        })
        .replace(/&#x([0-9a-f]+);/gi, (match, code) => {
          const parsed = Number.parseInt(code, 16);
          return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : match;
        });
    }

    function stripHtml(value) {
      return decodeHtml(
        String(value || "")
          .replace(/<br\s*\/?>/gi, " ")
          .replace(/<\/(?:div|p|li)>/gi, " ")
          .replace(/<[^>]*>/g, " "),
      )
        .replace(/\s+/g, " ")
        .trim();
    }

    function parseInrPrice(value) {
      const match = stripHtml(value).match(/₹\s*([\d,]+(?:\.\d{1,2})?)/);
      if (!match) return null;
      const amount = Number(match[1].replace(/,/g, ""));
      return Number.isFinite(amount) && amount >= 0 ? amount : null;
    }

    function parsePackageOption(optionText) {
      const raw = typeof optionText === "string" ? optionText : "";
      const originalPriceMatch = raw.match(
        /<span\b[^>]*class\s*=\s*["'][^"']*\bdiscount_original_price\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i,
      );
      const originalPrice = originalPriceMatch
        ? parseInrPrice(originalPriceMatch[1])
        : null;

      const withoutOriginalPrice = raw.replace(
        /<span\b[^>]*class\s*=\s*["'][^"']*\bdiscount_original_price\b[^"']*["'][^>]*>[\s\S]*?<\/span>/gi,
        " ",
      );

      const cleanText = stripHtml(withoutOriginalPrice);
      const currentPrice = parseInrPrice(cleanText);
      const label = cleanText
        .replace(/₹\s*[\d,]+(?:\.\d{1,2})?/g, " ")
        .replace(/\s*[-–—:|]\s*$/g, "")
        .replace(/\s+/g, " ")
        .trim();

      return {
        label,
        currentPrice,
        originalPrice:
          originalPrice !== null &&
          currentPrice !== null &&
          originalPrice > currentPrice
            ? originalPrice
            : null,
        currency: "INR",
      };
    }

    const editions = [];
    const seenPackageIds = new Set();

    for (const group of data.package_groups || []) {
      for (const sub of group.subs || []) {
        const rawLabel =
          typeof sub.option_text === "string" ? sub.option_text : "";
        const cleanedText = stripHtml(rawLabel);

        // Do not list monthly payment-plan entries as separate editions.
        if (/₹\s*[\d,.]+\s*\/\s*month/i.test(cleanedText)) {
          continue;
        }

        const packageId = Number(sub.packageid);
        const parsed = parsePackageOption(rawLabel);

        if (
          !parsed.label ||
          !Number.isSafeInteger(packageId) ||
          packageId <= 0 ||
          seenPackageIds.has(packageId)
        ) {
          continue;
        }

        seenPackageIds.add(packageId);
        editions.push({
          id: String(packageId),
          label: parsed.label,
          packageId,
          currentPrice: parsed.currentPrice,
          originalPrice: parsed.originalPrice,
          currency: parsed.currency,
        });
      }
    }

    if (editions.length === 0) {
      editions.push({
        id: `app-${appId}`,
        label: "Base game (Steam listing)",
        packageId: null,
        currentPrice: null,
        originalPrice: null,
        currency: "INR",
      });
    }

    return res.status(200).json({
      game: {
        steamAppId: appId,
        title: data.name,
        type,
        coverImageUrl:
          typeof data.header_image === "string" &&
          data.header_image.startsWith("https://")
            ? data.header_image
            : null,
      },
      editions,
    });
  } catch (error) {
    console.error("Steam details lookup failed:", error);

    return res.status(502).json({
      error: "Unable to verify this Steam item right now. Please try again.",
    });
  }
}
