#!/usr/bin/env bash
# Ensure that packaging the npm package works correctly and that the resulting
# tarball can be installed and run without issues.
# Step 1: Package up
# Step 2: Several runs of `npx -y` with the tarball, checking for expected output

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"

### INIT
export DT_MCP_DISABLE_TELEMETRY=true

### STEP 1: Create tarball
echo "==> Packing package from $REPO_ROOT"
PACK_OUTPUT=$(npm pack --pack-destination "$TMP_DIR" 2>&1)
TARBALL="$TMP_DIR/$(echo "$PACK_OUTPUT" | tail -n 1)"

echo "==> Created tarball: $TARBALL"

### STEP 2: Test the tarball by running `npx -y` with it and checking the output
echo "==> Running npx -y from tarball"
response=$(cd "$TMP_DIR" && npx -y "file:$TARBALL" 2>&1) || true

echo "==> Response from npx:"
echo "$response" | sed 's/^/    /' # print response with indentation for better readability

if [[ "$response" == *"DT_ENVIRONMENT"* ]]; then
  echo "✅ Package test passed: Received expected response."
else
  echo "❌ Package test failed: Unexpected response."
  exit 1
fi

echo ""

# now let's set DT_ENVIRONMENT to something arbitrary
echo "==> Running npx -y from tarball (with DT_ENVIRONMENT set)"

export DT_ENVIRONMENT="https://not-a-real-environment.com"
response=$(cd "$TMP_DIR" && npx -y "file:$TARBALL" 2>&1) || true

echo "==> Response from npx:"
echo "$response" | sed 's/^/    /' # print response with indentation for better readability

# response should include that this environment URL is not valid
if [[ "$response" == *"to a valid Dynatrace Platform Environment URL"* ]]; then
  echo "✅ Package test passed: Received expected response with custom DT_ENVIRONMENT."
else
  echo "❌ Package test failed: Unexpected response with custom DT_ENVIRONMENT."
  exit 1
fi

echo ""

# now let's set DT_ENVIRONMENT to an actual environment URL, but with invalid credentials
echo "==> Running npx -y from tarball (with DT_ENVIRONMENT set to an actual environment URL)"
export DT_ENVIRONMENT="https://wkf10640.apps.dynatrace.com" # playground
export DT_PLATFORM_TOKEN="invalid-token"

response=$(cd "$TMP_DIR" && npx -y "file:$TARBALL" 2>&1) || true

echo "==> Response from npx:"
echo "$response" | sed 's/^/    /' # print response with indentation for better readability

# Checks if the response string contains the DT_ENVIRONMENT variable value
# Returns true if the environment value is found anywhere in the response string
if [[ "$response" == *"$DT_ENVIRONMENT"* ]]; then
  echo "✅ Package test passed: Received expected response with custom DT_ENVIRONMENT."
else
  echo "❌ Package test failed: Unexpected response with custom DT_ENVIRONMENT."
  exit 1
fi

if [[ "$response" == *"Using Platform Token to authenticate"* ]]; then
  echo "✅ Package test passed: Received expected response with Platform Token."
else
  echo "❌ Package test failed: Unexpected response regarding Platform Token."
  exit 1
fi

echo "==> All tests passed successfully!"
