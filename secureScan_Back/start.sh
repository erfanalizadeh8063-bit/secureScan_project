#!/usr/bin/env bash
set -euo pipefail

# Read PORT (default 8080) and set BIND_ADDR accordingly
PORT=${PORT:-8080}
export BIND_ADDR="0.0.0.0:${PORT}"

echo "Starting backend on ${BIND_ADDR}"

# Exec the application (binary expected at /app/app)
exec /app/app
