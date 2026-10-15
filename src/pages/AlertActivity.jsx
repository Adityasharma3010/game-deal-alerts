export default function AlertActivity() {
  return (
    <div className="mx-auto max-w-[1500px] p-5 sm:p-8">
      <section className="mb-8">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-emerald-400">
          Notifications
        </p>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Alert Activity<span className="text-emerald-400">.</span>
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
          Triggered price and listing alerts will appear here once monitoring is
          connected.
        </p>
      </section>
      <div className="rounded-2xl border border-white/[0.08] bg-[#10131b] p-6">
        <p className="text-sm text-slate-400">
          This page is a placeholder for the next implementation stage.
        </p>
      </div>
    </div>
  );
}
