import { designTokens } from '@/constants/designTokens';
import { NotificationBadgeProps } from '@/types/notifications';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({ 
  count, 
  size = 'medium' 
}) => {
  if (count === 0) {
    return null;
  }

  const getBadgeSize = () => {
    switch (size) {
      case 'small':
        return {
          width: 16,
          height: 16,
          fontSize: 10,
          borderRadius: 8
        };
      case 'large':
        return {
          width: 24,
          height: 24,
          fontSize: 14,
          borderRadius: 12
        };
      default: // medium
        return {
          width: 20,
          height: 20,
          fontSize: 12,
          borderRadius: 10
        };
    }
  };

  const badgeSize = getBadgeSize();
  const displayCount = count > 99 ? '99+' : count.toString();

  return (
    <View style={[
      styles.badge,
      {
        width: badgeSize.width,
        height: badgeSize.height,
        borderRadius: badgeSize.borderRadius
      }
    ]}>
      <Text style={[
        styles.badgeText,
        { fontSize: badgeSize.fontSize }
      ]}>
        {displayCount}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: designTokens.colors.primaryOrange,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 16,
    ...designTokens.shadows.card
  },
  badgeText: {
    color: designTokens.colors.white,
    fontFamily: designTokens.typography.smallText.fontFamily,
    fontWeight: '600' as const,
    textAlign: 'center'
  }
}); 