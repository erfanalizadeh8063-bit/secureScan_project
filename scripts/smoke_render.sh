#!/usr/bin/env bash
set -euo pipefail
FRONT_URL="${FRONT_URL:-}"
BACK_URL="${BACK_URL:-}"
if [[ -z "$FRONT_URL" || -z "$BACK_URL" ]]; then
  echo "Usage: FRONT_URL=https://<front>.onrender.com BACK_URL=https://<back>.onrender.com $0"
  exit 2
fi

echo "==> Backend /healthz"
curl -fsS "$BACK_URL/healthz" | sed -e 's/^/BACK: /' || { echo "Backend health failed"; exit 1; }

echo "==> Frontend static ping"
curl -fsS "$FRONT_URL/__ping.txt" | sed -e 's/^/FRONT: /' || { echo "Frontend static ping failed"; exit 1; }

echo "OK: both endpoints responded."
