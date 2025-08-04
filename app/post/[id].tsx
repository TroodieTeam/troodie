import { ErrorState } from '@/components/ErrorState';
import { ExternalContentPreview } from '@/components/posts/ExternalContentPreview';
import { designTokens } from '@/constants/designTokens';
import { DEFAULT_IMAGES } from '@/constants/images';
import { useAuth } from '@/contexts/AuthContext';
import { postEngagementService } from '@/services/postEngagementService';
import { postService } from '@/services/postService';
import { ToastService } from '@/services/toastService';
import { getErrorType } from '@/types/errors';
import { PostWithUser } from '@/types/post';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Bookmark,
  Heart,
  MessageCircle,
  MoreVertical,
  Share2
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PostDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [post, setPost] = useState<PostWithUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retrying, setRetrying] = useState(false);
  
  // Engagement states
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [savesCount, setSavesCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (id) {
      loadPost(id as string);
    }
  }, [id]);

  const loadPost = async (postId: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await postService.getPostById(postId);
      if (data) {
        setPost(data);
        setIsLiked(data.is_liked_by_user || false);
        setIsSaved(data.is_saved_by_user || false);
        setLikesCount(data.likes_count || 0);
        setSavesCount(data.saves_count || 0);
      } else {
        throw new Error('Post not found');
      }
    } catch (err) {
      console.error('Error loading post:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const onRetry = async () => {
    if (!id) return;
    setRetrying(true);
    await loadPost(id as string);
    setRetrying(false);
  };

  const handleUserPress = useCallback(() => {
    if (post?.user?.id) {
      router.push({
        pathname: '/user/[id]',
        params: { id: post.user.id }
      });
    }
  }, [post, router]);

  const handleRestaurantPress = useCallback(() => {
    if (post?.restaurant?.id) {
      router.push({
        pathname: '/restaurant/[id]',
        params: { id: post.restaurant.id }
      });
    }
  }, [post, router]);

  const handleLike = async () => {
    if (!user?.id || !post || isProcessing) return;

    setIsProcessing(true);
    try {
      const newLikedState = await postEngagementService.togglePostLike(post.id, user.id);
      setIsLiked(newLikedState);
      setLikesCount(prev => newLikedState ? prev + 1 : prev - 1);
    } catch (error) {
      console.error('Error toggling like:', error);
      ToastService.showError('Failed to like post');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id || !post || isProcessing) return;

    setIsProcessing(true);
    try {
      const newSavedState = await postEngagementService.togglePostSave(post.id, user.id);
      setIsSaved(newSavedState);
      setSavesCount(prev => newSavedState ? prev + 1 : prev - 1);
      ToastService.showSuccess(newSavedState ? 'Post saved' : 'Post unsaved');
    } catch (error) {
      console.error('Error toggling save:', error);
      ToastService.showError('Failed to save post');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShare = async () => {
    if (!post) return;

    try {
      const result = await Share.share({
        message: `Check out this post about ${post.restaurant.name} on TROODIE!`,
        url: `https://troodie.com/post/${post.id}`, // Replace with actual URL
      });

      if (result.action === Share.sharedAction) {
        ToastService.showSuccess('Post shared!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
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
        size={16}
        color={i < ratingValue ? designTokens.colors.primaryOrange : designTokens.colors.textMedium}
      />
    ));
  };

  if (loading && !error) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={designTokens.colors.primaryOrange} />
          <Text style={styles.loadingText}>Loading post...</Text>
        </View>
      </View>
    );
  }

  if (error || !post) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={designTokens.colors.textDark} />
          </TouchableOpacity>
        </View>
        <ErrorState
          error={error || new Error('Post not found')}
          errorType={error ? getErrorType(error) : 'notFound'}
          onRetry={error ? onRetry : undefined}
          retrying={retrying}
          fullScreen
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={designTokens.colors.textDark} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.moreButton}>
            <MoreVertical size={24} color={designTokens.colors.textDark} />
          </TouchableOpacity>
        </View>

        {/* User Info - Clickable */}
        <TouchableOpacity 
          style={styles.userInfo}
          onPress={handleUserPress}
          activeOpacity={0.6}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Image 
            source={{ uri: post.user.avatar || DEFAULT_IMAGES.avatar }} 
            style={styles.avatar} 
          />
          <View style={styles.userDetails}>
            <View style={styles.userNameRow}>
              <Text style={styles.userName}>
                {post.user.name || post.user.username || 'Unknown User'}
              </Text>
              {post.user.verified && (
                <Ionicons name="checkmark-circle" size={16} color={designTokens.colors.primaryOrange} />
              )}
            </View>
            <Text style={styles.userPersona}>{post.user.persona || 'Food Explorer'}</Text>
          </View>
          <Text style={styles.timestamp}>{formatTimeAgo(post.created_at)}</Text>
        </TouchableOpacity>

        {/* Content Type Badge */}
        {(post as any).content_type === 'external' && (
          <View style={styles.contentTypeBadge}>
            <Ionicons name="link" size={14} color="#666" />
            <Text style={styles.contentTypeText}>External Content</Text>
          </View>
        )}

        {/* Caption */}
        {post.caption && (
          <Text style={styles.caption}>
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

        {/* Photos */}
        {(post as any).content_type !== 'external' && post.photos && post.photos.length > 0 && (
          <View style={styles.photoContainer}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.photoScroll}
            >
              {post.photos.map((photo, index) => (
                <Image 
                  key={index}
                  source={{ uri: photo }} 
                  style={styles.photo}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
            {post.photos.length > 1 && (
              <View style={styles.photoIndicator}>
                <Text style={styles.photoIndicatorText}>
                  {`${1}/${post.photos.length}`}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Restaurant Info - Clickable */}
        <TouchableOpacity 
          style={styles.restaurantInfo}
          onPress={handleRestaurantPress}
          activeOpacity={0.6}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Image 
            source={{ uri: post.restaurant.image || DEFAULT_IMAGES.restaurant }} 
            style={styles.restaurantImage} 
          />
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
              <Text style={styles.restaurantDot}>•</Text>
              <Text style={styles.restaurantCuisine}>
                {post.restaurant.cuisine}
              </Text>
            </View>
          </View>
          <View style={styles.restaurantArrow}>
            <Ionicons name="chevron-forward" size={20} color={designTokens.colors.textMedium} />
          </View>
        </TouchableOpacity>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={handleLike}
            disabled={isProcessing}
          >
            <Heart 
              size={24} 
              color={isLiked ? designTokens.colors.primaryOrange : designTokens.colors.textDark}
              fill={isLiked ? designTokens.colors.primaryOrange : 'transparent'}
            />
            <Text style={[styles.actionCount, isLiked && styles.actionCountActive]}>
              {likesCount}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <MessageCircle size={24} color={designTokens.colors.textDark} />
            <Text style={styles.actionCount}>{post.comments_count || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={handleSave}
            disabled={isProcessing}
          >
            <Bookmark 
              size={24} 
              color={isSaved ? designTokens.colors.primaryOrange : designTokens.colors.textDark}
              fill={isSaved ? designTokens.colors.primaryOrange : 'transparent'}
            />
            <Text style={[styles.actionCount, isSaved && styles.actionCountActive]}>
              {savesCount}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Share2 size={24} color={designTokens.colors.textDark} />
          </TouchableOpacity>
        </View>

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>Comments</Text>
          <Text style={styles.noComments}>No comments yet. Be the first to comment!</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: designTokens.spacing.md,
    ...designTokens.typography.bodyRegular,
    color: designTokens.colors.textMedium,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  backButton: {
    padding: designTokens.spacing.sm,
  },
  moreButton: {
    padding: designTokens.spacing.sm,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.md,
    backgroundColor: designTokens.colors.white,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: designTokens.colors.backgroundGray,
  },
  userDetails: {
    flex: 1,
    marginLeft: designTokens.spacing.md,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userName: {
    ...designTokens.typography.bodyMedium,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
    textDecorationLine: 'underline',
  },
  userPersona: {
    ...designTokens.typography.detailText,
    color: designTokens.colors.textMedium,
    marginTop: 2,
  },
  timestamp: {
    ...designTokens.typography.detailText,
    color: designTokens.colors.textMedium,
  },
  contentTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.sm,
  },
  contentTypeText: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textMedium,
  },
  caption: {
    ...designTokens.typography.bodyRegular,
    color: designTokens.colors.textDark,
    paddingHorizontal: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.md,
    lineHeight: 20,
  },
  photoContainer: {
    marginVertical: designTokens.spacing.md,
    position: 'relative',
  },
  photoScroll: {
    height: SCREEN_WIDTH,
  },
  photo: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  photoIndicator: {
    position: 'absolute',
    top: designTokens.spacing.md,
    right: designTokens.spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: 4,
    borderRadius: designTokens.borderRadius.sm,
  },
  photoIndicatorText: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.white,
  },
  restaurantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: designTokens.spacing.lg,
    backgroundColor: designTokens.colors.backgroundLight,
    marginTop: designTokens.spacing.md,
    marginHorizontal: designTokens.spacing.md,
    borderRadius: designTokens.borderRadius.md,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
  },
  restaurantImage: {
    width: 56,
    height: 56,
    borderRadius: designTokens.borderRadius.sm,
    backgroundColor: designTokens.colors.backgroundGray,
  },
  restaurantDetails: {
    flex: 1,
    marginLeft: designTokens.spacing.md,
  },
  restaurantName: {
    ...designTokens.typography.bodyMedium,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
    marginBottom: 2,
  },
  restaurantLocation: {
    ...designTokens.typography.detailText,
    color: designTokens.colors.textMedium,
    marginBottom: 4,
  },
  restaurantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  restaurantDot: {
    ...designTokens.typography.detailText,
    color: designTokens.colors.textLight,
    marginHorizontal: 6,
  },
  restaurantCuisine: {
    ...designTokens.typography.detailText,
    color: designTokens.colors.textMedium,
  },
  restaurantArrow: {
    padding: designTokens.spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.md,
    borderTopWidth: 1,
    borderTopColor: designTokens.colors.borderLight,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: designTokens.spacing.xl,
    gap: 6,
  },
  actionCount: {
    ...designTokens.typography.detailText,
    color: designTokens.colors.textDark,
  },
  actionCountActive: {
    color: designTokens.colors.primaryOrange,
  },
  commentsSection: {
    padding: designTokens.spacing.lg,
  },
  commentsTitle: {
    ...designTokens.typography.bodyMedium,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
    marginBottom: designTokens.spacing.md,
  },
  noComments: {
    ...designTokens.typography.bodyRegular,
    color: designTokens.colors.textMedium,
    textAlign: 'center',
    paddingVertical: designTokens.spacing.xl,
  },
});