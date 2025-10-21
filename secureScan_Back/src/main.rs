use actix_web::{get, App, HttpRequest, HttpResponse, HttpServer};
use actix_web::web as aw_web;
use std::env;
mod web;
mod domain;
mod jobs;
mod scanner;
use web::handlers::webhook::github_webhook;

#[get("/api/health")]
async fn health() -> HttpResponse {
    HttpResponse::Ok().json(serde_json::json!({"status":"ok"}))
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
   
    let bind = env::var("BIND_ADDR").unwrap_or_else(|_| "0.0.0.0:8080".to_string());
    println!("Starting server on {bind}");

    HttpServer::new(|| {
        App::new()
            .service(health)
            .route(
                "/api/ci/webhook/github",
                aw_web::post().to(|req: HttpRequest, body: aw_web::Bytes| async move { github_webhook(req, body).await }),
            )
    })
        .bind(bind)?
        .run()
        .await
}
