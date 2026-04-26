mod antibot;
mod db;
mod error;
mod handlers;
mod ratelimit;
mod state;

use axum::{
    routing::{get, post},
    Router,
};
use std::net::SocketAddr;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;

use crate::state::AppState;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "foodr_backend=info,tower_http=info".into()),
        )
        .init();

    let db_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite://foodr.db".into());
    let bind_addr = std::env::var("BIND_ADDR").unwrap_or_else(|_| "0.0.0.0:8787".into());
    let cors_origin =
        std::env::var("CORS_ORIGIN").unwrap_or_else(|_| "http://localhost:3000".into());

    let state = AppState::init(&db_url).await?;

    let cors = CorsLayer::new()
        .allow_origin(cors_origin.parse::<axum::http::HeaderValue>()?)
        .allow_credentials(true)
        .allow_methods([
            axum::http::Method::GET,
            axum::http::Method::POST,
            axum::http::Method::OPTIONS,
        ])
        .allow_headers([
            axum::http::header::CONTENT_TYPE,
            axum::http::HeaderName::from_static("x-csrf-token"),
            axum::http::HeaderName::from_static("x-pow-nonce"),
        ]);

    let app = Router::new()
        .route("/api/health", get(handlers::health))
        .route("/api/session", get(handlers::session))
        .route("/api/challenge", get(handlers::challenge))
        .route("/api/ratings", get(handlers::list_ratings))
        .route("/api/ratings/:chain_id", get(handlers::chain_ratings))
        .route("/api/ratings/:chain_id", post(handlers::submit_rating))
        .route("/api/leaderboard", get(handlers::leaderboard))
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let addr: SocketAddr = bind_addr.parse()?;
    tracing::info!("foodr backend listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await?;

    Ok(())
}
