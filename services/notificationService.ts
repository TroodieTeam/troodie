import { supabase } from '@/lib/supabase';
import {
    CreateNotificationParams,
    Notification,
    NotificationInsert,
    NotificationServiceInterface,
    PushNotification
} from '@/types/notifications';

export class NotificationService implements NotificationServiceInterface {
  
  /**
   * Create a new notification
   */
  async createNotification(params: CreateNotificationParams): Promise<Notification> {
    const { userId, type, title, message, data, relatedId, relatedType, priority = 1, expiresAt } = params;
    
    const notificationData: NotificationInsert = {
      user_id: userId,
      type,
      title,
      message,
      data: data as any,
      related_id: relatedId,
      related_type: relatedType,
      priority,
      expires_at: expiresAt?.toISOString() || null,
      is_read: false,
      is_actioned: false
    };

    const { data: notification, error } = await supabase
      .from('notifications')
      .insert(notificationData)
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      throw new Error(`Failed to create notification: ${error.message}`);
    }

    return notification;
  }

  /**
   * Get user notifications with pagination
   */
  async getUserNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching notifications:', error);
      throw new Error(`Failed to fetch notifications: ${error.message}`);
    }

    return notifications || [];
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      throw new Error(`Failed to mark notification as read: ${error.message}`);
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      throw new Error(`Failed to mark all notifications as read: ${error.message}`);
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      console.error('Error deleting notification:', error);
      throw new Error(`Failed to delete notification: ${error.message}`);
    }
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    const { data, error } = await supabase
      .rpc('get_unread_notification_count', { user_uuid: userId });

    if (error) {
      console.error('Error getting unread count:', error);
      throw new Error(`Failed to get unread count: ${error.message}`);
    }

    return data || 0;
  }

  /**
   * Send push notification to a user
   */
  async sendPushNotification(userId: string, notification: PushNotification): Promise<void> {
    // Get user's push tokens
    const { data: tokens, error: tokenError } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (tokenError) {
      console.error('Error fetching push tokens:', tokenError);
      throw new Error(`Failed to fetch push tokens: ${tokenError.message}`);
    }

    if (!tokens || tokens.length === 0) {
      console.log('No push tokens found for user:', userId);
      return;
    }

    // Send push notification to all user's devices
    const pushTokens = tokens.map(t => t.token);
    await this.sendBulkPushNotifications(pushTokens, notification);
  }

  /**
   * Send bulk notifications to multiple users
   */
  async sendBulkNotifications(userIds: string[], notificationData: CreateNotificationParams): Promise<void> {
    const notifications: NotificationInsert[] = userIds.map(userId => ({
      user_id: userId,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      data: notificationData.data as any,
      related_id: notificationData.relatedId,
      related_type: notificationData.relatedType,
      priority: notificationData.priority || 1,
      expires_at: notificationData.expiresAt?.toISOString() || null,
      is_read: false,
      is_actioned: false
    }));

    const { error } = await supabase
      .from('notifications')
      .insert(notifications);

    if (error) {
      console.error('Error creating bulk notifications:', error);
      throw new Error(`Failed to create bulk notifications: ${error.message}`);
    }
  }

  /**
   * Send bulk push notifications to multiple tokens
   */
  async sendBulkPushNotifications(tokens: string[], notification: PushNotification): Promise<void> {
    // This would integrate with a push notification service like Expo Notifications
    // For now, we'll log the notification
    console.log('Sending push notifications to tokens:', tokens);
    console.log('Notification:', notification);
    
    // TODO: Implement actual push notification sending
    // This would typically use Expo Notifications or a similar service
  }

  /**
   * Create like notification
   */
  async createLikeNotification(
    postOwnerId: string,
    likerId: string,
    likerName: string,
    restaurantName: string,
    postId: string,
    likerAvatar?: string
  ): Promise<Notification> {
    return this.createNotification({
      userId: postOwnerId,
      type: 'like',
      title: 'New Like',
      message: `${likerName} liked your post about ${restaurantName}`,
      data: {
        postId,
        likerId,
        likerName,
        restaurantName,
        likerAvatar
      },
      relatedId: postId,
      relatedType: 'post'
    });
  }

  /**
   * Create comment notification
   */
  async createCommentNotification(
    postOwnerId: string,
    commenterId: string,
    commenterName: string,
    commentPreview: string,
    postId: string,
    commentId: string,
    restaurantName?: string,
    commenterAvatar?: string
  ): Promise<Notification> {
    return this.createNotification({
      userId: postOwnerId,
      type: 'comment',
      title: 'New Comment',
      message: `${commenterName} commented: "${commentPreview}"`,
      data: {
        postId,
        commentId,
        commenterId,
        commenterName,
        commentPreview,
        restaurantName,
        commenterAvatar
      },
      relatedId: postId,
      relatedType: 'post'
    });
  }

  /**
   * Create follow notification
   */
  async createFollowNotification(
    followedUserId: string,
    followerId: string,
    followerName: string,
    followerAvatar?: string
  ): Promise<Notification> {
    return this.createNotification({
      userId: followedUserId,
      type: 'follow',
      title: 'New Follower',
      message: `${followerName} started following you`,
      data: {
        followerId,
        followerName,
        followerAvatar
      },
      relatedId: followerId,
      relatedType: 'user'
    });
  }

  /**
   * Create achievement notification
   */
  async createAchievementNotification(
    userId: string,
    achievementId: string,
    achievementName: string,
    achievementDescription: string,
    points: number,
    icon?: string
  ): Promise<Notification> {
    return this.createNotification({
      userId,
      type: 'achievement',
      title: 'Achievement Unlocked! 🎉',
      message: `You've earned the "${achievementName}" badge`,
      data: {
        achievementId,
        achievementName,
        achievementDescription,
        points,
        icon
      },
      relatedId: achievementId,
      relatedType: 'achievement'
    });
  }

  /**
   * Create restaurant recommendation notification
   */
  async createRestaurantRecommendationNotification(
    userId: string,
    restaurantId: string,
    restaurantName: string,
    distance: number,
    cuisine: string,
    rating: number,
    photoUrl?: string
  ): Promise<Notification> {
    return this.createNotification({
      userId,
      type: 'restaurant_recommendation',
      title: 'New Spot Near You',
      message: `${restaurantName} just opened ${distance} miles away`,
      data: {
        restaurantId,
        restaurantName,
        distance,
        cuisine,
        rating,
        photoUrl
      },
      relatedId: restaurantId,
      relatedType: 'restaurant'
    });
  }

  /**
   * Create board invite notification
   */
  async createBoardInviteNotification(
    inviteeId: string,
    boardId: string,
    boardName: string,
    inviterId: string,
    inviterName: string,
    inviterAvatar?: string
  ): Promise<Notification> {
    return this.createNotification({
      userId: inviteeId,
      type: 'board_invite',
      title: 'Board Invitation',
      message: `${inviterName} invited you to join "${boardName}"`,
      data: {
        boardId,
        boardName,
        inviterId,
        inviterName,
        inviterAvatar
      },
      relatedId: boardId,
      relatedType: 'board'
    });
  }

  /**
   * Create post mention notification
   */
  async createPostMentionNotification(
    mentionedUserId: string,
    postId: string,
    mentionerId: string,
    mentionerName: string,
    restaurantName?: string,
    mentionerAvatar?: string
  ): Promise<Notification> {
    return this.createNotification({
      userId: mentionedUserId,
      type: 'post_mention',
      title: 'You were mentioned',
      message: `${mentionerName} mentioned you in a post${restaurantName ? ` about ${restaurantName}` : ''}`,
      data: {
        postId,
        mentionerId,
        mentionerName,
        restaurantName,
        mentionerAvatar
      },
      relatedId: postId,
      relatedType: 'post'
    });
  }

  /**
   * Create milestone notification
   */
  async createMilestoneNotification(
    userId: string,
    milestoneType: string,
    milestoneValue: number,
    milestoneTitle: string,
    milestoneDescription: string
  ): Promise<Notification> {
    return this.createNotification({
      userId,
      type: 'milestone',
      title: 'Milestone Reached! 🎯',
      message: milestoneDescription,
      data: {
        milestoneType,
        milestoneValue,
        milestoneTitle,
        milestoneDescription
      },
      relatedId: milestoneType,
      relatedType: 'milestone'
    });
  }

  /**
   * Create system notification
   */
  async createSystemNotification(
    userId: string,
    title: string,
    message: string,
    action?: string,
    url?: string,
    metadata?: Record<string, any>
  ): Promise<Notification> {
    return this.createNotification({
      userId,
      type: 'system',
      title,
      message,
      data: {
        action,
        url,
        metadata
      }
    });
  }
}

// Export singleton instance
export const notificationService = new NotificationService(); 