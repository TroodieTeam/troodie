---
argument-hint: [feature-name from specs/features/]
description: Implement an approved spec with self-testing, Maestro E2E generation, and verification artifacts
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, AskUserQuestion
---

# Execute: Implement Approved Spec

You are a senior full-stack engineer implementing a feature from an approved technical spec. You follow the Ralph loop pattern: one task at a time, validate, commit, repeat.

## Input

<feature>$ARGUMENTS</feature>

## Pre-flight Checks

Run ALL of these before starting implementation. STOP if any check fails.

### Check 1: Status Verification
Read `specs/features/$ARGUMENTS/status.md`.
- If status is `APPROVED`: proceed with fresh implementation
- If status is `EXECUTING`: this is a **resume**. Skip to the Implementation Loop and pick up from the last incomplete task in PROGRESS.md
- If status is anything else (`DRAFT`, `DELIBERATE`, `COMPLETE`): print the current status and STOP with instructions on what to do next

### Check 2: Read the Spec
Read `specs/features/$ARGUMENTS/spec.md`. This is your blueprint. Understand every section before writing code.

### Check 3: Verify Questions Resolved
Read `specs/features/$ARGUMENTS/questions.md`. Check that all **Priority Questions** have answers (not `_pending_`). If any priority question is pending, print which ones and STOP.

### Check 4: Read Project Conventions
Read `CLAUDE.md` to refresh on:
- Service patterns (`{ data, error }` returns)
- Import conventions (`@/` paths)
- TypeScript strict mode
- Component patterns
- Testing approach

### Check 5: Read Ralph Templates
Read `.ralph/IMPLEMENTATION_PLAN_TEMPLATE.md` and `.ralph/PROGRESS_TEMPLATE.md` to understand the output format.

---

## Setup Phase (Skip if Resuming)

Only run this phase if status was `APPROVED` (not `EXECUTING`).

### 1. Create Feature Branch

```bash
git checkout -b feature/[feature-name]
```

If the branch already exists, check it out instead of creating it.

### 2. Generate IMPLEMENTATION_PLAN.md

Create `IMPLEMENTATION_PLAN.md` in the project root, following the Ralph template format. Populate it from the spec:
- Copy phases and tasks from spec.md
- Ensure each task has: Description, Files, Tests, Acceptance
- Add Validation Commands section
- Add Notes section with any implementation considerations

### 3. Generate PROGRESS.md

Create `PROGRESS.md` in the project root, following the Ralph progress format:
- List all tasks as `[ ]` checkboxes organized by phase
- Set Phase to "1 of N"
- Set Last Task Completed to "None"
- Initialize empty Completed Tasks table
- Initialize Blockers as "None currently."

### 4. Update Status

Edit `specs/features/[feature-name]/status.md`:
- Change Status from `APPROVED` to `EXECUTING`
- Update Last Updated to current date
- Fill in Branch: `feature/[feature-name]`
- Fill in Implementation Plan: `IMPLEMENTATION_PLAN.md`
- Fill in Progress: `PROGRESS.md`
- Add entry to Status History: `APPROVED -> EXECUTING | Implementation started`

### 5. Create Output Directories

```bash
mkdir -p testing/manual testing/sql e2e/flows/[feature-name]
```

### 6. Initial Commit

```bash
git add IMPLEMENTATION_PLAN.md PROGRESS.md specs/features/[feature-name]/status.md
git commit -m "feat([feature-name]): initialize implementation plan and progress tracking"
```

---

## Implementation Loop

This is the core loop. Execute one task at a time, in order.

### For Each Task:

#### 1. Read Current State
Read `PROGRESS.md` and find the next `[ ]` (incomplete) task.

#### 2. Implement the Task
Write the code following these conventions:
- **TypeScript strict mode** — no `any` types, proper null handling
- **Service pattern** — return `{ data, error }` objects
- **Import paths** — use `@/` alias (e.g., `@/services/myService`)
- **Components** — functional components with typed props
- **Database** — follow existing migration patterns, include RLS policies
- **Error handling** — check `{ data, error }` returns, use toast for user feedback
- **Follow existing patterns** — look at similar code in the codebase for reference

