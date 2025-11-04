PR: chore/frontend-nginx-port

Summary

This PR enforces build-time API base injection for the frontend (VITE_API_BASE), updates the frontend Dockerfile and nginx runtime configuration to support runtime env substitution and security headers, hardens backend CORS and JSON limits, and adds CI guardrails and smoke checks.

Smoke results (pre-deploy / live check)

- Frontend HEAD: 200
- Backend /healthz: 200
- OPTIONS CORS: OK (Access-Control-Allow-Origin: https://securascan-front-dd57.onrender.com)
- Bundle contains BACK_URL: ✅ (one or more JS bundles include the backend URL)

Deploy on Render + post-deploy smoke

- [ ] Set build-time env `VITE_API_BASE` to the production backend URL (e.g. https://securascan-back-dd57.onrender.com)
- [ ] Clear frontend build cache on Render
- [ ] Deploy frontend
- [ ] Run `scripts/check_render_assets.ps1` or `secureScan_Front/smoke.sh` against the deployed endpoints
- [ ] Confirm Front HEAD 200, Back /healthz 200, OPTIONS CORS OK, and bundle contains BACK_URL

Notes

- CSP: quoted `${BACKEND_ORIGIN}` in `nginx/default.conf.template` to avoid parsing issues when envsubst inserts the origin.
- Backend: CORS is limited to the configured frontend origin and methods GET/POST/OPTIONS; JSON payloads are limited to 5MB.

Please review the security headers and CI changes. If approved, merge using squash and deploy to Render as described above.