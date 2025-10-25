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
