/**
 * User Type Selection Screen (TRO-140)
 * First screen after welcome - sorts users into appropriate onboarding paths
 */

import { useOnboarding } from '@/contexts/OnboardingContext';
import { UserType } from '@/types/onboarding';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Camera, Store, Utensils } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

interface UserTypeOption {
  id: UserType;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
}

const userTypeOptions: UserTypeOption[] = [
  {
    id: 'diner',
    title: 'Discover Restaurants',
    subtitle: 'Find your next favorite spot and share dining experiences',
    icon: <Utensils size={32} color="#FFAD27" />,
    color: '#FFAD27',
  },
  {
    id: 'restaurant',
    title: 'Promote My Restaurant',
    subtitle: 'Reach food lovers and run creator campaigns',
    icon: <Store size={32} color="#DC2626" />,
    color: '#DC2626',
  },
  {
    id: 'creator',
    title: 'Create Content',
    subtitle: 'Partner with restaurants and earn from your food content',
    icon: <Camera size={32} color="#6366F1" />,
    color: '#6366F1',
  },
];

export default function UserTypeScreen() {
  const router = useRouter();
  const { setUserType, setCurrentStep } = useOnboarding();
  const [selectedType, setSelectedType] = useState<UserType | null>(null);

  const handleSelect = (type: UserType) => {
    setSelectedType(type);
  };

  const handleContinue = () => {
    if (!selectedType) return;
    
    setUserType(selectedType);
    
    // All user types go to signup first
    setCurrentStep('signup');
    router.push({
      pathname: '/onboarding/signup',
      params: { userType: selectedType }
    });
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

      <View style={styles.content}>
        <Text style={styles.title}>I'm here to...</Text>
        <Text style={styles.subtitle}>
          Choose what best describes you
        </Text>

        <View style={styles.optionsContainer}>
          {userTypeOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionCard,
                selectedType === option.id && styles.optionCardSelected,
                selectedType === option.id && { borderColor: option.color },
              ]}
              onPress={() => handleSelect(option.id)}
              activeOpacity={0.7}
            >
              <View style={styles.optionContent}>
                <View style={[styles.iconContainer, { backgroundColor: `${option.color}15` }]}>
                  {option.icon}
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                </View>
              </View>
              
              <View style={[
                styles.radioOuter,
                selectedType === option.id && { borderColor: option.color }
              ]}>
                {selectedType === option.id && (
                  <View style={[styles.radioInner, { backgroundColor: option.color }]} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.bottomContent}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !selectedType && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!selectedType}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
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
  title: {
    fontSize: 32,
    fontFamily: 'Poppins_700Bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    marginBottom: 32,
  },
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  optionCardSelected: {
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  optionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    lineHeight: 18,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
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
  },
  continueButtonDisabled: {
    backgroundColor: '#D3D3D3',
  },
  continueButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
});
