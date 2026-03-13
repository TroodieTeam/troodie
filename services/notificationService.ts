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
    
    // Try using the SECURITY DEFINER function first (bypasses RLS)
    const { data: notificationId, error: functionError } = await supabase
      .rpc('create_notification', {
        p_user_id: userId,
        p_type: type,
        p_title: title,
        p_message: message,
        p_data: data || {},
        p_related_id: relatedId || null,
        p_related_type: relatedType || null
      });

    // If function exists and succeeded, fetch the notification
    if (!functionError && notificationId) {
      const { data: notification, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', notificationId)
        .single();

      if (!fetchError && notification) {
        return notification;
      }
    }

    // Fallback to direct insert (for backwards compatibility)
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
  async getUserNotifications(userId: string, limit: number = 50, offset: number = 0): Promise<Notification[]> {
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[NotificationService] Error fetching notifications:', error);
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
   * Note: Push delivery is now handled by the Edge Function triggered on notifications INSERT.
   * This method is retained for the NotificationServiceInterface contract.
   */
  async sendPushNotification(_userId: string, _notification: PushNotification): Promise<void> {
    // Push delivery is handled by the Edge Function (database webhook on notifications INSERT).
    // No client-side push sending needed.
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
   * Note: Push delivery is now handled by the Edge Function triggered on notifications INSERT.
   * This method is retained for the NotificationServiceInterface contract.
   */
  async sendBulkPushNotifications(_tokens: string[], _notification: PushNotification): Promise<void> {
    // Push delivery is handled by the Edge Function (database webhook on notifications INSERT).
    // No client-side push sending needed.
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
   * Create restaurant mention notification
   * Called when a restaurant is mentioned in a comment
   */
  async createRestaurantMentionNotification(
    restaurantOwnerId: string,
    commenterId: string,
    commenterName: string,
    restaurantName: string,
    commentPreview: string,
    postId: string,
    commentId: string,
    commenterAvatar?: string
  ): Promise<Notification> {
    return this.createNotification({
      userId: restaurantOwnerId,
      type: 'restaurant_mention',
      title: 'Restaurant Mentioned',
      message: `${commenterName} mentioned @${restaurantName} in a comment`,
      data: {
        postId,
        commentId,
        commenterId,
        commenterName,
        restaurantName,
        commentPreview,
        commenterAvatar
      },
      relatedId: commentId,
      relatedType: 'comment',
      priority: 2 // Higher priority for restaurant mentions
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

  /**
   * Create payment success notification for business
   */
  async createPaymentSuccessNotification(
    businessId: string,
    campaignId: string,
    campaignTitle: string,
    amountCents: number
  ): Promise<Notification> {
    const amountDollars = (amountCents / 100).toFixed(2);
    return this.createNotification({
      userId: businessId,
      type: 'system',
      title: 'Payment Successful',
      message: `Your payment of $${amountDollars} for "${campaignTitle}" was successful. The campaign is now live!`,
      data: {
        campaignId,
        campaignTitle,
        amountCents,
        amountDollars,
      },
      relatedId: campaignId,
      relatedType: 'campaign',
      priority: 2,
    });
  }

  /**
   * Create payment failed notification for business
   */
  async createPaymentFailedNotification(
    businessId: string,
    campaignId: string,
    campaignTitle: string,
    errorMessage?: string
  ): Promise<Notification> {
    return this.createNotification({
      userId: businessId,
      type: 'system',
      title: 'Payment Failed',
      message: `Payment for "${campaignTitle}" failed. Please update your payment method and try again.`,
      data: {
        campaignId,
        campaignTitle,
        errorMessage,
      },
      relatedId: campaignId,
      relatedType: 'campaign',
      priority: 3,
    });
  }

  /**
   * Create payout received notification for creator
   */
  async createPayoutReceivedNotification(
    creatorId: string,
    deliverableId: string,
    campaignId: string,
    campaignTitle: string,
    amountCents: number
  ): Promise<Notification> {
    const amountDollars = (amountCents / 100).toFixed(2);
    return this.createNotification({
      userId: creatorId,
      type: 'system',
      title: 'Payment Received',
      message: `You received $${amountDollars} for your work on "${campaignTitle}"`,
      data: {
        deliverableId,
        campaignId,
        campaignTitle,
        amountCents,
        amountDollars,
      },
      relatedId: deliverableId,
      relatedType: 'deliverable',
      priority: 2,
    });
  }

  /**
   * Create payout onboarding required notification for creator
   */
  async createPayoutOnboardingRequiredNotification(
    creatorId: string,
    deliverableId: string,
    campaignId: string,
    campaignTitle: string
  ): Promise<Notification> {
    return this.createNotification({
      userId: creatorId,
      type: 'system',
      title: 'Complete Payment Setup',
      message: `To receive payment for "${campaignTitle}", please complete your payment account setup.`,
      data: {
        deliverableId,
        campaignId,
        campaignTitle,
        action: 'onboard_payment',
      },
      relatedId: deliverableId,
      relatedType: 'deliverable',
      priority: 3,
    });
  }

  /**
   * Create payout failed notification for creator
   */
  async createPayoutFailedNotification(
    creatorId: string,
    deliverableId: string,
    campaignId: string,
    campaignTitle: string,
    errorMessage?: string
  ): Promise<Notification> {
    return this.createNotification({
      userId: creatorId,
      type: 'system',
      title: 'Payout Failed',
      message: `Payment for "${campaignTitle}" failed. Our team has been notified and will resolve this shortly.`,
      data: {
        deliverableId,
        campaignId,
        campaignTitle,
        errorMessage,
      },
      relatedId: deliverableId,
      relatedType: 'deliverable',
      priority: 3,
    });
  }

  // =========================================================================
  // Campaign Notification Methods
  // =========================================================================

  /**
   * Create notification for creator about new campaign opportunity
   */
  async createCampaignOpportunityNotification(
    creatorUserId: string,
    campaignId: string,
    restaurantName: string,
    campaignTitle: string
  ): Promise<Notification> {
    return this.createNotification({
      userId: creatorUserId,
      type: 'campaign_opportunity',
      title: 'New Campaign Opportunity!',
      message: `${restaurantName} is looking for creators`,
      data: {
        campaignId,
        restaurantName,
        campaignTitle,
      },
      relatedId: campaignId,
      relatedType: 'campaign',
      priority: 2,
    });
  }

  /**
   * Create notification for restaurant about new campaign applicant
   */
  async createCampaignApplicantNotification(
    restaurantOwnerUserId: string,
    campaignId: string,
    applicationId: string,
    creatorName: string,
    campaignTitle: string
  ): Promise<Notification> {
    return this.createNotification({
      userId: restaurantOwnerUserId,
      type: 'campaign_application',
      title: 'New Campaign Applicant',
      message: `${creatorName} applied to ${campaignTitle}`,
      data: {
        campaignId,
        applicationId,
        creatorName,
        campaignTitle,
      },
      relatedId: applicationId,
      relatedType: 'campaign_application',
      priority: 2,
    });
  }

  /**
   * Notify matching creators about a new campaign
   * Push delivery is handled automatically by the Edge Function on notification INSERT.
   */
  async notifyMatchingCreators(
    campaignId: string,
    restaurantName: string,
    campaignTitle: string,
    campaignCity?: string,
    compensationTypes?: string[]
  ): Promise<{ count: number; error?: string }> {
    try {
      // Find creators matching campaign criteria
      let query = supabase
        .from('creator_profiles')
        .select('user_id')
        .eq('open_to_collabs', true)
        .in('availability_status', ['available', 'busy']);

      if (campaignCity) {
        query = query.or(`location.ilike.%${campaignCity}%,primary_city.ilike.%${campaignCity}%`);
      }

      if (compensationTypes && compensationTypes.length > 0) {
        query = query.overlaps('preferred_compensation', compensationTypes);
      }

      const { data: creators, error: queryError } = await query.limit(100);

      if (queryError) {
        console.error('[NotificationService] Error finding matching creators:', queryError);
        return { count: 0, error: queryError.message };
      }

      if (!creators || creators.length === 0) {
        return { count: 0 };
      }

      // Create in-app notifications for each creator (Edge Function handles push)
      let successCount = 0;
      for (const creator of creators) {
        try {
          await this.createCampaignOpportunityNotification(
            creator.user_id,
            campaignId,
            restaurantName,
            campaignTitle
          );
          successCount++;
        } catch (err) {
          console.error('[NotificationService] Error notifying creator:', creator.user_id, err);
        }
      }

      return { count: successCount };
    } catch (error: any) {
      console.error('[NotificationService] Exception in notifyMatchingCreators:', error);
      return { count: 0, error: error.message };
    }
  }

  /**
   * Notify restaurant owner about new campaign applicant
   * Push delivery is handled automatically by the Edge Function on notification INSERT.
   */
  async notifyRestaurantOfApplicant(
    campaignId: string,
    applicationId: string,
    creatorName: string,
    campaignTitle: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('owner_id, restaurant:restaurants(name)')
        .eq('id', campaignId)
        .single();

      if (campaignError || !campaign) {
        console.error('[NotificationService] Error fetching campaign:', campaignError);
        return { success: false, error: 'Campaign not found' };
      }

      await this.createCampaignApplicantNotification(
        campaign.owner_id,
        campaignId,
        applicationId,
        creatorName,
        campaignTitle
      );

      return { success: true };
    } catch (error: any) {
      console.error('[NotificationService] Error notifying restaurant of applicant:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService(); 