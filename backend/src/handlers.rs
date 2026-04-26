use axum::extract::{ConnectInfo, Path, State};
use axum::http::header::{HeaderMap, HeaderValue, SET_COOKIE, USER_AGENT};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::net::SocketAddr;

use crate::antibot::{
    build_session_cookies, new_csrf_token, new_pow_seed, new_session_id, parse_csrf_cookie,
    parse_session_cookie, sign_session, verify_pow, POW_DIFFICULTY,
};
use crate::db;
use crate::error::{AppError, AppResult};
use crate::state::AppState;

#[derive(Serialize)]
pub struct SessionInfo {
    pub session_id: String,
    pub csrf_token: String,
    pub pow: PowChallenge,
    pub your_ratings: Vec<SessionRating>,
}

#[derive(Serialize)]
pub struct SessionRating {
    pub chain_id: String,
    pub rating: i64,
}

#[derive(Serialize)]
pub struct PowChallenge {
    pub seed: String,
    pub difficulty: u32,
    pub algorithm: &'static str,
}

pub async fn health() -> &'static str {
    "ok"
}

/// Issues a session cookie if the caller doesn't already have a valid one,
/// and returns the current session info plus PoW challenge.
pub async fn session(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> AppResult<Response> {
    let (sid, set_cookie) = ensure_session_cookie(&state, &headers).await?;

    let (csrf, seed, difficulty) = match db::get_session(&state.db, &sid).await? {
        Some(row) => row,
        None => return Err(AppError::Internal("session row missing".into())),
    };
    let your_ratings = db::session_ratings(&state.db, &sid)
        .await?
        .into_iter()
        .map(|(chain_id, rating)| SessionRating { chain_id, rating })
        .collect();

    let info = SessionInfo {
        session_id: sid,
        csrf_token: csrf,
        pow: PowChallenge {
            seed,
            difficulty: difficulty as u32,
            algorithm: "sha256",
        },
        your_ratings,
    };

    let mut resp = (StatusCode::OK, Json(info)).into_response();
    apply_cookies(resp.headers_mut(), &set_cookie);
    Ok(resp)
}

pub async fn challenge(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> AppResult<Response> {
    let (sid, set_cookie) = ensure_session_cookie(&state, &headers).await?;
    let seed = new_pow_seed();
    db::rotate_pow_seed(&state.db, &sid, &seed, POW_DIFFICULTY as i64).await?;
    let body = Json(PowChallenge {
        seed,
        difficulty: POW_DIFFICULTY,
        algorithm: "sha256",
    });
    let mut resp = (StatusCode::OK, body).into_response();
    apply_cookies(resp.headers_mut(), &set_cookie);
    Ok(resp)
}

pub async fn list_ratings(
    State(state): State<AppState>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
) -> AppResult<Json<Vec<db::ChainStats>>> {
    let ip = client_ip(&headers, addr);
    if !state.limiters.check_read_ip(&ip) {
        return Err(AppError::RateLimited);
    }
    Ok(Json(db::all_stats(&state.db).await?))
}

pub async fn chain_ratings(
    State(state): State<AppState>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
    Path(chain_id): Path<String>,
) -> AppResult<Json<db::ChainStats>> {
    let ip = client_ip(&headers, addr);
    if !state.limiters.check_read_ip(&ip) {
        return Err(AppError::RateLimited);
    }
    validate_chain_id(&chain_id)?;
    Ok(Json(db::chain_stats(&state.db, &chain_id).await?))
}

#[derive(Deserialize)]
pub struct SubmitRating {
    pub rating: i64,
    pub pow_nonce: String,
    /// honeypot field — must be empty
    #[serde(default)]
    pub website: String,
    /// client-side time-on-page in ms — must be reasonable
    #[serde(default)]
    pub elapsed_ms: i64,
}

#[derive(Serialize)]
pub struct SubmitResponse {
    pub ok: bool,
    pub stats: db::ChainStats,
    pub next_challenge: PowChallenge,
}

pub async fn submit_rating(
    State(state): State<AppState>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
    Path(chain_id): Path<String>,
    Json(payload): Json<SubmitRating>,
) -> AppResult<Response> {
    validate_chain_id(&chain_id)?;
    if !(1..=5).contains(&payload.rating) {
        return Err(AppError::BadRequest("rating must be 1..=5".into()));
    }
    if !payload.website.is_empty() {
        return Err(AppError::Forbidden("honeypot triggered".into()));
    }
    if payload.elapsed_ms < 250 {
        return Err(AppError::Forbidden("submission too fast".into()));
    }

    let ip = client_ip(&headers, addr);
    if !state.limiters.check_write_ip(&ip) {
        return Err(AppError::RateLimited);
    }

    let cookie_header = headers
        .get(axum::http::header::COOKIE)
        .and_then(|h| h.to_str().ok())
        .unwrap_or("");
    let sid = parse_session_cookie(cookie_header, &state.hmac_key)
        .ok_or_else(|| AppError::Unauthorized("missing or invalid session cookie".into()))?;
    if !state.limiters.check_write_session(&sid) {
        return Err(AppError::RateLimited);
    }

    let csrf_cookie = parse_csrf_cookie(cookie_header)
        .ok_or_else(|| AppError::Forbidden("missing csrf cookie".into()))?;
    let csrf_header = headers
        .get("x-csrf-token")
        .and_then(|h| h.to_str().ok())
        .ok_or_else(|| AppError::Forbidden("missing csrf header".into()))?;
    if csrf_cookie != csrf_header {
        return Err(AppError::Forbidden("csrf mismatch".into()));
    }

    let session_row = db::get_session(&state.db, &sid)
        .await?
        .ok_or_else(|| AppError::Unauthorized("unknown session".into()))?;
    let (db_csrf, pow_seed, pow_difficulty) = session_row;
    if db_csrf != csrf_cookie {
        return Err(AppError::Forbidden("csrf mismatch (session)".into()));
    }
    if !verify_pow(&pow_seed, &payload.pow_nonce, pow_difficulty as u32) {
        return Err(AppError::Forbidden("invalid proof-of-work".into()));
    }

    // Throttle duplicate submissions for the same chain from the same session.
    let recent = db::count_recent_for_session(&state.db, &sid, &chain_id, 5).await?;
    if recent > 0 {
        return Err(AppError::RateLimited);
    }

    let ua = headers
        .get(USER_AGENT)
        .and_then(|h| h.to_str().ok())
        .unwrap_or("");
    let ip_hash = hash_with_key(&state.hmac_key, ip.as_bytes());
    let ua_hash = hash_with_key(&state.hmac_key, ua.as_bytes());

    db::insert_rating(&state.db, &chain_id, payload.rating, &sid, &ip_hash, &ua_hash).await?;

    // Rotate PoW seed so each submit needs a fresh proof.
    let new_seed = new_pow_seed();
    db::rotate_pow_seed(&state.db, &sid, &new_seed, POW_DIFFICULTY as i64).await?;

    let stats = db::chain_stats(&state.db, &chain_id).await?;
    Ok((
        StatusCode::OK,
        Json(SubmitResponse {
            ok: true,
            stats,
            next_challenge: PowChallenge {
                seed: new_seed,
                difficulty: POW_DIFFICULTY,
                algorithm: "sha256",
            },
        }),
    )
        .into_response())
}

pub async fn leaderboard(
    State(state): State<AppState>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
) -> AppResult<Json<Vec<db::ChainStats>>> {
    let ip = client_ip(&headers, addr);
    if !state.limiters.check_read_ip(&ip) {
        return Err(AppError::RateLimited);
    }
    let mut all = db::all_stats(&state.db).await?;
    all.sort_by(|a, b| {
        b.average
            .partial_cmp(&a.average)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then(b.count.cmp(&a.count))
    });
    Ok(Json(all))
}

// --- helpers ---

fn validate_chain_id(s: &str) -> AppResult<()> {
    if s.is_empty() || s.len() > 64 {
        return Err(AppError::BadRequest("chain_id length".into()));
    }
    if !s
        .chars()
        .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
    {
        return Err(AppError::BadRequest("chain_id charset".into()));
    }
    Ok(())
}

fn client_ip(headers: &HeaderMap, addr: SocketAddr) -> String {
    if let Some(fwd) = headers.get("x-forwarded-for").and_then(|h| h.to_str().ok()) {
        if let Some(first) = fwd.split(',').next() {
            return first.trim().to_string();
        }
    }
    if let Some(real) = headers.get("x-real-ip").and_then(|h| h.to_str().ok()) {
        return real.to_string();
    }
    addr.ip().to_string()
}

fn hash_with_key(key: &[u8], data: &[u8]) -> String {
    let mut h = Sha256::new();
    h.update(key);
    h.update(b"|");
    h.update(data);
    hex::encode(h.finalize())
}

async fn ensure_session_cookie(
    state: &AppState,
    headers: &HeaderMap,
) -> AppResult<(String, Option<Vec<String>>)> {
    let cookie_header = headers
        .get(axum::http::header::COOKIE)
        .and_then(|h| h.to_str().ok())
        .unwrap_or("");
    if let Some(sid) = parse_session_cookie(cookie_header, &state.hmac_key) {
        if db::get_session(&state.db, &sid).await?.is_some() {
            return Ok((sid, None));
        }
    }
    let sid = new_session_id();
    let csrf = new_csrf_token();
    let seed = new_pow_seed();
    db::ensure_session(&state.db, &sid, &csrf, &seed, POW_DIFFICULTY as i64).await?;
    let sig = sign_session(&state.hmac_key, &sid);
    let cookies = build_session_cookies(&sid, &sig, &csrf);
    Ok((sid, Some(cookies)))
}

fn apply_cookies(headers: &mut HeaderMap, cookies: &Option<Vec<String>>) {
    if let Some(list) = cookies {
        for c in list {
            if let Ok(v) = HeaderValue::from_str(c) {
                headers.append(SET_COOKIE, v);
            }
        }
    }
}
