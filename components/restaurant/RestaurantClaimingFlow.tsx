import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

interface RestaurantClaimingFlowProps {
  restaurantId: string;
  restaurantName: string;
  restaurantWebsite?: string;
  onComplete: () => void;
  onCancel: () => void;
}

interface ClaimingState {
  email: string;
  verificationMethod: 'pending' | 'instant' | 'code' | 'manual';
  verificationCode: string;
  enteredCode: string;
  loading: boolean;
  error: string | null;
  timeRemaining: number;
}

export const RestaurantClaimingFlow: React.FC<RestaurantClaimingFlowProps> = ({
  restaurantId,
  restaurantName,
  restaurantWebsite,
  onComplete,
  onCancel,
}) => {
  const navigation = useNavigation();
  const { user, refreshUser } = useAuth();
  const [state, setState] = useState<ClaimingState>({
    email: '',
    verificationMethod: 'pending',
    verificationCode: '',
    enteredCode: '',
    loading: false,
    error: null,
    timeRemaining: 600, // 10 minutes in seconds
  });

  // Timer for verification code expiry
  useEffect(() => {
    if (state.verificationMethod === 'code' && state.timeRemaining > 0) {
      const timer = setTimeout(() => {
        setState(prev => ({ ...prev, timeRemaining: prev.timeRemaining - 1 }));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [state.verificationMethod, state.timeRemaining]);

  const extractDomain = (url: string): string => {
    let domain = url.toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0]
      .split('@').pop() || '';
    
    // Extract main domain (remove subdomains except www)
    const parts = domain.split('.');
    if (parts.length > 2 && parts[0] !== 'www') {
      return parts.slice(-2).join('.');
    }
    return domain;
  };

  const handleEmailSubmit = async () => {
    if (!state.email.includes('@')) {
      setState(prev => ({ ...prev, error: 'Please enter a valid email address' }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Call the verify_restaurant_claim function
      const { data, error } = await supabase.rpc('verify_restaurant_claim', {
        p_restaurant_id: restaurantId,
        p_user_id: user?.id,
        p_email: state.email,
        p_restaurant_website: restaurantWebsite,
      });

      if (error) throw error;

      if (data.method === 'instant') {
        // Instant verification successful!
        await refreshUser();
        Alert.alert(
          'Success! 🎉',
          'Your restaurant has been verified instantly!',
          [{ text: 'Continue', onPress: onComplete }]
        );
      } else if (data.method === 'email_code') {
        // Show code entry screen
        setState(prev => ({
          ...prev,
          verificationMethod: 'code',
          verificationCode: data.code, // For testing only, remove in production
          loading: false,
        }));
        
        // In production, send email here
        Alert.alert(
          'Verification Code Sent',
          `We've sent a 6-digit code to ${state.email}. Please check your email.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('Error submitting email:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to verify email. Please try again.',
      }));
    }
  };

  const handleCodeVerification = async () => {
    if (state.enteredCode.length !== 6) {
      setState(prev => ({ ...prev, error: 'Please enter a 6-digit code' }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { data, error } = await supabase.rpc('verify_claim_code', {
        p_restaurant_id: restaurantId,
        p_user_id: user?.id,
        p_code: state.enteredCode,
      });

      if (error) throw error;

      if (data.success) {
        await refreshUser();
        Alert.alert(
          'Success! 🎉',
          'Your restaurant has been successfully claimed!',
          [{ text: 'Continue', onPress: onComplete }]
        );
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: data.error || 'Invalid verification code',
        }));
      }
    } catch (error: any) {
      console.error('Error verifying code:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to verify code. Please try again.',
      }));
    }
  };

  const resendCode = async () => {
    setState(prev => ({
      ...prev,
      verificationMethod: 'pending',
      enteredCode: '',
      timeRemaining: 600,
    }));
    await handleEmailSubmit();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (state.verificationMethod === 'code') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Verify Ownership</Text>
          <View style={{ width: 24 }} />
        </View>

        <KeyboardAvoidingView
          style={styles.content}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.codeContainer}>
            <Ionicons name="mail-outline" size={48} color={colors.primary} />
            
            <Text style={styles.codeTitle}>Enter Verification Code</Text>
            <Text style={styles.codeSubtitle}>
              We sent a 6-digit code to{'\n'}{state.email}
            </Text>

            {/* For testing only - remove in production */}
            {__DEV__ && state.verificationCode && (
              <Text style={styles.testCode}>Test Code: {state.verificationCode}</Text>
            )}

            <View style={styles.codeInputContainer}>
              <TextInput
                style={styles.codeInput}
                value={state.enteredCode}
                onChangeText={(text) => setState(prev => ({ 
                  ...prev, 
                  enteredCode: text.replace(/[^0-9]/g, '').slice(0, 6),
                  error: null,
                }))}
                placeholder="000000"
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
            </View>

            {state.error && (
              <Text style={styles.errorText}>{state.error}</Text>
            )}

            <Text style={styles.timerText}>
              Code expires in {formatTime(state.timeRemaining)}
            </Text>

            <TouchableOpacity
              style={[styles.primaryButton, state.loading && styles.disabledButton]}
              onPress={handleCodeVerification}
              disabled={state.loading || state.enteredCode.length !== 6}
            >
              {state.loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.primaryButtonText}>Verify Code</Text>
              )}
            </TouchableOpacity>

            {state.timeRemaining === 0 ? (
              <TouchableOpacity onPress={resendCode}>
                <Text style={styles.resendText}>Resend Code</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={resendCode} disabled={state.timeRemaining > 540}>
                <Text style={[
                  styles.resendText,
                  state.timeRemaining > 540 && styles.resendTextDisabled
                ]}>
                  Resend code {state.timeRemaining > 540 ? `(${formatTime(state.timeRemaining - 540)})` : ''}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Claim Restaurant</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.restaurantInfo}>
            <Ionicons name="restaurant-outline" size={32} color={colors.primary} />
            <Text style={styles.restaurantName}>{restaurantName}</Text>
          </View>

          <Text style={styles.title}>Verify Your Restaurant</Text>

          <View style={styles.infoBox}>
            <Ionicons name="flash" size={20} color={colors.success} />
            <Text style={styles.infoText}>
              {restaurantWebsite ? (
                `Use an email ending with @${extractDomain(restaurantWebsite)} for instant verification!`
              ) : (
                'Enter your business email to verify ownership'
              )}
            </Text>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.label}>Business Email</Text>
            <TextInput
              style={styles.input}
              value={state.email}
              onChangeText={(text) => setState(prev => ({ ...prev, email: text, error: null }))}
              placeholder="owner@restaurant.com"
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            
            {state.error && (
              <Text style={styles.errorText}>{state.error}</Text>
            )}
          </View>

          <View style={styles.benefitsList}>
            <BenefitItem
              icon="checkmark-circle"
              text="Manage your restaurant profile"
            />
            <BenefitItem
              icon="megaphone"
              text="Create campaigns for creators"
            />
            <BenefitItem
              icon="analytics"
              text="Access business analytics"
            />
            <BenefitItem
              icon="star"
              text="Respond to reviews"
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.primaryButton, state.loading && styles.disabledButton]}
            onPress={handleEmailSubmit}
            disabled={state.loading || !state.email.includes('@')}
          >
            {state.loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.primaryButtonText}>Verify Ownership</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => {
              Alert.alert(
                'Manual Review',
                'If you\'re having issues with verification, you can request a manual review. This typically takes 24-48 hours.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Request Review', 
                    onPress: () => {
                      // Navigate to manual review screen
                      navigation.navigate('ManualReview' as any, { restaurantId, restaurantName });
                    }
                  }
                ]
              );
            }}
          >
            <Text style={styles.alternativeText}>
              Having issues? Request manual review
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// Benefit Item Component
const BenefitItem: React.FC<{
  icon: string;
  text: string;
}> = ({ icon, text }) => (
  <View style={styles.benefitItem}>
    <Ionicons name={icon as any} size={20} color={colors.primary} />
    <Text style={styles.benefitText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.h3,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  restaurantInfo: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  restaurantName: {
    ...typography.h2,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  title: {
    ...typography.h3,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.xl,
  },
  infoText: {
    ...typography.body,
    color: colors.success,
    marginLeft: spacing.sm,
    flex: 1,
  },
  formSection: {
    marginBottom: spacing.xl,
  },
  label: {
    ...typography.bodyBold,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    ...typography.body,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
  benefitsList: {
    marginBottom: spacing.xl,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  benefitText: {
    ...typography.body,
    marginLeft: spacing.sm,
    flex: 1,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    ...typography.bodyBold,
    color: 'white',
  },
  disabledButton: {
    opacity: 0.5,
  },
  alternativeText: {
    ...typography.body,
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  codeContainer: {
    flex: 1,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeTitle: {
    ...typography.h2,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  codeSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  testCode: {
    ...typography.caption,
    color: colors.warning,
    backgroundColor: colors.warningLight,
    padding: spacing.sm,
    borderRadius: 4,
    marginBottom: spacing.md,
  },
  codeInputContainer: {
    marginBottom: spacing.lg,
  },
  codeInput: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
    width: 200,
  },
  timerText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  resendText: {
    ...typography.body,
    color: colors.primary,
    marginTop: spacing.md,
  },
  resendTextDisabled: {
    color: colors.textSecondary,
  },
});