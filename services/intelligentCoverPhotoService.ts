import { supabase } from '@/lib/supabase';
import { ImageQualityAnalyzer, CoverPhotoCandidate } from '@/utils/imageQualityAnalysis';

export interface RestaurantImage {
  id: string;
  restaurant_id: string;
  image_url: string;
  quality_score: number | null;
  like_count: number;
  view_count: number;
  uploaded_at: string;
  is_cover_photo: boolean;
  source: string;
  privacy: string;
  is_approved: boolean;
}

export interface CoverPhotoUpdateResult {
  success: boolean;
  newCoverUrl?: string;
  reason?: string;
  error?: string;
}

export class IntelligentCoverPhotoService {
  private static instance: IntelligentCoverPhotoService;
  private updateQueue: Set<string> = new Set();
  private isProcessing: boolean = false;

  private constructor() {}

  static getInstance(): IntelligentCoverPhotoService {
    if (!this.instance) {
      this.instance = new IntelligentCoverPhotoService();
    }
    return this.instance;
  }

  /**
   * Analyzes and updates cover photo for a single restaurant
   */
  async updateRestaurantCoverPhoto(
    restaurantId: string,
    forceUpdate: boolean = false
  ): Promise<CoverPhotoUpdateResult> {
    try {
      // Check if restaurant has manual cover or auto-cover disabled
      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .select('cover_photo_url, has_manual_cover, auto_cover_enabled')
        .eq('id', restaurantId)
        .single();

      if (restaurantError) {
        throw restaurantError;
      }

      if (!restaurant.auto_cover_enabled || (restaurant.has_manual_cover && !forceUpdate)) {
        return {
          success: false,
          reason: 'Auto-cover disabled or manual cover set'
        };
      }

      // Get all restaurant images
      const { data: images, error: imagesError } = await supabase
        .from('restaurant_images')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('privacy', 'public')
        .eq('is_approved', true);

      if (imagesError) {
        throw imagesError;
      }

      if (!images || images.length === 0) {
        return {
          success: false,
          reason: 'No images available for cover photo'
        };
      }

      // Analyze images that haven't been analyzed recently
      const imagesToAnalyze = images.filter(img => 
        !img.quality_score || 
        !img.last_analyzed_at ||
        new Date(img.last_analyzed_at) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days
      );

      // Analyze images in batches to avoid overloading
      const analysisPromises = imagesToAnalyze.slice(0, 5).map(async (image) => {
        const metrics = await ImageQualityAnalyzer.analyzeImage(image.image_url);
        if (metrics) {
          await this.updateImageQualityMetrics(image.id, metrics);
          return { ...image, quality_score: metrics.qualityScore };
        }
        return image;
      });

      const analyzedImages = await Promise.all(analysisPromises);

      // Combine analyzed images with already scored images
      const allImages = [
        ...analyzedImages,
        ...images.filter(img => img.quality_score && !imagesToAnalyze.includes(img))
      ];

      // Select best cover photo
      const bestCandidate = await this.selectBestCoverPhoto(allImages);

      if (!bestCandidate) {
        return {
          success: false,
          reason: 'No suitable cover photo found'
        };
      }

      // Check if update is needed
      const shouldUpdate = this.shouldUpdateCover(
        restaurant.cover_photo_url,
        bestCandidate.imageUrl,
        bestCandidate.totalScore,
        forceUpdate
      );

      if (!shouldUpdate) {
        return {
          success: false,
          reason: 'Current cover photo is already optimal'
        };
      }

      // Update restaurant cover photo
      const { error: updateError } = await supabase
        .from('restaurants')
        .update({
          cover_photo_url: bestCandidate.imageUrl,
          cover_photo_source: 'auto_selected',
          cover_photo_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', restaurantId);

      if (updateError) {
        throw updateError;
      }

      // Mark the selected image as cover
      await supabase
        .from('restaurant_images')
        .update({
          is_cover_photo: true,
          is_auto_selected: true,
          selection_reason: this.getSelectionReason(bestCandidate)
        })
        .eq('restaurant_id', restaurantId)
        .eq('image_url', bestCandidate.imageUrl);

      // Unmark previous auto-selected covers
      await supabase
        .from('restaurant_images')
        .update({ is_cover_photo: false })
        .eq('restaurant_id', restaurantId)
        .eq('is_auto_selected', true)
        .neq('image_url', bestCandidate.imageUrl);

      return {
        success: true,
        newCoverUrl: bestCandidate.imageUrl,
        reason: this.getSelectionReason(bestCandidate)
      };
    } catch (error) {
      console.error('Error updating restaurant cover photo:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Batch process restaurants without covers
   */
  async batchUpdateRestaurantCovers(limit: number = 50): Promise<number> {
    try {
      // Find restaurants needing cover updates
      const { data: restaurants, error } = await supabase
        .from('restaurants')
        .select('id')
        .or('cover_photo_url.is.null,cover_photo_url.like.%placeholder%,cover_photo_url.like.%default%')
        .eq('auto_cover_enabled', true)
        .limit(limit);

      if (error) {
        throw error;
      }

      if (!restaurants || restaurants.length === 0) {
        return 0;
      }

      let updatedCount = 0;

      // Process restaurants in parallel batches
      const batchSize = 5;
      for (let i = 0; i < restaurants.length; i += batchSize) {
        const batch = restaurants.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map(r => this.updateRestaurantCoverPhoto(r.id))
        );
        updatedCount += results.filter(r => r.success).length;
      }

      return updatedCount;
    } catch (error) {
      console.error('Error in batch update:', error);
      return 0;
    }
  }

  /**
   * Queue a restaurant for cover photo update
   */
  queueRestaurantForUpdate(restaurantId: string): void {
    this.updateQueue.add(restaurantId);
    this.processQueue();
  }

  /**
   * Process queued updates
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.updateQueue.size === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const restaurantId = this.updateQueue.values().next().value;
      this.updateQueue.delete(restaurantId);

      await this.updateRestaurantCoverPhoto(restaurantId);

      // Continue processing if more items in queue
      if (this.updateQueue.size > 0) {
        setTimeout(() => this.processQueue(), 1000); // Delay to avoid rate limiting
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Select best cover photo from candidates
   */
  private async selectBestCoverPhoto(images: RestaurantImage[]): Promise<CoverPhotoCandidate | null> {
    if (images.length === 0) return null;

    // Calculate max engagement metrics for normalization
    const maxLikes = Math.max(...images.map(img => img.like_count || 0), 1);
    const maxViews = Math.max(...images.map(img => img.view_count || 0), 1);

    // Create candidates with scores
    const candidates: CoverPhotoCandidate[] = images
      .filter(img => img.quality_score && img.quality_score >= 0.5)
      .map(img => {
        const qualityScore = img.quality_score || 0.5;
        const engagementScore = ImageQualityAnalyzer.normalizeEngagementScore(
          img.like_count || 0,
          img.view_count || 0,
          maxLikes,
          maxViews
        );
        const recencyScore = ImageQualityAnalyzer.calculateRecencyScore(
          new Date(img.uploaded_at)
        );
        const totalScore = ImageQualityAnalyzer.calculateTotalScore(
          qualityScore,
          engagementScore,
          recencyScore
        );

        return {
          imageUrl: img.image_url,
          qualityScore,
          metrics: {} as any, // Will be populated if needed
          engagementScore,
          recencyScore,
          totalScore
        };
      });

    return ImageQualityAnalyzer.selectBestCoverPhoto(candidates);
  }

  /**
   * Update image quality metrics in database
   */
  private async updateImageQualityMetrics(imageId: string, metrics: any): Promise<void> {
    await supabase
      .from('restaurant_images')
      .update({
        quality_score: metrics.qualityScore,
        width: metrics.width,
        height: metrics.height,
        aspect_ratio: metrics.aspectRatio,
        last_analyzed_at: new Date().toISOString()
      })
      .eq('id', imageId);
  }

  /**
   * Determine if cover should be updated
   */
  private shouldUpdateCover(
    currentCover: string | null,
    newCover: string,
    newScore: number,
    forceUpdate: boolean
  ): boolean {
    if (forceUpdate) return true;
    
    if (!currentCover || 
        currentCover.includes('placeholder') || 
        currentCover.includes('default')) {
      return true;
    }

    // Update if new photo is significantly better (30% improvement)
    return newScore > 0.7;
  }

  /**
   * Get human-readable selection reason
   */
  private getSelectionReason(candidate: CoverPhotoCandidate): string {
    if (candidate.qualityScore >= 0.8 && candidate.engagementScore >= 0.7) {
      return 'High quality with strong engagement';
    }
    if (candidate.qualityScore >= 0.8) {
      return 'High quality image';
    }
    if (candidate.engagementScore >= 0.8) {
      return 'Popular with users';
    }
    if (candidate.recencyScore >= 0.8) {
      return 'Recently uploaded';
    }
    return 'Best available option';
  }

  /**
   * Handle new post with images
   */
  async handleNewPostImages(postId: string, restaurantId: string): Promise<void> {
    try {
      // Wait a moment for post processing to complete
      setTimeout(async () => {
        // Check if any new high-quality images were added
        const { data: images } = await supabase
          .from('restaurant_images')
          .select('quality_score')
          .eq('post_id', postId)
          .eq('privacy', 'public')
          .eq('is_approved', true);

        if (images && images.length > 0) {
          // Queue restaurant for cover photo update
          this.queueRestaurantForUpdate(restaurantId);
        }
      }, 2000);
    } catch (error) {
      console.error('Error handling new post images:', error);
    }
  }
}