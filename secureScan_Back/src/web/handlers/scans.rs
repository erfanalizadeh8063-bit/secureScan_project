use actix_web::{get, post, web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use url::Url;

use crate::domain::scan_service::ScanService;
use crate::domain::errors::ApiError;

#[get("/api/scans")]
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

#[post("/api/scans")]
pub async fn start_scan(
    service: web::Data<ScanService>,
    payload: web::Json<StartScanReq>,
) -> Result<impl Responder, ApiError> {
    let url = Url::parse(&payload.target_url)
        .map_err(|_| ApiError::BadRequest("invalid url".into()))?;
    let id = service.enqueue(url)?;
    Ok(HttpResponse::Ok().json(StartScanRes {
        scan_id: id,
        status: "queued".into(),
    }))
}

#[get("/api/scans/{id}")]
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
