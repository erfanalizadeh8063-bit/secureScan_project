use actix_web::{get, HttpResponse, Responder};

#[get("/api/health")]
pub async fn health() -> impl Responder {
    HttpResponse::Ok().json(serde_json::json!({
        "status": "ok"
    }))
}
