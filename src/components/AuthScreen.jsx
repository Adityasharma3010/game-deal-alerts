import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { supabase } from "../lib/supabase";
import GamePulseLogo from "./GamePulseLogo";

export default function AuthScreen() {
  const [mode, setMode] = useState(() =>
    window.location.pathname === "/signup" ? "signup" : "login",
  );
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const screenRef = useRef(null);
  const cardRef = useRef(null);
  const contentRef = useRef(null);

  // Entrance animation for the authentication screen.
  useLayoutEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // The card starts hidden in the markup, so it cannot flash before GSAP runs.
    // If motion is reduced, reveal it immediately without animating.
    if (prefersReducedMotion) {
      if (cardRef.current) cardRef.current.style.visibility = "visible";
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        cardRef.current,
        {
          autoAlpha: 0,
          y: 12,
        },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.7,
          ease: "power2.out",
          force3D: true,
        },
      );

      gsap.fromTo(
        ".auth-orb",
        {
          autoAlpha: 0,
        },
        {
          autoAlpha: 1,
          duration: 0.8,
          ease: "power1.out",
        },
      );
    }, screenRef);
    return () => ctx.revert();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      if (mode === "signup") {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { display_name: displayName.trim() },
            emailRedirectTo: window.location.origin,
          },
        });

        if (authError) throw authError;
        if (!data.session) {
          setMessage(
            "Account created. Check your email for the verification link before signing in.",
          );
        } else {
          setMessage("Account created successfully.");
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (authError) throw authError;
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function changeMode() {
    if (loading) return;
    const nextMode = mode === "login" ? "signup" : "login";
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    setMessage("");
    setError("");

    if (reducedMotion || !contentRef.current) {
      setMode(nextMode);
      return;
    }

    gsap.to(contentRef.current, {
      autoAlpha: 0,
      y: 6,
      duration: 0.16,
      ease: "power1.in",
      onComplete: () => {
        setMode(nextMode);
        requestAnimationFrame(() => {
          if (!contentRef.current) return;
          gsap.fromTo(
            contentRef.current,
            { autoAlpha: 0, y: -6 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.25,
              ease: "power2.out",
              clearProps: "transform",
            },
          );
        });
      },
    });
  }

  return (
    <main
      ref={screenRef}
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#090b10] px-5 py-12 text-slate-100"
    >
      <div className="auth-orb pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/[0.06] blur-[120px]" />

      <section
        ref={cardRef}
        style={{ visibility: "hidden" }}
        className="relative w-full max-w-md rounded-3xl border border-white/[0.09] bg-[#10131b] p-7 shadow-2xl shadow-black/30 sm:p-9"
      >
        <div ref={contentRef}>
          <div className="mb-8 flex items-center gap-3">
            <GamePulseLogo size={44} />
            <div>
              <h1 className="text-xl font-bold tracking-tight">GamePulse</h1>
              <p className="text-xs text-slate-500">Deal monitoring</p>
            </div>
          </div>

          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">
            Your gaming radar
          </p>
          <h2 className="text-3xl font-bold tracking-tight">
            {mode === "login" ? "Welcome back." : "Create your account."}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            {mode === "login"
              ? "Sign in to manage your tracked games and price alerts."
              : "Build your personal watchlist and never miss a deal."}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {mode === "signup" && (
              <div>
                <label
                  htmlFor="displayName"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Display name
                </label>
                <input
                  id="displayName"
                  type="text"
                  autoComplete="name"
                  required
                  maxLength={80}
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-xl border border-white/10 bg-[#090b10] px-4 py-3 text-sm outline-none transition placeholder:text-slate-600 focus:border-emerald-400/60"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-white/10 bg-[#090b10] px-4 py-3 text-sm outline-none transition placeholder:text-slate-600 focus:border-emerald-400/60"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 6 characters"
                className="w-full rounded-xl border border-white/10 bg-[#090b10] px-4 py-3 text-sm outline-none transition placeholder:text-slate-600 focus:border-emerald-400/60"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-red-400/20 bg-red-400/[0.07] p-3 text-sm leading-5 text-red-300"
              >
                {error}
              </p>
            )}
            {message && (
              <p
                role="status"
                className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07] p-3 text-sm leading-5 text-emerald-300"
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-xl bg-emerald-400 px-4 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>

          <div className="mt-7 border-t border-white/[0.07] pt-6 text-center">
            <p className="text-sm text-slate-400">
              {mode === "login"
                ? "New to GamePulse?"
                : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={changeMode}
                disabled={loading}
                className="font-semibold text-emerald-300 transition hover:text-emerald-200 disabled:opacity-50"
              >
                {mode === "login" ? "Create account" : "Sign in"}
              </button>
            </p>
          </div>
          <p className="mt-6 text-center text-xs text-slate-600">
            GamePulse · Built for smarter game deals
          </p>
        </div>
      </section>
    </main>
  );
}
