import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function AuthScreen() {
  const [mode, setMode] = useState("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#090b10] px-5 py-12 text-slate-100">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/[0.06] blur-[120px]" />

      <section className="relative w-full max-w-md rounded-3xl border border-white/[0.09] bg-[#10131b] p-7 shadow-2xl shadow-black/30 sm:p-9">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-400 text-xl font-black text-slate-950">
            G
          </div>
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
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setMessage("");
                setError("");
              }}
              className="font-semibold text-emerald-300 transition hover:text-emerald-200"
            >
              {mode === "login" ? "Create account" : "Sign in"}
            </button>
          </p>
        </div>
        <p className="mt-6 text-center text-xs text-slate-600">
          GamePulse · Built for smarter game deals
        </p>
      </section>
    </main>
  );
}
