import { compactDesign, designTokens } from '@/constants/designTokens';
import { strings } from '@/constants/strings';
import { theme } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { GooglePlaceDetails, GooglePlaceResult, googlePlacesService } from '@/services/googlePlacesService';
import { debounce } from 'lodash';
import { AlertCircle, CheckCircle, MapPin, Search, X } from 'lucide-react-native';
import React, { useCallback, useRef, useState } from 'react';
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
}

export function AddRestaurantModal({ visible, onClose, onRestaurantAdded }: AddRestaurantModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
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
        console.error('Error searching places:', error);
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
        console.error('Supabase error:', error);
        // Try to parse the error response if it's a FunctionsHttpError
        if (error.name === 'FunctionsHttpError' && error.context) {
          try {
            const errorData = await error.context.json();
            console.error('Edge function error details:', errorData);
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
        if (data.error.includes('already exists') || data.error.includes('Similar restaurant')) {
          setSubmissionStatus('duplicate');
          setSubmissionMessage(strings.addRestaurant.duplicateMessage);
        } else {
          setSubmissionStatus('error');
          setSubmissionMessage(data.error);
        }
      } else if (data && data.success) {
        setSubmissionStatus('success');
        setSubmissionMessage(strings.addRestaurant.successMessage);
        
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
        }, 2000);
      } else {
        // Handle unexpected response format
        setSubmissionStatus('error');
        setSubmissionMessage('Unexpected response from server. Please try again.');
      }
    } catch (error: any) {
      console.error('Error submitting restaurant:', error);
      setSubmissionStatus('error');
      
      // Provide more specific error messages
      if (error.message?.includes('Authentication required')) {
        setSubmissionMessage('Please log in to add restaurants.');
      } else if (error.message?.includes('configuration error')) {
        setSubmissionMessage('App configuration error. Please contact support.');
      } else if (error.message?.includes('network')) {
        setSubmissionMessage('Network error. Please check your connection.');
      } else {
        setSubmissionMessage(error.message || 'Failed to add restaurant. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetModal = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedPlace(null);
    setPlaceDetails(null);
    setSubmissionStatus('idle');
    setSubmissionMessage('');
  };

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