# foodr

Rate fast food on its own scale. Because every chain deserves to be judged as itself.

No more meaningless 2.3 stars on Google Maps — a **4 out of 5 Wendy's** actually means something.

## The Concept

Traditional review sites compare fast food to every other restaurant, which is inherently unfair. foodr lets you rate each chain on a 1–5 scale using that chain's own emoji as the rating icon. A great McDonald's visit gets 🍟🍟🍟🍟🍟. A mediocre Taco Bell is 🌮🌮🌮. Chain-relative ratings only.

**Supported chains:** McDonald's, Wendy's, Burger King, Taco Bell, Chick-fil-A, Popeyes, Five Guys, In-N-Out, Chipotle, Subway, KFC, Sonic

## Architecture

```
foodr/
  src/             # Next.js 16 + React 19 + Tailwind v4 frontend
  backend/         # Rust (axum + sqlx + sqlite) ratings API
```

| | |
|---|---|
| Frontend | Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · TypeScript 6 |
| Backend  | Rust · axum 0.7 · sqlx + SQLite · governor (rate limiting) · cookie + HMAC sessions |

## Anti-abuse

The backend ships with layered protection so a casual scripted attacker can't flood the database:

- **Signed session cookie** (`foodr_sid`, HttpOnly, SameSite=Lax) issued on first visit and persisted for 180 days.
- **CSRF**: double-submit. `foodr_csrf` cookie value must match an `X-CSRF-Token` header on every write.
- **Proof-of-work**: every rating submission must include a SHA-256 nonce yielding ≥16 leading zero bits over a per-session seed. The seed rotates after every successful submit so nonces can't be replayed.
- **Honeypot field** (`website`): bots that auto-fill all visible fields trip a 403.
- **Submission timing**: writes faster than 250 ms after page load are rejected.
- **Rate limiting** (governor):
  - read: 10 req/s burst 20 per IP
  - write: 20/min burst 5 per IP, 15/min burst 3 per session
- **Per-chain de-dup**: the same session can't re-rate the same chain within 5 seconds.
- **PII**: client IP and User-Agent are HMAC-SHA256 hashed before storage; the cleartext is never persisted.

## Running locally

### 1. Backend

```bash
cd backend
cargo run --release
# Listens on 0.0.0.0:8787 by default. Configure via:
#   BIND_ADDR=0.0.0.0:8787
#   DATABASE_URL=sqlite://foodr.db
#   CORS_ORIGIN=http://localhost:3000
#   FOODR_HMAC_KEY=<32-byte secret>   # set in prod so cookies survive restart
```

### 2. Frontend

```bash
npm install
npm run dev
# http://localhost:3000 — point it at a different backend with NEXT_PUBLIC_FOODR_API
```

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET  | `/api/health`              | liveness probe |
| GET  | `/api/session`             | issue cookies, return CSRF token, PoW challenge, your prior ratings |
| GET  | `/api/challenge`           | rotate and return a fresh PoW seed |
| GET  | `/api/ratings`             | aggregated stats for every chain |
| GET  | `/api/ratings/:chain_id`   | aggregated stats for one chain |
| POST | `/api/ratings/:chain_id`   | submit `{ rating, pow_nonce, website, elapsed_ms }` |
| GET  | `/api/leaderboard`         | chains ranked by average then count |

## Adding a Chain

In `src/data/chains.ts`, add an entry to the `chains` array:

```ts
{
  id: "chain-id",
  name: "Chain Name",
  emoji: "🍕",
  color: "#HEXCOLOR",
  tagline: "Their slogan",
}
```

The chain card, leaderboard, stats, and rating UI are generated automatically.
