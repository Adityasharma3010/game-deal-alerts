export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const query = typeof req.query?.q === "string" ? req.query.q.trim() : "";

  if (query.length < 2) {
    return res.status(400).json({
      error: "Enter at least two characters to search.",
    });
  }

  if (query.length > 100) {
    return res.status(400).json({
      error: "Search query is too long.",
    });
  }

  try {
    const url = new URL("https://store.steampowered.com/api/storesearch/");

    url.searchParams.set("term", query);
    url.searchParams.set("l", "english");
    url.searchParams.set("cc", "in");

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(`Steam returned HTTP ${response.status}`);
    }

    const payload = await response.json();
    const items = Array.isArray(payload.items) ? payload.items : [];

    const games = items
      .filter((item) => {
        const type = String(item.type || "").toLowerCase();

        return (
          Number.isInteger(Number(item.id)) &&
          Number(item.id) > 0 &&
          (type === "app" || type === "game" || type === "") &&
          typeof item.name === "string" &&
          item.name.trim().length > 0
        );
      })

      .slice(0, 10)
      .map((item) => ({
        steamAppId: Number(item.id),
        title: item.name.trim(),
        coverImageUrl:
          typeof item.tiny_image === "string" &&
          item.tiny_image.startsWith("https://")
            ? item.tiny_image
            : null,
        storeUrl: `https://store.steampowered.com/app/${Number(item.id)}/`,
      }));

    return res.status(200).json({ games });
  } catch (error) {
    console.error("Steam search failed:", error);

    return res.status(502).json({
      error: "Steam search is temporarily unavailable. Please try again.",
    });
  }
}
