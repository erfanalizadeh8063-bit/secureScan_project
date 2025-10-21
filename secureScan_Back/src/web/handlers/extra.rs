use actix_web::{post, get, web, HttpResponse, Responder};
use serde::Deserialize;
use serde_json::json;

#[derive(Deserialize)]
pub struct FixSuggestReq {
    pub code: String,
}

#[post("/fix/suggest")]
pub async fn suggest_fix(payload: web::Json<FixSuggestReq>) -> impl Responder {
    // minimal stub: echo back a trivial suggestion
    let suggestion = format!("Suggested fix for code snippet ({} chars)", payload.code.len());
    HttpResponse::Ok().json(json!({"suggestion": suggestion}))
}

#[post("/ci/webhook/github")]
pub async fn github_ci_webhook(body: web::Bytes) -> impl Responder {
    // accept raw webhook payload, in real use validate signature
    tracing::info!(target = "ci", len = body.len(), "received github webhook");
    HttpResponse::Ok().json(json!({"status": "received"}))
}

#[get("/badge/{project_id}")]
pub async fn badge(project_id: web::Path<String>) -> impl Responder {
    let id = project_id.into_inner();
    // return a tiny SVG badge placeholder
    let svg = format!(r##"<svg xmlns="http://www.w3.org/2000/svg" width="90" height="20"><rect width="90" height="20" fill="#555"/><text x="45" y="14" fill="#fff" font-size="11" text-anchor="middle">{}</text></svg>"##, id);
    HttpResponse::Ok().content_type("image/svg+xml").body(svg)
}

pub fn config_extra(cfg: &mut web::ServiceConfig) {
    cfg.service(suggest_fix);
    cfg.service(github_ci_webhook);
    cfg.service(badge);
}
