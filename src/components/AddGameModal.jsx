import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import Select from "./Select";
import {
  searchSteamGames,
  getSteamGameDetails,
  saveTrackedGame,
} from "../services/games";

const initialAlert = {
  targetPriceEnabled: false,
  targetPrice: "1599.60",
  minimumDiscountEnabled: true,
  minimumDiscount: "10",
  firstListingEnabled: false,
};

export default function AddGameModal({ onClose, onSaved, onSavingChange }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);

  const [edition, setEdition] = useState("");
  const [editions, setEditions] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const dialogRef = useRef(null);
  const overlayRef = useRef(null);
  const startHeightRef = useRef(null);
  const closingRef = useRef(false);
  const closedVisuallyRef = useRef(false);
  const [layoutVersion, setLayoutVersion] = useState(0);

  function transitionLayout(update) {
    if (dialogRef.current) {
      startHeightRef.current = dialogRef.current.getBoundingClientRect().height;
    }

    update();
    setLayoutVersion((version) => version + 1);
  }

  const [alert, setAlert] = useState(initialAlert);
  const [storeSelection, setStoreSelection] = useState("steam");
  const [gmgProductUrl, setGmgProductUrl] = useState("");
  const [regionCode, setRegionCode] = useState("IN");
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const overlay = overlayRef.current;

    if (!dialog || !overlay) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      startHeightRef.current = null;
      return;
    }

    const context = gsap.context(() => {
      if (layoutVersion === 0) {
        gsap.fromTo(
          overlay,
          { opacity: 0 },
          { opacity: 1, duration: 0.2, ease: "power1.out" },
        );

        gsap.fromTo(
          dialog,
          { opacity: 0, y: 14, scale: 0.985 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.3,
            ease: "power2.out",
          },
        );

        return;
      }

      const startHeight = startHeightRef.current;
      startHeightRef.current = null;

      if (startHeight !== null) {
        gsap.set(dialog, { height: startHeight });

        gsap.to(dialog, {
          height: "auto",
          duration: 0.35,
          ease: "power2.out",
          clearProps: "height",
        });
      }
    });

    return () => context.revert();
  }, [layoutVersion]);

  function animateOpen() {
    closingRef.current = false;
    closedVisuallyRef.current = false;
    const overlay = overlayRef.current;
    const dialog = dialogRef.current;
    if (!overlay || !dialog || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      if (overlay) gsap.set(overlay, { autoAlpha: 1, clearProps: "all" });
      if (dialog) gsap.set(dialog, { autoAlpha: 1, y: 0, scale: 1, clearProps: "all" });
      return;
    }
    gsap.killTweensOf([overlay, dialog]);
    gsap.set(overlay, { autoAlpha: 1 });
    gsap.fromTo(dialog, { autoAlpha: 0, y: 12, scale: 0.985 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.24, ease: "power2.out", clearProps: "transform" });
    gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.18, ease: "power1.out" });
  }

  function animateClose({ keepMounted = false } = {}) {
    if (closingRef.current) return Promise.resolve();
    closingRef.current = true;
    const overlay = overlayRef.current;
    const dialog = dialogRef.current;
    const finish = () => {
      closedVisuallyRef.current = true;
      if (!keepMounted) onClose();
    };
    if (!overlay || !dialog || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finish();
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      gsap.killTweensOf([overlay, dialog]);
      gsap.timeline({ onComplete: () => { finish(); resolve(); } })
        .to(dialog, { autoAlpha: 0, y: 10, scale: 0.985, duration: 0.17, ease: "power1.in" })
        .to(overlay, { autoAlpha: 0, duration: 0.15, ease: "power1.in" }, "<0.025");
    });
  }

  async function handleSearch(event) {
    event.preventDefault();
    if (query.trim().length < 2) {
      transitionLayout(() => {
        setError("Enter at least two characters.");
      });
      return;
    }

    setLoadingSearch(true);
    setError("");
    transitionLayout(() => {
      setSelectedGame(null);
      setResults([]);
      setEditions([]);
      setEdition("");
    });

    try {
      const games = await searchSteamGames(query);

      transitionLayout(() => {
        setResults(games);
      });

      if (!games.length) {
        transitionLayout(() => {
          setError("No matching games found. Try another search.");
        });
      }
    } catch (err) {
      transitionLayout(() => {
        setError(err.message || "Unable to search Steam right now.");
      });
    } finally {
      setLoadingSearch(false);
    }
  }

  async function handleSelectGame(game) {
    transitionLayout(() => {
      setSelectedGame(null);
      setEditions([]);
      setEdition("");
      setLoadingDetails(true);
      setError("");
    });

    try {
      const details = await getSteamGameDetails(game.steamAppId);

      transitionLayout(() => {
        setSelectedGame({
          ...game,
          title: details.game.title || game.title,
          coverImageUrl: details.game.coverImageUrl || game.coverImageUrl,
        });

        setEditions(details.editions);

        // Select the first real option returned by Steam.
        setEdition(details.editions[0]?.id || "");
      });
    } catch (err) {
      transitionLayout(() => {
        setSelectedGame(null);
        setEditions([]);
        setEdition("");
        setError(err.message || "Unable to verify this Steam item.");
      });
    } finally {
      transitionLayout(() => setLoadingDetails(false));
    }
  }

  async function handleSave(event) {
    event.preventDefault();

    if (!selectedGame) {
      transitionLayout(() => setError("Choose a game from the search results first."));
      return;
    }

    const selectedEdition = editions.find((option) => option.id === edition);
    if ((storeSelection === "steam" || storeSelection === "both") && !selectedEdition?.packageId) {
      transitionLayout(() => setError("Steam has not provided a verifiable purchase package for this option. Choose another edition or select GMG only."));
      return;
    }
    if (storeSelection === "gmg" || storeSelection === "both") {
      let parsedUrl;
      try { parsedUrl = new URL(gmgProductUrl.trim()); } catch { parsedUrl = null; }
      if (!parsedUrl || parsedUrl.protocol !== "https:" || !/(^|\.)greenmangaming\.com$/i.test(parsedUrl.hostname)) {
        transitionLayout(() => setError("Enter the exact official HTTPS Green Man Gaming product URL for the selected edition."));
        return;
      }
      if (!/^[A-Z]{2}$/.test(regionCode.toUpperCase())) {
        transitionLayout(() => setError("Enter a two-letter region code, such as IN, US, or GB."));
        return;
      }
    }

    const selectedAlerts = [
      ...(alert.targetPriceEnabled ? [{ type: "target_price", targetPrice: alert.targetPrice }] : []),
      ...(alert.minimumDiscountEnabled ? [{ type: "minimum_discount", minimumDiscount: alert.minimumDiscount }] : []),
      ...(alert.firstListingEnabled ? [{ type: "first_listing" }] : []),
    ];
    if (!selectedAlerts.length) {
      transitionLayout(() => setError("Choose at least one alert condition."));
      return;
    }
    if (alert.targetPriceEnabled && !(Number(alert.targetPrice) > 0)) {
      transitionLayout(() => setError("Enter a target price greater than zero."));
      return;
    }
    if (alert.minimumDiscountEnabled && !(Number(alert.minimumDiscount) >= 1 && Number(alert.minimumDiscount) <= 100)) {
      transitionLayout(() => setError("Minimum discount must be between 1 and 100."));
      return;
    }

    setSaving(true);
    setError("");
    onSavingChange?.(true);

    // Close visually first, but keep this component mounted while the request runs.
    // If saving fails, the user's selections remain intact and the modal reopens.
    await animateClose({ keepMounted: true });

    try {
      await saveTrackedGame({
        steamAppId: selectedGame.steamAppId,
        title: selectedGame.title,
        coverImageUrl: selectedGame.coverImageUrl,
        edition: selectedEdition.label,
        steamPackageId: selectedEdition.packageId,
        alerts: selectedAlerts,
        storeSelection,
        gmgProductUrl,
        regionCode,
      });

      await onSaved();
      onClose();
    } catch (err) {
      setError(err.message?.includes("duplicate key")
        ? "This game edition is already in your collection."
        : err.message || "Unable to save this game. Your selections are still here—please try again.");
      animateOpen();
    } finally {
      setSaving(false);
      onSavingChange?.(false);
    }
  }

  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !dialogRef.current) return;
    const options = dialogRef.current.querySelectorAll("[data-alert-option]");
    if (options.length) gsap.fromTo(options, { y: 4 }, { y: 0, duration: 0.2, stagger: 0.035, ease: "power2.out", overwrite: "auto" });
    const fields = dialogRef.current.querySelectorAll("[data-alert-field]");
    if (fields.length) gsap.fromTo(fields, { autoAlpha: 0, y: -5, height: 0 }, { autoAlpha: 1, y: 0, height: "auto", duration: 0.24, stagger: 0.035, ease: "power2.out", overwrite: "auto", clearProps: "all" });
  }, [alert.targetPriceEnabled, alert.minimumDiscountEnabled, alert.firstListingEnabled]);

  const fieldClass = "gp-input";

  const buttonClass =
    "rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) animateClose();
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-game-title"
        className="my-auto flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#10131b] shadow-2xl"
      >
        <header className="sticky top-0 z-20 flex shrink-0 items-start justify-between border-b border-white/[0.07] bg-[#10131b] p-5 sm:p-6">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">
              Expand your collection
            </p>
            <h2 id="add-game-title" className="text-xl font-bold text-white">
              Add a game
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Search Steam, choose an edition, and configure your alert.
            </p>
          </div>

          <button
            type="button"
            className={buttonClass}
            onClick={() => animateClose()}
            disabled={saving}
            aria-label="Close Add Game"
          >
            ✕
          </button>
        </header>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="space-y-6 p-5 sm:p-6">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                className={fieldClass}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search for a Steam game..."
                aria-label="Search Steam games"
                minLength={2}
                maxLength={100}
              />
              <button
                type="submit"
                className={`${buttonClass} border-emerald-400/30 bg-emerald-400/10 text-emerald-300`}
                disabled={loadingSearch}
              >
                {loadingSearch ? "Searching..." : "Search"}
              </button>
            </form>

            {results.length > 0 && !selectedGame && (
              <div className="custom-scrollbar max-h-64 space-y-2 overflow-y-auto">
                {results.map((game) => (
                  <button
                    key={game.steamAppId}
                    type="button"
                    disabled={loadingDetails || loadingSearch}
                    onClick={() => handleSelectGame(game)}
                    className="flex w-full items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-left transition hover:border-emerald-400/40 hover:bg-emerald-400/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {game.coverImageUrl ? (
                      <img
                        src={game.coverImageUrl}
                        alt=""
                        className="h-12 w-20 rounded-lg object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-12 w-20 rounded-lg bg-white/5" />
                    )}

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-100">
                        {game.title}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        Steam app ID: {game.steamAppId}
                      </span>
                    </span>

                    <span className="text-xs text-emerald-300">Select →</span>
                  </button>
                ))}
              </div>
            )}

            {selectedGame && (
              <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/[0.05] p-4">
                <div className="flex items-center gap-3">
                  {selectedGame.coverImageUrl && (
                    <img
                      src={selectedGame.coverImageUrl}
                      alt=""
                      className="h-14 w-24 rounded-lg object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                      Selected game
                    </p>
                    <p className="mt-1 font-semibold text-white">
                      {selectedGame.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      App ID: {selectedGame.steamAppId}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-slate-400 underline"
                    onClick={() => {
                      transitionLayout(() => {
                        setSelectedGame(null);
                        setEditions([]);
                        setEdition("");
                        setError("");
                      });
                    }}
                  >
                    Change
                  </button>
                </div>
              </div>
            )}

            <form
              id="game-alert-form"
              onSubmit={handleSave}
              className="space-y-5"
            >
              <div>
                <label
                  htmlFor="game-edition"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Steam purchase option / edition
                </label>

                <Select
                  value={edition}
                  onChange={setEdition}
                  disabled={loadingDetails || !editions.length}
                  ariaLabel="Steam purchase option or edition"
                  placeholder={
                    loadingDetails
                      ? "Verifying Steam listing..."
                      : "Select a Steam edition"
                  }
                  options={editions.map((option) => ({
                    value: option.id,
                    label: option.label,
                    currentPrice: option.currentPrice,
                    originalPrice: option.originalPrice,
                    currency: option.currency || "INR",
                  }))}
                />

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Options come from the selected Steam game's purchase data. If
                  Steam does not expose edition options, only the verified
                  base-game listing is offered.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-slate-200">Alert conditions</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Enable any combination. Each condition is saved as an independent alert.</p>
                </div>

                <label data-alert-option className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.08] p-4 transition hover:border-emerald-400/30">
                  <input type="checkbox" className="mt-1 accent-emerald-400" checked={alert.targetPriceEnabled} onChange={(event) => setAlert((current) => ({ ...current, targetPriceEnabled: event.target.checked }))} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-100">Target price</span>
                    <span className="mt-1 block text-xs text-slate-400">Notify when the price reaches or drops below your amount.</span>
                    {alert.targetPriceEnabled && <span data-alert-field className="mt-3 block"><span className="mb-1 block text-xs text-slate-400">Target price (₹)</span><input className={fieldClass} type="number" min="0.01" step="0.01" required value={alert.targetPrice} onChange={(event) => setAlert((current) => ({ ...current, targetPrice: event.target.value }))} /></span>}
                  </span>
                </label>

                <label data-alert-option className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.08] p-4 transition hover:border-emerald-400/30">
                  <input type="checkbox" className="mt-1 accent-emerald-400" checked={alert.minimumDiscountEnabled} onChange={(event) => setAlert((current) => ({ ...current, minimumDiscountEnabled: event.target.checked }))} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-100">Minimum discount</span>
                    <span className="mt-1 block text-xs text-slate-400">Notify when the discount reaches your chosen percentage.</span>
                    {alert.minimumDiscountEnabled && <span data-alert-field className="mt-3 block"><span className="mb-1 block text-xs text-slate-400">Minimum discount (%)</span><input className={fieldClass} type="number" min="1" max="100" step="1" required value={alert.minimumDiscount} onChange={(event) => setAlert((current) => ({ ...current, minimumDiscount: event.target.value }))} /></span>}
                  </span>
                </label>

                <label data-alert-option className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.08] p-4 transition hover:border-emerald-400/30">
                  <input type="checkbox" className="mt-1 accent-emerald-400" checked={alert.firstListingEnabled} onChange={(event) => setAlert((current) => ({ ...current, firstListingEnabled: event.target.checked }))} />
                  <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-100">First verified listing</span><span className="mt-1 block text-xs leading-5 text-slate-400">Notify when a supported store listing is first verified. This depends on the monitor detecting a first listing.</span></span>
                </label>
              </div>

              <div className="space-y-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-200">Where should GamePulse track this game?</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">Choose stores for this edition. Steam and GMG are monitored independently.</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {[{ value: "steam", label: "Steam only" }, { value: "gmg", label: "GMG only" }, { value: "both", label: "Both stores" }].map((option) => (
                    <label key={option.value} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm ${storeSelection === option.value ? "border-emerald-400/60 bg-emerald-400/[0.08] text-emerald-200" : "border-white/10 text-slate-300"}`}>
                      <input type="radio" name="store-selection" value={option.value} checked={storeSelection === option.value} onChange={() => setStoreSelection(option.value)} className="accent-emerald-400" />
                      {option.label}
                    </label>
                  ))}
                </div>
                {(storeSelection === "gmg" || storeSelection === "both") && <div className="space-y-3 rounded-lg border border-white/[0.07] p-3">
                  <div>
                    <label htmlFor="gmg-product-url" className="mb-1 block text-sm font-medium text-slate-200">Exact GMG product URL</label>
                    <input id="gmg-product-url" className={fieldClass} type="url" placeholder="https://www.greenmangaming.com/games/.../" value={gmgProductUrl} onChange={(event) => setGmgProductUrl(event.target.value)} required />
                    <p className="mt-1 text-xs leading-5 text-slate-500">Use the official product page for this exact edition and region—not a search-results URL. The monitor will verify whether it exposes a supported price.</p>
                  </div>
                  <div>
                    <label htmlFor="gmg-region" className="mb-1 block text-sm font-medium text-slate-200">GMG region code</label>
                    <input id="gmg-region" className={fieldClass} type="text" maxLength={2} autoCapitalize="characters" placeholder="IN" value={regionCode} onChange={(event) => setRegionCode(event.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2))} required />
                    <p className="mt-1 text-xs leading-5 text-slate-500">Enter the country code for the GMG product page (for example, IN for India). This code must match the actual key restrictions. Current price processing accepts INR metadata only; other currencies will fail validation rather than be converted or guessed.</p>
                  </div>
                  <p className="text-xs leading-5 text-amber-200/80">GMG tracking stays unverified until the monitor confirms a valid regional listing and supported price. If GMG fails, Steam monitoring remains active when Both is selected.</p>
                </div>}
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-lg border border-red-400/20 bg-red-400/[0.06] p-3 text-sm text-red-300"
                >
                  {error}
                </p>
              )}
            </form>
          </div>
        </div>

        <footer className="z-10 flex shrink-0 flex-col-reverse gap-3 border-t border-white/[0.08] bg-[#10131b] p-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            className={buttonClass}
            onClick={() => animateClose()}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="game-alert-form"
            disabled={!selectedGame || loadingDetails || saving || !edition || !(alert.targetPriceEnabled || alert.minimumDiscountEnabled || alert.firstListingEnabled)}
            className={`${buttonClass} border-emerald-400/30 bg-emerald-400 text-[#07110d] hover:bg-emerald-300`}
          >
            {saving ? "Saving..." : "Save game & alerts"}
          </button>
        </footer>
      </section>
    </div>
  );
}
