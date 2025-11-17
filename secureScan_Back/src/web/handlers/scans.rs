use actix_web::{get, post, web, HttpResponse, Responder};
use serde::Deserialize;
use serde_json::json;
use uuid::Uuid;
use url::Url;

use crate::db::DbPool;
use crate::domain::errors::ApiError;
use crate::domain::scans_repo;

#[get("/api/scans")]
pub async fn list_scans(pool: web::Data<DbPool>) -> Result<impl Responder, ApiError> {
    let items = scans_repo::list_scans(pool.get_ref())
        .await
        .map_err(|e| ApiError::Internal(e.to_string()))?;
    Ok(HttpResponse::Ok().json(items))
}

// New minimal mock endpoints for public Beta
// Accept flexible payloads and return a fixed JSON mock response.

#[allow(dead_code)]
#[derive(Deserialize)]
pub struct UrlReq {
    pub url: Option<String>,
}

#[post("/scan")]
pub async fn mock_scan(payload: web::Json<serde_json::Value>) -> impl Responder {
    let url = payload
        .get("url")
        .and_then(|v| v.as_str())
        .unwrap_or("https://example.com");
    let id = Uuid::new_v4();
    HttpResponse::Ok().json(json!({
        "scan_id": id,
        "status": "mocked",
        "url": url
    }))
}

#[post("/api/scans")]
pub async fn start_scan(
    pool: web::Data<DbPool>,
    payload: web::Json<serde_json::Value>,
) -> Result<impl Responder, ApiError> {
    // Accept either { "target": "..." } or { "target_url": "..." }
    let url_str = payload
        .get("target")
        .and_then(|v| v.as_str())
        .or_else(|| payload.get("target_url").and_then(|v| v.as_str()))
        .unwrap_or("https://example.com");

    // Try to parse to validate; if invalid, return BadRequest
    let _ = Url::parse(url_str).map_err(|_| ApiError::BadRequest("invalid url".into()))?;

    // Insert into DB
    let row = scans_repo::create_scan(pool.get_ref(), url_str)
        .await
        .map_err(|e| ApiError::Internal(e.to_string()))?;

    Ok(HttpResponse::Ok().json(json!({
        "scan_id": row.id,
        "status": row.status,
        "url": row.url
    })))
}

#[get("/api/scans/{id}")]
pub async fn get_scan(
    pool: web::Data<DbPool>,
    path: web::Path<Uuid>,
) -> Result<impl Responder, ApiError> {
    let id = path.into_inner();
    let rec = scans_repo::get_scan(pool.get_ref(), id)
        .await
        .map_err(|e| ApiError::Internal(e.to_string()))?;

    if let Some(r) = rec {
        Ok(HttpResponse::Ok().json(r))
    } else {
        Err(ApiError::NotFound("scan not found".into()))
    }
}
