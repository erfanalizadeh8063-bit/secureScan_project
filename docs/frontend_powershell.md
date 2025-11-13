### Frontend Local Build/Run (PowerShell)

Build and run the frontend with a real backend URL (one-line PowerShell commands):

```powershell
docker build -f secureScan_Front/Dockerfile.frontend secureScan_Front --build-arg VITE_API_BASE=http://localhost:8080 --tag sec-front-test
docker run --rm -p 3000:10000 sec-front-test
curl -i http://localhost:3000/healthz
```

Tip: If you need a no-cache build, add `--no-cache` to the `docker build` command.
