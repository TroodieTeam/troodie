import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface SubscriptionConfig {
  table: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  schema?: string;
}

interface SubscriptionOptions {
  /**
   * User ID to ignore events from (prevents self-override)
   */
  ignoreUserId?: string;

  /**
   * Timestamp field to check for freshness
   */
  timestampField?: string;

  /**
   * Only process events newer than this timestamp
   */
  minTimestamp?: number;
}

/**
 * Centralized real-time subscription manager
 * Prevents self-override and handles timestamp-based conflict resolution
 */
class RealtimeManager {
  private channels = new Map<string, RealtimeChannel>();
  private subscriptions = new Map<string, Set<(data: any, eventType: string) => void>>();

  /**
   * Subscribe to real-time database changes
   *
   * @example
   * const unsubscribe = realtimeManager.subscribe(
   *   'post-stats-123',
   *   { table: 'posts', event: 'UPDATE', filter: 'id=eq.123' },
   *   (data, eventType) => {
   *     console.log('Post updated:', data);
   *   },
   *   { ignoreUserId: currentUserId }
   * );
   */
  subscribe<T = any>(
    channelName: string,
    config: SubscriptionConfig,
    callback: (data: T, eventType: string, metadata?: any) => void,
    options: SubscriptionOptions = {}
  ): () => void {
    const { ignoreUserId, timestampField, minTimestamp } = options;

    // Get or create channel
    let channel = this.channels.get(channelName);
    if (!channel) {
      channel = supabase.channel(channelName);
      this.channels.set(channelName, channel);
    }

    // Get or create subscription set
    let callbacks = this.subscriptions.get(channelName);
    if (!callbacks) {
      callbacks = new Set();
      this.subscriptions.set(channelName, callbacks);
    }

    // Wrapper callback with filtering logic
    const wrappedCallback = (payload: any) => {
      const eventType = payload.eventType;
      // For DELETE events, use payload.old; for INSERT/UPDATE, use payload.new
      const data = eventType === 'DELETE' ? payload.old : payload.new;

      // Filter: Ignore events from specific user
      if (ignoreUserId) {
        // Check various user ID fields
        const eventUserId = data?.user_id || data?.added_by || data?.actor_id || data?.follower_id;
        if (eventUserId === ignoreUserId) {
          return;
        }
      }

      // Filter: Only process events newer than minTimestamp
      // NOTE: If timestampField is provided but eventTimestamp is missing/null,
      // we still process the event (for trigger-based updates that might not update timestamps)
      if (timestampField && minTimestamp && minTimestamp > 0) {
        const eventTimestamp = data?.[timestampField];
        if (eventTimestamp) {
          const eventTime = new Date(eventTimestamp).getTime();
          if (eventTime <= minTimestamp) {
            return;
          }
        }
        // If timestampField is missing but minTimestamp is set, we still process
        // (this allows trigger-based updates to come through)
      }

      // Call the actual callback with full payload metadata
      if (__DEV__) {
        console.log(`[realtimeManager] Calling callback - eventType: ${payload.eventType}, table: ${table}, data:`, {
          id: data?.id,
          post_id: data?.post_id,
          user_id: data?.user_id,
        });
      }
      callback(data, eventType, { payload, eventType: payload.eventType });
    };

    // Add to callbacks set
    callbacks.add(wrappedCallback);

    // Subscribe to channel if not already subscribed
    if (callbacks.size === 1) {
      channel
        .on(
          'postgres_changes',
          {
            event: config.event,
            schema: config.schema || 'public',
            table: config.table,
            filter: config.filter
          },
          wrappedCallback
        )
        .subscribe();
    }

    // Return unsubscribe function
    return () => {
      callbacks?.delete(wrappedCallback);

      // If no more callbacks, remove channel
      if (callbacks && callbacks.size === 0) {
        const channel = this.channels.get(channelName);
        if (channel) {
          supabase.removeChannel(channel);
          this.channels.delete(channelName);
          this.subscriptions.delete(channelName);
        }
      }
    };
  }

  /**
   * Unsubscribe from a specific channel
   */
  unsubscribe(channelName: string) {
    const channel = this.channels.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
      this.subscriptions.delete(channelName);
    }
  }

  /**
   * Unsubscribe from all channels (useful on logout)
   */
  unsubscribeAll() {
    this.channels.forEach((channel) => {
      supabase.removeChannel(channel);
    });

    this.channels.clear();
    this.subscriptions.clear();
  }

  /**
   * Get active channel count (for debugging)
   */
  getActiveChannelCount(): number {
    return this.channels.size;
  }

  /**
   * Get active channels (for debugging)
   */
  getActiveChannels(): string[] {
    return Array.from(this.channels.keys());
  }
}

export const realtimeManager = new RealtimeManager();
