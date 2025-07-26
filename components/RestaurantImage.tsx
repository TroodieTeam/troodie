import React, { useState } from 'react';
import {
  Image,
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  ImageStyle,
  ViewStyle,
  ImageSourcePropType
} from 'react-native';
import { Image as ImageIcon } from 'lucide-react-native';
import { designTokens } from '@/constants/designTokens';
import { restaurantService } from '@/services/restaurantService';

interface RestaurantImageProps {
  restaurant: any;
  style?: ImageStyle;
  containerStyle?: ViewStyle;
  showLoadingState?: boolean;
  showErrorState?: boolean;
  fallbackSource?: ImageSourcePropType;
}

export function RestaurantImage({
  restaurant,
  style,
  containerStyle,
  showLoadingState = true,
  showErrorState = true,
  fallbackSource
}: RestaurantImageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const imageUrl = restaurantService.getRestaurantImage(restaurant);

  const handleLoadStart = () => {
    setLoading(true);
    setError(false);
  };

  const handleLoadEnd = () => {
    setLoading(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  if (error && showErrorState) {
    return (
      <View style={[styles.container, containerStyle, style]}>
        <View style={styles.errorContainer}>
          <ImageIcon size={32} color={designTokens.colors.textLight} />
          <Text style={styles.errorText}>Image unavailable</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, containerStyle]}>
      <Image
        source={fallbackSource || { uri: imageUrl }}
        style={[styles.image, style]}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
      />
      {loading && showLoadingState && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={designTokens.colors.primaryOrange} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: designTokens.colors.backgroundLight,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: designTokens.colors.backgroundLight,
    padding: designTokens.spacing.lg,
  },
  errorText: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textLight,
    marginTop: designTokens.spacing.sm,
  },
});