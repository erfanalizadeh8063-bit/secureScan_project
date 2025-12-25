# Daily review - {{DATE}}

- Done:

- Next:

- Risks:

- Notes:

## Dev Smoke (local)
- [ ] docker compose --profile dev ps
- [ ] GET http://localhost:7001/healthz
- [ ] GET http://localhost:7001/api/health
- [ ] GET http://localhost:7001/api/scans
- [ ] POST http://localhost:7001/api/scans {"url":"https://example.com"}
- [ ] GET http://localhost:7001/api/scans (after POST)
- [ ] Frontend http://localhost:5173 (HTTP 200)
- [ ] Env VITE_API_BASE is http://localhost:7001

### Smoke Report (paste)
```text
(paste report here)
