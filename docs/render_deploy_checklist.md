Render deployment checklist — secureScan

Pre-conditions
- You have Render access to the frontend & backend services.
- You know the production backend origin (e.g. https://securascan-back-dd57.onrender.com).

Steps

1) Set build-time env for frontend
   - Key: `VITE_API_BASE`
   - Value: the production backend URL, e.g. `https://securascan-back-dd57.onrender.com`
   - Where: Frontend service → Environment → Build Command / Build Environment
   - Why: Vite injects `import.meta.env.VITE_API_BASE` at build time; runtime substitution is not possible for code baked into bundles.

2) Set runtime env for frontend (optional but recommended)
   - Key: `BACKEND_ORIGIN`
   - Value: same backend origin (used by `nginx` template for CSP connect-src)
   - Where: Frontend service → Env Vars (runtime)

3) Set runtime env for backend
   - Key: `ALLOWED_ORIGIN` or `FRONT_ORIGIN`
   - Value: production frontend origin (e.g. https://securascan-front-dd57.onrender.com)
   - Why: backend Actix CORS reads `ALLOWED_ORIGIN` / `FRONT_ORIGIN` to permit requests only from this origin

4) Clear build cache / previous artifacts
   - In Render: find the frontend service → Advanced → Clear Build Cache (or similar)
   - Why: ensures the new build uses the fresh env and doesn't serve old cached assets that lack `VITE_API_BASE`.

5) Deploy
   - Trigger a new deploy (manual deploy or push to branch that triggers Render)
   - Wait for the deploy to complete; note build logs for any errors

6) Post-deploy smoke checks
   - Run locally (PowerShell):

```powershell
# from repo root on Windows
powershell -NoProfile -ExecutionPolicy Bypass -Command "& '.\\scripts\\check_render_assets.ps1'"
```

   - Or run the included frontend smoke script (if present):

```bash
# from repo root on Unix-like shells
cd secureScan_Front
./smoke.sh https://securascan-front-dd57.onrender.com https://securascan-back-dd57.onrender.com
```

Expected outputs
- Front HEAD 200
- Back /healthz 200
- OPTIONS CORS returns Access-Control-Allow-Origin matching the frontend origin and Access-Control-Allow-Methods includes GET/POST/OPTIONS
- One or more frontend JS bundles contain the BACKEND URL (indicating `VITE_API_BASE` was injected at build time)

Common failures & fixes
- Front HEAD ≠ 200
  - Cause: service failed to start or served cached maintenance page
  - Fix: check Render service logs, redeploy, and ensure correct build command & static file path (root is /usr/share/nginx/html in the Dockerfile)

- Bundle does not contain BACKEND URL
  - Cause: build-time env `VITE_API_BASE` not set or build cache served an older artifact
  - Fix: set `VITE_API_BASE` in Render build env, clear build cache, redeploy

- OPTIONS CORS NG
  - Cause: backend `ALLOWED_ORIGIN` / `FRONT_ORIGIN` not set or mismatched
  - Fix: set `ALLOWED_ORIGIN` to the exact frontend origin (including scheme and host), redeploy backend

- Backend /healthz ≠ 200
  - Cause: backend crash, DB migration failed, missing envs
  - Fix: check backend logs, ensure migrations ran, check DB / dependencies, restart

Notes
- Use exact origins (include https:// and any custom port if applicable) for CORS and CSP.
- For reproducibility, prefer adding these steps to your deployment runbook and requiring the `bundle-check` GitHub Action to run on the default branch before release.
