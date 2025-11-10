/**
 * SKELETON LOADER COMPONENTS
 * Design System Compliant v3.0
 * Consistent loading states across all screens
 */

import React, { memo, useEffect, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  ViewStyle,
  Dimensions,
} from 'react-native';
import { DS } from './tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// TYPES
// ============================================
export interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export interface SkeletonGroupProps {
  count?: number;
  children?: React.ReactNode;
  style?: ViewStyle;
}

// ============================================
// BASE SKELETON COMPONENT
// ============================================
export const Skeleton = memo(({
  width = '100%',
  height = 20,
  borderRadius = DS.borderRadius.xs,
  style,
}: SkeletonProps) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animatedValue]);
  
  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });
  
  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
});

Skeleton.displayName = 'Skeleton';

// ============================================
// SKELETON GROUP
// ============================================
export const SkeletonGroup = memo(({
  count = 1,
  children,
  style,
}: SkeletonGroupProps) => {
  if (children) {
    return <View style={[styles.group, style]}>{children}</View>;
  }
  
  return (
    <View style={[styles.group, style]}>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} />
      ))}
    </View>
  );
});

SkeletonGroup.displayName = 'SkeletonGroup';

// ============================================
// PRESET SKELETON COMPONENTS
// ============================================

// Restaurant Card Skeleton
export const RestaurantCardSkeleton = memo(() => (
  <View style={styles.restaurantCard}>
    <Skeleton height={160} borderRadius={DS.borderRadius.lg} />
    <View style={styles.restaurantContent}>
      <Skeleton width="70%" height={16} />
      <Skeleton width="40%" height={12} style={{ marginTop: DS.spacing.xs }} />
      <View style={styles.row}>
        <Skeleton width={60} height={12} />
        <Skeleton width={40} height={12} />
      </View>
    </View>
  </View>
));

RestaurantCardSkeleton.displayName = 'RestaurantCardSkeleton';

// Post Card Skeleton
export const PostCardSkeleton = memo(() => (
  <View style={styles.postCard}>
    <View style={styles.postHeader}>
      <Skeleton width={40} height={40} borderRadius={20} />
      <View style={styles.postHeaderText}>
        <Skeleton width={120} height={14} />
        <Skeleton width={80} height={12} style={{ marginTop: DS.spacing.xxs }} />
      </View>
    </View>
    <Skeleton height={200} borderRadius={DS.borderRadius.md} />
    <View style={styles.postContent}>
      <Skeleton width="100%" height={14} />
      <Skeleton width="80%" height={14} style={{ marginTop: DS.spacing.xs }} />
    </View>
    <View style={styles.postActions}>
      <Skeleton width={50} height={24} borderRadius={12} />
      <Skeleton width={50} height={24} borderRadius={12} />
      <Skeleton width={50} height={24} borderRadius={12} />
    </View>
  </View>
));

PostCardSkeleton.displayName = 'PostCardSkeleton';

// User List Item Skeleton
export const UserListItemSkeleton = memo(() => (
  <View style={styles.userListItem}>
    <Skeleton width={48} height={48} borderRadius={24} />
    <View style={styles.userInfo}>
      <Skeleton width={140} height={14} />
      <Skeleton width={100} height={12} style={{ marginTop: DS.spacing.xxs }} />
    </View>
    <Skeleton width={80} height={32} borderRadius={16} />
  </View>
));

UserListItemSkeleton.displayName = 'UserListItemSkeleton';

// Activity Item Skeleton
export const ActivityItemSkeleton = memo(() => (
  <View style={styles.activityItem}>
    <Skeleton width={40} height={40} borderRadius={20} />
    <View style={styles.activityContent}>
      <Skeleton width="90%" height={14} />
      <Skeleton width="60%" height={12} style={{ marginTop: DS.spacing.xxs }} />
    </View>
  </View>
));

ActivityItemSkeleton.displayName = 'ActivityItemSkeleton';

// Text Line Skeleton
export const TextLineSkeleton = memo(({ 
  lines = 3,
  lastLineWidth = '60%' 
}: { 
  lines?: number; 
  lastLineWidth?: string | number;
}) => (
  <SkeletonGroup>
    {Array.from({ length: lines }).map((_, index) => (
      <Skeleton
        key={index}
        width={index === lines - 1 ? lastLineWidth : '100%'}
        height={14}
        style={index > 0 ? { marginTop: DS.spacing.xs } : undefined}
      />
    ))}
  </SkeletonGroup>
));

TextLineSkeleton.displayName = 'TextLineSkeleton';

// Avatar Skeleton
export const AvatarSkeleton = memo(({ 
  size = 40 
}: { 
  size?: number;
}) => (
  <Skeleton 
    width={size} 
    height={size} 
    borderRadius={size / 2} 
  />
));

AvatarSkeleton.displayName = 'AvatarSkeleton';

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: DS.colors.borderLight,
  },
  group: {
    gap: DS.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: DS.spacing.md,
    marginTop: DS.spacing.sm,
  },
  
  // Restaurant Card
  restaurantCard: {
    backgroundColor: DS.colors.surface,
    borderRadius: DS.borderRadius.lg,
    overflow: 'hidden',
    ...DS.shadows.sm,
  },
  restaurantContent: {
    padding: DS.spacing.md,
  },
  
  // Post Card
  postCard: {
    backgroundColor: DS.colors.surface,
    borderRadius: DS.borderRadius.lg,
    padding: DS.spacing.lg,
    ...DS.shadows.sm,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: DS.spacing.md,
  },
  postHeaderText: {
    marginLeft: DS.spacing.md,
    flex: 1,
  },
  postContent: {
    marginTop: DS.spacing.md,
  },
  postActions: {
    flexDirection: 'row',
    gap: DS.spacing.md,
    marginTop: DS.spacing.lg,
  },
  
  // User List Item
  userListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: DS.spacing.md,
    backgroundColor: DS.colors.surface,
  },
  userInfo: {
    flex: 1,
    marginLeft: DS.spacing.md,
  },
  
  // Activity Item
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: DS.spacing.md,
  },
  activityContent: {
    flex: 1,
    marginLeft: DS.spacing.md,
  },
});

export default Skeleton;