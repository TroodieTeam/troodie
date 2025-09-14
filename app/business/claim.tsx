import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Mail,
  Phone,
  FileText,
  CheckCircle2,
  Building,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type VerificationMethod = 'email' | 'phone' | 'documents';
type ClaimStep = 'search' | 'verification' | 'details' | 'success';

interface Restaurant {
  id: string;
  name: string;
  address: string;
  is_claimed?: boolean;
  claimed_by?: string;
}

export default function ClaimRestaurant() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<ClaimStep>('search');
  const [selectedMethod, setSelectedMethod] = useState<VerificationMethod | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Restaurant[]>([]);
  const [searching, setSearching] = useState(false);
  const [businessDetails, setBusinessDetails] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
  });

  const handleBack = () => {
    if (currentStep === 'search') {
      router.back();
    } else {
      // Go to previous step
      const steps: ClaimStep[] = ['search', 'verification', 'details', 'success'];
      const currentIndex = steps.indexOf(currentStep);
      if (currentIndex > 0) {
        setCurrentStep(steps[currentIndex - 1]);
      }
    }
  };

  const handleVerificationMethodSelect = (method: VerificationMethod) => {
    setSelectedMethod(method);
    setCurrentStep('details');
  };

  const handleClaim = async () => {
    if (!businessDetails.name || !businessDetails.email) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to claim a restaurant');
      return;
    }

    setLoading(true);
    try {
      let restaurantId = selectedRestaurantId;

      // If no existing restaurant selected, create a new one
      if (!restaurantId) {
        // First check if restaurant exists by name and address
        const { data: existingRestaurant } = await supabase
          .from('restaurants')
          .select('id')
          .ilike('name', businessDetails.name)
          .limit(1)
          .single();

        if (existingRestaurant) {
          restaurantId = existingRestaurant.id;
        } else {
          // Create new restaurant record
          const { data: newRestaurant, error: restaurantError } = await supabase
            .from('restaurants')
            .insert({
              name: businessDetails.name,
              address: businessDetails.address,
              phone: businessDetails.phone,
              is_verified: true,
              is_claimed: true,
              claimed_by: user.id,
              claimed_at: new Date().toISOString(),
              // Add some default values
              latitude: 35.2271,
              longitude: -80.8431,
              place_id: `manual-${Date.now()}`,
              status: 'active',
            })
            .select()
            .single();

          if (restaurantError) {
            console.error('Error creating restaurant:', restaurantError);
            throw restaurantError;
          }

          restaurantId = newRestaurant.id;
        }
      }

      // Create business profile with restaurant_id
      const { data: profileData, error: profileError } = await supabase
        .from('business_profiles')
        .insert({
          user_id: user.id,
          restaurant_id: restaurantId,
          verification_status: 'verified',
          claimed_at: new Date().toISOString(),
          management_permissions: ['full_access'],
        })
        .select()
        .single();

      if (profileError) {
        console.error('Error creating business profile:', profileError);
        throw profileError;
      }

      // Update user's account type to business
      const { error: updateError } = await supabase
        .from('users')
        .update({ account_type: 'business' })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating account type:', updateError);
        throw updateError;
      }

      // Update restaurant as claimed if it wasn't already
      if (restaurantId && restaurantId !== 'mock-restaurant-id') {
        const { error: claimError } = await supabase
          .from('restaurants')
          .update({ 
            claimed_by: user.id,
            claimed_at: new Date().toISOString(),
            is_claimed: true 
          })
          .eq('id', restaurantId);

        if (claimError) {
          console.error('Error marking restaurant as claimed:', claimError);
          // Non-critical error, continue
        }
      }

      setCurrentStep('success');
    } catch (error) {
      console.error('Error claiming restaurant:', error);
      Alert.alert('Error', 'Failed to claim restaurant. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'search':
        return 'Find Your Restaurant';
      case 'verification':
        return 'Verify You Own This Business';
      case 'details':
        return 'Confirm Business Details';
      case 'success':
        return 'Welcome to Troodie for Business!';
      default:
        return '';
    }
  };

  const getStepNumber = () => {
    const stepNumbers = {
      search: '1 of 4',
      verification: '2 of 4',
      details: '3 of 4',
      success: '4 of 4',
    };
    return stepNumbers[currentStep];
  };

  const searchRestaurants = async () => {
    if (searchQuery.length < 2) return;

    setSearching(true);
    try {
      const { data: restaurants, error } = await supabase
        .from('restaurants')
        .select('id, name, address, is_claimed, claimed_by')
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
    if (restaurant.is_claimed && restaurant.claimed_by !== user?.id) {
      Alert.alert(
        'Restaurant Already Claimed',
        'This restaurant has already been claimed by another business owner.',
        [{ text: 'OK' }]
      );
      return;
    }

    setBusinessDetails({
      name: restaurant.name,
      address: restaurant.address || '',
      phone: '',
      email: '',
    });
    setSelectedRestaurantId(restaurant.id);
    setCurrentStep('verification');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <ArrowLeft size={20} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.stepIndicator}>{getStepNumber()}</Text>
        </View>
        <Text style={styles.headerTitle}>Business Claim</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {currentStep === 'search' && (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepTitle}>{getStepTitle()}</Text>
              <Text style={styles.stepSubtitle}>
                Search for your restaurant to begin the claiming process
              </Text>
            </View>

            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search by restaurant name or address"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
              />
            </View>

            {searchQuery.length > 2 && (
              <TouchableOpacity
                style={styles.searchButton}
                onPress={searchRestaurants}
                disabled={searching}
              >
                {searching ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.searchButtonText}>Search Restaurants</Text>
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
                    disabled={restaurant.is_claimed && restaurant.claimed_by !== user?.id}
                  >
                    <View style={styles.resultContent}>
                      <Text style={styles.resultName}>{restaurant.name}</Text>
                      <Text style={styles.resultAddress}>{restaurant.address}</Text>
                      {restaurant.is_claimed && (
                        <View style={styles.claimedBadge}>
                          <CheckCircle2 size={14} color="#10B981" />
                          <Text style={styles.claimedText}>
                            {restaurant.claimed_by === user?.id ? 'Claimed by you' : 'Already claimed'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}

                {/* Option to add new restaurant if not found */}
                <TouchableOpacity
                  style={styles.addNewCard}
                  onPress={() => {
                    setSelectedRestaurantId(null);
                    setBusinessDetails({
                      name: searchQuery,
                      address: '',
                      phone: '',
                      email: '',
                    });
                    setCurrentStep('details');
                  }}
                >
                  <Text style={styles.addNewTitle}>Can't find your restaurant?</Text>
                  <Text style={styles.addNewSubtitle}>Add "{searchQuery}" as a new restaurant</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {currentStep === 'verification' && (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepTitle}>{getStepTitle()}</Text>
              <Text style={styles.stepSubtitle}>Choose verification method:</Text>
            </View>

            <View style={styles.methodsContainer}>
              <TouchableOpacity
                style={styles.methodCard}
                onPress={() => handleVerificationMethodSelect('email')}
              >
                <View style={styles.methodHeader}>
                  <Mail size={20} color="#10B981" />
                  <View style={styles.methodInfo}>
                    <Text style={styles.methodTitle}>Business Email</Text>
                    <Text style={styles.methodSubtitle}>We'll send you a verification code</Text>
                  </View>
                </View>
                <Text style={styles.methodTiming}>2-5 minutes</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.methodCard}
                onPress={() => handleVerificationMethodSelect('phone')}
              >
                <View style={styles.methodHeader}>
                  <Phone size={20} color="#3B82F6" />
                  <View style={styles.methodInfo}>
                    <Text style={styles.methodTitle}>Phone Call</Text>
                    <Text style={styles.methodSubtitle}>We'll call your business number</Text>
                  </View>
                </View>
                <Text style={styles.methodTiming}>1-2 minutes</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.methodCard}
                onPress={() => handleVerificationMethodSelect('documents')}
              >
                <View style={styles.methodHeader}>
                  <FileText size={20} color="#F59E0B" />
                  <View style={styles.methodInfo}>
                    <Text style={styles.methodTitle}>Upload Documents</Text>
                    <Text style={styles.methodSubtitle}>Business license or tax documents</Text>
                  </View>
                </View>
                <Text style={styles.methodTiming}>1-2 business days</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {currentStep === 'details' && (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepTitle}>{getStepTitle()}</Text>
              <Text style={styles.stepSubtitle}>
                Please confirm and complete your business information
              </Text>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Business Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={businessDetails.name}
                  onChangeText={(text) =>
                    setBusinessDetails({ ...businessDetails, name: text })
                  }
                  placeholder="Enter your business name"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Address</Text>
                <TextInput
                  style={styles.textInput}
                  value={businessDetails.address}
                  onChangeText={(text) =>
                    setBusinessDetails({ ...businessDetails, address: text })
                  }
                  placeholder="Business address"
                  multiline
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Business Phone</Text>
                <TextInput
                  style={styles.textInput}
                  value={businessDetails.phone}
                  onChangeText={(text) =>
                    setBusinessDetails({ ...businessDetails, phone: text })
                  }
                  placeholder="(555) 123-4567"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Business Email *</Text>
                <TextInput
                  style={styles.textInput}
                  value={businessDetails.email}
                  onChangeText={(text) =>
                    setBusinessDetails({ ...businessDetails, email: text })
                  }
                  placeholder="business@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.primaryButton, loading && styles.primaryButtonDisabled]} 
              onPress={handleClaim}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Claim Restaurant</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {currentStep === 'success' && (
          <View style={styles.stepContainer}>
            <View style={styles.successContainer}>
              <View style={styles.successBadge}>
                <Text style={styles.successEmoji}>🎉</Text>
                <Text style={styles.successBadgeText}>Welcome to Troodie for Business!</Text>
              </View>
              <Text style={styles.successTitle}>Your restaurant is now verified</Text>
              <Text style={styles.successSubtitle}>
                You can now access business tools and create campaigns
              </Text>
            </View>

            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.replace('/(tabs)/business/dashboard')}
              >
                <Building size={20} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Go to Business Dashboard</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => router.replace('/(tabs)/more')}
              >
                <Text style={styles.secondaryButtonText}>Continue Exploring</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIndicator: {
    fontSize: 14,
    color: '#737373',
  },
  headerTitle: {
    fontSize: 14,
    color: '#737373',
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    padding: 20,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#737373',
    textAlign: 'center',
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchInput: {
    height: 44,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#000000',
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
  resultContent: {
    gap: 4,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  resultAddress: {
    fontSize: 14,
    color: '#737373',
  },
  resultDetails: {
    fontSize: 12,
    color: '#737373',
  },
  methodsContainer: {
    gap: 16,
  },
  methodCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    padding: 16,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  methodInfo: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 2,
  },
  methodSubtitle: {
    fontSize: 14,
    color: '#737373',
  },
  methodTiming: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  formContainer: {
    gap: 20,
    marginBottom: 32,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 12,
    color: '#737373',
    fontWeight: '500',
  },
  textInput: {
    height: 44,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#000000',
  },
  successContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBF0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    marginBottom: 16,
  },
  successEmoji: {
    fontSize: 16,
  },
  successBadgeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#737373',
    textAlign: 'center',
  },
  actionsContainer: {
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingHorizontal: 20,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  secondaryButton: {
    height: 48,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  searchButton: {
    height: 44,
    backgroundColor: '#10B981',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  resultCardClaimed: {
    opacity: 0.7,
    backgroundColor: '#F9FAFB',
  },
  claimedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  claimedText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  addNewCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    borderStyle: 'dashed',
  },
  addNewTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#10B981',
    marginBottom: 4,
  },
  addNewSubtitle: {
    fontSize: 12,
    color: '#737373',
  },
});