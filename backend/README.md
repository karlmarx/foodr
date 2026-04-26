# foodr-backend

Rust (axum + sqlx + sqlite) backend that persists ratings for the foodr app.

## Defenses

- **Signed session cookie** (`foodr_sid`, HttpOnly, SameSite=Lax) issued on first request.
- **CSRF**: double-submit pattern. `foodr_csrf` cookie + `X-CSRF-Token` header must match.
- **Proof-of-work**: every submission must include a SHA-256 nonce yielding 16 leading zero bits over a per-session seed. The seed rotates on each successful submit.
- **Honeypot field** (`website`): must be empty.
- **Submission timing check** (`elapsed_ms`): rejects submissions faster than 250ms.
- **Rate limiting** (governor): per-IP read (10/s burst 20), per-IP write (20/min burst 5), per-session write (15/min burst 3).
- **De-dup**: same session can't re-rate the same chain within 5 seconds.
- **PII**: client IP and User-Agent are HMAC-hashed before storage; cleartext is never persisted.

## Endpoints

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/health` | liveness |
| GET | `/api/session` | issues cookies, returns CSRF + PoW + your prior ratings |
| GET | `/api/challenge` | rotates and returns a fresh PoW seed |
| GET | `/api/ratings` | aggregated stats for every chain |
| GET | `/api/ratings/:chain_id` | aggregated stats for one chain |
| POST | `/api/ratings/:chain_id` | submit a rating (`{rating, pow_nonce, website, elapsed_ms}`) |
| GET | `/api/leaderboard` | chains ranked by average then count |

## Run

```bash
cargo run --release
# Listens on 0.0.0.0:8787 by default. Override with BIND_ADDR / DATABASE_URL / CORS_ORIGIN / FOODR_HMAC_KEY.
```

For production, set `FOODR_HMAC_KEY` to a stable 32-byte secret so cookies survive restart.
