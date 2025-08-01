import { designTokens } from '@/constants/designTokens';
import { DEFAULT_IMAGES } from '@/constants/images';
import { RestaurantInfo } from '@/types/core';
import { Star } from 'lucide-react-native';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface RestaurantCardProps {
  restaurant: RestaurantInfo;
  onPress?: () => void;
  stats?: {
    saves?: number;
    visits?: number;
  };
  compact?: boolean;
  showRating?: boolean;
}

export function RestaurantCard({ restaurant, onPress, stats, compact = false, showRating = false }: RestaurantCardProps) {
  // Always use compact horizontal layout for better space efficiency
  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Image 
        source={{ uri: restaurant.image || DEFAULT_IMAGES.restaurant }} 
        style={styles.image} 
      />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>
            {restaurant.name}
          </Text>
          <View style={styles.rating}>
            <Star size={12} color="#FFB800" fill="#FFB800" />
            <Text style={styles.ratingText}>{restaurant.rating}</Text>
          </View>
        </View>
        
        <View style={styles.bottomRow}>
          <Text style={styles.cuisine} numberOfLines={1}>
            {restaurant.cuisine} • {restaurant.priceRange}
          </Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.locationText} numberOfLines={1}>
            {restaurant.location}
          </Text>
        </View>

        {stats && (stats.saves || stats.visits) && (
          <View style={styles.statsRow}>
            {stats.saves ? <Text style={styles.statText}>{stats.saves} saves</Text> : null}
            {stats.saves && stats.visits && <Text style={styles.dot}>•</Text>}
            {stats.visits ? <Text style={styles.statText}>{stats.visits} visits</Text> : null}
          </View>
        )}
      </View>
    </TouchableOpacity>
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
  image: {
    width: 64,
    height: 64,
    backgroundColor: designTokens.colors.backgroundGray,
  },
  content: {
    flex: 1,
    padding: 8,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  name: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
    flex: 1,
    marginRight: 8,
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
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  cuisine: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
    flexShrink: 0,
  },
  locationText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
    flex: 1,
  },
  dot: {
    fontSize: 12,
    color: designTokens.colors.textLight,
    marginHorizontal: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.primaryOrange,
  },
});