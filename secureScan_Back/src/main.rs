use actix_web::{get, App, HttpResponse, HttpServer, Responder};
use actix_web::web as aw_web;
use actix_web::HttpRequest;
use actix_web::middleware::Logger;
use std::env;
use tracing_subscriber::filter::EnvFilter;
use tracing_subscriber::fmt::format::FmtSpan;
use tracing_log::LogTracer;
use actix_cors::Cors;
use actix_web::http::header;
use actix_web::http::Method;
use actix_web::dev::{ServiceRequest, Service};
use futures_util::future::FutureExt;
// use wrap_fn below for rate limiter
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex as AsyncMutex;
use serde_json::json;
use tokio::sync::mpsc;

mod jobs;
mod domain;
mod web;
mod scanner;
mod webhook;

use crate::jobs::queue::ScanJob as Job;
use crate::jobs::queue::ScanQueue;
use crate::domain::scan_service::ScanService;
// handlers are registered via `web::handlers::scans::config`; no direct imports needed here

#[get("/api/health")]
async fn health() -> impl Responder {
    HttpResponse::Ok().json(json!({"status":"ok"}))
}

#[get("/api/ping")]
async fn ping() -> impl Responder {
    HttpResponse::Ok().body("pong")
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
   
    // initialize tracing subscriber with env filter and bridge log records
    let env_filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info,actix_web=info"));
    // forward log records from `log` to `tracing`
    LogTracer::init().ok();
    tracing_subscriber::fmt()
        .with_env_filter(env_filter)
        .with_span_events(FmtSpan::CLOSE)
        .with_writer(std::io::stdout)
        .try_init()
        .ok();

    let bind = env::var("BIND_ADDR").unwrap_or_else(|_| "0.0.0.0:8080".to_string());

    // startup banner with binary version info and bind address
    let exe = std::env::current_exe().ok().and_then(|p| p.file_name().map(|n| n.to_string_lossy().into_owned())).unwrap_or_else(|| "securascan".into());
    tracing::info!(target = "startup", bind = %bind, binary = %exe, "Starting server");

    // read concurrency and queue size from env
    let concurrency: usize = env::var("SCAN_MAX_CONCURRENCY").ok().and_then(|s| s.parse().ok()).unwrap_or(4);
    let queue_cap: usize = env::var("SCAN_QUEUE_BUFFER").ok().and_then(|s| s.parse().ok()).unwrap_or(128);

    // create mpsc queue for jobs
    let (tx, rx) = mpsc::channel::<Job>(queue_cap);

    // create ScanQueue and ScanService
    let scan_queue = ScanQueue::new(tx.clone());
    let scan_service = ScanService::new(scan_queue.clone());

    // start background workers (non-blocking)
    jobs::workers::start_workers(rx, concurrency);

    // wrap shared data for handlers
    let tx_data = aw_web::Data::new(tx.clone());
    let scan_service_data = aw_web::Data::new(scan_service);

    // prepare CORS allowed origins list
    let allowed_origins_csv = env::var("ALLOWED_ORIGINS").unwrap_or_else(|_| "http://localhost:3000".to_string());
    let allowed_origins: Vec<String> = allowed_origins_csv
        .split(',')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();

    // simple in-memory rate limiter state: map ip -> (count, window_start_unix)
    let rate_store: Arc<AsyncMutex<HashMap<String, (u32, u64)>>> = Arc::new(AsyncMutex::new(HashMap::new()));

    HttpServer::new(move || {
        // build cors and only allow configured origins
        let mut cors = Cors::default();
        for origin in &allowed_origins {
            cors = cors.allowed_origin(origin);
        }
        // only allow specific headers and methods for security
        cors = cors
            .allowed_methods(vec!["GET", "POST", "OPTIONS"])
            .allowed_headers(vec![header::CONTENT_TYPE, header::ACCEPT])
            .max_age(3600);

        // clone rate_store for middleware closure
        let limiter_store = rate_store.clone();

        App::new()
                // NOTE: rate-limiter middleware was removed here due to async/lifetime
                // complications that prevented compiling. Reinstate with a proper
                // Actix middleware or an external proxy (nginx/rate-limiter) later.
            .wrap(Logger::default())
            .wrap(cors)
            .app_data(tx_data.clone())
            .app_data(scan_service_data.clone())
            .service(health)
            .service(ping)
            .service(
                aw_web::scope("/api")
                    .configure(web::handlers::scans::config)
                    .configure(web::handlers::extra::config_extra)
            )
            // explicit route for webhook that needs the raw body
            .route("/api/ci/webhook/github", aw_web::post().to(webhook::github_webhook))
            // fallback service to log unmatched requests for debugging
            .default_service(aw_web::to(|req: HttpRequest| async move {
                tracing::warn!(target = "http", method = %req.method(), path = %req.path(), "unmatched request");
                Ok::<_, actix_web::Error>(HttpResponse::NotFound().body("not found (fallback)"))
            }))
    })
    // bind using configured address
    .bind(bind)?
    .run()
    .await
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::{test, App};
    use serde_json::json;
    use uuid::Uuid;

    #[actix_web::test]
    async fn integration_post_and_get_scan() {
        // build components similar to main()
        let concurrency: usize = 2;
        let queue_cap: usize = 16;
        let (tx, _rx) = tokio::sync::mpsc::channel::<crate::jobs::queue::ScanJob>(queue_cap);

        let scan_queue = crate::jobs::queue::ScanQueue::new(tx.clone());
        let scan_service = crate::domain::scan_service::ScanService::new(scan_queue.clone());

        // initialize app with the same routes
        let app = test::init_service(
            App::new()
                .app_data(actix_web::web::Data::new(scan_service.clone()))
                .app_data(actix_web::web::Data::new(tx.clone()))
                .service(health)
                .service(actix_web::web::scope("/api").configure(crate::web::handlers::scans::config)),
        )
        .await;

        // POST to start a scan (use target_url as the API expects)
        let post_req = test::TestRequest::post()
            .uri("/api/scans")
            .set_json(&json!({"target_url": "https://example.com"}))
            .to_request();

        let resp = test::call_service(&app, post_req).await;
        assert_eq!(resp.status(), actix_web::http::StatusCode::ACCEPTED);

        let body: serde_json::Value = test::read_body_json(resp).await;
        let scan_id = body.get("scan_id").and_then(|v| v.as_str()).expect("scan_id present");
        let parsed_id = Uuid::parse_str(scan_id).expect("valid uuid");

        // GET the scan record
        let get_uri = format!("/api/scans/{}", parsed_id);
        let get_req = test::TestRequest::get().uri(&get_uri).to_request();
        let get_resp = test::call_service(&app, get_req).await;
        assert_eq!(get_resp.status(), actix_web::http::StatusCode::OK);

        let rec: serde_json::Value = test::read_body_json(get_resp).await;
        let status = rec.get("status").and_then(|s| s.as_str()).expect("status string");

        // Accept queued, running, or completed
        let ok_status = matches!(status, "queued" | "running" | "completed" | "done");
        assert!(ok_status, "unexpected status: {}", status);
    }
}

