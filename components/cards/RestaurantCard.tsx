import { designTokens } from '@/constants/designTokens';
import { DEFAULT_IMAGES } from '@/constants/images';
import { RestaurantInfo } from '@/types/core';
import { CheckCircle, Star } from 'lucide-react-native';
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
  isFavorited?: boolean;
  isVisited?: boolean;
  testID?: string;
}

export function RestaurantCard({ restaurant, onPress, stats, compact = false, showRating = false, isFavorited = false, isVisited = false, testID }: RestaurantCardProps) {
  // Always use compact horizontal layout for better space efficiency
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
      testID={testID}
    >
      <Image
        source={{ uri: restaurant.image || DEFAULT_IMAGES.restaurant }}
        style={styles.image}
      />
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {restaurant.name}
        </Text>

        <Text style={styles.cuisine} numberOfLines={1}>
          {restaurant.cuisine} • {restaurant.priceRange}
        </Text>

        <Text style={styles.locationText} numberOfLines={1}>
          {restaurant.location}
        </Text>

        {stats && (stats.saves || stats.visits) && (
          <View style={styles.statsRow}>
            {stats.saves ? <Text style={styles.statText}>{stats.saves} saves</Text> : null}
            {stats.saves && stats.visits && <Text style={styles.dot}>•</Text>}
            {stats.visits ? <Text style={styles.statText}>{stats.visits} visits</Text> : null}
          </View>
        )}
      </View>

      <View style={styles.rightColumn}>
        <View style={styles.rating}>
          <Star size={12} color="#FFB800" fill="#FFB800" />
          <Text style={styles.ratingText}>{restaurant.rating}</Text>
        </View>
        {/* Favorite and Visited Status */}
        {isFavorited && (
          <View style={styles.favoriteChip}>
            <Star size={10} color={designTokens.colors.primaryOrange} fill={designTokens.colors.primaryOrange} />
            <Text style={styles.favoriteText}>Favorited</Text>
          </View>
        )}
        {isVisited && (
          <View style={styles.visitedChip}>
            <CheckCircle size={10} color="#10B981" fill="#fff" />
            <Text style={styles.visitedText}>Visited</Text>
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
    width: 85,
    height: 85,
    backgroundColor: designTokens.colors.backgroundLight,
  },
  content: {
    flex: 1,
    padding: 12,
    paddingRight: 80,
    justifyContent: 'center',
  },
  name: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: designTokens.colors.textDark,
    marginBottom: 4,
  },
  rightColumn: {
    position: 'absolute',
    right: 8,
    top: 8,
    bottom: 8,
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 4,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.textDark,
  },

  cuisine: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
    marginBottom: 3,
  },
  locationText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: designTokens.colors.textMedium,
    marginBottom: 3,
  },
  dot: {
    fontSize: 12,
    color: designTokens.colors.textLight,
    marginHorizontal: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 3,
  },
  favoriteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: designTokens.colors.backgroundLight,
    borderWidth: 1,
    borderColor: designTokens.colors.primaryOrange,
  },
  visitedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: designTokens.colors.backgroundLight,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  favoriteText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: designTokens.colors.primaryOrange,
  },
  visitedText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: '#10B981',
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