import { Image } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';

export interface ImageQualityMetrics {
  width: number;
  height: number;
  aspectRatio: number;
  fileSize: number;
  brightness: number;
  sharpness: number;
  hasGoodComposition: boolean;
  qualityScore: number;
  isValidCoverPhoto: boolean;
}

export interface CoverPhotoCandidate {
  imageUrl: string;
  qualityScore: number;
  metrics: ImageQualityMetrics;
  engagementScore: number;
  recencyScore: number;
  totalScore: number;
}

export class ImageQualityAnalyzer {
  private static readonly MIN_WIDTH = 800;
  private static readonly MIN_HEIGHT = 600;
  private static readonly IDEAL_ASPECT_RATIO = 16 / 9;
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  static async analyzeImage(imageUrl: string): Promise<ImageQualityMetrics | null> {
    try {
      // Get image dimensions
      const dimensions = await this.getImageDimensions(imageUrl);
      if (!dimensions) return null;

      // Download image temporarily for analysis
      const localUri = await this.downloadImage(imageUrl);
      if (!localUri) return null;

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      const fileSize = fileInfo.size || 0;

      // Analyze image properties
      const brightness = await this.calculateBrightness(localUri);
      const sharpness = await this.calculateSharpness(localUri);
      const hasGoodComposition = this.checkComposition(dimensions.width, dimensions.height);

      // Calculate quality score
      const qualityScore = this.calculateQualityScore({
        width: dimensions.width,
        height: dimensions.height,
        fileSize,
        brightness,
        sharpness,
        hasGoodComposition
      });

      // Clean up temporary file
      await FileSystem.deleteAsync(localUri, { idempotent: true });

      const aspectRatio = dimensions.width / dimensions.height;
      const isValidCoverPhoto = this.isValidForCoverPhoto(dimensions.width, dimensions.height, qualityScore);

      return {
        width: dimensions.width,
        height: dimensions.height,
        aspectRatio,
        fileSize,
        brightness,
        sharpness,
        hasGoodComposition,
        qualityScore,
        isValidCoverPhoto
      };
    } catch (error) {
      console.error('Error analyzing image:', error);
      return null;
    }
  }

  private static getImageDimensions(uri: string): Promise<{ width: number; height: number } | null> {
    return new Promise((resolve) => {
      Image.getSize(
        uri,
        (width, height) => resolve({ width, height }),
        () => resolve(null)
      );
    });
  }

  private static async downloadImage(imageUrl: string): Promise<string | null> {
    try {
      const filename = imageUrl.split('/').pop() || 'temp_image.jpg';
      const localUri = `${FileSystem.cacheDirectory}${filename}`;
      const downloadResult = await FileSystem.downloadAsync(imageUrl, localUri);
      return downloadResult.uri;
    } catch (error) {
      console.error('Error downloading image:', error);
      return null;
    }
  }

  private static async calculateBrightness(localUri: string): Promise<number> {
    try {
      // Resize image for faster processing
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        localUri,
        [{ resize: { width: 100 } }],
        { format: ImageManipulator.SaveFormat.JPEG }
      );

      // This is a simplified brightness calculation
      // In a real implementation, you'd analyze pixel data
      // For now, we'll return a normalized value
      return 0.7; // Placeholder - would need native module for actual pixel analysis
    } catch (error) {
      console.error('Error calculating brightness:', error);
      return 0.5;
    }
  }

  private static async calculateSharpness(localUri: string): Promise<number> {
    // Simplified sharpness calculation
    // In production, you'd use edge detection algorithms
    return 0.75; // Placeholder value
  }

  private static checkComposition(width: number, height: number): boolean {
    const aspectRatio = width / height;
    
    // Check if aspect ratio is reasonable for a cover photo
    const isGoodAspectRatio = aspectRatio >= 1.2 && aspectRatio <= 2.0;
    
    // Check if resolution is sufficient
    const hasGoodResolution = width >= this.MIN_WIDTH && height >= this.MIN_HEIGHT;
    
    return isGoodAspectRatio && hasGoodResolution;
  }

  private static calculateQualityScore(metrics: {
    width: number;
    height: number;
    fileSize: number;
    brightness: number;
    sharpness: number;
    hasGoodComposition: boolean;
  }): number {
    let score = 0;

    // Resolution score (30%)
    const resolutionScore = Math.min(
      (metrics.width * metrics.height) / (1920 * 1080),
      1
    ) * 0.3;
    score += resolutionScore;

    // File size score (10%) - penalize very large files
    const fileSizeScore = metrics.fileSize <= this.MAX_FILE_SIZE ? 0.1 : 0.05;
    score += fileSizeScore;

    // Brightness score (20%)
    const brightnessScore = Math.abs(metrics.brightness - 0.6) < 0.3 ? 0.2 : 0.1;
    score += brightnessScore;

    // Sharpness score (20%)
    score += metrics.sharpness * 0.2;

    // Composition score (20%)
    score += metrics.hasGoodComposition ? 0.2 : 0;

    return Math.min(score, 1);
  }

  private static isValidForCoverPhoto(width: number, height: number, qualityScore: number): boolean {
    return width >= this.MIN_WIDTH && 
           height >= this.MIN_HEIGHT && 
           qualityScore >= 0.6;
  }

  static selectBestCoverPhoto(candidates: CoverPhotoCandidate[]): CoverPhotoCandidate | null {
    if (candidates.length === 0) return null;

    // Sort by total score (combination of quality, engagement, and recency)
    const sorted = candidates.sort((a, b) => b.totalScore - a.totalScore);
    
    // Return the best candidate
    return sorted[0];
  }

  static calculateTotalScore(
    qualityScore: number,
    engagementScore: number,
    recencyScore: number
  ): number {
    // Weighted combination:
    // - Quality: 40%
    // - Engagement: 40%
    // - Recency: 20%
    return (qualityScore * 0.4) + (engagementScore * 0.4) + (recencyScore * 0.2);
  }

  static normalizeEngagementScore(likeCount: number, viewCount: number, maxLikes: number, maxViews: number): number {
    if (maxLikes === 0 && maxViews === 0) return 0.5;
    
    const normalizedLikes = maxLikes > 0 ? likeCount / maxLikes : 0;
    const normalizedViews = maxViews > 0 ? viewCount / maxViews : 0;
    
    // Likes are weighted more heavily than views
    return (normalizedLikes * 0.7) + (normalizedViews * 0.3);
  }

  static calculateRecencyScore(uploadedAt: Date): number {
    const now = new Date();
    const daysSinceUpload = (now.getTime() - uploadedAt.getTime()) / (1000 * 60 * 60 * 24);
    
    // Score decreases exponentially with age
    // Images older than 90 days get minimal recency score
    return Math.exp(-daysSinceUpload / 30);
  }
}