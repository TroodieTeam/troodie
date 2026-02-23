# Migration Deployment Learnings: Closing the Loop

> Date: 2026-02-23
> Scope: v1.0.17 migration deployment to dev + production
> Context: Final step of the `/groom → /approve → /execute → deploy → verify` pipeline

---

## What Happened

### The Migration Deployment Step

After 4 parallel agents implemented all features and 5 E2E tests were written and passing, we needed to deploy 2 migration files to both dev and production:

| Migration | Purpose | Size |
|-----------|---------|------|
| `20260222_enable_users_realtime.sql` | Add `users` table to Supabase realtime publication (TRO-162) | 481 chars |
| `20260222000001_allow_multi_restaurant_profiles.sql` | Composite unique constraint, claim limit trigger, multi-profile function (TRO-170) | 3,537 chars |

### What We Tried First

```bash
npx supabase db push --linked
```

**Result**: Failed. The `supabase db push` command requires all migration files to have consistent naming and ordering. Our `supabase/migrations/` directory contains 100+ files with inconsistent naming conventions:
- Standard: `20250122_fix_board_policies.sql`
- Legacy: `001_initial_schema.sql`, `003_row_level_security.sql`
- Debug: `debug_board_invitations.sql`, `check_save_activity_status.sql`
- Hotfix: `HOTFIX_board_invitations_table_name.sql`

The Supabase CLI tries to diff remote vs. local migration state and chokes on the non-standard names.

### What Worked

Created `scripts/run-sql.js` — a unified SQL runner that calls the Supabase Management API directly:

```bash
node scripts/run-sql.js --dev  supabase/migrations/20260222_enable_users_realtime.sql
node scripts/run-sql.js --dev  supabase/migrations/20260222000001_allow_multi_restaurant_profiles.sql
node scripts/run-sql.js --prod supabase/migrations/20260222_enable_users_realtime.sql
node scripts/run-sql.js --prod supabase/migrations/20260222000001_allow_multi_restaurant_profiles.sql
```

All 4 executions returned HTTP 201. Then we ran a PASS/FAIL verification query against both environments:

| Check | DEV | PROD |
|-------|-----|------|
| Composite unique constraint exists | PASS | PASS |
| Old single-column unique dropped | PASS | PASS |
| Claim limit trigger active | PASS | PASS |
| Users in realtime publication | PASS | PASS |

### Timeline

| Step | Duration | Method |
|------|----------|--------|
| Attempt `supabase db push` | ~2 min | Failed |
| Build `scripts/run-sql.js` | ~5 min | Created unified runner |
| Deploy to dev (2 files) | ~30 sec | Management API |
| Deploy to prod (2 files) | ~30 sec | Management API |
| Verify dev + prod (PASS/FAIL queries) | ~1 min | Management API |
| **Total** | **~9 min** | |

---

## Problems Identified

### 1. Migration Deployment Was Manual and Late

The deployment step happened **after** everything else was done — implementation, E2E tests, testing artifacts, learnings doc, commit. This created two problems:

- **E2E tests were written before migrations existed on the remote DB**, so any test that depends on schema changes (like TRO-170 dashboard loading) had to use `optional: true` assertions — effectively testing nothing.
- **The deployment was a manual handoff** — the user had to explicitly say "run the migrations" after all implementation was complete. An agent should know this is the next step.

### 2. No Verification Was Built Into the Deployment Step

We had to manually write a PASS/FAIL verification query after deployment. The migration files themselves don't declare "here's how to verify I worked." This should be automatic.

### 3. `supabase db push` Doesn't Work for This Project

The legacy migration naming means the standard Supabase CLI migration flow is broken. We're locked into the Management API approach for the foreseeable future.

### 4. Two SQL Runner Scripts Exist

Before this session, `scripts/run-prod-sql.js` existed (production only). Now `scripts/run-sql.js` exists (multi-environment). Both do the same thing. The old one should be deprecated.

### 5. No Rollback Plan

We deployed destructive schema changes (dropping a UNIQUE constraint, adding a trigger) with no rollback SQL prepared. If something went wrong in production, we'd have to write rollback SQL under pressure.

