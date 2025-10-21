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
