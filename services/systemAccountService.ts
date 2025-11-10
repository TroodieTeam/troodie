import { supabase } from '@/lib/supabase';
import { TROODIE_SYSTEM_ACCOUNT, TROODIE_RESTAURANT } from '@/constants/systemAccounts';

/**
 * Service for managing Troodie system accounts
 * Task: TMC-002
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
    const { data: businessProfile, error: profileError} = await supabase
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
