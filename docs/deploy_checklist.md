# Deploy checklist — Render + GitHub Actions

This checklist documents the manual steps to configure Render and GitHub to deploy SecuraScan using the provided blueprint and CI/CD workflows.

1) Create services on Render
   - Import `render.yaml` in the Render dashboard or create services manually.
     - Service 1 (Docker web): `securascan-back` — Dockerfile: `secureScan_Back/Dockerfile.backend`, health check path `/healthz`.
     - Service 2 (Static site): `securascan-front` — build command: `cd secureScan_Front && npm ci && npm run build`, publish path: `secureScan_Front/dist`.

2) Add GitHub repository secrets
   - `RENDER_API_KEY` — API key with deploy permissions.
   - `RENDER_BACK_SERVICE_ID` — service ID for `securascan-back` (from Render dashboard).
   - `RENDER_FRONT_SERVICE_ID` — service ID for `securascan-front` (from Render dashboard).

3) Validate CI build
   - Push a branch or open a PR. The workflow `.github/workflows/build.yml` will run build jobs for Rust and frontend.

4) Trigger deploy
   - From Actions, run `Deploy → Render` (workflow_dispatch) or push to `main`.

5) After first deploy
   - The workflow will attempt to set `VITE_API_URL` on the frontend to the backend public URL and trigger a frontend deploy (clear cache).
   - It then sets `FRONT_ORIGIN` on the backend to the frontend URL and triggers a backend deploy.

6) Verification
   - Backend: curl <BACKEND_URL>/healthz should return HTTP 200 and JSON {"status":"ok"}.
   - Frontend: visiting the frontend URL should return 200 (or 304) and serve static assets.

7) Notes
   - Do not store Render API keys in the repo. Use GitHub Secrets.
   - If URLs are not available via Render API responses, you can paste them manually into the GitHub Secrets and re-run the workflow.
# SecuraScan Render Deploy Checklist

This document lists the Render deployment configuration and post-deploy verification steps.

## Services (Render)
- Backend (web, Docker)
  - dockerfilePath: `./secureScan_Back/Dockerfile.backend`
  - dockerContext: `./secureScan_Back`
  - healthCheckPath: `/healthz`
  - autoDeploy: `true`
  - required env (recommended): `RUST_LOG=info`

- Frontend (static site)
  - buildCommand: `cd secureScan_Front && npm ci && npm run build`
  - staticPublishPath: `secureScan_Front/dist`
  - autoDeploy: `true`

## Post-deploy environment variables (set after both services are live)
1. Backend (Render web service):
   - `FRONT_ORIGIN` = `https://<your-static-site-url>`
     - Purpose: restrict CORS to the static site's origin.
2. Frontend (Render static site environment):
   - `VITE_API_URL` = `https://<your-backend-url>`
     - Note: Vite inlines env variables at build time. After setting `VITE_API_URL`, "Clear build cache & Redeploy" the static site so the new value is baked into the built assets.

## Final verification steps (after envs are set and redeploy complete)
1. Open the static site URL in a browser: `https://<your-static-site-url>`
2. In DevTools → Network, check the API requests go to `https://<your-backend-url>` and return 200 (no CORS errors).
3. Hit the backend health endpoint:
   - `curl -i https://<your-backend-url>/healthz` (expect HTTP/1.1 200 OK)

## Quick commands (copy/paste)
```bash
# verify backend is healthy
curl -i https://<your-backend-url>/healthz

# verify static site is serving
curl -I https://<your-static-site-url>
```

If anything fails, collect logs from Render (service dashboard) and check the build logs for the static site to confirm `VITE_API_URL` was set during build.

## Quick smoke guide — Frontend on Render (Docker Web)

- In Render → select the frontend service `securascan-front` → Environment (tab): set
   `VITE_API_URL=https://<your-backend-url>`
- Trigger a deploy (or Clear build cache & Redeploy) so the Vite build picks up `VITE_API_URL` at build time.
- Verify root `/` returns HTTP 200 (or 304). If you see 502, check the service logs and ensure the container is binding to the port provided by Render (Render exposes $PORT to the container). The Dockerfile uses `serve -s dist -l ${PORT}` which binds to the provided port.
