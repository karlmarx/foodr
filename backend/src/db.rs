use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::SqlitePool;

#[derive(Debug, Serialize)]
pub struct ChainStats {
    pub chain_id: String,
    pub count: i64,
    pub average: f64,
    pub distribution: [i64; 5],
    pub last_rated_at: Option<DateTime<Utc>>,
}

pub async fn ensure_session(
    pool: &SqlitePool,
    session_id: &str,
    csrf_token: &str,
    pow_seed: &str,
    pow_difficulty: i64,
) -> sqlx::Result<()> {
    sqlx::query(
        "INSERT INTO sessions (session_id, csrf_token, pow_seed, pow_difficulty)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(session_id) DO UPDATE SET last_seen_at = CURRENT_TIMESTAMP",
    )
    .bind(session_id)
    .bind(csrf_token)
    .bind(pow_seed)
    .bind(pow_difficulty)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn rotate_pow_seed(
    pool: &SqlitePool,
    session_id: &str,
    pow_seed: &str,
    pow_difficulty: i64,
) -> sqlx::Result<()> {
    sqlx::query(
        "UPDATE sessions SET pow_seed = ?2, pow_difficulty = ?3, last_seen_at = CURRENT_TIMESTAMP WHERE session_id = ?1",
    )
    .bind(session_id)
    .bind(pow_seed)
    .bind(pow_difficulty)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn get_session(
    pool: &SqlitePool,
    session_id: &str,
) -> sqlx::Result<Option<(String, String, i64)>> {
    let row: Option<(String, String, i64)> = sqlx::query_as(
        "SELECT csrf_token, pow_seed, pow_difficulty FROM sessions WHERE session_id = ?1",
    )
    .bind(session_id)
    .fetch_optional(pool)
    .await?;
    Ok(row)
}

pub async fn insert_rating(
    pool: &SqlitePool,
    chain_id: &str,
    rating: i64,
    session_id: &str,
    ip_hash: &str,
    user_agent_hash: &str,
) -> sqlx::Result<i64> {
    let row: (i64,) = sqlx::query_as(
        "INSERT INTO ratings (chain_id, rating, session_id, ip_hash, user_agent_hash)
         VALUES (?1, ?2, ?3, ?4, ?5) RETURNING id",
    )
    .bind(chain_id)
    .bind(rating)
    .bind(session_id)
    .bind(ip_hash)
    .bind(user_agent_hash)
    .fetch_one(pool)
    .await?;
    Ok(row.0)
}

pub async fn count_recent_for_session(
    pool: &SqlitePool,
    session_id: &str,
    chain_id: &str,
    seconds: i64,
) -> sqlx::Result<i64> {
    let row: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM ratings
         WHERE session_id = ?1 AND chain_id = ?2
           AND created_at >= datetime('now', '-' || ?3 || ' seconds')",
    )
    .bind(session_id)
    .bind(chain_id)
    .bind(seconds)
    .fetch_one(pool)
    .await?;
    Ok(row.0)
}

pub async fn chain_stats(pool: &SqlitePool, chain_id: &str) -> sqlx::Result<ChainStats> {
    let rows: Vec<(i64, i64)> = sqlx::query_as(
        "SELECT rating, COUNT(*) FROM ratings WHERE chain_id = ?1 GROUP BY rating",
    )
    .bind(chain_id)
    .fetch_all(pool)
    .await?;

    let last: Option<(DateTime<Utc>,)> = sqlx::query_as(
        "SELECT created_at FROM ratings WHERE chain_id = ?1 ORDER BY created_at DESC LIMIT 1",
    )
    .bind(chain_id)
    .fetch_optional(pool)
    .await?;

    let mut distribution = [0i64; 5];
    let mut count = 0i64;
    let mut sum = 0i64;
    for (r, c) in rows {
        if (1..=5).contains(&r) {
            distribution[(r - 1) as usize] = c;
        }
        count += c;
        sum += r * c;
    }
    let average = if count > 0 {
        sum as f64 / count as f64
    } else {
        0.0
    };
    Ok(ChainStats {
        chain_id: chain_id.to_string(),
        count,
        average,
        distribution,
        last_rated_at: last.map(|x| x.0),
    })
}

pub async fn all_stats(pool: &SqlitePool) -> sqlx::Result<Vec<ChainStats>> {
    let rows: Vec<(String, i64, i64)> = sqlx::query_as(
        "SELECT chain_id, rating, COUNT(*) FROM ratings GROUP BY chain_id, rating",
    )
    .fetch_all(pool)
    .await?;

    use std::collections::BTreeMap;
    let mut acc: BTreeMap<String, ChainStats> = BTreeMap::new();
    for (chain_id, r, c) in rows {
        let entry = acc.entry(chain_id.clone()).or_insert_with(|| ChainStats {
            chain_id: chain_id.clone(),
            count: 0,
            average: 0.0,
            distribution: [0; 5],
            last_rated_at: None,
        });
        if (1..=5).contains(&r) {
            entry.distribution[(r - 1) as usize] = c;
        }
        entry.count += c;
        entry.average += (r * c) as f64;
    }
    let mut out: Vec<ChainStats> = acc.into_values().collect();
    for s in out.iter_mut() {
        if s.count > 0 {
            s.average /= s.count as f64;
        }
    }
    Ok(out)
}

pub async fn session_ratings(
    pool: &SqlitePool,
    session_id: &str,
) -> sqlx::Result<Vec<(String, i64)>> {
    let rows: Vec<(String, i64)> = sqlx::query_as(
        "SELECT chain_id, rating FROM ratings r1
         WHERE session_id = ?1
           AND id = (SELECT MAX(id) FROM ratings r2
                     WHERE r2.session_id = r1.session_id AND r2.chain_id = r1.chain_id)",
    )
    .bind(session_id)
    .fetch_all(pool)
    .await?;
    Ok(rows)
}
