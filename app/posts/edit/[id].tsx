import { ErrorState } from '@/components/ErrorState';
import { designTokens } from '@/constants/designTokens';
import { useAuth } from '@/contexts/AuthContext';
import { postMediaService } from '@/services/postMediaService';
import { postService } from '@/services/postService';
import { RestaurantInfo } from '@/types/core';
import { getErrorType } from '@/types/errors';
import { PostUpdate, PostWithUser } from '@/types/post';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function EditPostScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [post, setPost] = useState<PostWithUser | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantInfo | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [visitType, setVisitType] = useState<'dine_in' | 'takeout' | 'delivery'>('dine_in');
  const [priceRange, setPriceRange] = useState<string>('');
  const [privacy, setPrivacy] = useState<'public' | 'friends' | 'private'>('public');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState<Error | null>(null);

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

  useEffect(() => {
    if (id) {
      loadPost();
    }
  }, [id]);

  const loadPost = async () => {
    try {
      setLoading(true);
      setError(null);
      const postData = await postService.getPost(id);
      if (postData) {
        setPost(postData);
        setPhotos(postData.photos || []);
        setCaption(postData.caption || '');
        setSelectedRestaurant(postData.restaurant);
        setRating(postData.rating || 0);
        setVisitType(postData.visit_type || 'dine_in');
        setPriceRange(postData.price_range || '');
        setPrivacy(postData.privacy || 'public');
        setTags(postData.tags || []);
      }
    } catch (err: any) {
      console.error('Error loading post:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

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
    router.push('/add/restaurant-details');
  };

  const handleSave = async () => {
    if (!selectedRestaurant) {
      Alert.alert('Error', 'Please select a restaurant');
      return;
    }

    if (photos.length === 0) {
      Alert.alert('Error', 'Please add at least one photo');
      return;
    }

    if (!caption.trim()) {
      Alert.alert('Error', 'Please add a caption');
      return;
    }

    try {
      setSaving(true);
      
      // Upload new photos if any
      const newPhotos = photos.filter(photo => !photo.startsWith('http'));
      const existingPhotos = photos.filter(photo => photo.startsWith('http'));
      
      let uploadedPhotos: string[] = [];
      if (newPhotos.length > 0) {
        uploadedPhotos = await postMediaService.uploadPostPhotos(newPhotos, user?.id || '');
      }
      
      const allPhotos = [...existingPhotos, ...uploadedPhotos];

      const updateData: PostUpdate = {
        caption: caption.trim(),
        photos: allPhotos,
        restaurant_id: selectedRestaurant.id.toString(),
        rating: rating > 0 ? rating : null,
        visit_type: visitType,
        price_range: priceRange,
        privacy,
        tags: tags.length > 0 ? tags : null,
      };

      await postService.updatePost(id, updateData);
      
      Alert.alert('Success', 'Post updated successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error updating post:', error);
      Alert.alert('Error', 'Failed to update post');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              await postService.deletePost(id);
              Alert.alert('Success', 'Post deleted successfully', [
                { text: 'OK', onPress: () => router.push('/(tabs)') }
              ]);
            } catch (error) {
              console.error('Error deleting post:', error);
              Alert.alert('Error', 'Failed to delete post');
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  const handleBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={designTokens.colors.textDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Post</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={designTokens.colors.primaryOrange} />
          <Text style={styles.loadingText}>Loading post...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !post) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={designTokens.colors.textDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Post</Text>
          <View style={styles.headerSpacer} />
        </View>
        <ErrorState
          error={error || new Error('Post not found')}
          errorType={getErrorType(error || new Error('Post not found'))}
          onRetry={loadPost}
          retrying={false}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={designTokens.colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Post</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
          <Ionicons name="trash-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Photos Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos</Text>
          <View style={styles.photoContainer}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoWrapper}>
                <Image source={{ uri: photo }} style={styles.photo} />
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => removePhoto(index)}
                >
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < 10 && (
              <View style={styles.addPhotoButtons}>
                <TouchableOpacity style={styles.addPhotoButton} onPress={handlePhotoSelection}>
                  <Ionicons name="images-outline" size={24} color={designTokens.colors.primaryOrange} />
                  <Text style={styles.addPhotoText}>Add Photos</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.addPhotoButton} onPress={handleTakePhoto}>
                  <Ionicons name="camera-outline" size={24} color={designTokens.colors.primaryOrange} />
                  <Text style={styles.addPhotoText}>Take Photo</Text>
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
            value={caption}
            onChangeText={setCaption}
            placeholder="Share your experience..."
            multiline
            numberOfLines={4}
            maxLength={500}
          />
          <Text style={styles.characterCount}>{caption.length}/500</Text>
        </View>

        {/* Restaurant Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Restaurant</Text>
          <TouchableOpacity style={styles.restaurantButton} onPress={handleRestaurantSelection}>
            {selectedRestaurant ? (
              <View style={styles.selectedRestaurant}>
                <Text style={styles.restaurantName}>{selectedRestaurant.name}</Text>
                <Text style={styles.restaurantLocation}>{selectedRestaurant.location}</Text>
              </View>
            ) : (
              <Text style={styles.selectRestaurantText}>Select a restaurant</Text>
            )}
            <Ionicons name="chevron-forward" size={20} color={designTokens.colors.textLight} />
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
                  name={star <= rating ? "star" : "star-outline"}
                  size={32}
                  color={star <= rating ? designTokens.colors.primaryOrange : designTokens.colors.textLight}
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
                  color={visitType === type.value ? designTokens.colors.white : designTokens.colors.textDark}
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
              value={tagInput}
              onChangeText={setTagInput}
              placeholder="Add a tag..."
              onSubmitEditing={addTag}
            />
            <TouchableOpacity style={styles.addTagButton} onPress={addTag}>
              <Ionicons name="add" size={20} color={designTokens.colors.primaryOrange} />
            </TouchableOpacity>
          </View>
          {tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {tags.map((tag, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.tag}
                  onPress={() => removeTag(tag)}
                >
                  <Text style={styles.tagText}>#{tag}</Text>
                  <Ionicons name="close" size={16} color={designTokens.colors.textLight} />
                </TouchableOpacity>
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
                  color={privacy === option.value ? designTokens.colors.white : designTokens.colors.textDark}
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

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={designTokens.colors.white} />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.white,
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
    fontSize: designTokens.typography.screenTitle.fontSize,
    fontFamily: designTokens.typography.screenTitle.fontFamily,
    color: designTokens.colors.textDark,
  },
  headerSpacer: {
    width: 40,
  },
  deleteButton: {
    padding: designTokens.spacing.xs,
  },
  content: {
    flex: 1,
    paddingHorizontal: designTokens.spacing.md,
  },
  section: {
    marginVertical: designTokens.spacing.md,
  },
  sectionTitle: {
    fontSize: designTokens.typography.sectionTitle.fontSize,
    fontFamily: designTokens.typography.sectionTitle.fontFamily,
    color: designTokens.colors.textDark,
    marginBottom: designTokens.spacing.sm,
  },
  photoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: designTokens.spacing.sm,
  },
  photoWrapper: {
    position: 'relative',
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: designTokens.borderRadius.sm,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: designTokens.colors.white,
    borderRadius: 12,
  },
  addPhotoButtons: {
    flexDirection: 'row',
    gap: designTokens.spacing.sm,
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderWidth: 2,
    borderColor: designTokens.colors.borderLight,
    borderStyle: 'dashed',
    borderRadius: designTokens.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: {
    fontSize: designTokens.typography.smallText.fontSize,
    fontFamily: designTokens.typography.smallText.fontFamily,
    color: designTokens.colors.textLight,
    marginTop: designTokens.spacing.xs,
  },
  captionInput: {
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    borderRadius: designTokens.borderRadius.sm,
    padding: designTokens.spacing.sm,
    fontSize: designTokens.typography.bodyRegular.fontSize,
    fontFamily: designTokens.typography.bodyRegular.fontFamily,
    color: designTokens.colors.textDark,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: designTokens.typography.smallText.fontSize,
    fontFamily: designTokens.typography.smallText.fontFamily,
    color: designTokens.colors.textLight,
    textAlign: 'right',
    marginTop: designTokens.spacing.xs,
  },
  restaurantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: designTokens.spacing.sm,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    borderRadius: designTokens.borderRadius.sm,
  },
  selectedRestaurant: {
    flex: 1,
  },
  restaurantName: {
    fontSize: designTokens.typography.bodyRegular.fontSize,
    fontFamily: designTokens.typography.bodyRegular.fontFamily,
    color: designTokens.colors.textDark,
  },
  restaurantLocation: {
    fontSize: designTokens.typography.smallText.fontSize,
    fontFamily: designTokens.typography.smallText.fontFamily,
    color: designTokens.colors.textLight,
  },
  selectRestaurantText: {
    fontSize: designTokens.typography.bodyRegular.fontSize,
    fontFamily: designTokens.typography.bodyRegular.fontFamily,
    color: designTokens.colors.textLight,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: designTokens.spacing.sm,
  },
  starButton: {
    padding: designTokens.spacing.xs,
  },
  visitTypeContainer: {
    flexDirection: 'row',
    gap: designTokens.spacing.sm,
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
    gap: designTokens.spacing.xs,
  },
  visitTypeButtonActive: {
    backgroundColor: designTokens.colors.primaryOrange,
    borderColor: designTokens.colors.primaryOrange,
  },
  visitTypeText: {
    fontSize: designTokens.typography.bodyRegular.fontSize,
    fontFamily: designTokens.typography.bodyRegular.fontFamily,
    color: designTokens.colors.textDark,
  },
  visitTypeTextActive: {
    color: designTokens.colors.white,
  },
  priceRangeContainer: {
    flexDirection: 'row',
    gap: designTokens.spacing.sm,
  },
  priceRangeButton: {
    flex: 1,
    padding: designTokens.spacing.sm,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    borderRadius: designTokens.borderRadius.sm,
    alignItems: 'center',
  },
  priceRangeButtonActive: {
    backgroundColor: designTokens.colors.primaryOrange,
    borderColor: designTokens.colors.primaryOrange,
  },
  priceRangeText: {
    fontSize: designTokens.typography.bodyRegular.fontSize,
    fontFamily: designTokens.typography.bodyRegular.fontFamily,
    color: designTokens.colors.textDark,
  },
  priceRangeTextActive: {
    color: designTokens.colors.white,
  },
  tagInputContainer: {
    flexDirection: 'row',
    gap: designTokens.spacing.sm,
  },
  tagInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    borderRadius: designTokens.borderRadius.sm,
    padding: designTokens.spacing.sm,
    fontSize: designTokens.typography.bodyRegular.fontSize,
    fontFamily: designTokens.typography.bodyRegular.fontFamily,
    color: designTokens.colors.textDark,
  },
  addTagButton: {
    padding: designTokens.spacing.sm,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    borderRadius: designTokens.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: designTokens.spacing.xs,
    marginTop: designTokens.spacing.sm,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designTokens.colors.backgroundLight,
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.xs,
    borderRadius: designTokens.borderRadius.sm,
    gap: designTokens.spacing.xs,
  },
  tagText: {
    fontSize: designTokens.typography.smallText.fontSize,
    fontFamily: designTokens.typography.smallText.fontFamily,
    color: designTokens.colors.textDark,
  },
  privacyContainer: {
    flexDirection: 'row',
    gap: designTokens.spacing.sm,
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
    gap: designTokens.spacing.xs,
  },
  privacyButtonActive: {
    backgroundColor: designTokens.colors.primaryOrange,
    borderColor: designTokens.colors.primaryOrange,
  },
  privacyText: {
    fontSize: designTokens.typography.bodyRegular.fontSize,
    fontFamily: designTokens.typography.bodyRegular.fontFamily,
    color: designTokens.colors.textDark,
  },
  privacyTextActive: {
    color: designTokens.colors.white,
  },
  footer: {
    padding: designTokens.spacing.md,
    borderTopWidth: 1,
    borderTopColor: designTokens.colors.borderLight,
  },
  saveButton: {
    backgroundColor: designTokens.colors.primaryOrange,
    padding: designTokens.spacing.md,
    borderRadius: designTokens.borderRadius.sm,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: designTokens.typography.bodyMedium.fontSize,
    fontFamily: designTokens.typography.bodyMedium.fontFamily,
    color: designTokens.colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: designTokens.typography.bodyRegular.fontSize,
    fontFamily: designTokens.typography.bodyRegular.fontFamily,
    color: designTokens.colors.textLight,
    marginTop: designTokens.spacing.sm,
  },
}); 