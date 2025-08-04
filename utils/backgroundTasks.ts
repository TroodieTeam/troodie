import { IntelligentCoverPhotoService } from '@/services/intelligentCoverPhotoService';
import { AppState, AppStateStatus } from 'react-native';

export class BackgroundTaskManager {
  private static instance: BackgroundTaskManager;
  private coverPhotoService: IntelligentCoverPhotoService;
  private appState: AppStateStatus = AppState.currentState;
  private appStateSubscription: any;
  private updateInterval: NodeJS.Timeout | null = null;
  
  private constructor() {
    this.coverPhotoService = IntelligentCoverPhotoService.getInstance();
    this.setupAppStateListener();
  }

  static getInstance(): BackgroundTaskManager {
    if (!this.instance) {
      this.instance = new BackgroundTaskManager();
    }
    return this.instance;
  }

  private setupAppStateListener() {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange
    );
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (
      this.appState.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      // App has come to the foreground
      this.startBackgroundTasks();
    } else if (
      this.appState === 'active' &&
      nextAppState.match(/inactive|background/)
    ) {
      // App has gone to the background
      this.stopBackgroundTasks();
    }
    this.appState = nextAppState;
  };

  startBackgroundTasks() {
    // Start periodic cover photo updates
    this.startCoverPhotoUpdates();
  }

  stopBackgroundTasks() {
    // Stop periodic updates
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  private startCoverPhotoUpdates() {
    // Run immediately on startup
    this.runCoverPhotoUpdate();

    // Then run every 30 minutes
    this.updateInterval = setInterval(() => {
      this.runCoverPhotoUpdate();
    }, 30 * 60 * 1000); // 30 minutes
  }

  private async runCoverPhotoUpdate() {
    try {
      console.log('Starting background cover photo update...');
      
      // Batch update restaurants with missing or default covers
      const updatedCount = await this.coverPhotoService.batchUpdateRestaurantCovers(20);
      
      if (updatedCount > 0) {
        console.log(`Updated ${updatedCount} restaurant cover photos`);
      }
    } catch (error) {
      console.error('Error in background cover photo update:', error);
    }
  }

  /**
   * Manually trigger a cover photo update for specific restaurant
   */
  async updateRestaurantCover(restaurantId: string, forceUpdate: boolean = false) {
    try {
      const result = await this.coverPhotoService.updateRestaurantCoverPhoto(
        restaurantId,
        forceUpdate
      );
      
      if (result.success) {
        console.log(`Successfully updated cover photo for restaurant ${restaurantId}`);
      }
      
      return result;
    } catch (error) {
      console.error(`Error updating cover for restaurant ${restaurantId}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  cleanup() {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
    this.stopBackgroundTasks();
  }
}