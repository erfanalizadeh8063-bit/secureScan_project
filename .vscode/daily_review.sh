#!/usr/bin/env bash
set -euo pipefail
date="$(date +%F)"
dir="docs/daily_reviews"
tpl="$dir/_template.md"
dst="$dir/daily_review_${date}.md"

mkdir -p "$dir"
if [ ! -f "$tpl" ]; then
  printf '# Daily review - {{DATE}}\n\n- Done:\n\n- Next:\n\n- Risks:\n\n- Notes:\n' > "$tpl"
fi

sed "s/{{DATE}}/${date}/g" "$tpl" > "$dst"

# Print only when not quiet
if [ "${QUIET:-0}" != "1" ]; then
  echo "📄 Created $dst"
fi
