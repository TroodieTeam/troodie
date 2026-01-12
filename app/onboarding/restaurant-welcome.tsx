/**
 * Restaurant Welcome Screen (TRO-136)
 * Sets expectations for the 5-10 minute onboarding process
 */

import { useOnboarding } from '@/contexts/OnboardingContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Building,
  CheckCircle,
  Clock,
  CreditCard,
  Megaphone,
  Shield,
} from 'lucide-react-native';
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

interface SetupStep {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  time: string;
}

export default function RestaurantWelcomeScreen() {
  const router = useRouter();
  const { setCurrentStep, state } = useOnboarding();
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const setupSteps: SetupStep[] = [
    {
      id: 'claim',
      icon: <Building size={24} color="#FFAD27" />,
      title: 'Claim your restaurant',
      description: 'Search and verify your restaurant',
      time: '~1 min',
    },
    {
      id: 'stripe',
      icon: <Shield size={24} color="#6366F1" />,
      title: 'Connect Stripe',
      description: 'Secure payment processing',
      time: '~2 min',
    },
    {
      id: 'payment',
      icon: <CreditCard size={24} color="#10B981" />,
      title: 'Add payment method',
      description: 'Save a card for campaigns',
      time: '~1 min',
    },
    {
      id: 'ready',
      icon: <Megaphone size={24} color="#F59E0B" />,
      title: 'Start creating campaigns',
      description: 'Partner with food creators',
      time: 'Optional',
    },
  ];

  const handleBack = () => {
    router.back();
  };

  const handleContinue = () => {
    setCurrentStep('restaurant-claim');
    router.push('/onboarding/restaurant-claim');
  };

  const restaurantName = state.restaurantClaim?.restaurantName;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.heroSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Time indicator */}
          <View style={styles.timeCard}>
            <Clock size={20} color="#FFAD27" />
            <Text style={styles.timeText}>Takes about 5-10 minutes</Text>
          </View>

          <Text style={styles.title}>
            Let's set up your{'\n'}restaurant profile
          </Text>
          
          {restaurantName ? (
            <View style={styles.restaurantBadge}>
              <Building size={16} color="#FFAD27" />
              <Text style={styles.restaurantName}>{restaurantName}</Text>
            </View>
          ) : null}

          <Text style={styles.subtitle}>
            Have your credit card ready. You'll only be charged when you approve creator content.
          </Text>
        </Animated.View>

        {/* Setup Steps */}
        <Animated.View
          style={[
            styles.stepsContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.stepsTitle}>What we'll set up together</Text>

          {setupSteps.map((step, index) => (
            <View key={step.id} style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              
              <View style={styles.stepIconContainer}>
                {step.icon}
              </View>
              
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDescription}>{step.description}</Text>
              </View>
              
              <View style={styles.stepTime}>
                <Text style={styles.stepTimeText}>{step.time}</Text>
              </View>
            </View>
          ))}
        </Animated.View>

        {/* Security Note */}
        <Animated.View
          style={[
            styles.securityNote,
            { opacity: fadeAnim },
          ]}
        >
          <Shield size={16} color="#10B981" />
          <Text style={styles.securityText}>
            Payments are processed securely via Stripe. Your card details are never stored on our servers.
          </Text>
        </Animated.View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomContent}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>Let's Get Started</Text>
          <CheckCircle size={20} color="#FFFFFF" />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  timeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    marginBottom: 20,
  },
  timeText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFAD27',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 36,
  },
  restaurantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    marginBottom: 16,
  },
  restaurantName: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  stepsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  stepsTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: '#666',
  },
  stepIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
    marginBottom: 2,
  },
  stepDescription: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#666',
  },
  stepTime: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  stepTimeText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: '#666',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ECFDF5',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginTop: 20,
  },
  securityText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#047857',
    lineHeight: 18,
  },
  bottomContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 16,
    backgroundColor: '#FFFDF7',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  continueButton: {
    height: 52,
    backgroundColor: '#FFAD27',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  continueButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
});
