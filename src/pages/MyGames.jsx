import { useEffect, useState } from "react";
import {
  formatAlertStatus,
  formatAlertThreshold,
  formatStores,
  getMyTrackedGames,
} from "../services/games";
import AddGameModal from "../components/AddGameModal";

export default function MyGames() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddGame, setShowAddGame] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadGames() {
      setLoading(true);
      setError("");

      try {
        const trackedGames = await getMyTrackedGames();
        if (active) setGames(trackedGames);
      } catch (loadError) {
        if (active) {
          setError(
            loadError?.message ||
              "We couldn't load your games. Please try again.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadGames();

    return () => {
      active = false;
    };
  }, [reloadToken]);

  return (
    <div className="mx-auto max-w-[1500px] p-5 sm:p-8">
      <section className="mb-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-emerald-400">
              Your collection
            </p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              My Games<span className="text-emerald-400">.</span>
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
              Your configured games and alert thresholds.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddGame(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-[#07110d] transition hover:bg-emerald-300"
          >
            <span aria-hidden="true">+</span>
            Add Game
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#10131b]">
        <div className="border-b border-white/[0.07] p-5 sm:p-6">
          <h3 className="text-lg font-semibold">Tracked games</h3>
          <p className="mt-1 text-sm text-slate-500">
            Games and alerts saved to your account.
          </p>
        </div>

        {loading ? (
          <div
            className="flex items-center gap-3 p-8 text-sm text-slate-400"
            role="status"
          >
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/10 border-t-emerald-400" />
            Loading your games...
          </div>
        ) : error ? (
          <div className="p-6" role="alert">
            <p className="text-sm text-red-300">{error}</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              If this mentions permissions or a missing relationship, check the
              Supabase Data API grants and table relationships. Keep RLS
              enabled.
            </p>
          </div>
        ) : games.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/10 text-2xl text-emerald-300">
              ▦
            </div>
            <h4 className="font-semibold text-slate-200">
              Your collection is empty
            </h4>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Games you choose to track will appear here, along with their
              editions and alert thresholds.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-white/[0.02] text-xs text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-medium">Game / edition</th>
                    <th className="px-6 py-4 font-medium">Stores</th>
                    <th className="px-6 py-4 font-medium">Alert threshold</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {games.map((game) => (
                    <tr
                      key={game.id}
                      className="transition hover:bg-white/[0.025]"
                    >
                      <td className="px-6 py-5">
                        <div>
                          <p className="font-medium text-slate-200">
                            {game.title}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {game.edition}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-slate-400">
                        {formatStores(game.rules)}
                      </td>
                      <td className="px-6 py-5 font-medium text-slate-200">
                        {formatAlertThreshold(game.rules)}
                      </td>
                      <td className="px-6 py-5">
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-slate-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                          {formatAlertStatus(game.rules)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-white/[0.07] px-6 py-4">
              <p className="text-xs leading-5 text-slate-500">
                Prices and live deal statuses will appear after store
                integrations are implemented and verified.
              </p>
            </div>
          </>
        )}
      </section>

      {showAddGame && (
        <AddGameModal
          onClose={() => setShowAddGame(false)}
          onSaved={() => setReloadToken((value) => value + 1)}
        />
      )}
    </div>
  );
}
