#!/usr/bin/env sh
set -eu
echo "[entrypoint] starting backend..."
echo "[entrypoint] pwd=$(pwd)"
echo "[entrypoint] listing /app:"
ls -lah /app || true
if [ -f /app/securascan-backend.d ]; then
  echo "[entrypoint] .d file contents:";
  cat /app/securascan-backend.d || true
fi
echo "[entrypoint] launching binary..."
exec ./securascan-backend
