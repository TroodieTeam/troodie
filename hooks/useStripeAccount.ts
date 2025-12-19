import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { checkAccountStatus, getOnboardingLink } from '@/services/stripeService';
import { StripeAccountStatus } from '@/types/campaign';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

const initialStatus: StripeAccountStatus = {
  checking: false,
  hasAccount: false,
  onboardingCompleted: false,
  onboardingLink: null,
  accountId: undefined,
};

export function useStripeAccount(currentStep: number) {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ stripeRefresh?: string; accountType?: string }>();
  const [stripeAccountStatus, setStripeAccountStatus] = useState<StripeAccountStatus>(initialStatus);
  const isCheckingRef = useRef(false); // Prevent duplicate calls

  const checkStripeAccount = useCallback(async () => {
    if (!user?.id) {
      setStripeAccountStatus((prev) => ({ ...prev, checking: false }));
      isCheckingRef.current = false;
      return;
    }

    // Prevent multiple simultaneous checks using ref (avoids stale closure issues)
    if (isCheckingRef.current) {
      return;
    }

    isCheckingRef.current = true;
    setStripeAccountStatus((prev) => ({ ...prev, checking: true }));

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      isCheckingRef.current = false;
      setStripeAccountStatus((prev) => ({ ...prev, checking: false }));
    }, 10000); // 10 second timeout

    try {
      const result = await checkAccountStatus(user.id, 'business');
      clearTimeout(timeoutId);

      const hasAccount = result.success && !!result.accountId;
      const onboardingCompleted = result.onboardingCompleted || false;

      isCheckingRef.current = false;
      setStripeAccountStatus({
        checking: false,
        hasAccount,
        onboardingCompleted,
        onboardingLink: null,
        accountId: result.accountId,
      });

      // If account exists but not completed, get onboarding link
      if (hasAccount && !onboardingCompleted && result.accountId) {
        try {
          const linkResult = await getOnboardingLink(result.accountId, user.id, 'business');
          if (linkResult.success && linkResult.onboardingLink) {
            setStripeAccountStatus((prev) => ({
              ...prev,
              onboardingLink: linkResult.onboardingLink || null,
            }));
          }
        } catch (linkError) {
          // Don't fail the whole check if link fetch fails
        }
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('[Payment Step] Error checking Stripe account:', error);
      isCheckingRef.current = false;

      // Always reset checking state on error
      setStripeAccountStatus({
        checking: false,
        hasAccount: false,
        onboardingCompleted: false,
        onboardingLink: null,
        accountId: undefined,
      });

      // Show user-friendly error
      Alert.alert(
        'Payment Account Check Failed',
        'Unable to verify payment account status. Please try again or connect your account manually.',
        [{ text: 'OK' }]
      );
    }
  }, [user?.id]);

  // Handle deep link redirect from Stripe onboarding
  useEffect(() => {
    if (params.stripeRefresh === 'true' && user?.id) {
      // Refresh immediately, then poll for webhook updates
      const refreshAndPoll = async () => {
        try {
          // Ensure we have a valid session before calling
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          if (sessionError || !sessionData?.session) {
            Alert.alert('Authentication Error', 'Please sign in again');
            return;
          }

          // First, try to refresh from Stripe API directly (faster than waiting for webhook)
          const { data, error } = await supabase.functions.invoke('stripe-refresh-account-status', {
            body: {
              accountType: params.accountType || 'business',
            },
          });

          if (error || !data?.success) {
            console.error('[Create Campaign] ❌ Failed to refresh from Stripe:', error || data?.error);
            isCheckingRef.current = false;
            // Fall back to regular check
            setTimeout(() => {
              checkStripeAccount();
            }, 1000);
            return;
          }

          // Update local state with refreshed status
          isCheckingRef.current = false;
          setStripeAccountStatus({
            checking: false,
            hasAccount: true,
            onboardingCompleted: data.onboardingCompleted || false,
            onboardingLink: null,
            accountId: undefined,
          });

          // If onboarding is complete, we're done
          if (data.onboardingCompleted) {
            return;
          }

          // If still not completed, poll database (webhook updates it in background)
          // Poll every 2 seconds for up to 30 seconds (15 attempts)
          let pollCount = 0;
          const maxPolls = 15;
          const pollInterval = 2000; // 2 seconds

          const pollStatus = setInterval(async () => {
            pollCount++;

            // Check database status (webhook updates this automatically)
            const result = await checkAccountStatus(user.id, (params.accountType || 'business') as any);
            
            if (result.success && result.onboardingCompleted) {
              clearInterval(pollStatus);
              isCheckingRef.current = false;
              setStripeAccountStatus({
                checking: false,
                hasAccount: true,
                onboardingCompleted: true,
                onboardingLink: null,
                accountId: result.accountId,
              });
            } else if (pollCount >= maxPolls) {
              clearInterval(pollStatus);
              isCheckingRef.current = false;
              // Final check
              checkStripeAccount();
            }
          }, pollInterval);

          // Cleanup on unmount
          return () => {
            clearInterval(pollStatus);
          };
        } catch (error) {
          console.error('[Create Campaign] Error in refreshAndPoll:', error);
          isCheckingRef.current = false;
          // Fall back to regular check
          checkStripeAccount();
        }
      };

      // Small delay to ensure step 4 is set, then refresh
      setTimeout(() => {
        refreshAndPoll();
      }, 500);
    }
  }, [params.stripeRefresh, params.accountType, user?.id]);

  // Check account when entering step 4 (only once per step change)
  const hasCheckedStep4Ref = useRef(false);
  useEffect(() => {
    // Reset flag when leaving step 4
    if (currentStep !== 4) {
      hasCheckedStep4Ref.current = false;
      return;
    }

    // Only check once when entering step 4
    if (currentStep === 4 && user?.id && !hasCheckedStep4Ref.current && !isCheckingRef.current) {
      hasCheckedStep4Ref.current = true;
      // Small delay to ensure component is mounted
      const timer = setTimeout(() => {
        checkStripeAccount();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [currentStep, user?.id, checkStripeAccount]);

  const handleConnectStripe = useCallback(async () => {
    if (!user?.id || !user?.email) {
      Alert.alert('Error', 'User information is missing');
      return;
    }

    try {
      let link: string | null = stripeAccountStatus.onboardingLink;

      // If no link, need to create account via Edge Function
      if (!link) {
        // Call Edge Function to create Stripe account
        const { data, error } = await supabase.functions.invoke('stripe-create-account', {
          body: {
            userId: user.id,
            accountType: 'business',
            email: user.email,
          },
        });

        if (error || !data?.success) {
          Alert.alert('Error', data?.error || error?.message || 'Failed to create payment account');
          return;
        }

        link = data.onboardingLink;
      }

      if (link) {
        const { canOpenURL, openURL } = await import('expo-linking');
        const canOpen = await canOpenURL(link);
        if (canOpen) {
          await openURL(link);
          // Note: User will return via redirect URL, we'll check status again
        } else {
          Alert.alert('Error', 'Cannot open Stripe link');
        }
      }
    } catch (error) {
      console.error('Error connecting Stripe:', error);
      Alert.alert('Error', 'Failed to connect payment account');
    }
  }, [user?.id, user?.email, stripeAccountStatus.onboardingLink]);

  const refreshAccountStatus = useCallback(async () => {
    if (isCheckingRef.current) return; // Prevent duplicate calls
    isCheckingRef.current = true;
    setStripeAccountStatus((prev) => ({ ...prev, checking: true }));
    try {
      // Ensure we have a valid session before calling
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData?.session) {
        console.error('[Create Campaign] No valid session:', sessionError);
        isCheckingRef.current = false;
        Alert.alert('Authentication Error', 'Please sign in again');
        setStripeAccountStatus((prev) => ({ ...prev, checking: false }));
        return;
      }

      const { data, error } = await supabase.functions.invoke('stripe-refresh-account-status', {
        body: { accountType: 'business' },
      });
      if (error || !data?.success) {
        console.error('[Create Campaign] Refresh failed:', error || data?.error);
        isCheckingRef.current = false;
        Alert.alert('Refresh Failed', error?.message || data?.error || 'Could not refresh status');
        setStripeAccountStatus((prev) => ({ ...prev, checking: false }));
        return;
      }
      isCheckingRef.current = false;
      setStripeAccountStatus({
        checking: false,
        hasAccount: true,
        onboardingCompleted: data.onboardingCompleted || false,
        onboardingLink: null,
      });
      if (data.onboardingCompleted) {
        Alert.alert('Success', 'Payment account is now connected!');
      } else {
        Alert.alert('Info', 'Onboarding still in progress. Please complete it on Stripe.');
      }
    } catch (err) {
      console.error('[Create Campaign] Refresh error:', err);
      isCheckingRef.current = false;
      Alert.alert('Error', 'Failed to refresh account status');
      setStripeAccountStatus((prev) => ({ ...prev, checking: false }));
    }
  }, []);

  return {
    stripeAccountStatus,
    checkStripeAccount,
    handleConnectStripe,
    refreshAccountStatus,
  };
}
