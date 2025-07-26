import { designTokens } from '@/constants/designTokens';
import { useAuth } from '@/contexts/AuthContext';
import { postEngagementService } from '@/services/postEngagementService';
import { PostWithUser } from '@/types/post';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Dimensions,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { ExternalContentPreview } from './posts/ExternalContentPreview';

interface PostCardProps {
  post: PostWithUser;
  onPress?: () => void;
  onLike?: (postId: string, liked: boolean) => void;
  onComment?: (postId: string) => void;
  onSave?: (postId: string) => void;
  onShare?: (postId: string) => void;
  showActions?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;

export function PostCard({
  post,
  onPress,
  onLike,
  onComment,
  onSave,
  onShare,
  showActions = true,
}: PostCardProps) {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(post.is_liked_by_user || false);
  const [isSaved, setIsSaved] = useState(post.is_saved_by_user || false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [savesCount, setSavesCount] = useState(post.saves_count);

  const handleLike = async () => {
    if (!user?.id) return;

    try {
      const newLikedState = await postEngagementService.togglePostLike(post.id, user.id);
      setIsLiked(newLikedState);
      setLikesCount(prev => newLikedState ? prev + 1 : prev - 1);
      onLike?.(post.id, newLikedState);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;

    try {
      const newSavedState = await postEngagementService.togglePostSave(post.id, user.id);
      setIsSaved(newSavedState);
      setSavesCount(prev => newSavedState ? prev + 1 : prev - 1);
      onSave?.(post.id);
    } catch (error) {
      console.error('Error toggling save:', error);
    }
  };

  const handleComment = () => {
    onComment?.(post.id);
  };

  const handleShare = () => {
    onShare?.(post.id);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const getRatingStars = (rating: number | null) => {
    const ratingValue = rating || 0;
    return Array.from({ length: 5 }, (_, i) => (
      <Ionicons
        key={i}
        name={i < ratingValue ? 'star' : 'star-outline'}
        size={12}
        color={i < ratingValue ? designTokens.colors.primaryOrange : designTokens.colors.textMedium}
      />
    ));
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Image 
            source={{ uri: post.user.avatar || 'https://i.pravatar.cc/150?img=1' }} 
            style={styles.avatar} 
          />
          <View style={styles.userDetails}>
            <View style={styles.userNameRow}>
              <Text style={styles.userName} numberOfLines={1}>
                {post.user.name || post.user.username || 'Unknown User'}
              </Text>
              {post.user.verified && (
                <Ionicons name="checkmark-circle" size={14} color={designTokens.colors.primaryOrange} />
              )}
            </View>
            <Text style={styles.userPersona}>{post.user.persona || 'Food Explorer'}</Text>
          </View>
        </View>
        <Text style={styles.timestamp}>{formatTimeAgo(post.created_at)}</Text>
      </View>

      {/* Content Type Badge */}
      {(post as any).content_type === 'external' && (
        <View style={styles.contentTypeBadge}>
          <Ionicons name="link" size={12} color="#666" />
          <Text style={styles.contentTypeText}>External Content</Text>
        </View>
      )}

      {/* Content */}
      {post.caption && (
        <Text style={styles.caption} numberOfLines={3}>
          {post.caption}
        </Text>
      )}

      {/* External Content Preview */}
      {(post as any).content_type === 'external' && (post as any).external_url && (
        <ExternalContentPreview
          source={(post as any).external_source}
          url={(post as any).external_url}
          title={(post as any).external_title}
          description={(post as any).external_description}
          thumbnail={(post as any).external_thumbnail}
          author={(post as any).external_author}
        />
      )}

      {/* Photos - Only show for original content */}
      {(post as any).content_type !== 'external' && post.photos && post.photos.length > 0 && (
        <View style={styles.photoContainer}>
          {post.photos.length === 1 ? (
            <Image source={{ uri: post.photos[0] }} style={styles.singlePhoto} />
          ) : (
            <View style={styles.photoGrid}>
              {post.photos.slice(0, 4).map((photo, index) => (
                <Image key={index} source={{ uri: photo }} style={styles.gridPhoto} />
              ))}
              {post.photos.length > 4 && (
                <View style={styles.photoOverlay}>
                  <Text style={styles.photoCount}>+{post.photos.length - 4}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* Restaurant Info */}
      <View style={styles.restaurantInfo}>
        <Image source={{ uri: post.restaurant.image }} style={styles.restaurantImage} />
        <View style={styles.restaurantDetails}>
          <Text style={styles.restaurantName} numberOfLines={1}>
            {post.restaurant.name}
          </Text>
          <Text style={styles.restaurantLocation} numberOfLines={1}>
            {post.restaurant.location}
          </Text>
          <View style={styles.restaurantMeta}>
            <View style={styles.ratingContainer}>
              {getRatingStars(post.rating)}
            </View>
            <Text style={styles.priceRange}>{post.restaurant.priceRange}</Text>
          </View>
        </View>
      </View>

      {/* Visit Info */}
      {(post.visit_type || post.price_range || post.rating) && (
        <View style={styles.visitInfo}>
          {post.visit_type && (
            <View style={styles.visitType}>
              <Ionicons
                name={
                  post.visit_type === 'dine_in' ? 'restaurant' :
                  post.visit_type === 'takeout' ? 'bag-handle' : 'car'
                }
                size={14}
                color={designTokens.colors.textMedium}
              />
              <Text style={styles.visitTypeText}>
                {post.visit_type === 'dine_in' ? 'Dine In' :
                 post.visit_type === 'takeout' ? 'Takeout' : 'Delivery'}
              </Text>
            </View>
          )}
          {post.price_range && (
            <Text style={styles.priceInfo}>{post.price_range}</Text>
          )}
          {post.rating && post.rating > 0 && (
            <View style={styles.ratingInfo}>
              <Ionicons name="star" size={14} color={designTokens.colors.primaryOrange} />
              <Text style={styles.ratingText}>{post.rating}</Text>
            </View>
          )}
        </View>
      )}

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {post.tags.slice(0, 3).map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
          {post.tags.length > 3 && (
            <Text style={styles.moreTags}>+{post.tags.length - 3} more</Text>
          )}
        </View>
      )}

      {/* Actions */}
      {showActions && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={20}
              color={isLiked ? '#FF4444' : designTokens.colors.textMedium}
            />
            <Text style={styles.actionCount}>{likesCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleComment}>
            <Ionicons name="chatbubble-outline" size={20} color={designTokens.colors.textMedium} />
            <Text style={styles.actionCount}>{post.comments_count}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleSave}>
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={isSaved ? designTokens.colors.primaryOrange : designTokens.colors.textMedium}
            />
            <Text style={styles.actionCount}>{savesCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={20} color={designTokens.colors.textMedium} />
            <Text style={styles.actionCount}>{post.shares_count}</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.lg,
    padding: designTokens.spacing.md,
    marginBottom: designTokens.spacing.md,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: designTokens.spacing.sm,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: designTokens.spacing.sm,
  },
  userDetails: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
  },
  userName: {
    ...designTokens.typography.bodyRegular,
    color: designTokens.colors.textDark,
    fontFamily: 'Inter_600SemiBold',
  },
  userPersona: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textMedium,
  },
  timestamp: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textMedium,
  },
  caption: {
    ...designTokens.typography.bodyRegular,
    color: designTokens.colors.textDark,
    marginBottom: designTokens.spacing.sm,
    lineHeight: 20,
  },
  photoContainer: {
    marginBottom: designTokens.spacing.sm,
  },
  singlePhoto: {
    width: '100%',
    height: 200,
    borderRadius: designTokens.borderRadius.md,
    backgroundColor: designTokens.colors.backgroundLight,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  gridPhoto: {
    width: (CARD_WIDTH - 32) / 2 - 1,
    height: 120,
    borderRadius: designTokens.borderRadius.sm,
    backgroundColor: designTokens.colors.backgroundLight,
  },
  photoOverlay: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: designTokens.borderRadius.sm,
    paddingHorizontal: designTokens.spacing.xs,
    paddingVertical: 2,
  },
  photoCount: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.white,
    fontFamily: 'Inter_600SemiBold',
  },
  restaurantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: designTokens.spacing.sm,
    padding: designTokens.spacing.sm,
    backgroundColor: designTokens.colors.backgroundGray,
    borderRadius: designTokens.borderRadius.md,
  },
  restaurantImage: {
    width: 50,
    height: 50,
    borderRadius: designTokens.borderRadius.sm,
    marginRight: designTokens.spacing.sm,
  },
  restaurantDetails: {
    flex: 1,
  },
  restaurantName: {
    ...designTokens.typography.bodyRegular,
    color: designTokens.colors.textDark,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  restaurantLocation: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textMedium,
    marginBottom: designTokens.spacing.xs,
  },
  restaurantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 1,
  },
  priceRange: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textMedium,
  },
  visitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.md,
    marginBottom: designTokens.spacing.sm,
  },
  visitType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
  },
  visitTypeText: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textMedium,
  },
  priceInfo: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textMedium,
  },
  ratingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
  },
  ratingText: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textDark,
    fontFamily: 'Inter_600SemiBold',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: designTokens.spacing.xs,
    marginBottom: designTokens.spacing.sm,
  },
  tag: {
    backgroundColor: designTokens.colors.backgroundGray,
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.xs,
    borderRadius: designTokens.borderRadius.full,
  },
  tagText: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textDark,
  },
  moreTags: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textMedium,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: designTokens.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: designTokens.colors.borderLight,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
    padding: designTokens.spacing.sm,
  },
  actionCount: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textMedium,
    fontFamily: 'Inter_500Medium',
  },
  contentTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
    backgroundColor: designTokens.colors.backgroundLight,
    alignSelf: 'flex-start',
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.xs,
    borderRadius: designTokens.borderRadius.full,
    marginBottom: designTokens.spacing.xs,
  },
  contentTypeText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: '#666',
  },
}); 