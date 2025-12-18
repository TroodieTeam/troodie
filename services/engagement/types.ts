import { CommentWithUser } from '@/types/post';

/**
 * Result of a toggle operation (like, save, etc.)
 */
export interface ToggleResult {
  success: boolean;
  isLiked?: boolean;
  isSaved?: boolean;
  likesCount?: number;
  savesCount?: number;
  error?: Error;
}

/**
 * Options for optimistic updates
 */
export interface OptimisticUpdateOptions {
  onOptimisticUpdate?: (result: ToggleResult) => void;
  onError?: (error: Error) => void;
}

/**
 * Options for listing comments
 */
export interface ListCommentsOptions {
  limit?: number;
  cursorCreatedAt?: string;
  parentCommentId?: string | null;
}

/**
 * Result of creating a comment
 */
export interface CreateCommentResult {
  success: boolean;
  comment?: CommentWithUser;
  error?: Error;
}

/**
 * Cache entry metadata
 */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}
