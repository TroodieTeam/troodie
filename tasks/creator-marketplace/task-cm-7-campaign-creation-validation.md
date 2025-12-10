# Fix Campaign Creation Restaurant Validation

- Epic: CM (Creator Marketplace)
- Priority: Medium
- Estimate: 0.5 days
- Status: 🔴 Not Started
- Assignee: -
- Dependencies: -
- Reference: CREATOR_MARKETPLACE_REVIEW.md Section 3.9

## Overview

The campaign creation flow in `app/(tabs)/business/campaigns/create.tsx` lacks proper error handling when the business profile or restaurant query fails. This can cause silent failures where the campaign creation appears to work but no campaign is actually created.

## Business Value

- **Data Integrity**: Prevents orphaned or invalid campaigns
- **User Experience**: Clear feedback when something goes wrong
- **Support Reduction**: Users can self-diagnose issues

## Current Problem

```typescript
// Location: app/(tabs)/business/campaigns/create.tsx:98-118

const loadRestaurantData = async () => {
  try {
    if (!user?.id) return; // Silent return

    const { data: profile, error } = await supabase
      .from('business_profiles')
      .select(`restaurants (id, name)`)
      .eq('user_id', user.id)
      .single();

    if (error) throw error; // Caught but not surfaced to user
    setRestaurantData(profile?.restaurants);
  } catch (error) {
    console.error('Failed to load restaurant data:', error);
    // No user feedback!
  }
};

// Later in handleSubmit:
const handleSubmit = async () => {
  // ...
  if (!user?.id || !restaurantData?.id) return; // Silent failure
  // ...
};
```

**Problems:**
1. No loading state for restaurant data fetch
2. Silent failure if business profile not found
3. Silent failure if restaurant not linked
4. Submit button enabled even without restaurant data

## Acceptance Criteria (Gherkin)

```gherkin
Feature: Campaign Creation Validation
  As a restaurant owner
  I want clear feedback during campaign creation
  So that I know if something goes wrong

  Scenario: Restaurant data loaded successfully
    Given I am a verified restaurant owner
    And my business profile has a linked restaurant
    When I open campaign creation
    Then I see my restaurant name displayed
    And the form is ready for input

  Scenario: Business profile not found
    Given I am logged in
    But I don't have a business profile
    When I try to create a campaign
    Then I see "Please complete your business setup first"
    And I am redirected to business setup

  Scenario: Restaurant not linked
    Given I have a business profile
    But no restaurant is linked
    When I try to create a campaign
    Then I see "Please claim a restaurant first"
    And I see a "Claim Restaurant" button

  Scenario: Network error loading restaurant
    Given a network error occurs
    When restaurant data fails to load
    Then I see "Failed to load restaurant data"
    And I see a "Retry" button

  Scenario: Prevent submission without restaurant
    Given restaurant data failed to load
    When I try to submit the campaign
    Then the submit button is disabled
    And I see why I cannot submit
```

## Technical Implementation

### Updated Campaign Creation Screen

