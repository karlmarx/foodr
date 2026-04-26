"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ChainStats,
  PowChallenge,
  SessionInfo,
  fetchAllStats,
  fetchSession,
  submitRating,
} from "./api";
import { solvePow } from "./pow";

interface SubmitOptions {
  chainId: string;
  rating: number;
}

interface FoodrContextValue {
  ready: boolean;
  error: string | null;
  session: SessionInfo | null;
  stats: Record<string, ChainStats>;
  yourRatings: Record<string, number>;
  pageLoadTime: number;
  submit: (opts: SubmitOptions) => Promise<ChainStats>;
  refresh: () => Promise<void>;
}

const FoodrContext = createContext<FoodrContextValue | null>(null);

function statsToMap(arr: ChainStats[]): Record<string, ChainStats> {
  const m: Record<string, ChainStats> = {};
  for (const s of arr) m[s.chain_id] = s;
  return m;
}

export function FoodrProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [stats, setStats] = useState<Record<string, ChainStats>>({});
  const [yourRatings, setYourRatings] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const challengeRef = useRef<PowChallenge | null>(null);
  const csrfRef = useRef<string>("");
  const pageLoadTime = useRef<number>(
    typeof performance !== "undefined" ? performance.now() : 0,
  );

  const refresh = useCallback(async () => {
    try {
      const fresh = await fetchAllStats();
      setStats(statsToMap(fresh));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, all] = await Promise.all([fetchSession(), fetchAllStats()]);
        if (cancelled) return;
        setSession(s);
        challengeRef.current = s.pow;
        csrfRef.current = s.csrf_token;
        setStats(statsToMap(all));
        const yr: Record<string, number> = {};
        for (const r of s.your_ratings) yr[r.chain_id] = r.rating;
        setYourRatings(yr);
        setReady(true);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Refresh stats every 20s for a live feel.
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => {
      void refresh();
    }, 20_000);
    return () => clearInterval(id);
  }, [ready, refresh]);

  const submit = useCallback(
    async ({ chainId, rating }: SubmitOptions) => {
      if (!challengeRef.current || !csrfRef.current) {
        throw new Error("Session not initialized");
      }
      const challenge = challengeRef.current;
      const sol = await solvePow(challenge.seed, challenge.difficulty);
      const elapsedMs = Math.max(
        300,
        Math.round(performance.now() - pageLoadTime.current),
      );
      const resp = await submitRating({
        chainId,
        rating,
        csrfToken: csrfRef.current,
        powNonce: sol.nonce,
        elapsedMs,
      });
      challengeRef.current = resp.next_challenge;
      setStats((prev) => ({ ...prev, [chainId]: resp.stats }));
      setYourRatings((prev) => ({ ...prev, [chainId]: rating }));
      return resp.stats;
    },
    [],
  );

  const value = useMemo<FoodrContextValue>(
    () => ({
      ready,
      error,
      session,
      stats,
      yourRatings,
      pageLoadTime: pageLoadTime.current,
      submit,
      refresh,
    }),
    [ready, error, session, stats, yourRatings, submit, refresh],
  );

  return <FoodrContext.Provider value={value}>{children}</FoodrContext.Provider>;
}

export function useFoodr(): FoodrContextValue {
  const ctx = useContext(FoodrContext);
  if (!ctx) throw new Error("useFoodr must be used inside FoodrProvider");
  return ctx;
}
