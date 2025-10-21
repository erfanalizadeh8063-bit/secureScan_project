use actix_web::{http::header, HttpRequest, HttpResponse};
use actix_web::web::Bytes;
use hmac::{Hmac, Mac};
use sha2::Sha256;
use uuid::Uuid;
use hex::decode as hex_decode;
use subtle::ConstantTimeEq;
use std::env;

type HmacSha256 = Hmac<Sha256>;

/// POST /api/ci/webhook/github
/// Verifies X-Hub-Signature-256 header against raw body using GITHUB_WEBHOOK_SECRET
pub async fn github_webhook(req: HttpRequest, body: Bytes) -> HttpResponse {
    // Extract signature header
    let sig_hdr = match req.headers().get("X-Hub-Signature-256") {
        Some(v) => match v.to_str() {
            Ok(s) => s.to_string(),
            Err(_) => return HttpResponse::Unauthorized().finish(),
        },
        None => return HttpResponse::Unauthorized().finish(),
    };

    // Expected format: sha256=<hex>
    let parts: Vec<&str> = sig_hdr.splitn(2, '=').collect();
    if parts.len() != 2 || parts[0] != "sha256" {
        return HttpResponse::Unauthorized().finish();
    }
    let signature_hex = parts[1];
    let signature_bytes = match hex_decode(signature_hex) {
        Ok(b) => b,
        Err(_) => return HttpResponse::Unauthorized().finish(),
    };

    // Get secret
    let secret = match env::var("GITHUB_WEBHOOK_SECRET") {
        Ok(s) => s.into_bytes(),
        Err(_) => return HttpResponse::InternalServerError().body("webhook secret not configured"),
    };

    // Compute HMAC
    let mut mac = HmacSha256::new_from_slice(&secret).expect("HMAC can take key of any size");
    mac.update(&body);
    let result = mac.finalize();
    let computed = result.into_bytes();

    // Constant time compare
    if computed.len() != signature_bytes.len() || computed.ct_eq(&signature_bytes).unwrap_u8() != 1u8 {
        return HttpResponse::Unauthorized().finish();
    }

    // At this point verification passed. Create job id and return.
    let job_id = Uuid::new_v4();
    HttpResponse::Ok().json(serde_json::json!({"job_id": job_id.to_string()}))
}
