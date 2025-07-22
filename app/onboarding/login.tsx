import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/authService';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
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

export default function LoginScreen() {
  const router = useRouter();
  const { signInWithEmail, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [isValidEmail, setIsValidEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastRequestTime, setLastRequestTime] = useState<number | null>(null);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);

  // Check if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      console.log('[Login] User is already authenticated, redirecting to main app');
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, router]);

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

  const handleLogin = async () => {
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
      const result = await signInWithEmail(email);
      
      if (result.success) {
        setLastRequestTime(Date.now());
        // Navigate to verification screen
        router.push({
          pathname: '/onboarding/verify',
          params: { email, type: 'login' }
        });
      } else {
        // If user doesn't exist, show appropriate message
        if (result.error?.includes('not found') || result.error?.includes('not exist')) {
          Alert.alert(
            'Account Not Found',
            'No account found with this email. Would you like to sign up?',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Sign Up', 
                onPress: () => router.push('/onboarding/signup')
              }
            ]
          );
        } else {
          Alert.alert('Error', result.error || 'Failed to send verification code');
        }
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
          <Text style={styles.title}>Welcome back!</Text>
          <Text style={styles.subtitle}>Enter your email to continue</Text>
          
          <TextInput
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

          {rateLimitCountdown > 0 && (
            <View style={styles.rateLimitContainer}>
              <Text style={styles.rateLimitText}>
                Please wait {rateLimitCountdown} seconds before requesting another code
              </Text>
            </View>
          )}

          <Text style={styles.helperText}>
            We'll send you a verification code to log in
          </Text>
        </View>

        <View style={styles.bottomContent}>
          <TouchableOpacity 
            style={[
              styles.loginButton, 
              (!isValidEmail || loading || rateLimitCountdown > 0) && styles.loginButtonDisabled
            ]} 
            onPress={handleLogin}
            disabled={!isValidEmail || loading || rateLimitCountdown > 0}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>Send Code</Text>
            )}
          </TouchableOpacity>

          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/onboarding/signup')}>
              <Text style={styles.signupLink}>Sign up</Text>
            </TouchableOpacity>
          </View>
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    marginBottom: 40,
  },
  input: {
    fontSize: 20,
    fontFamily: 'Inter_500Medium',
    color: '#333',
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#E5E5E5',
  },
  helperText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    marginTop: 16,
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
  bottomContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  loginButton: {
    backgroundColor: '#FFAD27',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  loginButtonDisabled: {
    backgroundColor: '#D3D3D3',
  },
  loginButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  signupText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
  },
  signupLink: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#5B4CCC',
    textDecorationLine: 'underline',
  },
});