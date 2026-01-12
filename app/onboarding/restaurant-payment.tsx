/**
 * Restaurant Payment Method Screen (TRO-136)
 * Save a payment method for future campaign payments
 */

import { useAuth } from '@/contexts/AuthContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  CheckCircle2,
  CreditCard,
  Lock,
  Shield,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type PaymentStatus = 'not_started' | 'processing' | 'completed' | 'error';

export default function RestaurantPaymentScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { setCurrentStep, updateStripeSetup, state } = useOnboarding();

  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('not_started');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Card form state (for display - actual processing via Stripe)
  const [cardLast4, setCardLast4] = useState<string | null>(null);
  const [cardBrand, setCardBrand] = useState<string | null>(null);

  // Check if user already has a saved payment method
  useEffect(() => {
    if (user?.id) {
      checkExistingPaymentMethod();
    }
  }, [user?.id]);

  const checkExistingPaymentMethod = async () => {
    if (!user?.id) return;

    try {
      const { data: businessProfile } = await supabase
        .from('business_profiles')
        .select('default_payment_method_id, payment_method_last4, payment_method_brand')
        .eq('user_id', user.id)
        .single();

      if (businessProfile?.default_payment_method_id) {
        setCardLast4(businessProfile.payment_method_last4);
        setCardBrand(businessProfile.payment_method_brand);
        setPaymentStatus('completed');
        updateStripeSetup({
          paymentMethodId: businessProfile.default_payment_method_id,
          paymentMethodLast4: businessProfile.payment_method_last4,
          paymentMethodBrand: businessProfile.payment_method_brand,
        });
      }
    } catch (error) {
      console.error('[RestaurantPayment] Error checking payment method:', error);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleAddPaymentMethod = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'Please sign in to continue');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[RestaurantPayment] Calling stripe-create-setup-intent Edge Function...');
      
      // Call Edge Function to create SetupIntent
      const { data, error: functionError } = await supabase.functions.invoke(
        'stripe-create-setup-intent',
        {
          body: { userId: user.id },
        }
      );

      console.log('[RestaurantPayment] Edge Function response:', { 
        data, 
        error: functionError,
        errorMessage: functionError?.message,
      });

      if (functionError) {
        // Check if it's a deployment issue
        if (functionError.message?.includes('non-2xx') || functionError.message?.includes('404')) {
          console.error('[RestaurantPayment] Edge Function may not be deployed. Offering simulation...');
          Alert.alert(
            'Payment Setup',
            'The payment service is being set up. Would you like to simulate adding a card for testing?',
            [
              {
                text: 'Simulate Card',
                onPress: () => simulatePaymentMethodSave(),
              },
              { text: 'Cancel', style: 'cancel' },
            ]
          );
          return;
        }
        throw new Error(functionError.message || 'Failed to initialize payment setup');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to create payment setup');
      }

      // In a real implementation, you'd use Stripe's CardField component
      // For now, we'll simulate success with the returned data
      if (data.paymentMethodId) {
        setCardLast4(data.last4 || '4242');
        setCardBrand(data.brand || 'visa');
        setPaymentStatus('completed');

        updateStripeSetup({
          stripeCustomerId: data.customerId,
          paymentMethodId: data.paymentMethodId,
          paymentMethodLast4: data.last4,
          paymentMethodBrand: data.brand,
        });

        Alert.alert('Success', 'Payment method saved successfully!');
      } else {
        // If no payment method yet, this is where you'd show Stripe's card input
        // For now, show a placeholder message
        Alert.alert(
          'Payment Setup',
          'In production, this would open Stripe\'s secure card entry form. For testing, the payment method will be simulated.',
          [
            {
              text: 'Simulate Success',
              onPress: () => simulatePaymentMethodSave(),
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      }
    } catch (error: any) {
      console.error('[RestaurantPayment] Error:', error);
      setError(error.message || 'Failed to set up payment method');
      setPaymentStatus('error');
    } finally {
      setLoading(false);
    }
  };

  // Simulate saving a payment method for testing
  const simulatePaymentMethodSave = async () => {
    setLoading(true);
    
    try {
      // Update business profile with simulated payment method
      const { error: updateError } = await supabase
        .from('business_profiles')
        .update({
          payment_method_last4: '4242',
          payment_method_brand: 'visa',
          payment_setup_completed: true,
        })
        .eq('user_id', user?.id);

      if (updateError) {
        throw updateError;
      }

      setCardLast4('4242');
      setCardBrand('visa');
      setPaymentStatus('completed');

      updateStripeSetup({
        paymentMethodLast4: '4242',
        paymentMethodBrand: 'visa',
      });
    } catch (error: any) {
      console.error('[RestaurantPayment] Simulation error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    setCurrentStep('restaurant-complete');
    router.push('/onboarding/restaurant-complete');
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Payment Setup?',
      'You can add a payment method later when creating your first campaign.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip for Now',
          onPress: () => {
            setCurrentStep('restaurant-complete');
            router.push('/onboarding/restaurant-complete');
          },
        },
      ]
    );
  };

  const formatCardBrand = (brand: string | null) => {
    if (!brand) return 'Card';
    return brand.charAt(0).toUpperCase() + brand.slice(1);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.stepIndicator}>Step 3 of 4</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Add Payment Method</Text>
        <Text style={styles.subtitle}>
          Save a card to fund your campaigns. You'll only be charged when you approve completed creator work.
        </Text>

        {/* Payment Card */}
        <View style={styles.paymentCard}>
          {paymentStatus === 'completed' ? (
            <>
              <View style={styles.savedCardHeader}>
                <CheckCircle2 size={24} color="#10B981" />
                <Text style={styles.savedCardTitle}>Card Saved</Text>
              </View>
              
              <View style={styles.savedCardDetails}>
                <CreditCard size={32} color="#333" />
                <View style={styles.cardInfo}>
                  <Text style={styles.cardBrand}>{formatCardBrand(cardBrand)}</Text>
                  <Text style={styles.cardNumber}>•••• •••• •••• {cardLast4}</Text>
                </View>
                <TouchableOpacity
                  style={styles.changeButton}
                  onPress={handleAddPaymentMethod}
                >
                  <Text style={styles.changeButtonText}>Change</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={styles.cardIconContainer}>
                <CreditCard size={48} color="#10B981" />
              </View>
              
              <Text style={styles.cardTitle}>Save a Payment Method</Text>
              <Text style={styles.cardDescription}>
                Your card will be securely saved for future campaign payments.
              </Text>

              <View style={styles.benefitsList}>
                <View style={styles.benefitItem}>
                  <CheckCircle2 size={16} color="#10B981" />
                  <Text style={styles.benefitText}>No upfront charges</Text>
                </View>
                <View style={styles.benefitItem}>
                  <CheckCircle2 size={16} color="#10B981" />
                  <Text style={styles.benefitText}>Pay only when you approve work</Text>
                </View>
                <View style={styles.benefitItem}>
                  <CheckCircle2 size={16} color="#10B981" />
                  <Text style={styles.benefitText}>Change anytime in settings</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.addCardButton}
                onPress={handleAddPaymentMethod}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <CreditCard size={20} color="#FFFFFF" />
                    <Text style={styles.addCardButtonText}>Add Card</Text>
                  </>
                )}
              </TouchableOpacity>

              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Security Note */}
        <View style={styles.securityNote}>
          <Lock size={16} color="#10B981" />
          <Text style={styles.securityText}>
            Your payment information is encrypted and secured by Stripe. We never store your full card details.
          </Text>
        </View>

        {/* Trust Badges */}
        <View style={styles.trustBadges}>
          <View style={styles.trustBadge}>
            <Shield size={20} color="#6366F1" />
            <Text style={styles.trustBadgeText}>PCI Compliant</Text>
          </View>
          <View style={styles.trustBadge}>
            <Lock size={20} color="#6366F1" />
            <Text style={styles.trustBadgeText}>256-bit SSL</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomContent}>
        {paymentStatus === 'completed' ? (
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
  paymentCard: {
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
  cardIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  savedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  savedCardTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#10B981',
  },
  savedCardDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    alignSelf: 'stretch',
    gap: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardBrand: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
  },
  cardNumber: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#666',
    letterSpacing: 1,
  },
  changeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  changeButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFAD27',
  },
  benefitsList: {
    alignSelf: 'stretch',
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
  addCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    alignSelf: 'stretch',
  },
  addCardButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    alignSelf: 'stretch',
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#EF4444',
    textAlign: 'center',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ECFDF5',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginTop: 20,
  },
  securityText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#047857',
    lineHeight: 18,
  },
  trustBadges: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 20,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#6366F1',
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
