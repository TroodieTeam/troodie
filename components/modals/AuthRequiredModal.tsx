import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Dimensions,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { designTokens } from '@/constants/designTokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AuthRequiredModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  feature?: string;
}

export function AuthRequiredModal({ 
  visible, 
  onClose, 
  title = "Join the Troodie Community",
  message = "Sign in to save your favorite spots, share discoveries, and connect with fellow food lovers.",
  feature
}: AuthRequiredModalProps) {
  const router = useRouter();

  const handleSignIn = () => {
    onClose();
    router.push('/onboarding/login');
  };

  const handleSignUp = () => {
    onClose();
    router.push('/onboarding/signup');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.container}>
          <View style={styles.modal}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Image 
                source={require('../../assets/images/trodie_logo_gray.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <View style={{ width: 60 }} />
            </View>

            {/* Content */}
            <View style={styles.content}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>

              {/* Illustration */}
              <View style={styles.illustrationContainer}>
                <View style={styles.phoneFrame}>
                  <View style={styles.profileCircle}>
                    <Ionicons name="person" size={40} color="#FFAD27" />
                  </View>
                  <View style={styles.iconRow}>
                    <View style={styles.iconBox}>
                      <Ionicons name="bookmark" size={24} color="#FFAD27" />
                    </View>
                    <View style={styles.iconBox}>
                      <Ionicons name="camera" size={24} color="#FFAD27" />
                    </View>
                    <View style={styles.iconBox}>
                      <Ionicons name="heart" size={24} color="#FFAD27" />
                    </View>
                  </View>
                </View>
              </View>


              {/* Auth Buttons */}
              <View style={styles.authButtons}>
                <TouchableOpacity style={styles.loginButton} onPress={handleSignIn}>
                  <Text style={styles.loginButtonText}>Log In</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.signUpButton} onPress={handleSignUp}>
                  <Text style={styles.signUpButtonText}>Sign Up</Text>
                </TouchableOpacity>
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
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    flex: 1,
  },
  modal: {
    flex: 1,
    backgroundColor: '#FFFDF7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  cancelButton: {
    width: 60,
  },
  cancelText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.textDark,
  },
  logo: {
    width: 100,
    height: 30,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: designTokens.colors.textDark,
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  illustrationContainer: {
    marginVertical: 32,
    alignItems: 'center',
  },
  phoneFrame: {
    width: 200,
    height: 200,
    backgroundColor: '#FFF',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  profileCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  iconRow: {
    flexDirection: 'row',
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  loginButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: designTokens.colors.textDark,
  },
  signUpButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#FFAD27',
    alignItems: 'center',
  },
  signUpButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
  termsText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textLight,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  termsLink: {
    color: '#5B4CCC',
    textDecorationLine: 'underline',
  },
});