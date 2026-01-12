/**
 * Restaurant Claim Onboarding Screen (TRO-141)
 * Streamlined restaurant claiming during onboarding - no beta gate
 */

import { useAuth } from '@/contexts/AuthContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { supabase } from '@/lib/supabase';
import { restaurantClaimService } from '@/services/restaurantClaimService';
import { profileService } from '@/services/profileService';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Building,
  CheckCircle2,
  Mail,
  Phone,
  Search,
  User,
} from 'lucide-react-native';
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
  View,
} from 'react-native';

interface Restaurant {
  id: string;
  name: string;
  address: string;
  is_claimed?: boolean;
  owner_id?: string;
}

type ClaimStep = 'search' | 'details';

export default function RestaurantClaimOnboarding() {
  const router = useRouter();
  const { user } = useAuth();
  const { state, updateRestaurantClaim, setCurrentStep: setOnboardingStep } = useOnboarding();

  const [currentStep, setCurrentStep] = useState<ClaimStep>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [searchResults, setSearchResults] = useState<Restaurant[]>([]);
  const [searching, setSearching] = useState(false);
  
  // Form fields
  const [adminFullName, setAdminFullName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');

  // Pre-fill email from user if available
  useEffect(() => {
    if (user?.email && !businessEmail) {
      setBusinessEmail(user.email);
    }
  }, [user?.email]);

  const handleBack = () => {
    if (currentStep === 'details') {
      setCurrentStep('search');
      setSelectedRestaurant(null);
    } else {
      router.back();
    }
  };

  const searchRestaurants = async () => {
    if (searchQuery.length < 2) return;

    setSearching(true);
    try {
      const { data: restaurants, error } = await supabase
        .from('restaurants')
        .select('id, name, address, is_claimed, owner_id')
        .ilike('name', `%${searchQuery}%`)
        .limit(10);

      if (error) {
        console.error('Error searching restaurants:', error);
        Alert.alert('Error', 'Failed to search restaurants');
        return;
      }

      setSearchResults(restaurants || []);
    } catch (error) {
      console.error('Error in restaurant search:', error);
      Alert.alert('Error', 'Failed to search restaurants');
    } finally {
      setSearching(false);
    }
  };

  const handleRestaurantSelect = (restaurant: Restaurant) => {
    if (restaurant.is_claimed && restaurant.owner_id !== user?.id) {
      Alert.alert(
        'Restaurant Already Claimed',
        'This restaurant has already been claimed by another business owner.',
        [{ text: 'OK' }]
      );
      return;
    }

    setSelectedRestaurant(restaurant);
    updateRestaurantClaim({
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      restaurantAddress: restaurant.address,
    });
    setCurrentStep('details');
  };

  const handleAddNew = () => {
    const newRestaurant = {
      id: '',
      name: searchQuery,
      address: '',
    };
    setSelectedRestaurant(newRestaurant);
    updateRestaurantClaim({
      restaurantId: '',
      restaurantName: searchQuery,
      restaurantAddress: '',
    });
    setCurrentStep('details');
  };

  const validateInputs = (): boolean => {
    if (!adminFullName.trim()) {
      Alert.alert('Required Field', 'Please enter your full name.');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!businessEmail.trim()) {
      Alert.alert('Required Field', 'Please enter your email address.');
      return false;
    }
    if (!emailRegex.test(businessEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return false;
    }

    if (!selectedRestaurant?.name) {
      Alert.alert('Error', 'No restaurant selected.');
      return false;
    }

    return true;
  };

  const handleSubmitClaim = async () => {
    if (!validateInputs()) return;

    if (!user) {
      Alert.alert('Error', 'You must be logged in to claim a restaurant');
      return;
    }

    setLoading(true);

    try {
      let restaurantId = selectedRestaurant?.id;
      
      // Create new restaurant if needed
      if (!restaurantId) {
        console.log('[RestaurantClaimOnboarding] Creating new restaurant record');
        const { data: newRestaurant, error: restaurantError } = await supabase
          .from('restaurants')
          .insert({
            name: selectedRestaurant?.name || searchQuery,
            address: selectedRestaurant?.address || '',
            data_source: 'user',
          })
          .select()
          .single();

        if (restaurantError) {
          console.error('[RestaurantClaimOnboarding] Error creating restaurant:', restaurantError);
          throw new Error('Failed to create restaurant record');
        }
        restaurantId = newRestaurant.id;
      }

      // Submit claim
      console.log('[RestaurantClaimOnboarding] Submitting claim');
      const result = await restaurantClaimService.submitRestaurantClaim({
        restaurant_id: restaurantId!,
        business_email: businessEmail,
        business_phone: businessPhone,
        ownership_proof_type: 'other',
        additional_notes: `Admin: ${adminFullName}. Claimed via onboarding flow.`
      });

      console.log('[RestaurantClaimOnboarding] Claim submitted:', result);

      // Update user's user_type for analytics
      try {
        await profileService.updateProfile(user.id, {
          user_type: 'restaurant_admin'
        });
      } catch (profileError) {
        console.warn('[RestaurantClaimOnboarding] Failed to update user_type:', profileError);
        // Don't block the flow for this
      }

      // Update onboarding state
      updateRestaurantClaim({
        restaurantId: restaurantId!,
        restaurantName: selectedRestaurant?.name,
        adminFullName,
        businessEmail,
        businessPhone,
      });

      // Navigate to completion screen
      setOnboardingStep('restaurant-complete');
      router.push('/onboarding/restaurant-complete');

    } catch (error: any) {
      console.error('[RestaurantClaimOnboarding] Error:', error);
      let displayMessage = 'Failed to submit claim. Please try again.';
      
      if (error.message?.includes('already claimed')) {
        displayMessage = 'This restaurant has already been claimed.';
      } else if (error.message?.includes('pending claim')) {
        displayMessage = 'You already have a pending claim for this restaurant.';
      }

      Alert.alert('Submission Failed', displayMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.stepIndicator}>
            Step {currentStep === 'search' ? '1' : '2'} of 2
          </Text>
        </View>

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {currentStep === 'search' && (
            <View style={styles.stepContainer}>
              <Text style={styles.title}>Find Your Restaurant</Text>
              <Text style={styles.subtitle}>
                Search for your restaurant to begin the claiming process
              </Text>

              <View style={styles.searchContainer}>
                <View style={styles.searchInputWrapper}>
                  <Search size={20} color="#999" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search by restaurant name"
                    placeholderTextColor="#999"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    returnKeyType="search"
                    onSubmitEditing={searchRestaurants}
                  />
                </View>
              </View>

              {searchQuery.length >= 2 && (
                <TouchableOpacity
                  style={styles.searchButton}
                  onPress={searchRestaurants}
                  disabled={searching}
                >
                  {searching ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.searchButtonText}>Search</Text>
                  )}
                </TouchableOpacity>
              )}

              {searchResults.length > 0 && (
                <View style={styles.resultsContainer}>
                  {searchResults.map((restaurant) => (
                    <TouchableOpacity
                      key={restaurant.id}
                      style={[
                        styles.resultCard,
                        restaurant.is_claimed && styles.resultCardClaimed,
                      ]}
                      onPress={() => handleRestaurantSelect(restaurant)}
                      disabled={restaurant.is_claimed && restaurant.owner_id !== user?.id}
                    >
                      <View style={styles.resultContent}>
                        <Text style={styles.resultName}>{restaurant.name}</Text>
                        {restaurant.address && (
                          <Text style={styles.resultAddress}>{restaurant.address}</Text>
                        )}
                        {restaurant.is_claimed && (
                          <View style={styles.claimedBadge}>
                            <CheckCircle2 size={14} color="#10B981" />
                            <Text style={styles.claimedText}>
                              {restaurant.owner_id === user?.id ? 'Claimed by you' : 'Already claimed'}
                            </Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}

                  <TouchableOpacity
                    style={styles.addNewCard}
                    onPress={handleAddNew}
                  >
                    <Text style={styles.addNewTitle}>Can't find your restaurant?</Text>
                    <Text style={styles.addNewSubtitle}>Add "{searchQuery}" as a new restaurant</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {currentStep === 'details' && (
            <View style={styles.stepContainer}>
              <Text style={styles.title}>Your Information</Text>
              <Text style={styles.subtitle}>
                Tell us about yourself and how to reach you
              </Text>

              {/* Selected Restaurant */}
              <View style={styles.restaurantInfo}>
                <Building size={24} color="#FFAD27" />
                <View style={styles.restaurantDetails}>
                  <Text style={styles.restaurantName}>{selectedRestaurant?.name}</Text>
                  {selectedRestaurant?.address && (
                    <Text style={styles.restaurantAddress}>{selectedRestaurant.address}</Text>
                  )}
                </View>
              </View>

              <View style={styles.formContainer}>
                {/* Full Name */}
                <View style={styles.inputGroup}>
                  <View style={styles.inputHeader}>
                    <User size={20} color="#666" />
                    <Text style={styles.inputLabel}>Full Name *</Text>
                  </View>
                  <TextInput
                    style={styles.textInput}
                    value={adminFullName}
                    onChangeText={setAdminFullName}
                    placeholder="Your full name"
                    placeholderTextColor="#999"
                    autoCapitalize="words"
                  />
                </View>

                {/* Email */}
                <View style={styles.inputGroup}>
                  <View style={styles.inputHeader}>
                    <Mail size={20} color="#666" />
                    <Text style={styles.inputLabel}>Email Address *</Text>
                  </View>
                  <TextInput
                    style={styles.textInput}
                    value={businessEmail}
                    onChangeText={setBusinessEmail}
                    placeholder="your@email.com"
                    placeholderTextColor="#999"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                {/* Phone */}
                <View style={styles.inputGroup}>
                  <View style={styles.inputHeader}>
                    <Phone size={20} color="#666" />
                    <Text style={styles.inputLabel}>Phone Number (Optional)</Text>
                  </View>
                  <TextInput
                    style={styles.textInput}
                    value={businessPhone}
                    onChangeText={setBusinessPhone}
                    placeholder="(555) 123-4567"
                    placeholderTextColor="#999"
                    keyboardType="phone-pad"
                  />
                </View>

                <Text style={styles.helperText}>
                  We'll use your email to verify ownership and send updates about your claim.
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Bottom CTA for details step */}
        {currentStep === 'details' && (
          <View style={styles.bottomContent}>
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmitClaim}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Claim</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  stepIndicator: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#666',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  stepContainer: {
    paddingTop: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    marginBottom: 32,
    lineHeight: 22,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#333',
  },
  searchButton: {
    height: 48,
    backgroundColor: '#FFAD27',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  searchButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
  resultsContainer: {
    gap: 12,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    padding: 16,
  },
  resultCardClaimed: {
    opacity: 0.7,
    backgroundColor: '#F9FAFB',
  },
  resultContent: {
    gap: 4,
  },
  resultName: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
  },
  resultAddress: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
  },
  claimedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  claimedText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#10B981',
  },
  addNewCard: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFAD27',
    borderRadius: 12,
    padding: 16,
    borderStyle: 'dashed',
  },
  addNewTitle: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFAD27',
    marginBottom: 4,
  },
  addNewSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#666',
  },
  restaurantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  restaurantDetails: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
    marginBottom: 2,
  },
  restaurantAddress: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
  },
  formContainer: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
  },
  textInput: {
    height: 48,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#333',
  },
  helperText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
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
  submitButton: {
    height: 52,
    backgroundColor: '#FFAD27',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
  },
});
