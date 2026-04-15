#!/usr/bin/env bash
# Finds the Playwright-recorded webm and converts it to demo.mp4
set -euo pipefail

RESULTS_DIR="test-results"
WEBM=$(find "$RESULTS_DIR" -name "*.webm" -type f 2>/dev/null | head -1)

if [ -z "$WEBM" ]; then
  echo "ERROR: No .webm file found in $RESULTS_DIR"
  exit 1
fi

echo "Found recording: $WEBM"
echo "Converting to demo.mp4 ..."

ffmpeg -y -i "$WEBM" \
  -c:v libx264 -preset fast -crf 23 \
  -pix_fmt yuv420p \
  -movflags +faststart \
  demo.mp4

echo "Done: demo.mp4 ($(du -h demo.mp4 | cut -f1))"
