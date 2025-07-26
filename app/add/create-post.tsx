import { designTokens } from '@/constants/designTokens';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
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

type ContentType = 'original' | 'external';
type AttachmentType = 'photo' | 'link' | 'restaurant' | 'rating' | 'details';

export default function CreatePostScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { updateNetworkProgress } = useApp();
  
  // Core state
  const [loading, setLoading] = useState(false);
  const [caption, setCaption] = useState('');
  const [contentType, setContentType] = useState<ContentType>('original');
  const [showAttachments, setShowAttachments] = useState(false);
  const [activeAttachment, setActiveAttachment] = useState<AttachmentType | null>(null);
  
  // Original content state
  const [photos, setPhotos] = useState<string[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantInfo | null>(null);
  const [rating, setRating] = useState<number>(0);
  
  // External content state
  const [externalUrl, setExternalUrl] = useState('');
  const [externalMetadata, setExternalMetadata] = useState<Partial<ExternalContent> | null>(null);
  
  // Additional details state
  const [visitType, setVisitType] = useState<'dine_in' | 'takeout' | 'delivery'>('dine_in');
  const [priceRange, setPriceRange] = useState<string>('');
  const [privacy, setPrivacy] = useState<'public' | 'friends' | 'private'>('public');
  const [tags, setTags] = useState<string[]>([]);
  
  // Modal state
  const [showRestaurantModal, setShowRestaurantModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RestaurantInfo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Community context
  const communityId = params.communityId as string | undefined;
  const communityName = params.communityName as string | undefined;

  // Auto-focus caption on mount
  useEffect(() => {
    if (params.selectedRestaurant) {
      try {
        const restaurant = JSON.parse(params.selectedRestaurant as string);
        setSelectedRestaurant(restaurant);
      } catch (error) {
        console.error('Error parsing selected restaurant:', error);
      }
    }
  }, [params.selectedRestaurant]);

  const canPublish = selectedRestaurant && (caption.trim() || photos.length > 0 || externalUrl) && !loading;

  const handlePublish = async () => {
    if (!user || !selectedRestaurant) return;

    setLoading(true);
    try {
      let uploadedPhotos: string[] = [];
      if (photos.length > 0) {
        uploadedPhotos = await postMediaService.uploadPostPhotos(photos, user.id);
      }

      const postData: PostCreationData = {
        caption,
        photos: uploadedPhotos,
        restaurantId: selectedRestaurant.id.toString(),
        rating: rating > 0 ? rating : undefined,
        visitDate: new Date(),
        priceRange: priceRange || undefined,
        visitType,
        tags: tags.length > 0 ? tags : undefined,
        privacy,
        contentType,
        ...(communityId && { communityId })
      };

      // Add external content if applicable
      if (contentType === 'external' && externalUrl) {
        postData.externalContent = {
          source: detectExternalSource(externalUrl),
          url: externalUrl,
          title: externalMetadata?.title,
          description: externalMetadata?.description,
          thumbnail: externalMetadata?.thumbnail,
          author: externalMetadata?.author,
        };
      }

      const post = await postService.createPost(postData);

      // Update network progress
      await updateNetworkProgress('post');

      router.replace({
        pathname: '/add/post-success',
        params: { id: post.id }
      });
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
      const selectedPhotos = await postMediaService.pickPhotos(10 - photos.length);
      if (selectedPhotos.length > 0) {
        setPhotos([...photos, ...selectedPhotos]);
      }
    } catch (error) {
      console.error('Error selecting photos:', error);
    }
  };

  const handleUrlPaste = async (url: string) => {
    setExternalUrl(url);
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
    setActiveAttachment(null);
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
        {communityName ? `Post to ${communityName}` : 'Create Post'}
      </Text>
      
      <TouchableOpacity
        onPress={handlePublish}
        disabled={!canPublish}
        style={[styles.publishButton, !canPublish && styles.publishButtonDisabled]}
        accessibilityLabel="Publish post"
      >
        {loading ? (
          <ActivityIndicator size="small" color={designTokens.colors.white} />
        ) : (
          <Text style={[styles.publishText, !canPublish && styles.publishTextDisabled]}>
            Post
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderCompactComposer = () => (
    <View style={styles.composer}>
      {/* User Avatar */}
      <Image 
        source={{ uri: 'https://via.placeholder.com/40' }} 
        style={styles.userAvatar}
      />
      
      <View style={styles.composerContent}>
        {/* Content Type Toggle */}
        {!caption && !photos.length && !externalUrl && (
          <View style={styles.contentTypeToggle}>
            <TouchableOpacity
              style={[styles.typeButton, contentType === 'original' && styles.typeButtonActive]}
              onPress={() => setContentType('original')}
            >
              <Ionicons name="create" size={16} color={contentType === 'original' ? designTokens.colors.primaryOrange : '#666'} />
              <Text style={[styles.typeButtonText, contentType === 'original' && styles.typeButtonTextActive]}>
                Original
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.typeButton, contentType === 'external' && styles.typeButtonActive]}
              onPress={() => setContentType('external')}
            >
              <Ionicons name="link" size={16} color={contentType === 'external' ? designTokens.colors.primaryOrange : '#666'} />
              <Text style={[styles.typeButtonText, contentType === 'external' && styles.typeButtonTextActive]}>
                External
              </Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Caption Input */}
        <TextInput
          style={styles.captionInput}
          placeholder={contentType === 'external' ? "Add your thoughts about this link..." : "What's your experience?"}
          placeholderTextColor={designTokens.colors.textLight}
          value={caption}
          onChangeText={setCaption}
          multiline
          maxLength={500}
          autoFocus
        />
        
        {/* Selected Restaurant */}
        {selectedRestaurant && (
          <TouchableOpacity 
            style={styles.selectedRestaurantChip}
            onPress={() => setActiveAttachment('restaurant')}
          >
            <Ionicons name="location" size={14} color={designTokens.colors.primaryOrange} />
            <Text style={styles.selectedRestaurantText} numberOfLines={1}>
              {selectedRestaurant.name}
            </Text>
            <TouchableOpacity onPress={() => setSelectedRestaurant(null)}>
              <Ionicons name="close-circle" size={16} color="#999" />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        
        {/* External URL Input */}
        {contentType === 'external' && !externalUrl && (
          <View style={styles.urlInputContainer}>
            <Ionicons name="link" size={20} color="#999" />
            <TextInput
              style={styles.urlInput}
              placeholder="Paste URL from TikTok, Instagram, etc."
              placeholderTextColor={designTokens.colors.textLight}
              value={externalUrl}
              onChangeText={handleUrlPaste}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>
        )}
        
        {/* External Content Preview */}
        {externalMetadata && (
          <View style={styles.externalPreview}>
            <Image source={{ uri: externalMetadata.thumbnail }} style={styles.externalThumbnail} />
            <View style={styles.externalInfo}>
              <Text style={styles.externalTitle} numberOfLines={2}>{externalMetadata.title}</Text>
              <Text style={styles.externalSource}>{detectExternalSource(externalUrl)}</Text>
            </View>
            <TouchableOpacity onPress={() => {
              setExternalUrl('');
              setExternalMetadata(null);
            }}>
              <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        )}
        
        {/* Photo Preview */}
        {photos.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoPreviewContainer}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoPreviewItem}>
                <Image source={{ uri: photo }} style={styles.photoPreview} />
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => setPhotos(photos.filter((_, i) => i !== index))}
                >
                  <Ionicons name="close-circle" size={20} color="white" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
        
        {/* Rating Preview */}
        {rating > 0 && (
          <View style={styles.ratingPreview}>
            <View style={[styles.trafficLight, rating === 3 && styles.greenLight]} />
            <View style={[styles.trafficLight, rating === 2 && styles.yellowLight]} />
            <View style={[styles.trafficLight, rating === 1 && styles.redLight]} />
            <Text style={styles.ratingText}>
              {rating === 3 ? 'Recommended' : rating === 2 ? 'It\'s okay' : 'Not recommended'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderAttachmentBar = () => (
    <View style={styles.attachmentBar}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.attachmentButtons}>
        {/* Restaurant Selection (Required) */}
        <TouchableOpacity
          style={[styles.attachButton, !selectedRestaurant && styles.attachButtonRequired]}
          onPress={() => setActiveAttachment('restaurant')}
        >
          <Ionicons 
            name="location" 
            size={20} 
            color={selectedRestaurant ? designTokens.colors.primaryOrange : '#FF4444'} 
          />
          {!selectedRestaurant && <View style={styles.requiredDot} />}
        </TouchableOpacity>
        
        {contentType === 'original' && (
          <>
            {/* Photos */}
            <TouchableOpacity
              style={styles.attachButton}
              onPress={handlePhotoSelection}
              disabled={photos.length >= 10}
            >
              <Ionicons name="images" size={20} color={photos.length > 0 ? designTokens.colors.primaryOrange : '#666'} />
              {photos.length > 0 && (
                <View style={styles.attachBadge}>
                  <Text style={styles.attachBadgeText}>{photos.length}</Text>
                </View>
              )}
            </TouchableOpacity>
            
            {/* Rating */}
            <TouchableOpacity
              style={styles.attachButton}
              onPress={() => setActiveAttachment('rating')}
            >
              <Ionicons name="star" size={20} color={rating > 0 ? designTokens.colors.primaryOrange : '#666'} />
            </TouchableOpacity>
          </>
        )}
        
        {/* More Options */}
        <TouchableOpacity
          style={styles.attachButton}
          onPress={() => setActiveAttachment('details')}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
        </TouchableOpacity>
      </ScrollView>
      
      <Text style={styles.charCount}>{caption.length}/500</Text>
    </View>
  );

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
              style={[styles.ratingOption, rating === 3 && styles.ratingOptionActive]}
              onPress={() => {
                setRating(3);
                setActiveAttachment(null);
              }}
            >
              <View style={[styles.bigTrafficLight, styles.greenLight]} />
              <Text style={styles.ratingLabel}>Recommended</Text>
              <Text style={styles.ratingDescription}>Great experience, would go again</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.ratingOption, rating === 2 && styles.ratingOptionActive]}
              onPress={() => {
                setRating(2);
                setActiveAttachment(null);
              }}
            >
              <View style={[styles.bigTrafficLight, styles.yellowLight]} />
              <Text style={styles.ratingLabel}>It's okay</Text>
              <Text style={styles.ratingDescription}>Average, nothing special</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.ratingOption, rating === 1 && styles.ratingOptionActive]}
              onPress={() => {
                setRating(1);
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
      visible={activeAttachment === 'restaurant'}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity 
            onPress={() => setActiveAttachment(null)}
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
                <Image source={{ uri: restaurant.image }} style={styles.restaurantResultImage} />
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
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
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
        
        {renderAttachmentBar()}
        
        {renderRatingSheet()}
        {renderDetailsSheet()}
        {renderRestaurantModal()}
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
    flexDirection: 'row',
    padding: designTokens.spacing.md,
    gap: designTokens.spacing.sm,
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
  },
});