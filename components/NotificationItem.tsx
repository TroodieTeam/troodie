import { designTokens } from '@/constants/designTokens';
import { NotificationItemProps } from '@/types/notifications';
import {
    AtSign,
    Bell,
    Heart,
    MapPin,
    MessageCircle,
    Settings,
    Target,
    Trophy,
    UserPlus,
    Users
} from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const formatRelativeTime = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
};

export const NotificationItem: React.FC<NotificationItemProps> = ({ 
  notification, 
  onPress, 
  onSwipeDelete 
}) => {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like': return Heart;
      case 'comment': return MessageCircle;
      case 'follow': return UserPlus;
      case 'achievement': return Trophy;
      case 'restaurant_recommendation': return MapPin;
      case 'board_invite': return Users;
      case 'post_mention': return AtSign;
      case 'milestone': return Target;
      case 'system': return Settings;
      default: return Bell;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'like': return '#FF4444';
      case 'comment': return '#3B82F6';
      case 'follow': return '#10B981';
      case 'achievement': return '#F59E0B';
      case 'restaurant_recommendation': return '#8B5CF6';
      case 'board_invite': return '#06B6D4';
      case 'post_mention': return '#EC4899';
      case 'milestone': return '#84CC16';
      case 'system': return '#6B7280';
      default: return designTokens.colors.primaryOrange;
    }
  };

  const Icon = getNotificationIcon(notification.type);
  const iconColor = getNotificationColor(notification.type);

  return (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !notification.is_read && styles.unreadNotification
      ]}
      onPress={() => onPress(notification)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
        <Icon size={20} color={iconColor} />
      </View>
      
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {notification.title}
        </Text>
        <Text style={styles.message} numberOfLines={2}>
          {notification.message}
        </Text>
        <Text style={styles.time}>
          {formatRelativeTime(notification.created_at)}
        </Text>
      </View>
      
      {!notification.is_read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: designTokens.spacing.lg,
    backgroundColor: designTokens.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.borderLight,
    position: 'relative'
  },
  unreadNotification: {
    backgroundColor: `${designTokens.colors.primaryOrange}08`
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: designTokens.spacing.md
  },
  content: {
    flex: 1,
    justifyContent: 'center'
  },
  title: {
    ...designTokens.typography.bodyMedium,
    color: designTokens.colors.textDark,
    marginBottom: designTokens.spacing.xs
  },
  message: {
    ...designTokens.typography.bodyRegular,
    color: designTokens.colors.textMedium,
    marginBottom: designTokens.spacing.xs,
    lineHeight: 20
  },
  time: {
    ...designTokens.typography.smallText,
    color: designTokens.colors.textLight
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: designTokens.colors.primaryOrange,
    position: 'absolute',
    top: designTokens.spacing.lg + 6,
    right: designTokens.spacing.lg
  }
}); 