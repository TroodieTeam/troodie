import React, { useCallback, useState } from 'react';
import { 
  Image, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View,
  ActivityIndicator 
} from 'react-native';
import { Bookmark, MapPin, Star } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { RestaurantInfo } from '@/types/core';
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
  const [showBoardModal, setShowBoardModal] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback((e: any) => {
    e.stopPropagation();
    if (!user) {
      // TODO: Show auth modal or redirect to login
      return;
    }
    setShowBoardModal(true);
  }, [user]);

  const handleSaveSuccess = useCallback(() => {
    setIsSaved(true);
    setShowBoardModal(false);
  }, []);

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
          
          <View style={styles.details}>
            <RatingSection rating={restaurant.rating || 0} />
            <LocationSection location={restaurant.location || 'Unknown'} />
          </View>

          {stats && <StatsSection stats={stats} />}
        </View>
      </TouchableOpacity>

      {showBoardModal && (
        <BoardSelectionModal
          visible={showBoardModal}
          onClose={() => setShowBoardModal(false)}
          restaurantId={restaurant.id}
          restaurantName={restaurant.name}
          onSuccess={handleSaveSuccess}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  compactContainer: {
    flexDirection: 'row',
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 160,
    backgroundColor: '#F0F0F0',
  },
  compactImage: {
    width: 100,
    height: 100,
  },
  saveButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 12,
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  cuisine: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    marginBottom: 8,
  },
  details: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#333',
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  locationText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    flex: 1,
  },
  stats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  statText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: theme.colors.primary,
  },
});