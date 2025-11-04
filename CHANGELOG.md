# Changelog

## v0.9.0-beta — 2025-11-02

Summary: beta release focused on frontend build-safety, runtime hardening (nginx + security headers), backend CORS and request limits, CI guard rails and container scanning.

### Features
- Enforce build-time API base: frontend no longer falls back to a dev URL — `VITE_API_BASE` is required at build time to avoid baking dev endpoints into production bundles.
- Frontend now built in a multi-stage Dockerfile and served by an nginx runtime (listens on `$PORT`) with SPA fallback and gzip compression.

### Fixes
- Remove accidental dev fallback in `secureScan_Front/src/lib/api.ts` and ensure the production build uses the provided `VITE_API_BASE`.
- Improved CORS handling to avoid permissive defaults and ensure predictable origin behaviour.

### Security
- Nginx runtime includes security headers: HSTS, tightened Content-Security-Policy (connect-src restricted to backend), X-Frame-Options, X-Content-Type-Options, Referrer-Policy.
- Backend hardened: CORS restricted to production frontend origin, limited allowed methods (GET/POST/OPTIONS), credentials disabled, and JSON request body limit reduced to 5 MB.
- Added container image scanning workflow (Trivy) to fail builds when HIGH or CRITICAL CVEs are detected and upload SARIF results to code scanning.

### CI improvements
- `bundle-check` workflow added: builds frontend with a production API base, verifies the backend URL is present in the built `dist`, runs on Node 18 & 20, uses caching, and uploads `dist` as an artifact on failure.
- Trivy workflow added to build images, scan them, and upload SARIF + scan artifacts.

### TODO
- Tune rules/ignores for Trivy findings and pin the Trivy image to a specific version to ensure reproducible scans.

---

For full details and references see the release notes in `docs/release_notes/v0.9.0-beta.md` and the PR on branch `chore/frontend-nginx-port`.
