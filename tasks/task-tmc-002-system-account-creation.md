# Troodie-Managed Campaigns: System Account Creation

- Epic: TMC (Troodie-Managed Campaigns)
- Priority: Critical
- Estimate: 0.5 days
- Status: 🟡 Needs Review
- Assignee: -
- Dependencies: TMC-001 (Database Schema Setup)

## Overview
Create the foundational Troodie system account infrastructure including a system user, official restaurant profile, and business profile. This account will be used to create and manage all Troodie-managed campaigns as a "virtual restaurant" to solve the creator cold-start problem.

## Business Value
- Enables platform to immediately create creator opportunities
- Establishes official Troodie brand presence in marketplace
- Provides foundation for all platform-managed campaigns
- Allows transparent identification of Troodie vs restaurant campaigns
- Critical for MVP launch with limited restaurant supply

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Troodie System Account Creation
  As a platform administrator
  I want a Troodie system account with proper permissions
  So that we can create and manage platform campaigns

  Scenario: Create Troodie system user
    Given the database schema has been updated (TMC-001)
    When I run the system account creation script
    Then a user account with email "kouame@troodieapp.com" is created
    And the user has role 'admin'
    And the user has account_type 'business'
    And the user is marked as is_verified=true

  Scenario: Create Troodie official restaurant
    Given the Troodie system user exists
    When the restaurant profile is created
    Then a restaurant named "Troodie Community" exists
    And it has is_platform_managed=true
    And it has managed_by='troodie'
    And it has a professional description
    And it has proper location data (Charlotte, NC)

  Scenario: Create business profile for Troodie
    Given the Troodie restaurant exists
    When the business profile is created
    Then a business_profiles record links the user to the restaurant
    And the business profile has proper admin permissions
    And the business can create campaigns

  Scenario: Verify system account permissions
    Given the Troodie system account is fully set up
    When I query the account capabilities
    Then the account can create campaigns
    And the account can manage campaign applications
    And the account can view all platform_managed_campaigns data
    And RLS policies allow proper access
```

## Technical Implementation

### Database Seed Script
Create: `supabase/seeds/create_troodie_system_account.sql`

```sql
-- ================================================================
-- TROODIE SYSTEM ACCOUNT CREATION
-- ================================================================
-- Creates the official Troodie system account for platform-managed campaigns
-- Run after TMC-001 migration
-- Date: 2025-10-12
-- ================================================================

-- ================================================================
-- STEP 1: CREATE SYSTEM USER
-- ================================================================
-- Note: In production, this should be created via Supabase Auth UI or API
-- For development/testing, we'll insert directly

-- Generate a UUID for the Troodie system user
DO $$
DECLARE
  troodie_user_id UUID := '00000000-0000-0000-0000-000000000001'; -- Fixed UUID for consistency
  troodie_restaurant_id UUID := '00000000-0000-0000-0000-000000000002'; -- Fixed UUID for consistency
