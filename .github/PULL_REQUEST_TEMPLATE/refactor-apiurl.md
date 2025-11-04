Summary
=======

This PR refactors frontend backend calls to use the centralized `apiUrl()` helper and adds a small smoke test for Render.

What changed
------------
- All frontend backend requests are routed through the `apiUrl` helper (via the shared `Api` client in `src/lib/api.ts`).
- Introduced `scripts/smoke_render.sh` to verify `/healthz` on both services.
- Added `docs/smoke_render.md` with usage instructions.

How to test locally
-------------------
1. Build both images locally (example):

```bash
docker build -f secureScan_Back/Dockerfile.backend secureScan_Back --tag sec-back-test
docker build -f secureScan_Front/Dockerfile.frontend secureScan_Front --build-arg VITE_API_BASE=https://example.com --tag sec-front-test
```

2. Run frontend (map host port 3000 to container 10000):

```bash
docker run -p 3000:10000 sec-front-test
curl -I http://localhost:3000/healthz
```

How to deploy on Render
-----------------------
1. In Render → Frontend service → Environment: set `VITE_API_BASE=https://<your-backend-url>` (build-time env).
2. Trigger deploy (Clear build cache & Redeploy after changing `VITE_API_BASE`).
3. Run the smoke script:

```bash
FRONT_URL=https://<front>.onrender.com BACK_URL=https://<back>.onrender.com bash scripts/smoke_render.sh
```

Risks and rollback
------------------
- If the frontend build fails due to TypeScript/type mismatches, revert the frontend changes and rebuild. The smoke script will fail fast and show which service failed.
