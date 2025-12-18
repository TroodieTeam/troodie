import { DS } from '@/components/design-system/tokens';
import { CampaignFormData, StripeAccountStatus } from '@/types/campaign';
import { CheckCircle, CreditCard, Shield } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

interface CampaignStep4Props {
  stripeAccountStatus: StripeAccountStatus;
  formData: CampaignFormData;
  loading: boolean;
  onConnectStripe: () => void;
  onRefreshStatus: () => void;
  onManualRefresh: () => void;
}

export function CampaignStep4({
  stripeAccountStatus,
  formData,
  loading,
  onConnectStripe,
  onRefreshStatus,
  onManualRefresh,
}: CampaignStep4Props) {
  if (stripeAccountStatus.checking) {
    return (
      <View style={{ alignItems: 'center', padding: DS.spacing.xl }}>
        <ActivityIndicator size="large" color={DS.colors.primaryOrange} />
        <Text style={{ marginTop: DS.spacing.md, color: DS.colors.textDark }}>Checking payment account...</Text>
        <TouchableOpacity
          onPress={onManualRefresh}
          style={{
            marginTop: DS.spacing.lg,
            padding: DS.spacing.sm,
          }}
        >
          <Text style={{ color: DS.colors.primaryOrange, fontSize: 14 }}>Taking too long? Tap to refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (stripeAccountStatus.onboardingCompleted) {
    return (
      <View>
        <View
          style={{
            backgroundColor: '#F0FDF4',
            padding: DS.spacing.xl,
            borderRadius: DS.borderRadius.lg,
            alignItems: 'center',
            marginBottom: DS.spacing.lg,
          }}
        >
          <CheckCircle size={64} color={DS.colors.success} style={{ marginBottom: DS.spacing.md }} />
          <Text
            style={{
              fontSize: 20,
              fontWeight: '700',
              color: DS.colors.text,
              marginBottom: DS.spacing.sm,
              textAlign: 'center',
            }}
          >
            Payment Account Connected
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: DS.colors.text,
              textAlign: 'center',
              opacity: 0.8,
            }}
          >
            Your payment account is set up and ready. You can now create paid campaigns.
          </Text>
        </View>

        <View
          style={{
            backgroundColor: DS.colors.surface,
            padding: DS.spacing.md,
            borderRadius: DS.borderRadius.sm,
            borderWidth: 1,
            borderColor: DS.colors.border,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: DS.colors.textDark,
              marginBottom: DS.spacing.sm,
            }}
          >
            Campaign Budget
          </Text>
          <Text
            style={{
              fontSize: 24,
              fontWeight: '700',
              color: DS.colors.text,
            }}
          >
            ${(parseFloat(formData.budget) || 0).toFixed(2)}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: DS.colors.text,
              marginTop: DS.spacing.xs,
              opacity: 0.7,
            }}
          >
            This amount will be charged when you publish the campaign.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View>
      <Text
        style={{
          fontSize: 18,
          fontWeight: '600',
          color: DS.colors.text,
          marginBottom: DS.spacing.md,
        }}
      >
        Payment Setup
      </Text>

      <View style={{ marginBottom: DS.spacing.lg }}>
        <CreditCard size={48} color={DS.colors.primaryOrange} style={{ marginBottom: DS.spacing.md }} />
        <Text
          style={{
            fontSize: 16,
            color: DS.colors.text,
            lineHeight: 24,
            marginBottom: DS.spacing.md,
          }}
        >
          To create paid campaigns, you need to connect a payment account. This allows you to pay creators for their
          work.
        </Text>
      </View>

      <View
        style={{
          backgroundColor: '#F0F9FF',
          padding: DS.spacing.md,
          borderRadius: DS.borderRadius.md,
          marginBottom: DS.spacing.lg,
          flexDirection: 'row',
          alignItems: 'flex-start',
        }}
      >
        <Shield size={20} color="#0284C7" style={{ marginRight: DS.spacing.sm, marginTop: 2 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#0284C7', fontWeight: '600', marginBottom: DS.spacing.xs }}>Secure & Fast</Text>
          <Text style={{ color: '#0284C7', fontSize: 12 }}>
            Stripe handles all payment processing securely. Your payment details are encrypted and never stored on our
            servers.
          </Text>
        </View>
      </View>

      <View style={{ marginBottom: DS.spacing.lg }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: '600',
            color: DS.colors.text,
            marginBottom: DS.spacing.sm,
          }}
        >
          What you'll need:
        </Text>
        <View style={{ marginLeft: DS.spacing.sm }}>
          <Text style={{ color: DS.colors.text, marginBottom: DS.spacing.xs, fontSize: 14 }}>
            • Business bank account information
          </Text>
          <Text style={{ color: DS.colors.text, marginBottom: DS.spacing.xs, fontSize: 14 }}>
            • Business tax ID (EIN) or SSN
          </Text>
          <Text style={{ color: DS.colors.text, fontSize: 14 }}>• Business information for verification</Text>
        </View>
      </View>

      {/* Show success state - only show if not checking and completed */}
      {!stripeAccountStatus.checking && stripeAccountStatus.hasAccount && stripeAccountStatus.onboardingCompleted && (
        <View
          style={{
            backgroundColor: '#F0FDF4',
            padding: DS.spacing.md,
            borderRadius: DS.borderRadius.md,
            alignItems: 'center',
            marginBottom: DS.spacing.md,
            flexDirection: 'row',
            justifyContent: 'center',
          }}
        >
          <CheckCircle size={20} color="#22C55E" style={{ marginRight: DS.spacing.sm }} />
          <Text style={{ color: '#22C55E', fontWeight: '600', fontSize: 14 }}>
            Payment account connected successfully!
          </Text>
        </View>
      )}

      {/* Show connect button if not completed */}
      {!stripeAccountStatus.onboardingCompleted && (
        <TouchableOpacity
          onPress={onConnectStripe}
          disabled={loading || stripeAccountStatus.checking}
          style={{
            backgroundColor: DS.colors.primaryOrange,
            padding: DS.spacing.md,
            borderRadius: DS.borderRadius.md,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            marginBottom: DS.spacing.md,
            opacity: loading || stripeAccountStatus.checking ? 0.6 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <CreditCard size={20} color="white" style={{ marginRight: DS.spacing.sm }} />
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>Connect Payment Account</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Manual refresh button - always show for debugging */}
      <TouchableOpacity
        onPress={onRefreshStatus}
        style={{
          backgroundColor: DS.colors.surface,
          padding: DS.spacing.sm,
          borderRadius: DS.borderRadius.sm,
          alignItems: 'center',
          marginTop: DS.spacing.sm,
          borderWidth: 1,
          borderColor: DS.colors.border,
        }}
      >
        <Text style={{ color: DS.colors.textDark, fontSize: 12 }}>🔄 Refresh Status from Stripe API</Text>
      </TouchableOpacity>

      <Text
        style={{
          fontSize: 12,
          color: DS.colors.text,
          textAlign: 'center',
          opacity: 0.7,
          marginTop: DS.spacing.md,
        }}
      >
        By connecting your account, you agree to Stripe's Terms of Service
      </Text>
    </View>
  );
}
