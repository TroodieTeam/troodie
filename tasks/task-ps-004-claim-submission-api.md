# Update Claim Submission API for Pending State

- Epic: PS (Pending State)
- Priority: High
- Estimate: 1 day
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: PS-001, PS-003

## Overview
Update the restaurant claim submission API to create claims in pending state, preventing automatic restaurant ownership until admin approval.

## Business Value
- Prevents fraudulent restaurant claims
- Protects legitimate restaurant owners
- Ensures data quality and accuracy
- Reduces support burden from incorrect claims

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Restaurant Claim Submission with Pending State
  As a user claiming a restaurant
  I want my claim to be reviewed
  So that ownership is properly verified

  Scenario: Submit new restaurant claim
    Given I am an authenticated user
    And I have not claimed this restaurant
    When I submit a claim with valid information
    Then the claim should be created with "pending" status
    And I should see a success message about review
    And the restaurant should not be linked to me yet

  Scenario: Prevent duplicate pending claims
    Given I have a pending claim for a restaurant
    When I try to submit another claim for the same restaurant
    Then I should receive an error message
    And no new claim should be created

  Scenario: Check claim status
    Given I have submitted a claim
    When I check my claim status
    Then I should see the current status
    And any review notes if rejected
    And estimated review time if pending

  Scenario: Claim approval updates ownership
    Given my claim is approved by an admin
    When the approval is processed
    Then the restaurant should be linked to my account
    And I should gain owner permissions
    And I should receive a notification
```

## Technical Implementation

### API Endpoints

1. **Submit Restaurant Claim**:
```typescript
// POST /api/claims/restaurant
interface SubmitClaimRequest {
  restaurant_id: string;
  ownership_proof_type: 'business_license' | 'utility_bill' | 'lease' | 'other';
  ownership_proof_url?: string;
  business_email?: string;
  business_phone?: string;
  additional_notes?: string;
}

interface SubmitClaimResponse {
  claim_id: string;
  status: 'pending';
  submitted_at: string;
  estimated_review_time: string; // e.g., "24-48 hours"
  message: string;
}

// Implementation
export async function submitRestaurantClaim(req: SubmitClaimRequest): Promise<SubmitClaimResponse> {
  const user = await getAuthenticatedUser();

  // Check for existing claims
  const existingClaim = await supabase
    .from('restaurant_claims')
    .select('*')
    .eq('user_id', user.id)
    .eq('restaurant_id', req.restaurant_id)
    .in('status', ['pending', 'approved'])
    .single();

  if (existingClaim.data) {
    throw new Error('You already have a claim for this restaurant');
  }

  // Check if restaurant is already claimed
  const restaurant = await supabase
    .from('restaurants')
    .select('owner_id')
    .eq('id', req.restaurant_id)
    .single();

  if (restaurant.data?.owner_id) {
    throw new Error('This restaurant has already been claimed');
  }

  // Create pending claim
  const claim = await supabase
    .from('restaurant_claims')
    .insert({
      user_id: user.id,
      restaurant_id: req.restaurant_id,
      status: 'pending',
      ownership_proof_type: req.ownership_proof_type,
      ownership_proof_url: req.ownership_proof_url,
      business_email: req.business_email,
      business_phone: req.business_phone,
      additional_notes: req.additional_notes,
      submitted_at: new Date().toISOString()
    })
    .select()
    .single();

  // Log the action
  await logReviewAction({
    entity_type: 'restaurant_claim',
    entity_id: claim.data.id,
    action: 'created',
    actor_id: user.id
  });

  return {
    claim_id: claim.data.id,
    status: 'pending',
    submitted_at: claim.data.submitted_at,
    estimated_review_time: '24-48 hours',
    message: 'Your claim has been submitted and is pending review. We\'ll notify you once it\'s processed.'
  };
}
```

2. **Check Claim Status**:
```typescript
// GET /api/claims/restaurant/:id/status
interface ClaimStatusResponse {
  claim_id: string;
  restaurant_name: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at?: string;
  rejection_reason?: string;
  review_notes?: string;
  can_resubmit: boolean;
}

export async function getClaimStatus(claimId: string): Promise<ClaimStatusResponse> {
  const user = await getAuthenticatedUser();

  const claim = await supabase
    .from('restaurant_claims')
    .select(`
      *,
      restaurant:restaurants(name, address)
    `)
    .eq('id', claimId)
    .eq('user_id', user.id)
    .single();

  if (!claim.data) {
    throw new Error('Claim not found');
  }

  return {
    claim_id: claim.data.id,
    restaurant_name: claim.data.restaurant.name,
    status: claim.data.status,
    submitted_at: claim.data.submitted_at,
    reviewed_at: claim.data.reviewed_at,
    rejection_reason: claim.data.rejection_reason,
    review_notes: claim.data.review_notes,
    can_resubmit: claim.data.status === 'rejected'
  };
}
```

3. **List My Claims**:
```typescript
// GET /api/claims/restaurant/my-claims
interface MyClaimsResponse {
  claims: Array<{
    claim_id: string;
    restaurant_name: string;
    status: string;
    submitted_at: string;
    reviewed_at?: string;
  }>;
  total: number;
}

export async function getMyRestaurantClaims(): Promise<MyClaimsResponse> {
  const user = await getAuthenticatedUser();

  const claims = await supabase
    .from('restaurant_claims')
    .select(`
      id,
      status,
      submitted_at,
      reviewed_at,
      restaurant:restaurants(name)
    `)
    .eq('user_id', user.id)
    .order('submitted_at', { ascending: false });

  return {
    claims: claims.data.map(claim => ({
      claim_id: claim.id,
      restaurant_name: claim.restaurant.name,
      status: claim.status,
      submitted_at: claim.submitted_at,
      reviewed_at: claim.reviewed_at
    })),
    total: claims.data.length
  };
}
```

### Frontend Integration
```typescript
// hooks/useRestaurantClaim.ts
export function useSubmitClaim() {
  return useMutation({
    mutationFn: submitRestaurantClaim,
    onSuccess: (data) => {
      toast.success('Claim submitted successfully! We\'ll review it within 24-48 hours.');
      // Navigate to claim status page
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });
}
```

## Definition of Done
- [ ] API endpoints created and tested
- [ ] Pending state properly set on submission
- [ ] Duplicate claim prevention working
- [ ] Status checking endpoint functional
- [ ] Frontend integration complete
- [ ] Error handling comprehensive
- [ ] Loading states implemented
- [ ] Success/error messages clear

## Notes
- Consider adding file upload for ownership proof
- May need rate limiting to prevent spam claims
- Future: Add claim withdrawal/cancellation feature