import { useLayoutEffect, useRef, useState } from "react";
import { Outlet, useLocation, useOutletContext } from "react-router-dom";
import gsap from "gsap";
import { supabase } from "../lib/supabase";
import Sidebar from "../components/Sidebar";
import GamePulseLogo from "../components/GamePulseLogo";

export default function DashboardLayout() {
  const { session } = useOutletContext();
  const location = useLocation();
  const routeContentRef = useRef(null);
  const dashboardRef = useRef(null);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  useLayoutEffect(() => {
    const content = routeContentRef.current;
    if (!content) return undefined;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      gsap.set(content, { clearProps: "opacity,transform,visibility" });
      return undefined;
    }

    const context = gsap.context(() => {
      gsap.fromTo(
        content,
        { autoAlpha: 0, y: 10 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.32,
          ease: "power2.out",
          clearProps: "opacity,transform,visibility",
        },
      );
    }, content);

    return () => context.revert();
  }, [location.pathname]);

  const pageNames = {
    "/": "Overview",
    "/my-games": "My Games",
    "/price-history": "Price History",
    "/alert-activity": "Alert Activity",
  };
  const currentPage = pageNames[location.pathname] || "Overview";

  async function handleSignOut() {
    if (signingOut) return;
    setSignOutError("");
    setSigningOut(true);
    if (
      dashboardRef.current &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      await gsap.to(dashboardRef.current, {
        autoAlpha: 0,
        y: 10,
        duration: 0.28,
        ease: "power2.in",
      });
    }
    const { error } = await supabase.auth.signOut();
    if (error) {
      setSignOutError(error.message);
      setSigningOut(false);
      if (dashboardRef.current)
        gsap.set(dashboardRef.current, {
          clearProps: "opacity,visibility,transform",
        });
    }
  }

  return (
    <div
      ref={dashboardRef}
      className="min-h-screen bg-[#090b10] text-slate-100"
    >
      <div className="flex min-h-screen">
        <Sidebar />
        <main id="overview" className="min-w-0 flex-1">
          {signOutError && (
            <p
              role="alert"
              className="border-b border-red-400/20 bg-red-400/[0.07] px-5 py-3 text-sm text-red-300 sm:px-8"
            >
              {signOutError}
            </p>
          )}
          <header className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4 sm:px-8">
            <div className="flex items-center gap-3 lg:hidden">
              <GamePulseLogo size={36} showWordmark={false} />
              <span className="font-bold">GamePulse</span>
            </div>
            <div className="hidden sm:block">
              <p className="text-xs text-slate-500">
                Workspace / {currentPage}
              </p>
              <p className="mt-1 text-sm font-semibold">Deal dashboard</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden max-w-48 truncate text-xs text-slate-400 sm:block">
                {session.user.email}
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-emerald-400/30 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {signingOut ? "Signing out..." : "Sign out"}
              </button>
            </div>
          </header>
          <div ref={routeContentRef} className="route-content">
            <Outlet />
          </div>
          <footer className="py-8 text-center text-xs text-slate-600">
            GamePulse · Built for smarter game deals
          </footer>
        </main>
      </div>
    </div>
  );
}
