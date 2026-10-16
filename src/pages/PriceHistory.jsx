import { useEffect, useState } from "react";
import { formatMoney, formatStoreName, getMyPriceHistory } from "../services/stores";

export default function PriceHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getMyPriceHistory()
      .then((rows) => { if (active) setHistory(rows); })
      .catch((loadError) => { if (active) setError(loadError?.message || "Unable to load price history."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <div className="mx-auto max-w-[1500px] p-5 sm:p-8">
      <section className="mb-8">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-emerald-400">Market timeline</p>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Price History<span className="text-emerald-400">.</span></h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">Verified Steam price snapshots for the editions in your collection.</p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#10131b]">
        <div className="border-b border-white/[0.07] p-5 sm:p-6">
          <h3 className="text-lg font-semibold">Recent price checks</h3>
          <p className="mt-1 text-sm text-slate-500">Newest snapshots first. Monitoring runs every six hours once scheduled.</p>
        </div>
        {loading ? <div className="p-8 text-sm text-slate-400" role="status">Loading price history…</div>
          : error ? <div className="p-6 text-sm text-red-300" role="alert">{error}</div>
          : history.length === 0 ? <div className="p-8"><p className="font-semibold text-slate-200">No price snapshots yet</p><p className="mt-2 text-sm leading-6 text-slate-500">Once the database migration is applied and the Steam monitor runs, verified prices will appear here.</p></div>
          : <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-white/[0.02] text-xs text-slate-500"><tr><th className="px-6 py-4 font-medium">Game / edition</th><th className="px-6 py-4 font-medium">Store</th><th className="px-6 py-4 font-medium">Current price</th><th className="px-6 py-4 font-medium">Discount</th><th className="px-6 py-4 font-medium">Checked</th></tr></thead><tbody className="divide-y divide-white/[0.05]">{history.map((row) => <tr key={row.id} className="hover:bg-white/[0.025]"><td className="px-6 py-4"><p className="font-medium text-slate-200">{row.store_product?.game?.title || row.store_product?.product_title || "Unknown game"}</p><p className="mt-1 text-xs text-slate-500">{row.store_product?.edition || "Purchase option"}</p></td><td className="px-6 py-4 text-slate-400">{formatStoreName(row.store_product?.store)}</td><td className="px-6 py-4 font-semibold text-slate-100">{formatMoney(row.price, row.currency)}</td><td className="px-6 py-4">{Number(row.discount_percent) > 0 ? <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">-{row.discount_percent}%</span> : <span className="text-slate-500">—</span>}</td><td className="px-6 py-4 text-slate-400">{new Date(row.recorded_at).toLocaleString()}</td></tr>)}</tbody></table></div>}
      </section>
    </div>
  );
}
