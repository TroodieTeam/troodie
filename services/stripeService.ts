import { getStripeClient, StripeAccountType } from '@/lib/stripe';
import { supabase } from '@/lib/supabase';

const stripe = getStripeClient();

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
 */
export async function createStripeAccount(
  userId: string,
  accountType: StripeAccountType,
  email: string
): Promise<StripeAccountResult> {
  try {
    // Check if account already exists
    const { data: existingAccount } = await supabase
      .from('stripe_accounts')
      .select('stripe_account_id, onboarding_completed')
      .eq('user_id', userId)
      .eq('account_type', accountType)
      .single();

    if (existingAccount?.stripe_account_id) {
      // Account exists, check if onboarding is complete
      if (existingAccount.onboarding_completed) {
        return {
          success: true,
          accountId: existingAccount.stripe_account_id,
        };
      }

      // Account exists but onboarding incomplete, get new onboarding link
      return await getOnboardingLink(existingAccount.stripe_account_id, userId, accountType);
    }

    // Create new Stripe Connect Express account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: email,
      capabilities: {
        transfers: { requested: true },
      },
      metadata: {
        user_id: userId,
        account_type: accountType,
      },
    });

    // Store account in database
    const { error: insertError } = await supabase
      .from('stripe_accounts')
      .insert({
        user_id: userId,
        account_type: accountType,
        stripe_account_id: account.id,
        stripe_account_status: account.details_submitted ? 'enabled' : 'pending',
        onboarding_completed: account.details_submitted || false,
      });

    if (insertError) {
      console.error('Error storing Stripe account:', insertError);
      return {
        success: false,
        error: 'Failed to store Stripe account',
      };
    }

    // Also update creator_profiles or business_profiles table
    if (accountType === 'creator') {
      await supabase
        .from('creator_profiles')
        .update({
          stripe_account_id: account.id,
          stripe_onboarding_completed: account.details_submitted || false,
        })
        .eq('user_id', userId);
    } else if (accountType === 'business') {
      await supabase
        .from('business_profiles')
        .update({
          stripe_account_id: account.id,
          stripe_onboarding_completed: account.details_submitted || false,
        })
        .eq('user_id', userId);
    }

    // Get onboarding link
    return await getOnboardingLink(account.id, userId, accountType);
  } catch (error) {
    console.error('Error creating Stripe account:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create Stripe account',
    };
  }
}

/**
 * Get Stripe Connect onboarding link
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

    // Create new onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.APP_URL || 'troodie://'}/stripe/onboarding/refresh`,
      return_url: `${process.env.APP_URL || 'troodie://'}/stripe/onboarding/return?account_type=${accountType}`,
      type: 'account_onboarding',
    });

    // Store onboarding link with expiration (1 hour)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await supabase
      .from('stripe_accounts')
      .update({
        onboarding_link: accountLink.url,
        onboarding_link_expires_at: expiresAt.toISOString(),
      })
      .eq('stripe_account_id', accountId);

    return {
      success: true,
      accountId,
      onboardingLink: accountLink.url,
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
 * Check Stripe account status
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

    // Fetch latest status from Stripe
    const stripeAccount = await stripe.accounts.retrieve(account.stripe_account_id);

    // Update database with latest status
    await supabase
      .from('stripe_accounts')
      .update({
        stripe_account_status: stripeAccount.details_submitted ? 'enabled' : 'pending',
        onboarding_completed: stripeAccount.details_submitted || false,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_account_id', account.stripe_account_id);

    // Update creator_profiles or business_profiles
    if (accountType === 'creator') {
      await supabase
        .from('creator_profiles')
        .update({
          stripe_onboarding_completed: stripeAccount.details_submitted || false,
        })
        .eq('user_id', userId);
    } else if (accountType === 'business') {
      await supabase
        .from('business_profiles')
        .update({
          stripe_onboarding_completed: stripeAccount.details_submitted || false,
        })
        .eq('user_id', userId);
    }

    return {
      success: true,
      accountId: account.stripe_account_id,
      status: stripeAccount.details_submitted ? 'enabled' : 'pending',
      onboardingCompleted: stripeAccount.details_submitted || false,
    };
  } catch (error) {
    console.error('Error checking account status:', error);
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
