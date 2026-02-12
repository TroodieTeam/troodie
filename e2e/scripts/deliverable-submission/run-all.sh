#!/bin/bash
# Run all deliverable submission setup steps in order
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
: "${DATABASE_URL:?Set DATABASE_URL before running}"

for f in 01-cleanup 02-restaurant 03-campaign 04-campaign-payment 05-application-accepted 06-application-pending 07-stripe-accounts 08-verify; do
  echo ">>> Running ${f}.sql"
  psql "$DATABASE_URL" -f "${SCRIPT_DIR}/${f}.sql"
done

echo ""
echo ">>> Setup complete. Run: npm run test:e2e:deliverable"
