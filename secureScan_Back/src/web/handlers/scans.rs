use actix_web::{get, post, web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use url::Url;

use crate::domain::scan_service::ScanService;
use crate::domain::errors::ApiError;

#[get("")]
pub async fn list_scans(service: web::Data<ScanService>) -> Result<impl Responder, ApiError> {
    let items = service.list();
    Ok(HttpResponse::Ok().json(items))
}

#[derive(Deserialize)]
pub struct StartScanReq {
    pub target_url: String,
}

#[derive(Serialize)]
pub struct StartScanRes {
    pub scan_id: Uuid,
    pub status: String,
}

#[post("")]
pub async fn start_scan(
    service: web::Data<ScanService>,
    payload: web::Json<StartScanReq>,
) -> Result<impl Responder, ApiError> {
    let url = Url::parse(&payload.target_url)
        .map_err(|_| ApiError::BadRequest("invalid url".into()))?;
    let id = service.enqueue(url)?;
    // structured log when enqueuing
    tracing::info!(target = "scans", scan_id = %id, url = %payload.target_url, "enqueued scan");

    Ok(HttpResponse::Accepted().json(StartScanRes {
        scan_id: id,
        status: "queued".into(),
    }))
}

#[get("/{id}")]
pub async fn get_scan(
    service: web::Data<ScanService>,
    path: web::Path<Uuid>,
) -> Result<impl Responder, ApiError> {
    let id = path.into_inner();
    if let Some(rec) = service.get(id) {
        Ok(HttpResponse::Ok().json(rec))
    } else {
        Err(ApiError::NotFound("scan not found".into()))
    }
}

/// Configure routes under `/api` scope. This registers:
/// - POST /api/scans => start_scan
/// - GET  /api/scans/{id} => get_scan
pub fn config(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/scans")
            .service(start_scan)
            .service(list_scans)
            .service(get_scan),
    );

    tracing::info!(target = "scans", "routes: POST /api/scans, GET /api/scans/{{id}}");
}
