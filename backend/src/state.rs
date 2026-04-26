use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::SqlitePool;
use std::str::FromStr;

use crate::ratelimit::RateLimiters;

#[derive(Clone)]
pub struct AppState {
    pub db: SqlitePool,
    pub limiters: RateLimiters,
    pub hmac_key: [u8; 32],
}

impl AppState {
    pub async fn init(db_url: &str) -> anyhow::Result<Self> {
        let opts = SqliteConnectOptions::from_str(db_url)?
            .create_if_missing(true)
            .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
            .synchronous(sqlx::sqlite::SqliteSynchronous::Normal);
        let db = SqlitePoolOptions::new()
            .max_connections(8)
            .connect_with(opts)
            .await?;
        sqlx::migrate!("./migrations").run(&db).await?;

        let mut hmac_key = [0u8; 32];
        match std::env::var("FOODR_HMAC_KEY") {
            Ok(k) if !k.is_empty() => {
                let bytes = k.as_bytes();
                for (i, b) in bytes.iter().enumerate().take(32) {
                    hmac_key[i] = *b;
                }
            }
            _ => {
                use rand::RngCore;
                rand::thread_rng().fill_bytes(&mut hmac_key);
                tracing::warn!(
                    "FOODR_HMAC_KEY not set; generated ephemeral key (sessions invalidate on restart)"
                );
            }
        }

        Ok(Self {
            db,
            limiters: RateLimiters::new(),
            hmac_key,
        })
    }
}
