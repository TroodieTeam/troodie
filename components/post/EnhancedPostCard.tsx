import React, { memo, useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Heart, MessageCircle, Bookmark, Share2, MapPin } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { PostWithUser } from '@/types/post';
import { usePostEngagement } from '@/hooks/usePostEngagement';
import { designTokens } from '@/constants/designTokens';
import { DEFAULT_IMAGES } from '@/constants/images';
import { formatDistanceToNow } from '@/utils/dateHelpers';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_HEIGHT = SCREEN_WIDTH * 0.75;

interface EnhancedPostCardProps {
  post: PostWithUser;
  onPress?: () => void;
  onUserPress?: (userId: string) => void;
  onRestaurantPress?: (restaurantId: string) => void;
  showComments?: boolean;
  enableRealtime?: boolean;
}

export const EnhancedPostCard = memo(({
  post,
  onPress,
  onUserPress,
  onRestaurantPress,
  showComments = false,
  enableRealtime = true,
}: EnhancedPostCardProps) => {
  const router = useRouter();
  const [imageIndex, setImageIndex] = useState(0);
  
  const {
    isLiked,
    isSaved,
    likesCount,
    commentsCount,
    savesCount,
    shareCount,
    isLoading,
    toggleLike,
    toggleSave,
    sharePost,
    copyLink,
  } = usePostEngagement({
    postId: post.id,
    initialStats: {
      likes_count: post.likes_count,
      comments_count: post.comments_count,
      saves_count: post.saves_count,
      share_count: post.share_count || 0,
    },
    initialIsLiked: post.is_liked_by_user || false,
    initialIsSaved: post.is_saved_by_user || false,
    enableRealtime,
  });
  
  const handleUserPress = useCallback(() => {
    if (onUserPress) {
      onUserPress(post.user.id);
    } else {
      router.push(`/profile/${post.user.id}`);
    }
  }, [post.user.id, onUserPress, router]);
  
  const handleRestaurantPress = useCallback(() => {
    if (post.restaurant?.id) {
      if (onRestaurantPress) {
        onRestaurantPress(post.restaurant.id);
      } else {
        router.push(`/restaurant/${post.restaurant.id}`);
      }
    }
  }, [post.restaurant?.id, onRestaurantPress, router]);
  
  const handleCommentPress = useCallback(() => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/posts/${post.id}`);
    }
  }, [post.id, onPress, router]);
  
  const handleSharePress = useCallback(() => {
    Alert.alert(
      'Share Post',
      'How would you like to share this post?',
      [
        {
          text: 'Share',
          onPress: () => sharePost(
            post.caption || 'Check out this post',
            post.restaurant?.name || 'Restaurant'
          ),
        },
        {
          text: 'Copy Link',
          onPress: copyLink,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
    );
  }, [sharePost, copyLink, post.caption, post.restaurant?.name]);
  
  const getTrafficLightColor = (rating: number | null) => {
    if (!rating || rating === 0) return '#DDD';
    
    if (rating <= 3) {
      const trafficColors = {
        1: '#FF4444',
        2: '#FFAA44',
        3: '#00AA00',
      };
      return trafficColors[rating as keyof typeof trafficColors] || '#DDD';
    } else {
      const starColors = {
        1: '#FF4444',
        2: '#FF7744',
        3: '#FFAA44',
        4: '#44AA44',
        5: '#00AA00',
      };
      return starColors[rating as keyof typeof starColors] || '#DDD';
    }
  };
  
  const getTrafficLightLabel = (rating: number | null) => {
    if (!rating || rating === 0) return '';
    
    if (rating <= 3) {
      const trafficLabels = {
        1: 'Poor',
        2: 'Average',
        3: 'Excellent'
      };
      return trafficLabels[rating as keyof typeof trafficLabels] || '';
    } else {
      const starLabels = {
        1: 'Poor',
        2: 'Fair',
        3: 'Good',
        4: 'Great',
        5: 'Excellent'
      };
      return starLabels[rating as keyof typeof starLabels] || '';
    }
  };
  
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleUserPress} style={styles.userInfo}>
          <Image
            source={{ uri: post.user.avatar || DEFAULT_IMAGES.avatar }}
            style={styles.avatar}
          />
          <View style={styles.userDetails}>
            <View style={styles.nameRow}>
              <Text style={styles.userName}>{post.user.name}</Text>
              {post.user.verified && (
                <Text style={styles.verifiedBadge}>✓</Text>
              )}
            </View>
            <Text style={styles.timestamp}>
              {formatDistanceToNow(post.created_at)}
            </Text>
          </View>
        </TouchableOpacity>
        
        {post.restaurant && (
          <TouchableOpacity onPress={handleRestaurantPress} style={styles.restaurantTag}>
            <MapPin size={12} color={designTokens.colors.textSecondary} />
            <Text style={styles.restaurantName} numberOfLines={1}>
              {post.restaurant.name}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Images */}
      {post.photos && post.photos.length > 0 && (
        <TouchableOpacity onPress={onPress} activeOpacity={0.95}>
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: post.photos[imageIndex] }}
              style={styles.image}
              resizeMode="cover"
            />
            {post.photos.length > 1 && (
              <View style={styles.imagePagination}>
                {post.photos.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.paginationDot,
                      index === imageIndex && styles.paginationDotActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        </TouchableOpacity>
      )}
      
      {/* Engagement Buttons */}
      <View style={styles.engagementRow}>
        <View style={styles.leftEngagement}>
          <TouchableOpacity
            onPress={toggleLike}
            style={styles.engagementButton}
            disabled={isLoading}
          >
            <Heart
              size={24}
              color={isLiked ? '#FF4444' : designTokens.colors.textSecondary}
              fill={isLiked ? '#FF4444' : 'transparent'}
            />
            {likesCount > 0 && (
              <Text style={styles.engagementCount}>{likesCount}</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleCommentPress}
            style={styles.engagementButton}
          >
            <MessageCircle
              size={24}
              color={designTokens.colors.textSecondary}
            />
            {commentsCount > 0 && (
              <Text style={styles.engagementCount}>{commentsCount}</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleSharePress}
            style={styles.engagementButton}
          >
            <Share2
              size={22}
              color={designTokens.colors.textSecondary}
            />
            {shareCount > 0 && (
              <Text style={styles.engagementCount}>{shareCount}</Text>
            )}
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity
          onPress={() => toggleSave()}
          style={styles.engagementButton}
          disabled={isLoading}
        >
          <Bookmark
            size={24}
            color={isSaved ? designTokens.colors.primaryOrange : designTokens.colors.textSecondary}
            fill={isSaved ? designTokens.colors.primaryOrange : 'transparent'}
          />
        </TouchableOpacity>
      </View>
      
      {/* Caption and Rating */}
      <View style={styles.content}>
        {post.rating && (
          <View style={styles.ratingRow}>
            <View style={styles.trafficLight}>
              <View
                style={[
                  styles.trafficDot,
                  { backgroundColor: getTrafficLightColor(post.rating) }
                ]}
              />
              <Text style={styles.ratingLabel}>
                {getTrafficLightLabel(post.rating)}
              </Text>
            </View>
          </View>
        )}
        
        {post.caption && (
          <TouchableOpacity onPress={onPress}>
            <Text style={styles.caption} numberOfLines={3}>
              <Text style={styles.captionUsername}>{post.user.username}</Text>
              {' '}{post.caption}
            </Text>
          </TouchableOpacity>
        )}
        
        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {post.tags.slice(0, 3).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      
      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={designTokens.colors.primaryOrange} />
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors.textDark,
  },
  verifiedBadge: {
    marginLeft: 4,
    fontSize: 12,
    color: designTokens.colors.primaryOrange,
  },
  timestamp: {
    fontSize: 12,
    color: designTokens.colors.textSecondary,
    marginTop: 2,
  },
  restaurantTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designTokens.colors.backgroundGray,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    maxWidth: 150,
  },
  restaurantName: {
    fontSize: 12,
    color: designTokens.colors.textSecondary,
    marginLeft: 4,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
  },
  imagePagination: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  paginationDotActive: {
    backgroundColor: '#FFFFFF',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  engagementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  leftEngagement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  engagementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  engagementCount: {
    fontSize: 14,
    color: designTokens.colors.textSecondary,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  ratingRow: {
    marginBottom: 8,
  },
  trafficLight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trafficDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  ratingLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: designTokens.colors.textSecondary,
  },
  caption: {
    fontSize: 14,
    lineHeight: 20,
    color: designTokens.colors.text,
  },
  captionUsername: {
    fontWeight: '600',
    color: designTokens.colors.textDark,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  tag: {
    backgroundColor: designTokens.colors.backgroundLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: designTokens.colors.primaryOrange,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

EnhancedPostCard.displayName = 'EnhancedPostCard';