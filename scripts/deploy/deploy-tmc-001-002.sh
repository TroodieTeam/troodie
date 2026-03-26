#!/bin/bash

# ============================================================================
# Troodie-Managed Campaigns - TMC-001 & TMC-002 Deployment Script
# ============================================================================
# This script deploys the database schema and creates the system account
# Admin account: kouame@troodieapp.com
# ============================================================================

set -e  # Exit on error

echo "============================================================================"
echo "🚀 Deploying Troodie-Managed Campaigns (TMC-001 & TMC-002)"
echo "============================================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ============================================================================
# Step 1: Verify prerequisites
# ============================================================================
echo "📋 Step 1: Verifying prerequisites..."

if [ ! -f ".env.development" ]; then
    echo -e "${RED}❌ Error: .env.development file not found${NC}"
    exit 1
fi

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null && ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ Error: Neither 'supabase' CLI nor 'npx' found${NC}"
    echo "Please install Supabase CLI or ensure npx is available"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites verified${NC}"
echo ""

# ============================================================================
# Step 2: Deploy TMC-001 - Database Migration
# ============================================================================
echo "============================================================================"
echo "📊 Step 2: Deploying TMC-001 - Database Schema Migration"
echo "============================================================================"
echo ""
echo "This will:"
echo "  • Extend restaurants table (is_platform_managed, managed_by)"
echo "  • Extend campaigns table (campaign_source, is_subsidized, subsidy_amount_cents)"
echo "  • Create platform_managed_campaigns table"
echo "  • Set up RLS policies"
echo "  • Create database triggers"
echo "  • Add indexes"
echo ""

read -p "Continue with migration deployment? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 1
fi

echo "Deploying migration..."

# Try with supabase CLI first, fall back to npx
if command -v supabase &> /dev/null; then
    supabase db push
else
    npx supabase db push
fi

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ TMC-001 migration deployed successfully${NC}"
else
    echo -e "${RED}❌ Migration failed. Please check the error above.${NC}"
    exit 1
fi

echo ""

# ============================================================================
# Step 3: Deploy TMC-002 - System Account
# ============================================================================
echo "============================================================================"
echo "👤 Step 3: Deploying TMC-002 - System Account Creation"
echo "============================================================================"
echo ""
echo "This will create:"
echo "  • Troodie system user (kouame@troodieapp.com)"
echo "  • Troodie Community restaurant"
echo "  • Business profile linking user to restaurant"
echo ""
echo -e "${YELLOW}⚠️  Note: You'll need to manually create the auth.users record${NC}"
echo ""

read -p "Continue with system account creation? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 1
fi

# Get database URL from environment
source .env.development

if [ -z "$SUPABASE_URL" ]; then
    echo -e "${RED}❌ Error: SUPABASE_URL not found in .env.development${NC}"
    exit 1
fi

# Extract project ref from URL
PROJECT_REF=$(echo $SUPABASE_URL | sed 's/https:\/\///' | sed 's/\.supabase\.co//')

echo "Project: $PROJECT_REF"
echo ""

# Run seed script via Supabase CLI
echo "Running seed script..."

if command -v supabase &> /dev/null; then
    supabase db seed --db-url "postgresql://postgres.[PASSWORD]@db.${PROJECT_REF}.supabase.co:5432/postgres" --seed-path supabase/seeds/create_troodie_system_account.sql
else
    npx supabase db seed --db-url "postgresql://postgres.[PASSWORD]@db.${PROJECT_REF}.supabase.co:5432/postgres" --seed-path supabase/seeds/create_troodie_system_account.sql
fi

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ TMC-002 system account created successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Seed script may have failed. You can also run it manually:${NC}"
    echo ""
    echo "psql \$DATABASE_URL -f supabase/seeds/create_troodie_system_account.sql"
fi

echo ""

# ============================================================================
# Step 4: Manual Steps Required
# ============================================================================
echo "============================================================================"
echo "📝 MANUAL STEPS REQUIRED"
echo "============================================================================"
echo ""
echo "You must now create the auth.users record in Supabase Dashboard:"
echo ""
echo "1. Go to: https://supabase.com/dashboard/project/${PROJECT_REF}/auth/users"
echo "2. Click 'Add User' → 'Create new user'"
echo "3. Email: kouame@troodieapp.com"
echo "4. Password: (set a secure password)"
echo "5. IMPORTANT: User ID must be: 00000000-0000-0000-0000-000000000001"
echo "   (You may need to create the user first, then update the UUID in SQL)"
echo ""
echo "To update UUID after creation:"
echo "UPDATE auth.users SET id = '00000000-0000-0000-0000-000000000001' WHERE email = 'kouame@troodieapp.com';"
echo ""

# ============================================================================
# Step 5: Verification
# ============================================================================
echo "============================================================================"
echo "✅ VERIFICATION STEPS"
echo "============================================================================"
echo ""
echo "Run these queries to verify the deployment:"
echo ""
echo "-- Check system user"
echo "SELECT id, email, username, account_type, role, is_verified"
echo "FROM users"
echo "WHERE email = 'kouame@troodieapp.com';"
echo ""
echo "-- Check Troodie restaurant"
echo "SELECT id, name, is_platform_managed, managed_by"
echo "FROM restaurants"
echo "WHERE is_platform_managed = true;"
echo ""
echo "-- Check business profile"
echo "SELECT user_id, restaurant_id, can_create_campaigns, verified_owner"
echo "FROM business_profiles"
echo "WHERE user_id = '00000000-0000-0000-0000-000000000001';"
echo ""
echo "-- Check platform_managed_campaigns table exists"
echo "SELECT COUNT(*) FROM platform_managed_campaigns;"
echo ""

# ============================================================================
# Complete
# ============================================================================
echo "============================================================================"
echo "🎉 TMC-001 & TMC-002 Deployment Complete!"
echo "============================================================================"
echo ""
echo "Next steps:"
echo "  1. Complete manual auth.users creation (see above)"
echo "  2. Run verification queries"
echo "  3. Test login with kouame@troodieapp.com"
echo "  4. Proceed to TMC-003 (Admin Campaign Creation UI)"
echo ""
echo "Documentation:"
echo "  • Implementation Guide: IMPLEMENTATION_GUIDE.md"
echo "  • Testing Guide: TROODIE_MANAGED_CAMPAIGNS_MANUAL_TESTING_GUIDE.md"
echo "  • Full Index: TROODIE_MANAGED_CAMPAIGNS_INDEX.md"
echo ""
echo "============================================================================"
