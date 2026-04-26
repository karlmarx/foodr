export const API_BASE =
  process.env.NEXT_PUBLIC_FOODR_API ?? "http://localhost:8787";

export interface PowChallenge {
  seed: string;
  difficulty: number;
  algorithm: "sha256";
}

export interface SessionRating {
  chain_id: string;
  rating: number;
}

export interface SessionInfo {
  session_id: string;
  csrf_token: string;
  pow: PowChallenge;
  your_ratings: SessionRating[];
}

export interface ChainStats {
  chain_id: string;
  count: number;
  average: number;
  distribution: [number, number, number, number, number];
  last_rated_at: string | null;
}

export interface SubmitResponse {
  ok: boolean;
  stats: ChainStats;
  next_challenge: PowChallenge;
}

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.message ?? body?.error ?? "";
    } catch {
      // ignore
    }
    throw new Error(`${res.status} ${res.statusText}${detail ? `: ${detail}` : ""}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchSession(): Promise<SessionInfo> {
  const res = await fetch(`${API_BASE}/api/session`, {
    credentials: "include",
  });
  return jsonOrThrow<SessionInfo>(res);
}

export async function fetchAllStats(): Promise<ChainStats[]> {
  const res = await fetch(`${API_BASE}/api/ratings`, { credentials: "include" });
  return jsonOrThrow<ChainStats[]>(res);
}

export async function fetchLeaderboard(): Promise<ChainStats[]> {
  const res = await fetch(`${API_BASE}/api/leaderboard`, {
    credentials: "include",
  });
  return jsonOrThrow<ChainStats[]>(res);
}

export async function submitRating(opts: {
  chainId: string;
  rating: number;
  csrfToken: string;
  powNonce: string;
  elapsedMs: number;
}): Promise<SubmitResponse> {
  const res = await fetch(`${API_BASE}/api/ratings/${opts.chainId}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": opts.csrfToken,
    },
    body: JSON.stringify({
      rating: opts.rating,
      pow_nonce: opts.powNonce,
      website: "",
      elapsed_ms: opts.elapsedMs,
    }),
  });
  return jsonOrThrow<SubmitResponse>(res);
}
