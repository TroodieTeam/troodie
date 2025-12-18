# Fix Creator Profile Creation Race Condition

- Epic: CM (Creator Marketplace)
- Priority: Critical
- Estimate: 1 day
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: -
- Reference: CREATOR_MARKETPLACE_REVIEW.md Section 3.2

## Overview

Fix the race condition in creator onboarding where account upgrade and profile creation are separate operations. If the profile creation fails after the account is upgraded, the user is left in a broken state (account_type = 'creator' but no creator_profiles record).

## Business Value

- **User Impact**: Users stuck in broken state cannot access creator features and cannot re-onboard
- **Support Cost**: Each broken user requires manual database intervention
- **Trust**: Failed onboarding damages user confidence in the platform

## Current Problem

```typescript
// Location: components/creator/CreatorOnboardingV1.tsx:122-178

// Step 1: Upgrade account (succeeds)
const upgradeResult = await upgradeAccount('creator', {...});

// Step 2: Create profile (can fail) - NO ROLLBACK
const { error: profileError } = await supabase
  .from('creator_profiles')
  .insert({...});
```

## Acceptance Criteria (Gherkin)

```gherkin
Feature: Atomic Creator Onboarding
  As a consumer upgrading to creator
  I want the upgrade to be all-or-nothing
  So that I never get stuck in a broken state

  Scenario: Successful creator onboarding
    Given I am a consumer completing onboarding
    When I submit my creator profile
    Then my account_type becomes 'creator'
    And a creator_profiles record is created
    And I can access creator features

  Scenario: Profile creation fails
    Given I am a consumer completing onboarding
    When profile creation fails
    Then my account_type remains 'consumer'
    And no partial creator_profiles record exists
    And I see an error message with retry option
    And I can attempt onboarding again

  Scenario: Network failure during onboarding
    Given I am completing creator onboarding
    When network fails mid-transaction
    Then I remain a consumer
    And I can retry from the beginning
```

## Technical Implementation

### Option A: Database Function (Recommended)

Create a PostgreSQL function that handles both operations atomically:

```sql
-- supabase/migrations/YYYYMMDD_atomic_creator_upgrade.sql

CREATE OR REPLACE FUNCTION upgrade_to_creator(
  p_user_id UUID,
  p_display_name TEXT,
  p_bio TEXT,
  p_location TEXT,
  p_specialties TEXT[]
) RETURNS JSON AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  -- Start transaction (implicit in function)

  -- Update user account type
  UPDATE users
  SET
    account_type = 'creator',
    is_creator = true,
    account_upgraded_at = NOW()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Create creator profile
  INSERT INTO creator_profiles (
    user_id,
    display_name,
    bio,
    location,
    food_specialties,
    specialties,
    verification_status,
    instant_approved,
    portfolio_uploaded
  ) VALUES (
    p_user_id,
    p_display_name,
    COALESCE(p_bio, 'Food lover and content creator'),
    COALESCE(p_location, 'Charlotte'),
    p_specialties,
    p_specialties,
    'verified',
    true,
    true
  )
  RETURNING id INTO v_profile_id;

  -- Return success with profile ID
  RETURN json_build_object(
    'success', true,
    'profile_id', v_profile_id
  );

EXCEPTION WHEN OTHERS THEN
  -- Rollback happens automatically
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Option B: Application-Level Transaction

If database function not preferred, implement rollback in service:

```typescript
// services/creatorUpgradeService.ts

export async function upgradeToCreator(
  userId: string,
  profileData: CreatorProfileData
): Promise<{ success: boolean; error?: string; profileId?: string }> {

  // Step 1: Upgrade account
  const { error: upgradeError } = await supabase
    .from('users')
    .update({
      account_type: 'creator',
      is_creator: true,
      account_upgraded_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (upgradeError) {
    return { success: false, error: 'Failed to upgrade account' };
  }

  // Step 2: Create profile
  const { data: profile, error: profileError } = await supabase
    .from('creator_profiles')
    .insert({
      user_id: userId,
      ...profileData,
    })
    .select('id')
    .single();

  if (profileError) {
    // ROLLBACK: Revert account upgrade
    await supabase
      .from('users')
      .update({
        account_type: 'consumer',
        is_creator: false,
        account_upgraded_at: null,
      })
      .eq('id', userId);

    return { success: false, error: 'Failed to create profile. Please try again.' };
  }

  return { success: true, profileId: profile.id };
}
```

### Files to Modify

1. **New Migration**: `supabase/migrations/YYYYMMDD_atomic_creator_upgrade.sql`
2. **New Service**: `services/creatorUpgradeService.ts`
3. **Update Component**: `components/creator/CreatorOnboardingV1.tsx:107-230`
4. **Update Context**: `contexts/AuthContext.tsx` - Add new upgrade method

### UI Changes

- Add loading state during upgrade
- Add clear error message with retry button
- Log failed attempts for debugging

## Definition of Done

- [ ] Database function created and tested
- [ ] CreatorOnboardingV1 uses atomic upgrade
- [ ] Rollback tested by simulating profile creation failure
- [ ] Error message shows retry option
- [ ] No orphaned users (account_type='creator' without profile)
- [ ] Unit tests for upgrade service
- [ ] Manual test: complete onboarding flow end-to-end

## Test Cases

```typescript
describe('upgradeToCreator', () => {
  it('creates both user upgrade and profile atomically', async () => {
    // ...
  });

  it('rolls back user upgrade if profile creation fails', async () => {
    // Mock profile creation to fail
    // Verify user remains consumer
  });

  it('handles network timeout gracefully', async () => {
    // ...
  });
});
```

## Notes

- Related issue in `CREATOR_MARKETPLACE_REVIEW.md` Section 3.2
- Consider adding a recovery endpoint for support to fix broken accounts
- Monitor for orphaned accounts in production via SQL query:
  ```sql
  SELECT u.* FROM users u
  LEFT JOIN creator_profiles cp ON cp.user_id = u.id
  WHERE u.account_type = 'creator' AND cp.id IS NULL;
  ```
