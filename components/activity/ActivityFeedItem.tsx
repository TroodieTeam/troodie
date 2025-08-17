import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import {
  Heart,
  MessageCircle,
  UserPlus,
  Bookmark,
  Users,
  MapPin,
  Circle,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { ActivityFeedItem } from '@/services/activityFeedService';
import { designTokens } from '@/constants/designTokens';
import { DEFAULT_IMAGES } from '@/constants/images';
import { getAvatarUrlWithFallback } from '@/utils/avatarUtils';

interface ActivityFeedItemProps {
  activity: ActivityFeedItem;
  onUserPress?: (userId: string) => void;
  onRestaurantPress?: (restaurantId: string) => void;
  onCommunityPress?: (communityId: string) => void;
  onPostPress?: (postId: string) => void;
  formatTimeAgo: (date: string) => string;
  testID?: string;
}

export const ActivityFeedItemComponent: React.FC<ActivityFeedItemProps> = ({
  activity,
  onUserPress,
  onRestaurantPress,
  onCommunityPress,
  onPostPress,
  formatTimeAgo,
  testID,
}) => {
  const router = useRouter();

  const getActivityIcon = () => {
    switch (activity.activity_type) {
      case 'post':
        return <Circle size={14} color={designTokens.colors.primaryOrange} fill={designTokens.colors.primaryOrange} />;
      case 'save':
        return <Bookmark size={14} color="#10B981" />;
      case 'follow':
        return <UserPlus size={14} color="#3B82F6" />;
      case 'community_join':
        return <Users size={14} color="#8B5CF6" />;
      case 'like':
        return <Heart size={14} color="#EF4444" />;
      case 'comment':
        return <MessageCircle size={14} color="#6B7280" />;
      default:
        return null;
    }
  };

  const getTrafficLightColor = (rating: number | null) => {
    if (!rating || rating === 0) return '#DDD';
    
    // Handle both 3-point traffic light system and 5-point star system
    if (rating <= 3) {
      // Traffic light system: 1=Red, 2=Yellow, 3=Green
      const trafficColors = {
        1: '#FF4444', // Red - Poor
        2: '#FFAA44', // Yellow - Average 
        3: '#00AA00', // Green - Excellent
      };
      return trafficColors[rating as keyof typeof trafficColors] || '#DDD';
    } else {
      // 5-star system: 1-5 stars
      const starColors = {
        1: '#FF4444', // Red
        2: '#FF7744', // Orange-Red
        3: '#FFAA44', // Orange
        4: '#44AA44', // Light Green
        5: '#00AA00', // Green
      };
      return starColors[rating as keyof typeof starColors] || '#DDD';
    }
  };
  
  const getTrafficLightLabel = (rating: number | null) => {
    if (!rating || rating === 0) return 'No rating';
    
    // Handle both 3-point traffic light system and 5-point star system
    if (rating <= 3) {
      // Traffic light system: 1=Red, 2=Yellow, 3=Green
      const trafficLabels = {
        1: 'Poor',
        2: 'Average',
        3: 'Excellent'
      };
      return trafficLabels[rating as keyof typeof trafficLabels] || 'No rating';
    } else {
      // 5-star system: 1-5 stars
      const starLabels = {
        1: 'Poor',
        2: 'Fair', 
        3: 'Good',
        4: 'Great',
        5: 'Excellent'
      };
      return starLabels[rating as keyof typeof starLabels] || 'No rating';
    }
  };

  const handleActorPress = () => {
    if (onUserPress) {
      onUserPress(activity.actor_id);
    } else {
      router.push(`/user/${activity.actor_id}`);
    }
  };

  const handleTargetPress = () => {
    switch (activity.target_type) {
      case 'restaurant':
        if (activity.restaurant_id) {
          if (onRestaurantPress) {
            onRestaurantPress(activity.restaurant_id);
          } else {
            router.push(`/restaurant/${activity.restaurant_id}`);
          }
        }
        break;
      case 'user':
        if (activity.related_user_id) {
          if (onUserPress) {
            onUserPress(activity.related_user_id);
          } else {
            router.push(`/user/${activity.related_user_id}`);
          }
        }
        break;
      case 'community':
        if (activity.community_id) {
          if (onCommunityPress) {
            onCommunityPress(activity.community_id);
          } else {
            router.push({
              pathname: '/add/community-detail',
              params: { communityId: activity.community_id }
            });
          }
        }
        break;
      case 'post':
        if (activity.target_id) {
          if (onPostPress) {
            onPostPress(activity.target_id);
          } else {
            // Navigate to post detail or restaurant with post highlighted
            if (activity.restaurant_id) {
              router.push(`/restaurant/${activity.restaurant_id}?postId=${activity.target_id}`);
            }
          }
        }
        break;
    }
  };

  const renderActivityContent = () => {
    return (
      <View style={styles.activityContent}>
        <Text style={styles.activityText} numberOfLines={2}>
          <Text style={styles.boldText} onPress={handleActorPress}>
            {activity.actor_name || activity.actor_username || 'Someone'}
          </Text>
          {' '}{activity.action}
          {/* For follow activities, prioritize showing the target user */}
          {activity.activity_type === 'follow' && (
            <>
              {' '}
              <Text style={styles.boldText} onPress={handleTargetPress}>
                {activity.target_name || activity.related_user_name || activity.related_user_username || 'a user'}
              </Text>
            </>
          )}
          {/* For other activities, show target_name if available */}
          {activity.activity_type !== 'follow' && activity.target_name && (
            <>
              {' '}
              <Text style={styles.boldText} onPress={handleTargetPress}>
                {activity.target_name}
              </Text>
            </>
          )}
          {activity.related_user_name && activity.activity_type === 'like' && (
            <>
              {' by '}
              <Text style={styles.boldText}>
                {activity.related_user_name}
              </Text>
            </>
          )}
        </Text>

        {/* Show content preview for posts and comments */}
        {activity.content && activity.activity_type !== 'community_join' && (
          <Text style={styles.contentPreview} numberOfLines={2}>
            {activity.activity_type === 'comment' ? `"${activity.content}"` : activity.content}
          </Text>
        )}

        {/* Show rating with traffic light system */}
        {activity.rating && (
          <View style={styles.trafficLightContainer}>
            <View 
              style={[
                styles.trafficLightIndicator,
                { backgroundColor: getTrafficLightColor(activity.rating) }
              ]} 
            />
            <Text style={styles.ratingText}>
              {getTrafficLightLabel(activity.rating)}
            </Text>
          </View>
        )}

        {/* Show location for restaurants and communities */}
        {activity.restaurant_location && activity.activity_type !== 'community_join' && (
          <View style={styles.locationContainer}>
            <MapPin size={12} color="#9CA3AF" />
            <Text style={styles.locationText}>{activity.restaurant_location}</Text>
          </View>
        )}

        <Text style={styles.timeText}>{formatTimeAgo(activity.created_at)}</Text>
      </View>
    );
  };

  const renderMediaContent = () => {
    // For follow activities, show follow back button
    if (activity.activity_type === 'follow') {
      return (
        <TouchableOpacity style={styles.followButton}>
          <Text style={styles.followButtonText}>Follow</Text>
        </TouchableOpacity>
      );
    }

    // Show photos if available
    if (activity.photos && activity.photos.length > 0) {
      const photoUrl = activity.photos[0];
      return (
        <TouchableOpacity onPress={handleTargetPress}>
          <Image
            source={{ uri: photoUrl || DEFAULT_IMAGES.restaurant }}
            style={styles.thumbnail}
          />
        </TouchableOpacity>
      );
    }

    // Show related user avatar for certain activities
    if (activity.related_user_avatar && activity.activity_type === 'follow') {
      return (
        <TouchableOpacity onPress={() => activity.related_user_id && onUserPress?.(activity.related_user_id)}>
          <Image
            source={{ uri: getAvatarUrlWithFallback(activity.related_user_avatar, activity.related_user_name) }}
            style={styles.relatedUserAvatar}
          />
        </TouchableOpacity>
      );
    }

    return null;
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handleTargetPress} testID={testID}>
      <View style={styles.leftSection}>
        <TouchableOpacity onPress={handleActorPress}>
          <Image
            source={{ uri: getAvatarUrlWithFallback(activity.actor_avatar, activity.actor_name) }}
            style={styles.avatar}
          />
        </TouchableOpacity>
        <View style={styles.activityIndicator}>
          {getActivityIcon()}
        </View>
      </View>

      {renderActivityContent()}
      {renderMediaContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  leftSection: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  activityIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activityContent: {
    flex: 1,
    marginRight: 12,
  },
  activityText: {
    fontSize: 14,
    lineHeight: 20,
    color: designTokens.colors.text,
  },
  boldText: {
    fontWeight: '600',
    color: designTokens.colors.textDark,
  },
  contentPreview: {
    fontSize: 13,
    lineHeight: 18,
    color: designTokens.colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  trafficLightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  trafficLightIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '500',
    color: designTokens.colors.textSecondary,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: designTokens.colors.textSecondary,
  },
  timeText: {
    fontSize: 12,
    color: designTokens.colors.textLight,
    marginTop: 4,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  relatedUserAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  followButton: {
    backgroundColor: designTokens.colors.primaryOrange,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  followButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});