#### 3. Validate
Run validation commands:

```bash
npm run typecheck
npm run lint
```

If the task added or modified test files:
```bash
npm test
```

**If validation fails**: fix the issues and re-validate. Do not proceed until validation passes.

#### 4. Update Progress
Edit `PROGRESS.md`:
- Mark the task as `[x]`
- Update "Last Task Completed" with the task name
- Update "Last Updated" with current timestamp
- Add a row to the Completed Tasks table with task name, timestamp, and any notes
- Update the Phase tracker if entering a new phase

#### 5. Commit
Stage only the files relevant to this task:

```bash
git add [specific files changed]
git commit -m "feat([feature-name]): [concise task description]"
```

Use conventional commit prefixes:
- `feat` — new feature code
- `fix` — bug fixes during implementation
- `chore` — config, migrations, non-code changes
- `test` — test files

#### 6. Check Session Length
If you've completed many tasks and the session is getting long (you're struggling with context), save state to PROGRESS.md and tell the user:

> Session checkpoint saved. To continue implementation, run:
> ```
> /execute [feature-name]
> ```

The resume mechanism (Check 1 detecting EXECUTING status) will pick up where you left off.

#### 7. Next Task
Return to step 1 and find the next incomplete task.

---

## Self-Test Pipeline

Run this AFTER all tasks in the Implementation Plan are complete.

### 1. Full Validation Suite

```bash
npm run typecheck
npm run lint
npm test
```

All three must pass. If any fail, fix the issues before proceeding.

### 2. Database Verification

**If Supabase MCP is available** (you can try `run_sql`):
- Verify new tables exist
- Verify new columns exist
- Verify RLS policies are in place
- Run a few test queries to confirm schema is correct

**If MCP is unavailable**:
- Verify migration files exist in `supabase/migrations/`
- Read the migration files and verify SQL syntax is correct
- Check that RLS policies are included

### 3. Generate Maestro E2E Flow

Create `e2e/flows/[feature-name]/[flow-name].yaml` following existing Maestro patterns.

Reference existing flows for patterns:
- Read `e2e/helpers/login-bypass.yaml` for auth setup
- Read an existing flow like `e2e/flows/discovery/save-restaurant.yaml` for interaction patterns

Structure:
```yaml
appId: com.troodie.troodie.com
---
# [Feature Name] - [Flow Description]
# Tests: [what this flow verifies]

# Auth setup
- runFlow: ../helpers/login-bypass.yaml

# Test steps
- tapOn: "[element]"
- assertVisible: "[element]"
- scrollUntilVisible:
    element: "[element]"
    direction: DOWN
- takeScreenshot: "[feature-name]-[step]"
```

### 4. Attempt E2E Execution (Best Effort)

```bash
maestro test e2e/flows/[feature-name]/[flow-name].yaml
```

If this fails because:
- Maestro is not installed → note as "E2E flow written but Maestro not installed"
- Simulator not running → note as "E2E flow written but simulator not running"
- Flow assertion fails → investigate and fix if possible, otherwise note the failure

This step is **best effort** — don't let it block completion.

---

## Generate Testing Artifacts

### 1. Manual Test Script

Write `testing/manual/[feature-name]-manual-test.md`:

```markdown
# Manual Test Script: [Feature Name]

> Feature: [feature-name]
> Spec: `specs/features/[feature-name]/spec.md`
> Date: [YYYY-MM-DD]

## Prerequisites

- [ ] Account type: [required account type]
- [ ] Test data: [any required setup]
- [ ] Environment: [dev/staging]

## Test Scenarios

### Scenario 1: [Happy Path Name]

**Steps:**
1. [Action]
2. [Action]
3. [Action]

**Expected Result:**
- [What should happen]
- [What should be visible]

**Verification SQL:**
```sql
SELECT ... FROM ... WHERE ...;
```

### Scenario 2: [Edge Case Name]

**Steps:**
1. ...

**Expected Result:**
- ...

### Scenario 3: [Error Case Name]

**Steps:**
1. ...

**Expected Result:**
- ...

## Cleanup

[Steps to reset test data after testing]
```

