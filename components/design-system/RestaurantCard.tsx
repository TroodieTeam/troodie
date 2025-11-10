/**
 * RESTAURANT CARD COMPONENT
 * Design System Compliant v3.0
 * Used in 23+ screens across the app
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Star, MapPin, DollarSign, Bookmark, BookmarkCheck } from 'lucide-react-native';
import { DS } from './tokens';

// ============================================
// TYPES
// ============================================
export interface RestaurantCardProps {
  // Data
  id: string;
  name: string;
  image?: string;
  cuisine?: string;
  rating?: number;
  reviewCount?: number;
  priceRange?: string;
  distance?: string;
  neighborhood?: string;
  
  // State
  isSaved?: boolean;
  isNew?: boolean;
  
  // Actions
  onPress?: () => void;
  onSave?: () => void;
  
  // Variants
  variant?: 'default' | 'compact' | 'horizontal';
  showSaveButton?: boolean;
  
  // Style
  style?: ViewStyle;
  testID?: string;
}

// ============================================
// COMPONENT
// ============================================
export const RestaurantCard = memo(({
  id,
  name,
  image,
  cuisine = 'Restaurant',
  rating = 0,
  reviewCount = 0,
  priceRange = '$$',
  distance,
  neighborhood,
  isSaved = false,
  isNew = false,
  onPress,
  onSave,
  variant = 'default',
  showSaveButton = true,
  style,
  testID,
}: RestaurantCardProps) => {
  
  // Render rating stars
  const renderRating = () => {
    if (!rating) return null;
    
    return (
      <View style={styles.ratingContainer}>
        <Star size={12} color={DS.colors.warning} fill={DS.colors.warning} />
        <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
        {reviewCount > 0 && (
          <Text style={styles.reviewCount}>({reviewCount})</Text>
        )}
      </View>
    );
  };
  
  // Render price range
  const renderPrice = () => {
    if (!priceRange) return null;
    const maxDollars = 4;
    const activeDollars = priceRange.length;
    
    return (
      <View style={styles.priceContainer}>
        {[...Array(maxDollars)].map((_, index) => (
          <DollarSign
            key={index}
            size={12}
            color={index < activeDollars ? DS.colors.textDark : DS.colors.borderLight}
          />
        ))}
      </View>
    );
  };
  
  // Handle save button press
  const handleSave = () => {
    if (onSave) {
      onSave();
    }
  };
  
  // Different layouts based on variant
  if (variant === 'horizontal') {
    return (
      <TouchableOpacity
        style={[styles.containerHorizontal, style]}
        onPress={onPress}
        activeOpacity={0.8}
        testID={testID}
      >
        <Image
          source={{ uri: image || 'https://via.placeholder.com/120' }}
          style={styles.imageHorizontal}
        />
        <View style={styles.contentHorizontal}>
          <View style={styles.headerRow}>
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
            {isNew && <View style={styles.newBadge}><Text style={styles.newText}>NEW</Text></View>}
          </View>
          <Text style={styles.cuisine} numberOfLines={1}>{cuisine}</Text>
          <View style={styles.metaRow}>
            {renderRating()}
            {renderPrice()}
            {distance && (
              <View style={styles.distanceContainer}>
                <MapPin size={10} color={DS.colors.textGray} />
                <Text style={styles.distance}>{distance}</Text>
              </View>
            )}
          </View>
        </View>
        {showSaveButton && (
          <TouchableOpacity
            style={styles.saveButtonHorizontal}
            onPress={handleSave}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {isSaved ? (
              <BookmarkCheck size={20} color={DS.colors.primaryOrange} />
            ) : (
              <Bookmark size={20} color={DS.colors.textGray} />
            )}
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  }
  
  // Default vertical card
  return (
    <TouchableOpacity
      style={[
        variant === 'compact' ? styles.containerCompact : styles.container,
        style
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      testID={testID}
    >
      {/* Image */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: image || 'https://via.placeholder.com/200' }}
          style={variant === 'compact' ? styles.imageCompact : styles.image}
        />
        {showSaveButton && (
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={styles.saveButtonBackground}>
              {isSaved ? (
                <BookmarkCheck size={16} color={DS.colors.primaryOrange} />
              ) : (
                <Bookmark size={16} color={DS.colors.textDark} />
              )}
            </View>
          </TouchableOpacity>
        )}
        {isNew && (
          <View style={styles.newBadgeOverlay}>
            <Text style={styles.newTextOverlay}>NEW</Text>
          </View>
        )}
      </View>
      
      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={variant === 'compact' ? 1 : 2}>
          {name}
        </Text>
        <Text style={styles.cuisine} numberOfLines={1}>
          {cuisine}
        </Text>
        <View style={styles.metaContainer}>
          {renderRating()}
          {renderPrice()}
        </View>
        {(distance || neighborhood) && (
          <View style={styles.locationContainer}>
            <MapPin size={10} color={DS.colors.textGray} />
            <Text style={styles.location} numberOfLines={1}>
              {distance && neighborhood ? `${distance} · ${neighborhood}` : distance || neighborhood}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

RestaurantCard.displayName = 'RestaurantCard';

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  // Default vertical card
  container: {
    backgroundColor: DS.colors.surface,
    borderRadius: DS.borderRadius.lg,
    overflow: 'hidden',
    ...DS.shadows.sm,
  },
  containerCompact: {
    backgroundColor: DS.colors.surface,
    borderRadius: DS.borderRadius.md,
    overflow: 'hidden',
    ...DS.shadows.sm,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 160,
    backgroundColor: DS.colors.surfaceLight,
  },
  imageCompact: {
    width: '100%',
    height: 120,
    backgroundColor: DS.colors.surfaceLight,
  },
  content: {
    padding: DS.spacing.md,
  },
  name: {
    ...DS.typography.h3,
    color: DS.colors.textDark,
    marginBottom: DS.spacing.xxs,
  },
  cuisine: {
    ...DS.typography.metadata,
    color: DS.colors.textGray,
    marginBottom: DS.spacing.xs,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing.md,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing.xxs,
  },
  ratingText: {
    ...DS.typography.metadata,
    color: DS.colors.textDark,
    fontWeight: '600',
  },
  reviewCount: {
    ...DS.typography.metadata,
    color: DS.colors.textGray,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing.xxs,
    marginTop: DS.spacing.xs,
  },
  location: {
    ...DS.typography.metadata,
    color: DS.colors.textGray,
    flex: 1,
  },
  
  // Save button
  saveButton: {
    position: 'absolute',
    top: DS.spacing.sm,
    right: DS.spacing.sm,
  },
  saveButtonBackground: {
    backgroundColor: DS.colors.surface,
    borderRadius: DS.borderRadius.full,
    padding: DS.spacing.sm,
    ...DS.shadows.sm,
  },
  
  // New badge
  newBadgeOverlay: {
    position: 'absolute',
    top: DS.spacing.sm,
    left: DS.spacing.sm,
    backgroundColor: DS.colors.success,
    paddingHorizontal: DS.spacing.sm,
    paddingVertical: DS.spacing.xxs,
    borderRadius: DS.borderRadius.xs,
  },
  newTextOverlay: {
    ...DS.typography.caption,
    color: DS.colors.textWhite,
    fontWeight: '600',
  },
  newBadge: {
    backgroundColor: DS.colors.success,
    paddingHorizontal: DS.spacing.xs,
    paddingVertical: DS.spacing.xxs,
    borderRadius: DS.borderRadius.xs,
  },
  newText: {
    ...DS.typography.caption,
    color: DS.colors.textWhite,
    fontWeight: '600',
  },
  
  // Horizontal variant
  containerHorizontal: {
    flexDirection: 'row',
    backgroundColor: DS.colors.surface,
    borderRadius: DS.borderRadius.lg,
    padding: DS.spacing.md,
    ...DS.shadows.sm,
  },
  imageHorizontal: {
    width: 80,
    height: 80,
    borderRadius: DS.borderRadius.md,
    backgroundColor: DS.colors.surfaceLight,
  },
  contentHorizontal: {
    flex: 1,
    marginLeft: DS.spacing.md,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing.md,
    marginTop: DS.spacing.xs,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing.xxs,
  },
  distance: {
    ...DS.typography.metadata,
    color: DS.colors.textGray,
  },
  saveButtonHorizontal: {
    justifyContent: 'center',
    paddingLeft: DS.spacing.md,
  },
});

export default RestaurantCard;