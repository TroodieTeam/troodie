import { useAuth } from '@/contexts/AuthContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { profileService } from '@/services/profileService';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
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

export default function BioScreen() {
  const router = useRouter();
  const { state, updateState } = useOnboarding();
  const { user } = useAuth();
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const maxLength = 150;

  const handleContinue = async () => {
    if (bio.trim() && user?.id) {
      setSaving(true);
      try {
        await profileService.setBio(user.id, bio.trim());
        updateState({ bio: bio.trim() });
      } catch (error) {
        console.error('Error setting bio:', error);
        Alert.alert('Error', 'Failed to save bio. You can update it later in your profile.');
      } finally {
        setSaving(false);
      }
    }
    
    // Continue to the persona result screen (or complete if already done)
    router.push('/onboarding/complete');
  };

  const handleSkip = () => {
    router.push('/onboarding/complete');
  };

  const handleBack = () => {
    router.back();
  };

  const suggestions = [
    "🍕 Pizza enthusiast exploring Charlotte's food scene",
    "🌮 Always searching for the perfect taco spot",
    "☕ Coffee lover and brunch aficionado",
    "🍜 Ramen hunter on a never-ending quest",
    "🍔 Burger connoisseur with opinions",
    "🥘 Adventurous eater trying every cuisine"
  ];

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
          <Text style={styles.title}>Tell us about yourself</Text>
          <Text style={styles.subtitle}>
            Share what you love about food
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={bio}
              onChangeText={setBio}
              placeholder="I'm passionate about finding hidden gems..."
              placeholderTextColor="#999"
              multiline
              maxLength={maxLength}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>
              {bio.length}/{maxLength}
            </Text>
          </View>

          <View style={styles.suggestions}>
            <Text style={styles.suggestionsTitle}>Need inspiration?</Text>
            {suggestions.slice(0, 3).map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionChip}
                onPress={() => setBio(suggestion)}
              >
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
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
              saving && styles.continueButtonDisabled
            ]}
            onPress={handleContinue}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.continueText}>
                {bio.trim() ? 'Continue' : 'Skip'}
              </Text>
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
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#333',
    minHeight: 120,
  },
  charCount: {
    position: 'absolute',
    bottom: 12,
    right: 16,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#666',
  },
  suggestions: {
    marginTop: 8,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#666',
    marginBottom: 12,
  },
  suggestionChip: {
    backgroundColor: '#F8F8F8',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 8,
  },
  suggestionText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
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