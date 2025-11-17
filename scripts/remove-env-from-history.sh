#!/bin/bash
# Script to remove .env files from git history
# WARNING: This rewrites git history and requires force push
# Run this AFTER merging the PR that removes files from tracking

set -e

echo "⚠️  WARNING: This will rewrite git history!"
echo "⚠️  Make sure all team members are aware and have pulled latest changes"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Aborted."
  exit 1
fi

# Check if git-filter-repo is installed
if ! command -v git-filter-repo &> /dev/null; then
  echo "❌ git-filter-repo is not installed"
  echo "Install it with: pip install git-filter-repo"
  echo "Or use git filter-branch (slower, built-in)"
  exit 1
fi

echo "🗑️  Removing .env files from git history..."

# Remove .env.development, .env.staging, .env.test from all history
git filter-repo --path .env.development --invert-paths --force
git filter-repo --path .env.staging --invert-paths --force
git filter-repo --path .env.test --invert-paths --force

echo "✅ History cleaned!"
echo ""
echo "⚠️  Next steps:"
echo "1. Force push: git push origin --force --all"
echo "2. Force push tags: git push origin --force --tags"
echo "3. Notify all team members to re-clone or rebase"
echo "4. Rotate all exposed API keys immediately"

