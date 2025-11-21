use actix_web::{get, post, web, HttpResponse, Responder};
use serde::Deserialize;
use serde_json::json;
use uuid::Uuid;
use url::Url;

use crate::db::DbPool;
use crate::jobs::queue::{ScanJob, ScanQueue};
use crate::domain::errors::ApiError;
use crate::domain::scans_repo;

#[get("/api/scans")]
pub async fn list_scans(pool: web::Data<DbPool>) -> Result<impl Responder, ApiError> {
    let items = scans_repo::list_scans(pool.get_ref())
        .await
        .map_err(|e| ApiError::Internal(e.to_string()))?;
    Ok(HttpResponse::Ok().json(items))
}

// Minimal mock endpoint for early public Beta.
// Accepts flexible JSON payloads and returns a fixed mock response.
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
    queue: web::Data<ScanQueue>,
    body: String,
) -> Result<impl Responder, ApiError> {
    // Log raw request body for debugging.
    tracing::info!("start_scan raw body: {:?}", body);

    let trimmed = body.trim();
    let mut target_opt: Option<String> = None;

    // 1) If body looks like JSON (starts with '{'), try to parse JSON first.
    if trimmed.starts_with('{') {
        match serde_json::from_str::<serde_json::Value>(trimmed) {
            Ok(value) => {
                if let Some(s) = value
                    .get("target_url")
                    .or_else(|| value.get("targetUrl"))
                    .or_else(|| value.get("url"))
                    .and_then(|v| v.as_str())
                {
                    target_opt = Some(s.to_string());
                }
            }
            Err(e) => {
                // Invalid JSON: log and continue to fallback parsing.
                tracing::warn!("start_scan json parse error: {}", e);
            }
        }
    }

    // 2) If we still do not have a target, try to extract the first URL substring.
    if target_opt.is_none() {
        if let Some(idx) = trimmed.find("http://").or_else(|| trimmed.find("https://")) {
            let rest = &trimmed[idx..];
            let end = rest
                .find(|c: char| c.is_whitespace() || c == '"' || c == '\'' || c == '}' )
                .unwrap_or(rest.len());
            let url_candidate = &rest[..end];
            target_opt = Some(url_candidate.to_string());
        }
    }

    // If we still cannot find any URL, return BadRequest.
    let target = target_opt.ok_or_else(|| {
        ApiError::BadRequest("could not parse target url from request body".into())
    })?;

    let target_str = target.trim();
    if target_str.is_empty() {
        return Err(ApiError::BadRequest("target_url is empty".into()));
    }

    // Validate target URL syntax.
    Url::parse(target_str)
        .map_err(|_| ApiError::BadRequest("invalid target_url".into()))?;

    // Insert into DB (status starts as 'queued').
    let row = scans_repo::create_scan(pool.get_ref(), target_str)
        .await
        .map_err(|e| ApiError::Internal(e.to_string()))?;

    // Enqueue background worker job (non-blocking). If enqueue fails, log but still return success.
    match Url::parse(&row.url) {
        Ok(parsed) => {
            let job = ScanJob { id: row.id, target: parsed };
            // Fire-and-forget enqueue; if it errors, convert to ApiError::Internal
            if let Err(e) = queue.enqueue(job).await {
                tracing::error!("failed to enqueue scan job {}: {}", row.id, e);
            }
        }
        Err(e) => {
            tracing::error!("created scan row but url parse failed {}: {}", row.url, e);
        }
    }

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

    // First fetch the scan row from `scans` table.
    let scan_row = scans_repo::get_scan(pool.get_ref(), id)
        .await
        .map_err(|e| ApiError::Internal(e.to_string()))?;

    if let Some(scan) = scan_row {
        // Then fetch the latest scan_result (if any) from `scan_results` table.
        let latest_result = scans_repo::get_latest_scan_result(pool.get_ref(), scan.id)
            .await
            .map_err(|e| ApiError::Internal(e.to_string()))?;

        // If we have a result, include extra fields in the response.
        let body = if let Some(res) = latest_result {
            json!({
                "id": scan.id,
                "url": scan.url,
                "status": scan.status,
                "created_at": scan.created_at,
                "headers": res.headers,
                "ssl_grade": res.ssl_grade,
                "findings": res.issues.unwrap_or_else(|| json!([])),
                "completed_at": res.completed_at,
            })
        } else {
            // If there is no result yet, return scan with empty findings and null extras.
            json!({
                "id": scan.id,
                "url": scan.url,
                "status": scan.status,
                "created_at": scan.created_at,
                "headers": null,
                "ssl_grade": null,
                "findings": [],
                "completed_at": null,
            })
        };

        Ok(HttpResponse::Ok().json(body))
    } else {
        Err(ApiError::NotFound("scan not found".into()))
    }
}
