import { useState } from "react";
import { updateTrackedGameRules } from "../services/games";

export default function EditGameAlertsModal({ game, onClose, onSaved }) {
  const current = (type) => game.rules.find((rule) => rule.type === type);
  const [targetEnabled, setTargetEnabled] = useState(Boolean(current("target_price")));
  const [targetPrice, setTargetPrice] = useState(String(current("target_price")?.targetPrice ?? "1599.60"));
  const [discountEnabled, setDiscountEnabled] = useState(Boolean(current("minimum_discount")));
  const [discount, setDiscount] = useState(String(current("minimum_discount")?.minimumDiscount ?? "10"));
  const [firstEnabled, setFirstEnabled] = useState(Boolean(current("first_listing")));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(event) {
    event.preventDefault();
    const rules = [
      ...(targetEnabled ? [{ type: "target_price", targetPrice, enabled: true }] : []),
      ...(discountEnabled ? [{ type: "minimum_discount", minimumDiscount: discount, enabled: true }] : []),
      ...(firstEnabled ? [{ type: "first_listing", enabled: true }] : []),
    ];
    if (!rules.length) { setError("Keep at least one alert condition enabled."); return; }
    if (targetEnabled && !(Number(targetPrice) > 0)) { setError("Enter a target price greater than zero."); return; }
    if (discountEnabled && !(Number(discount) >= 1 && Number(discount) <= 100)) { setError("Discount must be between 1 and 100."); return; }
    setBusy(true); setError("");
    try { await updateTrackedGameRules(game.id, rules); await onSaved(); onClose(); }
    catch (e) { setError(e.message || "Unable to update alert rules."); }
    finally { setBusy(false); }
  }
  const field = "gp-input";
  const label = "flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.08] p-4";
  return <div className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="edit-alerts-title" className="my-auto w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-[#10131b] shadow-2xl">
      <header className="border-b border-white/[0.07] p-5"><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">Alert settings</p><h2 id="edit-alerts-title" className="mt-1 text-xl font-bold text-white">Edit alerts</h2><p className="mt-2 text-sm text-slate-400">{game.title} · {game.edition}</p></header>
      <form onSubmit={save} className="max-h-[65dvh] space-y-3 overflow-y-auto p-5">
        <label className={label}><input type="checkbox" className="mt-1 accent-emerald-400" checked={targetEnabled} onChange={(e) => setTargetEnabled(e.target.checked)} /><span className="flex-1"><span className="block text-sm font-semibold text-slate-100">Target price</span>{targetEnabled && <input aria-label="Target price in rupees" className={`${field} mt-3`} type="number" min="0.01" step="0.01" value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} />}</span></label>
        <label className={label}><input type="checkbox" className="mt-1 accent-emerald-400" checked={discountEnabled} onChange={(e) => setDiscountEnabled(e.target.checked)} /><span className="flex-1"><span className="block text-sm font-semibold text-slate-100">Minimum discount</span>{discountEnabled && <input aria-label="Minimum discount percentage" className={`${field} mt-3`} type="number" min="1" max="100" step="1" value={discount} onChange={(e) => setDiscount(e.target.value)} />}</span></label>
        <label className={label}><input type="checkbox" className="mt-1 accent-emerald-400" checked={firstEnabled} onChange={(e) => setFirstEnabled(e.target.checked)} /><span><span className="block text-sm font-semibold text-slate-100">First verified listing</span><span className="mt-1 block text-xs text-slate-400">Alert when the monitor first verifies a listing.</span></span></label>
        {error && <p role="alert" className="rounded-lg border border-red-400/20 bg-red-400/[0.06] p-3 text-sm text-red-300">{error}</p>}
        <footer className="flex justify-end gap-2 pt-2"><button type="button" disabled={busy} onClick={onClose} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-200">Cancel</button><button disabled={busy} className="rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-[#07110d] disabled:opacity-50">{busy ? "Saving..." : "Save alerts"}</button></footer>
      </form>
    </section>
  </div>;
}
