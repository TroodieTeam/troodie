# Fix Campaign Application creator_id Lookup

- Epic: CM (Creator Marketplace)
- Priority: High
- Estimate: 0.5 days
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: -
- Reference: CREATOR_MARKETPLACE_REVIEW.md Section 3.5

## Overview

Campaign applications require `creator_profiles.id` (not `users.id`) due to RLS policies. Current implementation may fail silently when the creator_id lookup is missing or incorrect, causing applications to fail without clear error messages.

## Business Value

- **Conversion**: Failed applications mean lost creator engagement
- **Support**: Silent failures generate support tickets
- **Trust**: Creators lose confidence when features don't work

## Current Problem

The `campaign_applications` table references `creator_profiles(id)`:

```sql
-- From migration
CREATE TABLE campaign_applications (
  creator_id UUID REFERENCES creator_profiles(id) ON DELETE CASCADE,
  -- ...
);

-- RLS Policy requires creator_profiles.id
CREATE POLICY "Creators can view their applications" ON campaign_applications
  FOR SELECT USING (
    creator_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid())
  );
```

When applying to campaigns, the code must:
1. Get current user's `creator_profiles.id` (not `users.id`)
2. Use that ID in the application insert
3. Handle case where creator profile doesn't exist

## Acceptance Criteria (Gherkin)

```gherkin
Feature: Campaign Application Submission
  As a creator
  I want to apply to campaigns reliably
  So that I can participate in marketing opportunities

  Scenario: Successful application submission
    Given I am a verified creator
    And I have a creator_profiles record
    When I apply to a campaign
    Then my application is saved with correct creator_id
    And I see a success confirmation

  Scenario: Creator profile missing
    Given I am logged in as a creator (users.is_creator = true)
    But I don't have a creator_profiles record
    When I try to apply to a campaign
    Then I see error "Please complete your creator profile first"
    And I am redirected to profile setup

  Scenario: Application fails due to RLS
    Given I try to apply with incorrect creator_id
    When the insert is attempted
    Then I see a clear error message
    And the failure is logged for debugging
```

## Technical Implementation

### 1. Create Campaign Application Service

```typescript
// services/campaignApplicationService.ts

import { supabase } from '@/lib/supabase';

interface ApplyToCampaignParams {
  campaignId: string;
  proposedRateCents: number;
  proposedDeliverables: string;
  coverLetter: string;
}

interface ApplicationResult {
  success: boolean;
  applicationId?: string;
  error?: string;
  errorCode?: 'NO_PROFILE' | 'ALREADY_APPLIED' | 'CAMPAIGN_CLOSED' | 'RLS_ERROR' | 'UNKNOWN';
}

export async function applyToCampaign(params: ApplyToCampaignParams): Promise<ApplicationResult> {
  try {
    // Step 1: Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated', errorCode: 'UNKNOWN' };
    }

    // Step 2: Get creator profile ID (CRITICAL)
    const { data: creatorProfile, error: profileError } = await supabase
      .from('creator_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !creatorProfile) {
      return {
        success: false,
        error: 'Please complete your creator profile first',
        errorCode: 'NO_PROFILE',
      };
    }

    // Step 3: Check for existing application
    const { data: existing } = await supabase
      .from('campaign_applications')
      .select('id')
      .eq('campaign_id', params.campaignId)
      .eq('creator_id', creatorProfile.id)
      .single();

    if (existing) {
      return {
        success: false,
        error: 'You have already applied to this campaign',
        errorCode: 'ALREADY_APPLIED',
      };
    }

    // Step 4: Verify campaign is still accepting applications
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('status, max_applications')
      .eq('id', params.campaignId)
      .single();

    if (!campaign || campaign.status !== 'active') {
      return {
        success: false,
        error: 'This campaign is no longer accepting applications',
        errorCode: 'CAMPAIGN_CLOSED',
      };
    }

    // Step 5: Submit application with CORRECT creator_id
    const { data: application, error: insertError } = await supabase
      .from('campaign_applications')
      .insert({
        campaign_id: params.campaignId,
        creator_id: creatorProfile.id, // <-- creator_profiles.id, NOT user.id
        proposed_rate_cents: params.proposedRateCents,
        proposed_deliverables: params.proposedDeliverables,
        cover_letter: params.coverLetter,
        status: 'pending',
        applied_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Application insert error:', insertError);

      // Check for RLS violation
      if (insertError.code === '42501') {
        return {
          success: false,
          error: 'Permission denied. Please ensure your creator profile is complete.',
          errorCode: 'RLS_ERROR',
        };
      }

      return { success: false, error: 'Failed to submit application', errorCode: 'UNKNOWN' };
    }

    return { success: true, applicationId: application.id };
  } catch (error: any) {
    console.error('Campaign application error:', error);
    return { success: false, error: error.message, errorCode: 'UNKNOWN' };
  }
}

// Helper hook for components
export function useCreatorProfileId() {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfileId() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('creator_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        setError('Creator profile not found');
      } else {
        setProfileId(profile.id);
      }
      setLoading(false);
    }

    fetchProfileId();
  }, []);

  return { profileId, loading, error };
}
```

### 2. Update Campaign Application UI

```typescript
// app/creator/campaigns/apply.tsx (or similar)

import { applyToCampaign } from '@/services/campaignApplicationService';

const handleApply = async () => {
  setLoading(true);

  const result = await applyToCampaign({
    campaignId,
    proposedRateCents: rateInCents,
    proposedDeliverables: deliverables,
    coverLetter: coverLetter,
  });

  if (result.success) {
    Toast.show({ type: 'success', text1: 'Application submitted!' });
    router.back();
  } else {
    // Handle specific error codes
    switch (result.errorCode) {
      case 'NO_PROFILE':
        Alert.alert(
          'Profile Required',
          'Please complete your creator profile before applying.',
          [{ text: 'Setup Profile', onPress: () => router.push('/creator/profile/setup') }]
        );
        break;
      case 'ALREADY_APPLIED':
        Toast.show({ type: 'info', text1: result.error });
        break;
      default:
        Toast.show({ type: 'error', text1: result.error || 'Application failed' });
    }
  }

  setLoading(false);
};
```

### Files to Create/Modify

1. **New Service**: `services/campaignApplicationService.ts`
2. **New Hook**: `hooks/useCreatorProfileId.ts`
3. **Update**: Campaign application screens to use new service
4. **Update**: Error handling in application UI

## Definition of Done

- [ ] Campaign application service created with proper creator_id lookup
- [ ] All application submissions use creator_profiles.id
- [ ] Clear error messages for missing profile
- [ ] Redirect to profile setup when needed
- [ ] Existing application check prevents duplicates
- [ ] RLS errors handled gracefully
- [ ] Unit tests for application service
- [ ] Manual test: apply to campaign as creator

## Notes

- Reference: CREATOR_MARKETPLACE_REVIEW.md Section 3.5
- The `creator_id` field must be `creator_profiles.id`, not `users.id`
- Always fetch creator profile before any campaign-related operations
- Consider caching creator_profiles.id in auth context for performance
