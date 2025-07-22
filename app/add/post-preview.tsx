import { designTokens } from '@/constants/designTokens';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function PostPreviewScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [publishing, setPublishing] = useState(false);

  // Get post data from navigation params
  const params = useLocalSearchParams<{
    photos: string;
    caption: string;
    restaurantId: string;
    restaurantName: string;
    restaurantLocation: string;
    rating: string;
    visitType: string;
    priceRange: string;
    privacy: string;
    tags: string;
  }>();

  const postData = {
    photos: params.photos ? JSON.parse(params.photos) : [],
    caption: params.caption || '',
    restaurant: {
      id: params.restaurantId || '',
      name: params.restaurantName || '',
      location: params.restaurantLocation || '',
    },
    rating: params.rating ? parseInt(params.rating) : 0,
    visitType: (params.visitType as 'dine_in' | 'takeout' | 'delivery') || 'dine_in',
    priceRange: params.priceRange || '',
    privacy: (params.privacy as 'public' | 'friends' | 'private') || 'public',
    tags: params.tags ? JSON.parse(params.tags) : [],
  };

  const handleBack = () => {
    router.back();
  };

  const handlePublish = async () => {
    setPublishing(true);
    // Navigate to create-post with the data to actually publish
    router.push({
      pathname: '/add/create-post',
      params: {
        preview: 'true',
        ...params
      }
    });
  };

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Ionicons
        key={i}
        name={i < rating ? "star" : "star-outline"}
        size={16}
        color={i < rating ? designTokens.colors.primaryOrange : designTokens.colors.textLight}
      />
    ));
  };

  const getPrivacyIcon = (privacy: string) => {
    switch (privacy) {
      case 'public':
        return 'globe';
      case 'friends':
        return 'people';
      case 'private':
        return 'lock-closed';
      default:
        return 'globe';
    }
  };

  const getVisitTypeIcon = (visitType: string) => {
    switch (visitType) {
      case 'dine_in':
        return 'restaurant';
      case 'takeout':
        return 'bag-handle';
      case 'delivery':
        return 'car';
      default:
        return 'restaurant';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={designTokens.colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Preview Post</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Post Preview */}
        <View style={styles.postPreview}>
          {/* User Info */}
          <View style={styles.userInfo}>
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={24} color={designTokens.colors.textLight} />
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{user?.name || 'You'}</Text>
              <Text style={styles.postTime}>Just now</Text>
            </View>
            <View style={styles.privacyBadge}>
              <Ionicons 
                name={getPrivacyIcon(postData.privacy) as any} 
                size={16} 
                color={designTokens.colors.textLight} 
              />
            </View>
          </View>

          {/* Caption */}
          {postData.caption && (
            <Text style={styles.caption}>{postData.caption}</Text>
          )}

          {/* Photos */}
          {postData.photos.length > 0 && (
            <View style={styles.photoContainer}>
              {postData.photos.length === 1 ? (
                <Image source={{ uri: postData.photos[0] }} style={styles.singlePhoto} />
              ) : (
                <View style={styles.photoGrid}>
                  {postData.photos.slice(0, 4).map((photo, index) => (
                    <Image key={index} source={{ uri: photo }} style={styles.gridPhoto} />
                  ))}
                  {postData.photos.length > 4 && (
                    <View style={styles.morePhotosOverlay}>
                      <Text style={styles.morePhotosText}>+{postData.photos.length - 4}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Restaurant Info */}
          {postData.restaurant.name && (
            <View style={styles.restaurantInfo}>
              <View style={styles.restaurantHeader}>
                <Text style={styles.restaurantName}>{postData.restaurant.name}</Text>
                {postData.rating > 0 && (
                  <View style={styles.ratingContainer}>
                    {getRatingStars(postData.rating)}
                  </View>
                )}
              </View>
              <Text style={styles.restaurantLocation}>{postData.restaurant.location}</Text>
              
              {/* Visit Details */}
              <View style={styles.visitDetails}>
                <View style={styles.visitDetail}>
                  <Ionicons 
                    name={getVisitTypeIcon(postData.visitType) as any} 
                    size={16} 
                    color={designTokens.colors.textLight} 
                  />
                  <Text style={styles.visitDetailText}>
                    {postData.visitType === 'dine_in' ? 'Dine In' : 
                     postData.visitType === 'takeout' ? 'Takeout' : 'Delivery'}
                  </Text>
                </View>
                {postData.priceRange && (
                  <View style={styles.visitDetail}>
                    <Ionicons name="card" size={16} color={designTokens.colors.textLight} />
                    <Text style={styles.visitDetailText}>{postData.priceRange}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Tags */}
          {postData.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {postData.tags.map((tag, index) => (
                <Text key={index} style={styles.tag}>#{tag}</Text>
              ))}
            </View>
          )}

          {/* Engagement Actions */}
          <View style={styles.engagementActions}>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="heart-outline" size={20} color={designTokens.colors.textLight} />
              <Text style={styles.actionCount}>0</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="chatbubble-outline" size={20} color={designTokens.colors.textLight} />
              <Text style={styles.actionCount}>0</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="bookmark-outline" size={20} color={designTokens.colors.textLight} />
              <Text style={styles.actionCount}>0</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="share-outline" size={20} color={designTokens.colors.textLight} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Post Details Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Post Details</Text>
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Privacy</Text>
            <View style={styles.summaryValue}>
              <Ionicons 
                name={getPrivacyIcon(postData.privacy) as any} 
                size={16} 
                color={designTokens.colors.textLight} 
              />
              <Text style={styles.summaryText}>
                {postData.privacy === 'public' ? 'Public' : 
                 postData.privacy === 'friends' ? 'Friends Only' : 'Private'}
              </Text>
            </View>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Photos</Text>
            <Text style={styles.summaryText}>{postData.photos.length} photo{postData.photos.length !== 1 ? 's' : ''}</Text>
          </View>

          {postData.rating > 0 && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Rating</Text>
              <View style={styles.summaryValue}>
                {getRatingStars(postData.rating)}
              </View>
            </View>
          )}

          {postData.tags.length > 0 && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Tags</Text>
              <Text style={styles.summaryText}>{postData.tags.join(', ')}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Publish Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.publishButton, publishing && styles.publishButtonDisabled]}
          onPress={handlePublish}
          disabled={publishing}
        >
          <Text style={styles.publishButtonText}>
            {publishing ? 'Publishing...' : 'Publish Post'}
          </Text>
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
    fontSize: designTokens.typography.sectionTitle.fontSize,
    fontFamily: designTokens.typography.sectionTitle.fontFamily,
    color: designTokens.colors.textDark,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: designTokens.spacing.md,
  },
  postPreview: {
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.sm,
    marginVertical: designTokens.spacing.md,
    padding: designTokens.spacing.md,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: designTokens.spacing.sm,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: designTokens.colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: designTokens.spacing.sm,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: designTokens.typography.bodyMedium.fontSize,
    fontFamily: designTokens.typography.bodyMedium.fontFamily,
    color: designTokens.colors.textDark,
  },
  postTime: {
    fontSize: designTokens.typography.smallText.fontSize,
    fontFamily: designTokens.typography.smallText.fontFamily,
    color: designTokens.colors.textLight,
  },
  privacyBadge: {
    padding: designTokens.spacing.xs,
  },
  caption: {
    fontSize: designTokens.typography.bodyRegular.fontSize,
    fontFamily: designTokens.typography.bodyRegular.fontFamily,
    color: designTokens.colors.textDark,
    marginBottom: designTokens.spacing.sm,
    lineHeight: 22,
  },
  photoContainer: {
    marginBottom: designTokens.spacing.sm,
  },
  singlePhoto: {
    width: '100%',
    height: 300,
    borderRadius: designTokens.borderRadius.sm,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  gridPhoto: {
    width: '49%',
    height: 150,
    borderRadius: designTokens.borderRadius.sm,
  },
  morePhotosOverlay: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: '49%',
    height: 150,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: designTokens.borderRadius.sm,
  },
  morePhotosText: {
    fontSize: designTokens.typography.bodyMedium.fontSize,
    fontFamily: designTokens.typography.bodyMedium.fontFamily,
    color: designTokens.colors.white,
  },
  restaurantInfo: {
    marginBottom: designTokens.spacing.sm,
    padding: designTokens.spacing.sm,
    backgroundColor: designTokens.colors.backgroundLight,
    borderRadius: designTokens.borderRadius.sm,
  },
  restaurantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: designTokens.spacing.xs,
  },
  restaurantName: {
    fontSize: designTokens.typography.bodyMedium.fontSize,
    fontFamily: designTokens.typography.bodyMedium.fontFamily,
    color: designTokens.colors.textDark,
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  restaurantLocation: {
    fontSize: designTokens.typography.smallText.fontSize,
    fontFamily: designTokens.typography.smallText.fontFamily,
    color: designTokens.colors.textLight,
    marginBottom: designTokens.spacing.xs,
  },
  visitDetails: {
    flexDirection: 'row',
    gap: designTokens.spacing.md,
  },
  visitDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
  },
  visitDetailText: {
    fontSize: designTokens.typography.smallText.fontSize,
    fontFamily: designTokens.typography.smallText.fontFamily,
    color: designTokens.colors.textLight,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: designTokens.spacing.xs,
    marginBottom: designTokens.spacing.sm,
  },
  tag: {
    fontSize: designTokens.typography.smallText.fontSize,
    fontFamily: designTokens.typography.smallText.fontFamily,
    color: designTokens.colors.primaryOrange,
  },
  engagementActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: designTokens.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: designTokens.colors.borderLight,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
  },
  actionCount: {
    fontSize: designTokens.typography.smallText.fontSize,
    fontFamily: designTokens.typography.smallText.fontFamily,
    color: designTokens.colors.textLight,
  },
  summarySection: {
    backgroundColor: designTokens.colors.backgroundLight,
    borderRadius: designTokens.borderRadius.sm,
    padding: designTokens.spacing.md,
    marginBottom: designTokens.spacing.lg,
  },
  summaryTitle: {
    fontSize: designTokens.typography.bodyMedium.fontSize,
    fontFamily: designTokens.typography.bodyMedium.fontFamily,
    color: designTokens.colors.textDark,
    marginBottom: designTokens.spacing.sm,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: designTokens.spacing.sm,
  },
  summaryLabel: {
    fontSize: designTokens.typography.bodyRegular.fontSize,
    fontFamily: designTokens.typography.bodyRegular.fontFamily,
    color: designTokens.colors.textMedium,
  },
  summaryValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
  },
  summaryText: {
    fontSize: designTokens.typography.bodyRegular.fontSize,
    fontFamily: designTokens.typography.bodyRegular.fontFamily,
    color: designTokens.colors.textDark,
  },
  footer: {
    padding: designTokens.spacing.md,
    borderTopWidth: 1,
    borderTopColor: designTokens.colors.borderLight,
  },
  publishButton: {
    backgroundColor: designTokens.colors.primaryOrange,
    padding: designTokens.spacing.md,
    borderRadius: designTokens.borderRadius.sm,
    alignItems: 'center',
  },
  publishButtonDisabled: {
    opacity: 0.6,
  },
  publishButtonText: {
    fontSize: designTokens.typography.bodyMedium.fontSize,
    fontFamily: designTokens.typography.bodyMedium.fontFamily,
    color: designTokens.colors.white,
  },
}); 