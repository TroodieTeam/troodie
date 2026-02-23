#!/bin/bash
# =================================================================
# inject-session.sh — Pre-authenticate and inject Supabase session
# into the iOS simulator's AsyncStorage, bypassing the login UI.
#
# Usage:
#   ./e2e/helpers/inject-session.sh <email> [password]
#
# Examples:
#   ./e2e/helpers/inject-session.sh prod-creator1@bypass.com
#   ./e2e/helpers/inject-session.sh prod-business2@bypass.com 000000
#
# The app must have been launched at least once (to create the
# storage directory). After injection, launch the app WITHOUT
# clearState and it will start authenticated.
# =================================================================

set -euo pipefail

EMAIL="${1:?Usage: inject-session.sh <email> [password]}"
PASSWORD="${2:-000000}"

# --- Config ---
PROJECT_REF="cacrjcekanesymdzpjtt"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhY3JqY2VrYW5lc3ltZHpwanR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5OTk2NjMsImV4cCI6MjA2ODU3NTY2M30.3uMT1CXYEjDv5XTP0q__MbtQU9sUJxZloseMlMFBneA"
BUNDLE_ID="com.troodie.troodie.com"
STORAGE_KEY="supabase.auth.token"

# --- Find booted simulator ---
UDID=$(xcrun simctl list devices booted -j 2>/dev/null \
  | python3 -c "import sys,json; devs=json.load(sys.stdin)['devices']; [print(d['udid']) for r in devs.values() for d in r if d['state']=='Booted']" 2>/dev/null \
  | head -1)

if [ -z "$UDID" ]; then
  echo "ERROR: No booted iOS simulator found" >&2
  exit 1
fi

# --- Find app container ---
APP_CONTAINER=$(xcrun simctl get_app_container "$UDID" "$BUNDLE_ID" data 2>/dev/null || true)

if [ -z "$APP_CONTAINER" ]; then
  echo "ERROR: App not installed on simulator. Launch it once first." >&2
  exit 1
fi

STORAGE_DIR="$APP_CONTAINER/Library/Application Support/$BUNDLE_ID/RCTAsyncLocalStorage_V1"

if [ ! -d "$STORAGE_DIR" ]; then
  echo "ERROR: AsyncStorage directory not found. Launch the app once first." >&2
  exit 1
fi

# --- Authenticate via Supabase API ---
echo "Authenticating ${EMAIL}..."

SESSION=$(curl -s -X POST \
  "https://${PROJECT_REF}.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

# Check for errors
if echo "$SESSION" | python3 -c "import sys,json; d=json.load(sys.stdin); sys.exit(0 if 'access_token' in d else 1)" 2>/dev/null; then
  echo "OK: Got session token"
else
  ERROR=$(echo "$SESSION" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('msg', d.get('error_description', 'unknown')))" 2>/dev/null)
  echo "ERROR: Auth failed — ${ERROR}" >&2
  exit 1
fi

# --- Write session to AsyncStorage ---
# RCTAsyncLocalStorage uses manifest.json + data files
# When manifest value is null, the data is in a separate file keyed by MD5 of the key

# Compute the MD5 hash of the storage key (used as filename)
FILE_HASH=$(echo -n "$STORAGE_KEY" | md5 2>/dev/null || echo -n "$STORAGE_KEY" | md5sum | cut -d' ' -f1)

# Write the session data to the file
echo "$SESSION" > "$STORAGE_DIR/$FILE_HASH"

# Update manifest.json to point to the data
# Also preserve hasCompletedOnboarding=true so we skip onboarding
python3 -c "
import json, os, sys

manifest_path = os.path.join('$STORAGE_DIR', 'manifest.json')

# Read existing manifest or create new
try:
    with open(manifest_path) as f:
        manifest = json.load(f)
except:
    manifest = {}

# Set session key to null (meaning data is in the hash file)
manifest['$STORAGE_KEY'] = None
manifest['hasCompletedOnboarding'] = 'true'

with open(manifest_path, 'w') as f:
    json.dump(manifest, f)
"

USER_EMAIL=$(echo "$SESSION" | python3 -c "import sys,json; print(json.load(sys.stdin)['user']['email'])")
echo "OK: Session injected for ${USER_EMAIL}"
echo "    Storage: ${STORAGE_DIR}"
echo ""
echo "Now launch the app WITHOUT clearState:"
echo "  - launchApp"
echo "  # App starts authenticated — no login needed"