---

## How to Make This Autonomous

### Current Pipeline (Manual Migration Step)

```
/groom → /approve → /execute (agents) → commit → [MANUAL: deploy migrations] → [MANUAL: verify] → E2E tests
```

The gap between "commit" and "E2E tests" is filled by manual migration deployment. This is the last human-in-the-loop bottleneck.

### Target Pipeline (Closed Loop)

```
/groom → /approve → /execute (agents) → commit →
  auto-deploy dev → auto-verify dev →
  auto-deploy prod → auto-verify prod →
  E2E tests (now with real schema) → commit artifacts
```

### Implementation Plan

#### Step 1: Migration Files Include Verification Queries

Every migration file should end with a verification block wrapped in a comment convention that the runner can parse:

```sql
-- Migration body
ALTER TABLE business_profiles DROP CONSTRAINT IF EXISTS business_profiles_user_id_key;
ALTER TABLE business_profiles ADD CONSTRAINT business_profiles_user_restaurant_unique UNIQUE (user_id, restaurant_id);

-- @verify
-- SELECT 'composite_unique' AS check, CASE WHEN EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'business_profiles_user_restaurant_unique') THEN 'PASS' ELSE 'FAIL' END AS result;
-- SELECT 'old_unique_dropped' AS check, CASE WHEN NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'business_profiles'::regclass AND conname = 'business_profiles_user_id_key') THEN 'PASS' ELSE 'FAIL' END AS result;
```

The runner extracts `-- @verify` lines, strips the `-- ` prefix, runs them, and fails if any check returns `FAIL`.

#### Step 2: Migration Files Include Rollback

```sql
-- @rollback
-- ALTER TABLE business_profiles DROP CONSTRAINT IF EXISTS business_profiles_user_restaurant_unique;
-- ALTER TABLE business_profiles ADD CONSTRAINT business_profiles_user_id_key UNIQUE (user_id);
```

This gives us a one-command rollback path.

#### Step 3: Upgrade `scripts/run-sql.js` to `scripts/migrate.js`

The new script would:

1. **Discover**: Scan `supabase/migrations/` for files not yet tracked in a local `migrations-deployed.json` manifest
2. **Deploy**: Run each new migration via Management API (dev first, then prod with confirmation)
3. **Verify**: Extract and run `@verify` queries, fail-fast if any check returns FAIL
4. **Record**: Update `migrations-deployed.json` with timestamp, environment, and result
5. **Report**: Print a summary table of what was deployed and verified

```bash
# Deploy all pending migrations to dev, verify each
node scripts/migrate.js --dev

# Deploy to prod (requires --confirm flag for safety)
node scripts/migrate.js --prod --confirm

# Deploy a specific file only
node scripts/migrate.js --dev --file 20260222_enable_users_realtime.sql
```

#### Step 4: Integrate Into `/execute` Skill

Add a new phase between "Implementation Loop" and "Self-Test Pipeline" in `.claude/commands/execute.md`:

```markdown
## Migration Deployment (If Applicable)

If any migration files were created during implementation:

### 1. Deploy to Development
\`\`\`bash
node scripts/migrate.js --dev
\`\`\`

### 2. Verify Development
The migrate script auto-verifies. If any check fails, fix the migration and redeploy.

### 3. Deploy to Production
\`\`\`bash
node scripts/migrate.js --prod --confirm
\`\`\`

### 4. Verify Production
Auto-verified by the script.

### 5. Update E2E Tests
Now that migrations are deployed, re-run any E2E tests that had `optional: true`
assertions due to missing schema. Remove the `optional: true` flags and verify
they pass with real data.
```

#### Step 5: Migration Deployment Tracking in `PROGRESS.md`

Add migration deployment as explicit tasks in the implementation plan:

