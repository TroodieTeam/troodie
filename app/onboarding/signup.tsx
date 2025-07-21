import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/authService';

export default function SignupScreen() {
  const router = useRouter();
  const { setCurrentStep } = useOnboarding();
  const { signUpWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [isValidEmail, setIsValidEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastRequestTime, setLastRequestTime] = useState<number | null>(null);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);
  const emailInputRef = useRef<TextInput>(null);

  // Check rate limit status
  useEffect(() => {
    if (lastRequestTime) {
      const interval = setInterval(() => {
        const { limited, secondsRemaining } = authService.shouldShowRateLimit(lastRequestTime);
        setRateLimitCountdown(secondsRemaining);
        if (!limited) {
          clearInterval(interval);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [lastRequestTime]);

  const handleEmailChange = (text: string) => {
    setEmail(text.trim());
    setIsValidEmail(authService.isValidEmail(text.trim()));
  };

  const handleNext = async () => {
    if (!isValidEmail) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    // Check rate limit
    const { limited, secondsRemaining } = authService.shouldShowRateLimit(lastRequestTime);
    if (limited) {
      Alert.alert(
        'Please Wait',
        `You need to wait ${secondsRemaining} seconds before requesting another code.`
      );
      return;
    }

    setLoading(true);
    try {
      const result = await signUpWithEmail(email);
      
      if (result.success) {
        setLastRequestTime(Date.now());
        // Store email in context for verification screen
        setCurrentStep('verify');
        router.push({
          pathname: '/onboarding/verify',
          params: { email, type: 'signup' }
        });
      } else {
        Alert.alert('Error', result.error || 'Failed to send verification code');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
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
          <Text style={styles.title}>What&apos;s your</Text>
          <Text style={styles.title}>email address?</Text>
          
          <TextInput
            ref={emailInputRef}
            style={styles.input}
            value={email}
            onChangeText={handleEmailChange}
            placeholder="user@example.com"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />

          <Text style={styles.disclaimer}>
            By tapping next you&apos;re creating an account and you agree to the Buyer Account terms and Supplier Terms and acknowledge Troodie&apos;s Privacy Policy
          </Text>

          {rateLimitCountdown > 0 && (
            <View style={styles.rateLimitContainer}>
              <Text style={styles.rateLimitText}>
                Please wait {rateLimitCountdown} seconds before requesting another code
              </Text>
            </View>
          )}
        </View>

        <View style={styles.bottomContent}>
          <TouchableOpacity 
            style={[
              styles.nextButton, 
              (!isValidEmail || loading || rateLimitCountdown > 0) && styles.nextButtonDisabled
            ]} 
            onPress={handleNext}
            disabled={!isValidEmail || loading || rateLimitCountdown > 0}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.nextButtonText}>Next</Text>
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
    fontSize: 32,
    fontFamily: 'Poppins_700Bold',
    color: '#333',
    lineHeight: 40,
  },
  input: {
    fontSize: 24,
    fontFamily: 'Inter_500Medium',
    color: '#333',
    paddingVertical: 16,
    marginTop: 40,
    borderBottomWidth: 2,
    borderBottomColor: '#E5E5E5',
  },
  disclaimer: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    marginTop: 20,
    lineHeight: 18,
  },
  bottomContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  nextButton: {
    backgroundColor: '#5B4CCC',
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
  rateLimitContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
  },
  rateLimitText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#856404',
    textAlign: 'center',
  },
});