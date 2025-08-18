import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { designTokens } from '@/constants/designTokens';

interface LoadingSkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = designTokens.borderRadius.sm,
  style,
}) => {
  const shimmerAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnimation, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const translateX = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  return (
    <View style={[styles.container, { width, height, borderRadius }, style]}>
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={[
            'rgba(255, 255, 255, 0)',
            'rgba(255, 255, 255, 0.3)',
            'rgba(255, 255, 255, 0)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        />
      </Animated.View>
    </View>
  );
};

export const RestaurantCardSkeleton: React.FC = () => {
  return (
    <View style={styles.cardContainer}>
      <LoadingSkeleton height={200} borderRadius={designTokens.borderRadius.lg} />
      <View style={styles.cardContent}>
        <LoadingSkeleton width="70%" height={24} style={styles.spacing} />
        <LoadingSkeleton width="50%" height={16} style={styles.spacing} />
        <View style={styles.row}>
          <LoadingSkeleton width={60} height={16} style={styles.spacing} />
          <LoadingSkeleton width={40} height={16} style={styles.spacing} />
          <LoadingSkeleton width={80} height={16} style={styles.spacing} />
        </View>
      </View>
    </View>
  );
};

export const RestaurantCardCompactSkeleton: React.FC = () => {
  return (
    <View style={styles.compactCardContainer}>
      <LoadingSkeleton width={64} height={64} borderRadius={0} />
      <View style={styles.compactCardContent}>
        <View style={styles.compactTopRow}>
          <LoadingSkeleton width="60%" height={14} />
          <LoadingSkeleton width={40} height={12} />
        </View>
        <View style={styles.compactBottomRow}>
          <LoadingSkeleton width={80} height={12} />
          <LoadingSkeleton width={60} height={12} style={{ marginLeft: 8 }} />
        </View>
      </View>
    </View>
  );
};

export const RestaurantCardWithSaveSkeleton: React.FC = () => {
  return (
    <View style={styles.verticalCardContainer}>
      <LoadingSkeleton width="100%" height={140} borderRadius={0} />
      <View style={styles.verticalCardContent}>
        <View style={styles.verticalMainInfo}>
          <LoadingSkeleton width="70%" height={14} style={{ marginBottom: 2 }} />
          <LoadingSkeleton width="50%" height={12} style={{ marginBottom: 4 }} />
          <View style={styles.verticalDetailsRow}>
            <LoadingSkeleton width={50} height={11} />
            <LoadingSkeleton width={80} height={11} style={{ marginLeft: 8 }} />
          </View>
        </View>
        <LoadingSkeleton width={24} height={24} borderRadius={12} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: designTokens.colors.backgroundGray,
    overflow: 'hidden',
  },
  shimmer: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    flex: 1,
  },
  cardContainer: {
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.lg,
    overflow: 'hidden',
    marginBottom: designTokens.spacing.lg,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
  },
  cardContent: {
    padding: designTokens.spacing.lg,
  },
  spacing: {
    marginBottom: designTokens.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: designTokens.spacing.md,
  },
  compactCardContainer: {
    flexDirection: 'row',
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.sm,
    overflow: 'hidden',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
  },
  compactCardContent: {
    flex: 1,
    padding: 8,
    justifyContent: 'center',
  },
  compactTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  compactBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verticalCardContainer: {
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
  verticalCardContent: {
    padding: designTokens.spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  verticalMainInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  verticalDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
});