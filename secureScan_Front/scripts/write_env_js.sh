#!/usr/bin/env sh
# Writes a runtime __env.js file into the project's public/ directory (for dev) or into the given output dir.
# Usage: ./write_env_js.sh <API_BASE> [output_dir]
API_BASE=${1:-${VITE_API_BASE:-http://127.0.0.1:8080}}
OUT_DIR=${2:-public}
mkdir -p "$OUT_DIR"
cat > "$OUT_DIR/__env.js" <<EOF
window.__CONFIG__ = {
  API_BASE: "$API_BASE"
};
EOF
echo "Wrote $OUT_DIR/__env.js with API_BASE=$API_BASE"
