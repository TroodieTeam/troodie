import { supabase } from '@/lib/supabase';
import ShareService from '@/services/shareService';
import * as Clipboard from 'expo-clipboard';
import { EngagementCache } from './cache';

/**
 * Manages all share-related operations
 * Handles native sharing, link copying, and analytics tracking
 */
export class SharesManager {
  constructor(private cache: EngagementCache) {}

  /**
   * Share a post using native share sheet
   */
  async share(
    postId: string,
    userId: string | null,
    postTitle: string,
    restaurantName: string,
    postCaption?: string,
    tags?: string[]
  ): Promise<{ success: boolean; platform?: string }> {
    try {
      // Use ShareService for consistent sharing with proper deep links
      const result = await ShareService.share({
        type: 'post',
        id: postId,
        title: restaurantName || 'Amazing food discovery',
        description: postCaption || postTitle || undefined,
        tags: tags || undefined
      });

      if (result.success) {
        // Track the share
        await this.trackShare(postId, userId, result.action || 'native_share');
        
        // Update cache optimistically
        this.cache.updateShareCount?.(postId, 1);

        return { success: true, platform: result.action || 'native_share' };
      } else if (result.action === 'dismissed') {
        return { success: false };
      }

      return { success: result.success };
    } catch (error) {
      console.error('[SharesManager] Error sharing post:', error);
      return { success: false };
    }
  }

  /**
   * Copy post link to clipboard
   */
  async copyLink(postId: string, userId: string | null): Promise<boolean> {
    try {
      const baseUrl = 'https://troodie.app';
      const webLink = `${baseUrl}/posts/${postId}`;

      await Clipboard.setStringAsync(webLink);

      // Track the share
      await this.trackShare(postId, userId, 'copy_link');

      // Update cache optimistically
      this.cache.updateShareCount?.(postId, 1);

      return true;
    } catch (error) {
      console.error('[SharesManager] Error copying link:', error);
      return false;
    }
  }

  /**
   * Get share count for a post
   * Calculates from actual data (single source of truth)
   */
  async getCount(postId: string): Promise<number> {
    const { count, error } = await supabase
      .from('share_analytics')
      .select('*', { count: 'exact', head: true })
      .eq('content_type', 'post')
      .eq('content_id', postId);

    if (error) {
      console.error('[SharesManager] Error getting share count:', error);
      return 0;
    }

    const countValue = count || 0;
    // Note: Share count caching would need to be added to EngagementCache
    return countValue;
  }

  /**
   * Batch get share counts for multiple posts
   */
  async batchGetCounts(postIds: string[]): Promise<Map<string, number>> {
    const result = new Map<string, number>();

    // Use parallel queries for better performance
    const promises = postIds.map(async (postId) => {
      const count = await this.getCount(postId);
      return { postId, count };
    });

    const results = await Promise.all(promises);
    results.forEach(({ postId, count }) => {
      result.set(postId, count);
    });

    return result;
  }

  /**
   * Track share analytics (internal)
   */
  private async trackShare(
    postId: string,
    userId: string | null,
    platform: string
  ): Promise<void> {
    try {
      await supabase.from('share_analytics').insert({
        user_id: userId,
        content_type: 'post',
        content_id: postId,
        platform
      });
    } catch (error) {
      console.error('[SharesManager] Error tracking share:', error);
      // Don't throw - tracking failures shouldn't break the share flow
    }
  }
}
