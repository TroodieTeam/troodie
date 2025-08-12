import { useOnboarding } from '@/contexts/OnboardingContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

export default function QuizIntroScreen() {
  const router = useRouter();
  const { setCurrentStep } = useOnboarding();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleContinue = () => {
    setCurrentStep('quiz');
    router.push('/onboarding/quiz');
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
      </View>

      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.iconContainer}>
          <View style={styles.iconBackground}>
            <Ionicons name="restaurant" size={60} color="#FFAD27" />
          </View>
        </View>

        <Text style={styles.title}>Let's Personalize{'\n'}Your Experience</Text>
        
        <Text style={styles.subtitle}>
          Answer a few quick questions to help us understand your food preferences
        </Text>

        <View style={styles.benefitsContainer}>
          <View style={styles.benefitItem}>
            <View style={styles.benefitIcon}>
              <Ionicons name="star" size={24} color="#FFAD27" />
            </View>
            <View style={styles.benefitText}>
              <Text style={styles.benefitTitle}>Better Recommendations</Text>
              <Text style={styles.benefitDescription}>
                Get restaurant suggestions that match your taste and style
              </Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <View style={styles.benefitIcon}>
              <Ionicons name="people" size={24} color="#FFAD27" />
            </View>
            <View style={styles.benefitText}>
              <Text style={styles.benefitTitle}>Connect with Food Lovers</Text>
              <Text style={styles.benefitDescription}>
                Find people who share your culinary interests
              </Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <View style={styles.benefitIcon}>
              <Ionicons name="compass" size={24} color="#FFAD27" />
            </View>
            <View style={styles.benefitText}>
              <Text style={styles.benefitTitle}>Discover Your Food Persona</Text>
              <Text style={styles.benefitDescription}>
                Learn about your unique dining personality
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.quizInfoContainer}>
          <Ionicons name="time-outline" size={18} color="#666" />
          <Text style={styles.quizInfo}>
            Takes about 2 minutes to complete
          </Text>
        </View>
      </Animated.View>

      <View style={styles.bottomContent}>
        <TouchableOpacity 
          style={styles.continueButton} 
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>Start Quiz</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        
        <Text style={styles.privacyNote}>
          Your answers are private and used only for personalization
        </Text>
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
    paddingTop: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFF9F0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFE5C1',
  },
  title: {
    fontSize: 32,
    fontFamily: 'Poppins_700Bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  benefitsContainer: {
    marginBottom: 24,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF9F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    flex: 1,
    marginLeft: 16,
  },
  benefitTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    lineHeight: 20,
  },
  quizInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'center',
  },
  quizInfo: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#666',
    marginLeft: 6,
  },
  bottomContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  continueButton: {
    backgroundColor: '#FFAD27',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#FFAD27',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  continueButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
    marginRight: 8,
  },
  privacyNote: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});