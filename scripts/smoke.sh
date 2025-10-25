#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
echo "Running local smoke checks from $ROOT_DIR"

cd "$ROOT_DIR"

echo "Bringing down any existing compose stack..."
docker compose down --remove-orphans || true

echo "Building backend image (no-cache)..."
docker compose build --no-cache --progress=plain securascan-back

echo "Starting prod profile..."
docker compose --profile prod up -d

echo "Waiting briefly for services to start..."
sleep 4

echo "Checking backend /healthz (http://localhost:8080/healthz)"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/healthz || echo "000")
if [ "$HTTP" != "200" ]; then
  echo "Backend health check failed (status: $HTTP)"
  echo "--- Backend logs ---"
  docker compose logs securascan-back --tail=200
  exit 2
fi

echo "Backend healthy"

echo "Checking frontend root (http://localhost:3000)"
HTTPF=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "000")
if [ "$HTTPF" != "200" ] && [ "$HTTPF" != "304" ]; then
  echo "Frontend check failed (status: $HTTPF)"
  echo "--- Frontend logs ---"
  docker compose logs securascan-front --tail=200
  exit 3
fi

echo "Frontend served (status: $HTTPF)"
echo "Smoke tests passed"
#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT_DIR"

echo "Stopping any existing compose stacks..."
docker compose down --remove-orphans

echo "Bringing up services (build) (prod profile)..."
docker compose --profile prod up --build -d

sleep 4

BACKEND="http://localhost:8080/healthz"
FRONTEND="http://localhost:3000"

echo "Checking backend: $BACKEND"
if curl -fsS "$BACKEND" >/dev/null; then
  echo "Backend healthy (200)"
else
  echo "Backend healthcheck failed"
  docker compose logs --tail 80 backend
  exit 2
fi

echo "Checking frontend: $FRONTEND"
if curl -fsS "$FRONTEND" >/dev/null; then
  echo "Frontend served"
else
  echo "Frontend check failed"
  docker compose logs --tail 80 frontend
  exit 3
fi

echo "All smoke checks passed ✅"
exit 0
