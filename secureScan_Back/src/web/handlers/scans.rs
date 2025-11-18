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

#[derive(Deserialize)]
pub struct StartScanRequest {
    #[serde(alias = "url", alias = "targetUrl", alias = "target_url")]
    pub target_url: String,
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
    payload: web::Json<StartScanRequest>,
) -> Result<impl Responder, ApiError> {
    let body = payload.into_inner();
    let target_str = body.target_url.trim();

    if target_str.is_empty() {
        return Err(ApiError::BadRequest("target_url is required".into()));
    }

    // Validate URL
    let _ = Url::parse(target_str).map_err(|_| ApiError::BadRequest("invalid target_url".into()))?;

    // Insert into DB
    let row = scans_repo::create_scan(pool.get_ref(), target_str)
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
