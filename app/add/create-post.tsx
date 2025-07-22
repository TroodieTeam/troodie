import { designTokens } from '@/constants/designTokens';
import { useAuth } from '@/contexts/AuthContext';
import { postMediaService } from '@/services/postMediaService';
import { postService } from '@/services/postService';
import { restaurantService } from '@/services/restaurantService';
import { RestaurantInfo } from '@/types/core';
import { PostCreationData } from '@/types/post';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function CreatePostScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantInfo | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [visitType, setVisitType] = useState<'dine_in' | 'takeout' | 'delivery'>('dine_in');
  const [priceRange, setPriceRange] = useState<string>('');
  const [privacy, setPrivacy] = useState<'public' | 'friends' | 'private'>('public');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Restaurant selection modal state
  const [showRestaurantModal, setShowRestaurantModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RestaurantInfo[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Handle selected restaurant from restaurant selection flow
  useEffect(() => {
    if (params.selectedRestaurant) {
      try {
        const restaurant = JSON.parse(params.selectedRestaurant as string);
        setSelectedRestaurant(restaurant);
        
        // Also set other parameters if they exist
        if (params.rating) {
          setRating(parseInt(params.rating as string));
        }
        if (params.visitType) {
          setVisitType(params.visitType as 'dine_in' | 'takeout' | 'delivery');
        }
        if (params.priceRange) {
          setPriceRange(params.priceRange as string);
        }
        if (params.tags) {
          setTags(JSON.parse(params.tags as string));
        }
      } catch (error) {
        console.error('Error parsing selected restaurant:', error);
      }
    }
  }, [params.selectedRestaurant, params.rating, params.visitType, params.priceRange, params.tags]);

  const visitTypes = [
    { value: 'dine_in', label: 'Dine In', icon: 'restaurant' },
    { value: 'takeout', label: 'Takeout', icon: 'bag-handle' },
    { value: 'delivery', label: 'Delivery', icon: 'car' },
  ];

  const priceRanges = [
    { value: '$', label: 'Budget' },
    { value: '$$', label: 'Moderate' },
    { value: '$$$', label: 'Expensive' },
    { value: '$$$$', label: 'Very Expensive' },
  ];

  const privacyOptions = [
    { value: 'public', label: 'Public', icon: 'globe' },
    { value: 'friends', label: 'Friends', icon: 'people' },
    { value: 'private', label: 'Private', icon: 'lock-closed' },
  ];

  const handlePhotoSelection = async () => {
    try {
      const selectedPhotos = await postMediaService.pickPhotos(10);
      if (selectedPhotos.length > 0) {
        setPhotos([...photos, ...selectedPhotos]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select photos');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const photo = await postMediaService.takePhoto();
      if (photo) {
        setPhotos([...photos, photo]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleRestaurantSelection = () => {
    setShowRestaurantModal(true);
  };

  const handleSearchRestaurants = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

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
    setShowRestaurantModal(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handlePublish = async () => {
    if (!selectedRestaurant) {
      Alert.alert('Error', 'Please select a restaurant');
      return;
    }

    try {
      setLoading(true);

      // Upload photos if any
      let uploadedPhotos: string[] = [];
      if (photos.length > 0) {
        uploadedPhotos = await postMediaService.uploadPostPhotos(photos, user?.id || '');
      }

      // Create post
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
      };

      const post = await postService.createPost(user?.id || '', postData);

      // Navigate to success screen
      router.push({
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

  const canPublish = selectedRestaurant && !loading;

  const renderRestaurantModal = () => (
    <Modal
      visible={showRestaurantModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowRestaurantModal(false)}>
            <Ionicons name="close" size={24} color={designTokens.colors.textDark} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Select Restaurant</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search restaurants..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchRestaurants}
            placeholderTextColor={designTokens.colors.textMedium}
          />
          <TouchableOpacity style={styles.searchButton} onPress={handleSearchRestaurants}>
            <Ionicons name="search" size={20} color={designTokens.colors.primaryOrange} />
          </TouchableOpacity>
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
                   {restaurant.rating > 0 && (
                     <View style={styles.restaurantResultRating}>
                       <Ionicons name="star" size={12} color={designTokens.colors.primaryOrange} />
                       <Text style={styles.restaurantResultRatingText}>{restaurant.rating}</Text>
                     </View>
                   )}
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={24} color={designTokens.colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Post</Text>
        <TouchableOpacity
          onPress={handlePublish}
          disabled={!canPublish}
          style={[styles.publishButton, !canPublish && styles.publishButtonDisabled]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={designTokens.colors.white} />
          ) : (
            <Text style={styles.publishButtonText}>Publish</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Photo Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos</Text>
          <View style={styles.photoContainer}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoItem}>
                <Image source={{ uri: photo }} style={styles.photo} />
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => removePhoto(index)}
                >
                  <Ionicons name="close-circle" size={20} color={designTokens.colors.white} />
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < 10 && (
              <View style={styles.addPhotoContainer}>
                <TouchableOpacity style={styles.addPhotoButton} onPress={handlePhotoSelection}>
                  <Ionicons name="camera" size={24} color={designTokens.colors.primaryOrange} />
                  <Text style={styles.addPhotoText}>Add Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.takePhotoButton} onPress={handleTakePhoto}>
                  <Ionicons name="camera-outline" size={20} color={designTokens.colors.textMedium} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Caption Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Caption</Text>
          <TextInput
            style={styles.captionInput}
            placeholder="Share your experience..."
            value={caption}
            onChangeText={setCaption}
            multiline
            maxLength={500}
            placeholderTextColor={designTokens.colors.textMedium}
          />
          <Text style={styles.characterCount}>{caption.length}/500</Text>
        </View>

        {/* Restaurant Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Restaurant</Text>
          <TouchableOpacity style={styles.restaurantSelector} onPress={handleRestaurantSelection}>
            {selectedRestaurant ? (
              <View style={styles.selectedRestaurant}>
                <Image source={{ uri: selectedRestaurant.image }} style={styles.restaurantImage} />
                <View style={styles.restaurantInfo}>
                  <Text style={styles.restaurantName}>{selectedRestaurant.name}</Text>
                  <Text style={styles.restaurantLocation}>{selectedRestaurant.location}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.restaurantPlaceholder}>
                <Ionicons name="restaurant" size={24} color={designTokens.colors.textMedium} />
                <Text style={styles.restaurantPlaceholderText}>Select Restaurant</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={20} color={designTokens.colors.textMedium} />
          </TouchableOpacity>
        </View>

        {/* Rating Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rating</Text>
          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                style={styles.starButton}
              >
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={24}
                  color={star <= rating ? designTokens.colors.primaryOrange : designTokens.colors.textMedium}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Visit Type Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Visit Type</Text>
          <View style={styles.visitTypeContainer}>
            {visitTypes.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.visitTypeButton,
                  visitType === type.value && styles.visitTypeButtonActive
                ]}
                onPress={() => setVisitType(type.value as 'dine_in' | 'takeout' | 'delivery')}
              >
                <Ionicons
                  name={type.icon as any}
                  size={20}
                  color={visitType === type.value ? designTokens.colors.white : designTokens.colors.textMedium}
                />
                <Text style={[
                  styles.visitTypeText,
                  visitType === type.value && styles.visitTypeTextActive
                ]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Price Range Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Range</Text>
          <View style={styles.priceRangeContainer}>
            {priceRanges.map((range) => (
              <TouchableOpacity
                key={range.value}
                style={[
                  styles.priceRangeButton,
                  priceRange === range.value && styles.priceRangeButtonActive
                ]}
                onPress={() => setPriceRange(range.value)}
              >
                <Text style={[
                  styles.priceRangeText,
                  priceRange === range.value && styles.priceRangeTextActive
                ]}>
                  {range.value}
                </Text>
                <Text style={[
                  styles.priceRangeLabel,
                  priceRange === range.value && styles.priceRangeLabelActive
                ]}>
                  {range.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tags Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tags</Text>
          <View style={styles.tagInputContainer}>
            <TextInput
              style={styles.tagInput}
              placeholder="Add tags..."
              value={tagInput}
              onChangeText={setTagInput}
              onSubmitEditing={addTag}
              placeholderTextColor={designTokens.colors.textMedium}
            />
            <TouchableOpacity style={styles.addTagButton} onPress={addTag}>
              <Ionicons name="add" size={20} color={designTokens.colors.primaryOrange} />
            </TouchableOpacity>
          </View>
          {tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {tags.map((tag, index) => (
                <View key={index} style={styles.tagItem}>
                  <Text style={styles.tagText}>#{tag}</Text>
                  <TouchableOpacity onPress={() => removeTag(tag)}>
                    <Ionicons name="close" size={16} color={designTokens.colors.textMedium} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <View style={styles.privacyContainer}>
            {privacyOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.privacyButton,
                  privacy === option.value && styles.privacyButtonActive
                ]}
                onPress={() => setPrivacy(option.value as 'public' | 'friends' | 'private')}
              >
                <Ionicons
                  name={option.icon as any}
                  size={20}
                  color={privacy === option.value ? designTokens.colors.white : designTokens.colors.textMedium}
                />
                <Text style={[
                  styles.privacyText,
                  privacy === option.value && styles.privacyTextActive
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {renderRestaurantModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  backButton: {
    padding: designTokens.spacing.xs,
  },
  headerTitle: {
    ...designTokens.typography.screenTitle,
    color: designTokens.colors.textDark,
    fontSize: 18,
  },
  publishButton: {
    backgroundColor: designTokens.colors.primaryOrange,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.xs,
    borderRadius: designTokens.borderRadius.full,
  },
  publishButtonDisabled: {
    backgroundColor: designTokens.colors.backgroundGray,
  },
  publishButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.white,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
    marginBottom: designTokens.spacing.xs,
  },
  photoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: designTokens.spacing.xs,
  },
  photoItem: {
    position: 'relative',
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: designTokens.borderRadius.sm,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    padding: 2,
  },
  addPhotoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoButton: {
    width: 80,
    height: 80, 
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    borderStyle: 'dashed',
    borderRadius: designTokens.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designTokens.colors.backgroundGray,
  },
  addPhotoText: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.primaryOrange,
    marginTop: designTokens.spacing.xs,
  },
  takePhotoButton: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: designTokens.colors.primaryOrange,
    borderRadius: 12,
    padding: designTokens.spacing.xs,
  },
  captionInput: {
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    borderRadius: designTokens.borderRadius.sm,
    padding: designTokens.spacing.sm,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textDark,
  },
  characterCount: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
    textAlign: 'right',
    marginTop: designTokens.spacing.xs,
  },
  restaurantSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: designTokens.spacing.sm,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    borderRadius: designTokens.borderRadius.sm,
    backgroundColor: designTokens.colors.white,
  },
  selectedRestaurant: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  restaurantImage: {
    width: 32,
    height: 32,
    borderRadius: 4,
    marginRight: designTokens.spacing.sm,
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
  },
  restaurantLocation: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
  },
  restaurantPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  restaurantPlaceholderText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
    marginLeft: designTokens.spacing.sm,
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: designTokens.spacing.xs,
  },
  starButton: {
    padding: designTokens.spacing.xs,
  },
  visitTypeContainer: {
    flexDirection: 'row',
    gap: designTokens.spacing.xs,
  },
  visitTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: designTokens.spacing.sm,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    borderRadius: designTokens.borderRadius.sm,
    backgroundColor: designTokens.colors.white,
    gap: designTokens.spacing.xs,
  },
  visitTypeButtonActive: {
    backgroundColor: designTokens.colors.primaryOrange,
    borderColor: designTokens.colors.primaryOrange,
  },
  visitTypeText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.textDark,
  },
  visitTypeTextActive: {
    color: designTokens.colors.white,
  },
  priceRangeContainer: {
    flexDirection: 'row',
    gap: designTokens.spacing.xs,
  },
  priceRangeButton: {
    flex: 1,
    alignItems: 'center',
    padding: designTokens.spacing.sm,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    borderRadius: designTokens.borderRadius.sm,
    backgroundColor: designTokens.colors.white,
  },
  priceRangeButtonActive: {
    backgroundColor: designTokens.colors.primaryOrange,
    borderColor: designTokens.colors.primaryOrange,
  },
  priceRangeText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
  },
  priceRangeTextActive: {
    color: designTokens.colors.white,
  },
  priceRangeLabel: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
  },
  priceRangeLabelActive: {
    color: designTokens.colors.white,
  },
  tagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
  },
  tagInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    borderRadius: designTokens.borderRadius.sm,
    padding: designTokens.spacing.sm,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textDark,
  },
  addTagButton: {
    padding: designTokens.spacing.sm,
    backgroundColor: designTokens.colors.backgroundGray,
    borderRadius: designTokens.borderRadius.sm,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: designTokens.spacing.xs,
    marginTop: designTokens.spacing.sm,
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designTokens.colors.backgroundGray,
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.xs,
    borderRadius: designTokens.borderRadius.full,
    gap: designTokens.spacing.xs,
  },
  tagText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.textDark,
  },
  privacyContainer: {
    flexDirection: 'row',
    gap: designTokens.spacing.xs,
  },
  privacyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: designTokens.spacing.sm,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    borderRadius: designTokens.borderRadius.sm,
    backgroundColor: designTokens.colors.white,
    gap: designTokens.spacing.xs,
  },
  privacyButtonActive: {
    backgroundColor: designTokens.colors.primaryOrange,
    borderColor: designTokens.colors.primaryOrange,
  },
  privacyText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.textDark,
  },
  privacyTextActive: {
    color: designTokens.colors.white,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: designTokens.colors.white,
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
  modalTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    gap: designTokens.spacing.xs,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    borderRadius: designTokens.borderRadius.sm,
    padding: designTokens.spacing.sm,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textDark,
  },
  searchButton: {
    padding: designTokens.spacing.sm,
    backgroundColor: designTokens.colors.backgroundGray,
    borderRadius: designTokens.borderRadius.sm,
  },
  searchResults: {
    flex: 1,
    paddingHorizontal: designTokens.spacing.md,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: designTokens.spacing.lg,
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
    padding: designTokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  restaurantResultImage: {
    width: 40,
    height: 40,
    borderRadius: 4,
    marginRight: designTokens.spacing.sm,
  },
  restaurantResultInfo: {
    flex: 1,
  },
  restaurantResultName: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
  },
  restaurantResultLocation: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
    marginTop: designTokens.spacing.xs,
  },
  restaurantResultDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
    marginTop: designTokens.spacing.xs,
  },
  restaurantResultCuisine: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.textMedium,
    backgroundColor: designTokens.colors.backgroundGray,
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: 2,
    borderRadius: designTokens.borderRadius.full,
  },
  restaurantResultPrice: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textMedium,
  },
  restaurantResultRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
    marginTop: designTokens.spacing.xs,
  },
  restaurantResultRatingText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textMedium,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: designTokens.spacing.lg,
  },
  noResultsText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
  },
}); 