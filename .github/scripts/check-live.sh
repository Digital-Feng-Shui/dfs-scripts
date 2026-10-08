#!/usr/bin/env bash
# Usage: check-live.sh <pages url> <expected version>
# Waits until GitHub Pages serves the expected version and both files load.
set -euo pipefail
base="${1%/}"
want="$2"
for i in $(seq 1 30); do
  got=$(curl -fsS "$base/version.json?nocache=$RANDOM" | sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' || true)
  if [ "$got" = "$want" ]; then
    curl -fsS -o /dev/null "$base/main.min.js"
    curl -fsS -o /dev/null "$base/styles.min.css"
    for f in night-early.min.js night.min.js night.min.css; do curl -fsS -o /dev/null "$base/night/$f"; done
    echo "Live: $want at $base/ (main.min.js, styles.min.css, night/*)"
    exit 0
  fi
  echo "Waiting for $want (now: ${got:-nothing})"
  sleep 10
done
echo "GitHub Pages did not show $want in time" >&2
exit 1
