## Summary
- Small clippy / lint fixes (non-functional).
- Added .env.production (VITE_API_BASE) + runtime env writers to support both build-time bake and runtime inject.
- CI/workflows: CodeQL v3 confirmed; Trivy SARIF upload uses github/codeql-action/upload-sarif@v3.
- Replaced legacy VITE_API_URL references with VITE_API_BASE in docs/templates.

## Local Verification
- Backend: `cargo build --release` OK; `GET /healthz` returns 200.
- Frontend: dev server OK; production build pending (Windows EPERM fixed via clean install or Docker path).
- Environment: VITE_API_BASE is the canonical key for frontend → backend linkage.

## Render Deploy Checklist
- Frontend: set `VITE_API_BASE=https://<BACK-URL>`, Clear build cache → Redeploy.
- Backend: set `FRONT_ORIGIN=https://<FRONT-URL>`, Redeploy → `/healthz` = 200.

## Follow-ups
- Add minimal unit tests post-beta.
- Revisit suppressed dead_code after beta.
