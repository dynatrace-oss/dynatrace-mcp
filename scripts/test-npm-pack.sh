#!/usr/bin/env bash
# Verify that the npm package can be packed and the binary can be executed.

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"

export DT_MCP_DISABLE_TELEMETRY=true

npm run build --prefix "$REPO_ROOT"

PACK_OUTPUT=$(npm pack --pack-destination "$TMP_DIR" 2>&1)
TARBALL="$TMP_DIR/$(echo "$PACK_OUTPUT" | tail -n 1)"

echo "==> Created tarball: $TARBALL"

response=$(cd "$TMP_DIR" && npx -y "file:$TARBALL" 2>&1) || true

echo "$response"

if [[ "$response" == *"DT_ENVIRONMENT"* ]]; then
  echo "✅ Package test passed"
else
  echo "❌ Package test failed: unexpected output"
  exit 1
fi