```typescript
// app/(tabs)/business/campaigns/create.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface RestaurantData {
  id: string;
  name: string;
}

type LoadingState = 'loading' | 'loaded' | 'error' | 'no_profile' | 'no_restaurant';

export default function CreateCampaign() {
  const router = useRouter();
  const { user } = useAuth();

  const [restaurantData, setRestaurantData] = useState<RestaurantData | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadRestaurantData();
  }, [user?.id]);

  const loadRestaurantData = async () => {
    setLoadingState('loading');
    setErrorMessage(null);

    try {
      if (!user?.id) {
        setLoadingState('error');
        setErrorMessage('Please sign in to create a campaign');
        return;
      }

      // Fetch business profile with restaurant
      const { data: profile, error: profileError } = await supabase
        .from('business_profiles')
        .select(`
          id,
          restaurant_id,
          verified,
          restaurants (
            id,
            name
          )
        `)
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          // No rows returned - no business profile
          setLoadingState('no_profile');
          setErrorMessage('Please complete your business setup to create campaigns');
          return;
        }
        throw profileError;
      }

      if (!profile.restaurant_id || !profile.restaurants) {
        setLoadingState('no_restaurant');
        setErrorMessage('Please claim a restaurant before creating campaigns');
        return;
      }

      if (!profile.verified) {
        setLoadingState('error');
        setErrorMessage('Your restaurant claim is pending verification');
        return;
      }

      // Successfully loaded
      setRestaurantData({
        id: profile.restaurants.id,
        name: profile.restaurants.name,
      });
      setLoadingState('loaded');

    } catch (error: any) {
      console.error('Failed to load restaurant data:', error);
      setLoadingState('error');
      setErrorMessage('Failed to load restaurant data. Please try again.');
    }
  };

  const handleSubmit = async () => {
    // Validate before submission
    if (!restaurantData?.id) {
      Alert.alert('Error', 'Restaurant data is missing. Please refresh and try again.');
      return;
    }

    if (!validateForm()) {
      Alert.alert('Incomplete', 'Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('campaigns')
        .insert({
          restaurant_id: restaurantData.id,
          owner_id: user!.id,
          // ... rest of form data
        });

      if (error) throw error;

      Alert.alert('Success', 'Campaign created successfully!', [
        { text: 'OK', onPress: () => router.replace('/business/campaigns') }
      ]);
    } catch (error: any) {
      console.error('Failed to create campaign:', error);
      Alert.alert('Error', 'Failed to create campaign. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Render loading state
  if (loadingState === 'loading') {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={DS.colors.primary} />
        <Text style={styles.loadingText}>Loading restaurant data...</Text>
      </SafeAreaView>
    );
  }

  // Render error states
  if (loadingState === 'no_profile') {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <AlertCircle size={48} color={DS.colors.warning} />
        <Text style={styles.errorTitle}>Business Setup Required</Text>
        <Text style={styles.errorMessage}>{errorMessage}</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/business/setup')}
        >
          <Text style={styles.buttonText}>Complete Setup</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.back()}
        >
          <Text style={styles.secondaryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (loadingState === 'no_restaurant') {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Store size={48} color={DS.colors.warning} />
        <Text style={styles.errorTitle}>No Restaurant Linked</Text>
        <Text style={styles.errorMessage}>{errorMessage}</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/restaurant/claim')}
        >
          <Text style={styles.buttonText}>Claim Restaurant</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.back()}
        >
          <Text style={styles.secondaryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (loadingState === 'error') {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <XCircle size={48} color={DS.colors.error} />
        <Text style={styles.errorTitle}>Something Went Wrong</Text>
        <Text style={styles.errorMessage}>{errorMessage}</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={loadRestaurantData}
        >
          <RefreshCw size={20} color="#fff" />
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.back()}
        >
          <Text style={styles.secondaryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Render form (only when loadingState === 'loaded')
  return (
    <SafeAreaView style={styles.container}>
      {/* Restaurant Header */}
      <View style={styles.restaurantHeader}>
        <Text style={styles.restaurantLabel}>Creating campaign for:</Text>
        <Text style={styles.restaurantName}>{restaurantData?.name}</Text>
      </View>

      {/* Rest of form... */}
      <ScrollView>
        {/* Step indicator, form fields, etc. */}
      </ScrollView>

      {/* Submit button - only enabled when data is valid */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!restaurantData || !validateForm()) && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={!restaurantData || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>
              {currentStep === totalSteps ? 'Create Campaign' : 'Next'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
```

### Files to Modify

1. **Update**: `app/(tabs)/business/campaigns/create.tsx`
2. **Optional**: Create reusable `BusinessGuard` component for other business screens

### Business Guard Component (Optional)

```typescript
// components/business/BusinessGuard.tsx

interface BusinessGuardProps {
  children: React.ReactNode;
  requireRestaurant?: boolean;
  requireVerified?: boolean;
}

export function BusinessGuard({
  children,
  requireRestaurant = true,
  requireVerified = true,
}: BusinessGuardProps) {
  const { businessProfile, loading, error } = useBusinessProfile();

  if (loading) return <LoadingScreen />;

  if (!businessProfile) {
    return <NoBusinessProfileScreen />;
  }

  if (requireRestaurant && !businessProfile.restaurant_id) {
    return <NoRestaurantScreen />;
  }

  if (requireVerified && !businessProfile.verified) {
    return <PendingVerificationScreen />;
  }

  return <>{children}</>;
}

// Usage in screens:
export default function CreateCampaign() {
  return (
    <BusinessGuard requireRestaurant requireVerified>
      <CampaignCreationForm />
    </BusinessGuard>
  );
}
```

## Definition of Done

- [ ] Loading state shown while fetching restaurant data
- [ ] Clear error message when business profile missing
- [ ] Clear error message when restaurant not linked
- [ ] Redirect options to fix issues (setup, claim)
- [ ] Retry button for network errors
- [ ] Submit button disabled without valid restaurant
- [ ] Restaurant name displayed in header
- [ ] All error states have clear user actions
- [ ] Manual test: all error scenarios

## Notes

- Reference: CREATOR_MARKETPLACE_REVIEW.md Section 3.9
- Consider extracting BusinessGuard for reuse across business screens
- Future: Add form draft saving to prevent data loss
