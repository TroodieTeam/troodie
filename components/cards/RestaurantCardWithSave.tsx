import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { MapPin, Star, Bookmark } from 'lucide-react-native';
import { RestaurantInfo } from '@/types/core';
import { theme } from '@/constants/theme';
import { BoardSelectionModal } from '../BoardSelectionModal';
import { useAuth } from '@/contexts/AuthContext';

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

  const handleSave = (e: any) => {
    e.stopPropagation();
    if (!user) {
      // TODO: Show auth modal or redirect to login
      return;
    }
    setShowBoardModal(true);
  };

  const handleSaveSuccess = () => {
    setIsSaved(true);
  };

  return (
    <>
      <TouchableOpacity 
        style={[styles.container, compact && styles.compactContainer]} 
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: restaurant.image }} 
            style={[styles.image, compact && styles.compactImage]} 
          />
          {showSaveButton && (
            <TouchableOpacity 
              style={styles.saveButton} 
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Bookmark 
                size={20} 
                color={isSaved ? theme.colors.primary : '#FFFFFF'} 
                fill={isSaved ? theme.colors.primary : 'transparent'}
                strokeWidth={2}
              />
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.content}>
          <Text style={styles.name} numberOfLines={1}>
            {restaurant.name}
          </Text>
          <Text style={styles.cuisine} numberOfLines={1}>
            {restaurant.cuisine} • {restaurant.priceRange}
          </Text>
          
          <View style={styles.details}>
            <View style={styles.rating}>
              <Star size={14} color="#FFB800" fill="#FFB800" />
              <Text style={styles.ratingText}>{restaurant.rating}</Text>
            </View>
            
            <View style={styles.location}>
              <MapPin size={14} color="#666" />
              <Text style={styles.locationText} numberOfLines={1}>
                {restaurant.location}
              </Text>
            </View>
          </View>

          {stats && (
            <View style={styles.stats}>
              {stats.saves && (
                <Text style={styles.statText}>{stats.saves} saves</Text>
              )}
              {stats.visits && (
                <Text style={styles.statText}>{stats.visits} visits</Text>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>

      <BoardSelectionModal
        visible={showBoardModal}
        onClose={() => setShowBoardModal(false)}
        restaurantId={restaurant.id}
        restaurantName={restaurant.name}
        onSuccess={handleSaveSuccess}
      />
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