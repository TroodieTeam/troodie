import { DS } from '@/components/design-system/tokens';
import { useAuth } from '@/contexts/AuthContext';
import { createCampaignPaymentIntent } from '@/services/paymentService';
import { checkAccountStatus, getOnboardingLink } from '@/services/stripeService';
import { AlertCircle, CheckCircle, CreditCard } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Text, TouchableOpacity, View } from 'react-native';

interface CampaignPaymentFormProps {
  campaignId: string;
  amountCents: number;
  onPaymentSuccess: () => void;
  onPaymentError: (error: string) => void;
}

export default function CampaignPaymentForm({
  campaignId,
  amountCents,
  onPaymentSuccess,
  onPaymentError,
}: CampaignPaymentFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checkingAccount, setCheckingAccount] = useState(true);
  const [hasStripeAccount, setHasStripeAccount] = useState(false);
  const [onboardingLink, setOnboardingLink] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);

  const amountDollars = (amountCents / 100).toFixed(2);
  // No platform fee - creators receive full payment amount
  const totalCents = amountCents;
  const totalDollars = (totalCents / 100).toFixed(2);

  useEffect(() => {
    checkStripeAccount();
  }, []);

  const checkStripeAccount = async () => {
    if (!user?.id) return;

    setCheckingAccount(true);
    try {
      const result = await checkAccountStatus(user.id, 'business');
      setHasStripeAccount(result.success && result.onboardingCompleted === true);

      if (!result.success || !result.onboardingCompleted) {
        // Get onboarding link if account exists but not completed
        if (result.accountId) {
          const linkResult = await getOnboardingLink(result.accountId, user.id, 'business');
          if (linkResult.success && linkResult.onboardingLink) {
            setOnboardingLink(linkResult.onboardingLink);
          }
        }
      }
    } catch (error) {
      console.error('Error checking Stripe account:', error);
    } finally {
      setCheckingAccount(false);
    }
  };

  const handleConnectStripe = async () => {
    if (!user?.id || !user?.email) {
      Alert.alert('Error', 'User information is missing');
      return;
    }

    setLoading(true);
    try {
      // This will be handled by the onboarding screen
      // For now, we'll show an alert
      Alert.alert(
        'Connect Payment Account',
        'You will be redirected to Stripe to connect your payment account. This is required to create paid campaigns.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            onPress: () => {
              // Navigate to onboarding screen or open Stripe link
              if (onboardingLink) {
                Linking.openURL(onboardingLink);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error connecting Stripe:', error);
      Alert.alert('Error', 'Failed to connect payment account');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayment = async () => {
    if (!user?.id) {
      onPaymentError('User not authenticated');
      return;
    }

    setLoading(true);
    try {
      const result = await createCampaignPaymentIntent(campaignId, user.id, amountCents);

      if (!result.success) {
        onPaymentError(result.error || 'Failed to create payment');
        return;
      }

      setPaymentIntentId(result.paymentIntentId || null);

      // In a real implementation, you would use Stripe's React Native SDK
      // to present the payment sheet. For now, we'll show a success message
      // and the webhook will handle the actual payment confirmation
      Alert.alert(
        'Payment Intent Created',
        'Please complete the payment using Stripe Checkout. The campaign will be activated once payment is confirmed.',
        [
          {
            text: 'OK',
            onPress: () => {
              // In production, open Stripe Checkout or payment sheet here
              onPaymentSuccess();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error creating payment:', error);
      onPaymentError(error instanceof Error ? error.message : 'Failed to create payment');
    } finally {
      setLoading(false);
    }
  };

  if (checkingAccount) {
    return (
      <View style={{ padding: DS.spacing.lg, alignItems: 'center' }}>
        <ActivityIndicator size="large" color={DS.colors.primary} />
        <Text style={{ marginTop: DS.spacing.md, color: DS.colors.textLight }}>
          Checking payment account...
        </Text>
      </View>
    );
  }

  if (!hasStripeAccount) {
    return (
      <View style={{ padding: DS.spacing.lg }}>
        <View
          style={{
            backgroundColor: '#FEF3C7',
            padding: DS.spacing.md,
            borderRadius: DS.borderRadius.md,
            marginBottom: DS.spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <AlertCircle size={20} color="#92400E" style={{ marginRight: DS.spacing.sm }} />
          <Text style={{ color: '#92400E', flex: 1 }}>
            You need to connect a payment account to create paid campaigns.
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleConnectStripe}
          disabled={loading}
          style={{
            backgroundColor: DS.colors.primary,
            padding: DS.spacing.md,
            borderRadius: DS.borderRadius.md,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
          }}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <CreditCard size={20} color="white" style={{ marginRight: DS.spacing.sm }} />
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
                Connect Payment Account
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ padding: DS.spacing.lg }}>
      <Text
        style={{
          fontSize: 18,
          fontWeight: '600',
          color: DS.colors.text,
          marginBottom: DS.spacing.md,
        }}
      >
        Payment Summary
      </Text>

      <View
        style={{
          backgroundColor: DS.colors.backgroundWhite,
          borderRadius: DS.borderRadius.md,
          padding: DS.spacing.md,
          marginBottom: DS.spacing.md,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: DS.spacing.sm,
          }}
        >
          <Text style={{ color: DS.colors.textLight }}>Campaign Budget</Text>
          <Text style={{ color: DS.colors.text, fontWeight: '500' }}>${amountDollars}</Text>
        </View>

        <View
          style={{
            height: 1,
            backgroundColor: DS.colors.border,
            marginVertical: DS.spacing.sm,
          }}
        />

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          <Text style={{ color: DS.colors.text, fontWeight: '600', fontSize: 16 }}>Total</Text>
          <Text style={{ color: DS.colors.text, fontWeight: '700', fontSize: 18 }}>
            ${totalDollars}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={handleCreatePayment}
        disabled={loading || !!paymentIntentId}
        style={{
          backgroundColor: paymentIntentId ? DS.colors.success : DS.colors.primary,
          padding: DS.spacing.md,
          borderRadius: DS.borderRadius.md,
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'center',
        }}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : paymentIntentId ? (
          <>
            <CheckCircle size={20} color="white" style={{ marginRight: DS.spacing.sm }} />
            <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
              Payment Processing
            </Text>
          </>
        ) : (
          <>
            <CreditCard size={20} color="white" style={{ marginRight: DS.spacing.sm }} />
            <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
              Pay ${totalDollars}
            </Text>
          </>
        )}
      </TouchableOpacity>

      <Text
        style={{
          marginTop: DS.spacing.sm,
          fontSize: 12,
          color: DS.colors.textLight,
          textAlign: 'center',
        }}
      >
        Your payment is secure and processed by Stripe
      </Text>
    </View>
  );
}