BEGIN

  -- Check if user already exists in auth.users (this table may not be directly writable)
  -- In practice, create this user via Supabase dashboard or auth API

  -- Insert into users table
  INSERT INTO users (
    id,
    email,
    username,
    full_name,
    account_type,
    role,
    is_verified,
    bio,
    profile_image_url,
    created_at,
    updated_at
  ) VALUES (
    troodie_user_id,
    'kouame@troodieapp.com',
    'troodie_official',
    'Troodie',
    'business',
    'admin',
    TRUE,
    'Official Troodie campaigns, challenges, and creator opportunities. Building the future of food content together!',
    'https://troodie.com/assets/troodie-logo-round.png', -- Update with actual CDN URL
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    account_type = 'business',
    role = 'admin',
    is_verified = TRUE,
    updated_at = NOW();

  RAISE NOTICE 'Created/updated Troodie system user: %', troodie_user_id;

  -- ================================================================
  -- STEP 2: CREATE TROODIE OFFICIAL RESTAURANT
  -- ================================================================
  INSERT INTO restaurants (
    id,
    name,
    description,
    address,
    city,
    state,
    zip_code,
    country,
    phone,
    website,
    cuisine_type,
    price_range,
    is_platform_managed,
    managed_by,
    profile_image_url,
    created_at,
    updated_at
  ) VALUES (
    troodie_restaurant_id,
    'Troodie Community',
    'The official home for Troodie-managed campaigns, community challenges, and creator opportunities. We partner with restaurants and brands to bring you exciting content creation opportunities across Charlotte and beyond.',
    '123 Innovation Way', -- Update with actual address if needed
    'Charlotte',
    'NC',
    '28202',
    'USA',
    '(704) 555-0100', -- Update with actual phone if needed
    'https://www.troodieapp.com/',
    ARRAY['Community', 'Content Creation'], -- Custom cuisine types
    '$$',
    TRUE,
    'troodie',
    'https://troodie.com/assets/troodie-community-cover.png', -- Update with actual CDN URL
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    is_platform_managed = TRUE,
    managed_by = 'troodie',
    updated_at = NOW();

  RAISE NOTICE 'Created/updated Troodie official restaurant: %', troodie_restaurant_id;

  -- ================================================================
  -- STEP 3: CREATE BUSINESS PROFILE
  -- ================================================================
  INSERT INTO business_profiles (
    user_id,
    restaurant_id,
    position,
    verified_owner,
    can_create_campaigns,
    can_manage_staff,
    created_at,
    updated_at
  ) VALUES (
    troodie_user_id,
    troodie_restaurant_id,
    'Platform Administrator',
    TRUE,
    TRUE,
    TRUE,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id, restaurant_id) DO UPDATE SET
    verified_owner = TRUE,
    can_create_campaigns = TRUE,
    can_manage_staff = TRUE,
    updated_at = NOW();

  RAISE NOTICE 'Created/updated business profile linking user to restaurant';

  -- ================================================================
  -- STEP 4: SET NOTIFICATION PREFERENCES
  -- ================================================================
  INSERT INTO notification_preferences (
    user_id,
    push_enabled,
    email_enabled,
    campaign_updates,
    creator_applications,
    created_at,
    updated_at
  ) VALUES (
    troodie_user_id,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    campaign_updates = TRUE,
    creator_applications = TRUE,
    updated_at = NOW();

  RAISE NOTICE 'Set notification preferences for system account';

  -- ================================================================
  -- SUCCESS MESSAGE
  -- ================================================================
  RAISE NOTICE '';
  RAISE NOTICE '✅ TROODIE SYSTEM ACCOUNT CREATED SUCCESSFULLY!';
  RAISE NOTICE '';
  RAISE NOTICE 'System User ID: %', troodie_user_id;
  RAISE NOTICE 'Restaurant ID: %', troodie_restaurant_id;
  RAISE NOTICE 'Email: kouame@troodieapp.com';
  RAISE NOTICE 'Username: troodie_official';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Create auth user in Supabase Auth dashboard with email kouame@troodieapp.com';
  RAISE NOTICE '2. Use the UUID: % as the auth user ID', troodie_user_id;
  RAISE NOTICE '3. Set a secure password for the account';
  RAISE NOTICE '4. Verify admin access works correctly';
  RAISE NOTICE '5. Proceed to TMC-003 (Admin Campaign Creation UI)';
  RAISE NOTICE '';

END $$;
```

### TypeScript Constants
Create/Update: `constants/systemAccounts.ts`

```typescript
/**
 * System account constants for Troodie platform accounts
 * These UUIDs must match the seeded database values
 */

export const TROODIE_SYSTEM_ACCOUNT = {
  USER_ID: '00000000-0000-0000-0000-000000000001',
  EMAIL: 'kouame@troodieapp.com',
  USERNAME: 'troodie_official',
  FULL_NAME: 'Troodie',
} as const;

export const TROODIE_RESTAURANT = {
  ID: '00000000-0000-0000-0000-000000000002',
  NAME: 'Troodie Community',
  SLUG: 'troodie-community',
} as const;

/**
 * Check if a user ID is a Troodie system account
 */
export function isTroodieSystemAccount(userId: string): boolean {
  return userId === TROODIE_SYSTEM_ACCOUNT.USER_ID;
}

/**
 * Check if a restaurant ID is the Troodie official restaurant
 */
export function isTroodieRestaurant(restaurantId: string): boolean {
  return restaurantId === TROODIE_RESTAURANT.ID;
}

/**
 * Check if a campaign is Troodie-managed based on source
 */
export function isTroodieCampaign(campaignSource: string): boolean {
  return campaignSource !== 'restaurant';
}
```

### Service Helper
Create: `services/systemAccountService.ts`

```typescript
import { supabase } from '@/lib/supabase';
import { TROODIE_SYSTEM_ACCOUNT, TROODIE_RESTAURANT } from '@/constants/systemAccounts';

/**
 * Service for managing Troodie system accounts
 */

/**
 * Verify that the Troodie system account exists and is properly configured
 */
export async function verifySystemAccount() {
  try {
    // Check user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, account_type, role, is_verified')
      .eq('id', TROODIE_SYSTEM_ACCOUNT.USER_ID)
      .single();

    if (userError || !user) {
      return {
        success: false,
        error: 'Troodie system user not found',
        details: userError,
      };
    }

    // Check restaurant exists
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, name, is_platform_managed, managed_by')
      .eq('id', TROODIE_RESTAURANT.ID)
      .single();

    if (restaurantError || !restaurant) {
      return {
        success: false,
        error: 'Troodie restaurant not found',
        details: restaurantError,
      };
    }

    // Check business profile exists
    const { data: businessProfile, error: profileError } = await supabase
      .from('business_profiles')
      .select('user_id, restaurant_id, can_create_campaigns')
      .eq('user_id', TROODIE_SYSTEM_ACCOUNT.USER_ID)
      .eq('restaurant_id', TROODIE_RESTAURANT.ID)
      .single();

    if (profileError || !businessProfile) {
      return {
        success: false,
        error: 'Troodie business profile not found',
        details: profileError,
      };
    }

    // Verify configuration
    const isValidConfig =
      user.account_type === 'business' &&
      user.role === 'admin' &&
      user.is_verified === true &&
      restaurant.is_platform_managed === true &&
      restaurant.managed_by === 'troodie' &&
      businessProfile.can_create_campaigns === true;

    if (!isValidConfig) {
      return {
        success: false,
        error: 'Troodie system account configuration is invalid',
        details: { user, restaurant, businessProfile },
      };
    }

    return {
      success: true,
      data: {
        user,
        restaurant,
        businessProfile,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to verify system account',
      details: error,
    };
  }
}

/**
 * Get the Troodie system account details
 */
export async function getTroodieSystemAccount() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        business_profiles!inner (
          *,
          restaurants!inner (
            *
          )
        )
      `)
      .eq('id', TROODIE_SYSTEM_ACCOUNT.USER_ID)
      .single();

    if (error) {
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Check if the current user is an admin who can manage platform campaigns
 */
export async function canManagePlatformCampaigns(userId: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return false;
    }

    return data.role === 'admin';
  } catch (error) {
    return false;
  }
}
```

### Admin Verification Screen (React Native)
Create: `app/admin/system-account-status.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { CheckCircle, XCircle, RefreshCw, ArrowLeft } from 'lucide-react-native';
import { verifySystemAccount, getTroodieSystemAccount } from '@/services/systemAccountService';

/**
 * Admin screen to verify Troodie system account setup
 * Accessible only to admin users
 */
export default function SystemAccountStatusScreen() {
  const [loading, setLoading] = useState(true);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [accountDetails, setAccountDetails] = useState<any>(null);

  useEffect(() => {
    loadSystemAccountStatus();
  }, []);

  const loadSystemAccountStatus = async () => {
    setLoading(true);

    // Verify system account setup
    const verifyResult = await verifySystemAccount();
    setVerificationResult(verifyResult);

    // Load full account details if verification passed
    if (verifyResult.success) {
      const { data } = await getTroodieSystemAccount();
      setAccountDetails(data);
    }

    setLoading(false);
  };

  const handleRefresh = () => {
    loadSystemAccountStatus();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Verifying system account...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>System Account Status</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
          <RefreshCw size={24} color="#FF6B35" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Overall Status */}
        <View style={styles.statusCard}>
          {verificationResult?.success ? (
            <>
              <CheckCircle size={48} color="#10B981" />
              <Text style={styles.statusTitle}>System Account Active</Text>
              <Text style={styles.statusDescription}>
                Troodie system account is properly configured and ready to create campaigns.
              </Text>
            </>
          ) : (
            <>
              <XCircle size={48} color="#EF4444" />
              <Text style={styles.statusTitle}>Configuration Error</Text>
              <Text style={styles.statusDescription}>
                {verificationResult?.error || 'System account is not properly configured.'}
              </Text>
            </>
          )}
        </View>

        {/* User Details */}
        {accountDetails && (
          <View style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>User Account</Text>
            <DetailRow label="Email" value={accountDetails.email} />
            <DetailRow label="Username" value={accountDetails.username} />
            <DetailRow label="Account Type" value={accountDetails.account_type} />
            <DetailRow label="Role" value={accountDetails.role} />
            <DetailRow
              label="Verified"
              value={accountDetails.is_verified ? 'Yes' : 'No'}
              highlight={accountDetails.is_verified}
            />
          </View>
        )}

        {/* Restaurant Details */}
        {accountDetails?.business_profiles?.[0]?.restaurants && (
          <View style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>Restaurant Profile</Text>
            <DetailRow
              label="Name"
              value={accountDetails.business_profiles[0].restaurants.name}
            />
            <DetailRow
              label="Platform Managed"
              value={accountDetails.business_profiles[0].restaurants.is_platform_managed ? 'Yes' : 'No'}
              highlight={accountDetails.business_profiles[0].restaurants.is_platform_managed}
            />
            <DetailRow
              label="Managed By"
              value={accountDetails.business_profiles[0].restaurants.managed_by || 'N/A'}
            />
            <DetailRow
              label="Location"
              value={`${accountDetails.business_profiles[0].restaurants.city}, ${accountDetails.business_profiles[0].restaurants.state}`}
            />
          </View>
        )}

        {/* Business Profile Details */}
        {accountDetails?.business_profiles?.[0] && (
          <View style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>Business Profile</Text>
            <DetailRow
              label="Can Create Campaigns"
              value={accountDetails.business_profiles[0].can_create_campaigns ? 'Yes' : 'No'}
              highlight={accountDetails.business_profiles[0].can_create_campaigns}
            />
            <DetailRow
              label="Verified Owner"
              value={accountDetails.business_profiles[0].verified_owner ? 'Yes' : 'No'}
              highlight={accountDetails.business_profiles[0].verified_owner}
            />
            <DetailRow
              label="Position"
              value={accountDetails.business_profiles[0].position}
            />
          </View>
        )}

        {/* Error Details */}
        {!verificationResult?.success && verificationResult?.details && (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Error Details</Text>
            <Text style={styles.errorText}>
              {JSON.stringify(verificationResult.details, null, 2)}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper component for detail rows
function DetailRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, highlight && styles.detailValueHighlight]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  refreshButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
  },
  statusDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  detailValueHighlight: {
    color: '#10B981',
  },
  errorCard: {
    backgroundColor: '#FEF2F2',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#991B1B',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#DC2626',
  },
});
```

## Definition of Done
- [ ] SQL seed script created and tested
- [ ] Troodie system user created with correct permissions
- [ ] Troodie official restaurant created and marked as platform-managed
- [ ] Business profile links user to restaurant
- [ ] System account constants exported in TypeScript
- [ ] Helper functions created to identify system accounts
- [ ] Service functions verify system account configuration
- [ ] Admin verification screen (React Native) allows checking setup
- [ ] RLS policies allow system account to create campaigns
- [ ] Manual testing confirms campaign creation works
- [ ] Documentation updated with system account credentials (securely stored)

## Notes
- **Security**: Store system account credentials securely (1Password, environment variables)
- **Fixed UUIDs**: Using deterministic UUIDs for easy reference across environments
- **Auth Setup**: Must create auth.users record manually via Supabase dashboard
- **React Native**: All UI code uses React Native components (View, Text, TouchableOpacity, etc.)
- **Admin Only**: System account status screen should be protected by admin role check
- **Reference**: TROODIE_MANAGED_CAMPAIGNS_STRATEGY.md section "Technical Implementation → System Account"
- **Related Tasks**: TMC-001 (Database Schema), TMC-003 (Admin Campaign UI)
