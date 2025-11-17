# Security: Removing Exposed Environment Files from Git History

## ⚠️ CRITICAL SECURITY ISSUE

The following environment files were accidentally committed to git and contain sensitive API keys:
- `.env.development` - Contains Google Maps API key, Supabase keys
- `.env.staging` - Contains staging environment keys
- `.env.test` - Contains test environment keys

## Immediate Actions Required

### 1. Rotate All Exposed Keys

**All keys exposed in git history must be rotated immediately:**

- [ ] **Google Maps API Key** - Create new key in Google Cloud Console
  - Old key: `AIzaSyBiYsYUP2ty_7pH9S307bu7l3KyTqkjcMM` (exposed)
  - New key: `AIzaSyAqkz_epBVMlKAtruEqvLicsY8ZblqYZc8` (already created)
  - Revoke old key in Google Cloud Console → APIs & Services → Credentials

- [ ] **Supabase Keys** - Regenerate in Supabase Dashboard
  - Go to Project Settings → API
  - Regenerate `anon` key
  - Regenerate `service_role` key (if exposed)
  - Update all environments (.env.development, .env.staging, .env.production)

- [ ] **Any other API keys** exposed in these files

### 2. Remove Files from Git Tracking (PR Merged)

✅ **COMPLETED** - PR removes files from tracking going forward
- Files are now in `.gitignore`
- Files removed from git index
- Local files remain (not deleted from disk)

### 3. Clean Git History (After PR Merge)

**Option A: Using git-filter-repo (Recommended)**

```bash
# Install git-filter-repo
pip install git-filter-repo

# Run the cleanup script
./scripts/remove-env-from-history.sh

# Force push (requires admin access)
git push origin --force --all
git push origin --force --tags
```

**Option B: Using git filter-branch (Built-in, slower)**

```bash
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env.development .env.staging .env.test" \
  --prune-empty --tag-name-filter cat -- --all

# Force push
git push origin --force --all
git push origin --force --tags
```

**Option C: Using BFG Repo Cleaner**

```bash
# Download BFG from https://rtyley.github.io/bfg-repo-cleaner/
java -jar bfg.jar --delete-files .env.development
java -jar bfg.jar --delete-files .env.staging
java -jar bfg.jar --delete-files .env.test
git reflog expire --expire=now --all && git gc --prune=now --aggressive

# Force push
git push origin --force --all
```

### 4. Team Coordination

After cleaning history:
- [ ] Notify all team members
- [ ] Everyone should re-clone the repo OR:
  ```bash
  git fetch origin
  git reset --hard origin/main
  ```
- [ ] Update local `.env` files with new rotated keys
- [ ] Verify `.gitignore` includes all `.env*` patterns

## Prevention

### ✅ Already in Place
- `.gitignore` includes `.env*` patterns
- Files removed from git tracking
- EAS Secrets should be used for production builds

### 📋 Best Practices Going Forward

1. **Never commit `.env` files** - They're in `.gitignore` for a reason
2. **Use EAS Secrets for production:**
   ```bash
   eas secret:create --scope project --name GOOGLE_MAPS_API_KEY --value YOUR_KEY
   ```
3. **Use `.env.example`** for documenting required variables (without values)
4. **Pre-commit hooks** - Consider adding a hook to prevent accidental commits:
   ```bash
   # .husky/pre-commit
   git diff --cached --name-only | grep -E '\.env$|\.env\.' && exit 1 || exit 0
   ```

## Verification

After cleanup, verify files are gone:
```bash
# Should return nothing
git log --all --full-history -- .env.development
git log --all --full-history -- .env.staging
git log --all --full-history -- .env.test
```

## Timeline

- **Date:** $(date +%Y-%m-%d)
- **Files Exposed:** .env.development, .env.staging, .env.test
- **PR Created:** security/remove-env-files-from-git
- **Keys Rotated:** [ ] Pending
- **History Cleaned:** [ ] Pending

