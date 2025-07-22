import { Database } from '@/lib/supabase';

// Base notification types from database
export type Notification = Database['public']['Tables']['notifications']['Row'];
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];
export type NotificationUpdate = Database['public']['Tables']['notifications']['Update'];

export type NotificationPreferences = Database['public']['Tables']['notification_preferences']['Row'];
export type NotificationPreferencesInsert = Database['public']['Tables']['notification_preferences']['Insert'];
export type NotificationPreferencesUpdate = Database['public']['Tables']['notification_preferences']['Update'];

export type PushToken = Database['public']['Tables']['push_tokens']['Row'];
export type PushTokenInsert = Database['public']['Tables']['push_tokens']['Insert'];
export type PushTokenUpdate = Database['public']['Tables']['push_tokens']['Update'];

// Notification type enum
export type NotificationType = 
  | 'like' 
  | 'comment' 
  | 'follow' 
  | 'achievement' 
  | 'restaurant_recommendation'
  | 'board_invite' 
  | 'post_mention' 
  | 'milestone' 
  | 'system';

// Notification category enum
export type NotificationCategory = 
  | 'social'
  | 'achievements'
  | 'restaurants'
  | 'boards'
  | 'system';

// Notification frequency enum
export type NotificationFrequency = 'immediate' | 'daily' | 'weekly';

// Platform enum
export type Platform = 'ios' | 'android' | 'web';

// Notification data types for different notification types
export interface LikeNotificationData {
  postId: string;
  likerId: string;
  likerName: string;
  restaurantName: string;
  likerAvatar?: string;
}

export interface CommentNotificationData {
  postId: string;
  commentId: string;
  commenterId: string;
  commenterName: string;
  commentPreview: string;
  commenterAvatar?: string;
  restaurantName?: string;
}

export interface FollowNotificationData {
  followerId: string;
  followerName: string;
  followerAvatar?: string;
}

export interface AchievementNotificationData {
  achievementId: string;
  achievementName: string;
  achievementDescription: string;
  points: number;
  icon?: string;
}

export interface RestaurantRecommendationData {
  restaurantId: string;
  restaurantName: string;
  distance: number;
  cuisine: string;
  rating: number;
  photoUrl?: string;
}

export interface BoardInviteData {
  boardId: string;
  boardName: string;
  inviterId: string;
  inviterName: string;
  inviterAvatar?: string;
}

export interface PostMentionData {
  postId: string;
  mentionerId: string;
  mentionerName: string;
  mentionerAvatar?: string;
  restaurantName?: string;
}

export interface MilestoneData {
  milestoneType: string;
  milestoneValue: number;
  milestoneTitle: string;
  milestoneDescription: string;
}

export interface SystemNotificationData {
  action?: string;
  url?: string;
  metadata?: Record<string, any>;
}

// Union type for all notification data
export type NotificationData = 
  | LikeNotificationData
  | CommentNotificationData
  | FollowNotificationData
  | AchievementNotificationData
  | RestaurantRecommendationData
  | BoardInviteData
  | PostMentionData
  | MilestoneData
  | SystemNotificationData;

// Notification creation interface
export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: NotificationData;
  relatedId?: string;
  relatedType?: string;
  priority?: number;
  expiresAt?: Date;
}

// Push notification interface
export interface PushNotification {
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: string;
  badge?: number;
  category?: string;
}

// Notification preferences interface
export interface UserNotificationPreferences {
  social: {
    push_enabled: boolean;
    in_app_enabled: boolean;
    email_enabled: boolean;
    frequency: NotificationFrequency;
  };
  achievements: {
    push_enabled: boolean;
    in_app_enabled: boolean;
    email_enabled: boolean;
    frequency: NotificationFrequency;
  };
  restaurants: {
    push_enabled: boolean;
    in_app_enabled: boolean;
    email_enabled: boolean;
    frequency: NotificationFrequency;
  };
  boards: {
    push_enabled: boolean;
    in_app_enabled: boolean;
    email_enabled: boolean;
    frequency: NotificationFrequency;
  };
  system: {
    push_enabled: boolean;
    in_app_enabled: boolean;
    email_enabled: boolean;
    frequency: NotificationFrequency;
  };
}

// Notification service interface
export interface NotificationServiceInterface {
  createNotification(params: CreateNotificationParams): Promise<Notification>;
  getUserNotifications(userId: string, limit?: number): Promise<Notification[]>;
  markAsRead(notificationId: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
  deleteNotification(notificationId: string): Promise<void>;
  getUnreadCount(userId: string): Promise<number>;
  sendPushNotification(userId: string, notification: PushNotification): Promise<void>;
  sendBulkNotifications(userIds: string[], notificationData: CreateNotificationParams): Promise<void>;
}

// Push notification service interface
export interface PushNotificationServiceInterface {
  registerDevice(userId: string, token: string, platform: Platform): Promise<void>;
  unregisterDevice(userId: string, token: string): Promise<void>;
  sendPushNotification(token: string, notification: PushNotification): Promise<void>;
  sendBulkPushNotifications(tokens: string[], notification: PushNotification): Promise<void>;
  handleNotificationReceived(notification: any): Promise<void>;
  handleNotificationOpened(notification: any): Promise<void>;
}

// Notification preferences service interface
export interface NotificationPreferencesServiceInterface {
  getUserPreferences(userId: string): Promise<UserNotificationPreferences>;
  updatePreferences(userId: string, preferences: Partial<UserNotificationPreferences>): Promise<void>;
  isNotificationEnabled(userId: string, category: NotificationCategory): Promise<boolean>;
  getNotificationFrequency(userId: string, category: NotificationCategory): Promise<NotificationFrequency>;
  updatePushToken(userId: string, token: string, platform: Platform): Promise<void>;
}

// Notification component props
export interface NotificationItemProps {
  notification: Notification;
  onPress: (notification: Notification) => void;
  onSwipeDelete?: (notificationId: string) => void;
}

export interface NotificationBadgeProps {
  count: number;
  size?: 'small' | 'medium' | 'large';
}

export interface NotificationCenterProps {
  onClose: () => void;
  onNotificationPress: (notification: Notification) => void;
}

export interface NotificationSettingsProps {
  preferences: UserNotificationPreferences;
  onPreferencesChange: (preferences: Partial<UserNotificationPreferences>) => void;
  onSave: () => void;
  loading?: boolean;
} 