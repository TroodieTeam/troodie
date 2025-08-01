import { designTokens } from '@/constants/designTokens';
import { DEFAULT_IMAGES } from '@/constants/images';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePostForm } from '@/hooks/usePostForm';
import { postMediaService } from '@/services/postMediaService';
import { postService } from '@/services/postService';
import { restaurantService } from '@/services/restaurantService';
import { RestaurantInfo } from '@/types/core';
import { ExternalContent, PostCreationData } from '@/types/post';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { AddRestaurantModal } from '@/components/AddRestaurantModal';

type ContentType = 'original' | 'external';
type AttachmentType = 'photo' | 'link' | 'restaurant' | 'rating' | 'details';

export default function CreatePostScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { updateNetworkProgress } = useApp();
  
  // Form validation hook
  const {
    formData,
    updateFormField,
    isValid,
    touched,
    touchField,
    getMissingFields,
    getFieldError,
    completionPercentage,
    resetForm,
  } = usePostForm();
  
  // Core state
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [activeAttachment, setActiveAttachment] = useState<AttachmentType | null>(null);
  
  // External content state
  const [externalMetadata, setExternalMetadata] = useState<Partial<ExternalContent> | null>(null);
  
  // Additional details state
  const [visitType, setVisitType] = useState<'dine_in' | 'takeout' | 'delivery'>('dine_in');
  const [priceRange, setPriceRange] = useState<string>('');
  const [privacy, setPrivacy] = useState<'public' | 'friends' | 'private'>('public');
  
  // Modal state
  const [showRestaurantModal, setShowRestaurantModal] = useState(false);
  const [showContentTypeInfo, setShowContentTypeInfo] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RestaurantInfo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAddRestaurantModal, setShowAddRestaurantModal] = useState(false);
  
  // Community context
  const communityId = params.communityId as string | undefined;
  const communityName = params.communityName as string | undefined;

  // Selected restaurant from formData
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantInfo | null>(null);

  // Auto-focus caption on mount and set initial restaurant
  useEffect(() => {
    if (params.selectedRestaurant) {
      try {
        const restaurant = JSON.parse(params.selectedRestaurant as string);
        setSelectedRestaurant(restaurant);
        updateFormField('restaurantId', restaurant.id.toString());
      } catch (error) {
        console.error('Error parsing selected restaurant:', error);
      }
    }
  }, [params.selectedRestaurant]);

  const handlePublish = async () => {
    if (!user || !selectedRestaurant) return;

    // Check validation before proceeding
    if (!isValid) {
      const missing = getMissingFields();
      const fieldNames = missing.map(field => {
        switch(field) {
          case 'restaurantId': return 'Restaurant';
          case 'rating': return 'Rating';
          case 'externalUrl': return 'External URL';
          default: return field;
        }
      });
      Alert.alert(
        'Missing Required Fields', 
        `Please fill in the following required fields: ${fieldNames.join(', ')}`
      );
      return;
    }

    setLoading(true);
    try {
      let uploadedPhotos: string[] = [];
      if (formData.photos.length > 0) {
        uploadedPhotos = await postMediaService.uploadPostPhotos(formData.photos, user.id);
      }

      const postData: PostCreationData = {
        caption: formData.caption,
        photos: uploadedPhotos,
        restaurantId: selectedRestaurant.id.toString(),
        rating: formData.rating && formData.rating > 0 ? formData.rating : undefined,
        visitDate: new Date(),
        priceRange: priceRange || undefined,
        visitType,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        privacy,
        contentType: formData.contentType || 'original',
        ...(communityId && { communityId })
      };

      // Add external content if applicable
      if (formData.contentType === 'external' && formData.externalUrl) {
        postData.externalContent = {
          source: detectExternalSource(formData.externalUrl),
          url: formData.externalUrl,
          title: externalMetadata?.title,
          description: externalMetadata?.description,
          thumbnail: externalMetadata?.thumbnail,
          author: externalMetadata?.author,
        };
      }

      const post = await postService.createPost(postData);

      // Update network progress
      await updateNetworkProgress('post');

      // Show success state
      setShowSuccess(true);
      
      // Navigate to success page after delay
      setTimeout(() => {
        router.replace({
          pathname: '/add/post-success',
          params: { id: post.id }
        });
      }, 1500);

    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const detectExternalSource = (url: string): ExternalContent['source'] => {
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
    return 'article';
  };

  const handlePhotoSelection = async () => {
    try {
      const selectedPhotos = await postMediaService.pickPhotos(10 - formData.photos.length);
      if (selectedPhotos.length > 0) {
        updateFormField('photos', [...formData.photos, ...selectedPhotos]);
      }
    } catch (error) {
      console.error('Error selecting photos:', error);
    }
  };

  const handleUrlPaste = async (url: string) => {
    updateFormField('externalUrl', url);
    touchField('externalUrl');
    // In a real app, you'd fetch metadata here
    // For now, we'll set mock metadata
    setExternalMetadata({
      title: "Amazing Restaurant Experience",
      description: "Check out this incredible dining spot!",
      thumbnail: "https://via.placeholder.com/400x200",
      author: "@foodlover"
    });
  };

  const handleSearchRestaurants = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await restaurantService.searchRestaurants(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching restaurants:', error);
      Alert.alert('Error', 'Failed to search restaurants');
    } finally {
      setIsSearching(false);
    }
  };

  const selectRestaurant = (restaurant: RestaurantInfo) => {
    setSelectedRestaurant(restaurant);
    updateFormField('restaurantId', restaurant.id.toString());
    touchField('restaurantId');
    setShowRestaurantModal(false);
    // Clear search for next time
    setSearchQuery('');
    setSearchResults([]);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        onPress={() => router.back()} 
        style={styles.headerButton}
        accessibilityLabel="Cancel post"
      >
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
      
      <Text style={styles.headerTitle}>
        {communityName ? `Post to ${communityName}` : 'Create post'}
      </Text>
      
      <TouchableOpacity
        onPress={handlePublish}
        disabled={!isValid || loading}
        style={[styles.publishButton, (!isValid || loading) && styles.publishButtonDisabled]}
        accessibilityLabel="Publish post"
      >
        {loading ? (
          <ActivityIndicator size="small" color={designTokens.colors.white} />
        ) : (
          <Text style={[styles.publishText, (!isValid || loading) && styles.publishTextDisabled]}>
            Post
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderCompactComposer = () => (
    <View style={styles.composer}>
      {/* Main content area */}
      <ScrollView style={styles.contentArea} keyboardShouldPersistTaps="handled">
        {/* Text input section */}
        <View style={styles.textSection}>
          <TextInput
            style={styles.textInput}
            placeholder="What was your experience like? Tell us about the food, service, atmosphere..."
            placeholderTextColor={designTokens.colors.textLight}
            value={formData.caption}
            onChangeText={(text) => updateFormField('caption', text)}
            multiline
            maxLength={500}
            autoFocus
          />
          <Text style={styles.charCounter}>{formData.caption.length}/500</Text>
        </View>

        {/* Required selections */}
        <View style={styles.requiredSection}>
          {/* Restaurant selection */}
          <TouchableOpacity 
            style={[styles.selectionRow, !selectedRestaurant && styles.selectionRowRequired]}
            onPress={() => setShowRestaurantModal(true)}
          >
            <Ionicons 
              name="location" 
              size={20} 
              color={selectedRestaurant ? designTokens.colors.primaryOrange : designTokens.colors.error} 
            />
            <View style={styles.selectionContent}>
              <Text style={styles.selectionLabel}>
                {formData.contentType === 'original' ? 'Where did you go?' : 'Which restaurant?'}
              </Text>
              <Text style={styles.selectionValue}>
                {selectedRestaurant ? selectedRestaurant.name : 
                  (formData.contentType === 'original' ? 'Choose a restaurant' : 'Restaurant you want to try')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#999" />
          </TouchableOpacity>

          {/* Rating selection (original posts only) */}
          {formData.contentType === 'original' && (
            <TouchableOpacity 
              style={[styles.selectionRow, !formData.rating && styles.selectionRowRequired]}
              onPress={() => setActiveAttachment('rating')}
            >
              <Ionicons 
                name="star" 
                size={20} 
                color={formData.rating ? designTokens.colors.primaryOrange : designTokens.colors.error} 
              />
              <View style={styles.selectionContent}>
                              <Text style={styles.selectionLabel}>How was it?</Text>
              <Text style={styles.selectionValue}>
                {formData.rating ? 
                  (formData.rating === 3 ? '😊 Loved it!' : formData.rating === 2 ? '😐 It was okay' : '😞 Not great') 
                  : 'Tap to rate your experience'
                }
              </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#999" />
            </TouchableOpacity>
          )}

          {/* External URL (external posts only) */}
          {formData.contentType === 'external' && (
            <TouchableOpacity 
              style={[styles.selectionRow, !formData.externalUrl && styles.selectionRowRequired]}
              onPress={() => setActiveAttachment('link')}
            >
              <Ionicons 
                name="link" 
                size={20} 
                color={formData.externalUrl ? designTokens.colors.primaryOrange : designTokens.colors.error} 
              />
              <View style={styles.selectionContent}>
                              <Text style={styles.selectionLabel}>Share a link</Text>
              <Text style={styles.selectionValue}>
                {formData.externalUrl ? '🔗 Link added' : 'Add a link from TikTok, Instagram, etc.'}
              </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Optional additions */}
        <View style={styles.optionalSection}>
          <Text style={[styles.sectionTitle, styles.sectionTitlePadding]}>✨ Make it shine (optional)</Text>
          
          {/* Photos (original posts only) */}
          {formData.contentType === 'original' && (
            <TouchableOpacity 
              style={styles.selectionRow}
              onPress={handlePhotoSelection}
            >
              <Ionicons 
                name="images" 
                size={20} 
                color={formData.photos.length > 0 ? designTokens.colors.primaryOrange : '#999'} 
              />
              <View style={styles.selectionContent}>
                <Text style={styles.selectionLabel}>Add photos</Text>
                <Text style={styles.selectionValue}>
                  {formData.photos.length > 0 ? `📸 ${formData.photos.length} photo${formData.photos.length > 1 ? 's' : ''} added` : 'Show off those delicious shots!'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#999" />
            </TouchableOpacity>
          )}

          {/* More options */}
          <TouchableOpacity 
            style={styles.selectionRow}
            onPress={() => setActiveAttachment('details')}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color="#999" />
            <View style={styles.selectionContent}>
              <Text style={styles.selectionLabel}>More details</Text>
              <Text style={styles.selectionValue}>Visit type, privacy & other options</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Content type switch */}
        <View style={styles.contentTypeSection}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>📝 What are you sharing?</Text>
            <TouchableOpacity 
              onPress={() => setShowContentTypeInfo(true)}
              style={styles.infoButton}
            >
              <Ionicons name="information-circle-outline" size={18} color="#999" />
            </TouchableOpacity>
          </View>
          <View style={styles.contentTypeSwitch}>
            <TouchableOpacity
              style={[styles.switchOption, formData.contentType === 'original' && styles.switchOptionActive]}
              onPress={() => updateFormField('contentType', 'original')}
            >
              <Text style={[styles.switchText, formData.contentType === 'original' && styles.switchTextActive]}>
                🍽️ My Experience
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.switchOption, formData.contentType === 'external' && styles.switchOptionActive]}
              onPress={() => updateFormField('contentType', 'external')}
            >
              <Text style={[styles.switchText, formData.contentType === 'external' && styles.switchTextActive]}>
                🔗 Share a Link
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Preview sections */}
        {formData.photos.length > 0 && (
          <View style={styles.previewSection}>
            <Text style={[styles.sectionTitle, styles.sectionTitlePadding]}>📸 Your Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosPreview}>
              {formData.photos.map((photo, index) => (
                <View key={index} style={styles.photoPreview}>
                  <Image source={{ uri: photo }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.removePreview}
                    onPress={() => {
                      const newPhotos = formData.photos.filter((_, i) => i !== index);
                      updateFormField('photos', newPhotos);
                    }}
                  >
                    <Ionicons name="close" size={14} color="white" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {formData.externalUrl && externalMetadata && (
          <View style={styles.previewSection}>
            <Text style={[styles.sectionTitle, styles.sectionTitlePadding]}>🔗 Link Preview</Text>
            <View style={styles.linkPreviewCard}>
              <Image source={{ uri: externalMetadata.thumbnail }} style={styles.linkThumb} />
              <View style={styles.linkDetails}>
                <Text style={styles.linkTitle} numberOfLines={2}>{externalMetadata.title}</Text>
                <Text style={styles.linkUrl} numberOfLines={1}>{formData.externalUrl}</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  updateFormField('externalUrl', '');
                  setExternalMetadata(null);
                }}
                style={styles.removeLinkPreview}
              >
                <Ionicons name="close" size={16} color="#999" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );

  const renderSuccessOverlay = () => {
    if (!showSuccess) return null;
    
    return (
      <View style={styles.successOverlay}>
        <View style={styles.successContainer}>
          <Ionicons name="checkmark-circle" size={60} color={designTokens.colors.success} />
          <Text style={styles.successTitle}>Posted Successfully!</Text>
          <Text style={styles.successMessage}>Your experience has been shared with the community</Text>
        </View>
      </View>
    );
  };

  const renderRatingSheet = () => (
    <Modal
      visible={activeAttachment === 'rating'}
      animationType="slide"
      transparent
      onRequestClose={() => setActiveAttachment(null)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={() => setActiveAttachment(null)}
      >
        <View style={styles.bottomSheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>How was your experience?</Text>
          
          <View style={styles.trafficLightRating}>
            <TouchableOpacity
              style={[styles.ratingOption, formData.rating === 3 && styles.ratingOptionActive]}
              onPress={() => {
                updateFormField('rating', 3);
                touchField('rating');
                setActiveAttachment(null);
              }}
            >
              <View style={[styles.bigTrafficLight, styles.greenLight]} />
              <Text style={styles.ratingLabel}>Recommended</Text>
              <Text style={styles.ratingDescription}>Great experience, would go again</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.ratingOption, formData.rating === 2 && styles.ratingOptionActive]}
              onPress={() => {
                updateFormField('rating', 2);
                touchField('rating');
                setActiveAttachment(null);
              }}
            >
              <View style={[styles.bigTrafficLight, styles.yellowLight]} />
              <Text style={styles.ratingLabel}>It's okay</Text>
              <Text style={styles.ratingDescription}>Average, nothing special</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.ratingOption, formData.rating === 1 && styles.ratingOptionActive]}
              onPress={() => {
                updateFormField('rating', 1);
                touchField('rating');
                setActiveAttachment(null);
              }}
            >
              <View style={[styles.bigTrafficLight, styles.redLight]} />
              <Text style={styles.ratingLabel}>Not recommended</Text>
              <Text style={styles.ratingDescription}>Poor experience, wouldn't return</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderLinkSheet = () => (
    <Modal
      visible={activeAttachment === 'link'}
      animationType="slide"
      transparent
      onRequestClose={() => setActiveAttachment(null)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={() => setActiveAttachment(null)}
      >
        <View style={styles.bottomSheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Add External Link</Text>
          
          <View style={styles.linkInputContainer}>
            <TextInput
              style={styles.linkInput}
              placeholder="Paste link from TikTok, Instagram, YouTube, etc."
              placeholderTextColor={designTokens.colors.textLight}
              value={formData.externalUrl || ''}
              onChangeText={handleUrlPaste}
              autoCapitalize="none"
              keyboardType="url"
              autoFocus
            />
          </View>

          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => setActiveAttachment(null)}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderDetailsSheet = () => (
    <Modal
      visible={activeAttachment === 'details'}
      animationType="slide"
      transparent
      onRequestClose={() => setActiveAttachment(null)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={() => setActiveAttachment(null)}
      >
        <View style={styles.bottomSheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Additional Details</Text>
          
          <ScrollView style={styles.detailsContent}>
            {/* Visit Type */}
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Visit Type</Text>
              <View style={styles.segmentedControl}>
                {[
                  { value: 'dine_in', label: 'Dine In', icon: 'restaurant' },
                  { value: 'takeout', label: 'Takeout', icon: 'bag-handle' },
                  { value: 'delivery', label: 'Delivery', icon: 'car' },
                ].map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[styles.segmentButton, visitType === type.value && styles.segmentButtonActive]}
                    onPress={() => setVisitType(type.value as any)}
                  >
                    <Ionicons 
                      name={type.icon as any} 
                      size={16} 
                      color={visitType === type.value ? 'white' : '#666'} 
                    />
                    <Text style={[
                      styles.segmentButtonText,
                      visitType === type.value && styles.segmentButtonTextActive
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Price Range */}
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Price Range</Text>
              <View style={styles.priceRangeContainer}>
                {['$', '$$', '$$$', '$$$$'].map((range) => (
                  <TouchableOpacity
                    key={range}
                    style={[styles.priceButton, priceRange === range && styles.priceButtonActive]}
                    onPress={() => setPriceRange(priceRange === range ? '' : range)}
                  >
                    <Text style={[
                      styles.priceButtonText,
                      priceRange === range && styles.priceButtonTextActive
                    ]}>
                      {range}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Privacy */}
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Privacy</Text>
              <View style={styles.segmentedControl}>
                {[
                  { value: 'public', label: 'Public', icon: 'globe' },
                  { value: 'friends', label: 'Friends', icon: 'people' },
                  { value: 'private', label: 'Private', icon: 'lock-closed' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.segmentButton, privacy === option.value && styles.segmentButtonActive]}
                    onPress={() => setPrivacy(option.value as any)}
                  >
                    <Ionicons 
                      name={option.icon as any} 
                      size={16} 
                      color={privacy === option.value ? 'white' : '#666'} 
                    />
                    <Text style={[
                      styles.segmentButtonText,
                      privacy === option.value && styles.segmentButtonTextActive
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderRestaurantModal = () => (
    <Modal
      visible={showRestaurantModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity 
            onPress={() => setShowRestaurantModal(false)}
            style={styles.modalCloseButton}
          >
            <Ionicons name="close" size={24} color={designTokens.colors.textDark} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Select Restaurant</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.searchWrapper}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={designTokens.colors.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search restaurants..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearchRestaurants}
              placeholderTextColor={designTokens.colors.textLight}
              returnKeyType="search"
            />
          </View>
        </View>

        <ScrollView style={styles.searchResults}>
          {isSearching ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={designTokens.colors.primaryOrange} />
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          ) : searchResults.length > 0 ? (
            searchResults.map((restaurant) => (
              <TouchableOpacity
                key={restaurant.id}
                style={styles.restaurantResult}
                onPress={() => selectRestaurant(restaurant)}
              >
                <Image source={{ uri: restaurant.image || DEFAULT_IMAGES.restaurant }} style={styles.restaurantResultImage} />
                <View style={styles.restaurantResultInfo}>
                  <Text style={styles.restaurantResultName}>{restaurant.name}</Text>
                  <View style={styles.restaurantResultDetails}>
                    <Text style={styles.restaurantResultCuisine}>{restaurant.cuisine}</Text>
                    {restaurant.priceRange && (
                      <Text style={styles.restaurantResultPrice}>{restaurant.priceRange}</Text>
                    )}
                  </View>
                  <Text style={styles.restaurantResultLocation}>{restaurant.location}</Text>
                </View>
              </TouchableOpacity>
            ))
          ) : searchQuery ? (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>No restaurants found</Text>
              <TouchableOpacity
                style={styles.addRestaurantButton}
                onPress={() => {
                  setShowRestaurantModal(false);
                  setShowAddRestaurantModal(true);
                }}
              >
                <Ionicons name="add-circle-outline" size={20} color="#FFF" />
                <Text style={styles.addRestaurantText}>Add Restaurant</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const renderContentTypeInfoModal = () => (
    <Modal
      visible={showContentTypeInfo}
      animationType="fade"
      transparent={true}
    >
      <TouchableOpacity 
        style={styles.infoModalOverlay}
        activeOpacity={1}
        onPress={() => setShowContentTypeInfo(false)}
      >
        <View style={styles.infoModalContent}>
          <TouchableOpacity 
            onPress={() => setShowContentTypeInfo(false)}
            style={styles.infoModalClose}
          >
            <Ionicons name="close" size={20} color="#999" />
          </TouchableOpacity>
          
          <Text style={styles.infoModalTitle}>Content Types</Text>
          
          <View style={styles.infoOption}>
            <Text style={styles.infoOptionTitle}>🍽️ My Experience</Text>
            <Text style={styles.infoOptionText}>
              Share your personal dining experience at a restaurant you visited. Add photos, rate your experience, and tell others about the food, service, and atmosphere.
            </Text>
          </View>
          
          <View style={styles.infoOption}>
            <Text style={styles.infoOptionTitle}>🔗 Share a Link</Text>
            <Text style={styles.infoOptionText}>
              Share content from social media (TikTok, Instagram, etc.) about restaurants you want to try or recommend to others. Perfect for sharing food videos or posts you found interesting.
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.safeArea}>
        {renderHeader()}
        
        <ScrollView 
          style={styles.content} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {communityId && (
            <View style={styles.communityContext}>
              <Ionicons name="people" size={16} color={designTokens.colors.primaryOrange} />
              <Text style={styles.communityContextText}>
                Posting to: {communityName}
              </Text>
            </View>
          )}
          
          {renderCompactComposer()}
        </ScrollView>
        
        {renderRatingSheet()}
        {renderLinkSheet()}
        {renderDetailsSheet()}
        {renderRestaurantModal()}
        {renderContentTypeInfoModal()}
        {renderSuccessOverlay()}
        
        <AddRestaurantModal
          visible={showAddRestaurantModal}
          onClose={() => setShowAddRestaurantModal(false)}
          onRestaurantAdded={(restaurant) => {
            // Transform and select the newly added restaurant
            selectRestaurant({
              id: restaurant.id,
              name: restaurant.name,
              cuisine: restaurant.cuisine_types?.join(' • ') || 'Restaurant',
              location: restaurant.address || 'Charlotte, NC',
              image: restaurant.cover_photo_url || restaurant.photos?.[0] || DEFAULT_IMAGES.restaurant,
              rating: restaurant.google_rating || restaurant.troodie_rating || 4.5,
              priceRange: restaurant.price_range,
            });
            setShowAddRestaurantModal(false);
          }}
        />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.backgroundLight,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    backgroundColor: designTokens.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  headerButton: {
    padding: designTokens.spacing.xs,
  },
  cancelText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.textDark,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
  },
  publishButton: {
    backgroundColor: designTokens.colors.primaryOrange,
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.full,
  },
  publishButtonDisabled: {
    backgroundColor: designTokens.colors.borderLight,
  },
  publishText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.white,
  },
  publishTextDisabled: {
    color: designTokens.colors.textLight,
  },
  content: {
    flex: 1,
  },
  communityContext: {
    marginHorizontal: designTokens.spacing.md,
    marginTop: designTokens.spacing.sm,
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.sm,
    padding: designTokens.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
  },
  communityContextText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.textDark,
  },
  composer: {
    flex: 1,
    backgroundColor: designTokens.colors.backgroundLight,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  composerContent: {
    flex: 1,
  },
  contentTypeToggle: {
    flexDirection: 'row',
    gap: designTokens.spacing.xs,
    marginBottom: designTokens.spacing.sm,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.xs,
    borderRadius: designTokens.borderRadius.full,
    backgroundColor: designTokens.colors.backgroundLight,
  },
  typeButtonActive: {
    backgroundColor: designTokens.colors.primaryOrange + '20',
  },
  typeButtonText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#666',
  },
  typeButtonTextActive: {
    color: designTokens.colors.primaryOrange,
  },
  captionInput: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textDark,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  selectedRestaurantChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
    backgroundColor: designTokens.colors.primaryOrange + '10',
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.xs,
    borderRadius: designTokens.borderRadius.full,
    marginTop: designTokens.spacing.xs,
    alignSelf: 'flex-start',
  },
  selectedRestaurantText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.textDark,
    maxWidth: 200,
  },
  urlInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.sm,
    backgroundColor: designTokens.colors.backgroundLight,
    borderRadius: designTokens.borderRadius.sm,
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.sm,
    marginTop: designTokens.spacing.sm,
  },
  urlInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textDark,
  },
  externalPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.sm,
    backgroundColor: designTokens.colors.backgroundLight,
    borderRadius: designTokens.borderRadius.sm,
    padding: designTokens.spacing.sm,
    marginTop: designTokens.spacing.sm,
  },
  externalThumbnail: {
    width: 60,
    height: 60,
    borderRadius: designTokens.borderRadius.sm,
  },
  externalInfo: {
    flex: 1,
  },
  externalTitle: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.textDark,
  },
  externalSource: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textLight,
    marginTop: 2,
  },
  photoPreviewContainer: {
    marginTop: designTokens.spacing.sm,
    marginHorizontal: -designTokens.spacing.xs,
  },
  photoPreviewItem: {
    marginHorizontal: designTokens.spacing.xs,
  },
  photoPreview: {
    width: 80,
    height: 80,
    borderRadius: designTokens.borderRadius.sm,
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  ratingPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
    marginTop: designTokens.spacing.sm,
  },
  trafficLight: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E0E0E0',
  },
  greenLight: {
    backgroundColor: '#4CAF50',
  },
  yellowLight: {
    backgroundColor: '#FFC107',
  },
  redLight: {
    backgroundColor: '#F44336',
  },
  ratingText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.textDark,
    marginLeft: designTokens.spacing.xs,
  },
  attachmentBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    backgroundColor: designTokens.colors.white,
    borderTopWidth: 1,
    borderTopColor: designTokens.colors.borderLight,
  },
  attachmentButtons: {
    flexDirection: 'row',
    gap: designTokens.spacing.lg,
  },
  attachButton: {
    padding: designTokens.spacing.xs,
    position: 'relative',
  },
  attachButtonRequired: {
    opacity: 1,
  },
  requiredDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF4444',
  },
  attachBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: designTokens.colors.primaryOrange,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  attachBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: 'white',
  },
  charCount: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textLight,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: designTokens.colors.white,
    borderTopLeftRadius: designTokens.borderRadius.lg,
    borderTopRightRadius: designTokens.borderRadius.lg,
    paddingTop: designTokens.spacing.sm,
    paddingBottom: designTokens.spacing.xxl,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: designTokens.colors.borderLight,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: designTokens.spacing.md,
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: designTokens.colors.textDark,
    textAlign: 'center',
    marginBottom: designTokens.spacing.lg,
  },
  trafficLightRating: {
    paddingHorizontal: designTokens.spacing.xl,
    gap: designTokens.spacing.md,
  },
  ratingOption: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: designTokens.spacing.md,
    borderRadius: designTokens.borderRadius.md,
    backgroundColor: designTokens.colors.backgroundLight,
  },
  ratingOptionActive: {
    backgroundColor: designTokens.colors.primaryOrange + '10',
    borderWidth: 2,
    borderColor: designTokens.colors.primaryOrange,
  },
  bigTrafficLight: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: designTokens.spacing.sm,
  },
  ratingLabel: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
  },
  ratingDescription: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
    marginTop: 4,
  },
  detailsContent: {
    paddingHorizontal: designTokens.spacing.xl,
  },
  detailSection: {
    marginBottom: designTokens.spacing.lg,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
    marginBottom: designTokens.spacing.sm,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: designTokens.colors.backgroundLight,
    borderRadius: designTokens.borderRadius.sm,
    padding: 2,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: designTokens.spacing.xs,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.sm,
  },
  segmentButtonActive: {
    backgroundColor: designTokens.colors.primaryOrange,
  },
  segmentButtonText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#666',
  },
  segmentButtonTextActive: {
    color: 'white',
  },
  priceRangeContainer: {
    flexDirection: 'row',
    gap: designTokens.spacing.xs,
  },
  priceButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.sm,
    backgroundColor: designTokens.colors.backgroundLight,
  },
  priceButtonActive: {
    backgroundColor: designTokens.colors.primaryOrange,
  },
  priceButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#666',
  },
  priceButtonTextActive: {
    color: 'white',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: designTokens.colors.backgroundLight,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  modalCloseButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: designTokens.colors.textDark,
  },
  searchWrapper: {
    padding: designTokens.spacing.md,
    backgroundColor: designTokens.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designTokens.colors.backgroundLight,
    borderRadius: designTokens.borderRadius.sm,
    paddingHorizontal: designTokens.spacing.sm,
    gap: designTokens.spacing.xs,
  },
  searchInput: {
    flex: 1,
    paddingVertical: designTokens.spacing.sm,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textDark,
  },
  searchResults: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: designTokens.spacing.xxl,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
    marginTop: designTokens.spacing.sm,
  },
  restaurantResult: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: designTokens.spacing.md,
    backgroundColor: designTokens.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  restaurantResultImage: {
    width: 48,
    height: 48,
    borderRadius: designTokens.borderRadius.sm,
    marginRight: designTokens.spacing.sm,
  },
  restaurantResultInfo: {
    flex: 1,
  },
  restaurantResultName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
  },
  restaurantResultDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
    marginTop: 2,
  },
  restaurantResultCuisine: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
  },
  restaurantResultPrice: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textMedium,
  },
  restaurantResultLocation: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textLight,
    marginTop: 2,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: designTokens.spacing.xxl,
  },
  noResultsText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
    marginBottom: designTokens.spacing.md,
  },
  addRestaurantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: designTokens.colors.primaryOrange,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addRestaurantText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFF',
  },
  
  // Clean composer styles
  contentArea: {
    flex: 1,
  },
  
  // Text input section
  textSection: {
    backgroundColor: designTokens.colors.white,
    borderRadius: 16,
    padding: designTokens.spacing.xl,
    margin: designTokens.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  textInput: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textDark,
    minHeight: 100,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  charCounter: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
    textAlign: 'right',
    marginTop: designTokens.spacing.sm,
  },

  // Section styles
  requiredSection: {
    backgroundColor: designTokens.colors.white,
    marginTop: designTokens.spacing.md,
    marginHorizontal: designTokens.spacing.md,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  optionalSection: {
    backgroundColor: designTokens.colors.white,
    marginTop: designTokens.spacing.lg,
    marginHorizontal: designTokens.spacing.md,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  contentTypeSection: {
    backgroundColor: designTokens.colors.white,
    marginTop: designTokens.spacing.lg,
    marginHorizontal: designTokens.spacing.md,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  previewSection: {
    backgroundColor: designTokens.colors.white,
    marginTop: designTokens.spacing.lg,
    marginHorizontal: designTokens.spacing.md,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: designTokens.spacing.lg,
    paddingTop: designTokens.spacing.md,
    paddingBottom: designTokens.spacing.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
    backgroundColor: 'transparent',
  },
  sectionTitlePadding: {
    paddingHorizontal: designTokens.spacing.lg,
    paddingTop: designTokens.spacing.md,
    paddingBottom: designTokens.spacing.sm,
  },
  infoButton: {
    padding: designTokens.spacing.xs,
  },

  // Selection rows
  selectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: designTokens.colors.white,
  },
  selectionRowRequired: {
    // Visual indicator handled by icon color
  },
  selectionContent: {
    flex: 1,
    marginLeft: designTokens.spacing.md,
  },
  selectionLabel: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.textDark,
    marginBottom: 2,
  },
  selectionValue: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
  },

  // Content type switch
  contentTypeSwitch: {
    flexDirection: 'row',
    margin: designTokens.spacing.lg,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 6,
  },
  switchOption: {
    flex: 1,
    paddingVertical: designTokens.spacing.md,
    borderRadius: 10,
    alignItems: 'center',
  },
  switchOptionActive: {
    backgroundColor: designTokens.colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  switchText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.textMedium,
  },
  switchTextActive: {
    color: designTokens.colors.textDark,
  },

  // Photo preview
  photosPreview: {
    paddingHorizontal: designTokens.spacing.lg,
    paddingBottom: designTokens.spacing.lg,
  },
  photoPreview: {
    position: 'relative',
    marginRight: designTokens.spacing.md,
  },
  previewImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: designTokens.colors.backgroundLight,
  },
  removePreview: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: designTokens.colors.error,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },

  // Link preview
  linkPreviewCard: {
    flexDirection: 'row',
    margin: designTokens.spacing.lg,
    padding: designTokens.spacing.lg,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8EAED',
  },
  linkThumb: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  linkDetails: {
    flex: 1,
    marginLeft: designTokens.spacing.md,
  },
  linkTitle: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.textDark,
    marginBottom: 4,
  },
  linkUrl: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
  },
  removeLinkPreview: {
    padding: designTokens.spacing.sm,
  },

  // Bottom spacing
  bottomSpacing: {
    height: 100,
  },

  // Info modal styles
  infoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: designTokens.spacing.xl,
  },
  infoModalContent: {
    backgroundColor: designTokens.colors.white,
    borderRadius: 20,
    padding: designTokens.spacing.xl,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  infoModalClose: {
    alignSelf: 'flex-end',
    padding: designTokens.spacing.sm,
  },
  infoModalTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: designTokens.colors.textDark,
    textAlign: 'center',
    marginBottom: designTokens.spacing.lg,
    marginTop: -designTokens.spacing.lg,
  },
  infoOption: {
    marginBottom: designTokens.spacing.lg,
  },
  infoOptionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
    marginBottom: designTokens.spacing.sm,
  },
  infoOptionText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
    lineHeight: 20,
  },

  // Link input sheet
  linkInputContainer: {
    marginVertical: designTokens.spacing.lg,
  },
  linkInput: {
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    borderRadius: designTokens.borderRadius.md,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.md,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textDark,
  },
  doneButton: {
    backgroundColor: designTokens.colors.primaryOrange,
    paddingVertical: designTokens.spacing.md,
    borderRadius: designTokens.borderRadius.md,
    alignItems: 'center',
    marginTop: designTokens.spacing.md,
  },
  doneButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.white,
  },

  // Success overlay
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  successContainer: {
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.lg,
    padding: designTokens.spacing.xl,
    alignItems: 'center',
    marginHorizontal: designTokens.spacing.xl,
  },
  successTitle: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
    marginTop: designTokens.spacing.md,
    marginBottom: designTokens.spacing.sm,
  },
  successMessage: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
    textAlign: 'center',
    lineHeight: 20,
  },
});