import { Notification } from '@/types/notifications';
import { Router } from 'expo-router';

/**
 * Navigate to the appropriate screen when a notification is tapped.
 * Handles all 21 DB notification types plus legacy TypeScript aliases.
 */
export function navigateForNotification(router: Router, notification: Notification): void {
  const data = notification.data && typeof notification.data === 'object'
    ? (notification.data as Record<string, unknown>)
    : null;

  switch (notification.type) {
    // Social — post interactions
    case 'like':
    case 'post_liked':
    case 'comment':
    case 'post_commented':
    case 'post_mention':
    case 'mentioned_in_post':
    case 'mentioned_in_comment':
      if (data?.postId) {
        router.push(`/posts/${data.postId}`);
      }
      break;

    // Social — follows
    case 'follow':
    case 'new_follower':
      if (data?.followerId) {
        router.push(`/user/${data.followerId}`);
      }
      break;

    // Achievements
    case 'achievement':
    case 'milestone':
      router.push('/profile?tab=achievements');
      break;

    // Restaurants
    case 'restaurant_recommendation':
    case 'restaurant_mention':
      if (data?.restaurantId) {
        router.push(`/restaurant/${data.restaurantId}`);
      }
      break;

    // Boards
    case 'board_invite': {
      const boardId = notification.related_id
        || data?.board_id
        || data?.boardId
        || null;
      const invitationId = data?.invitation_id || null;
      if (boardId) {
        if (invitationId) {
          router.push(`/boards/${boardId}?invitation_id=${invitationId}`);
        } else {
          router.push(`/boards/${boardId}`);
        }
      }
      break;
    }

    // Campaigns — discovery
    case 'campaign_opportunity':
    case 'new_campaign_posted':
      router.push('/creator/explore-campaigns');
      break;

    // Campaigns — applications (business side)
    case 'campaign_application':
    case 'campaign_application_submitted':
      if (data?.campaignId) {
        router.push(`/(tabs)/business/campaigns/${data.campaignId}` as any);
      } else {
        router.push('/(tabs)/business/applications' as any);
      }
      break;

    // Campaigns — status updates (creator side)
    case 'application_approved':
    case 'application_rejected':
    case 'campaign_deadline':
    case 'campaign_deadline_approaching':
      if (data?.campaignId) {
        router.push('/creator/campaigns');
      }
      break;

    // Campaigns — revision requests (creator side)
    case 'revision_requested':
      if (data?.campaignId) {
        router.push('/creator/campaigns');
      }
      break;

    // Campaigns — deliverables (business side)
    case 'deliverable_submitted':
    case 'deliverables_submitted':
      if (data?.campaignId) {
        router.push(`/business/campaigns/${data.campaignId}/review-deliverables` as any);
      }
      break;

    // Campaigns — payments
    case 'payment_sent':
    case 'payment_received':
      router.push('/creator/earnings');
      break;

    // Campaigns — invites
    case 'campaign_invite':
      if (data?.campaignId) {
        router.push(`/creator/apply/${data.campaignId}` as any);
      } else {
        router.push('/creator/explore-campaigns');
      }
      break;

    // Engagement
    case 'friend_post':
    case 'friend_post_restaurant':
      if (data?.postId) {
        router.push(`/posts/${data.postId}`);
      }
      break;

    case 'weekly_recap':
      router.push('/(tabs)');
      break;

    default:
      break;
  }
}
