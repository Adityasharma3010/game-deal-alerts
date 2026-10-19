import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import gsap from "gsap";
import {
  formatAlertStatus,
  // formatStores,
  getMyTrackedGames,
  removeTrackedGame,
} from "../services/games";
import AddGameModal from "../components/AddGameModal";
import EditGameAlertsModal from "../components/EditGameAlertsModal";

function GameCard({ game, onEdit, onRemove, removing }) {
  const cardRef = useRef(null);
  const rulesSignature = game.rules
    .map(
      (rule) =>
        `${rule.id || rule.type}:${rule.enabled}:${rule.targetPrice ?? ""}:${rule.minimumDiscount ?? ""}`,
    )
    .join("|");
  const activeRules = game.rules.filter((rule) => rule.enabled);
  const isActive = formatAlertStatus(game.rules) === "Active";
  const price = (value, currency = "INR") =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number(value));

  // Fade the card in without animating its transform. The card's lift-on-hover
  // transform belongs to CSS, so GSAP must not compete with it during hover.
  useLayoutEffect(() => {
    if (
      !cardRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return undefined;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        cardRef.current,
        { autoAlpha: 0 },
        {
          autoAlpha: 1,
          duration: 0.32,
          ease: "power2.out",
          clearProps: "opacity,visibility",
        },
      );
    }, cardRef);
    return () => ctx.revert();
  }, []);

  useLayoutEffect(() => {
    if (
      !cardRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const chips = cardRef.current.querySelectorAll("[data-alert-chip]");
    if (!chips.length) return;
    gsap.fromTo(
      chips,
      { autoAlpha: 0, y: 6, scale: 0.98 },
      {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 0.26,
        stagger: 0.045,
        ease: "power2.out",
        overwrite: "auto",
        clearProps: "all",
      },
    );
  }, [rulesSignature]);

  // Keep hover effects in GSAP instead of mixing CSS transform transitions
  // with image scaling. The artwork never scales outside its hero container.
  const animateHover = (hovered) => {
    const card = cardRef.current;
    if (!card || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;

    const highlight = card.querySelector("[data-card-highlight]");
    const ambientGlow = card.querySelector("[data-card-ambient-glow]");
    const lightSweep = card.querySelector("[data-card-light-sweep]");

    // Keep the card and artwork completely stationary. Only animate decorative
    // overlays and the card's paint properties to avoid transform/filter flashes.
    gsap.killTweensOf([card, highlight, ambientGlow, lightSweep].filter(Boolean));
    gsap.to(card, {
      borderColor: hovered ? "rgba(52, 211, 153, 0.72)" : "rgba(255, 255, 255, 0.09)",
      boxShadow: hovered
        ? "0 20px 48px rgba(0, 0, 0, 0.34), 0 0 0 1px rgba(52, 211, 153, 0.18), 0 0 30px rgba(16, 185, 129, 0.14), inset 0 1px 0 rgba(167, 243, 208, 0.10)"
        : "0 0 0 rgba(0, 0, 0, 0)",
      duration: hovered ? 0.34 : 0.38,
      ease: hovered ? "power3.out" : "power2.inOut",
      overwrite: "auto",
    });

    if (highlight) {
      gsap.to(highlight, {
        autoAlpha: hovered ? 1 : 0,
        duration: hovered ? 0.2 : 0.16,
        ease: "power1.out",
        overwrite: "auto",
      });
    }

    if (ambientGlow) {
      gsap.to(ambientGlow, {
        autoAlpha: hovered ? 1 : 0,
        duration: hovered ? 0.32 : 0.24,
        ease: "power2.out",
        overwrite: "auto",
      });
    }

    if (lightSweep) {
      if (hovered) {
        gsap.fromTo(
          lightSweep,
          { xPercent: -180, autoAlpha: 0 },
          {
            xPercent: 380,
            autoAlpha: 0.9,
            duration: 0.78,
            ease: "power2.inOut",
            overwrite: "auto",
            onComplete: () => gsap.set(lightSweep, { autoAlpha: 0 }),
          },
        );
      } else {
        gsap.to(lightSweep, {
          autoAlpha: 0,
          duration: 0.12,
          overwrite: "auto",
        });
      }
    }
  };

  const thresholdLabel = (rule) => {
    if (rule.type === "target_price")
      return `TARGET ${price(rule.targetPrice, rule.currency || "INR")}`;
    if (rule.type === "minimum_discount")
      return `${Number(rule.minimumDiscount)}%+ OFF`;
    if (rule.type === "first_listing") return "NEW LISTING";
    return "CUSTOM ALERT";
  };

  return (
    <article
      ref={cardRef}
      data-game-card
      onMouseEnter={() => animateHover(true)}
      onMouseLeave={() => animateHover(false)}
      onFocus={() => animateHover(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) animateHover(false);
      }}
      className="group relative overflow-hidden rounded-2xl border border-white/[0.09] bg-[#10131b]"
    >
      <div
        data-card-ambient-glow
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-30 rounded-2xl opacity-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(16, 185, 129, 0.16) 0%, rgba(16, 185, 129, 0.055) 34%, transparent 72%)",
        }}
      />
      <div
        data-card-light-sweep
        aria-hidden="true"
        className="pointer-events-none absolute -inset-y-8 left-0 z-40 w-[28%] opacity-0"
        style={{
          clipPath: "polygon(25% 0, 100% 0, 75% 100%, 0 100%)",
          background:
            "linear-gradient(90deg, transparent 0%, rgba(167, 243, 208, 0.015) 22%, rgba(167, 243, 208, 0.18) 50%, rgba(52, 211, 153, 0.045) 76%, transparent 100%)",
        }}
      />
      <div data-card-highlight className="pointer-events-none absolute inset-x-0 top-0 z-50 h-px bg-gradient-to-r from-transparent via-emerald-200 to-transparent opacity-0" />
      <div className="relative isolate h-44 overflow-hidden bg-[#090c12] sm:h-48">
        {game.coverImageUrl ? (
          <img
            src={game.coverImageUrl}
            alt={`${game.title} artwork`}
            loading="lazy"
            data-card-artwork
            className="absolute inset-0 z-0 h-full w-full object-cover object-center"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ) : null}
        <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-[#10131b] via-[#10131b]/25 to-black/5" />
        <div className="absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-3 p-4 sm:p-5">
          <div className="min-w-0">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300/90">
              GamePulse watchlist
            </p>
            <h3 className="max-w-2xl text-lg font-bold leading-tight text-white drop-shadow sm:text-xl">
              {game.title}
            </h3>
          </div>
          <span
            className={`mb-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] backdrop-blur-md ${isActive ? "border-emerald-300/25 bg-[#05251d]/85 text-emerald-200" : "border-white/15 bg-black/45 text-slate-300"}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-300" : "bg-slate-400"}`}
            />
            {formatAlertStatus(game.rules)}
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-sky-300/10 bg-sky-300/[0.05] px-2.5 py-1.5 text-xs font-medium text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
            Steam
          </span>
          <span className="text-xs text-slate-500">
            {activeRules.length} active{" "}
            {activeRules.length === 1 ? "alert" : "alerts"}
          </span>
          {game.steamPackageId ? (
            <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-300/80">
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-3.5 w-3.5"
                aria-hidden="true"
              >
                <path
                  d="m5 10 3.2 3.2L15 6.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="10" cy="10" r="8" />
              </svg>
              Edition verified
            </span>
          ) : (
            <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-200/80">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
              Verification needed
            </span>
          )}
        </div>

        <div className="mt-4 rounded-xl border border-white/[0.065] bg-black/10 p-3.5 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Edition tracked
            </p>
            <p className="text-[10px] text-slate-600">
              {game.rules.length} configured{" "}
              {game.rules.length === 1 ? "rule" : "rules"}
            </p>
          </div>
          <p className="text-sm font-semibold leading-5 text-slate-200">
            {game.edition}
          </p>
          <div className="mt-4 border-t border-white/[0.06] pt-3.5">
            <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Deal triggers
            </p>
            {activeRules.length ? (
              <div className="flex flex-wrap gap-2">
                {activeRules.map((rule) => (
                  <span
                    key={rule.id || rule.type}
                    data-alert-chip
                    className="inline-flex items-center gap-2 rounded-lg border border-emerald-300/15 bg-emerald-300/[0.055] px-3 py-2 text-[11px] font-bold tracking-[0.015em] text-emerald-100 sm:text-xs"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                    {thresholdLabel(rule)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs leading-5 text-slate-500">
                No active alerts. Edit alerts to set your deal triggers.
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-[58%] text-[11px] leading-4 text-slate-500">
            {game.steamPackageId
              ? "Watching this verified Steam edition"
              : "Price checks start after the Steam edition is verified"}
          </p>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(game)}
              className="rounded-lg border border-white/10 px-3.5 py-2.5 text-xs font-semibold text-slate-200 transition hover:border-emerald-400/35 hover:bg-emerald-400/[0.05] hover:text-emerald-200"
            >
              Edit alerts
            </button>
            <button
              type="button"
              disabled={removing}
              onClick={() => onRemove(game, cardRef.current)}
              className="rounded-lg border border-red-400/20 px-3.5 py-2.5 text-xs font-semibold text-red-300 transition hover:bg-red-400/[0.08] disabled:opacity-50"
            >
              {removing ? "Removing…" : "Remove"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function MyGames() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddGame, setShowAddGame] = useState(false);
  const [savingAddGame, setSavingAddGame] = useState(false);
  const [editingGame, setEditingGame] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [confirmGame, setConfirmGame] = useState(null);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const refreshInFlightRef = useRef(false);
  const headingRef = useRef(null);
  const gamesGridRef = useRef(null);
  const noticeRef = useRef(null);
  const actionErrorRef = useRef(null);
  const count = games.length;

  const dismissMessage = useCallback((kind) => {
    const node = kind === "error" ? actionErrorRef.current : noticeRef.current;
    const clear = () => (kind === "error" ? setActionError("") : setNotice(""));
    if (
      !node ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      clear();
      return;
    }
    gsap.to(node, {
      autoAlpha: 0,
      y: -6,
      height: 0,
      marginBottom: 0,
      paddingTop: 0,
      paddingBottom: 0,
      duration: 0.2,
      ease: "power1.in",
      onComplete: clear,
    });
  }, []);

  const refreshGames = useCallback(async () => {
    // Avoid overlapping reads when the refresh button is clicked repeatedly.
    if (refreshInFlightRef.current) return null;
    refreshInFlightRef.current = true;
    try {
      const freshGames = await getMyTrackedGames();
      setGames(freshGames);
      setError("");
      return freshGames;
    } finally {
      refreshInFlightRef.current = false;
    }
  }, []);

  const handleManualRefresh = useCallback(async () => {
    if (refreshInFlightRef.current) return;
    setRefreshing(true);
    setActionError("");
    setNotice("");
    try {
      await refreshGames();
      setNotice("Your watchlist is up to date.");
    } catch (refreshError) {
      setActionError(
        refreshError?.message ||
          "Couldn't refresh your games. Your current list has been kept.",
      );
    } finally {
      setRefreshing(false);
    }
  }, [refreshGames]);

  useEffect(() => {
    let active = true;
    getMyTrackedGames()
      .then((rows) => {
        if (active) setGames(rows);
      })
      .catch((loadError) => {
        if (active)
          setError(
            loadError?.message ||
              "We couldn't load your games. Please try again.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useLayoutEffect(() => {
    if (
      !headingRef.current ||
      loading ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return undefined;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        headingRef.current,
        { autoAlpha: 0, y: 8 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.35,
          ease: "power2.out",
          clearProps: "all",
        },
      );
    }, headingRef);
    return () => ctx.revert();
  }, [loading]);

  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const node = actionError
      ? actionErrorRef.current
      : notice
        ? noticeRef.current
        : null;
    if (!node) return;
    gsap.fromTo(
      node,
      { autoAlpha: 0, y: -8, height: 0 },
      {
        autoAlpha: 1,
        y: 0,
        height: "auto",
        duration: 0.3,
        ease: "power2.out",
        clearProps: "all",
      },
    );
  }, [notice, actionError]);

  async function handleRemove(game, element) {
    if (removingId) return;
    setRemovingId(game.id);
    setActionError("");
    setNotice("");
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    try {
      if (element && !reducedMotion) {
        await gsap.to(element, {
          autoAlpha: 0,
          height: 0,
          marginBottom: 0,
          paddingTop: 0,
          paddingBottom: 0,
          duration: 0.24,
          ease: "power1.in",
        });
      }
      await removeTrackedGame(game.id);
      setGames((current) => current.filter((item) => item.id !== game.id));
      setNotice(`${game.title} was removed from your collection.`);
      return true;
    } catch (removeError) {
      if (element) gsap.set(element, { clearProps: "all" });
      setActionError(
        removeError?.message ||
          "Unable to remove this game. Your collection has not been updated.",
      );
      return false;
    } finally {
      setRemovingId(null);
    }
  }

  async function handleSaved(message) {
    try {
      await refreshGames();
      setNotice(message);
      setActionError("");
    } catch (refreshError) {
      setActionError(
        refreshError?.message ||
          "Saved, but the list could not refresh. Reload the page to see the latest data.",
      );
    }
  }

  return (
    <div className="mx-auto max-w-[1500px] p-5 sm:p-8">
      <section
        ref={headingRef}
        className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-emerald-400">
            Your collection
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            My Games<span className="text-emerald-400">.</span>
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
            Your collection, editions, and deal conditions—all in one place.
          </p>
          {!loading && (
            <p className="mt-3 text-xs text-slate-500">
              <span className="font-semibold text-slate-300">{count}</span>{" "}
              {count === 1 ? "game" : "games"} in your collection
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={refreshing || loading}
            aria-label="Refresh My Games"
            title="Refresh My Games"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-[#10131b] text-slate-300 transition hover:border-emerald-400/30 hover:text-emerald-300 disabled:cursor-wait disabled:opacity-60"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`h-[18px] w-[18px] ${refreshing ? "animate-spin" : ""}`}
              aria-hidden="true"
            >
              <path d="M20 7v5h-5" />
              <path d="M4.8 9a7.5 7.5 0 0 1 12.6-3L20 8M4 17v-5h5" />
              <path d="M19.2 15a7.5 7.5 0 0 1-12.6 3L4 16" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => {
              setActionError("");
              setShowAddGame(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-[#07110d] transition hover:bg-emerald-300"
          >
            <span aria-hidden="true">+</span>Add Game
          </button>
        </div>
      </section>

      {actionError && (
        <div
          ref={actionErrorRef}
          role="alert"
          className="mb-4 flex items-start gap-3 rounded-xl border border-red-400/20 bg-red-400/[0.05] px-4 py-3 text-sm text-red-200"
        >
          <span aria-hidden="true">!</span>
          <p>{actionError}</p>
          <button
            type="button"
            onClick={() => dismissMessage("error")}
            className="ml-auto text-red-200/70 transition-colors hover:text-red-100"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}
      {notice && (
        <div
          ref={noticeRef}
          role="status"
          className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.05] px-4 py-3 text-sm text-emerald-200"
        >
          <span aria-hidden="true">✓</span>
          <p>{notice}</p>
          <button
            type="button"
            onClick={() => dismissMessage("notice")}
            className="ml-auto text-emerald-200/70 transition-colors hover:text-emerald-100"
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
      )}

      {loading ? (
        <div
          className="grid gap-4 xl:grid-cols-2"
          aria-label="Loading your collection"
          role="status"
          aria-live="polite"
        >
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="gp-shimmer-card overflow-hidden rounded-2xl border border-white/[0.08] bg-[#10131b]"
            >
              {/* Match the live card's artwork / title hero */}
              <div className="relative h-44 overflow-hidden bg-[#090c12] sm:h-48">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.035] via-white/[0.015] to-emerald-300/[0.025]" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 sm:p-5">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 h-2.5 w-32 rounded bg-emerald-300/10" />
                    <div className="h-5 w-4/5 max-w-sm rounded-md bg-white/[0.09]" />
                    <div className="mt-2 h-5 w-2/5 max-w-xs rounded-md bg-white/[0.055]" />
                  </div>
                  <div className="mb-1 h-6 w-16 shrink-0 rounded-full border border-emerald-300/10 bg-emerald-300/[0.06]" />
                </div>
              </div>

              {/* Match metadata row and verification label */}
              <div className="p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="h-7 w-16 rounded-md bg-sky-300/[0.07]" />
                  <div className="h-3 w-20 rounded bg-white/[0.05]" />
                  <div className="ml-auto h-3 w-24 rounded bg-emerald-300/[0.06]" />
                </div>

                {/* Match edition and deal-trigger panel */}
                <div className="mt-4 rounded-xl border border-white/[0.065] bg-black/10 p-3.5 sm:p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="h-2.5 w-24 rounded bg-white/[0.055]" />
                    <div className="h-2.5 w-20 rounded bg-white/[0.035]" />
                  </div>
                  <div className="h-4 w-3/5 rounded bg-white/[0.075]" />
                  <div className="mt-4 border-t border-white/[0.06] pt-3.5">
                    <div className="mb-2.5 h-2.5 w-20 rounded bg-white/[0.05]" />
                    <div className="flex flex-wrap gap-2">
                      <div className="h-8 w-28 rounded-lg border border-emerald-300/10 bg-emerald-300/[0.045]" />
                      <div className="h-8 w-24 rounded-lg border border-emerald-300/10 bg-emerald-300/[0.045]" />
                    </div>
                  </div>
                </div>

                {/* Match the footer description and card actions */}
                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="h-3 w-2/5 rounded bg-white/[0.04]" />
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-24 rounded-lg bg-white/[0.045]" />
                    <div className="h-9 w-16 rounded-lg bg-white/[0.035]" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-400/20 bg-[#10131b] p-6"
        >
          <p className="text-sm text-red-300">{error}</p>
          <button
            type="button"
            onClick={async () => {
              setLoading(true);
              setError("");
              try {
                await refreshGames();
              } catch (e) {
                setError(e.message || "Unable to load games.");
              } finally {
                setLoading(false);
              }
            }}
            className="mt-4 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold hover:border-emerald-400/30"
          >
            Try again
          </button>
        </div>
      ) : games.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#10131b] px-6 py-14 text-center sm:py-20">
          <div className="pointer-events-none absolute left-1/2 top-0 h-48 w-72 -translate-x-1/2 rounded-full bg-emerald-400/[0.07] blur-3xl" />
          <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.07] text-2xl text-emerald-300">
            ⌁
          </div>
          <h3 className="relative text-lg font-semibold text-slate-100">
            Your collection starts here.
          </h3>
          <p className="relative mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
            Add a Steam edition, set your price or discount conditions, and keep
            your watchlist organized.
          </p>
          <button
            type="button"
            onClick={() => setShowAddGame(true)}
            className="relative mt-6 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-[#07110d] transition hover:bg-emerald-300"
          >
            + Add your first game
          </button>
        </div>
      ) : (
        <section aria-label="Tracked games" className="space-y-4">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Your watchlist
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Manage each game's alert conditions independently.
              </p>
            </div>
            <span className="rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-xs text-slate-400">
              {games.reduce(
                (sum, game) =>
                  sum + game.rules.filter((rule) => rule.enabled).length,
                0,
              )}{" "}
              active alerts
            </span>
          </div>
          {savingAddGame && (
            <div
              role="status"
              className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.045] px-4 py-3 text-sm text-emerald-100"
            >
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
              <span>Saving your game and alert settings…</span>
              <span className="ml-auto text-xs text-emerald-200/60">
                You can keep browsing
              </span>
            </div>
          )}
          {refreshing && (
            <p
              role="status"
              className="flex items-center gap-2 text-xs text-slate-500"
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Syncing your latest watchlist…
            </p>
          )}
          <div ref={gamesGridRef} className="grid gap-4 xl:grid-cols-2">
            {games.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                onEdit={(selected) => {
                  setActionError("");
                  setEditingGame(selected);
                }}
                onRemove={(selected, element) =>
                  setConfirmGame({ game: selected, element })
                }
                removing={removingId === game.id}
              />
            ))}
          </div>
          <p className="px-1 pt-2 text-xs leading-5 text-slate-600">
            Steam price checks require a verified purchase package. Removing a
            tracked entry removes its alert rules; shared catalog and price
            records may remain.
          </p>
        </section>
      )}

      {confirmGame && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !removingId)
              setConfirmGame(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-game-title"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#11151e] shadow-2xl shadow-black/50"
          >
            <div className="h-1 bg-gradient-to-r from-emerald-400 via-slate-600 to-red-400" />
            <div className="p-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-red-400/20 bg-red-400/[0.08] text-red-300">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path
                    d="M3 6h18M8 6V4h8v2m-11 0 1 14h12l1-14M10 10v6m4-6v6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3
                id="remove-game-title"
                className="text-lg font-semibold text-slate-100"
              >
                Remove this game?
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Remove{" "}
                <span className="font-semibold text-slate-200">
                  {confirmGame.game.title}
                </span>{" "}
                — {confirmGame.game.edition} from My Games? Its alert rules and
                tracked-entry alert events will be removed. Shared catalog and
                price history may remain.
              </p>
              {actionError && (
                <p role="alert" className="mt-3 text-xs text-red-300">
                  {actionError}
                </p>
              )}
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={Boolean(removingId)}
                  onClick={() => setConfirmGame(null)}
                  className="rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.04] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={Boolean(removingId)}
                  onClick={async () => {
                    const pending = confirmGame;
                    const removed = await handleRemove(
                      pending.game,
                      pending.element,
                    );
                    if (removed) setConfirmGame(null);
                  }}
                  className="rounded-lg bg-red-400 px-4 py-2.5 text-sm font-semibold text-[#1a0808] transition hover:bg-red-300 disabled:opacity-50"
                >
                  {removingId ? "Removing…" : "Remove game"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
      {editingGame && (
        <EditGameAlertsModal
          game={editingGame}
          onClose={() => setEditingGame(null)}
          onSaved={() => handleSaved("Alert settings updated.")}
        />
      )}
      {showAddGame && (
        <AddGameModal
          onClose={() => setShowAddGame(false)}
          onSavingChange={setSavingAddGame}
          onSaved={() => handleSaved("Game added to your collection.")}
        />
      )}
    </div>
  );
}
