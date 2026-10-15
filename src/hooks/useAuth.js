import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function useAuth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (!mounted) return;

        if (sessionError) {
          setError(sessionError.message);
        } else {
          setSession(data.session);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || "Unable to load your session.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;

      setSession(nextSession);
      setError("");
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    loading,
    error,
    isAuthenticated: Boolean(session),
  };
}

export default useAuth;
