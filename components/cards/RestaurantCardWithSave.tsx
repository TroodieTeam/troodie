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
import { useAuth } from '@/contexts/AuthContext';
import { RestaurantInfo } from '@/types/core';
import { boardService } from '@/services/boardService';
import { ToastService } from '@/services/toastService';

interface RestaurantCardWithSaveProps {
  restaurant: RestaurantInfo;
  onPress?: () => void;
  stats?: {
    saves?: number;
    visits?: number;
  };
  compact?: boolean;
  showSaveButton?: boolean;
}

// Separate components for better modularity
const SaveButton = ({ 
  onPress, 
  isSaved, 
  isLoading 
}: { 
  onPress: (e: any) => void; 
  isSaved: boolean; 
  isLoading?: boolean;
}) => (
  <TouchableOpacity 
    style={styles.saveButton} 
    onPress={onPress}
    activeOpacity={0.8}
    disabled={isLoading}
  >
    {isLoading ? (
      <ActivityIndicator size="small" color="#FFFFFF" />
    ) : (
      <Bookmark 
        size={20} 
        color={isSaved ? theme.colors.primary : '#FFFFFF'}
        fill={isSaved ? theme.colors.primary : 'transparent'}
      />
    )}
  </TouchableOpacity>
);

const RatingSection = ({ rating }: { rating: number }) => (
  <View style={styles.rating}>
    <Star size={14} color="#FFB800" fill="#FFB800" />
    <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
  </View>
);

const LocationSection = ({ location }: { location: string }) => (
  <View style={styles.location}>
    <MapPin size={14} color="#666" />
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
  showSaveButton = true 
}: RestaurantCardWithSaveProps) {
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
        
        ToastService.showSuccess(
          'Added to Quick Saves',
          {
            label: 'Add to Board',
            onPress: () => {
              // Navigate to board selection
              // This would require passing a callback or using navigation
              console.log('Navigate to board selection');
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
    <TouchableOpacity 
      style={[styles.container, compact && styles.compactContainer]} 
      onPress={handleCardPress}
      activeOpacity={0.7}
    >
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: restaurant.image || 'https://via.placeholder.com/300x200' }} 
          style={[styles.image, compact && styles.compactImage]} 
        />
        {showSaveButton && (
          <SaveButton 
            onPress={handleSave} 
            isSaved={isSaved} 
            isLoading={isSaving}
          />
        )}
      </View>
      
      <View style={styles.content}>
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
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  compactContainer: {
    marginBottom: 12,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 200,
    backgroundColor: '#F0F0F0',
  },
  compactImage: {
    height: 150,
  },
  saveButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    padding: 16,
  },
  name: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  cuisine: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    marginBottom: 8,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#1A1A1A',
    marginLeft: 4,
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    marginLeft: 4,
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