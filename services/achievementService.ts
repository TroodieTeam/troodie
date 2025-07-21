import { supabase } from '@/config/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  category: string;
  unlocked_at?: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  achievement?: Achievement;
}

class AchievementService {
  private achievements: Record<string, Achievement> = {
    // Profile Achievements
    profile_image_added: {
      id: 'profile_image_added',
      name: 'Picture Perfect',
      description: 'Added a profile picture',
      icon: '📸',
      points: 10,
      category: 'profile'
    },
    username_set: {
      id: 'username_set',
      name: 'Identity Established',
      description: 'Set your username',
      icon: '🏷️',
      points: 10,
      category: 'profile'
    },
    bio_added: {
      id: 'bio_added',
      name: 'Story Teller',
      description: 'Added a bio to your profile',
      icon: '📝',
      points: 10,
      category: 'profile'
    },
    profile_complete: {
      id: 'profile_complete',
      name: 'Profile Perfectionist',
      description: 'Completed 100% of your profile',
      icon: '✨',
      points: 50,
      category: 'profile'
    },
    
    // Social Achievements
    first_friend: {
      id: 'first_friend',
      name: 'Social Butterfly',
      description: 'Added your first friend',
      icon: '🦋',
      points: 20,
      category: 'social'
    },
    five_friends: {
      id: 'five_friends',
      name: 'Popular',
      description: 'Connected with 5 friends',
      icon: '🎉',
      points: 30,
      category: 'social'
    },
    
    // Restaurant Achievements
    first_save: {
      id: 'first_save',
      name: 'Bookmark Beginner',
      description: 'Saved your first restaurant',
      icon: '🔖',
      points: 15,
      category: 'restaurant'
    },
    ten_saves: {
      id: 'ten_saves',
      name: 'Collection Curator',
      description: 'Saved 10 restaurants',
      icon: '📚',
      points: 30,
      category: 'restaurant'
    },
    first_review: {
      id: 'first_review',
      name: 'Food Critic',
      description: 'Posted your first review',
      icon: '⭐',
      points: 20,
      category: 'restaurant'
    },
    
    // Discovery Achievements
    local_gem_found: {
      id: 'local_gem_found',
      name: 'Hidden Gem Hunter',
      description: 'Discovered a local gem',
      icon: '💎',
      points: 25,
      category: 'discovery'
    },
    invite_sent: {
      id: 'invite_sent',
      name: 'Ambassador',
      description: 'Invited a friend to Troodie',
      icon: '📨',
      points: 15,
      category: 'social'
    }
  };

  async unlockAchievement(userId: string, achievementId: string): Promise<UserAchievement | null> {
    try {
      // Check if achievement exists
      const achievement = this.achievements[achievementId];
      if (!achievement) {
        console.warn(`Achievement ${achievementId} not found`);
        return null;
      }

      // Check if already unlocked
      const { data: existing } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', userId)
        .eq('achievement_id', achievementId)
        .single();

      if (existing) {
        console.log(`Achievement ${achievementId} already unlocked for user ${userId}`);
        return existing;
      }

      // Unlock the achievement
      const { data, error } = await supabase
        .from('user_achievements')
        .insert({
          user_id: userId,
          achievement_id: achievementId,
          unlocked_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error unlocking achievement:', error);
        return null;
      }

      // Store in local cache
      await this.cacheAchievement(userId, achievementId);

      // Show notification (you can customize this)
      console.log(`🎉 Achievement Unlocked: ${achievement.name}`);

      return data;
    } catch (error) {
      console.error('Error in unlockAchievement:', error);
      return null;
    }
  }

  async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', userId)
        .order('unlocked_at', { ascending: false });

      if (error) {
        console.error('Error fetching user achievements:', error);
        return [];
      }

      // Enrich with achievement details
      return data.map(ua => ({
        ...ua,
        achievement: this.achievements[ua.achievement_id]
      }));
    } catch (error) {
      console.error('Error in getUserAchievements:', error);
      return [];
    }
  }

  async checkAndUnlockProfileCompletion(userId: string, profile: any): Promise<void> {
    try {
      const requiredFields = ['username', 'bio', 'profile_image_url', 'location', 'persona'];
      const completedFields = requiredFields.filter(field => profile[field]);
      
      if (completedFields.length === requiredFields.length) {
        await this.unlockAchievement(userId, 'profile_complete');
      }
    } catch (error) {
      console.error('Error checking profile completion:', error);
    }
  }

  async getTotalPoints(userId: string): Promise<number> {
    try {
      const achievements = await this.getUserAchievements(userId);
      return achievements.reduce((total, ua) => {
        const achievement = ua.achievement || this.achievements[ua.achievement_id];
        return total + (achievement?.points || 0);
      }, 0);
    } catch (error) {
      console.error('Error calculating total points:', error);
      return 0;
    }
  }

  private async cacheAchievement(userId: string, achievementId: string): Promise<void> {
    try {
      const key = `achievements_${userId}`;
      const cached = await AsyncStorage.getItem(key);
      const achievements = cached ? JSON.parse(cached) : [];
      
      if (!achievements.includes(achievementId)) {
        achievements.push(achievementId);
        await AsyncStorage.setItem(key, JSON.stringify(achievements));
      }
    } catch (error) {
      console.error('Error caching achievement:', error);
    }
  }

  getAllAchievements(): Achievement[] {
    return Object.values(this.achievements);
  }

  getAchievementById(id: string): Achievement | undefined {
    return this.achievements[id];
  }

  getAchievementsByCategory(category: string): Achievement[] {
    return Object.values(this.achievements).filter(a => a.category === category);
  }
}

export const achievementService = new AchievementService();