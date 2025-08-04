import { designTokens } from '@/constants/designTokens';
import { DEFAULT_IMAGES } from '@/constants/images';
import { useAuth } from '@/contexts/AuthContext';
import { saveService } from '@/services/saveService';
import { ToastService } from '@/services/toastService';
import { RestaurantInfo } from '@/types/core';
import { Bookmark, MapPin, Star } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View
} from 'react-native';
import { AnimatedSaveButton } from '../AnimatedSaveButton';
import { BoardSelectionModal } from '../BoardSelectionModal';

interface RestaurantCardWithSaveProps {
  restaurant: RestaurantInfo;
  onPress?: () => void;
  stats?: {
    saves?: number;
    visits?: number;
  };
  showSaveButton?: boolean;
  onRefresh?: () => void;
  highlights?: string[];
}

// Separate components for better modularity
const SaveButton = ({
  onPress,
  onLongPress,
  isSaved,
  isLoading
}: {
  onPress: (e: any) => void;
  onLongPress?: (e: any) => void;
  isSaved: boolean;
  isLoading?: boolean;
}) => (
  <TouchableOpacity
    style={styles.saveButton}
    onPress={onPress}
    onLongPress={onLongPress}
    activeOpacity={0.8}
    disabled={isLoading}
  >
    {isLoading ? (
      <ActivityIndicator size="small" color={designTokens.colors.textMedium} />
    ) : (
      <Bookmark
        size={18}
        color={isSaved ? designTokens.colors.primaryOrange : designTokens.colors.textLight}
        fill={isSaved ? designTokens.colors.primaryOrange : 'transparent'}
      />
    )}
  </TouchableOpacity>
);

const RatingSection = ({ rating }: { rating: number }) => (
  <View style={styles.rating}>
    <Star size={12} color="#FFB800" fill="#FFB800" />
    <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
  </View>
);

const LocationSection = ({ location }: { location: string }) => (
  <View style={styles.location}>
    <MapPin size={12} color={designTokens.colors.textMedium} />
    <Text style={styles.locationText} numberOfLines={1}>
      {location}
    </Text>
  </View>
);

const StatsSection = ({ stats }: { stats: { saves?: number; visits?: number } }) => {
  if (!stats.saves && !stats.visits) return null;

  return (
    <View style={styles.stats}>
      {stats.saves !== undefined && stats.saves > 0 && (
        <Text style={styles.statText}>{stats.saves} saves</Text>
      )}
      {stats.visits !== undefined && stats.visits > 0 && (
        <Text style={styles.statText}>{stats.visits} visits</Text>
      )}
    </View>
  );
};

const HighlightsSection = ({ highlights }: { highlights: string[] }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  if (!highlights || highlights.length === 0) return null;

  return (
    <Animated.View style={[styles.trendingHighlights, { opacity: fadeAnim }]}>
      {highlights.map((highlight, idx) => (
        <View key={idx} style={styles.highlightBadge}>
          <Text style={styles.highlightText}>{highlight}</Text>
        </View>
      ))}
    </Animated.View>
  );
};

export function RestaurantCardWithSave({
  restaurant,
  onPress,
  stats,
  showSaveButton = true,
  onRefresh,
  highlights
}: RestaurantCardWithSaveProps) {
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showBoardModal, setShowBoardModal] = useState(false);

  // Check if restaurant is saved on mount
  useEffect(() => {
    if (user && restaurant.id) {
      checkSaveStatus();
    }
  }, [user, restaurant.id]);

  const checkSaveStatus = async () => {
    if (!user) return;

    try {
      const saveState = await saveService.getSaveState(restaurant.id, user.id);
      setIsSaved(saveState.isSaved && saveState.quickSavesBoardId ?
        saveState.boards.includes(saveState.quickSavesBoardId) : false);
    } catch (error) {
      console.error('Error checking save status:', error);
    }
  };

  const handleSave = useCallback(async (e: any) => {
    e.stopPropagation();
    if (!user) {
      ToastService.showError('Please sign in to save restaurants');
      return;
    }

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
          // Call refresh callback
          onRefresh?.();
        },
        onError: (error) => {
          console.error('Save error:', error);
          // Refresh save status to sync with server
          checkSaveStatus();
        }
      });
    } finally {
      setIsSaving(false);
    }
  }, [user, restaurant.id, restaurant.name, isSaved, onRefresh]);

  const handleLongPress = useCallback((e: any) => {
    e.stopPropagation();
    if (!user) {
      ToastService.showError('Please sign in to save restaurants');
      return;
    }

    Vibration.vibrate(20);
    setShowBoardModal(true);
  }, [user]);

  const handleCardPress = useCallback(() => {
    if (onPress) {
      onPress();
    }
  }, [onPress]);

  // Construct cuisine and price range text safely
  const cuisineText = restaurant.cuisine || 'Restaurant';
  const priceRange = restaurant.priceRange || '$';
  const detailsText = `${cuisineText} • ${priceRange}`;

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        onPress={handleCardPress}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: restaurant.image || DEFAULT_IMAGES.restaurant }}
          style={styles.image}
        />
        <View style={styles.content}>
          <View style={styles.mainInfo}>
            <Text style={styles.name} numberOfLines={1}>
              {restaurant.name || 'Restaurant'}
            </Text>
            <Text style={styles.cuisine} numberOfLines={1}>
              {detailsText}
            </Text>
            <>
              {restaurant.rating !== undefined && restaurant.rating > 0 && (
                <RatingSection rating={restaurant.rating} />
              )}
              {restaurant.location && <LocationSection location={restaurant.location} />}
              {stats && <StatsSection stats={stats} />}
            </>
            {highlights && <HighlightsSection highlights={highlights} />}
          </View>
          {showSaveButton && (
            <AnimatedSaveButton
              onPress={handleSave}
              onLongPress={handleLongPress}
              isSaved={isSaved}
              isLoading={isSaving}
            />
          )}
        </View>
      </TouchableOpacity>

      {showBoardModal && (
        <BoardSelectionModal
          visible={showBoardModal}
          onClose={() => setShowBoardModal(false)}
          restaurantId={restaurant.id}
          restaurantName={restaurant.name}
          onSuccess={() => {
            setShowBoardModal(false);
            // Refresh save status after adding to boards
            checkSaveStatus();
          }}
          onRefresh={onRefresh}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.lg,
    overflow: 'hidden',
    marginBottom: designTokens.spacing.lg,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 140, // Adjusted for better aspect ratio
    backgroundColor: designTokens.colors.backgroundGray,
  },
  saveButton: {
    padding: 8,
    alignSelf: 'center',
  },
  content: {
    padding: designTokens.spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  mainInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
    marginBottom: 2,
  },
  cuisine: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
    marginBottom: 4,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.textDark,
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  locationText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
    flex: 1,
  },
  stats: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 12,
  },
  statText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: '#999',
  },
  trendingHighlights: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: designTokens.spacing.sm,
    marginTop: designTokens.spacing.md,
  },
  highlightBadge: {
    backgroundColor: designTokens.colors.backgroundGray,
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: 4,
    borderRadius: designTokens.borderRadius.md,
  },
  highlightText: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.textMedium,
  },
});
