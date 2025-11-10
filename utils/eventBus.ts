type EventCallback = (...args: any[]) => void;

class EventBus {
  private events: Map<string, Set<EventCallback>> = new Map();

  on(event: string, callback: EventCallback): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    
    this.events.get(event)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.events.get(event);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.events.delete(event);
        }
      }
    };
  }

  emit(event: string, ...args: any[]): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  off(event: string, callback?: EventCallback): void {
    if (!callback) {
      // Remove all listeners for this event
      this.events.delete(event);
    } else {
      const callbacks = this.events.get(event);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.events.delete(event);
        }
      }
    }
  }
}

export const eventBus = new EventBus();

// Event names
export const EVENTS = {
  RESTAURANT_SAVED: 'restaurant_saved',
  RESTAURANT_UNSAVED: 'restaurant_unsaved',
  BOARD_UPDATED: 'board_updated',
  QUICK_SAVES_UPDATED: 'quick_saves_updated',
  PROFILE_IMAGE_UPDATED: 'profile_image_updated',
  USER_BLOCKED: 'user_blocked',
  USER_UNBLOCKED: 'user_unblocked',
  COMMUNITY_POST_CREATED: 'community_post_created',
  COMMUNITY_POST_DELETED: 'community_post_deleted',
  COMMUNITY_POST_UPDATED: 'community_post_updated',
  POST_ENGAGEMENT_CHANGED: 'post_engagement_changed',
} as const;