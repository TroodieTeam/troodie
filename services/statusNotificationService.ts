import { supabase } from '@/lib/supabase';
import { notificationService } from './notificationService';
import { adminReviewService } from './adminReviewService';

/**
 * Status Notification Service
 * Handles sending notifications for status changes in claims and applications
 * Task: PS-009
 */

export interface StatusChangeNotificationParams {
  userId: string;
  submissionId: string;
  submissionType: 'restaurant_claim' | 'creator_application';
  newStatus: 'approved' | 'rejected';
  rejectionReason?: string;
  restaurantName?: string;
  reviewNotes?: string;
}

class StatusNotificationService {
  /**
   * Send all notifications for a status change
   */
  async notifyStatusChange(params: StatusChangeNotificationParams) {
    const { userId, submissionId, submissionType, newStatus, rejectionReason, restaurantName } = params;

    try {
      // Create in-app notification
      await this.createInAppNotification(params);

      // Send push notification if enabled
      await this.sendPushNotification(params);

      // Send email notification
      await this.sendEmailNotification(params);

      return {
        success: true,
        message: 'All notifications sent successfully'
      };
    } catch (error) {
      console.error('Error sending status notifications:', error);
      throw error;
    }
  }

  /**
   * Create in-app notification
   */
  private async createInAppNotification(params: StatusChangeNotificationParams) {
    const { userId, submissionId, submissionType, newStatus, rejectionReason, restaurantName } = params;

    const isApproved = newStatus === 'approved';
    const title = isApproved
      ? `🎉 ${submissionType === 'restaurant_claim' ? 'Restaurant Claim' : 'Creator Application'} Approved!`
      : `${submissionType === 'restaurant_claim' ? 'Restaurant Claim' : 'Creator Application'} Update`;

    const message = isApproved
      ? submissionType === 'restaurant_claim'
        ? `Your claim for ${restaurantName || 'the restaurant'} has been approved! You can now manage your restaurant.`
        : 'Welcome to the Troodie Creator Program! You can now access creator features.'
      : `Your submission was not approved. ${rejectionReason ? `Reason: ${rejectionReason}` : 'Please check your email for details.'}`;

    await notificationService.createNotification({
      userId,
      type: `${submissionType}_${newStatus}`,
      title,
      message,
      relatedId: submissionId,
      relatedType: submissionType,
      priority: 2,
      data: {
        submissionId,
        submissionType,
        status: newStatus,
        rejectionReason,
        restaurantName,
        actionUrl: `/my-submissions/${submissionId}`
      }
    });
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(params: StatusChangeNotificationParams) {
    const { userId, submissionId, submissionType, newStatus } = params;

    try {
      // Get user's push tokens
      const { data: pushTokens } = await supabase
        .from('push_tokens')
        .select('token')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (!pushTokens || pushTokens.length === 0) {
        console.log('No push tokens found for user:', userId);
        return;
      }

      const isApproved = newStatus === 'approved';
      const pushTitle = isApproved
        ? '🎉 Application Approved!'
        : 'Application Update';

      const pushBody = isApproved
        ? submissionType === 'restaurant_claim'
          ? 'Your restaurant claim has been approved!'
          : 'Welcome to the Creator Program!'
        : 'Your submission has been reviewed. Tap to see details.';

      // In a production environment, you would send this to your push notification service
      // For now, we'll just log it
      console.log('Would send push notification:', {
        tokens: pushTokens.map(t => t.token),
        title: pushTitle,
        body: pushBody,
        data: {
          submissionId,
          type: submissionType,
          status: newStatus
        }
      });
    } catch (error) {
      console.error('Error sending push notification:', error);
      // Don't throw, as push notification failure shouldn't stop the process
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(params: StatusChangeNotificationParams) {
    const { userId, submissionType, newStatus, rejectionReason, restaurantName, reviewNotes } = params;

    try {
      // Get user email
      const { data: user } = await supabase
        .from('users')
        .select('email, name')
        .eq('id', userId)
        .single();

      if (!user?.email) {
        console.log('No email found for user:', userId);
        return;
      }

      const isApproved = newStatus === 'approved';
      const emailSubject = isApproved
        ? submissionType === 'restaurant_claim'
          ? '🎉 Your Restaurant Claim Has Been Approved!'
          : '🎉 Welcome to the Troodie Creator Program!'
        : `Update on Your ${submissionType === 'restaurant_claim' ? 'Restaurant Claim' : 'Creator Application'}`;

      // In a production environment, you would use an email service like SendGrid, Resend, etc.
      // For now, we'll insert into a notification_emails table that could be processed by a background job
      await supabase.from('notification_emails').insert({
        to_email: user.email,
        to_name: user.name,
        subject: emailSubject,
        template: isApproved ? 'status_approved' : 'status_rejected',
        template_data: {
          userName: user.name,
          type: submissionType,
          restaurantName,
          rejectionReason,
          reviewNotes,
          isApproved,
          actionUrl: `https://app.troodie.com/my-submissions`
        },
        status: 'pending',
        created_at: new Date().toISOString()
      });

      console.log('Email notification queued for:', user.email);
    } catch (error) {
      console.error('Error sending email notification:', error);
      // Don't throw, as email failure shouldn't stop the process
    }
  }

  /**
   * Send notification when admin starts reviewing
   */
  async notifyReviewStarted(userId: string, submissionType: 'restaurant_claim' | 'creator_application') {
    try {
      await notificationService.createNotification({
        userId,
        type: `${submissionType}_review_started`,
        title: 'Your submission is being reviewed',
        message: 'An admin has started reviewing your submission. You should receive a decision soon!',
        relatedType: submissionType,
        priority: 1
      });
    } catch (error) {
      console.error('Error notifying review started:', error);
    }
  }

  /**
   * Send reminder notification for pending items
   */
  async sendPendingReminder(userId: string, submissionType: 'restaurant_claim' | 'creator_application', daysPending: number) {
    try {
      await notificationService.createNotification({
        userId,
        type: `${submissionType}_pending_reminder`,
        title: 'Your submission is still under review',
        message: `Your ${submissionType === 'restaurant_claim' ? 'restaurant claim' : 'creator application'} has been pending for ${daysPending} days. We're working on it and will update you soon!`,
        relatedType: submissionType,
        priority: 1
      });
    } catch (error) {
      console.error('Error sending pending reminder:', error);
    }
  }

  /**
   * Batch send notifications for bulk actions
   */
  async batchNotifyStatusChanges(notifications: StatusChangeNotificationParams[]) {
    const results = {
      sent: 0,
      failed: 0,
      errors: [] as { userId: string; error: string }[]
    };

    for (const notification of notifications) {
      try {
        await this.notifyStatusChange(notification);
        results.sent++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          userId: notification.userId,
          error: error.message || 'Unknown error'
        });
      }
    }

    return results;
  }
}

export const statusNotificationService = new StatusNotificationService();