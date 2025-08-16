import { BoardSelectionModal } from '@/components/BoardSelectionModal';
import { ErrorState } from '@/components/ErrorState';
import { designTokens } from '@/constants/designTokens';
import { useAuth } from '@/contexts/AuthContext';
import { restaurantImageSyncService } from '@/services/restaurantImageSyncService';
import { restaurantPhotosService } from '@/services/restaurantPhotosService';
import { restaurantService } from '@/services/restaurantService';
import { saveService } from '@/services/saveService';
import { FriendVisit, PowerUserReview, RecentActivity, socialActivityService } from '@/services/socialActivityService';
import { ToastService } from '@/services/toastService';
import { getErrorType } from '@/types/errors';
import { BackgroundTaskManager } from '@/utils/backgroundTasks';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    ArrowLeft,
    Award,
    Bookmark,
    Camera,
    CheckCircle,
    Clock,
    ExternalLink,
    Eye,
    Globe,
    MapPin,
    MessageCircle,
    Phone,
    Share,
    Star,
    TrendingUp,
    Users
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

type TabType = 'social' | 'info' | 'photos';

export default function RestaurantDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [showBoardModal, setShowBoardModal] = useState(false);
  const [socialStats] = useState({
    weeklyVisits: Math.floor(Math.random() * 200) + 50,
    totalVisits: Math.floor(Math.random() * 2000) + 500
  });
  
  // Social data states
  const [friendsWhoVisited, setFriendsWhoVisited] = useState<FriendVisit[]>([]);
  const [powerUsersAndCritics, setPowerUsersAndCritics] = useState<PowerUserReview[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [socialDataLoading, setSocialDataLoading] = useState(false);
  const [socialDataError, setSocialDataError] = useState<Error | null>(null);
  
  // Photo gallery states
  const [restaurantPhotos, setRestaurantPhotos] = useState<any[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [updatingCover, setUpdatingCover] = useState(false);

  useEffect(() => {
    if (id) {
      loadRestaurant(id as string);
    }
  }, [id]);

  useEffect(() => {
    if (id && user) {
      checkSaveStatus(id as string);
    }
  }, [id, user]);

  useEffect(() => {
    if (id && activeTab === 'social' && user) {
      loadSocialData(id as string);
    }
  }, [id, activeTab, user]);

  useEffect(() => {
    if (id && activeTab === 'photos') {
      loadPhotos(id as string);
    }
  }, [id, activeTab]);

  const loadRestaurant = async (restaurantId: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await restaurantService.getRestaurantDetails(restaurantId);
      if (data) {
        setRestaurant(data);
        
        // If no cover photo, check if we can update it from existing photos
        if (!data.cover_photo_url) {
          const photos = await restaurantPhotosService.getRestaurantPhotos(restaurantId, user?.id);
          if (photos.length > 0) {
            // The background task will handle the actual update
            const backgroundTaskManager = BackgroundTaskManager.getInstance();
            backgroundTaskManager.updateRestaurantCover(restaurantId, true);
          }
        }
      } else {
        // Restaurant not found
        setError(new Error('Restaurant not found'));
      }
    } catch (err: any) {
      console.error('Error loading restaurant:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const onRetry = async () => {
    if (id) {
      setRetrying(true);
      await loadRestaurant(id as string);
      setRetrying(false);
    }
  };

  const loadSocialData = async (restaurantId: string) => {
    if (!user) return;
    
    try {
      setSocialDataLoading(true);
      setSocialDataError(null);

      // Load all social data in parallel
      const [friends, powerUsers, activity] = await Promise.all([
        socialActivityService.getFriendsWhoVisited(restaurantId, user.id),
        socialActivityService.getPowerUsersAndCritics(restaurantId),
        socialActivityService.getRecentActivity(restaurantId),
      ]);

      setFriendsWhoVisited(friends);
      setPowerUsersAndCritics(powerUsers);
      setRecentActivity(activity);

      // Subscribe to real-time updates
      const unsubscribe = socialActivityService.subscribeToRecentActivity(
        restaurantId,
        (newActivity) => {
          setRecentActivity(prev => [newActivity, ...prev].slice(0, 10));
        }
      );

      // Cleanup subscription on unmount
      return () => {
        unsubscribe();
      };
    } catch (err: any) {
      console.error('Error loading social data:', err);
      setSocialDataError(err);
    } finally {
      setSocialDataLoading(false);
    }
  };

  const loadPhotos = async (restaurantId: string) => {
    try {
      setPhotosLoading(true);
      
      // First, sync any posts that might not have been properly synced
      const syncedCount = await restaurantImageSyncService.syncAllRestaurantPosts(restaurantId);
      if (syncedCount > 0) {
      }
      
      // Then load the photos
      const photos = await restaurantPhotosService.getCachedRestaurantPhotos(restaurantId, user?.id);
      setRestaurantPhotos(photos);
      
      // Subscribe to real-time updates
      const unsubscribe = restaurantPhotosService.subscribeToPhotoUpdates(
        restaurantId,
        (newPhoto) => {
          setRestaurantPhotos(prev => [newPhoto, ...prev]);
        },
        (deletedPhotoId) => {
          setRestaurantPhotos(prev => prev.filter(p => p.id !== deletedPhotoId));
        }
      );
      
      return () => {
        unsubscribe();
      };
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setPhotosLoading(false);
    }
  };

  const handleCall = () => {
    if (restaurant?.phone) {
      Linking.openURL(`tel:${restaurant.phone}`);
    }
  };

  const handleDirections = () => {
    if (restaurant?.address) {
      const encodedAddress = encodeURIComponent(restaurant.address);
      Linking.openURL(`maps://app?address=${encodedAddress}`);
    }
  };

  const handleWebsite = () => {
    if (restaurant?.website) {
      Linking.openURL(restaurant.website);
    }
  };

  const handleReserve = () => {
    // TODO: Implement reservation functionality
    // Reserve table functionality
  };

  const checkSaveStatus = async (restaurantId: string) => {
    if (!user) return;
    
    try {
      const saveState = await saveService.getSaveState(restaurantId, user.id);
      setIsSaved(saveState.isSaved && saveState.quickSavesBoardId ? 
        saveState.boards.includes(saveState.quickSavesBoardId) : false);
    } catch (error) {
      console.error('Error checking save status:', error);
    }
  };

  const handleSave = useCallback(async () => {
    if (!user) {
      ToastService.showError('Please sign in to save restaurants');
      return;
    }

    if (!restaurant?.id) return;

    setIsSaving(true);

    try {
      await saveService.toggleSave({
        userId: user.id,
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        onBoardSelection: () => {
          setShowBoardModal(true);
        },
        onSuccess: () => {
          // Update local state
          setIsSaved(!isSaved);
        },
        onError: (error) => {
          console.error('Save error:', error);
          // Refresh save status to sync with server
          checkSaveStatus(restaurant.id);
        }
      });
    } finally {
      setIsSaving(false);
    }
  }, [user, restaurant, isSaved]);

  const handleLongPress = useCallback(() => {
    if (!user) {
      ToastService.showError('Please sign in to save restaurants');
      return;
    }

    Haptics.selectionAsync();
    setShowBoardModal(true);
  }, [user]);

  const handleCreatePost = () => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    if (restaurant) {
      router.push({
        pathname: '/add/create-post',
        params: { 
          selectedRestaurant: JSON.stringify(restaurant)
        }
      });
    }
  };

  const handleUpdateCoverPhoto = async () => {
    if (!restaurant?.id || updatingCover) return;
    
    setUpdatingCover(true);
    try {
      const backgroundTaskManager = BackgroundTaskManager.getInstance();
      const result = await backgroundTaskManager.updateRestaurantCover(restaurant.id, true);
      
      if (result.success) {
        // Reload restaurant to show new cover
        await loadRestaurant(restaurant.id);
        // Show success message
      } else {
        console.error('Failed to update cover photo:', result.error || result.reason);
      }
    } catch (error) {
      console.error('Error updating cover photo:', error);
    } finally {
      setUpdatingCover(false);
    }
  };

  if (loading && !error) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={designTokens.colors.primaryOrange} />
          <Text style={styles.loadingText}>Loading restaurant details...</Text>
        </View>
      </View>
    );
  }

  if (error || !restaurant) {
    return (
      <View style={styles.container}>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
            <ArrowLeft size={20} color={designTokens.colors.textDark} />
          </TouchableOpacity>
        </View>
        <ErrorState
          error={error || new Error('Restaurant not found')}
          errorType={error ? getErrorType(error) : 'notFound'}
          onRetry={error ? onRetry : undefined}
          retrying={retrying}
          fullScreen
          customAction={{
            label: 'Go Back',
            onPress: () => router.back()
          }}
        />
      </View>
    );
  }

  const renderHeader = () => (
    <View style={styles.headerImage}>
      <Image
        source={{ uri: restaurantService.getRestaurantImage(restaurant) }}
        style={styles.image}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.2)']}
        style={styles.gradient}
      />
      
      {/* Header Actions */}
      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color="white" />
        </TouchableOpacity>
        <View style={styles.rightActions}>
          <TouchableOpacity style={styles.headerButton} onPress={() => {}}>
            <Share size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Restaurant Info Overlay */}
      <View style={styles.headerOverlay}>
        <View style={styles.badges}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{restaurant.cuisine_types?.[0] || 'Restaurant'}</Text>
          </View>
          {restaurant.trending && (
            <View style={[styles.badge, styles.trendingBadge]}>
              <TrendingUp size={12} color="white" />
              <Text style={styles.badgeText}>Trending</Text>
            </View>
          )}
          {/* <View style={[styles.badge, styles.socialBadge]}>
            <Users size={12} color="white" />
            <Text style={styles.badgeText}>{socialStats.weeklyVisits} this week</Text>
          </View> */}
        </View>
        
        <Text style={styles.restaurantName}>{restaurant.name}</Text>
        
        <View style={styles.restaurantMeta}>
          <View style={styles.rating}>
                            <Star size={14} color={designTokens.colors.primaryOrange} />
            <Text style={styles.ratingText}>{restaurant.google_rating || restaurant.troodie_rating || '4.5'}</Text>
            <Text style={styles.reviewCount}>({restaurant.google_reviews_count || 0})</Text>
          </View>
          <Text style={styles.separator}>•</Text>
          <Text style={styles.priceRange}>{restaurant.price_range || '$$'}</Text>
          <Text style={styles.separator}>•</Text>
          <Text style={styles.visitCount}>{socialStats.totalVisits} total visits</Text>
        </View>
      </View>
    </View>
  );

  const renderActionButtons = () => (
    <View style={styles.actionButtons}>
      <TouchableOpacity 
        style={styles.saveButtonContainer}
        onPress={handleSave}
        onLongPress={handleLongPress}
        activeOpacity={0.7}
        disabled={isSaving}
      >
        <Bookmark 
          size={20} 
          color={isSaved ? designTokens.colors.primaryOrange : designTokens.colors.textDark}
          fill={isSaved ? designTokens.colors.primaryOrange : 'transparent'}
        />
        {isSaving ? (
          <ActivityIndicator size="small" color={designTokens.colors.textMedium} />
        ) : (
          <Text style={styles.actionButtonText}>Save</Text>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.actionButton} onPress={handleCreatePost}>
        <MessageCircle size={18} color={designTokens.colors.textDark} />
      </TouchableOpacity>
    </View>
  );

  const getOperatingStatus = () => {
    const now = new Date();
    const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute; // Convert to minutes since midnight

    // Default hours if not available
    const defaultHours = { open: '11:00', close: '22:00' };
    
    // Get today's hours
    let todayHours = defaultHours;
    if (restaurant?.hours && typeof restaurant.hours === 'object') {
      const dayHours = restaurant.hours[currentDay];
      if (dayHours && typeof dayHours === 'object') {
        todayHours = dayHours;
      } else if (typeof dayHours === 'string') {
        // Parse string format like "11:00 AM - 10:00 PM"
        const match = dayHours.match(/(\d{1,2}:\d{2})\s*(AM|PM)?\s*-\s*(\d{1,2}:\d{2})\s*(AM|PM)?/i);
        if (match) {
          todayHours = { open: match[1], close: match[3] };
        }
      }
    }

    // Convert hours to minutes
    const parseTime = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const openTime = parseTime(todayHours.open);
    const closeTime = parseTime(todayHours.close);

    const isOpen = currentTime >= openTime && currentTime < closeTime;

    return {
      isOpen,
      currentDay: currentDay.charAt(0).toUpperCase() + currentDay.slice(1),
      todayHours,
      closeTime: todayHours.close
    };
  };

  const formatHours = (hours: any) => {
    if (!hours || typeof hours !== 'object') {
      return 'Mon-Sun: 11:00 AM - 10:00 PM';
    }

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const formattedDays = days.map(day => {
      const dayHours = hours[day];
      if (!dayHours) return null;
      
      if (typeof dayHours === 'string') {
        return `${day.charAt(0).toUpperCase() + day.slice(1)}: ${dayHours}`;
      } else if (dayHours.open && dayHours.close) {
        return `${day.charAt(0).toUpperCase() + day.slice(1)}: ${dayHours.open} - ${dayHours.close}`;
      }
      return null;
    }).filter(Boolean);

    return formattedDays.length > 0 ? formattedDays[0] : 'Hours not available';
  };

  const renderHoursInfo = () => {
    const status = getOperatingStatus();
    
    return (
      <>
        <Text style={styles.infoTitle}>
          {status.isOpen ? 'Open Now' : 'Closed'}
        </Text>
        <Text style={styles.infoSubtitle}>
          {formatHours(restaurant?.hours)}
        </Text>
        <Text style={[styles.openStatus, { color: status.isOpen ? '#10B981' : '#EF4444' }]}>
          {status.isOpen 
            ? `Closes at ${status.closeTime}` 
            : `Opens ${status.currentDay} at ${status.todayHours.open}`
          }
        </Text>
      </>
    );
  };

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      <View style={styles.tabs}>
        {(['social', 'info', 'photos'] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderPhotosTab = () => {
    if (photosLoading) {
      return (
        <View style={styles.tabContent}>
          <ActivityIndicator size="large" color={designTokens.colors.primaryOrange} />
        </View>
      );
    }
    
    return (
      <View style={styles.tabContent}>
        {restaurantPhotos.length > 0 ? (
          <View style={styles.photosContainer}>
            <View style={styles.photoStats}>
              <Text style={styles.photoStatsText}>
                {restaurantPhotos.length} photos from {new Set(restaurantPhotos.map(p => p.user_id)).size} contributors
              </Text>
              {/* Add update cover photo button for restaurant owners/admins */}
              {restaurant && (restaurant.owner_id === user?.id || user?.is_admin) && (
                <TouchableOpacity 
                  style={styles.updateCoverButton}
                  onPress={handleUpdateCoverPhoto}
                  disabled={updatingCover}
                >
                  {updatingCover ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Camera size={16} color="white" />
                      <Text style={styles.updateCoverButtonText}>Update Cover</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.photosGrid}>
              {restaurantPhotos.map((photo) => (
                <TouchableOpacity key={photo.id} style={styles.photoItem}>
                  <Image source={{ uri: photo.image_url }} style={styles.photo} />
                  {photo.user && (
                    <View style={styles.photoAttribution}>
                      <Image 
                        source={{ uri: photo.user.avatar_url || 'https://i.pravatar.cc/150' }} 
                        style={styles.photoUserAvatar} 
                      />
                      <Text style={styles.photoUserName} numberOfLines={1}>
                        {photo.user.name || photo.user.username || 'Anonymous'}
                      </Text>
                    </View>
                  )}
                  {photo.caption && (
                    <View style={styles.photoCaptionContainer}>
                      <Text style={styles.photoCaption} numberOfLines={2}>{photo.caption}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.emptyPhotos}>
            <Camera size={48} color={designTokens.colors.textLight} />
            <Text style={styles.emptyPhotosText}>No photos available yet</Text>
            <Text style={styles.emptyPhotosSubtext}>Share your experience to add photos!</Text>
            <TouchableOpacity 
              style={styles.addPhotoButton}
              onPress={handleCreatePost}
            >
              <Text style={styles.addPhotoButtonText}>Create Post</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderSocialTab = () => {

    const renderStars = (rating: number) => (
      <View style={styles.socialRating}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={10}
            color={star <= rating ? designTokens.colors.primaryOrange : '#DDD'}
            fill={star <= rating ? designTokens.colors.primaryOrange : 'transparent'}
          />
        ))}
      </View>
    );

    if (socialDataLoading && friendsWhoVisited.length === 0) {
      return (
        <View style={styles.tabContent}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={designTokens.colors.primaryOrange} />
            <Text style={styles.loadingText}>Loading social activity...</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.tabContent}>
        {/* Friends Who Visited */}
        <View style={styles.socialCard}>
          <View style={styles.socialHeader}>
            <View style={styles.socialHeaderLeft}>
              <Users size={16} color={designTokens.colors.primaryOrange} />
              <Text style={styles.socialTitle}>Friends Who Visited</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{friendsWhoVisited.length}</Text>
            </View>
          </View>

          {friendsWhoVisited.length > 0 ? (
            <View style={styles.socialList}>
              {friendsWhoVisited.map((friend) => {
                const rating = friend.post?.rating || friend.save?.personal_rating || 0;
                const comment = friend.post?.caption || friend.save?.notes || '';
                const photos = friend.post?.photos || friend.save?.photos || [];
                const createdAt = friend.post?.created_at || friend.save?.created_at || '';

                return (
                  <TouchableOpacity key={friend.id} style={styles.socialItem}>
                    <View style={styles.avatarContainer}>
                      <Image source={{ uri: friend.user.avatar_url || 'https://i.pravatar.cc/150' }} style={styles.avatar} />
                      {friend.user.is_verified && (
                        <View style={styles.verifiedBadge}>
                          <CheckCircle size={10} color="white" />
                        </View>
                      )}
                    </View>
                    <View style={styles.socialContent}>
                      <View style={styles.socialMetaRow}>
                        <Text style={styles.socialName}>{friend.user.name}</Text>
                        {renderStars(rating)}
                        <View style={styles.friendBadge}>
                          <Text style={styles.friendBadgeText}>Friend</Text>
                        </View>
                      </View>
                      {comment ? <Text style={styles.socialComment}>{comment}</Text> : null}
                      {photos.length > 0 && (
                        <View style={styles.socialPhotos}>
                          {photos.slice(0, 3).map((photo, index) => (
                            <Image key={index} source={{ uri: photo }} style={styles.socialPhoto} />
                          ))}
                        </View>
                      )}
                      <Text style={styles.socialTime}>{socialActivityService.formatTimeAgo(createdAt)}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <Text style={styles.emptyStateText}>
              {user ? 'No friends have visited yet. Be the first!' : 'Sign in to see friend activity'}
            </Text>
          )}
        </View>

        {/* Power Users & Critics */}
        <View style={[styles.socialCard, styles.powerUsersCard]}>
          <View style={styles.socialHeader}>
            <View style={styles.socialHeaderLeft}>
              <Award size={16} color="#8B5CF6" />
              <Text style={styles.socialTitle}>Power Users & Critics</Text>
            </View>
            <View style={[styles.badge, styles.purpleBadge]}>
              <Text style={styles.badgeText}>{powerUsersAndCritics.length}</Text>
            </View>
          </View>

          {powerUsersAndCritics.length > 0 ? (
            <View style={styles.socialList}>
              {powerUsersAndCritics.map((review) => (
                <TouchableOpacity key={review.id} style={[styles.socialItem, styles.powerUserItem]}>
                  <View style={styles.avatarContainer}>
                    <Image source={{ uri: review.user.avatar_url || 'https://i.pravatar.cc/150' }} style={styles.avatar} />
                    <View style={styles.powerUserBadge}>
                      <Star size={10} color="white" fill="white" />
                    </View>
                  </View>
                  <View style={styles.socialContent}>
                    <View style={styles.socialMetaRow}>
                      <Text style={styles.socialName}>{review.user.name}</Text>
                      {renderStars(review.post.rating)}
                    </View>
                    <Text style={styles.socialComment}>{review.post.caption}</Text>
                    {review.post.photos.length > 0 && (
                      <View style={styles.socialPhotos}>
                        {review.post.photos.map((photo, index) => (
                          <Image key={index} source={{ uri: photo }} style={styles.socialPhoto} />
                        ))}
                      </View>
                    )}
                    <View style={styles.powerUserFooter}>
                      <Text style={styles.socialTime}>{socialActivityService.formatTimeAgo(review.post.created_at)}</Text>
                      <Text style={styles.followerCount}>
                        {(review.user.followers_count / 1000).toFixed(0)}K followers
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyStateText}>No reviews from power users yet.</Text>
          )}
        </View>

        {/* Recent Activity */}
        <View style={styles.socialCard}>
          <View style={styles.socialHeader}>
            <View style={styles.socialHeaderLeft}>
              <Eye size={16} color="#10B981" />
              <Text style={styles.socialTitle}>Recent Activity</Text>
            </View>
            <View style={[styles.badge, styles.greenBadge]}>
              <Text style={styles.badgeText}>Live</Text>
            </View>
          </View>

          {recentActivity.length > 0 ? (
            <View style={styles.activityList}>
                             {recentActivity.map((activity) => {
                 const getTrafficLightColor = (rating: number | null) => {
                   if (!rating) return '#DDD';
                   // Check if it's a traffic light system (1-3) or star system (1-5)
                   if (rating <= 3) {
                     // Traffic light system colors: 1=Red, 2=Yellow, 3=Green
                     const trafficColors = { 1: '#FF4444', 2: '#FFAA44', 3: '#00AA00' };
                     return trafficColors[rating as keyof typeof trafficColors] || '#DDD';
                   } else {
                     // 5-star system colors
                     const starColors = { 1: '#FF4444', 2: '#FF7744', 3: '#FFAA44', 4: '#44AA44', 5: '#00AA00' };
                     return starColors[rating as keyof typeof starColors] || '#DDD';
                   }
                 };

                 const getTrafficLightLabel = (rating: number | null) => {
                   if (!rating) return '';
                   // Check if it's a traffic light system (1-3) or star system (1-5)
                   if (rating <= 3) {
                     // Traffic light system mapping
                     const trafficLabels = { 1: 'Poor', 2: 'Average', 3: 'Excellent' };
                     return trafficLabels[rating as keyof typeof trafficLabels] || '';
                   } else {
                     // 5-star system mapping
                     const starLabels = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Great', 5: 'Excellent' };
                     return starLabels[rating as keyof typeof starLabels] || '';
                   }
                 };

                                 

                                 return (
                   <View key={activity.id} style={styles.activityItem}>
                     <Image source={{ uri: activity.user.avatar_url || 'https://i.pravatar.cc/150' }} style={styles.activityAvatar} />
                     <View style={styles.activityContent}>
                       <View style={styles.activityMainRow}>
                         <View style={styles.activityTextContainer}>
                           <Text style={styles.activityText}>
                             <Text style={styles.activityUser}>
                               {activity.user.name || activity.user.username || 'Someone'}
                             </Text>{' '}
                             {activity.action === 'reviewed' ? 'reviewed' : 
                              activity.action === 'saved' ? 'saved' :
                              activity.action === 'checked_in' ? 'checked in' :
                              activity.action === 'liked' ? 'liked' : 'visited'}
                           </Text>
                           
                           {/* Show review content if it's a review */}
                           {activity.action === 'reviewed' && activity.review && (
                             <View style={styles.reviewContent}>
                               {activity.review.caption && (
                                 <Text style={styles.reviewText} numberOfLines={2}>
                                   "{activity.review.caption}"
                                 </Text>
                               )}
                               {activity.review.photos && activity.review.photos.length > 0 && (
                                 <View style={styles.reviewPhotos}>
                                   {activity.review.photos.slice(0, 3).map((photo, index) => (
                                     <Image key={index} source={{ uri: photo }} style={styles.reviewPhoto} />
                                   ))}
                                   {activity.review.photos.length > 3 && (
                                     <View style={styles.photoCount}>
                                       <Text style={styles.photoCountText}>+{activity.review.photos.length - 3}</Text>
                                     </View>
                                   )}
                                 </View>
                               )}
                             </View>
                           )}
                           
                           <Text style={styles.activityTime}>{socialActivityService.formatTimeAgo(activity.created_at)}</Text>
                         </View>
                         
                         {/* Traffic Light Rating */}
                         {activity.action === 'reviewed' && activity.review?.rating && activity.review.rating > 0 && (
                           <View style={styles.activityRating}>
                             <View style={[styles.activityTrafficDot, { backgroundColor: getTrafficLightColor(activity.review.rating) }]} />
                             <Text style={styles.activityRatingLabel}>{getTrafficLightLabel(activity.review.rating)}</Text>
                           </View>
                         )}
                       </View>
                     </View>
                   </View>
                 );
              })}
            </View>
          ) : (
            <Text style={styles.emptyStateText}>No recent activity.</Text>
          )}
        </View>
      </View>
    );
  };

  const renderInfoTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Restaurant Information</Text>
        
        {/* Address */}
        <TouchableOpacity style={styles.infoRow} onPress={handleDirections}>
          <MapPin size={18} color={designTokens.colors.textLight} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>{restaurant.address || 'Charlotte, NC'}</Text>
            <Text style={styles.infoSubtitle}>{restaurant.neighborhood || 'Downtown'} • 0.3 miles away</Text>
            <View style={styles.linkButton}>
              <ExternalLink size={14} color={designTokens.colors.primaryOrange} />
              <Text style={styles.linkText}>Get Directions</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Hours */}
        <View style={styles.infoRow}>
          <Clock size={18} color={designTokens.colors.textLight} />
          <View style={styles.infoContent}>
            {renderHoursInfo()}
          </View>
        </View>

        {/* Phone */}
        {restaurant.phone && (
          <TouchableOpacity style={styles.infoRow} onPress={handleCall}>
            <Phone size={18} color={designTokens.colors.textLight} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>{restaurant.phone}</Text>
              <Text style={styles.infoSubtitle}>Call for reservations</Text>
              <Text style={styles.linkText}>Call Now</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Website */}
        {restaurant.website && (
          <TouchableOpacity style={styles.infoRow} onPress={handleWebsite}>
            <Globe size={18} color={designTokens.colors.textLight} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>{restaurant.website}</Text>
              <Text style={styles.infoSubtitle}>View menu & make reservations</Text>
              <View style={styles.linkButton}>
                <ExternalLink size={14} color={designTokens.colors.primaryOrange} />
                <Text style={styles.linkText}>Visit Website</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Features & Amenities */}
      {restaurant.features && restaurant.features.length > 0 && (
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Features & Amenities</Text>
          <View style={styles.featuresGrid}>
            {restaurant.features.map((feature: string, index: number) => (
              <View key={index} style={styles.featureChip}>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'info':
        return renderInfoTab();
      case 'social':
        return renderSocialTab();
      case 'photos':
        return renderPhotosTab();
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[2]}>
        {renderHeader()}
        {renderActionButtons()}
        {renderTabs()}
        {renderTabContent()}
      </ScrollView>

      {restaurant && (
        <BoardSelectionModal
          visible={showBoardModal}
          onClose={() => setShowBoardModal(false)}
          restaurantId={id as string}
          restaurantName={restaurant.name}
          onSuccess={() => {
            setShowBoardModal(false);
            // Refresh save status after adding to boards
            checkSaveStatus(restaurant.id);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: designTokens.spacing.xl,
  },
  errorText: {
    ...designTokens.typography.sectionTitle,
    color: designTokens.colors.textDark,
    marginBottom: designTokens.spacing.lg,
  },
  backButton: {
    backgroundColor: designTokens.colors.primaryOrange,
    paddingHorizontal: designTokens.spacing.xl,
    paddingVertical: designTokens.spacing.md,
    borderRadius: designTokens.borderRadius.full,
  },
  backButtonText: {
    ...designTokens.typography.detailText,
    fontFamily: 'Inter_600SemiBold',
    color: 'white',
  },
  headerImage: {
    height: 350,
    position: 'relative',
    marginTop: -1, // Extend to top of screen
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  headerActions: {
    position: 'absolute',
    top: 60, // Account for status bar
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  rightActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    backdropFilter: 'blur(10px)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: designTokens.borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeText: {
    ...designTokens.typography.smallText,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
  },
  trendingBadge: {
    backgroundColor: designTokens.colors.primaryOrange,
  },
  socialBadge: {
    backgroundColor: '#10B981',
  },
  restaurantName: {
    ...designTokens.typography.screenTitle,
    color: 'white',
    marginBottom: 4,
  },
  restaurantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    ...designTokens.typography.detailText,
    fontFamily: 'Inter_600SemiBold',
    color: 'white',
  },
  reviewCount: {
    ...designTokens.typography.smallText,
    color: 'rgba(255,255,255,0.9)',
  },
  separator: {
    color: 'rgba(255,255,255,0.7)',
    marginHorizontal: 8,
  },
  priceRange: {
    ...designTokens.typography.detailText,
    color: 'white',
  },
  visitCount: {
    ...designTokens.typography.smallText,
    color: 'rgba(255,255,255,0.9)',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    borderRadius: designTokens.borderRadius.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'white',
  },
  saveButton: {
    flex: 1,
  },
  saveButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    borderRadius: designTokens.borderRadius.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'white',
    flex: 1,
  },
  actionButtonText: {
    ...designTokens.typography.detailText,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.textDark,
  },
  reserveButton: {
    backgroundColor: designTokens.colors.primaryOrange,
    borderColor: designTokens.colors.primaryOrange,
  },
  reserveButtonText: {
    ...designTokens.typography.detailText,
    fontFamily: 'Inter_600SemiBold',
    color: 'white',
  },
  tabContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: designTokens.colors.backgroundGray,
    borderRadius: designTokens.borderRadius.md,
    padding: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: designTokens.borderRadius.sm,
  },
  activeTab: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    ...designTokens.typography.smallText,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.textMedium,
  },
  activeTabText: {
    color: designTokens.colors.textDark,
    fontFamily: 'Inter_600SemiBold',
  },
  tabContent: {
    padding: 16,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: designTokens.borderRadius.lg,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    ...designTokens.typography.detailText,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 8,
    backgroundColor: designTokens.colors.backgroundGray,
    borderRadius: designTokens.borderRadius.md,
    marginBottom: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    ...designTokens.typography.detailText,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.textDark,
    marginBottom: 2,
  },
  infoSubtitle: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textMedium,
    marginBottom: 4,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  linkText: {
    ...designTokens.typography.smallText,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.primaryOrange,
  },
  openStatus: {
    ...designTokens.typography.smallText,
    fontFamily: 'Inter_500Medium',
    color: '#10B981',
    marginTop: 4,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureChip: {
    backgroundColor: designTokens.colors.backgroundLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: designTokens.borderRadius.full,
  },
  featureText: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textMedium,
  },
  placeholderText: {
    ...designTokens.typography.bodyRegular,
    color: designTokens.colors.textLight,
    textAlign: 'center',
    paddingVertical: 40,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoItem: {
    width: (screenWidth - 48) / 2, // 2 columns with padding and gaps
    height: (screenWidth - 48) / 2,
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: designTokens.borderRadius.md,
  },
  emptyPhotos: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyPhotosText: {
    ...designTokens.typography.cardTitle,
    color: designTokens.colors.textDark,
    marginTop: designTokens.spacing.lg,
    marginBottom: designTokens.spacing.sm,
  },
  emptyPhotosSubtext: {
    ...designTokens.typography.detailText,
    color: designTokens.colors.textMedium,
  },
  photosContainer: {
    flex: 1,
  },
  photoStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
  },
  photoStatsText: {
    ...designTokens.typography.detailText,
    color: designTokens.colors.textMedium,
  },
  photoAttribution: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: designTokens.spacing.xs,
    borderBottomLeftRadius: designTokens.borderRadius.md,
    borderBottomRightRadius: designTokens.borderRadius.md,
  },
  photoUserAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: designTokens.spacing.xs,
  },
  photoUserName: {
    ...designTokens.typography.captionText,
    color: designTokens.colors.white,
    flex: 1,
  },
  photoCaptionContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: designTokens.spacing.xs,
    borderTopLeftRadius: designTokens.borderRadius.md,
    borderTopRightRadius: designTokens.borderRadius.md,
  },
  photoCaption: {
    ...designTokens.typography.captionText,
    color: designTokens.colors.white,
  },
  addPhotoButton: {
    marginTop: designTokens.spacing.md,
    backgroundColor: designTokens.colors.primaryOrange,
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: designTokens.borderRadius.full,
  },
  addPhotoButtonText: {
    ...designTokens.typography.buttonText,
    color: designTokens.colors.white,
  },
  updateCoverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: designTokens.colors.primaryOrange,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: designTokens.borderRadius.full,
  },
  updateCoverButtonText: {
    ...designTokens.typography.smallText,
    fontFamily: 'Inter_600SemiBold',
    color: 'white',
  },
  ratingSection: {
    backgroundColor: 'white',
    borderRadius: designTokens.borderRadius.lg,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    ...designTokens.typography.screenTitle,
    color: designTokens.colors.textDark,
    marginTop: 8,
  },
  statLabel: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textMedium,
    marginTop: 4,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  socialCard: {
    backgroundColor: 'white',
    borderRadius: designTokens.borderRadius.lg,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  powerUsersCard: {
    backgroundColor: '#F3F0FF',
  },
  socialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  socialHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  socialTitle: {
    ...designTokens.typography.detailText,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
  },
  socialList: {
    gap: 12,
  },
  socialItem: {
    flexDirection: 'row',
    padding: 8,
    borderRadius: designTokens.borderRadius.md,
    backgroundColor: designTokens.colors.backgroundGray,
  },
  powerUserItem: {
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    backgroundColor: designTokens.colors.primaryOrange,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  powerUserBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    backgroundColor: '#8B5CF6',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialContent: {
    flex: 1,
  },
  socialMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  socialName: {
    ...designTokens.typography.detailText,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.textDark,
  },
  socialRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  friendBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: designTokens.borderRadius.full,
  },
  friendBadgeText: {
    ...designTokens.typography.smallText,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E40AF',
    fontSize: 10,
  },
  socialComment: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textMedium,
    marginBottom: 8,
  },
  socialPhotos: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  socialPhoto: {
    width: 32,
    height: 32,
    borderRadius: designTokens.borderRadius.sm,
  },
  socialTime: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textLight,
    fontSize: 11,
  },
  powerUserFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  followerCount: {
    ...designTokens.typography.smallText,
    fontFamily: 'Inter_500Medium',
    color: '#8B5CF6',
    fontSize: 11,
  },
  activityList: {
    gap: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 8,
    borderRadius: designTokens.borderRadius.md,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  activityAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  activityTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  activityText: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textDark,
  },
  activityUser: {
    fontFamily: 'Inter_500Medium',
  },
  activityTime: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textLight,
    fontSize: 11,
    marginTop: 2,
  },
  activityRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activityTrafficDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activityRatingLabel: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.textDark,
  },
  reviewContent: {
    marginTop: 8,
    marginBottom: 4,
  },
  reviewText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: designTokens.colors.textMedium,
    lineHeight: 16,
    marginBottom: 6,
    fontFamily: 'Inter_400Regular',
  },
  reviewPhotos: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  reviewPhoto: {
    width: 24,
    height: 24,
    borderRadius: 4,
  },
  photoCount: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoCountText: {
    fontSize: 10,
    color: 'white',
    fontFamily: 'Inter_500Medium',
  },
  emptyStateText: {
    ...designTokens.typography.detailText,
    color: designTokens.colors.textLight,
    textAlign: 'center',
    paddingVertical: 20,
  },
  purpleBadge: {
    backgroundColor: '#EDE9FE',
  },
  greenBadge: {
    backgroundColor: '#D1FAE5',
  },
});