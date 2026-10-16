import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import Select from "./Select";
import {
  searchSteamGames,
  getSteamGameDetails,
  saveTrackedGame,
} from "../services/games";

const initialAlert = {
  type: "minimum_discount",
  targetPrice: "1599.60",
  minimumDiscount: "10",
};

export default function AddGameModal({ onClose, onSaved }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);

  const [edition, setEdition] = useState("");
  const [editions, setEditions] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const dialogRef = useRef(null);
  const overlayRef = useRef(null);
  const startHeightRef = useRef(null);
  const [layoutVersion, setLayoutVersion] = useState(0);

  function transitionLayout(update) {
    if (dialogRef.current) {
      startHeightRef.current = dialogRef.current.getBoundingClientRect().height;
    }

    update();
    setLayoutVersion((version) => version + 1);
  }

  const [alert, setAlert] = useState(initialAlert);
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
      transitionLayout(() => {
        setError("Choose a game from the search results first.");
      });
      return;
    }

    const selectedEdition = editions.find((option) => option.id === edition);
    if (!selectedEdition?.packageId) {
      transitionLayout(() => {
        setError(
          "Steam has not provided a verifiable purchase package for this option. Choose another purchase option so GamePulse can monitor the exact edition.",
        );
      });
      return;
    }

    setSaving(true);
    setError("");

    try {
      await saveTrackedGame({
        steamAppId: selectedGame.steamAppId,
        title: selectedGame.title,
        coverImageUrl: selectedGame.coverImageUrl,
        edition: selectedEdition.label,
        steamPackageId: selectedEdition.packageId,
        alertType: alert.type,
        targetPrice: alert.targetPrice,
        minimumDiscount: alert.minimumDiscount,
      });

      await onSaved();
      onClose();
    } catch (err) {
      transitionLayout(() => {
        setError(
          err.message?.includes("duplicate key")
            ? "This game edition is already in your collection."
            : err.message || "Unable to save this game.",
        );
      });
    } finally {
      setSaving(false);
    }
  }

  const fieldClass = "gp-input";

  const buttonClass =
    "rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
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
            onClick={onClose}
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

              <div>
                <label
                  htmlFor="alert-type"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Alert condition
                </label>
                <Select
                  value={alert.type}
                  onChange={(value) =>
                    setAlert((current) => ({
                      ...current,
                      type: value,
                    }))
                  }
                  ariaLabel="Alert condition"
                  options={[
                    { value: "minimum_discount", label: "Minimum discount" },
                    { value: "target_price", label: "Target price (INR)" },
                    { value: "first_listing", label: "First verified listing" },
                  ]}
                />
                {alert.type === "first_listing" && (
                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    Notify me when a supported store listing is first verified.
                    This does not require a discount. This alert will only
                    trigger once listing verification is implemented by the
                    monitoring service.
                  </p>
                )}
              </div>

              {alert.type === "minimum_discount" && (
                <div>
                  <label
                    htmlFor="minimum-discount"
                    className="mb-2 block text-sm font-medium text-slate-200"
                  >
                    Minimum discount (%)
                  </label>
                  <input
                    id="minimum-discount"
                    className={fieldClass}
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    required
                    value={alert.minimumDiscount}
                    onChange={(event) =>
                      setAlert((current) => ({
                        ...current,
                        minimumDiscount: event.target.value,
                      }))
                    }
                  />
                </div>
              )}

              {alert.type === "target_price" && (
                <div>
                  <label
                    htmlFor="target-price"
                    className="mb-2 block text-sm font-medium text-slate-200"
                  >
                    Target price (₹)
                  </label>
                  <input
                    id="target-price"
                    className={fieldClass}
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={alert.targetPrice}
                    onChange={(event) =>
                      setAlert((current) => ({
                        ...current,
                        targetPrice: event.target.value,
                      }))
                    }
                  />
                </div>
              )}

              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                <p className="text-sm font-semibold text-slate-200">
                  Store monitoring
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Steam will be saved as the initial store. Green Man Gaming can
                  be added after its exact product and edition are verified.
                </p>
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
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="game-alert-form"
            disabled={!selectedGame || loadingDetails || saving || !edition}
            className={`${buttonClass} border-emerald-400/30 bg-emerald-400 text-[#07110d] hover:bg-emerald-300`}
          >
            {saving ? "Saving..." : "Save game & alert"}
          </button>
        </footer>
      </section>
    </div>
  );
}
