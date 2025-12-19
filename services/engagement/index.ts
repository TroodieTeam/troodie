/**
 * Unified Engagement Service
 * 
 * Single source of truth for all engagement operations:
 * - Likes
 * - Comments
 * - Saves
 * - Shares
 * 
 * Usage:
 * ```typescript
 * import { engagementService } from '@/services/engagement';
 * 
 * // Like operations
 * await engagementService.likes.toggle(postId, userId);
 * await engagementService.likes.isLiked(postId, userId);
 * await engagementService.likes.getCount(postId);
 * 
 * // Comment operations
 * await engagementService.comments.create(postId, userId, content);
 * await engagementService.comments.delete(commentId, postId);
 * await engagementService.comments.listTopLevel(postId, { limit: 20 });
 * 
 * // Save operations
 * await engagementService.saves.toggle(postId, userId, boardId?);
 * await engagementService.saves.isSaved(postId, userId);
 * 
 * // Share operations
 * await engagementService.shares.share(postId, userId, title, restaurantName);
 * await engagementService.shares.copyLink(postId, userId);
 * 
 * // Batch operations
 * const stats = await engagementService.getEngagementStats(postId, userId);
 * const batchStats = await engagementService.batchGetEngagementStats(postIds, userId);
 * ```
 */

export { EngagementCache } from './cache';
export { CommentsManager } from './CommentsManager';
export { LikesManager } from './LikesManager';
export { SavesManager } from './SavesManager';
export { SharesManager } from './SharesManager';
export * from './types';
export { UnifiedEngagementService, engagementService } from './UnifiedEngagementService';

