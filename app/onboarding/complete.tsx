import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  Animated
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useAuth } from '@/contexts/AuthContext';
import { personas } from '@/data/personas';
import { profileService } from '@/services/profileService';

export default function CompleteScreen() {
  const router = useRouter();
  const { state } = useOnboarding();
  const { user } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;

  const persona = state.persona && personas[state.persona];

  useEffect(() => {
    // Animate completion
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(checkAnim, {
        toValue: 1,
        friction: 4,
        tension: 20,
        useNativeDriver: true,
      }),
    ]).start();

    // Save onboarding completion
    saveOnboardingComplete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveOnboardingComplete = async () => {
    try {
      await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
      
      // Save persona to user profile
      if (user?.id && state.persona) {
        await profileService.setPersona(user.id, state.persona);
      }
      
      // TODO: Save favorite spots to user's saved restaurants
      // This would require a restaurant save service
    } catch (error) {
      console.error('Error saving onboarding data:', error);
    }
  };

  const handleGetStarted = () => {
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.content}>
        <Animated.View 
          style={[
            styles.successIcon,
            {
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                {
                  rotate: checkAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.checkmark}>✓</Text>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.title}>All Set!</Text>
          <Text style={styles.subtitle}>
            Welcome to Troodie, {persona?.name}!
          </Text>

          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Your Profile Summary:</Text>
            
            <View style={styles.summaryItem}>
              <Text style={styles.summaryEmoji}>{persona?.emoji}</Text>
              <View style={styles.summaryTextContainer}>
                <Text style={styles.summaryLabel}>Persona</Text>
                <Text style={styles.summaryValue}>{persona?.name}</Text>
              </View>
            </View>

            {state.username && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryEmoji}>@</Text>
                <View style={styles.summaryTextContainer}>
                  <Text style={styles.summaryLabel}>Username</Text>
                  <Text style={styles.summaryValue}>@{state.username}</Text>
                </View>
              </View>
            )}

            {state.profileImageUrl && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryEmoji}>📸</Text>
                <View style={styles.summaryTextContainer}>
                  <Text style={styles.summaryLabel}>Profile Picture</Text>
                  <Text style={styles.summaryValue}>Added</Text>
                </View>
              </View>
            )}

            {state.bio && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryEmoji}>✍️</Text>
                <View style={styles.summaryTextContainer}>
                  <Text style={styles.summaryLabel}>Bio</Text>
                  <Text style={styles.summaryValue}>Added</Text>
                </View>
              </View>
            )}
          </View>

          <Text style={styles.nextStepsTitle}>What&apos;s Next:</Text>
          <Text style={styles.nextStepsText}>
            • Explore personalized restaurant recommendations{'\n'}
            • Join communities of {persona?.name}s{'\n'}
            • Share your dining experiences{'\n'}
            • Discover new favorite spots
          </Text>
        </Animated.View>
      </View>

      <View style={styles.bottomContent}>
        <TouchableOpacity style={styles.getStartedButton} onPress={handleGetStarted}>
          <Text style={styles.getStartedButtonText}>Start Exploring</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF7',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2ECC71',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 32,
  },
  checkmark: {
    fontSize: 50,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 36,
    fontFamily: 'Poppins_700Bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  summaryContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
    marginBottom: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryEmoji: {
    fontSize: 24,
    marginRight: 16,
  },
  summaryTextContainer: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#999',
  },
  summaryValue: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#333',
  },
  nextStepsTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
    marginBottom: 8,
  },
  nextStepsText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    lineHeight: 20,
  },
  bottomContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  getStartedButton: {
    backgroundColor: '#FFAD27',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  getStartedButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
});