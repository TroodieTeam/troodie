import { supabase } from '@/lib/supabase';
import { AchievementService } from './achievementService';

export interface LocalGem {
  id: string;
  name: string;
  image: string;
  cuisine: string;
  rating: number;
  location: string;
  reviewCount: number;
  isNewlyAdded: boolean;
  popularDishes?: string[];
}

export class LocalGemsService {
  async getLocalGems(limit = 10): Promise<LocalGem[]> {
    // Get restaurants with high ratings but few reviews
    const { data: gems, error } = await supabase
      .from('restaurants')
      .select(`
        id,
        name,
        photos,
        cuisine_types,
        google_rating,
        troodie_rating,
        neighborhood,
        google_reviews_count,
        troodie_reviews_count,
        created_at,
        features
      `)
      .order('google_rating', { ascending: false, nullsFirst: false })
      .or('troodie_reviews_count.is.null,troodie_reviews_count.lt.5')
      .limit(limit);

    if (error) {
      console.error('Error fetching local gems:', error);
      return [];
    }

    // Transform the data
    return gems.map(gem => ({
      id: gem.id,
      name: gem.name,
      image: gem.photos?.[0] || 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800',
      cuisine: gem.cuisine_types?.[0] || 'Restaurant',
      rating: gem.google_rating || gem.troodie_rating || 4.5,
      location: gem.neighborhood || 'Charlotte',
      reviewCount: gem.troodie_reviews_count || 0,
      isNewlyAdded: this.isNewlyAdded(gem.created_at),
      popularDishes: this.extractPopularDishes(gem.features)
    }));
  }

  async getUnreviewedGems(limit = 5): Promise<LocalGem[]> {
    const { data: gems, error } = await supabase
      .from('restaurants')
      .select(`
        id,
        name,
        photos,
        cuisine_types,
        google_rating,
        troodie_rating,
        neighborhood,
        google_reviews_count,
        troodie_reviews_count,
        created_at,
        features
      `)
      .or('troodie_reviews_count.is.null,troodie_reviews_count.eq.0')
      .limit(limit);

    if (error) {
      console.error('Error fetching unreviewed gems:', error);
      return [];
    }

    return gems.map(gem => ({
      id: gem.id,
      name: gem.name,
      image: gem.photos?.[0] || 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800',
      cuisine: gem.cuisine_types?.[0] || 'Restaurant',
      rating: gem.google_rating || gem.troodie_rating || 4.5,
      location: gem.neighborhood || 'Charlotte',
      reviewCount: 0,
      isNewlyAdded: this.isNewlyAdded(gem.created_at),
      popularDishes: this.extractPopularDishes(gem.features)
    }));
  }

  private isNewlyAdded(createdAt: string): boolean {
    const createdDate = new Date(createdAt);
    const now = new Date();
    const daysSinceCreation = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceCreation <= 7; // Consider restaurants added in the last 7 days as new
  }

  private extractPopularDishes(features: string[] | null): string[] {
    // This is a placeholder - in a real app, popular dishes would come from reviews or menu data
    // For now, we'll return some features as "popular" items
    if (!features || features.length === 0) return [];
    
    const dishKeywords = ['pizza', 'burger', 'tacos', 'sushi', 'pasta', 'steak', 'chicken', 'seafood'];
    return features
      .filter(feature => dishKeywords.some(keyword => feature.toLowerCase().includes(keyword)))
      .slice(0, 3);
  }

  async addReview(userId: string, restaurantId: string) {
    // Check if this is the first review for the restaurant
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('troodie_reviews_count')
      .eq('id', restaurantId)
      .single();

    if (restaurant && (restaurant.troodie_reviews_count === 0 || restaurant.troodie_reviews_count === null)) {
      // Award early reviewer achievement
      const achievementService = new AchievementService();
      await achievementService.unlockAchievement(userId, 'early_reviewer');
    }
  }
} 