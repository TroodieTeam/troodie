#!/bin/bash
# =================================================================
# run-fast-production.sh — Run all consolidated production E2E tests
# with session token injection (skips 30s login per test)
#
# Usage:
#   ./e2e/run-fast-production.sh           # Run all 3 flows
#   ./e2e/run-fast-production.sh consumer  # Run just consumer flow
#   ./e2e/run-fast-production.sh creator   # Run just creator flow
#   ./e2e/run-fast-production.sh business  # Run just business flow
#
# Prerequisites:
#   - iOS simulator booted with app installed
#   - Expo dev server running with production profile
#   - Production test data seeded
# =================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INJECT="$SCRIPT_DIR/helpers/inject-session.sh"
FLOWS_DIR="$SCRIPT_DIR/flows/production"

# Test accounts
CONSUMER_EMAIL="prod-consumer1@bypass.com"
CREATOR_EMAIL="prod-creator2@bypass.com"
BUSINESS_EMAIL="prod-business2@bypass.com"

FILTER="${1:-all}"
PASSED=0
FAILED=0
SKIPPED=0

run_flow() {
  local name="$1"
  local email="$2"
  local flow="$3"

  echo ""
  echo "=========================================="
  echo "  $name"
  echo "=========================================="

  # Step 1: Inject session
  echo "--- Injecting session for $email ---"
  if ! "$INJECT" "$email"; then
    echo "FAIL: Session injection failed for $email"
    FAILED=$((FAILED + 1))
    return 1
  fi

  # Step 2: Run Maestro flow
  echo "--- Running Maestro flow ---"
  if maestro test "$flow"; then
    echo "PASS: $name"
    PASSED=$((PASSED + 1))
  else
    echo "FAIL: $name"
    FAILED=$((FAILED + 1))
  fi
}

echo "=========================================="
echo "  Fast Production E2E Tests"
echo "  (Session injection — no login UI)"
echo "=========================================="

START_TIME=$(date +%s)

if [ "$FILTER" = "all" ] || [ "$FILTER" = "consumer" ]; then
  run_flow "Consumer Full Flow" "$CONSUMER_EMAIL" "$FLOWS_DIR/consumer-full-flow.yaml"
else
  echo "SKIP: Consumer Full Flow"
  SKIPPED=$((SKIPPED + 1))
fi

if [ "$FILTER" = "all" ] || [ "$FILTER" = "creator" ]; then
  run_flow "Creator Full Flow" "$CREATOR_EMAIL" "$FLOWS_DIR/creator-full-flow.yaml"
else
  echo "SKIP: Creator Full Flow"
  SKIPPED=$((SKIPPED + 1))
fi

if [ "$FILTER" = "all" ] || [ "$FILTER" = "business" ]; then
  run_flow "Business Full Flow" "$BUSINESS_EMAIL" "$FLOWS_DIR/business-full-flow.yaml"
else
  echo "SKIP: Business Full Flow"
  SKIPPED=$((SKIPPED + 1))
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

echo ""
echo "=========================================="
echo "  Results"
echo "=========================================="
echo "  PASSED:  $PASSED"
echo "  FAILED:  $FAILED"
echo "  SKIPPED: $SKIPPED"
echo "  TIME:    ${MINUTES}m ${SECONDS}s"
echo "=========================================="

[ "$FAILED" -eq 0 ]
