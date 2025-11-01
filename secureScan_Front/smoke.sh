#!/usr/bin/env bash
# smoke.sh — checks frontend and backend public endpoints
# Usage: ./smoke.sh
set -eo pipefail
BACKEND_URL="https://securascan-back-dd57.onrender.com/healthz"
FRONTEND_URL="https://securascan-front-dd57.onrender.com"

backend_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$BACKEND_URL" || echo "ERR")
frontend_code=$(curl -sSI -o /dev/null -w "%{http_code}" --max-time 10 "$FRONTEND_URL" || echo "ERR")

backend_ok="FAIL"
frontend_ok="FAIL"
if [ "$backend_code" = "200" ]; then backend_ok="OK"; fi
if [ "$frontend_code" = "200" ] || [ "$frontend_code" = "301" ] || [ "$frontend_code" = "302" ]; then frontend_ok="OK"; fi

if [ "$backend_ok" = "OK" ] && [ "$frontend_ok" = "OK" ]; then
  echo "SMOKE OK | backend=${backend_code} frontend=${frontend_code}"
  exit 0
else
  echo "SMOKE FAIL | backend=${backend_code} frontend=${frontend_code}"
  exit 1
fi
