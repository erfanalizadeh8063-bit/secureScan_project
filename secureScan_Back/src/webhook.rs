use actix_web::{http::header::HeaderMap, web, HttpRequest, HttpResponse, Responder};
use hmac::{Hmac, Mac};
use sha2::Sha256;
use hex::FromHex;
use subtle::ConstantTimeEq;
use serde::Deserialize;

type HmacSha256 = Hmac<Sha256>;

pub fn verify_signature(headers: &HeaderMap, body: &[u8]) -> Result<(), ()> {
    let secret = std::env::var("GITHUB_WEBHOOK_SECRET").map_err(|_| ())?;
    let sig_hdr = headers.get("X-Hub-Signature-256").ok_or(())?.to_str().map_err(|_| ())?;
    // expected format: sha256=<hex>
    let parts: Vec<&str> = sig_hdr.splitn(2, '=').collect();
    if parts.len() != 2 || parts[0] != "sha256" {
        return Err(());
    }
    let sig_bytes = Vec::from_hex(parts[1]).map_err(|_| ())?;

    let mut mac = HmacSha256::new_from_slice(secret.as_bytes()).map_err(|_| ())?;
    mac.update(body);
    let expected = mac.finalize().into_bytes();

    if expected.as_slice().ct_eq(&sig_bytes).unwrap_u8() == 1 {
        Ok(())
    } else {
        Err(())
    }
}

#[derive(Deserialize)]
struct GitHubPayload {
    repo: Option<String>,
    pr: Option<u64>,
    commit: Option<String>,
}

pub async fn github_webhook(req: HttpRequest, body: web::Bytes) -> impl Responder {
    if verify_signature(req.headers(), &body).is_err() {
        return HttpResponse::Unauthorized().finish();
    }

    let payload: GitHubPayload = match serde_json::from_slice(&body) {
        Ok(p) => p,
        Err(_) => return HttpResponse::BadRequest().finish(),
    };

    // create a minimal job id
    let job_id = uuid::Uuid::new_v4().to_string();
    tracing::info!(target = "ci", repo = ?payload.repo, pr = ?payload.pr, commit = ?payload.commit, job = %job_id, "accepted webhook and queued job");

    HttpResponse::Ok().json(serde_json::json!({"job_id": job_id}))
}
