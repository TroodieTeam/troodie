import { DS } from '@/components/design-system/tokens';
import { useAuth } from '@/contexts/AuthContext';
import { checkAccountStatus, createStripeAccount, getOnboardingLink } from '@/services/stripeService';
import { useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle, CreditCard, Shield } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CreatorPaymentOnboarding() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [accountStatus, setAccountStatus] = useState<{
    hasAccount: boolean;
    onboardingCompleted: boolean;
    onboardingLink: string | null;
  }>({
    hasAccount: false,
    onboardingCompleted: false,
    onboardingLink: null,
  });

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    if (!user?.id) return;

    setCheckingStatus(true);
    try {
      const result = await checkAccountStatus(user.id, 'creator');
      setAccountStatus({
        hasAccount: result.success && !!result.accountId,
        onboardingCompleted: result.onboardingCompleted || false,
        onboardingLink: null,
      });

      // If account exists but not completed, get onboarding link
      if (result.success && result.accountId && !result.onboardingCompleted) {
        const linkResult = await getOnboardingLink(result.accountId, user.id, 'creator');
        if (linkResult.success && linkResult.onboardingLink) {
          setAccountStatus((prev) => ({
            ...prev,
            onboardingLink: linkResult.onboardingLink || null,
          }));
        }
      }
    } catch (error) {
      console.error('Error checking account status:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleConnectAccount = async () => {
    if (!user?.id || !user?.email) {
      Alert.alert('Error', 'User information is missing');
      return;
    }

    setLoading(true);
    try {
      let link: string | null = null;

      if (accountStatus.hasAccount && accountStatus.onboardingLink) {
        link = accountStatus.onboardingLink;
      } else {
        // Create new account
        const result = await createStripeAccount(user.id, 'creator', user.email);
        if (result.success && result.onboardingLink) {
          link = result.onboardingLink;
        } else {
          Alert.alert('Error', result.error || 'Failed to create payment account');
          return;
        }
      }

      if (link) {
        // Open Stripe onboarding link
        const canOpen = await Linking.canOpenURL(link);
        if (canOpen) {
          await Linking.openURL(link);
          // Note: In production, you'd handle the return URL to verify completion
        } else {
          Alert.alert('Error', 'Cannot open Stripe link');
        }
      }
    } catch (error) {
      console.error('Error connecting account:', error);
      Alert.alert('Error', 'Failed to connect payment account');
    } finally {
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: DS.colors.background }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={DS.colors.primary} />
          <Text style={{ marginTop: DS.spacing.md, color: DS.colors.textLight }}>
            Checking payment account...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (accountStatus.onboardingCompleted) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: DS.colors.background }}>
        <View style={{ padding: DS.spacing.lg }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginBottom: DS.spacing.lg }}
          >
            <ArrowLeft size={24} color={DS.colors.text} />
          </TouchableOpacity>

          <View
            style={{
              backgroundColor: '#F0FDF4',
              padding: DS.spacing.xl,
              borderRadius: DS.borderRadius.lg,
              alignItems: 'center',
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
              You're All Set!
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: DS.colors.textLight,
                textAlign: 'center',
                marginBottom: DS.spacing.lg,
              }}
            >
              Your payment account is connected and ready to receive payouts.
            </Text>

            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                backgroundColor: DS.colors.primary,
                paddingHorizontal: DS.spacing.xl,
                paddingVertical: DS.spacing.md,
                borderRadius: DS.borderRadius.md,
              }}
            >
              <Text style={{ color: 'white', fontWeight: '600' }}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: DS.colors.background }}>
      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: DS.spacing.lg }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginBottom: DS.spacing.lg }}
          >
            <ArrowLeft size={24} color={DS.colors.text} />
          </TouchableOpacity>

          <View style={{ marginBottom: DS.spacing.xl }}>
            <CreditCard size={48} color={DS.colors.primary} style={{ marginBottom: DS.spacing.md }} />
            <Text
              style={{
                fontSize: 24,
                fontWeight: '700',
                color: DS.colors.text,
                marginBottom: DS.spacing.sm,
              }}
            >
              Connect Payment Account
            </Text>
            <Text
              style={{
                fontSize: 16,
                color: DS.colors.textLight,
                lineHeight: 24,
              }}
            >
              To receive payments for your content, connect your bank account through Stripe. This
              is secure and only takes a few minutes.
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
              <Text style={{ color: '#0284C7', fontWeight: '600', marginBottom: DS.spacing.xs }}>
                Secure & Fast
              </Text>
              <Text style={{ color: '#0284C7', fontSize: 12 }}>
                Stripe handles all payment processing securely. Your bank details are encrypted and
                never stored on our servers.
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
              <Text style={{ color: DS.colors.textLight, marginBottom: DS.spacing.xs }}>
                • Bank account information
              </Text>
              <Text style={{ color: DS.colors.textLight, marginBottom: DS.spacing.xs }}>
                • Social Security Number (for tax reporting)
              </Text>
              <Text style={{ color: DS.colors.textLight }}>
                • Personal information for verification
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleConnectAccount}
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
                  Connect Bank Account
                </Text>
              </>
            )}
          </TouchableOpacity>

          <Text
            style={{
              marginTop: DS.spacing.md,
              fontSize: 12,
              color: DS.colors.textLight,
              textAlign: 'center',
            }}
          >
            By connecting your account, you agree to Stripe's Terms of Service
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
