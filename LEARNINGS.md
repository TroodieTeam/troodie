# LEARNINGS.md

Accumulated knowledge from production debugging, E2E testing, and Supabase auth work.
Last updated: 2026-02-22.

---

## Supabase Auth Internals

### GoTrue Admin API is the Only Reliable Path

Auth user creation in Supabase production **must** go through the GoTrue Admin API. Direct SQL INSERT into `auth.users` bypasses GoTrue's internal bookkeeping:

1. `auth.identities` entries are not created (GoTrue's primary email lookup table)
2. Password hashing may use a format/cost factor GoTrue does not expect
3. `instance_id` defaults to NULL instead of `00000000-0000-0000-0000-000000000000`
4. Internal session management metadata is missing

**Admin API endpoint:**
```
POST https://<project-ref>.supabase.co/auth/v1/admin/users
Authorization: Bearer <service-role-key>

{
  "email": "user@example.com",
  "password": "password",
  "email_confirm": true,
  "user_metadata": { "name": "Display Name", "account_type": "creator" },
  "app_metadata": { "provider": "email", "providers": ["email"] }
}
```

### GoTrue Error Decoder

| Error Message | Root Cause | Fix |
|---|---|---|
| "Database error checking email" | Orphaned `auth.identities` entry referencing non-existent user | Delete orphaned identities for that email |
| "Database error loading user" | Corrupted `auth.users` entry (missing fields GoTrue expects) | Delete and recreate via Admin API |
| "Invalid login credentials" | `auth.users` created via SQL INSERT (no identities, wrong password format) | Delete and recreate via Admin API |
| "User not found" | No `auth.users` entry for the email | Create via Admin API |

**Debug step for any GoTrue 500:**
```sql
SELECT * FROM auth.identities WHERE identity_data->>'email' = 'the-problematic@email.com';
```
If entries reference non-existent `auth.users` IDs, delete them first.

### Dangerous Operations

- **Never** use `session_replication_role = replica` to delete auth entries. It bypasses FK constraints, leaving orphaned `auth.identities` entries that poison GoTrue's email lookup.
- **Never** INSERT directly into `auth.users` in production. Use the Admin API.
- `confirmed_at` on `auth.users` is a GENERATED column. Use `email_confirmed_at` instead if writing SQL (though Admin API is preferred).

---

## Test Data Architecture

### Isolation Mechanisms

- **Email domain**: All test accounts use `@bypass.com` (e.g., `prod-consumer1@bypass.com`)
- **`is_test_account`**: GENERATED column on `public.users` — computed from email pattern. Cannot be set via INSERT.
- **`is_test_restaurant`** / **`is_test_campaign`**: Boolean columns for test fixtures
- **`is_test_email()` / `current_user_is_test()`**: Database functions for RLS policies

### Deterministic UUID Scheme

| Prefix | Entity | Example |
|--------|--------|---------|
| `aa*` | Consumers | `aa111111-1111-4111-a111-111111111111` |
| `bb*` | Creators | `bb111111-1111-4111-a111-111111111111` |
| `cc*` | Businesses | `cc111111-1111-4111-a111-111111111111` |
| `dd*` | Restaurants | `dd111111-1111-4111-a111-111111111111` |
| `ee*` | Creator profiles | `ee111111-1111-4111-a111-111111111111` |
| `ff*` | Business profiles | `ff111111-1111-4111-a111-111111111111` |

### Setup Pattern

1. Create auth users via Admin API (`POST /auth/v1/admin/users`)
2. Create `public.users` and all application data via SQL (`scripts/run-prod-sql.js`)
3. Reset by running `data/test-data/prod/11-reset-robust-test-data.sql` (deletes in FK-respecting order)

---

## Maestro E2E Patterns

### Login Bypass (`e2e/helpers/login-bypass.yaml`)

- Clears app state and keychain for clean login
- Handles three Expo Dev Client launcher variants
- Types OTP digits one at a time (6 individual `inputText: "0"` calls) due to auto-advancing fields
- Dismisses the persistent location error toast after login
- Waits for "Your Boards" to confirm successful login

### Toast Handling

The iOS 26 simulator shows a persistent "Error getting current location" toast at the bottom of the screen (~90-97% Y), overlapping the tab bar. Call `runFlow: ../../helpers/dismiss-toast.yaml` before any tab bar interaction.

### Selector Strategy

- Prefer `testID` (`id:`) selectors
- `extendedWaitUntil: visible:` matches `accessibilityText`, which for `TouchableOpacity` elements concatenates all child `Text` content (e.g., "Explore CampaignsDiscover campaigns from local restaurants")
- Target standalone `Text` elements (section headers, screen titles) for reliable `visible:` matching

### Tab Bar Navigation (Point-Based)

Point-based taps avoid toast interference:
- Feed tab: `30%,97%`
- More tab: `90%,97%`

### More Screen Menu Positions (Creator Account)

| Y% | Menu Item |
|----|-----------|
| ~35% | Creator Profile |
| ~42% | Explore Campaigns |
| ~48% | My Campaigns |
| ~55% | My Deliverables |
| ~61% | Payments & Earnings |

### More Screen Menu Positions (Business Account)

| Y% | Menu Item |
|----|-----------|
| ~35% | Business Dashboard |
| ~42% | Manage Campaigns |
| ~48% | Discover Creators |
| ~55% | Campaign Analytics |
| ~61% | Restaurant Settings |

---

## Environment & Tooling

### Expo Env Loading Gotcha

`app.config.js` loads `.env.development` FIRST as the base for ALL profiles. `.env.production` only overrides variables it explicitly defines. Variables in `.env.development` not present in `.env.production` persist with their dev values (e.g., `EXPO_PUBLIC_TEST_AUTH_PASSWORD=000000`).

### Production SQL Runner (`scripts/run-prod-sql.js`)

- Uses Supabase Management API (`POST /v1/projects/{ref}/database/query`)
- Retrieves access token from macOS Keychain (set by `npx supabase login`)
- Falls back to `SUPABASE_ACCESS_TOKEN` env var
- Handles base64-encoded keychain tokens with `go-keyring-base64:` prefix
- 5-minute timeout for long-running scripts
- **Limitation**: SELECT results display poorly; RAISE NOTICE output is not captured

### E2E Debug Loop Performance

Each iteration (change SQL → run via `run-prod-sql.js` → verify via curl → run Maestro test → analyze screenshot) takes 3-5 minutes. Maestro tests take 60-90 seconds each (clearState + login + waits). Plan changes carefully to minimize iterations.
