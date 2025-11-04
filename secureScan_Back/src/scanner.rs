use anyhow::{Context, Result};
use reqwest::Client;
use scraper::{Html, Selector};
use std::collections::HashMap;

/// Represents the result of a website scan.
#[derive(Debug, serde::Serialize, Clone)]
pub struct ScanResult {
    pub url: String,
    pub status: u16,
    pub headers: HashMap<String, String>,
    pub security_findings: Vec<String>,
}

/// Performs a simple HTTP request and analyzes basic security aspects.
pub async fn scan_target(target: &str) -> Result<ScanResult> {
    let url = normalize_target(target);

    let timeout_ms: u64 = std::env::var("HTTP_TIMEOUT_MS")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(10_000);

    let client = Client::builder()
        .user_agent("SecureScan/0.1 (+https://securascan.local)")
        .timeout(std::time::Duration::from_millis(timeout_ms))
        .redirect(reqwest::redirect::Policy::limited(5))
        .build()
        .context("building reqwest client")?;

    let resp = client
        .get(&url)
        .send()
        .await
        .with_context(|| format!("request failed to {}", url))?;

    let status = resp.status().as_u16();
    let headers = resp
        .headers()
        .iter()
        // normalize header names to lowercase so lookups are reliable
        .map(|(k, v)| (k.as_str().to_lowercase(), v.to_str().unwrap_or("").to_string()))
        .collect::<HashMap<_, _>>();

    let body = resp.text().await.unwrap_or_default();
    let mut findings = analyze_html(&url, &body, &headers);

    if !(200..=399).contains(&status) {
        findings.push(format!("Non-OK HTTP status: {}", status));
    }

    if !url.to_lowercase().starts_with("https://") {
        findings.push("Target is not using HTTPS (heuristic)".to_string());
    }

    Ok(ScanResult {
        url,
        status,
        headers,
        security_findings: findings,
    })
}

/// Ensure the target has a scheme; default to https:// when missing.
fn normalize_target(t: &str) -> String {
    let t = t.trim();
    if t.starts_with("http://") || t.starts_with("https://") {
        t.to_string()
    } else {
        format!("https://{}", t)
    }
}

/// Analyzes HTML and HTTP headers for common security findings.
fn analyze_html(_url: &str, body: &str, headers: &HashMap<String, String>) -> Vec<String> {
    let mut findings = Vec::new();

    let security_headers = [
        "content-security-policy",
        "x-frame-options",
        "x-xss-protection",
        "strict-transport-security",
        "x-content-type-options",
        "referrer-policy",
    ];
    for h in &security_headers {
        if !headers.contains_key(&h.to_string()) {
            findings.push(format!("Missing header: {}", h));
        }
    }

    let document = Html::parse_document(body);
    let form_selector = Selector::parse("form").unwrap();
    let forms_count = document.select(&form_selector).count();
    if forms_count > 0 {
        findings.push(format!("Found {} HTML form(s).", forms_count));
    }

    let meta_selector = Selector::parse("meta[name]").unwrap();
    for meta in document.select(&meta_selector) {
        if let Some(name) = meta.value().attr("name") {
            if name.to_lowercase().contains("generator") {
                if let Some(content) = meta.value().attr("content") {
                    findings.push(format!("Technology info: {}", content));
                }
            }
        }
    }

    findings
}
