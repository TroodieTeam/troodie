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
  // This function requires Stripe SDK - should be moved to Edge Function
  // For now, return error directing to use Edge Function
  return {
    success: false,
    error: 'createStripeAccount must be called via Edge Function. Use supabase.functions.invoke("stripe-create-account")',
  };
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

    // No valid link - should call Edge Function to create new one
    return {
      success: false,
      error: 'No valid onboarding link. Call Edge Function to create new link.',
    };
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
  console.log('[stripeService] checkAccountStatus called', { userId, accountType });
  
  try {
    console.log('[stripeService] Querying stripe_accounts table...');
    const { data: account, error } = await supabase
      .from('stripe_accounts')
      .select('stripe_account_id, stripe_account_status, onboarding_completed')
      .eq('user_id', userId)
      .eq('account_type', accountType)
      .single();

    console.log('[stripeService] stripe_accounts query result:', { 
      hasData: !!account, 
      error: error?.message,
      accountId: account?.stripe_account_id,
      onboardingCompleted: account?.onboarding_completed 
    });

    if (error || !account) {
      console.log('[stripeService] No Stripe account found');
      return {
        success: false,
        error: 'Stripe account not found',
      };
    }

    // Also check creator_profiles or business_profiles for latest status
    let profileOnboardingCompleted = account.onboarding_completed;
    
    try {
      if (accountType === 'creator') {
        console.log('[stripeService] Querying creator_profiles...');
        const { data: profile, error: profileError } = await supabase
          .from('creator_profiles')
          .select('stripe_onboarding_completed')
          .eq('user_id', userId)
          .single();
        
        console.log('[stripeService] creator_profiles query result:', { 
          hasData: !!profile, 
          error: profileError?.message,
          onboardingCompleted: profile?.stripe_onboarding_completed 
        });
        
        profileOnboardingCompleted = profile?.stripe_onboarding_completed ?? account.onboarding_completed;
      } else if (accountType === 'business') {
        console.log('[stripeService] Querying business_profiles...');
        const { data: profile, error: profileError } = await supabase
          .from('business_profiles')
          .select('stripe_onboarding_completed')
          .eq('user_id', userId)
          .single();
        
        console.log('[stripeService] business_profiles query result:', { 
          hasData: !!profile, 
          error: profileError?.message,
          onboardingCompleted: profile?.stripe_onboarding_completed 
        });
        
        profileOnboardingCompleted = profile?.stripe_onboarding_completed ?? account.onboarding_completed;
      }
    } catch (profileError) {
      console.error('[stripeService] Error querying profile table (non-fatal):', profileError);
      // Don't fail the whole check if profile query fails - use account status
      profileOnboardingCompleted = account.onboarding_completed;
    }

    const result = {
      success: true,
      accountId: account.stripe_account_id,
      status: account.stripe_account_status || 'pending',
      onboardingCompleted: profileOnboardingCompleted || false,
    };
    
    console.log('[stripeService] checkAccountStatus returning:', result);
    return result;
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
