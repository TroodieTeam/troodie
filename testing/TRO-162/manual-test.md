# Manual Test Script: Claim Approval Refresh

> Feature: claim-approval-refresh (TRO-162)
> Date: 2026-02-22

## Prerequisites

- Consumer account with a pending restaurant claim
- Admin account to approve claims
- Two devices/sessions (or one device + Supabase dashboard)

## Scenario 1: Realtime — Approve Claim, App Reflects Business Status

1. Log in as consumer with pending claim on Device A
2. On Device B (or admin panel), approve the restaurant claim
3. Within seconds, Device A should show updated account type (business)
4. More tab should now show "Business Tools" section instead of "Claim Status"
5. No logout/login required

## Scenario 2: AppState — Background/Foreground Refresh

1. Log in as consumer with pending claim
2. Send app to background (press Home)
3. Approve the claim via admin panel
4. Bring app back to foreground
5. Account info should refresh (30s throttle — wait if needed)
6. Verify More tab reflects business status

## Scenario 3: AppState Throttle — 30-Second Window

1. Log in as any account
2. Send app to background and bring back quickly (< 30s)
3. Verify `refreshAccountInfo` is NOT called (throttled)
4. Wait 30+ seconds, background/foreground again
5. Verify refresh IS called (check console log: `[AuthContext] Account type changed`)

## Scenario 4: Realtime Subscription Filter

1. Log in as user A
2. Update a DIFFERENT user's account_type in Supabase
3. Verify user A's app does NOT react (channel filter: `id=eq.${user.id}`)

## Verification SQL

```sql
-- Verify users table is in supabase_realtime publication
SELECT * FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename = 'users'
  AND schemaname = 'public';

-- Check user's account_type after approval
SELECT id, account_type, updated_at
FROM users
WHERE id = '<user_id>';
```
