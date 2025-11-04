Render smoke test
=================

Use the included script `scripts/smoke_render.sh` to validate the frontend and backend after a Render deployment.

Example:

```bash
FRONT_URL="https://your-front.onrender.com" \
BACK_URL="https://your-back.onrender.com" \
  bash scripts/smoke_render.sh
```

The script will call `/healthz` on both services and print the responses. It exits non-zero if either endpoint fails.

Notes:
 - Ensure `VITE_API_BASE` is set in the frontend service on Render before triggering the build, so the frontend bundle knows the backend origin.
- The script requires `curl` and `sed` available on your machine (common on macOS/Linux and Windows WSL).
