use actix_web::{get, App, HttpResponse, HttpServer};
use std::env;

#[get("/api/health")]
async fn health() -> HttpResponse {
    HttpResponse::Ok().json(serde_json::json!({"status":"ok"}))
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
   
    let bind = env::var("BIND_ADDR").unwrap_or_else(|_| "0.0.0.0:8080".to_string());
    println!("Starting server on {bind}");

    HttpServer::new(|| App::new().service(health))
        .bind(bind)?
        .run()
        .await
}
