#!/usr/bin/env bash
# Verify that the extracted MCPB bundle entry point runs correctly.
#
# Usage: e2e-verify-mcpb-bundle.sh <extract-dir>
#
# The script expects <extract-dir>/dist/index.js to exist (the entry point
# declared in manifest.json). It runs the entry point with Node.js and asserts:
#   - No "Cannot find module" crash (would indicate an incomplete bundle)
#   - The startup output mentions "DT_ENVIRONMENT" (expected diagnostic when
#     credentials are not configured)
#   - The process exits with code 1

set -e

EXTRACT_DIR="${1:-/tmp/mcpb/extracted}"
ENTRY_POINT="$EXTRACT_DIR/dist/index.js"

if [ ! -f "$ENTRY_POINT" ]; then
  echo "FAIL: entry point not found: $ENTRY_POINT"
  exit 1
fi

set +e
DT_MCP_DISABLE_TELEMETRY=true node "$ENTRY_POINT" > /tmp/mcpb-output.txt 2>&1
EXIT_CODE=$?
set -e

OUTPUT=$(cat /tmp/mcpb-output.txt)
echo "$OUTPUT"

if echo "$OUTPUT" | grep -q "Cannot find module"; then
  echo "FAIL: bundle is missing a required Node.js module – the bundle is incomplete"
  exit 1
fi

if ! echo "$OUTPUT" | grep -q "DT_ENVIRONMENT"; then
  echo "FAIL: expected startup output to mention DT_ENVIRONMENT"
  exit 1
fi

if [ "$EXIT_CODE" -ne 1 ]; then
  echo "FAIL: expected exit code 1, got $EXIT_CODE"
  exit 1
fi

echo "PASS: MCPB bundle started correctly"