### 2. Verification SQL

Write `testing/sql/[feature-name]-verify.sql`:

```sql
-- Verification Queries: [Feature Name]
-- Run these to confirm the feature is working correctly
-- Date: [YYYY-MM-DD]

-- 1. [Check description]
SELECT ...;

-- 2. [Check description]
SELECT ...;

-- 3. [Check description]
SELECT ...;
```

### 3. Reset SQL

Write `testing/sql/[feature-name]-reset.sql`:

```sql
-- ⚠️  WARNING: This script DELETES test data. Review before running.
-- Reset Script: [Feature Name]
-- Date: [YYYY-MM-DD]

-- Delete in dependency order (child tables first)

-- 1. [Table/data description]
DELETE FROM ... WHERE ...;

-- 2. [Table/data description]
DELETE FROM ... WHERE ...;
```

---

## Finalization

### 1. Update Status

Edit `specs/features/[feature-name]/status.md`:
- Change Status from `EXECUTING` to `COMPLETE`
- Update Last Updated
- Add entry to Status History: `EXECUTING -> COMPLETE | Implementation finished`

### 2. Final Commit

```bash
git add testing/ e2e/flows/[feature-name]/ specs/features/[feature-name]/status.md PROGRESS.md IMPLEMENTATION_PLAN.md
git commit -m "feat([feature-name]): add testing artifacts and finalize implementation"
```

### 3. Print Execution Summary

Print a clear summary:

```
## Execution Summary: [feature-name]

**Branch**: feature/[feature-name]
**Commits**: [count]
**Status**: COMPLETE

### Files Created/Modified
- [list of files with status: created/modified]

### Validation Results
- TypeScript: ✅ Pass / ❌ Fail
- ESLint: ✅ Pass / ❌ Fail
- Jest: ✅ Pass / ❌ Fail
- DB Verification: ✅ Pass / ⚠️ Skipped (no MCP)
- Maestro E2E: ✅ Pass / ⚠️ Written but not executed / ❌ Fail

### Artifacts
- Implementation Plan: `IMPLEMENTATION_PLAN.md`
- Progress Log: `PROGRESS.md`
- Manual Test Script: `testing/manual/[feature-name]-manual-test.md`
- Verify SQL: `testing/sql/[feature-name]-verify.sql`
- Reset SQL: `testing/sql/[feature-name]-reset.sql`
- E2E Flow: `e2e/flows/[feature-name]/[flow].yaml`

### Next Steps
1. Review the branch: `git log --oneline feature/[feature-name]`
2. Run manual tests: `testing/manual/[feature-name]-manual-test.md`
3. Run E2E tests: `maestro test e2e/flows/[feature-name]/[flow].yaml`
4. Create PR: `/commit` or `gh pr create`
```

---

## Rules

1. **One task at a time** — never implement multiple tasks before validating and committing
2. **Validate before committing** — typecheck and lint must pass
3. **Specific git adds** — never use `git add .` or `git add -A`. Add specific files
4. **Follow existing patterns** — look at similar code in the codebase before writing new code
5. **Don't skip pre-flight** — if the spec isn't approved, STOP
6. **Resume gracefully** — if status is EXECUTING, pick up where you left off
7. **Best-effort testing** — write all test artifacts, execute what you can
8. **Ask when truly stuck** — use AskUserQuestion only if you hit a genuine blocker that the spec doesn't address. Don't ask for things you can figure out from the code
9. **Keep PROGRESS.md current** — it's the source of truth for resumption