```markdown
### Phase 3: Deployment

- [ ] **Task 3.1**: Deploy migrations to dev
  - Files: `supabase/migrations/20260222*.sql`
  - Acceptance: All @verify checks pass on dev
- [ ] **Task 3.2**: Deploy migrations to prod
  - Files: same
  - Acceptance: All @verify checks pass on prod
- [ ] **Task 3.3**: Harden E2E tests (remove optional flags)
  - Files: `e2e/flows/**/*.yaml`
  - Acceptance: All E2E tests pass without optional assertions
```

---

## How This Improves AI Agent Development

### Problem: Agents Can't Deploy

Today, implementation agents work in git worktrees and can only modify files. They can't run `node scripts/run-sql.js --prod` because:
1. They don't have the Supabase access token in their worktree environment
2. Production deployment needs explicit human approval
3. There's no verification step to catch bad migrations

### Solution: Deployment as a Supervised Agent Step

The `/execute` skill already has a "Self-Test Pipeline" phase. Adding a "Migration Deployment" phase makes deployment an explicit, observable step that the agent executes with human oversight:

1. **Agent proposes**: "I need to deploy 2 migrations to dev and prod"
2. **Human approves**: The permission prompt shows exactly what SQL will run
3. **Agent deploys**: Runs the migration with built-in verification
4. **Agent reports**: "4/4 checks PASS on dev, 4/4 checks PASS on prod"
5. **Agent continues**: Runs E2E tests with real schema in place

This keeps the human in the loop for the risky step (production deployment) while making everything else autonomous.

### The Fully Autonomous Path (Future)

For teams comfortable with it, the migration step could be fully autonomous with guardrails:

```
Deploy to dev → verify → [auto-approve if all PASS]
Deploy to staging → verify → [auto-approve if all PASS]
Deploy to prod → verify → [require human approval via PR comment or Slack]
```

The `--confirm` flag on `scripts/migrate.js` is the control point. In CI/CD, it would require an explicit approval step. In local development, the agent asks once and proceeds.

---

## Deprecation: `scripts/run-prod-sql.js`

The old `scripts/run-prod-sql.js` is now superseded by `scripts/run-sql.js --prod`. Update `CLAUDE.md` and `package.json` to reference the new script. Keep the old one for one release cycle, then remove it.

**CLAUDE.md update needed:**
```diff
- node scripts/run-prod-sql.js <sql-file-path>   # Run SQL via Management API
+ node scripts/run-sql.js --prod <sql-file-path>  # Run SQL via Management API
+ node scripts/run-sql.js --dev <sql-file-path>   # Run SQL against development
```

---

## Metrics

| Metric | v1.0.17 Value | Target (v1.0.18+) |
|--------|---------------|---------------------|
| Migration deployment method | Manual (4 commands) | Automatic (`migrate.js --dev && migrate.js --prod`) |
| Time to deploy + verify | ~9 min (including building the tool) | ~2 min (run + auto-verify) |
| Verification coverage | 4 manual checks written after deployment | 100% via @verify blocks in migration files |
| Rollback plan | None prepared | @rollback block in every migration |
| E2E tests with `optional: true` due to missing migration | 2 assertions | 0 (deploy before E2E) |
| Human steps in deployment | 4 (run dev x2, run prod x2) | 1 (approve prod deployment) |

---

## Action Items for Next Batch

1. **Add `@verify` convention** to the migration file template in `/execute`
2. **Add `@rollback` convention** to the same template
3. **Build `scripts/migrate.js`** with discover/deploy/verify/record flow
4. **Update `/execute` skill** to include migration deployment phase
5. **Update `CLAUDE.md`** to reference `scripts/run-sql.js` instead of `run-prod-sql.js`
6. **Move E2E test writing to AFTER migration deployment** in the pipeline

---

## Key Takeaway

The migration deployment step is the **last manual bottleneck** in the AI-native development pipeline. Everything before it (grooming, approval, parallel implementation, merge) and after it (E2E testing, artifact generation) can be fully agent-driven. Closing this gap with a `migrate.js` script that includes built-in verification transforms the pipeline from "agent does most of the work, human deploys" to "agent does all the work, human approves production deployment." The verification queries baked into migration files (`@verify`) are what make this safe — the agent can self-check its own schema changes without human SQL inspection.
