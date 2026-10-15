export default function PriceHistory() {
  return (
    <PagePlaceholder
      eyebrow="Market timeline"
      title="Price History"
      description="Historical prices will appear here after verified store price collection is implemented."
    />
  );
}
function PagePlaceholder({ eyebrow, title, description }) {
  return (
    <div className="mx-auto max-w-[1500px] p-5 sm:p-8">
      <section className="mb-8">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-emerald-400">
          {eyebrow}
        </p>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {title}
          <span className="text-emerald-400">.</span>
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
          {description}
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
