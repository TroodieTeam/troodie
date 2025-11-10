import { useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

interface OptimisticMutationOptions<TInput, TResult> {
  mutationFn: (input: TInput) => Promise<TResult>;
  onOptimisticUpdate: (input: TInput) => void;
  onSuccess?: (result: TResult, input: TInput) => void;
  onError: (error: Error, input: TInput) => void;
  onRevert: (input: TInput) => void;
  dedupKey?: (input: TInput) => string;
  enableHaptics?: boolean;
}

/**
 * Hook for optimistic mutations with proper error handling and deduplication
 *
 * @example
 * const { mutate, isLoading } = useOptimisticMutation({
 *   mutationFn: (postId: string) => postService.toggleLike(postId, userId),
 *   onOptimisticUpdate: (postId) => {
 *     setIsLiked(prev => !prev);
 *     setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
 *   },
 *   onSuccess: (result) => {
 *     setLikesCount(result.likes_count);
 *   },
 *   onError: () => {
 *     ToastService.showError('Failed to update');
 *   },
 *   onRevert: () => {
 *     setIsLiked(prev => !prev);
 *     setLikesCount(prev => isLiked ? prev + 1 : prev - 1);
 *   },
 *   dedupKey: (postId) => `like-${postId}`,
 *   enableHaptics: true
 * });
 */
export function useOptimisticMutation<TInput, TResult>({
  mutationFn,
  onOptimisticUpdate,
  onSuccess,
  onError,
  onRevert,
  dedupKey,
  enableHaptics = true
}: OptimisticMutationOptions<TInput, TResult>) {
  const [isLoading, setIsLoading] = useState(false);
  const activeRequests = useRef(new Map<string, Promise<TResult>>());
  const isMutating = useRef(false);

  const mutate = useCallback(async (input: TInput): Promise<TResult | null> => {
    // Prevent duplicate requests
    const key = dedupKey?.(input);
    if (key && activeRequests.current.has(key)) {
      return activeRequests.current.get(key)!;
    }

    // Prevent concurrent mutations
    if (isMutating.current) {
      return null;
    }

    isMutating.current = true;
    setIsLoading(true);

    // Haptic feedback for iOS
    if (enableHaptics && Platform.OS === 'ios') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // Haptics might not be available on all devices
        console.debug('Haptics not available:', error);
      }
    }

    // Optimistic update
    onOptimisticUpdate(input);

    const promise = mutationFn(input)
      .then(result => {
        onSuccess?.(result, input);
        return result;
      })
      .catch(error => {
        console.error('Mutation error:', error);
        onRevert(input);
        onError(error, input);
        throw error;
      })
      .finally(() => {
        setIsLoading(false);
        isMutating.current = false;
        if (key) {
          activeRequests.current.delete(key);
        }
      });

    if (key) {
      activeRequests.current.set(key, promise);
    }

    return promise.catch(() => null); // Return null on error
  }, [mutationFn, onOptimisticUpdate, onSuccess, onError, onRevert, dedupKey, enableHaptics]);

  return {
    mutate,
    isLoading,
    isMutating: isMutating.current
  };
}
