
# SecuraScan Backend (Rust + Actix-web) — MVP Starter

A minimal, production-minded skeleton to power the SecuraScan UI.

## Features (MVP)
- Actix-web HTTP API
- CORS for local frontend dev
- In-memory queue + worker (Tokio) for scan jobs
- Endpoints:
  - `GET /api/health`
  - `POST /api/scans` { target_url } → { scan_id, status }
  - `GET /api/scans/{id}` → { id, target_url, status, findings }

> Scanner is simulated for now (adds a sample "missing CSP" finding). Replace with real logic later.

## Run
```bash
# 1) Create .env (or copy defaults)
cp .env.example .env

# 2) Start server
cargo run
```

Server listens on `BIND_ADDR` (default `0.0.0.0:8080`). Frontend origin allowed via `ALLOWED_ORIGINS`.

## Frontend Integration
From your React/Vite app:
```ts
// start scan
const res = await fetch("http://localhost:8080/api/scans", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ target_url: "https://example.com" }),
});
const { scan_id } = await res.json();

// poll status
const st = await fetch("http://localhost:8080/api/scans/" + scan_id).then(r => r.json());
```

## Next Steps
- Replace simulated scanner with real checks (headers/TLS/crawl/forms)
- Persist scans in DB (PostgreSQL + sqlx)
- Add WebSocket for live logs
- Auth (JWT), rate limiting, input validation, timeouts
