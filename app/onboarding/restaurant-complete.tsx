/**
 * Restaurant Onboarding Complete Screen
 * Success state after restaurant claim submission
 */

import { useOnboarding } from '@/contexts/OnboardingContext';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Building, CheckCircle, Clock, Mail } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RestaurantCompleteScreen() {
  const router = useRouter();
  const { state, resetOnboarding } = useOnboarding();
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate success state
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

    // Mark onboarding as complete
    saveOnboardingComplete();
  }, []);

  const saveOnboardingComplete = async () => {
    try {
      await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
      await AsyncStorage.setItem('onboardingType', 'restaurant');
    } catch (error) {
      console.error('Error saving onboarding completion:', error);
    }
  };

  const handleExploreApp = () => {
    resetOnboarding();
    router.replace('/(tabs)');
  };

  const handleViewDashboard = () => {
    resetOnboarding();
    router.replace('/(tabs)/business/dashboard');
  };

  const restaurantName = state.restaurantClaim?.restaurantName || 'Your restaurant';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Icon */}
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
          <CheckCircle size={64} color="#FFFFFF" />
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim, width: '100%' }}>
          <Text style={styles.title}>Claim Submitted!</Text>
          <Text style={styles.subtitle}>
            We've received your claim for{'\n'}
            <Text style={styles.restaurantName}>{restaurantName}</Text>
          </Text>

          {/* What's Next Section */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>What happens next?</Text>

            <View style={styles.infoItem}>
              <View style={styles.infoIconContainer}>
                <Clock size={20} color="#FFAD27" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoItemTitle}>Review in progress</Text>
                <Text style={styles.infoItemText}>
                  Our team will verify your information within 24-48 hours
                </Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <View style={styles.infoIconContainer}>
                <Mail size={20} color="#FFAD27" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoItemTitle}>Email notification</Text>
                <Text style={styles.infoItemText}>
                  You'll receive an email once your claim is approved
                </Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <View style={styles.infoIconContainer}>
                <Building size={20} color="#FFAD27" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoItemTitle}>Full access unlocked</Text>
                <Text style={styles.infoItemText}>
                  Access business tools, analytics, and campaign features
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Buttons inside scroll view for proper layout */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleExploreApp}
          >
            <Text style={styles.primaryButtonText}>Explore the App</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleViewDashboard}
          >
            <Text style={styles.secondaryButtonText}>View Business Dashboard</Text>
          </TouchableOpacity>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
    alignItems: 'center',
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  restaurantName: {
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoItemTitle: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
    marginBottom: 2,
  },
  infoItemText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    lineHeight: 18,
  },
  buttonContainer: {
    width: '100%',
    marginTop: 32,
    gap: 12,
  },
  primaryButton: {
    height: 52,
    backgroundColor: '#FFAD27',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
  secondaryButton: {
    height: 52,
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFAD27',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFAD27',
  },
});
