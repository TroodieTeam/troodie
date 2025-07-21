import { supabase } from '@/lib/supabase';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  points: number;
}

export const achievements: Record<string, Achievement> = {
  // Profile Achievements
  profile_image_added: {
    id: 'profile_image_added',
    title: 'Picture Perfect',
    description: 'Added a profile picture',
    icon: '📸',
    points: 10
  },
  username_set: {
    id: 'username_set',
    title: 'Identity Established',
    description: 'Set your username',
    icon: '🏷️',
    points: 10
  },
  bio_added: {
    id: 'bio_added',
    title: 'Story Teller',
    description: 'Added a bio to your profile',
    icon: '📝',
    points: 10
  },
  profile_complete: {
    id: 'profile_complete',
    title: 'Profile Perfectionist',
    description: 'Completed 100% of your profile',
    icon: '✨',
    points: 50
  },
  
  // Restaurant Achievements
  first_save: {
    id: 'first_save',
    title: 'First Save',
    description: 'Saved your first restaurant',
    icon: '🏆',
    points: 100
  },
  early_reviewer: {
    id: 'early_reviewer',
    title: 'Early Reviewer',
    description: 'Among the first to review a restaurant',
    icon: '⭐',
    points: 150
  },
  
  // Social Achievements
  network_builder: {
    id: 'network_builder',
    title: 'Network Builder',
    description: 'Invited your first friend',
    icon: '🤝',
    points: 100
  },
  first_friend: {
    id: 'first_friend',
    title: 'Social Butterfly',
    description: 'Added your first friend',
    icon: '🦋',
    points: 20
  },
  five_friends: {
    id: 'five_friends',
    title: 'Popular',
    description: 'Connected with 5 friends',
    icon: '🎉',
    points: 30
  }
};

export class AchievementService {
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
      const userAchievements = await this.getUserAchievements(userId);
      return userAchievements.reduce((total, ua) => {
        const achievement = achievements[ua.achievement_id];
        return total + (achievement?.points || 0);
      }, 0);
    } catch (error) {
      console.error('Error calculating total points:', error);
      return 0;
    }
  }

  async unlockAchievement(userId: string, achievementId: string) {
    const achievement = achievements[achievementId];
    if (!achievement) return null;

    const { data, error } = await supabase
      .from('user_achievements')
      .insert({
        user_id: userId,
        achievement_id: achievementId,
        unlocked_at: new Date().toISOString(),
        points: achievement.points
      })
      .select()
      .single();

    if (error) {
      console.error('Error unlocking achievement:', error);
      return null;
    }

    return data;
  }

  async getUserAchievements(userId: string) {
    const { data, error } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching achievements:', error);
      return [];
    }

    return data.map(ua => ({
      ...achievements[ua.achievement_id],
      unlocked_at: ua.unlocked_at
    }));
  }

  async hasAchievement(userId: string, achievementId: string) {
    const { data } = await supabase
      .from('user_achievements')
      .select('id')
      .eq('user_id', userId)
      .eq('achievement_id', achievementId)
      .single();

    return !!data;
  }
}

export const achievementService = new AchievementService(); 
