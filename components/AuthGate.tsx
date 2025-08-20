import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ScrollView,
  Linking,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { designTokens } from '@/constants/designTokens';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { debugComponent } from '@/utils/debugComponent';

interface AuthGateProps {
  children: React.ReactNode;
  screenName?: string;
  customMessage?: string;
  customTitle?: string;
  showIllustration?: boolean;
}

export function AuthGate({ 
  children, 
  screenName = 'this section',
  customMessage,
  customTitle,
  showIllustration = true
}: AuthGateProps) {
  debugComponent('AuthGate', { children, screenName, customMessage, customTitle, showIllustration });
  
  const { isAuthenticated, isAnonymous } = useAuth();
  const router = useRouter();

  // If authenticated, show the protected content
  if (isAuthenticated) {
    return <>{children}</>;
  }

  const handleSignUp = () => {
    router.push('/onboarding/signup');
  };

  const handleLogin = () => {
    router.push('/onboarding/login');
  };

  // If anonymous, show the CTA screen
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.logo}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#666' }}>Troodie</Text>
          </View>

          {/* Compact Illustration */}
          <View style={styles.illustrationContainer}>
            <View style={styles.iconRow}>
              <View style={[styles.iconCircle, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="restaurant" size={24} color="#FFAD27" />
              </View>
              <View style={[styles.iconCircle, { backgroundColor: '#F3E0FF' }]}>
                <Ionicons name="bookmark" size={24} color="#5B4CCC" />
              </View>
              <View style={[styles.iconCircle, { backgroundColor: '#FFE0E0' }]}>
                <Ionicons name="heart" size={24} color="#FF4444" />
              </View>
              <View style={[styles.iconCircle, { backgroundColor: '#E0F0FF' }]}>
                <Ionicons name="people" size={24} color="#4A90E2" />
              </View>
            </View>
          </View>

          {/* Title and Message */}
          <View style={styles.textContainer}>
            <Text style={styles.title}>
              {customTitle || `Sign in to access ${screenName}`}
            </Text>
            <Text style={styles.message}>
              {customMessage || 'Join our community to save your favorite restaurants, share reviews, and discover new places to eat.'}
            </Text>
          </View>

          {/* CTA Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.signUpButton} 
              onPress={handleSignUp}
            >
              <Text style={styles.signUpButtonText}>Sign Up</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.loginButton} 
              onPress={handleLogin}
            >
              <Text style={styles.loginButtonText}>Already have an account? Log In</Text>
            </TouchableOpacity>
          </View>

          {/* Compact Benefits List */}
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={16} color="#FFAD27" />
              <Text style={styles.benefitText}>Save & organize your favorite spots</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={16} color="#FFAD27" />
              <Text style={styles.benefitText}>Get personalized recommendations</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={16} color="#FFAD27" />
              <Text style={styles.benefitText}>Connect with food lovers</Text>
            </View>
          </View>

          {/* Terms */}
          <Text style={styles.termsText}>
            By continuing, you agree to Troodie's{' '}
            <Text 
              style={styles.termsLink}
              onPress={() => Linking.openURL('https://www.troodieapp.com/terms-of-service')}
            >
              Terms of Service
            </Text>{' '}and{' '}
            <Text 
              style={styles.termsLink}
              onPress={() => Linking.openURL('https://www.troodieapp.com/privacy-policy')}
            >
              Privacy Policy
            </Text>.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF7',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    alignItems: 'center',
  },
  logo: {
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationContainer: {
    marginBottom: 24,
  },
  iconRow: {
    flexDirection: 'row',
    gap: 16,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: designTokens.colors.textDark,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 20,
  },
  signUpButton: {
    backgroundColor: '#FFAD27',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  signUpButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
  loginButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#5B4CCC',
  },
  benefitsList: {
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  benefitText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textDark,
  },
  termsText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textLight,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 20,
  },
  termsLink: {
    color: '#5B4CCC',
    textDecorationLine: 'underline',
  },
});