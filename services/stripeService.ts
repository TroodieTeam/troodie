import { StripeAccountType } from '@/lib/stripeTypes';
import { supabase } from '@/lib/supabase';

// Client-safe version - Stripe SDK operations should be done via Edge Functions
// This file provides database-only operations for React Native client

export interface StripeAccountResult {
  success: boolean;
  accountId?: string;
  onboardingLink?: string;
  error?: string;
}

export interface AccountStatusResult {
  success: boolean;
  accountId?: string;
  status?: string;
  onboardingCompleted?: boolean;
  error?: string;
}

/**
 * Create a Stripe Connect Express account for a business or creator
 * NOTE: This should be called via Edge Function, not directly from client
 * Client should call: supabase.functions.invoke('stripe-create-account', {...})
 */
export async function createStripeAccount(
  userId: string,
  accountType: StripeAccountType,
  email: string
): Promise<StripeAccountResult> {
  try {
    // Ensure we have a valid session before calling Edge Function
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData?.session) {
      console.error('[stripeService] ❌ No valid session:', sessionError);
      return {
        success: false,
        error: 'Authentication session missing. Please sign in again.',
      };
    }

    console.log('[stripeService] Calling stripe-create-account Edge Function...', {
      userId,
      accountType,
      email,
    });

    const { data, error } = await supabase.functions.invoke('stripe-create-account', {
      body: {
        userId,
        accountType,
        email,
      },
    });

    if (error) {
      console.error('[stripeService] ❌ Edge Function error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create Stripe account',
      };
    }

    console.log('[stripeService] ✅ Edge Function response:', {
      success: data?.success,
      accountId: data?.accountId,
      hasOnboardingLink: !!data?.onboardingLink,
    });

    return {
      success: data?.success || false,
      accountId: data?.accountId,
      onboardingLink: data?.onboardingLink,
      error: data?.error,
    };
  } catch (error) {
    console.error('[stripeService] ❌ Exception creating Stripe account:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create Stripe account',
    };
  }
}

/**
 * Get Stripe Connect onboarding link (client-safe version)
 * Checks database for existing valid link, otherwise should call Edge Function
 */
export async function getOnboardingLink(
  accountId: string,
  userId: string,
  accountType: StripeAccountType
): Promise<StripeAccountResult> {
  try {
    // Check if we have a valid, non-expired onboarding link
    const { data: account } = await supabase
      .from('stripe_accounts')
      .select('onboarding_link, onboarding_link_expires_at')
      .eq('stripe_account_id', accountId)
      .single();

    if (
      account?.onboarding_link &&
      account.onboarding_link_expires_at &&
      new Date(account.onboarding_link_expires_at) > new Date()
    ) {
      return {
        success: true,
        accountId,
        onboardingLink: account.onboarding_link,
      };
    }

    // No valid link - call Edge Function to create new one
    try {
      // Ensure we have a valid session before calling Edge Function
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData?.session) {
        return {
          success: false,
          error: 'Authentication session missing. Please sign in again.',
        };
      }

      console.log('[stripeService] Calling stripe-create-account to refresh onboarding link...', {
        accountId,
        userId,
        accountType,
      });

      // Get user email for Edge Function (required field)
      const { data: userData } = await supabase.auth.getUser();
      const userEmail = userData?.user?.email || '';

      const { data, error } = await supabase.functions.invoke('stripe-create-account', {
        body: {
          userId,
          accountType,
          email: userEmail, // Edge Function requires email field
        },
      });

      if (error) {
        console.error('[stripeService] ❌ Error refreshing onboarding link:', error);
        return {
          success: false,
          error: error.message || 'Failed to refresh onboarding link',
        };
      }

      if (data?.success && data?.onboardingLink) {
        return {
          success: true,
          accountId,
          onboardingLink: data.onboardingLink,
        };
      }

      return {
        success: false,
        error: data?.error || 'Failed to refresh onboarding link',
      };
    } catch (error) {
      console.error('[stripeService] ❌ Exception refreshing onboarding link:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to refresh onboarding link',
      };
    }
  } catch (error) {
    console.error('Error getting onboarding link:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get onboarding link',
    };
  }
}

/**
 * Check Stripe account status (client-safe version)
 * Reads from database only - webhooks keep this updated
 */
export async function checkAccountStatus(
  userId: string,
  accountType: StripeAccountType
): Promise<AccountStatusResult> {
  try {
    const { data: account, error } = await supabase
      .from('stripe_accounts')
      .select('stripe_account_id, stripe_account_status, onboarding_completed')
      .eq('user_id', userId)
      .eq('account_type', accountType)
      .single();

    if (error || !account) {
      return {
        success: false,
        error: 'Stripe account not found',
      };
    }

    // Also check creator_profiles or business_profiles for latest status
    let profileOnboardingCompleted = account.onboarding_completed;
    
    try {
      if (accountType === 'creator') {
        const { data: profile } = await supabase
          .from('creator_profiles')
          .select('stripe_onboarding_completed')
          .eq('user_id', userId)
          .single();
        
        profileOnboardingCompleted = profile?.stripe_onboarding_completed ?? account.onboarding_completed;
      } else if (accountType === 'business') {
        const { data: profile } = await supabase
          .from('business_profiles')
          .select('stripe_onboarding_completed')
          .eq('user_id', userId)
          .single();
        
        profileOnboardingCompleted = profile?.stripe_onboarding_completed ?? account.onboarding_completed;
      }
    } catch (profileError) {
      // Don't fail the whole check if profile query fails - use account status
      profileOnboardingCompleted = account.onboarding_completed;
    }

    return {
      success: true,
      accountId: account.stripe_account_id,
      status: account.stripe_account_status || 'pending',
      onboardingCompleted: profileOnboardingCompleted || false,
    };
  } catch (error) {
    console.error('[stripeService] Error checking account status:', error);
    console.error('[stripeService] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check account status',
    };
  }
}

/**
 * Get Stripe account ID for a user
 */
export async function getStripeAccountId(
  userId: string,
  accountType: StripeAccountType
): Promise<string | null> {
  const { data } = await supabase
    .from('stripe_accounts')
    .select('stripe_account_id')
    .eq('user_id', userId)
    .eq('account_type', accountType)
    .single();

  return data?.stripe_account_id || null;
}
