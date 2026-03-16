import { designTokens } from '@/constants/designTokens';
import { NotificationItemProps } from '@/types/notifications';
import {
    AtSign,
    Bell,
    Briefcase,
    Calendar,
    CheckCircle,
    ClipboardCheck,
    CreditCard,
    Heart,
    MapPin,
    MessageCircle,
    Newspaper,
    RefreshCw,
    Send,
    Settings,
    Star,
    Target,
    Trash2,
    Trophy,
    UserPlus,
    Users,
    XCircle
} from 'lucide-react-native';
import React, { useCallback, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

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

const NotificationItemInner: React.FC<NotificationItemProps> = ({
  notification,
  onPress,
  onSwipeDelete
}) => {
  const swipeableRef = useRef<Swipeable>(null);

  const handleDelete = useCallback(() => {
    swipeableRef.current?.close();
    onSwipeDelete?.(notification.id);
  }, [onSwipeDelete, notification.id]);

  const renderRightActions = (_progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0.5],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity
        testID={`notification-delete-${notification.type}`}
        style={styles.deleteAction}
        onPress={handleDelete}
        activeOpacity={0.7}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Trash2 size={20} color="#FFFFFF" />
        </Animated.View>
      </TouchableOpacity>
    );
  };
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
      case 'post_liked': return Heart;
      case 'comment':
      case 'post_commented': return MessageCircle;
      case 'follow':
      case 'new_follower': return UserPlus;
      case 'achievement': return Trophy;
      case 'restaurant_recommendation':
      case 'restaurant_mention': return MapPin;
      case 'board_invite': return Users;
      case 'post_mention':
      case 'mentioned_in_post':
      case 'mentioned_in_comment': return AtSign;
      case 'milestone': return Target;
      case 'system': return Settings;
      case 'campaign_opportunity':
      case 'new_campaign_posted': return Briefcase;
      case 'campaign_application':
      case 'campaign_application_submitted': return ClipboardCheck;
      case 'application_approved': return CheckCircle;
      case 'application_rejected': return XCircle;
      case 'revision_requested': return RefreshCw;
      case 'campaign_deadline':
      case 'campaign_deadline_approaching': return Calendar;
      case 'deliverable_submitted':
      case 'deliverables_submitted': return Send;
      case 'payment_sent':
      case 'payment_received': return CreditCard;
      case 'campaign_invite': return Star;
      case 'friend_post':
      case 'friend_post_restaurant': return Newspaper;
      case 'weekly_recap': return Trophy;
      default: return Bell;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'like':
      case 'post_liked': return '#FF4444';
      case 'comment':
      case 'post_commented': return '#3B82F6';
      case 'follow':
      case 'new_follower': return '#10B981';
      case 'achievement': return '#F59E0B';
      case 'restaurant_recommendation':
      case 'restaurant_mention': return '#8B5CF6';
      case 'board_invite': return '#06B6D4';
      case 'post_mention':
      case 'mentioned_in_post':
      case 'mentioned_in_comment': return '#EC4899';
      case 'milestone': return '#84CC16';
      case 'system': return '#6B7280';
      case 'campaign_opportunity':
      case 'new_campaign_posted': return '#3B82F6';
      case 'campaign_application':
      case 'campaign_application_submitted': return '#2563EB';
      case 'application_approved': return '#10B981';
      case 'application_rejected': return '#EF4444';
      case 'revision_requested': return '#F59E0B';
      case 'campaign_deadline':
      case 'campaign_deadline_approaching': return '#F59E0B';
      case 'deliverable_submitted':
      case 'deliverables_submitted': return '#6366F1';
      case 'payment_sent':
      case 'payment_received': return '#059669';
      case 'campaign_invite': return '#8B5CF6';
      case 'friend_post':
      case 'friend_post_restaurant': return '#EC4899';
      case 'weekly_recap': return '#F97316';
      default: return designTokens.colors.primaryOrange;
    }
  };

  const Icon = getNotificationIcon(notification.type);
  const iconColor = getNotificationColor(notification.type);

  const handlePress = useCallback(() => {
    onPress(notification);
  }, [onPress, notification]);

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={onSwipeDelete ? renderRightActions : undefined}
      overshootRight={false}
      rightThreshold={40}
    >
      <TouchableOpacity
        testID={`notification-item-${notification.type}`}
        style={[
          styles.notificationItem,
          !notification.is_read && styles.unreadNotification
        ]}
        onPress={handlePress}
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

        {!notification.is_read && <View testID={`notification-unread-dot-${notification.type}`} style={styles.unreadDot} />}
      </TouchableOpacity>
    </Swipeable>
  );
};

export const NotificationItem = React.memo(NotificationItemInner);

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
  },
  deleteAction: {
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  }
}); 