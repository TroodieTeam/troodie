#!/bin/bash

# Script to apply the board_invitations RLS fix to your Supabase database
# This fixes the issue where users can't see their board invitations

echo "🔧 Applying board_invitations RLS fix..."
echo ""
echo "📋 Migration: 20251008_fix_board_invitations_rls_v2.sql"
echo ""
echo "This will:"
echo "  - Drop problematic RLS policies that access auth.users"
echo "  - Create simplified policies that only check auth.uid()"
echo ""
echo "Press Enter to continue or Ctrl+C to cancel..."
read

# Get the project ref from the URL
PROJECT_REF="tcultsriqunnxujqiwea"

# Read the migration file
MIGRATION_SQL=$(cat supabase/migrations/20251008_fix_board_invitations_rls_v2.sql)

# Display the SQL that will be executed
echo ""
echo "📄 SQL to be executed:"
echo "=================================================="
echo "$MIGRATION_SQL"
echo "=================================================="
echo ""
echo "⚠️  IMPORTANT: You need to run this SQL manually in the Supabase Dashboard:"
echo ""
echo "1. Go to: https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new"
echo "2. Copy the SQL from: supabase/migrations/20251008_fix_board_invitations_rls_v2.sql"
echo "3. Paste it into the SQL editor"
echo "4. Click 'Run' to execute"
echo ""
echo "Alternatively, if you have Supabase CLI configured with service_role key:"
echo "  cd supabase && npx supabase db push"
echo ""
