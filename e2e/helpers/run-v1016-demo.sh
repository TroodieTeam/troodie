#!/bin/bash
# =================================================================
# run-v1016-demo.sh — Stakeholder demo for v1.0.16.b1 features
#
# Runs 3 focused flows verifying the branch's key features:
#   1. Content Submission Flow (creator view) — two-step upload workflow
#   2. Content Review + Payment Guard (business view) — inline review + payout logic
#   3. Rate Creator Timing (business view) — button visibility based on approvals
#
# Automatically seeds test data before running and resets after.
#
# Usage:
#   ./e2e/helpers/run-v1016-demo.sh              # Run all 3 features
#   ./e2e/helpers/run-v1016-demo.sh content       # Content submission only
#   ./e2e/helpers/run-v1016-demo.sh review        # Content review + payment only
#   ./e2e/helpers/run-v1016-demo.sh rate          # Rate creator only
#   ./e2e/helpers/run-v1016-demo.sh --no-reset    # Run all, keep data after
#   ./e2e/helpers/run-v1016-demo.sh content --no-reset
#
# Prerequisites:
#   - Expo running: EAS_BUILD_PROFILE=production npm start
#   - iOS simulator booted with app installed + launched at least once
# =================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
INJECT="$SCRIPT_DIR/inject-session.sh"
FLOWS_DIR="$PROJECT_DIR/e2e/flows/production"
SQL_RUNNER="$PROJECT_DIR/scripts/run-prod-sql.js"
SETUP_SQL="$PROJECT_DIR/data/test-data/prod/10-setup-robust-test-scenario.sql"
RESET_SQL="$PROJECT_DIR/data/test-data/prod/11-reset-robust-test-data.sql"

# Parse arguments
FILTER="all"
NO_RESET=false
for arg in "$@"; do
  case "$arg" in
    --no-reset) NO_RESET=true ;;
    content|review|rate|all) FILTER="$arg" ;;
  esac
done

PASS=0
FAIL=0
TOTAL=0
START_TIME=$(date +%s)

MAX_RETRIES=2

run_feature() {
  local name="$1"
  local email="$2"
  local flow="$3"
  local flow_start=$(date +%s)
  local attempt=1

  TOTAL=$((TOTAL + 1))

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  FEATURE $TOTAL: $name"
  echo "  Account: $email"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  while [ "$attempt" -le "$MAX_RETRIES" ]; do
    # Inject session (fresh token each attempt)
    if ! "$INJECT" "$email"; then
      echo "FAIL: Session injection failed"
      FAIL=$((FAIL + 1))
      return 1
    fi

    # Run Maestro test
    if maestro test "$flow"; then
      local flow_end=$(date +%s)
      local flow_duration=$((flow_end - flow_start))
      echo "PASS: $name (${flow_duration}s, attempt $attempt)"
      PASS=$((PASS + 1))
      return 0
    fi

    echo "--- Attempt $attempt failed, retrying... ---"
    attempt=$((attempt + 1))
    sleep 2
  done

  local flow_end=$(date +%s)
  local flow_duration=$((flow_end - flow_start))
  echo "FAIL: $name (${flow_duration}s, after $MAX_RETRIES attempts)"
  FAIL=$((FAIL + 1))
}

echo ""
echo "┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"
echo "┃  v1.0.16.b1 STAKEHOLDER DEMO                                ┃"
echo "┃                                                              ┃"
echo "┃  Features:                                                   ┃"
echo "┃    1. Content Submission Flow (two-step upload)              ┃"
echo "┃    2. Content Review + Payment Guard (no duplicate payouts)  ┃"
echo "┃    3. Rate Creator Timing (button after all approved)        ┃"
echo "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"
echo ""

# ============================================================
# Step 0: Seed production test data
# ============================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  SETUP: Seeding production test data..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if node "$SQL_RUNNER" "$SETUP_SQL"; then
  echo "OK: Test data seeded"
else
  echo "WARN: Test data seeding failed (data may already exist — continuing)"
fi

echo ""
chmod +x "$INJECT"

if [ "$FILTER" = "all" ] || [ "$FILTER" = "content" ]; then
  run_feature \
    "Content Submission Flow (Creator)" \
    "prod-creator2@bypass.com" \
    "$FLOWS_DIR/v1016-content-submission.yaml"
fi

if [ "$FILTER" = "all" ] || [ "$FILTER" = "review" ]; then
  run_feature \
    "Content Review + Payment Guard (Business)" \
    "prod-business2@bypass.com" \
    "$FLOWS_DIR/v1016-content-review.yaml"
fi

if [ "$FILTER" = "all" ] || [ "$FILTER" = "rate" ]; then
  run_feature \
    "Rate Creator Timing (Business)" \
    "prod-business3@bypass.com" \
    "$FLOWS_DIR/v1016-rate-creator.yaml"
fi

END_TIME=$(date +%s)
TOTAL_DURATION=$((END_TIME - START_TIME))

echo ""
echo "┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"
echo "┃  RESULTS: $PASS passed, $FAIL failed (${TOTAL_DURATION}s total)                     ┃"
echo "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"

# ============================================================
# Cleanup: Reset production test data
# ============================================================
if [ "$NO_RESET" = true ]; then
  echo ""
  echo "  Skipping data reset (--no-reset flag set)"
  echo "  Run manually: node scripts/run-prod-sql.js data/test-data/prod/11-reset-robust-test-data.sql"
else
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  CLEANUP: Resetting production test data..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  if node "$SQL_RUNNER" "$RESET_SQL"; then
    echo "OK: Test data reset"
  else
    echo "WARN: Test data reset failed — you may need to reset manually"
    echo "  Run: node scripts/run-prod-sql.js data/test-data/prod/11-reset-robust-test-data.sql"
  fi
fi

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
