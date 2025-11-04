## Windows PowerShell — Local smoke test

### 1) Run backend (expects image 'sec-back-test' already built)
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows\run_backend.ps1 -Port 8080
# In another terminal, verify:
curl -i http://localhost:8080/healthz
```

### 2) Run frontend (expects image 'sec-front-test' already built)
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows\run_frontend.ps1 -Port 3000 -ContainerPort 10000
# In another terminal, verify static ping (if present):
curl -i http://localhost:3000/__ping.txt
```

### 3) Run the smoke check (convenience)
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows\smoke_local.ps1 -Backend "http://localhost:8080" -Frontend "http://localhost:3000"
```

Notes:
- The smoke script checks backend `/healthz` and, if present, frontend `/__ping.txt` (a static file). The SPA route `/healthz` requires a browser because it executes JavaScript.
- Ensure Docker images `sec-back-test` and `sec-front-test` exist (build tags used locally during development). You can build them with the project's Dockerfiles before running these scripts.

### Frontend Local Build/Run (PowerShell)

Build and run the frontend with a real backend URL (one-line PowerShell commands):

```powershell
docker build -f secureScan_Front/Dockerfile.frontend secureScan_Front --build-arg VITE_API_BASE=http://localhost:8080 --tag sec-front-test
docker run --rm -p 3000:10000 sec-front-test
curl -i http://localhost:3000/healthz
```

Tip: If you need a no-cache build, add `--no-cache` to the `docker build` command.
