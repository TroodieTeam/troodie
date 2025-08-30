import { compactDesign, designTokens } from '@/constants/designTokens';
import { strings } from '@/constants/strings';
import { theme } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { GooglePlaceDetails, GooglePlaceResult, googlePlacesService } from '@/services/googlePlacesService';
import { saveService } from '@/services/saveService';
import { ToastService } from '@/services/toastService';
import { debounce } from 'lodash';
import { AlertCircle, CheckCircle, MapPin, Search, X } from 'lucide-react-native';
import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface AddRestaurantModalProps {
  visible: boolean;
  onClose: () => void;
  onRestaurantAdded?: (restaurant: any) => void;
  initialSearchQuery?: string;
}

export function AddRestaurantModal({ visible, onClose, onRestaurantAdded, initialSearchQuery = '' }: AddRestaurantModalProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [searchResults, setSearchResults] = useState<GooglePlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<GooglePlaceResult | null>(null);
  const [placeDetails, setPlaceDetails] = useState<GooglePlaceDetails | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'success' | 'error' | 'duplicate'>('idle');
  const [submissionMessage, setSubmissionMessage] = useState('');
  const sessionToken = useRef<string>(`${Date.now()}`);

  const searchPlaces = useCallback(
    debounce(async (query: string) => {
      if (!query || query.length < 3) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const results = await googlePlacesService.autocomplete(query, sessionToken.current);
        setSearchResults(results);
      } catch (error) {
      } finally {
        setIsSearching(false);
      }
    }, 300),
    []
  );

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    searchPlaces(text);
  };

  const handleSelectPlace = async (place: GooglePlaceResult) => {
    setSelectedPlace(place);
    setSearchResults([]);
    
    // Fetch place details
    const details = await googlePlacesService.getPlaceDetails(place.place_id, sessionToken.current);
    if (details) {
      setPlaceDetails(details);
    }
  };

  const handleExistingRestaurant = async (details: GooglePlaceDetails) => {
    try {
      // First, try to find the restaurant by place_id
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('*')
        .eq('google_place_id', details.place_id)
        .single();

      if (restaurant) {
        // Save the restaurant to user's profile
        await saveService.toggleSave(restaurant.id, 'restaurant');
        
        // Show success message
        ToastService.showSuccess('Restaurant saved to your profile!');
        
        // Call callback if provided
        if (onRestaurantAdded) {
          onRestaurantAdded(restaurant);
        }

        // Close modal after success
        setTimeout(() => {
          onClose();
          resetModal();
        }, 1500);
      } else {
        // If we can't find it, show the duplicate message
        setSubmissionStatus('duplicate');
        setSubmissionMessage('This restaurant is already in our system! You can find it by searching.');
      }
    } catch (error) {
      console.error('Error handling existing restaurant:', error);
      setSubmissionStatus('error');
      setSubmissionMessage('Failed to save restaurant. Please try searching for it.');
    }
  };

  const handleSubmit = async () => {
    if (!selectedPlace || !placeDetails) return;

    setIsSubmitting(true);
    setSubmissionStatus('idle');

    try {

      // Use Supabase's functions.invoke which handles auth automatically
      const { data, error } = await supabase.functions.invoke('add-restaurant', {
        body: {
          restaurantName: placeDetails.name,
          address: placeDetails.formatted_address,
          placeId: placeDetails.place_id,
          placeDetails: placeDetails,
        },
      });


      if (error) {
        // Try to parse the error response if it's a FunctionsHttpError
        if (error.name === 'FunctionsHttpError' && error.context) {
          try {
            const errorData = await error.context.json();
            
            // Check if this is a duplicate restaurant error
            if (errorData.details?.includes('duplicate key') || 
                errorData.details?.includes('restaurants_google_place_id_key') ||
                errorData.error?.includes('already exists')) {
              // Restaurant already exists - try to fetch it and save to user's profile
              await handleExistingRestaurant(placeDetails);
              setIsSubmitting(false);
              return; // Exit early, don't throw
            }
            
            // Handle unexpected errors
            throw new Error(errorData.error || errorData.message || 'Failed to add restaurant');
          } catch (parseError) {
            // If parsing fails, use the original error message
            throw new Error(error.message || 'Failed to add restaurant');
          }
        } else {
          throw new Error(error.message || 'Failed to add restaurant');
        }
      }

      if (data && data.error) {
        // Check for duplicate restaurant errors
        if (data.error.includes('already exists') || 
            data.error.includes('Similar restaurant') ||
            data.error.includes('duplicate key') ||
            data.error.includes('restaurants_google_place_id_key')) {
          // Restaurant already exists - try to fetch it and save to user's profile
          await handleExistingRestaurant(placeDetails);
        } else {
          setSubmissionStatus('error');
          setSubmissionMessage(data.error);
        }
      } else if (data && data.success) {
        // Restaurant added successfully - also save it to user's profile
        if (data.restaurant) {
          try {
            await saveService.toggleSave(data.restaurant.id, 'restaurant');
            ToastService.showSuccess('Restaurant added and saved to your profile!');
          } catch (saveError) {
            console.error('Error saving restaurant to profile:', saveError);
            // Still show success since restaurant was added
            ToastService.showSuccess('Restaurant added successfully!');
          }
        } else {
          setSubmissionStatus('success');
          setSubmissionMessage(strings.addRestaurant.successMessage);
        }
        
        // Reset session token for next search
        sessionToken.current = `${Date.now()}`;
        
        // Call callback if provided
        if (onRestaurantAdded && data.restaurant) {
          onRestaurantAdded(data.restaurant);
        }

        // Close modal after success
        setTimeout(() => {
          onClose();
          resetModal();
        }, 1500);
      } else {
        // Handle unexpected response format
        setSubmissionStatus('error');
        setSubmissionMessage('Unexpected response from server. Please try again.');
      }
    } catch (error: any) {
      // Check for duplicate key errors in the catch block too
      if (error.message?.includes('duplicate key') || 
          error.message?.includes('restaurants_google_place_id_key') ||
          error.message?.includes('already exists')) {
        // Restaurant already exists - try to fetch it and save to user's profile
        await handleExistingRestaurant(placeDetails);
      } else if (error.message?.includes('Authentication required')) {
        setSubmissionStatus('error');
        setSubmissionMessage('Please log in to add restaurants.');
      } else if (error.message?.includes('configuration error')) {
        setSubmissionStatus('error');
        setSubmissionMessage('App configuration error. Please contact support.');
      } else if (error.message?.includes('network')) {
        setSubmissionStatus('error');
        setSubmissionMessage('Network error. Please check your connection.');
      } else {
        setSubmissionStatus('error');
        setSubmissionMessage('Unable to add restaurant at this time. Please try again later.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetModal = () => {
    setSearchQuery(initialSearchQuery);
    setSearchResults([]);
    setSelectedPlace(null);
    setPlaceDetails(null);
    setSubmissionStatus('idle');
    setSubmissionMessage('');
  };

  // Auto-search when modal opens with initial query
  useEffect(() => {
    if (visible && initialSearchQuery && initialSearchQuery.length >= 3) {
      searchPlaces(initialSearchQuery);
    }
  }, [visible, initialSearchQuery]);

  const renderStatusMessage = () => {
    if (submissionStatus === 'idle') return null;

    const statusConfig = {
      success: {
        icon: <CheckCircle size={compactDesign.icon.medium} color="#4CAF50" />,
        backgroundColor: '#E8F5E9',
        textColor: '#4CAF50',
      },
      error: {
        icon: <AlertCircle size={compactDesign.icon.medium} color="#F44336" />,
        backgroundColor: '#FFEBEE',
        textColor: '#F44336',
      },
      duplicate: {
        icon: <AlertCircle size={compactDesign.icon.medium} color="#FF9800" />,
        backgroundColor: '#FFF3E0',
        textColor: '#FF9800',
      },
    };

    const config = statusConfig[submissionStatus];

    return (
      <View style={[styles.statusMessage, { backgroundColor: config.backgroundColor }]}>
        {config.icon}
        <Text style={[styles.statusText, { color: config.textColor }]}>{submissionMessage}</Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.backdrop}>
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <Text style={styles.title}>{strings.addRestaurant.title}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={compactDesign.icon.medium} color={designTokens.colors.textDark} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
              <Text style={styles.description}>
                {strings.addRestaurant.description}
              </Text>

              <View style={styles.searchContainer}>
                <Search size={compactDesign.icon.medium} color={designTokens.colors.textLight} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={strings.addRestaurant.searchPlaceholder}
                  value={searchQuery}
                  onChangeText={handleSearchChange}
                  placeholderTextColor="#999"
                />
              </View>

              {isSearching && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={styles.loadingText}>{strings.addRestaurant.searchingText}</Text>
                </View>
              )}

              {searchResults.length > 0 && (
                <View style={styles.resultsContainer}>
                  {searchResults.map((result) => (
                    <TouchableOpacity
                      key={result.place_id}
                      style={styles.resultItem}
                      onPress={() => handleSelectPlace(result)}
                    >
                      <MapPin size={compactDesign.icon.small} color={designTokens.colors.textMedium} style={styles.resultIcon} />
                      <View style={styles.resultTextContainer}>
                        <Text style={styles.resultMainText}>
                          {result.structured_formatting.main_text}
                        </Text>
                        <Text style={styles.resultSecondaryText}>
                          {result.structured_formatting.secondary_text}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {selectedPlace && placeDetails && (
                <View style={styles.selectedContainer}>
                  <Text style={styles.selectedTitle}>{strings.addRestaurant.selectedTitle}</Text>
                  <View style={styles.selectedCard}>
                    <Text style={styles.selectedName}>{placeDetails.name}</Text>
                    <Text style={styles.selectedAddress}>{placeDetails.formatted_address}</Text>
                    {placeDetails.rating && (
                      <Text style={styles.selectedDetail}>
                        Rating: {placeDetails.rating} ({placeDetails.user_ratings_total} reviews)
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {renderStatusMessage()}
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity 
                style={[styles.cancelButton]} 
                onPress={onClose}
              >
                <Text style={styles.cancelText}>{strings.addRestaurant.cancelButton}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!selectedPlace || isSubmitting) && styles.submitButtonDisabled
                ]}
                onPress={handleSubmit}
                disabled={!selectedPlace || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.submitText}>{strings.addRestaurant.manualAddButton}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: designTokens.colors.white,
    borderTopLeftRadius: designTokens.borderRadius.xl,
    borderTopRightRadius: designTokens.borderRadius.xl,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: compactDesign.content.padding,
    paddingTop: compactDesign.content.padding,
    paddingBottom: compactDesign.content.paddingCompact,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  title: {
    ...designTokens.typography.sectionTitle,
    color: designTokens.colors.textDark,
  },
  closeButton: {
    padding: 4,
  },
  body: {
    paddingHorizontal: compactDesign.content.padding,
    paddingTop: compactDesign.content.paddingCompact,
    minHeight: 250,
    maxHeight: 350,
  },
  description: {
    ...designTokens.typography.bodyRegular,
    color: designTokens.colors.textMedium,
    marginBottom: compactDesign.content.padding,
    lineHeight: 18,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designTokens.colors.backgroundGray,
    borderRadius: designTokens.borderRadius.sm,
    paddingHorizontal: 16,
    height: 48,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    ...designTokens.typography.inputText,
    color: designTokens.colors.textDark,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 8,
    ...designTokens.typography.bodyRegular,
    color: designTokens.colors.textMedium,
  },
  resultsContainer: {
    marginBottom: 16,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: compactDesign.content.paddingCompact,
    paddingHorizontal: compactDesign.content.paddingCompact,
    backgroundColor: designTokens.colors.backgroundLight,
    borderRadius: designTokens.borderRadius.sm,
    marginBottom: compactDesign.card.gap,
  },
  resultIcon: {
    marginTop: 2,
    marginRight: 12,
  },
  resultTextContainer: {
    flex: 1,
  },
  resultMainText: {
    ...designTokens.typography.cardTitle,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.textDark,
    marginBottom: 2,
  },
  resultSecondaryText: {
    ...designTokens.typography.bodyRegular,
    color: designTokens.colors.textMedium,
  },
  selectedContainer: {
    marginTop: 16,
  },
  selectedTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
    marginBottom: 8,
  },
  selectedCard: {
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
  },
  selectedName: {
    ...designTokens.typography.sectionTitle,
    fontFamily: 'Poppins_600SemiBold',
    color: designTokens.colors.textDark,
    marginBottom: 4,
  },
  selectedAddress: {
    ...designTokens.typography.bodyRegular,
    color: designTokens.colors.textMedium,
    marginBottom: compactDesign.card.gap,
  },
  selectedDetail: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
  },
  statusMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  statusText: {
    marginLeft: 8,
    ...designTokens.typography.bodyRegular,
    fontFamily: 'Inter_500Medium',
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  cancelText: {
    ...designTokens.typography.buttonText,
    color: designTokens.colors.textMedium,
  },
  submitButton: {
    flex: 1,
    height: compactDesign.button.height,
    borderRadius: designTokens.borderRadius.sm,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#DDD',
  },
  submitText: {
    ...designTokens.typography.buttonText,
    color: designTokens.colors.white,
  },
});