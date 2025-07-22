import { ErrorState } from '@/components/ErrorState';
import { designTokens } from '@/constants/designTokens';
import { restaurantService } from '@/services/restaurantService';
import { getErrorType } from '@/types/errors';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Bookmark,
  Camera,
  Clock,
  ExternalLink,
  Globe,
  Heart,
  MapPin,
  MessageCircle,
  Phone,
  Share,
  Star,
  TrendingUp,
  Users
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
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
  const [restaurant, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [socialStats] = useState({
    weeklyVisits: Math.floor(Math.random() * 200) + 50,
    totalVisits: Math.floor(Math.random() * 2000) + 500
  });

  useEffect(() => {
    if (id) {
      loadRestaurant(id as string);
    }
  }, [id]);

  const loadRestaurant = async (restaurantId: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await restaurantService.getRestaurantById(restaurantId);
      if (data) {
        setRestaurant(data);
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
    console.log('Reserve table');
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
    // TODO: Implement save functionality with Supabase
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
        source={{ uri: restaurant.photos?.[0] || 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800' }}
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
          <TouchableOpacity style={styles.headerButton} onPress={() => {}}>
            <Camera size={20} color="white" />
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
          <View style={[styles.badge, styles.socialBadge]}>
            <Users size={12} color="white" />
            <Text style={styles.badgeText}>{socialStats.weeklyVisits} this week</Text>
          </View>
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
        style={[styles.actionButton, styles.saveButton]} 
        onPress={handleSave}
      >
        <Bookmark size={18} color={isSaved ? designTokens.colors.primaryOrange : designTokens.colors.textDark} />
        <Text style={styles.actionButtonText}>Save</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.actionButton} onPress={() => {}}>
        <Heart size={18} color={designTokens.colors.textDark} />
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.actionButton} onPress={() => {}}>
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
    const photos = restaurant?.photos || [];
    
    return (
      <View style={styles.tabContent}>
        {photos.length > 0 ? (
          <View style={styles.photosGrid}>
            {photos.map((photo: string, index: number) => (
              <TouchableOpacity key={index} style={styles.photoItem}>
                <Image source={{ uri: photo }} style={styles.photo} />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyPhotos}>
            <Camera size={48} color={designTokens.colors.textLight} />
            <Text style={styles.emptyPhotosText}>No photos available yet</Text>
            <Text style={styles.emptyPhotosSubtext}>Be the first to add photos!</Text>
          </View>
        )}
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
        return (
          <View style={styles.tabContent}>
            <Text style={styles.placeholderText}>Social activity coming soon</Text>
          </View>
        );
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
});