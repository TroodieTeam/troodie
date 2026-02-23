#!/bin/bash
# =================================================================
# run-all-fast.sh — Run all 3 consolidated E2E flows with session
# injection (no login UI). Saves ~90s total (30s per login skipped).
#
# Usage:
#   ./e2e/helpers/run-all-fast.sh           # Run all 3 flows
#   ./e2e/helpers/run-all-fast.sh consumer  # Run only consumer flow
#   ./e2e/helpers/run-all-fast.sh creator   # Run only creator flow
#   ./e2e/helpers/run-all-fast.sh business  # Run only business flow
#
# Prerequisites:
#   - Expo dev server running: EAS_BUILD_PROFILE=production npm start
#   - iOS simulator booted with app installed
#   - App launched at least once (to create storage directory)
#   - Production test data seeded
# =================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
INJECT="$SCRIPT_DIR/inject-session.sh"
FLOWS_DIR="$PROJECT_DIR/e2e/flows/production"

FILTER="${1:-all}"

PASS=0
FAIL=0
SKIP=0

run_flow() {
  local name="$1"
  local email="$2"
  local flow="$3"

  echo ""
  echo "============================================================"
  echo "  $name"
  echo "  Account: $email"
  echo "============================================================"

  # Step 1: Inject session
  echo "--- Injecting session for $email ---"
  if ! "$INJECT" "$email"; then
    echo "FAIL: Session injection failed for $email"
    FAIL=$((FAIL + 1))
    return 1
  fi

  # Step 2: Run Maestro test
  echo "--- Running: $flow ---"
  if maestro test "$flow"; then
    echo "PASS: $name"
    PASS=$((PASS + 1))
  else
    echo "FAIL: $name"
    FAIL=$((FAIL + 1))
  fi
}

echo "============================================================"
echo "  FAST E2E TEST SUITE (Session Injection)"
echo "  Filter: $FILTER"
echo "============================================================"

# Ensure inject script is executable
chmod +x "$INJECT"

# --- Ensure app storage exists ---
# The app must have been launched at least once to create the
# AsyncStorage directory. If inject-session.sh fails with
# "AsyncStorage directory not found", launch the app manually first.

if [ "$FILTER" = "all" ] || [ "$FILTER" = "consumer" ]; then
  run_flow "Consumer Full Flow" "prod-consumer1@bypass.com" "$FLOWS_DIR/consumer-full-flow-fast.yaml"
else
  SKIP=$((SKIP + 1))
fi

if [ "$FILTER" = "all" ] || [ "$FILTER" = "creator" ]; then
  run_flow "Creator Full Flow" "prod-creator2@bypass.com" "$FLOWS_DIR/creator-full-flow-fast.yaml"
else
  SKIP=$((SKIP + 1))
fi

if [ "$FILTER" = "all" ] || [ "$FILTER" = "business" ]; then
  run_flow "Business Full Flow" "prod-business2@bypass.com" "$FLOWS_DIR/business-full-flow-fast.yaml"
else
  SKIP=$((SKIP + 1))
fi

echo ""
echo "============================================================"
echo "  RESULTS: $PASS passed, $FAIL failed, $SKIP skipped"
echo "============================================================"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
