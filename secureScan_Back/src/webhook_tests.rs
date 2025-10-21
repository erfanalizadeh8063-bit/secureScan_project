#[cfg(test)]
mod tests {
    use super::super::webhook::verify_signature;
    use actix_web::http::header::HeaderMap;
    use hmac::{Hmac, Mac};
    use sha2::Sha256;
    #[test]
    fn test_verify_signature_ok() {
        std::env::set_var("GITHUB_WEBHOOK_SECRET", "testsecret");
        let body = b"{}"; // small payload

        // compute expected signature
        let mut mac = Hmac::<Sha256>::new_from_slice(b"testsecret").unwrap();
        mac.update(body);
        let sig = hex::encode(mac.finalize().into_bytes());

        let mut headers = HeaderMap::new();
        headers.insert("X-Hub-Signature-256", format!("sha256={}", sig).parse().unwrap());

        assert!(verify_signature(&headers, body).is_ok());
    }

    #[test]
    fn test_verify_signature_mismatch() {
        std::env::set_var("GITHUB_WEBHOOK_SECRET", "testsecret");
        let body = b"{}";

        // compute signature with a different secret
        let mut mac = Hmac::<Sha256>::new_from_slice(b"wrongsecret").unwrap();
        mac.update(body);
        let sig = hex::encode(mac.finalize().into_bytes());

        let mut headers = HeaderMap::new();
        headers.insert("X-Hub-Signature-256", format!("sha256={}", sig).parse().unwrap());

        assert!(verify_signature(&headers, body).is_err());
    }
}
