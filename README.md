# SecuraScan — Dev Quickstart

## Prerequisites
- Rust/Cargo (>=1.90)
- Node (>=18) + npm
- Docker (optional)

## Envs
Copy this to `.env` or pass through docker-compose:

```env
# Example .env entries
# BIND_ADDR=127.0.0.1:8080
# ALLOWED_ORIGINS=http://localhost:3000
# SCAN_MAX_CONCURRENCY=4
# SCAN_QUEUE_BUFFER=128
# DATABASE_URL=postgres://user:pass@localhost:5432/securascan
```

## Quickstart (backend)
1. cd secureScan_Back
2. cargo check
3. cargo run

## Quickstart (frontend)
1. cd secureScan_Front
2. npm ci
3. npm run dev -- --host

## Notes
- Use Docker / docker-compose for a reproducible environment if desired.
- Do not commit real secrets; keep `.env` in `.gitignore`.

## Deploy on Render (Blueprint)

This repository includes a Render blueprint (`render.yaml`) and GitHub Actions workflows to build and deploy the backend (Docker) and the frontend (Static site).

Quick instructions:

1. Create two services on Render using `render.yaml` (you can import the blueprint in the Render UI):
	- `securascan-back` (type: web, env: docker) — uses `secureScan_Back/Dockerfile.backend` and exposes `/healthz`.
	- `securascan-front` (type: static_site) — build command runs in `secureScan_Front` and publishes `secureScan_Front/dist`.

2. In the GitHub repository Settings → Secrets, add these repo secrets:
	- `RENDER_API_KEY` — Render API key with deploy permissions.
	- `RENDER_BACK_SERVICE_ID` — Service ID for `securascan-back` on Render.
	- `RENDER_FRONT_SERVICE_ID` — Service ID for `securascan-front` on Render.

3. Trigger the workflow `Deploy → Render` from Actions or push to `main`.

What the workflow does:
- Builds backend and frontend locally in CI (via `.github/workflows/build.yml`).
- On deploy (`.github/workflows/deploy-render.yml`) it queries Render for service URLs, sets `VITE_API_URL` for the frontend, triggers frontend redeploy, then sets `FRONT_ORIGIN` for backend and triggers backend redeploy. It waits for backend `/healthz` and frontend root to return healthy responses.

Notes & troubleshooting:
- Do not hard-code secrets in this repo. Add them as GitHub repo secrets as described above.
- The Render API calls used in the workflow are idempotent — re-running the workflow is safe.
## Windows ports note

On some Windows hosts, the OS reserves ranges of TCP ports which prevents Docker from publishing container ports on those host ports. If you see failures binding ports like 8080, 8180 or other ports in the 8000–8500 range, this is likely due to Windows "excluded port ranges" (for example, caused by services such as Internet Connection Sharing or driver reservations).

Workaround: use a host port outside the excluded ranges. In this repository the Compose override maps the backend to host port 7000 (published as `7000:8080`) which is known to work on most Windows systems.

If you need to use a specific host port inside an excluded range, you'll need to free the port reservation on your machine (requires administrative privileges). Example commands to inspect reservations:

```
netsh int ipv4 show excludedportrange protocol=tcp
netsh http show sslcert
```

Stopping or disabling the service that created the reservation (or rebooting after change) may be required.

Note: On Windows, ports like 8080 may fall into excluded ranges and fail to bind. To avoid this locally, use the override mapping in `docker-compose.override.yml` which maps the backend to `7000:8080`.

Quick test commands (Windows cmd):

```bat
REM Start the stack (recreate to pick up overrides)
docker compose up -d --force-recreate

REM Confirm service list
docker compose ps

REM Check backend health from host
curl.exe http://localhost:7000/api/health

REM Inspect frontend files inside the container
docker compose exec frontend sh -lc "ls -1 /usr/share/nginx/html | head -5"
```

