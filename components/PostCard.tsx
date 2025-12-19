import { compactDesign, designTokens } from '@/constants/designTokens';
import { DEFAULT_IMAGES } from '@/constants/images';
import { useAuth } from '@/contexts/AuthContext';
import { usePostEngagement } from '@/hooks/usePostEngagement';
import { supabase } from '@/lib/supabase';
import { moderationService } from '@/services/moderationService';
import ShareService from '@/services/shareService';
import { ToastService } from '@/services/toastService';
import { PostWithUser } from '@/types/post';
import { eventBus, EVENTS } from '@/utils/eventBus';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    Alert,
    Dimensions,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { MenuButton } from './common/MenuButton';
import { ImageViewer } from './ImageViewer';
import { ReportModal } from './modals/ReportModal';
import { ExternalContentPreview } from './posts/ExternalContentPreview';
import { VideoThumbnail } from './VideoThumbnail';
import { VideoViewer } from './VideoViewer';

interface PostCardProps {
  post: PostWithUser;
  onPress?: () => void;
  onLike?: (postId: string, liked: boolean) => void;
  onComment?: (postId: string) => void;
  onShare?: (postId: string) => void;
  onBlock?: (userId: string) => void;
  onDelete?: (postId: string) => void;
  showActions?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - (compactDesign.content.padding * 2);

export function PostCard({
  post,
  onPress,
  onLike,
  onComment,
  onShare,
  onBlock,
  onDelete,
  showActions = true,
}: PostCardProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [showReportModal, setShowReportModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);
  const [showVideoViewer, setShowVideoViewer] = useState(false);
  const [videoViewerIndex, setVideoViewerIndex] = useState(0);
  
  // Memoize initial stats to prevent unnecessary re-initialization
  const initialStats = useMemo(() => ({
    likes_count: post.likes_count,
    comments_count: post.comments_count,
    share_count: post.share_count || 0,
  }), [post.likes_count, post.comments_count, post.share_count]);

  // Use the enhanced post engagement hook
  const {
    isLiked,
    likesCount,
    commentsCount,
    shareCount,
    isLoading,
    toggleLike,
  } = usePostEngagement({
    postId: post.id,
    initialStats,
    initialIsLiked: post.is_liked_by_user || false,
    enableRealtime: true,
  });


  const handleLike = async () => {
    if (isLoading) return;
    const previousIsLiked = isLiked;
    await toggleLike();
    // Like updates are handled via event bus (POST_ENGAGEMENT_CHANGED)
    // Call onLike callback for any parent component side effects if needed
    // Pass the new state (opposite of previous)
    onLike?.(post.id, !previousIsLiked);
  };

  const handleComment = () => {
    // Navigate to comments modal
    router.push(`/posts/${post.id}/comments`);
    onComment?.(post.id); // Still call callback for backwards compatibility
  };

  const handleShare = async () => {
    try {
      // Use ShareService to share the post with proper deep link
      const result = await ShareService.share({
        type: 'post',
        id: post.id,
        title: post.restaurant?.name || 'Amazing food discovery',
        description: post.caption || undefined,
        tags: post.tags || undefined,
        image: post.photos?.[0] || post.restaurant?.image || undefined,
      });
      
      if (result.success) {
        // Optionally track share count locally
        onShare?.(post.id);
      }
    } catch (error) {
      console.error('Error sharing post:', error);
      ToastService.showError('Failed to share post');
    }
  };

  const handleUserPress = useCallback((e: any) => {
    e.stopPropagation();
    if (post.user?.id) {
      router.push(`/user/${post.user.id}`);
    }
  }, [post.user, router]);

  const handleRestaurantPress = useCallback((e: any) => {
    e.stopPropagation();
    if (post.restaurant && post.restaurant.id) {
      router.push(`/restaurant/${post.restaurant.id}`);
    }
  }, [post.restaurant, router]);

  const handleMenuPress = () => {
    const isOwnPost = user?.id === post.user?.id;
    
    const options = isOwnPost
      ? ['Edit Post', 'Delete Post', 'Cancel']
      : ['Report Post', 'Block User', 'Cancel'];
    
    const destructiveButtonIndex = isOwnPost ? 1 : -1;
    const cancelButtonIndex = options.length - 1;

    Alert.alert(
      'Post Options',
      undefined,
      options.map((option, index) => ({
        text: option,
        style: index === destructiveButtonIndex ? 'destructive' : index === cancelButtonIndex ? 'cancel' : 'default',
        onPress: () => {
          if (option === 'Report Post') {
            setShowReportModal(true);
          } else if (option === 'Block User') {
            handleBlockUser();
          } else if (option === 'Edit Post') {
            // Navigate to create-post screen with edit mode
            router.push({
              pathname: '/add/create-post',
              params: { 
                editMode: 'true',
                postId: post.id,
                // Pass restaurant data if available
                selectedRestaurant: post.restaurant ? JSON.stringify({
                  id: post.restaurant.id,
                  name: post.restaurant.name,
                  cuisine_types: post.restaurant.cuisine_types,
                  address: post.restaurant.address,
                  city: post.restaurant.city,
                  state: post.restaurant.state
                }) : undefined
              }
            });
          } else if (option === 'Delete Post') {
            handleDeletePost();
          }
        }
      }))
    );
  };

  const handleBlockUser = async () => {
    if (!user || !post.user?.id) return;
    
    Alert.alert(
      'Block User',
      `Are you sure you want to block ${post.user.name || 'this user'}? You won't see their content anymore.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await moderationService.blockUser(post.user.id);
              
              if (success) {
                ToastService.showSuccess('User blocked successfully');
                // Trigger parent component to refresh/filter the feed
                onBlock?.(post.user.id);
              }
            } catch (error) {
              console.error('Error blocking user from PostCard:', error);
              // Error is already handled by moderationService with Alert
            }
          }
        }
      ]
    );
  };

  const handleDeletePost = () => {
    // If a custom onDelete handler is provided, use it instead of the default deletion
    if (onDelete) {
      onDelete(post.id);
      return;
    }

    // Default deletion behavior when no custom handler is provided
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
              // First get the post's community IDs before deletion
              const { data: postData } = await supabase
                .from('posts')
                .select('community_ids')
                .eq('id', post.id)
                .single();

              // Now delete the post
              const { error } = await supabase
                .from('posts')
                .delete()
                .eq('id', post.id)
                .eq('user_id', user?.id);

              if (error) throw error;

              // Emit deletion events for each community
              if (postData?.community_ids && postData.community_ids.length > 0) {
                postData.community_ids.forEach((communityId: string) => {
                  eventBus.emit(EVENTS.COMMUNITY_POST_DELETED, {
                    postId: post.id,
                    communityId
                  });
                });
              }

              ToastService.showSuccess('Post deleted successfully');
            } catch (error) {
              console.error('Error deleting post:', error);
              ToastService.showError('Failed to delete post');
            }
          }
        }
      ]
    );
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

  const getTrafficLightRating = (rating: number | null) => {
    if (!rating || rating === 0) return null;
    
    // Handle both 3-point traffic light system and 5-point star system
    let color, label;
    
    if (rating <= 3) {
      // Traffic light system: 1=Red, 2=Yellow, 3=Green
      const trafficColors = {
        1: '#FF4444', // Red - Poor
        2: '#FFAA44', // Yellow - Average 
        3: '#00AA00', // Green - Excellent
      };
      
      const trafficLabels = {
        1: 'Poor',
        2: 'Average',
        3: 'Excellent'
      };
      
      color = trafficColors[rating as keyof typeof trafficColors];
      label = trafficLabels[rating as keyof typeof trafficLabels];
    } else {
      // 5-star system: 1-5 stars
      const starColors = {
        1: '#FF4444', // Red
        2: '#FF7744', // Orange-Red
        3: '#FFAA44', // Orange
        4: '#44AA44', // Light Green
        5: '#00AA00', // Green
      };
      
      const starLabels = {
        1: 'Poor',
        2: 'Fair', 
        3: 'Good',
        4: 'Great',
        5: 'Excellent'
      };
      
      color = starColors[rating as keyof typeof starColors];
      label = starLabels[rating as keyof typeof starLabels];
    }
    
    return (
      <View style={styles.trafficLight}>
        <View style={[styles.trafficDot, { backgroundColor: color }]} />
        <Text style={styles.ratingText}>{label}</Text>
      </View>
    );
  };

  return (
    <>
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.userInfo}
          onPress={handleUserPress}
          activeOpacity={0.7}
        >
          <Image 
            source={{ uri: post.user.avatar || DEFAULT_IMAGES.avatar }} 
            style={styles.avatar}
            onError={() => {
              // Silently handle error - defaultSource will show
            }}
            defaultSource={{ uri: DEFAULT_IMAGES.avatar }}
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
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <Text style={styles.timestamp}>{formatTimeAgo(post.created_at)}</Text>
          <MenuButton 
            onPress={handleMenuPress}
            size={20}
            color="#666"
          />
        </View>
      </View>

      {/* Content Type Badge */}
      {(post as any).content_type === 'external' && (
        <View style={styles.contentTypeBadge}>
          <Ionicons name="link" size={12} color="#666" />
          <Text style={styles.contentTypeText}>External Content</Text>
        </View>
      )}
      
      {/* Post Type Badge for Simple Posts */}
      {(post as any).post_type === 'simple' && !post.restaurant && (
        <View style={styles.simplePostBadge}>
          <Ionicons name="chatbubble-ellipses-outline" size={14} color={designTokens.colors.textMedium} />
          <Text style={styles.simplePostText}>Discussion</Text>
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
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                setImageViewerIndex(0);
                setShowImageViewer(true);
              }}
            >
              <Image 
                source={{ 
                  uri: imageErrors.has(post.photos[0]) 
                    ? DEFAULT_IMAGES.restaurant 
                    : post.photos[0] 
                }} 
                style={styles.singlePhoto}
                onError={() => {
                  setImageErrors(prev => new Set(prev).add(post.photos[0]));
                }}
              />
            </TouchableOpacity>
          ) : (
            <View style={styles.photoGrid}>
              {post.photos.slice(0, 4).map((photo, index) => (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.9}
                  onPress={() => {
                    setImageViewerIndex(index);
                    setShowImageViewer(true);
                  }}
                >
                  <Image 
                    source={{ 
                      uri: imageErrors.has(photo) 
                        ? DEFAULT_IMAGES.restaurant 
                        : photo 
                    }} 
                    style={styles.gridPhoto}
                    onError={() => {
                      setImageErrors(prev => new Set(prev).add(photo));
                    }}
                  />
                </TouchableOpacity>
              ))}
              {post.photos.length > 4 && (
                <TouchableOpacity
                  style={styles.photoOverlay}
                  activeOpacity={0.9}
                  onPress={() => {
                    setImageViewerIndex(3);
                    setShowImageViewer(true);
                  }}
                >
                  <Text style={styles.photoCount}>+{post.photos.length - 4}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}

      {/* Videos - Only show for original content */}
      {(post as any).content_type !== 'external' && (post as any).videos && (post as any).videos.length > 0 && (
        <View style={styles.photoContainer}>
          {(post as any).videos.length === 1 ? (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                setVideoViewerIndex(0);
                setShowVideoViewer(true);
              }}
              style={styles.videoThumbnail}
            >
              <View style={styles.videoThumbnailOverlay}>
                <Ionicons name="play-circle" size={64} color="#FFFFFF" />
              </View>
              <VideoThumbnail
                videoUri={(post as any).videos[0]}
                style={styles.singlePhoto}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {(post as any).videos.map((video: string, index: number) => (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.9}
                  onPress={() => {
                    setVideoViewerIndex(index);
                    setShowVideoViewer(true);
                  }}
                  style={[styles.videoThumbnail, { marginRight: 8 }]}
                >
                  <View style={styles.videoThumbnailOverlay}>
                    <Ionicons name="play-circle" size={48} color="#FFFFFF" />
                  </View>
                  <VideoThumbnail
                    videoUri={video}
                    style={styles.gridPhoto}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* Restaurant Info - Only show if restaurant exists */}
      {post.restaurant && post.restaurant.id && (
        <TouchableOpacity 
          style={styles.restaurantInfo}
          onPress={handleRestaurantPress}
          activeOpacity={0.7}
        >
          <Image 
            source={{ 
              uri: imageErrors.has(post.restaurant.image || '') 
                ? DEFAULT_IMAGES.restaurant 
                : (post.restaurant.image || DEFAULT_IMAGES.restaurant) 
            }} 
            style={styles.restaurantImage}
            onError={() => {
              if (post.restaurant.image) {
                setImageErrors(prev => new Set(prev).add(post.restaurant.image));
              }
            }}
          />
          <View style={styles.restaurantDetails}>
            <Text style={styles.restaurantName} numberOfLines={1}>
              {post.restaurant.name}
            </Text>
            <Text style={styles.restaurantLocation} numberOfLines={1}>
              {post.restaurant.location}
            </Text>
            <View style={styles.restaurantMeta}>
              {getTrafficLightRating(post.rating)}
              {post.restaurant.priceRange && (
                <Text style={styles.priceRange}>{post.restaurant.priceRange}</Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      )}

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
                size={compactDesign.icon.small}
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
        <View 
          style={styles.actions}
          onStartShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
        >
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={handleLike}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={compactDesign.icon.medium}
              color={isLiked ? '#FF4444' : designTokens.colors.textMedium}
            />
            <Text style={styles.actionCount}>{likesCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={handleComment}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-outline" size={compactDesign.icon.medium} color={designTokens.colors.textMedium} />
            <Text style={styles.actionCount}>{commentsCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <Ionicons name="share-outline" size={compactDesign.icon.medium} color={designTokens.colors.textMedium} />
            <Text style={styles.actionCount}>{shareCount}</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
    
    {showReportModal && (
      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        contentType="post"
        contentId={post.id}
        onSuccess={() => setShowReportModal(false)}
      />
    )}
    
      {showImageViewer && post.photos && post.photos.length > 0 && (
        <ImageViewer
          visible={showImageViewer}
          images={post.photos}
          initialIndex={imageViewerIndex}
          onClose={() => setShowImageViewer(false)}
        />
      )}

      {showVideoViewer && (post as any).videos && (post as any).videos.length > 0 && (
        <VideoViewer
          visible={showVideoViewer}
          videos={(post as any).videos}
          initialIndex={videoViewerIndex}
          onClose={() => setShowVideoViewer(false)}
        />
      )}
  </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: designTokens.colors.white,
    borderRadius: compactDesign.card.borderRadius,
    padding: compactDesign.card.padding,
    marginBottom: compactDesign.content.gap,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: compactDesign.card.gap,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 32, // Reduced from 40
    height: 32,
    borderRadius: 16,
    marginRight: compactDesign.card.gap,
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuButton: {
    padding: 4,
  },
  caption: {
    ...designTokens.typography.bodyRegular,
    color: designTokens.colors.textDark,
    marginBottom: compactDesign.card.gap,
    lineHeight: 18,
  },
  photoContainer: {
    marginBottom: compactDesign.card.gap,
  },
  singlePhoto: {
    width: '100%',
    height: 160, // Reduced from 200
    borderRadius: designTokens.borderRadius.sm,
    backgroundColor: designTokens.colors.backgroundLight,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  gridPhoto: {
    width: (CARD_WIDTH - (compactDesign.card.padding * 2)) / 2 - 1,
    height: 100, // Reduced from 120
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
    marginBottom: compactDesign.card.gap,
    padding: compactDesign.card.gap,
    backgroundColor: designTokens.colors.backgroundGray,
    borderRadius: designTokens.borderRadius.sm,
  },
  restaurantImage: {
    width: 40, // Reduced from 50
    height: 40,
    borderRadius: designTokens.borderRadius.sm,
    marginRight: compactDesign.card.gap,
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
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
  },
  priceInfo: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
  },
  ratingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 10,
    color: designTokens.colors.textDark,
    fontFamily: 'Inter_600SemiBold',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
  },
  tag: {
    backgroundColor: designTokens.colors.backgroundGray,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: designTokens.borderRadius.full,
  },
  tagText: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textDark,
  },
  moreTags: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: designTokens.colors.borderLight,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
  },
  actionCount: {
    fontSize: 11,
    color: designTokens.colors.textMedium,
    fontFamily: 'Inter_500Medium',
  },
  contentTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: designTokens.colors.backgroundLight,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: designTokens.borderRadius.full,
    marginBottom: 4,
  },
  simplePostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F8FF',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: designTokens.borderRadius.full,
    marginBottom: 8,
  },
  simplePostText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.textMedium,
  },
  contentTypeText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: '#666',
  },
  trafficLight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trafficDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.textMedium,
  },
  videoThumbnail: {
    position: 'relative',
  },
  videoThumbnailOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    borderRadius: designTokens.borderRadius.sm,
  },
}); 