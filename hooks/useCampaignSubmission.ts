import { PAYMENT_POLLING_CONFIG } from '@/constants/campaign';
import { supabase } from '@/lib/supabase';
import { createCampaignPaymentIntent, getCampaignPaymentStatus } from '@/services/paymentService';
import { CampaignFormData, RestaurantData, StripeAccountStatus } from '@/types/campaign';
import { convertBudgetToCents, expandDeliverables, formatEndDate } from '@/utils/campaignTransformations';
import { createStripeReturnURL } from '@/utils/stripeHelpers';
import { useStripe } from '@stripe/stripe-react-native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

export function useCampaignSubmission() {
  const router = useRouter();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);

  const submitCampaign = useCallback(
    async (
      formData: CampaignFormData,
      restaurantData: RestaurantData | null,
      stripeAccountStatus: StripeAccountStatus,
      userId: string
    ) => {
      console.log('[Campaign Submit] Starting campaign creation flow');

      // Validate before submission
      if (!restaurantData?.id) {
        console.error('[Campaign Submit] ❌ Restaurant data missing');
        Alert.alert('Error', 'Restaurant data is missing. Please refresh and try again.');
        return;
      }

      // Additional validation for deadline
      if (!formData.deadline || formData.deadline.trim() === '') {
        console.error('[Campaign Submit] ❌ Deadline missing');
        Alert.alert('Missing Deadline', 'Please select a campaign deadline before creating the campaign.');
        return { step: 2 };
      }

      // Validate payment account is ready
      if (!stripeAccountStatus.onboardingCompleted) {
        console.error('[Campaign Submit] ❌ Stripe account not completed');
        Alert.alert('Payment Account Required', 'Please complete your payment account setup before creating a campaign.');
        return;
      }

      setLoading(true);
      let campaignId: string | null = null;

      try {
        // Convert budget to cents
        const budgetCents = convertBudgetToCents(formData.budget);
        console.log('[Campaign Submit] Budget:', { dollars: formData.budget, cents: budgetCents });

        // Prepare deliverable_requirements as JSONB
        const expandedDeliverables = expandDeliverables(formData.deliverables);
        const deliverableRequirements = {
          deliverables: expandedDeliverables,
        };

        console.log('[Campaign Submit] Creating campaign record...');

        // Parse and format end_date properly
        const endDateValue = formatEndDate(formData.deadline);
        console.log('[Campaign Submit] End date:', {
          input: formData.deadline,
          parsed: endDateValue,
        });

        // Create campaign with 'pending' status - will be activated after payment via webhook
        const { data: campaignData, error: campaignError } = await supabase
          .from('campaigns')
          .insert({
            restaurant_id: restaurantData.id,
            owner_id: userId,
            title: formData.title,
            description: formData.description,
            requirements: formData.requirements.length > 0 ? formData.requirements : null,
            budget_cents: budgetCents,
            end_date: endDateValue,
            status: 'pending', // Campaign requires payment before activation (webhook will set to 'active')
            payment_status: 'pending',
            deliverable_requirements: deliverableRequirements,
          })
          .select('id')
          .single();

        if (campaignError || !campaignData) {
          console.error('[Campaign Submit] ❌ Campaign creation failed:', campaignError);
          throw campaignError || new Error('Failed to create campaign');
        }

        campaignId = campaignData.id;
        console.log('[Campaign Submit] ✅ Campaign created:', campaignId);

        // Ensure we have a valid session before calling Edge Function
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData?.session) {
          console.error('[Campaign Submit] ❌ No valid session:', sessionError);

          // Rollback: Delete campaign if session is invalid
          await supabase.from('campaigns').delete().eq('id', campaignId);
          console.log('[Campaign Submit] Rolled back campaign creation due to session error');

          Alert.alert('Authentication Error', 'Please sign in again');
          return;
        }

        console.log('[Campaign Submit] ✅ Session validated');

        // Create payment intent for the campaign
        console.log('[Campaign Submit] Creating payment intent...', {
          campaignId,
          businessId: userId,
          amountCents: budgetCents,
        });

        const paymentResult = await createCampaignPaymentIntent(campaignId, userId, budgetCents);

        if (!paymentResult.success || !paymentResult.paymentIntentId) {
          console.error('[Campaign Submit] ❌ Payment intent creation failed:', paymentResult.error);

          // Rollback: Delete campaign if payment intent creation fails
          await supabase.from('campaigns').delete().eq('id', campaignId);
          console.log('[Campaign Submit] Rolled back campaign creation due to payment failure');

          Alert.alert('Payment Setup Failed', paymentResult.error || 'Failed to create payment intent. Please try again.', [
            { text: 'OK' },
          ]);
          return;
        }

        console.log('[Campaign Submit] ✅ Payment intent created:', {
          paymentIntentId: paymentResult.paymentIntentId,
          clientSecret: paymentResult.clientSecret ? 'present' : 'missing',
        });

        // Present Stripe Payment Sheet to collect payment
        if (paymentResult.clientSecret) {
          await handlePaymentSheet(paymentResult.clientSecret, campaignId, paymentResult.paymentIntentId);
        } else {
          // Fallback if no clientSecret (shouldn't happen, but handle gracefully)
          console.warn('[Campaign Submit] ⚠️ No clientSecret returned');
          Alert.alert(
            'Campaign Created',
            'Your campaign has been created. Payment processing will begin shortly.',
            [
              {
                text: 'OK',
                onPress: () => router.replace('/business/campaigns'),
              },
            ]
          );
        }
      } catch (error) {
        console.error('[Campaign Submit] ❌ Error in campaign creation flow:', error);

        // Cleanup: Delete campaign if it was created but payment failed
        if (campaignId) {
          console.log('[Campaign Submit] Cleaning up campaign:', campaignId);
          await supabase.from('campaigns').delete().eq('id', campaignId);
        }

        Alert.alert('Error', 'Failed to create campaign. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [router, initPaymentSheet, presentPaymentSheet]
  );

  const handlePaymentSheet = useCallback(
    async (clientSecret: string, campaignId: string, paymentIntentId: string) => {
      console.log('[Campaign Submit] Initializing Payment Sheet...');

      const returnURL = createStripeReturnURL();
      console.log('[Campaign Submit] Using returnURL:', returnURL);

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Troodie',
        paymentIntentClientSecret: clientSecret,
        returnURL,
      });

      if (initError) {
        console.error('[Campaign Submit] ❌ Payment Sheet initialization failed:', initError);
        Alert.alert('Payment Setup Error', initError.message || 'Failed to initialize payment. Please try again.', [
          {
            text: 'OK',
            onPress: () => {
              // Don't delete campaign - let them retry payment
              router.replace('/business/campaigns');
            },
          },
        ]);
        return;
      }

      console.log('[Campaign Submit] ✅ Payment Sheet initialized, presenting...');

      // Present Payment Sheet
      const { error: paymentError } = await presentPaymentSheet();

      if (paymentError) {
        console.error('[Campaign Submit] ❌ Payment failed:', paymentError);

        // Handle user cancellation vs actual error
        if (paymentError.code === 'Canceled') {
          Alert.alert(
            'Payment Cancelled',
            'Your campaign has been created but payment was cancelled. You can complete payment later.',
            [
              {
                text: 'OK',
                onPress: () => router.replace('/business/campaigns'),
              },
            ]
          );
        } else {
          Alert.alert('Payment Failed', paymentError.message || 'Payment could not be processed. Please try again.', [
            {
              text: 'OK',
              onPress: () => router.replace('/business/campaigns'),
            },
          ]);
        }
        // Campaign stays in 'pending' status - they can retry payment later
        return;
      }

      // Payment successful! Wait for webhook confirmation
      await pollForPaymentConfirmation(campaignId, paymentIntentId);
    },
    [initPaymentSheet, presentPaymentSheet, router]
  );

  const pollForPaymentConfirmation = useCallback(
    async (campaignId: string, paymentIntentId: string) => {
      console.log('[Campaign Submit] ✅ Payment successful! Waiting for webhook confirmation...', {
        paymentIntentId,
        campaignId,
      });

      let attempts = 0;
      let paymentConfirmed = false;

      while (attempts < PAYMENT_POLLING_CONFIG.maxAttempts && !paymentConfirmed) {
        await new Promise((resolve) => setTimeout(resolve, PAYMENT_POLLING_CONFIG.intervalMs));
        attempts++;

        console.log(`[Campaign Submit] Polling attempt ${attempts}/${PAYMENT_POLLING_CONFIG.maxAttempts}...`);
        const updatedStatus = await getCampaignPaymentStatus(campaignId);

        console.log('[Campaign Submit] Payment status check:', {
          attempt: attempts,
          paymentIntentId,
          campaignId,
          verificationStatus: updatedStatus.verificationStatus,
          isCharged: updatedStatus.isCharged,
          paymentStatus: updatedStatus.campaign?.payment_status,
          paymentRecordStatus: updatedStatus.payment?.status,
        });

        if (updatedStatus.isCharged && updatedStatus.campaign?.payment_status === 'paid') {
          console.log('[Campaign Submit] ✅ Payment confirmed via webhook!');
          paymentConfirmed = true;
          break;
        }

        // Also check if payment record shows succeeded (webhook might have updated payment but not campaign yet)
        if (updatedStatus.payment?.status === 'succeeded' && updatedStatus.campaign?.payment_status !== 'paid') {
          console.log(
            '[Campaign Submit] ⚠️ Payment record shows succeeded but campaign not updated yet. Webhook may still be processing...'
          );
        }
      }

      if (paymentConfirmed) {
        await handlePaymentConfirmed(campaignId);
      } else {
        await handlePaymentPending(campaignId);
      }
    },
    [router]
  );

  const handlePaymentConfirmed = useCallback(
    async (campaignId: string) => {
      // Campaign should already be active from webhook, but ensure it's set
      const { error: updateError } = await supabase.from('campaigns').update({ status: 'active' }).eq('id', campaignId);

      if (updateError) {
        console.error('[Campaign Submit] ❌ Failed to activate campaign:', updateError);
        Alert.alert(
          'Payment Successful',
          'Payment was successful, but there was an error activating your campaign. Please refresh the page.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/business/campaigns'),
            },
          ]
        );
      } else {
        console.log('[Campaign Submit] ✅ Campaign activated successfully');
        Alert.alert('Payment Successful', 'Your campaign is now active! Creators can now apply.', [
          {
            text: 'OK',
            onPress: () => router.replace('/business/campaigns'),
          },
        ]);
      }
    },
    [router]
  );

  const handlePaymentPending = useCallback(
    async (campaignId: string) => {
      // Payment processed but webhook hasn't confirmed yet
      // Check one more time if payment record exists with succeeded status
      const finalCheck = await getCampaignPaymentStatus(campaignId);
      console.log('[Campaign Submit] Final status check after polling:', {
        paymentStatus: finalCheck.payment?.status,
        campaignPaymentStatus: finalCheck.campaign?.payment_status,
        isCharged: finalCheck.isCharged,
      });

      // If payment record shows succeeded but campaign isn't paid, manually update it
      if (finalCheck.payment?.status === 'succeeded' && finalCheck.campaign?.payment_status !== 'paid') {
        console.log('[Campaign Submit] ⚠️ Payment succeeded but campaign not updated. Manually updating...');
        const { error: manualUpdateError } = await supabase
          .from('campaigns')
          .update({
            payment_status: 'paid',
            paid_at: finalCheck.payment.paid_at || new Date().toISOString(),
            status: 'active',
          })
          .eq('id', campaignId);

        if (!manualUpdateError) {
          console.log('[Campaign Submit] ✅ Manually activated campaign after payment confirmation');
          Alert.alert('Payment Successful', 'Your campaign is now active! Creators can now apply.', [
            {
              text: 'OK',
              onPress: () => router.replace('/business/campaigns'),
            },
          ]);
          return;
        }
      }

      Alert.alert(
        'Payment Processing',
        'Your payment is being processed. The campaign will be activated automatically once payment is confirmed. You can refresh the campaigns list in a moment.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/business/campaigns'),
          },
        ]
      );
    },
    [router]
  );

  return {
    submitCampaign,
    loading,
  };
}
