import { DEFAULT_IMAGES } from '@/constants/images';
import { theme } from '@/constants/theme';
import { PostWithUser } from '@/types/post';
import { Bookmark, Calendar, Heart, MapPin, MessageCircle } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

interface ProfilePostCardProps {
  post: PostWithUser;
  onPress?: () => void;
  onEdit?: () => void;
}

export function ProfilePostCard({ post, onPress }: ProfilePostCardProps) {
  const [imageError, setImageError] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);


  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

  const mainPhoto = post.photos?.[0];
  const hasPhotos = post.photos && post.photos.length > 0;

  // Create cache-busting URL for retry attempts
  const getImageUrl = (url: string, attempt: number = 0) => {
    if (attempt === 0) return url;
    return `${url}?t=${Date.now()}&retry=${attempt}`;
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.content}>
        {/* Header with date and rating */}
        <View style={styles.header}>
          <View style={styles.dateContainer}>
            <Calendar size={12} color={theme.colors.text.tertiary} />
            <Text style={styles.date}>{formatDate(post.created_at)}</Text>
          </View>
          {getTrafficLightRating(post.rating)}
        </View>

        {/* Restaurant Info */}
        <View style={styles.restaurantSection}>
          <Image 
            source={{ uri: post.restaurant?.image || DEFAULT_IMAGES.restaurant }} 
            style={styles.restaurantImage}
            resizeMode="cover"
          />
          <View style={styles.restaurantInfo}>
            <Text style={styles.restaurantName} numberOfLines={1}>
              {post.restaurant?.name || 'Restaurant'}
            </Text>
            {post.restaurant?.location && (
              <View style={styles.locationRow}>
                <MapPin size={10} color={theme.colors.text.tertiary} />
                <Text style={styles.location} numberOfLines={1}>{post.restaurant.location}</Text>
              </View>
            )}
            {post.restaurant?.cuisine && (
              <Text style={styles.cuisine} numberOfLines={1}>{post.restaurant.cuisine}</Text>
            )}
          </View>
        </View>

        {/* Post Details */}
        {(post.visit_type || post.price_range) && (
          <View style={styles.postDetails}>
            {post.visit_type && (
              <View style={styles.detailBadge}>
                <Text style={styles.detailText}>
                  {post.visit_type === 'dine_in' ? 'Dine In' : 
                   post.visit_type === 'takeout' ? 'Takeout' : 'Delivery'}
                </Text>
              </View>
            )}
            {post.price_range && (
              <View style={styles.detailBadge}>
                <Text style={styles.detailText}>{post.price_range}</Text>
              </View>
            )}
          </View>
        )}

        {/* Caption */}
        {post.caption && (
          <Text style={styles.caption} numberOfLines={2}>
            {post.caption}
          </Text>
        )}

        {/* Photo */}
        {hasPhotos && mainPhoto && !imageError && (
          <View style={styles.photoContainer}>
            <Image 
              source={{ uri: getImageUrl(mainPhoto, retryAttempt) }} 
              style={styles.photo}
              resizeMode="cover"
              onError={(e) => {
                console.error(`❌ ProfilePostCard image failed (attempt ${retryAttempt + 1}):`, {
                  uri: getImageUrl(mainPhoto, retryAttempt),
                  originalUri: mainPhoto,
                  error: e.nativeEvent.error,
                  retryAttempt
                });
                
                if (retryAttempt < 2) {
                  // Try again with cache-busting
                  setRetryAttempt(prev => prev + 1);
                } else {
                  // Give up after 3 attempts
                  setImageError(true);
                  
                  console.log('Final image failure details:', {
                    isSupabaseStorage: mainPhoto.includes('supabase.co/storage'),
                    hasPublicFolder: mainPhoto.includes('/public/'),
                    bucket: mainPhoto.split('/').find(part => part === 'post-photos'),
                    path: mainPhoto.split('/public/')[1] || 'no-public-path',
                    fullUrl: mainPhoto
                  });
                  
                  // Test if we can fetch the URL directly with full headers
                  fetch(mainPhoto, { method: 'HEAD' })
                    .then(response => {
                      console.log('Direct fetch HEAD response:', {
                        status: response.status,
                        statusText: response.statusText,
                        contentType: response.headers.get('content-type'),
                        contentLength: response.headers.get('content-length'),
                        cacheControl: response.headers.get('cache-control'),
                        etag: response.headers.get('etag')
                      });
                    })
                    .catch(err => {
                        console.error('Direct fetch HEAD failed:', err);
                    });
                }
              }}
              onLoad={() => {
                setImageError(false);
                setRetryAttempt(0);
              }}
              onLoadStart={() => {
              }}
              onLoadEnd={() => {
              }}
            />
          </View>
        )}
        
        {/* Fallback for failed images */}
        {hasPhotos && mainPhoto && imageError && (
          <View style={[styles.photoContainer, styles.errorContainer]}>
            <View style={styles.errorContent}>
              <Text style={styles.errorText}>📷</Text>
              <Text style={styles.errorSubtext}>Image failed to load</Text>
            </View>
          </View>
        )}

        {/* Footer with stats */}
        <View style={styles.footer}>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Heart size={14} color={post.is_liked_by_user ? '#FF4444' : theme.colors.text.tertiary} fill={post.is_liked_by_user ? '#FF4444' : 'transparent'} />
              <Text style={styles.statText}>{post.likes_count || 0}</Text>
            </View>
            <View style={styles.stat}>
              <MessageCircle size={14} color={theme.colors.text.tertiary} />
              <Text style={styles.statText}>{post.comments_count || 0}</Text>
            </View>
            <View style={styles.stat}>
              <Bookmark size={14} color={post.is_saved_by_user ? theme.colors.primary : theme.colors.text.tertiary} fill={post.is_saved_by_user ? theme.colors.primary : 'transparent'} />
              <Text style={styles.statText}>{post.saves_count || 0}</Text>
            </View>
          </View>
          {hasPhotos && post.photos!.length > 1 && (
            <Text style={styles.morePhotos}>+{post.photos!.length - 1} photos</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  content: {
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  date: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.tertiary,
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
    color: theme.colors.text.secondary,
  },
  restaurantSection: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 12,
  },
  restaurantImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: theme.colors.backgroundGray,
  },
  restaurantInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  restaurantName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  location: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.tertiary,
  },
  cuisine: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: theme.colors.primary,
    marginTop: 2,
  },
  postDetails: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  detailBadge: {
    backgroundColor: theme.colors.backgroundGray,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  detailText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: theme.colors.text.secondary,
  },
  caption: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.secondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  photoContainer: {
    width: '100%',
    height: 120,
    borderRadius: 6,
    backgroundColor: theme.colors.backgroundGray,
    marginBottom: 6,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: theme.colors.text.tertiary,
  },
  morePhotos: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    color: theme.colors.text.tertiary,
  },
  errorContainer: {
    backgroundColor: theme.colors.backgroundGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContent: {
    alignItems: 'center',
    opacity: 0.5,
  },
  errorText: {
    fontSize: 24,
    marginBottom: 4,
  },
  errorSubtext: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: theme.colors.text.tertiary,
  },
});