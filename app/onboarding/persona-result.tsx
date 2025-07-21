import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  Animated,
  ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useAuth } from '@/contexts/AuthContext';
import { personas } from '@/data/personas';
import { profileService } from '@/services/profileService';

export default function PersonaResultScreen() {
  const router = useRouter();
  const { state, setCurrentStep } = useOnboarding();
  const { user } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const persona = state.persona && personas[state.persona];

  useEffect(() => {
    // Animate result appearance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 20,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Save persona to profile immediately
    if (user?.id && state.persona) {
      profileService.setPersona(user.id, state.persona)
        .catch(error => console.error('Error saving persona:', error));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleContinue = () => {
    setCurrentStep('favorites');
    router.push('/onboarding/favorite-spots');
  };

  if (!persona) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.congratsText}>Congratulations!</Text>
          <Text style={styles.subtitleText}>You&apos;re a</Text>
          
          <Animated.View 
            style={[
              styles.personaCard,
              {
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <Text style={styles.personaEmoji}>{persona.emoji}</Text>
            <Text style={styles.personaName}>{persona.name}</Text>
          </Animated.View>

          <Text style={styles.descriptionText}>{persona.description}</Text>

          <View style={styles.traitsContainer}>
            <Text style={styles.traitsTitle}>Your Traits:</Text>
            {persona.traits.map((trait, index) => (
              <Animated.View 
                key={index}
                style={[
                  styles.traitItem,
                  {
                    opacity: fadeAnim,
                    transform: [{
                      translateX: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [30, 0],
                      }),
                    }],
                  },
                ]}
              >
                <Text style={styles.traitBullet}>•</Text>
                <Text style={styles.traitText}>{trait}</Text>
              </Animated.View>
            ))}
          </View>

          <View style={styles.whatThisMeansContainer}>
            <Text style={styles.whatThisMeansTitle}>What this means for you:</Text>
            <Text style={styles.whatThisMeansText}>
              • Personalized restaurant recommendations{'\n'}
              • Connect with like-minded foodies{'\n'}
              • Discover communities that match your style{'\n'}
              • Get content tailored to your preferences
            </Text>
          </View>
        </Animated.View>
      </ScrollView>

      <View style={styles.bottomContent}>
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueButtonText}>Continue Setup</Text>
        </TouchableOpacity>
        <Text style={styles.setupNote}>
          You can always update your persona later in your profile settings
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 160,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  congratsText: {
    fontSize: 32,
    fontFamily: 'Poppins_700Bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 20,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  personaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  personaEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  personaName: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    color: '#333',
  },
  descriptionText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  traitsContainer: {
    marginBottom: 32,
  },
  traitsTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
    marginBottom: 16,
  },
  traitItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  traitBullet: {
    fontSize: 16,
    color: '#5B4CCC',
    marginRight: 12,
  },
  traitText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#333',
    lineHeight: 22,
  },
  whatThisMeansContainer: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 20,
  },
  whatThisMeansTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
    marginBottom: 12,
  },
  whatThisMeansText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    lineHeight: 20,
  },
  bottomContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFDF7',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  continueButton: {
    backgroundColor: '#FFAD27',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  continueButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
  setupNote: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#999',
    textAlign: 'center',
  },
});