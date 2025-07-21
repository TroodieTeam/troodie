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

        <View style={styles.content}>
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
        </View>

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
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  inputPrefix: {
    position: 'absolute',
    left: 20,
    top: 18,
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
    paddingVertical: 16,
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
    right: 20,
    top: 20,
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#F44336',
    marginBottom: 16,
  },
  successText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#4CAF50',
    marginBottom: 16,
  },
  rules: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 20,
    marginTop: 24,
  },
  rulesTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#666',
    marginBottom: 8,
  },
  ruleText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    marginBottom: 4,
  },
  bottomContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    padding: 12,
  },
  skipText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#666',
  },
  continueButton: {
    backgroundColor: '#FFAD27',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#D3D3D3',
  },
  continueText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
});