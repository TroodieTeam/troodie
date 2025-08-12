import { useAuth } from '@/contexts/AuthContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { profileService } from '@/services/profileService';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Check, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

export default function UsernameScreen() {
  const router = useRouter();
  const { state, updateState } = useOnboarding();
  const { user } = useAuth();
  const [username, setUsername] = useState('');
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (username.length >= 3) {
      checkUsername();
    } else {
      setAvailable(null);
      setError(username.length > 0 ? 'Username must be at least 3 characters' : '');
    }
  }, [username]);

  const checkUsername = async () => {
    setChecking(true);
    setError('');
    
    try {
      const isAvailable = await profileService.checkUsernameAvailability(username);
      setAvailable(isAvailable);
      if (!isAvailable) {
        setError('Username already taken');
      }
    } catch (error) {
      console.error('Error checking username:', error);
      setError('Error checking username');
    } finally {
      setChecking(false);
    }
  };

  const handleUsernameChange = (text: string) => {
    // Only allow lowercase letters, numbers, and underscores
    const cleaned = text.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(cleaned);
  };

  const handleContinue = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (!available) {
      setError('Please choose an available username');
      return;
    }

    setSaving(true);
    try {
      await profileService.setUsername(user.id, username);
      updateState({ username });
      router.push('/onboarding/bio');
    } catch (error: any) {
      console.error('Error setting username:', error);
      Alert.alert('Error', error.message || 'Failed to set username');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    router.push('/onboarding/bio');
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

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Choose your username</Text>
          <Text style={styles.subtitle}>
            This is how others will find and tag you
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputPrefix}>@</Text>
            <TextInput
              style={[
                styles.input,
                error && styles.inputError,
                available && styles.inputSuccess
              ]}
              value={username}
              onChangeText={handleUsernameChange}
              placeholder="username"
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            {checking && (
              <ActivityIndicator 
                size="small" 
                color="#666"
                style={styles.inputIcon}
              />
            )}
            {!checking && available === true && (
              <Check 
                size={20} 
                color="#4CAF50"
                style={styles.inputIcon}
              />
            )}
            {!checking && available === false && (
              <X 
                size={20} 
                color="#F44336"
                style={styles.inputIcon}
              />
            )}
          </View>

          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          {available && (
            <Text style={styles.successText}>Username available!</Text>
          )}

          <View style={styles.rules}>
            <Text style={styles.rulesTitle}>Username rules:</Text>
            <Text style={styles.ruleText}>• At least 3 characters</Text>
            <Text style={styles.ruleText}>• Only lowercase letters, numbers, and underscores</Text>
            <Text style={styles.ruleText}>• Must be unique</Text>
          </View>
        </ScrollView>

        <View style={styles.bottomContent}>
          <TouchableOpacity 
            style={styles.skipButton}
            onPress={handleSkip}
          >
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.continueButton,
              (!available || saving) && styles.continueButtonDisabled
            ]}
            onPress={handleContinue}
            disabled={!available || saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.continueText}>Continue</Text>
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
    paddingBottom: 5,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: '#333',
    lineHeight: 32,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  inputPrefix: {
    position: 'absolute',
    left: 16,
    top: 14,
    fontSize: 18,
    fontFamily: 'Inter_500Medium',
    color: '#666',
    zIndex: 1,
  },
  input: {
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    paddingLeft: 44,
    paddingRight: 48,
    paddingVertical: 12,
    fontSize: 18,
    fontFamily: 'Inter_500Medium',
    color: '#333',
  },
  inputError: {
    borderColor: '#F44336',
  },
  inputSuccess: {
    borderColor: '#4CAF50',
  },
  inputIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#F44336',
    marginBottom: 8,
  },
  successText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#4CAF50',
    marginBottom: 8,
  },
  rules: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  rulesTitle: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#666',
    marginBottom: 6,
  },
  ruleText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    marginBottom: 3,
    lineHeight: 18,
  },
  bottomContent: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 20 : 16,
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFDF7',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  skipButton: {
    padding: 8,
  },
  skipText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#666',
  },
  continueButton: {
    backgroundColor: '#FFAD27',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
    minWidth: 110,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#D3D3D3',
  },
  continueText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
});