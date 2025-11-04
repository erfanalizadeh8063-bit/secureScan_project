use actix_web::{get, App, HttpRequest, HttpResponse, HttpServer, middleware, web as aw_web};
use actix_web::dev::{ServiceRequest, ServiceResponse, Transform};
use actix_web::http::header;
use actix_cors::Cors;
use futures_util::future::LocalBoxFuture;
use std::future::{ready as std_ready, Ready};
use std::env;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
mod web;
mod domain;
mod jobs;
mod scanner;
use web::handlers::webhook::github_webhook;
use tracing::{info, error};

#[get("/api/health")]
async fn health() -> HttpResponse {
    HttpResponse::Ok().json(serde_json::json!({"status":"ok"}))
}

// compatibility endpoint expected by some healthcheck tooling
#[get("/healthz")]
async fn healthz() -> HttpResponse {
    HttpResponse::Ok().json(serde_json::json!({"status":"ok"}))
}

#[get("/ready")]
async fn readiness(ready_flag: aw_web::Data<Arc<AtomicBool>>) -> HttpResponse {
    if ready_flag.load(Ordering::SeqCst) {
        HttpResponse::Ok().json(serde_json::json!({"status":"ready"}))
    } else {
        HttpResponse::ServiceUnavailable().json(serde_json::json!({"status":"starting"}))
    }
}

/// Simple timeout middleware that wraps downstream calls with tokio::time::timeout
struct TimeoutMiddleware {
    timeout: Duration,
}

impl<S, B> Transform<S, ServiceRequest> for TimeoutMiddleware
where
    S: actix_web::dev::Service<ServiceRequest, Response = ServiceResponse<B>, Error = actix_web::Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = actix_web::Error;
    type InitError = ();
    type Transform = TimeoutMiddlewareService<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        // use std::future::ready to construct the immediate future
        std_ready(Ok(TimeoutMiddlewareService {
            service: Arc::new(service),
            timeout: self.timeout,
        }))
    }
}

struct TimeoutMiddlewareService<S> {
    service: Arc<S>,
    timeout: Duration,
}

impl<S, B> actix_web::dev::Service<ServiceRequest> for TimeoutMiddlewareService<S>
where
    S: actix_web::dev::Service<ServiceRequest, Response = ServiceResponse<B>, Error = actix_web::Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = actix_web::Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    fn poll_ready(
        &self,
        cx: &mut std::task::Context<'_>,
    ) -> std::task::Poll<Result<(), Self::Error>> {
        self.service.poll_ready(cx)
    }

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let svc = Arc::clone(&self.service);
        let dur = self.timeout;
        Box::pin(async move {
            match tokio::time::timeout(dur, svc.call(req)).await {
                Ok(Ok(res)) => Ok(res),
                Ok(Err(e)) => Err(e),
                Err(_) => {
                    // Return a request timeout error with a string message (ErrorRequestTimeout
                    // expects a Display, not an HttpResponse).
                    Err(actix_web::error::ErrorRequestTimeout("request timeout"))
                }
            }
        })
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // init tracing/logging
    tracing_subscriber::fmt::init();

    let bind = env::var("BIND_ADDR").unwrap_or_else(|_| "0.0.0.0:8080".to_string());
    // ALLOWED_ORIGIN is the preferred env var; fall back to the production FRONT_ORIGIN
    let allowed_origins = env::var("ALLOWED_ORIGIN")
        .or_else(|_| env::var("FRONT_ORIGIN"))
        .unwrap_or_else(|_| "https://securascan-front-dd57.onrender.com".to_string());

    info!(%bind, %allowed_origins, "Starting server");

    // readiness flag that can be flipped once startup tasks complete
    let ready_flag = Arc::new(AtomicBool::new(false));
    let ready_flag_data = aw_web::Data::new(Arc::clone(&ready_flag));

    // simulate startup/init steps (DB/queue). Replace with real init in future.
    if let Err(e) = init_startup().await {
        error!(%e, "startup initialization failed");
        // still continue but not mark ready
    } else {
        ready_flag.store(true, Ordering::SeqCst);
        info!("startup complete, marking ready");
    }

    // Note: build a fresh Cors per-app since Cors does not implement Clone
    // Parse allowed origins (comma-separated) and register each explicitly.
    let allowed = allowed_origins.clone();
    let server = HttpServer::new(move || {
        // Normalize and split origins; remove empty entries and trim whitespace.
        let origins: Vec<&str> = allowed
            .split(',')
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
            .collect();

        // build cors per-app
        // Policy: allow only the first configured origin (production frontend), restrict methods to safe verbs,
        // do not allow credentials, and only allow necessary headers.
        let mut cors = Cors::default()
            .allowed_methods(vec!["GET", "POST", "OPTIONS"])
            .allowed_headers(vec![header::CONTENT_TYPE, header::AUTHORIZATION, header::ACCEPT])
            .expose_headers(vec![header::CONTENT_TYPE])
            // Do not support credentials by default for stricter CORS policy
            //.supports_credentials()
            .max_age(600);

        // Prefer a single origin; if multiple are provided, use the first and log a warning.
        if origins.is_empty() {
            // fallback to a conservative default if nothing present
            cors = cors.allowed_origin("https://securascan-front-dd57.onrender.com");
        } else {
            if origins.len() > 1 {
                // avoid spamming logs in tight loops; just one informational message
                info!(allowed = origins.join(","), "Multiple allowed origins detected; using the first origin only for CORS");
            }
            cors = cors.allowed_origin(origins[0]);
        }

        App::new()
            .wrap(middleware::Logger::default())
            // Request timeout middleware: adjust Duration::from_secs(...) to tune request timeout.
            // For production, consider reading this value from an env var like REQUEST_TIMEOUT_SECS.
            .wrap(TimeoutMiddleware { timeout: Duration::from_secs(10) })
            .wrap(cors)
            // limit JSON payloads to 5MB (protects against large body DoS)
            .app_data(aw_web::JsonConfig::default().limit(5 * 1024 * 1024))
            .app_data(ready_flag_data.clone())
            .service(health)
            .service(healthz)
            .service(readiness)
            .route(
                "/api/ci/webhook/github",
                aw_web::post().to(|req: HttpRequest, body: aw_web::Bytes| async move { github_webhook(req, body).await }),
            )
    })
        .bind(bind.clone())?
        .keep_alive(Duration::from_secs(75))
        .shutdown_timeout(5)
            .run();

    let srv_handle = server.handle();
    let server_fut = tokio::spawn(server);

    // listen for shutdown signals
    tokio::spawn(async move {
        // wait for ctrl-c or termination
        let _ = tokio::signal::ctrl_c().await;
        info!("shutdown signal received, stopping server");
        srv_handle.stop(true);
    });

    // wait for server to finish
    match server_fut.await {
        Ok(Ok(())) => {
            info!("server exited normally");
            Ok(())
        }
        Ok(Err(e)) => {
            error!(%e, "server error");
            Err(std::io::Error::new(std::io::ErrorKind::Other, format!("server error: {}", e)))
        }
        Err(e) => {
            error!(%e, "server task join error");
            Err(std::io::Error::new(std::io::ErrorKind::Other, format!("join error: {}", e)))
        }
    }
}

async fn init_startup() -> Result<(), String> {
    // Placeholder: perform DB migrations, queue connections, etc.
    // Keep fast in real startup or move long-running tasks to background jobs.
    Ok(())
}
