#!/bin/bash
# ============================================================================
# Creator Marketplace E2E Test Runner
# ============================================================================
# Purpose: Orchestrate full E2E testing with data setup + Maestro
# Target: ~10 minutes total (down from 60+ minutes manual)
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
E2E_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$E2E_DIR")"

echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  CREATOR MARKETPLACE E2E TEST RUNNER${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "Target: 60 min → 10 min ⚡"
echo ""

# ============================================================================
# PHASE 1: Data Setup via SQL
# ============================================================================
echo -e "${YELLOW}📋 PHASE 1: Data Setup (SQL)${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if we should run SQL setup
if [ "$SKIP_SQL_SETUP" != "true" ]; then
  echo "Running e2e/scripts/setup-e2e-test-data.sql..."
  echo ""
  echo -e "${YELLOW}⚠️  NOTE: Run the following SQL in Supabase SQL Editor:${NC}"
  echo -e "   File: ${GREEN}e2e/scripts/setup-e2e-test-data.sql${NC}"
  echo ""
  echo "Or run programmatically with your Supabase client."
  echo ""
  
  # Optional: If you have supabase CLI configured
  # supabase db execute --file "$E2E_DIR/scripts/setup-e2e-test-data.sql"
  
  read -p "Press Enter once SQL setup is complete (or Ctrl+C to abort)..."
else
  echo "Skipping SQL setup (SKIP_SQL_SETUP=true)"
fi

echo ""
echo -e "${GREEN}✅ Data setup complete${NC}"
echo ""

# ============================================================================
# PHASE 2: Verify Environment
# ============================================================================
echo -e "${YELLOW}🔍 PHASE 2: Environment Check${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check Maestro
if ! command -v maestro &> /dev/null; then
  echo -e "${RED}❌ Maestro not found. Install with:${NC}"
  echo "   curl -Ls 'https://get.maestro.mobile.dev' | bash"
  exit 1
fi
echo -e "${GREEN}✅ Maestro installed${NC}"

# Check for running simulator/emulator
echo "Checking for running devices..."

# iOS
if xcrun simctl list devices 2>/dev/null | grep -q "Booted"; then
  echo -e "${GREEN}✅ iOS Simulator running${NC}"
  PLATFORM="ios"
# Android
elif adb devices 2>/dev/null | grep -q "device$"; then
  echo -e "${GREEN}✅ Android Emulator running${NC}"
  PLATFORM="android"
else
  echo -e "${RED}❌ No simulator/emulator running${NC}"
  echo "   Start one with: open -a Simulator (iOS) or start Android emulator"
  exit 1
fi

echo ""

# ============================================================================
# PHASE 3: Run Maestro Tests
# ============================================================================
echo -e "${YELLOW}🎬 PHASE 3: Running Maestro Tests${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

START_TIME=$(date +%s)

# Run the creator marketplace suite
echo "Running: e2e/suites/creator-marketplace.yaml"
echo ""

cd "$PROJECT_ROOT"

# Option 1: Run full suite
if [ "$RUN_INDIVIDUAL" != "true" ]; then
  maestro test e2e/suites/creator-marketplace.yaml --format junit --output e2e/reports/marketplace-results.xml
else
  # Option 2: Run individual flows (for debugging)
  echo "Running individual flows..."
  
  echo ""
  echo "1/5: Creator applies to campaign..."
  maestro test e2e/flows/creator-marketplace/apply-to-campaign.yaml || true
  
  echo ""
  echo "2/5: Business accepts application..."
  maestro test e2e/flows/creator-marketplace/business-accepts-application.yaml || true
  
  echo ""
  echo "3/5: Creator submits deliverable..."
  maestro test e2e/flows/creator-marketplace/creator-submits-deliverable.yaml || true
  
  echo ""
  echo "4/5: Business approves deliverable..."
  maestro test e2e/flows/creator-marketplace/business-approves-deliverable.yaml || true
  
  echo ""
  echo "5/5: Creator verifies payout..."
  maestro test e2e/flows/creator-marketplace/creator-verifies-payout.yaml || true
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo -e "${GREEN}✅ Maestro tests complete${NC}"
echo ""

# ============================================================================
# PHASE 4: Summary
# ============================================================================
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  TEST RUN COMPLETE${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "Duration: ${GREEN}$DURATION seconds${NC} (~$((DURATION / 60)) minutes)"
echo ""
echo "Screenshots saved to: e2e/reports/"
echo "JUnit report: e2e/reports/marketplace-results.xml"
echo ""

# Show final message
if [ $DURATION -lt 600 ]; then
  echo -e "${GREEN}🎉 SUCCESS! Test completed in under 10 minutes!${NC}"
else
  echo -e "${YELLOW}⚠️  Test took longer than 10 minutes. Consider optimizing.${NC}"
fi

echo ""
