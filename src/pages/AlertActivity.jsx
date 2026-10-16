import { useEffect, useState } from "react";
import { describeAlertType, getMyAlertEvents } from "../services/alerts";
import { formatMoney, formatStoreName } from "../services/stores";

export default function AlertActivity() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getMyAlertEvents()
      .then((rows) => { if (active) setEvents(rows); })
      .catch((loadError) => { if (active) setError(loadError?.message || "Unable to load alert activity."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <div className="mx-auto max-w-[1500px] p-5 sm:p-8">
      <section className="mb-8">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-emerald-400">Notifications</p>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Alert Activity<span className="text-emerald-400">.</span></h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">A record of price rules and verified listing conditions that have been met.</p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#10131b]">
        <div className="border-b border-white/[0.07] p-5 sm:p-6"><h3 className="text-lg font-semibold">Triggered alerts</h3><p className="mt-1 text-sm text-slate-500">Each threshold crossing is recorded once until its condition clears and triggers again.</p></div>
        {loading ? <div className="p-8 text-sm text-slate-400" role="status">Loading alert activity…</div>
          : error ? <div className="p-6 text-sm text-red-300" role="alert">{error}</div>
          : events.length === 0 ? <div className="p-8"><p className="font-semibold text-slate-200">No triggered alerts yet</p><p className="mt-2 text-sm leading-6 text-slate-500">When a monitored Steam price reaches one of your configured conditions, the event will appear here. Email delivery is a separate integration step.</p></div>
          : <div className="divide-y divide-white/[0.05]">{events.map((event) => { const game = event.tracked_game?.game?.title || event.store_product?.product_title || "Tracked game"; const edition = event.tracked_game?.edition || event.store_product?.edition; return <article key={event.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6"><div className="flex gap-3"><span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">↗</span><div><p className="font-semibold text-slate-100">{game}</p><p className="mt-1 text-xs text-slate-500">{edition} · {formatStoreName(event.store_product?.store)}</p><p className="mt-3 text-sm leading-6 text-slate-300">{event.message}</p><p className="mt-2 text-xs text-slate-500">{describeAlertType(event.event_type)} · {new Date(event.created_at).toLocaleString()}</p></div></div><div className="sm:text-right"><p className="text-lg font-bold text-slate-100">{formatMoney(event.price, event.currency)}</p>{Number(event.discount_percent) > 0 && <p className="mt-1 text-xs font-semibold text-emerald-300">-{event.discount_percent}% off</p>}</div></article>; })}</div>}
      </section>
    </div>
  );
}
