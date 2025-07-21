import { useAuth } from '@/contexts/AuthContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { authService } from '@/services/authService';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

export default function VerifyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email: string; type: 'signup' | 'login' }>();
  const { setCurrentStep } = useOnboarding();
  const { verifyOtp, resendOtp } = useAuth();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isValid, setIsValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [lastResendTime, setLastResendTime] = useState<number | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const email = params.email || '';
  const verificationType = params.type || 'signup';

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  // Check resend rate limit
  useEffect(() => {
    if (lastResendTime) {
      const interval = setInterval(() => {
        const { limited, secondsRemaining } = authService.shouldShowRateLimit(lastResendTime);
        setResendCountdown(secondsRemaining);
        if (!limited) {
          clearInterval(interval);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [lastResendTime]);

  const handleCodeChange = (value: string, index: number) => {
    // Only allow numeric input
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Check if code is complete
    const fullCode = newCode.join('');
    setIsValid(fullCode.length === 6);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit if code is complete
    if (fullCode.length === 6) {
      handleVerify(fullCode);
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (fullCode?: string) => {
    const verificationCode = fullCode || code.join('');
    
    if (verificationCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit code sent to your email');
      return;
    }

    setLoading(true);
    try {
      const result = await verifyOtp(email, verificationCode);
      
      if (result.success) {
        setCurrentStep('quiz');
        router.push('/onboarding/quiz');
      } else {
        Alert.alert('Verification Failed', result.error || 'Invalid verification code');
        // Clear the code on error
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    // Check rate limit
    const { limited, secondsRemaining } = authService.shouldShowRateLimit(lastResendTime);
    if (limited) {
      Alert.alert(
        'Please Wait',
        `You need to wait ${secondsRemaining} seconds before requesting another code.`
      );
      return;
    }

    setResending(true);
    try {
      const result = await resendOtp(email, verificationType);
      
      if (result.success) {
        setLastResendTime(Date.now());
        Alert.alert('Code Resent', 'A new verification code has been sent to your email');
        // Clear the old code
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        Alert.alert('Error', result.error || 'Failed to resend code');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const maskEmail = (email: string) => {
    if (!email) return '';
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) return email;
    
    const visibleLength = Math.min(3, Math.floor(localPart.length / 2));
    const masked = localPart.substring(0, visibleLength) + 
                  '*'.repeat(localPart.length - visibleLength) + 
                  '@' + domain;
    return masked;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#333" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Enter the code sent</Text>
          <Text style={styles.title}>to {maskEmail(email)}</Text>
          
          <View style={styles.codeContainer}>
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => inputRefs.current[index] = ref}
                style={[
                  styles.codeInput,
                  digit ? styles.codeInputFilled : null
                ]}
                value={digit}
                onChangeText={(value) => handleCodeChange(value, index)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                keyboardType="number-pad"
                maxLength={1}
                textAlign="center"
                editable={!loading}
              />
            ))}
          </View>

          <TouchableOpacity 
            onPress={handleResend} 
            style={styles.resendButton}
            disabled={resending || resendCountdown > 0}
          >
            {resending ? (
              <ActivityIndicator size="small" color="#FFAD27" />
            ) : (
              <Text style={[
                styles.resendText,
                resendCountdown > 0 && styles.resendTextDisabled
              ]}>
                {resendCountdown > 0 
                  ? `Resend in ${resendCountdown}s` 
                  : 'Resend code'
                }
              </Text>
            )}
          </TouchableOpacity>

          <Text style={styles.helperText}>
            Didn't receive the code? Check your spam folder
          </Text>
        </View>

        <View style={styles.bottomContent}>
          <TouchableOpacity 
            style={[styles.nextButton, (!isValid || loading) && styles.nextButtonDisabled]} 
            onPress={() => handleVerify()}
            disabled={!isValid || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.nextButtonText}>Verify</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF7',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    color: '#333',
    lineHeight: 36,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 40,
    marginBottom: 20,
  },
  codeInput: {
    width: 50,
    height: 60,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    fontSize: 24,
    fontFamily: 'Inter_600SemiBold',
    color: '#333',
    backgroundColor: '#FFFFFF',
  },
  codeInputFilled: {
    borderColor: '#FFAD27',
    backgroundColor: '#F8F6FF',
  },
  resendButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    minHeight: 32,
    justifyContent: 'center',
  },
  resendText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#FFAD27',
    textDecorationLine: 'underline',
  },
  resendTextDisabled: {
    color: '#999',
    textDecorationLine: 'none',
  },
  helperText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    marginTop: 16,
  },
  bottomContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  nextButton: {
    backgroundColor: '#FFAD27',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: '#D3D3D3',
  },
  nextButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
});