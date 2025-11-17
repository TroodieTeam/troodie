import { BetaAccessGate } from '@/components/BetaAccessGate';
import { restaurantClaimService } from '@/services/restaurantClaimService';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import {
    ArrowLeft,
    Building,
    CheckCircle2,
    Mail,
    Phone,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

type ClaimStep = 'search' | 'contact' | 'pending';

interface Restaurant {
  id: string;
  name: string;
  address: string;
  is_claimed?: boolean;
  owner_id?: string;
}

export default function ClaimRestaurantSimple() {
  const router = useRouter();
  const { user } = useAuth();
  const [showBetaGate, setShowBetaGate] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [currentStep, setCurrentStep] = useState<ClaimStep>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [searchResults, setSearchResults] = useState<Restaurant[]>([]);
  const [searching, setSearching] = useState(false);
  const [contactInfo, setContactInfo] = useState({
    email: '',
    phone: '',
  });

  const handleBetaAccessGranted = () => {
    setHasAccess(true);
    setShowBetaGate(false);
  };

  const handleBetaAccessClose = () => {
    router.back();
  };

  const handleBack = () => {
    if (currentStep === 'search') {
      router.back();
    } else if (currentStep === 'contact') {
      setCurrentStep('search');
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
    setCurrentStep('contact');
  };

  const handleAddNew = () => {
    setSelectedRestaurant({
      id: '',
      name: searchQuery,
      address: '',
    });
    setCurrentStep('contact');
  };

  const validateInputs = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!contactInfo.email.trim()) {
      Alert.alert('Required Field', 'Please enter your email address.');
      return false;
    }
    
    if (!emailRegex.test(contactInfo.email)) {
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
      if (!restaurantId) {
        const { data: newRestaurant, error: restaurantError } = await supabase
          .from('restaurants')
          .insert({
            name: selectedRestaurant?.name || searchQuery,
            address: selectedRestaurant?.address || '',
            data_source: 'user',
          })
          .select()
          .single();

        if (restaurantError) throw new Error('Failed to create restaurant record');
        restaurantId = newRestaurant.id;
      }
      await restaurantClaimService.submitRestaurantClaim({
        restaurant_id: restaurantId!,
        business_email: contactInfo.email,
        business_phone: contactInfo.phone,
        ownership_proof_type: 'other',
        additional_notes: 'Claimed via mobile simplified flow' 
      });
      setCurrentStep('pending');

    } catch (error: any) {
      console.error('Error in claim process:', error);
      let displayMessage = 'Failed to submit claim. Please try again.';
      
      if (error.message.includes('already claimed')) {
        displayMessage = 'This restaurant has already been claimed.';
      } else if (error.message.includes('pending claim')) {
        displayMessage = 'You already have a pending claim for this restaurant.';
      }

      Alert.alert('Submission Failed', displayMessage);
    } finally {
      setLoading(false);
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'search':
        return 'Find Your Restaurant';
      case 'contact':
        return 'Contact Information';
      case 'pending':
        return 'Claim Submitted!';
      default:
        return '';
    }
  };

  const getStepNumber = () => {
    const stepNumbers = {
      search: '1 of 3',
      contact: '2 of 3',
      pending: '3 of 3',
    };
    return stepNumbers[currentStep];
  };

  if (!hasAccess) {
    return (
      <BetaAccessGate
        visible={showBetaGate}
        onClose={handleBetaAccessClose}
        onSuccess={handleBetaAccessGranted}
        title="Claim Your Restaurant"
        description="Take ownership of your restaurant and access powerful business tools"
        message="This feature is currently in beta. Please reach out to team@troodieapp.com to be onboarded."
      />
    );
  }

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
                placeholder="Search by restaurant name"
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
                    disabled={restaurant.is_claimed && restaurant.owner_id !== user?.id}
                  >
                    <View style={styles.resultContent}>
                      <Text style={styles.resultName}>{restaurant.name}</Text>
                      <Text style={styles.resultAddress}>{restaurant.address}</Text>
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

        {currentStep === 'contact' && (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepTitle}>{getStepTitle()}</Text>
              <Text style={styles.stepSubtitle}>
                Provide your contact information so we can verify your claim
              </Text>
            </View>

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
              <View style={styles.inputGroup}>
                <View style={styles.inputHeader}>
                  <Mail size={20} color="#666" />
                  <Text style={styles.inputLabel}>Email Address *</Text>
                </View>
                <TextInput
                  style={styles.textInput}
                  value={contactInfo.email}
                  onChangeText={(text) => setContactInfo({ ...contactInfo, email: text })}
                  placeholder="your@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.inputHeader}>
                  <Phone size={20} color="#666" />
                  <Text style={styles.inputLabel}>Phone Number (Optional)</Text>
                </View>
                <TextInput
                  style={styles.textInput}
                  value={contactInfo.phone}
                  onChangeText={(text) => setContactInfo({ ...contactInfo, phone: text })}
                  placeholder="(555) 123-4567"
                  keyboardType="phone-pad"
                />
              </View>

              <Text style={styles.helperText}>
                We'll use your email to verify ownership and get in touch. Phone is optional.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
              onPress={handleSubmitClaim}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Submit Claim</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {currentStep === 'pending' && (
          <View style={styles.stepContainer}>
            <View style={styles.successContainer}>
              <View style={styles.successIconContainer}>
                <CheckCircle2 size={64} color="#10B981" />
              </View>

              <Text style={styles.successTitle}>Claim Submitted Successfully!</Text>

              <Text style={styles.successMessage}>
                Your restaurant claim has been submitted and is now pending review.
                Our team will verify your information and get back to you within 24-48 hours.
              </Text>

              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>What happens next?</Text>
                <View style={styles.infoItem}>
                  <Text style={styles.infoBullet}>1.</Text>
                  <Text style={styles.infoText}>We'll verify your ownership information</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoBullet}>2.</Text>
                  <Text style={styles.infoText}>You'll receive an email with the decision</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoBullet}>3.</Text>
                  <Text style={styles.infoText}>Once approved, you'll have access to business tools</Text>
                </View>
              </View>

              <Text style={styles.contactText}>
                Questions? Contact us at{' '}
                <Text style={styles.emailText}>team@troodieapp.com</Text>
              </Text>
            </View>

            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.replace('/(tabs)/more')}
              >
                <Text style={styles.primaryButtonText}>Back to More</Text>
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
    fontWeight: '500',
    color: '#000000',
  },
  resultAddress: {
    fontSize: 14,
    color: '#737373',
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
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  restaurantAddress: {
    fontSize: 14,
    color: '#737373',
  },
  formContainer: {
    gap: 20,
    marginBottom: 32,
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
    color: '#000000',
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
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5E5',
  },
  orText: {
    fontSize: 12,
    color: '#737373',
    fontWeight: '500',
  },
  helperText: {
    fontSize: 12,
    color: '#737373',
    textAlign: 'center',
  },
  successContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  successIconContainer: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 16,
  },
  successMessage: {
    fontSize: 16,
    color: '#737373',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  infoCard: {
    backgroundColor: '#F9FAFB',
    padding: 20,
    borderRadius: 12,
    width: '100%',
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoBullet: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
    marginRight: 12,
    width: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#737373',
    flex: 1,
    lineHeight: 20,
  },
  contactText: {
    fontSize: 14,
    color: '#737373',
    textAlign: 'center',
  },
  emailText: {
    color: '#FFAD27',
    fontWeight: '600',
  },
  actionsContainer: {
    gap: 12,
  },
  primaryButton: {
    height: 48,
    backgroundColor: '#10B981',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
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
});
