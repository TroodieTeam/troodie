#!/bin/bash

# Migration Consolidation Script for Troodie
# This script helps consolidate 108+ migrations into a clean structure

set -e

MIGRATIONS_DIR="migrations"
ARCHIVE_DIR="migrations_archive"
BACKUP_DIR="migrations_backup_$(date +%Y%m%d_%H%M%S)"

echo "🗂️  Troodie Migration Consolidation Tool"
echo "========================================"
echo ""
echo "This script will:"
echo "  1. Backup all current migrations"
echo "  2. Remove test/debug files from migrations/"
echo "  3. Create an archive folder for old migrations"
echo "  4. Prepare for consolidated schema"
echo ""
echo "⚠️  WARNING: This should only be done BEFORE deploying to production"
echo "⚠️  Make sure you have committed all changes to git first!"
echo ""
read -p "Have you committed all changes to git? (yes/no): " git_committed

if [ "$git_committed" != "yes" ]; then
    echo "❌ Please commit your changes first!"
    exit 1
fi

echo ""
echo "📦 Step 1: Creating backup..."
mkdir -p "../$BACKUP_DIR"
cp -r $MIGRATIONS_DIR/* "../$BACKUP_DIR/"
echo "✅ Backup created at: ../$BACKUP_DIR"

echo ""
echo "🧹 Step 2: Removing test and debug files..."

# Files to remove (these should not be in migrations/)
TEST_DEBUG_FILES=(
    "create_test_board_invitation.sql"
    "debug_board_invitations.sql"
    "HOTFIX_board_invitations_table_name.sql"  # Duplicate of timestamped version
)

for file in "${TEST_DEBUG_FILES[@]}"; do
    if [ -f "$MIGRATIONS_DIR/$file" ]; then
        echo "  Removing: $file"
        rm "$MIGRATIONS_DIR/$file"
    fi
done

echo ""
echo "📋 Step 3: Creating migrations archive..."
mkdir -p "$ARCHIVE_DIR"

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📊 Migration Statistics:"
echo "  Before: 108 migrations"
echo "  After:  $(ls -1 $MIGRATIONS_DIR/*.sql 2>/dev/null | wc -l) migrations"
echo ""
echo "Next Steps:"
echo "1. Test your app with the cleaned migrations"
echo "2. For production, create consolidated schema:"
echo "   - Export schema from your current Supabase instance"
echo "   - Create: migrations/00000000000000_consolidated_schema_v1.0.sql"
echo "3. Move old migrations to archive:"
echo "   mv migrations/*.sql migrations_archive/"
echo "4. Use consolidated schema for fresh environments"
echo ""
echo "📖 See MIGRATION_CONSOLIDATION_GUIDE.md for detailed instructions"
