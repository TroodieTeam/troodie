/**
 * Restaurant Stripe Connect Screen (TRO-136)
 * Guides restaurant through Stripe Express onboarding
 */

import { useAuth } from '@/contexts/AuthContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { StripeAccountType } from '@/lib/stripeTypes';
import { supabase } from '@/lib/supabase';
import { createStripeAccount, checkAccountStatus, getOnboardingLink } from '@/services/stripeService';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Shield,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type StripeStatus = 'not_started' | 'in_progress' | 'completed' | 'error';

export default function RestaurantStripeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { setCurrentStep, updateStripeSetup, state } = useOnboarding();

  const [stripeStatus, setStripeStatus] = useState<StripeStatus>('not_started');
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);

  // Check if user already has a Stripe account
  useEffect(() => {
    if (user?.id) {
      checkExistingAccount();
    }
  }, [user?.id]);

  const checkExistingAccount = async () => {
    if (!user?.id) return;

    console.log('[RestaurantStripe] Checking existing account for user:', user.id);
    setCheckingStatus(true);
    try {
      const result = await checkAccountStatus(user.id, 'business' as StripeAccountType);
      console.log('[RestaurantStripe] Account status result:', {
        success: result.success,
        accountId: result.accountId,
        onboardingCompleted: result.onboardingCompleted,
      });
      
      if (result.success && result.accountId) {
        setStripeAccountId(result.accountId);
        
        if (result.onboardingCompleted) {
          console.log('[RestaurantStripe] Onboarding already completed!');
          setStripeStatus('completed');
          updateStripeSetup({
            stripeAccountId: result.accountId,
            stripeOnboardingComplete: true,
          });
        } else {
          console.log('[RestaurantStripe] Account exists but onboarding incomplete');
          setStripeStatus('in_progress');
        }
      } else {
        console.log('[RestaurantStripe] No existing account found');
      }
    } catch (error) {
      console.error('[RestaurantStripe] Error checking account:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleConnectStripe = async () => {
    if (!user?.id || !user?.email) {
      Alert.alert('Error', 'Please sign in to continue');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let onboardingLink: string | undefined;

      // If we already have a Stripe account, get a fresh onboarding link
      if (stripeAccountId) {
        console.log('[RestaurantStripe] Getting fresh onboarding link for existing account:', stripeAccountId);
        const linkResult = await getOnboardingLink(stripeAccountId, user.id, 'business' as StripeAccountType);
        
        if (linkResult.success && linkResult.onboardingLink) {
          onboardingLink = linkResult.onboardingLink;
        } else {
          // If getting link fails, try creating account (might refresh the link)
          console.log('[RestaurantStripe] Getting link failed, trying create:', linkResult.error);
          const createResult = await createStripeAccount(
            user.id,
            'business' as StripeAccountType,
            user.email
          );
          if (createResult.success && createResult.onboardingLink) {
            onboardingLink = createResult.onboardingLink;
            setStripeAccountId(createResult.accountId || null);
          }
        }
      } else {
        // No account exists, create one
        console.log('[RestaurantStripe] Creating new Stripe account...');
        const result = await createStripeAccount(
          user.id,
          'business' as StripeAccountType,
          user.email
        );

        if (!result.success) {
          throw new Error(result.error || 'Failed to create Stripe account');
        }

        onboardingLink = result.onboardingLink;
        setStripeAccountId(result.accountId || null);
      }

      if (!onboardingLink) {
        throw new Error('No onboarding link available. Please try again.');
      }

      console.log('[RestaurantStripe] Got onboarding link:', onboardingLink.substring(0, 80) + '...');
      setStripeStatus('in_progress');

      // Open Stripe onboarding in system browser (Safari) - more reliable than embedded WebBrowser
      console.log('[RestaurantStripe] Opening Stripe onboarding in system browser...');
      const canOpen = await Linking.canOpenURL(onboardingLink);
      if (canOpen) {
        await Linking.openURL(onboardingLink);
        console.log('[RestaurantStripe] Opened in system browser');
        
        // Show helpful alert since user will leave the app
        Alert.alert(
          'Complete Stripe Setup',
          'Complete your setup in Safari. When done, return to Troodie and tap "Refresh Status" to continue.',
          [{ text: 'Got it' }]
        );
      } else {
        // Fallback to WebBrowser
        console.log('[RestaurantStripe] Fallback: Opening in embedded browser...');
        const browserResult = await WebBrowser.openBrowserAsync(onboardingLink, {
          dismissButtonStyle: 'done',
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        });
        console.log('[RestaurantStripe] Browser result:', browserResult);
      }

      // After returning from browser, check status
      console.log('[RestaurantStripe] Browser closed, checking status...');
      await checkExistingAccount();
    } catch (error: any) {
      console.error('[RestaurantStripe] Error:', error);
      setError(error.message || 'Failed to connect Stripe');
      setStripeStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshStatus = async () => {
    if (!user?.id) return;
    
    setCheckingStatus(true);
    setError(null);
    
    try {
      console.log('[RestaurantStripe] Refreshing status from Stripe API...');
      
      // Call Edge Function to check Stripe directly (not just database)
      const { data, error: refreshError } = await supabase.functions.invoke('stripe-refresh-account-status', {
        body: { accountType: 'business' },
      });
      
      console.log('[RestaurantStripe] Refresh result:', data);
      
      if (refreshError || !data?.success) {
        console.error('[RestaurantStripe] Refresh failed:', refreshError || data?.error);
        // Fall back to checking database
        await checkExistingAccount();
        return;
      }
      
      if (data.onboardingCompleted) {
        console.log('[RestaurantStripe] ✅ Onboarding completed! Updating state...');
        setStripeStatus('completed');
        updateStripeSetup({
          stripeAccountId: stripeAccountId || '',
          stripeOnboardingComplete: true,
        });
        Alert.alert('Success', 'Your Stripe account is now connected!');
      } else {
        console.log('[RestaurantStripe] Onboarding still incomplete');
        setStripeStatus('in_progress');
        Alert.alert(
          'Still In Progress',
          'Please complete your Stripe onboarding. If you completed it on the web, it may take a moment to sync.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('[RestaurantStripe] Refresh error:', error);
      setError('Failed to refresh status. Please try again.');
      // Fall back to checking database
      await checkExistingAccount();
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleContinue = () => {
    setCurrentStep('restaurant-payment');
    router.push('/onboarding/restaurant-payment');
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Stripe Setup?',
      'You can set up Stripe later, but you won\'t be able to run campaigns until it\'s complete.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip for Now',
          onPress: () => {
            setCurrentStep('restaurant-payment');
            router.push('/onboarding/restaurant-payment');
          },
        },
      ]
    );
  };

  const renderStatusContent = () => {
    if (checkingStatus) {
      return (
        <View style={styles.statusCard}>
          <ActivityIndicator size="large" color="#FFAD27" />
          <Text style={styles.statusText}>Checking your Stripe account...</Text>
        </View>
      );
    }

    switch (stripeStatus) {
      case 'completed':
        return (
          <View style={[styles.statusCard, styles.statusCardSuccess]}>
            <View style={styles.successIcon}>
              <CheckCircle2 size={32} color="#10B981" />
            </View>
            <Text style={styles.statusTitle}>Stripe Connected!</Text>
            <Text style={styles.statusText}>
              Your account is ready to receive payments and run campaigns.
            </Text>
          </View>
        );

      case 'in_progress':
        return (
          <View style={[styles.statusCard, styles.statusCardWarning]}>
            <View style={styles.warningIcon}>
              <AlertCircle size={32} color="#F59E0B" />
            </View>
            <Text style={styles.statusTitle}>Setup In Progress</Text>
            <Text style={styles.statusText}>
              Complete your Stripe onboarding to continue. Tap below to resume.
            </Text>
            <TouchableOpacity
              style={styles.resumeButton}
              onPress={handleConnectStripe}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.resumeButtonText}>Resume Setup</Text>
                  <ExternalLink size={16} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={handleRefreshStatus}
            >
              <RefreshCw size={16} color="#666" />
              <Text style={styles.refreshButtonText}>Refresh Status</Text>
            </TouchableOpacity>
          </View>
        );

      case 'error':
        return (
          <View style={[styles.statusCard, styles.statusCardError]}>
            <View style={styles.errorIcon}>
              <AlertCircle size={32} color="#EF4444" />
            </View>
            <Text style={styles.statusTitle}>Connection Error</Text>
            <Text style={styles.statusText}>{error || 'Something went wrong'}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleConnectStripe}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.retryButtonText}>Try Again</Text>
              )}
            </TouchableOpacity>
          </View>
        );

      default:
        return (
          <View style={styles.statusCard}>
            <View style={styles.stripeIconContainer}>
              <Shield size={48} color="#6366F1" />
            </View>
            <Text style={styles.statusTitle}>Connect Stripe</Text>
            <Text style={styles.statusText}>
              We use Stripe to process payments securely. Connect your account to start running campaigns.
            </Text>

            <View style={styles.benefitsList}>
              <View style={styles.benefitItem}>
                <CheckCircle2 size={16} color="#10B981" />
                <Text style={styles.benefitText}>Secure payment processing</Text>
              </View>
              <View style={styles.benefitItem}>
                <CheckCircle2 size={16} color="#10B981" />
                <Text style={styles.benefitText}>Track campaign spending</Text>
              </View>
              <View style={styles.benefitItem}>
                <CheckCircle2 size={16} color="#10B981" />
                <Text style={styles.benefitText}>Easy refunds if needed</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.connectButton}
              onPress={handleConnectStripe}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.connectButtonText}>Connect with Stripe</Text>
                  <ExternalLink size={18} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.stepIndicator}>Step 2 of 4</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Connect Your Stripe Account</Text>
        <Text style={styles.subtitle}>
          Stripe handles all payments securely. Your card details never touch our servers.
        </Text>

        {renderStatusContent()}

        {/* Security Note */}
        <View style={styles.securityNote}>
          <Shield size={16} color="#6366F1" />
          <Text style={styles.securityText}>
            Stripe is a PCI-compliant payment processor trusted by millions of businesses worldwide.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomContent}>
        {stripeStatus === 'completed' ? (
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
          >
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  stepIndicator: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#666',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    marginBottom: 24,
    lineHeight: 22,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statusCardSuccess: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  statusCardWarning: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  statusCardError: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  stripeIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  warningIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  statusText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  benefitsList: {
    alignSelf: 'stretch',
    marginTop: 8,
    marginBottom: 20,
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  benefitText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#333',
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    alignSelf: 'stretch',
  },
  connectButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
  resumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    alignSelf: 'stretch',
  },
  resumeButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  refreshButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#666',
  },
  retryButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EEF2FF',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginTop: 20,
  },
  securityText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#4338CA',
    lineHeight: 18,
  },
  bottomContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 16,
    backgroundColor: '#FFFDF7',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  continueButton: {
    height: 52,
    backgroundColor: '#FFAD27',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
  skipButton: {
    height: 52,
    backgroundColor: 'transparent',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#666',
  },
});
