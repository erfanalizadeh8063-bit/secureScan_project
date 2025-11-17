#![allow(dead_code)]

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
mod db;


use web::handlers::webhook::github_webhook;
use tracing::{info, error};

#[get("/api/health")]
async fn health() -> HttpResponse {
    HttpResponse::Ok().json(serde_json::json!({"status":"ok"}))
}

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
                Err(_) => Err(actix_web::error::ErrorRequestTimeout("request timeout")),
            }
        })
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    tracing_subscriber::fmt::init();

    let bind = env::var("BIND_ADDR").unwrap_or_else(|_| "0.0.0.0:8080".to_string());

    let allowed_origins = env::var("ALLOWED_ORIGIN")
        .or_else(|_| env::var("FRONT_ORIGIN"))
        .unwrap_or_else(|_| "https://securascan-front-dd57.onrender.com".to_string());

    info!(%bind, %allowed_origins, "Starting server");

    let ready_flag = Arc::new(AtomicBool::new(false));
    let ready_flag_data = aw_web::Data::new(Arc::clone(&ready_flag));

    if let Err(e) = init_startup().await {
        error!(%e, "startup initialization failed");
    } else {
        ready_flag.store(true, Ordering::SeqCst);
        info!("startup complete, marking ready");
    }
    // Initialize database pool and run migrations
    let pool = match db::init_pool().await {
        Ok(p) => p,
        Err(e) => {
            error!(%e, "database initialization failed");
            return Err(std::io::Error::other(format!("db init failed: {}", e)));
        }
    };

    let allowed = allowed_origins.clone();

    let server = HttpServer::new(move || {
        let origins: Vec<&str> = allowed
            .split(',')
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
            .collect();

        let mut cors = Cors::default()
            .allowed_methods(vec!["GET", "POST", "PUT", "DELETE", "OPTIONS"])
            .allowed_headers(vec![header::CONTENT_TYPE, header::AUTHORIZATION])
            .expose_headers(vec![header::CONTENT_TYPE])
            .supports_credentials()
            .max_age(3600);

        for o in origins.iter() {
            cors = cors.allowed_origin(o);
        }

        App::new()
            .wrap(middleware::Logger::default())
            .wrap(TimeoutMiddleware { timeout: Duration::from_secs(10) })
            .wrap(cors)
            .app_data(aw_web::JsonConfig::default().limit(5 * 1024 * 1024))
            .app_data(ready_flag_data.clone())
            .app_data(aw_web::Data::new(pool.clone()))
            .service(health)
            .service(healthz)
            .service(readiness)

            // 🔥 FULL SCAN ENDPOINTS
            .service(web::handlers::scans::mock_scan)
            .service(web::handlers::scans::start_scan)
            .service(web::handlers::scans::list_scans)
            .service(web::handlers::scans::get_scan)

            .route(
                "/api/ci/webhook/github",
                aw_web::post().to(|req: HttpRequest, body: aw_web::Bytes| async move {
                    github_webhook(req, body).await
                }),
            )
    })
    .bind(bind.clone())?
    .keep_alive(Duration::from_secs(75))
    .shutdown_timeout(5)
    .run();

    let srv_handle = server.handle();
    let server_fut = tokio::spawn(server);

    tokio::spawn(async move {
        let _ = tokio::signal::ctrl_c().await;
        info!("shutdown signal received, stopping server");
        let _ = srv_handle.stop(true).await;
    });

    match server_fut.await {
        Ok(Ok(())) => Ok(()),
        Ok(Err(e)) => Err(std::io::Error::other(format!("server error: {}", e))),
        Err(e) => Err(std::io::Error::other(format!("join error: {}", e))),
    }
}

async fn init_startup() -> Result<(), String> {
    Ok(())
}
