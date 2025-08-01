import React, { useCallback, useState, useEffect } from 'react';
import { 
  Image, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View,
  ActivityIndicator,
  Vibration
} from 'react-native';
import { Bookmark, MapPin, Star } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { designTokens, compactDesign } from '@/constants/designTokens';
import { DEFAULT_IMAGES } from '@/constants/images';
import { useAuth } from '@/contexts/AuthContext';
import { RestaurantInfo } from '@/types/core';
import { boardService } from '@/services/boardService';
import { ToastService } from '@/services/toastService';
import { BoardSelectionModal } from '../BoardSelectionModal';

interface RestaurantCardWithSaveProps {
  restaurant: RestaurantInfo;
  onPress?: () => void;
  stats?: {
    saves?: number;
    visits?: number;
  };
  compact?: boolean;
  showSaveButton?: boolean;
  onRefresh?: () => void;
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

export function RestaurantCardWithSave({ 
  restaurant, 
  onPress, 
  stats, 
  compact = false,
  showSaveButton = true,
  onRefresh 
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
      // Check if restaurant is saved in Quick Saves
      const quickSavesBoard = await boardService.getUserQuickSavesBoard(user.id);
      if (quickSavesBoard) {
        const boards = await boardService.getBoardsForRestaurant(restaurant.id, user.id);
        setIsSaved(boards.some(b => b.id === quickSavesBoard.id));
      }
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
    Vibration.vibrate(10);

    try {
      if (isSaved) {
        // Unsave from Quick Saves
        const quickSavesBoard = await boardService.getUserQuickSavesBoard(user.id);
        if (quickSavesBoard) {
          await boardService.removeRestaurantFromBoard(quickSavesBoard.id, restaurant.id);
          setIsSaved(false);
          ToastService.showSuccess('Removed from Quick Saves');
        }
      } else {
        // Save to Quick Saves
        await boardService.saveRestaurantToQuickSaves(user.id, restaurant.id);
        setIsSaved(true);
        
        // Call refresh callback if provided
        onRefresh?.();
        
        ToastService.showSuccess(
          'Added to Quick Saves',
          {
            label: 'Add to Board',
            onPress: () => {
              setShowBoardModal(true);
            }
          }
        );
      }
    } catch (error: any) {
      console.error('Save toggle error:', error);
      if (error.message?.includes('already exists')) {
        setIsSaved(true);
      } else {
        ToastService.showError('Failed to save restaurant');
      }
    } finally {
      setIsSaving(false);
    }
  }, [user, restaurant.id, isSaved]);

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
        style={[styles.container, compact && styles.compactContainer]} 
        onPress={handleCardPress}
        activeOpacity={0.7}
      >
        <Image 
          source={{ uri: restaurant.image || DEFAULT_IMAGES.restaurant }} 
          style={[styles.image, compact && styles.compactImage]} 
        />
        
        <View style={styles.content}>
          <View style={styles.mainInfo}>
            <Text style={styles.name} numberOfLines={1}>
              {restaurant.name || 'Restaurant'}
            </Text>
            <Text style={styles.cuisine} numberOfLines={1}>
              {detailsText}
            </Text>
            
            {!compact && (
              <>
                {restaurant.rating !== undefined && restaurant.rating > 0 && (
                  <RatingSection rating={restaurant.rating} />
                )}
                {restaurant.location && <LocationSection location={restaurant.location} />}
                {stats && <StatsSection stats={stats} />}
              </>
            )}
          </View>
          
          {showSaveButton && (
            <SaveButton 
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
    flexDirection: 'row',
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.sm,
    overflow: 'hidden',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
  },
  compactContainer: {
    marginBottom: 8,
  },
  image: {
    width: 64,
    height: 64,
    backgroundColor: designTokens.colors.backgroundGray,
  },
  compactImage: {
    width: 64,
    height: 64,
  },
  saveButton: {
    padding: 8,
    alignSelf: 'center',
  },
  content: {
    flex: 1,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  mainInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
    marginBottom: 2,
  },
  cuisine: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
    marginBottom: 2,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.textDark,
    marginLeft: 2,
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 2,
  },
  locationText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
    flex: 1,
  },
  stats: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 16,
  },
  statText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#999',
  },
});