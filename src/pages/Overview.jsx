import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { games } from "./gamesData";

export default function Overview() {
  const pageRef = useRef(null);

  useLayoutEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) {
      if (pageRef.current)
        gsap.set(
          pageRef.current.querySelectorAll(
            ".page-heading, .summary-card, .animate-in",
          ),
          { autoAlpha: 1, clearProps: "transform" },
        );
      return;
    }

    const ctx = gsap.context(() => {
      const heading = gsap.utils.toArray(".page-heading");
      const cards = gsap.utils.toArray(".summary-card");
      const sections = gsap.utils
        .toArray(".animate-in")
        .filter(
          (element) =>
            !element.classList.contains("page-heading") &&
            !element.classList.contains("summary-card"),
        );
      gsap.set(cards, { transition: "none", y: 18, autoAlpha: 0 });
      gsap.set([...heading, ...sections], { y: 18, autoAlpha: 0 });
      const timeline = gsap.timeline();
      timeline.to(heading, {
        y: 0,
        autoAlpha: 1,
        duration: 0.45,
        ease: "power3.out",
      });
      timeline.to(
        cards,
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.45,
          stagger: 0.08,
          ease: "power3.out",
          onComplete: () => gsap.set(cards, { clearProps: "transition" }),
        },
        "+=0.05",
      );
      timeline.to(
        sections,
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.45,
          stagger: 0.05,
          ease: "power3.out",
        },
        "+=0.05",
      );
    }, pageRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={pageRef} className="mx-auto max-w-[1500px] p-5 sm:p-8">
      <section className="animate-in page-heading mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-emerald-400">
            Your gaming radar
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Overview<span className="text-emerald-400">.</span>
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
            Track your favorite games, watch prices fall, and catch the deals
            that matter.
          </p>
        </div>
        <a
          href="#tracked-games"
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-300"
        >
          <span className="text-lg">+</span>View tracked games
        </a>
      </section>

      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Tracked games",
            value: "04",
            detail: "Configured to monitor",
            icon: "▦",
          },
          {
            label: "Live deals",
            value: "—",
            detail: "Awaiting price integration",
            icon: "↘",
          },
          {
            label: "Price alerts",
            value: "02",
            detail: "Main + deal alert categories",
            icon: "◎",
          },
          {
            label: "Last price check",
            value: "—",
            detail: "Not connected yet",
            icon: "◷",
          },
        ].map((stat) => (
          <article
            key={stat.label}
            className="animate-in summary-card rounded-2xl border border-white/[0.08] bg-[#10131b] p-5 transition duration-300 hover:-translate-y-1 hover:border-emerald-400/20"
          >
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm text-slate-400">{stat.label}</p>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05] text-lg text-emerald-300">
                {stat.icon}
              </span>
            </div>
            <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
            <p className="mt-2 text-xs text-slate-500">{stat.detail}</p>
          </article>
        ))}
      </section>

      <section className="animate-in mb-8 overflow-hidden rounded-2xl border border-emerald-400/15 bg-gradient-to-r from-emerald-400/[0.07] to-transparent">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-xl text-emerald-300">
              ◷
            </div>
            <div>
              <h3 className="font-semibold">Automated monitoring</h3>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                The planned schedule is every 6 hours. Automated checks are not
                active yet.
              </p>
            </div>
          </div>
          <span className="w-fit rounded-lg border border-amber-400/20 bg-amber-400/[0.07] px-3 py-2 text-xs font-semibold text-amber-300">
            Not configured
          </span>
        </div>
      </section>

      <section
        id="tracked-games"
        className="animate-in overflow-hidden rounded-2xl border border-white/[0.08] bg-[#10131b]"
      >
        <div className="flex flex-col gap-3 border-b border-white/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h3 className="text-lg font-semibold">Your tracked games</h3>
            <p className="mt-1 text-sm text-slate-500">
              Your configured editions and alert thresholds
            </p>
          </div>
          <span className="w-fit rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400">
            4 games configured
          </span>
        </div>
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
                  key={game.name}
                  className="transition hover:bg-white/[0.025]"
                >
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-xl ${game.color}`}
                      >
                        {game.icon}
                      </div>
                      <div>
                        <p className="font-medium text-slate-200">
                          {game.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {game.edition}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-slate-400">{game.store}</td>
                  <td className="px-6 py-5 font-medium text-slate-200">
                    {game.target}
                  </td>
                  <td className="px-6 py-5">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-slate-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                      {game.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-white/[0.07] px-6 py-4">
          <p className="text-xs leading-5 text-slate-500">
            Prices and live deal statuses will appear after store integrations
            are implemented and verified. The thresholds above are configuration
            targets, not current offers.
          </p>
        </div>
      </section>
    </div>
  );
}
