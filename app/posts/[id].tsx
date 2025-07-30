import { ErrorState } from '@/components/ErrorState';
import { ExternalContentPreview } from '@/components/posts/ExternalContentPreview';
import { designTokens } from '@/constants/designTokens';
import { useAuth } from '@/contexts/AuthContext';
import { postEngagementService } from '@/services/postEngagementService';
import { postService } from '@/services/postService';
import { getErrorType } from '@/types/errors';
import { PostWithUser } from '@/types/post';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Bookmark, Heart, MessageCircle, Share } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [post, setPost] = useState<PostWithUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [savesCount, setSavesCount] = useState(0);

  useEffect(() => {
    if (id) {
      loadPost();
    }
  }, [id]);

  useEffect(() => {
    if (post) {
      setIsLiked(post.is_liked_by_user || false);
      setIsSaved(post.is_saved_by_user || false);
      setLikesCount(post.likes_count);
      setSavesCount(post.saves_count);
    }
  }, [post]);

  const loadPost = async () => {
    try {
      setLoading(true);
      setError(null);
      const postData = await postService.getPost(id);
      console.log('Post data loaded:', {
        id: postData?.id,
        photos: postData?.photos,
        photosLength: postData?.photos?.length,
        contentType: (postData as any)?.content_type,
      });
      setPost(postData);
    } catch (err: any) {
      console.error('Error loading post:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleLike = async () => {
    if (!user?.id || !post) return;

    try {
      const newLikedState = await postEngagementService.togglePostLike(post.id, user.id);
      setIsLiked(newLikedState);
      setLikesCount(prev => newLikedState ? prev + 1 : prev - 1);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleSave = async () => {
    if (!user?.id || !post) return;

    try {
      const newSavedState = await postEngagementService.togglePostSave(post.id, user.id);
      setIsSaved(newSavedState);
      setSavesCount(prev => newSavedState ? prev + 1 : prev - 1);
    } catch (error) {
      console.error('Error toggling save:', error);
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

  const getTrafficLightColor = (rating: number | null) => {
    if (!rating) return '#DDD';
    const colors = {
      1: '#FF4444', 2: '#FF7744', 3: '#FFAA44', 4: '#44AA44', 5: '#00AA00'
    };
    return colors[rating as keyof typeof colors] || '#DDD';
  };

  const getTrafficLightLabel = (rating: number | null) => {
    if (!rating) return 'No rating';
    const labels = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Great', 5: 'Excellent' };
    return labels[rating as keyof typeof labels] || 'No rating';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
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
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <TouchableOpacity onPress={handleBack} style={styles.backButtonFixed}>
          <ArrowLeft size={24} color={designTokens.colors.textDark} />
        </TouchableOpacity>
        <ErrorState
          error={error || new Error('Post not found')}
          errorType={getErrorType(error || new Error('Post not found'))}
          onRetry={loadPost}
          retrying={false}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Floating Back Button */}
      <TouchableOpacity onPress={handleBack} style={styles.backButtonFixed}>
        <ArrowLeft size={24} color={designTokens.colors.textDark} />
      </TouchableOpacity>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Header */}
        <View style={styles.userHeader}>
          <Image 
            source={{ uri: post.user.avatar || 'https://i.pravatar.cc/150?img=1' }} 
            style={styles.avatar} 
          />
          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.userName}>{post.user.name || post.user.username}</Text>
              {post.user.verified && (
                <Ionicons name="checkmark-circle" size={16} color={designTokens.colors.primaryOrange} />
              )}
            </View>
            <Text style={styles.userPersona}>{post.user.persona || 'Food Explorer'}</Text>
            <Text style={styles.timestamp}>{formatTimeAgo(post.created_at)}</Text>
          </View>
        </View>

        {/* External Content Badge */}
        {(post as any).content_type === 'external' && (
          <View style={styles.externalBadge}>
            <Ionicons name="link" size={14} color="#666" />
            <Text style={styles.externalText}>External Content</Text>
          </View>
        )}

        {/* Caption */}
        {post.caption && (
          <Text style={styles.caption}>{post.caption}</Text>
        )}

        {/* External Content */}
        {(post as any).content_type === 'external' && (post as any).external_url && (
          <View style={styles.externalContent}>
            <ExternalContentPreview
              source={(post as any).external_source}
              url={(post as any).external_url}
              title={(post as any).external_title}
              description={(post as any).external_description}
              thumbnail={(post as any).external_thumbnail}
              author={(post as any).external_author}
            />
          </View>
        )}

        {/* Photos */}
        {(post as any).content_type !== 'external' && post.photos && post.photos.length > 0 && (
          <View style={styles.photosContainer}>
            {post.photos.length === 1 ? (
              <Image 
                source={{ uri: post.photos[0] }} 
                style={styles.singlePhoto}
                resizeMode="cover"
                onError={(e) => console.error('Image load error:', e.nativeEvent.error)}
              />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
                {post.photos.map((photo, index) => (
                  <Image 
                    key={index} 
                    source={{ uri: photo }} 
                    style={styles.multiPhoto}
                    resizeMode="cover"
                    onError={(e) => console.error(`Image ${index} load error:`, e.nativeEvent.error)}
                  />
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Restaurant Card */}
        <View style={styles.restaurantCard}>
          <Image source={{ uri: post.restaurant.image }} style={styles.restaurantImage} />
          <View style={styles.restaurantInfo}>
            <Text style={styles.restaurantName}>{post.restaurant.name}</Text>
            <Text style={styles.restaurantLocation}>{post.restaurant.location}</Text>
            <View style={styles.restaurantMeta}>
              <Text style={styles.restaurantCuisine}>{post.restaurant.cuisine}</Text>
              <Text style={styles.priceRange}>{post.restaurant.priceRange}</Text>
            </View>
          </View>
        </View>

        {/* Rating & Visit Info */}
        <View style={styles.visitCard}>
          {post.rating && (
            <View style={styles.ratingSection}>
              <View style={styles.trafficLight}>
                <View style={[styles.trafficDot, { backgroundColor: getTrafficLightColor(post.rating) }]} />
                <Text style={styles.ratingLabel}>{getTrafficLightLabel(post.rating)}</Text>
              </View>
            </View>
          )}
          
          <View style={styles.visitDetails}>
            {post.visit_type && (
              <View style={styles.visitBadge}>
                <Ionicons name="restaurant" size={14} color="#666" />
                <Text style={styles.visitText}>
                  {post.visit_type === 'dine_in' ? 'Dine In' : 
                   post.visit_type === 'takeout' ? 'Takeout' : 'Delivery'}
                </Text>
              </View>
            )}
            {post.price_range && (
              <View style={styles.visitBadge}>
                <Ionicons name="cash" size={14} color="#666" />
                <Text style={styles.visitText}>{post.price_range}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity onPress={handleLike} style={styles.actionButton}>
            <Heart 
              size={24} 
              color={isLiked ? '#FF4444' : '#666'} 
              fill={isLiked ? '#FF4444' : 'transparent'}
            />
            <Text style={styles.actionCount}>{likesCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <MessageCircle size={24} color="#666" />
            <Text style={styles.actionCount}>{post.comments_count}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSave} style={styles.actionButton}>
            <Bookmark 
              size={24} 
              color={isSaved ? designTokens.colors.primaryOrange : '#666'} 
              fill={isSaved ? designTokens.colors.primaryOrange : 'transparent'}
            />
            <Text style={styles.actionCount}>{savesCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Share size={24} color="#666" />
            <Text style={styles.actionCount}>{post.shares_count || 0}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  backButtonFixed: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: designTokens.colors.textMedium,
    marginTop: 12,
    fontFamily: 'Inter_400Regular',
  },
  userHeader: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 16,
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: designTokens.colors.textDark,
    fontFamily: 'Inter_600SemiBold',
  },
  userPersona: {
    fontSize: 14,
    color: designTokens.colors.textMedium,
    marginTop: 2,
    fontFamily: 'Inter_400Regular',
  },
  timestamp: {
    fontSize: 12,
    color: designTokens.colors.textMedium,
    marginTop: 4,
    fontFamily: 'Inter_400Regular',
  },
  externalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    alignSelf: 'flex-start',
    gap: 6,
  },
  externalText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Inter_500Medium',
  },
  caption: {
    fontSize: 16,
    lineHeight: 24,
    color: designTokens.colors.textDark,
    paddingHorizontal: 20,
    marginBottom: 20,
    fontFamily: 'Inter_400Regular',
  },
  externalContent: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  photosContainer: {
    marginBottom: 20,
  },
  singlePhoto: {
    width: SCREEN_WIDTH,
    height: 300,
    resizeMode: 'cover',
  },
  photoScroll: {
    paddingLeft: 20,
  },
  multiPhoto: {
    width: 250,
    height: 300,
    borderRadius: 12,
    marginRight: 12,
    resizeMode: 'cover',
  },
  restaurantCard: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  restaurantImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: '600',
    color: designTokens.colors.textDark,
    marginBottom: 4,
    fontFamily: 'Inter_600SemiBold',
  },
  restaurantLocation: {
    fontSize: 14,
    color: designTokens.colors.textMedium,
    marginBottom: 6,
    fontFamily: 'Inter_400Regular',
  },
  restaurantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  restaurantCuisine: {
    fontSize: 12,
    color: designTokens.colors.primaryOrange,
    fontFamily: 'Inter_500Medium',
  },
  priceRange: {
    fontSize: 12,
    color: designTokens.colors.textMedium,
    fontFamily: 'Inter_500Medium',
  },
  visitCard: {
    backgroundColor: '#F8F9FA',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  ratingSection: {
    marginBottom: 12,
  },
  trafficLight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trafficDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.colors.textDark,
    fontFamily: 'Inter_600SemiBold',
  },
  visitDetails: {
    flexDirection: 'row',
    gap: 12,
  },
  visitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  visitText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Inter_500Medium',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FAFAFA',
  },
  actionButton: {
    alignItems: 'center',
    gap: 6,
  },
  actionCount: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Inter_500Medium',
  },
  bottomSpacer: {
    height: 40,
  },
}); 