/**
 * Subscription Service
 *
 * TRO-137: Handles restaurant subscription management for the $49/month plan
 * with 14-day free trial.
 *
 * Note: Stripe operations should be done via Edge Functions, not directly from client.
 * This service provides database operations and Edge Function wrappers.
 */

import { supabase } from '@/lib/supabase';

export type SubscriptionStatus = 'none' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid';

export interface SubscriptionInfo {
  subscriptionId: string | null;
  status: SubscriptionStatus;
  trialStartDate: string | null;
  trialEndDate: string | null;
  reminderDismissedAt: string | null;
  canPostCampaigns: boolean;
  daysUntilTrialEnds: number | null;
}

export interface CreateSubscriptionResult {
  success: boolean;
  subscriptionId?: string;
  clientSecret?: string;
  error?: string;
}

/**
 * Get subscription status for a restaurant claim
 */
export async function getSubscriptionStatus(
  restaurantClaimId: string
): Promise<{ data: SubscriptionInfo | null; error?: string }> {
  try {
    console.log('[subscriptionService] Getting subscription status:', restaurantClaimId);

    const { data, error } = await supabase
      .from('restaurant_claims')
      .select(`
        stripe_subscription_id,
        subscription_status,
        trial_start_date,
        trial_end_date,
        subscription_reminder_dismissed_at
      `)
      .eq('id', restaurantClaimId)
      .single();

    if (error) {
      console.error('[subscriptionService] Error fetching subscription:', error);
      return { data: null, error: error.message };
    }

    if (!data) {
      return { data: null, error: 'Restaurant claim not found' };
    }

    // Calculate days until trial ends
    let daysUntilTrialEnds: number | null = null;
    if (data.trial_end_date) {
      const trialEnd = new Date(data.trial_end_date);
      const now = new Date();
      const diffMs = trialEnd.getTime() - now.getTime();
      daysUntilTrialEnds = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (daysUntilTrialEnds < 0) daysUntilTrialEnds = 0;
    }

    // Check if can post campaigns
    const canPostCampaigns = await checkCanPostCampaign(restaurantClaimId);

    const subscriptionInfo: SubscriptionInfo = {
      subscriptionId: data.stripe_subscription_id,
      status: (data.subscription_status as SubscriptionStatus) || 'none',
      trialStartDate: data.trial_start_date,
      trialEndDate: data.trial_end_date,
      reminderDismissedAt: data.subscription_reminder_dismissed_at,
      canPostCampaigns,
      daysUntilTrialEnds,
    };

    console.log('[subscriptionService] Subscription info:', subscriptionInfo);
    return { data: subscriptionInfo };
  } catch (error: any) {
    console.error('[subscriptionService] Exception:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Check if restaurant can post campaigns based on subscription status
 */
export async function checkCanPostCampaign(restaurantClaimId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('can_restaurant_post_campaign', {
      p_restaurant_claim_id: restaurantClaimId,
    });

    if (error) {
      console.error('[subscriptionService] Error checking posting eligibility:', error);
      // Default to false if we can't determine
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('[subscriptionService] Exception checking posting eligibility:', error);
    return false;
  }
}

/**
 * Create a subscription for a restaurant
 * This calls a Supabase Edge Function that handles Stripe API calls
 */
export async function createSubscription(
  restaurantClaimId: string,
  paymentMethodId?: string
): Promise<CreateSubscriptionResult> {
  try {
    // Ensure we have a valid session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData?.session) {
      console.error('[subscriptionService] No valid session');
      return {
        success: false,
        error: 'Authentication required. Please sign in again.',
      };
    }

    console.log('[subscriptionService] Creating subscription...', { restaurantClaimId });

    // Call Edge Function to create subscription
    const { data, error } = await supabase.functions.invoke('stripe-create-subscription', {
      body: {
        restaurantClaimId,
        paymentMethodId,
        trialDays: 14,
        priceId: process.env.EXPO_PUBLIC_STRIPE_SUBSCRIPTION_PRICE_ID || 'price_restaurant_monthly',
      },
    });

    if (error) {
      console.error('[subscriptionService] Edge Function error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create subscription',
      };
    }

    console.log('[subscriptionService] Subscription created:', {
      success: data?.success,
      subscriptionId: data?.subscriptionId,
    });

    return {
      success: data?.success || false,
      subscriptionId: data?.subscriptionId,
      clientSecret: data?.clientSecret,
      error: data?.error,
    };
  } catch (error: any) {
    console.error('[subscriptionService] Exception creating subscription:', error);
    return {
      success: false,
      error: error.message || 'Failed to create subscription',
    };
  }
}

/**
 * Dismiss the subscription reminder (user clicked "Remind me in 12 days")
 */
export async function dismissSubscriptionReminder(
  restaurantClaimId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('restaurant_claims')
      .update({
        subscription_reminder_dismissed_at: new Date().toISOString(),
      })
      .eq('id', restaurantClaimId);

    if (error) {
      console.error('[subscriptionService] Error dismissing reminder:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Start a trial for a restaurant (called after first campaign post)
 * Updates the database to mark trial started
 */
export async function startTrial(
  restaurantClaimId: string
): Promise<{ success: boolean; trialEndDate?: string; error?: string }> {
  try {
    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + 14); // 14-day trial

    const { error } = await supabase
      .from('restaurant_claims')
      .update({
        subscription_status: 'trialing',
        trial_start_date: now.toISOString(),
        trial_end_date: trialEnd.toISOString(),
      })
      .eq('id', restaurantClaimId);

    if (error) {
      console.error('[subscriptionService] Error starting trial:', error);
      return { success: false, error: error.message };
    }

    console.log('[subscriptionService] Trial started:', {
      restaurantClaimId,
      trialEndDate: trialEnd.toISOString(),
    });

    return { success: true, trialEndDate: trialEnd.toISOString() };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get Stripe Customer Portal URL for managing subscription
 */
export async function getCustomerPortalUrl(
  restaurantClaimId: string
): Promise<{ url?: string; error?: string }> {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData?.session) {
      return { error: 'Authentication required' };
    }

    const { data, error } = await supabase.functions.invoke('stripe-customer-portal', {
      body: { restaurantClaimId },
    });

    if (error) {
      return { error: error.message };
    }

    return { url: data?.url };
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * Check if this is the restaurant's first campaign
 * Note: Should be called AFTER campaign is created, so count of 1 means first campaign
 */
export async function isFirstCampaign(restaurantId: string): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from('campaigns')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId);

    if (error) {
      console.error('[subscriptionService] Error checking campaign count:', error);
      return false;
    }

    // If count is 1, this is their first campaign (campaign was just created)
    return (count || 0) === 1;
  } catch (error) {
    console.error('[subscriptionService] Exception checking campaign count:', error);
    return false;
  }
}
