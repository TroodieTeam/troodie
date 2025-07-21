import { supabase } from '@/lib/supabase';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  points: number;
}

export const achievements: Record<string, Achievement> = {
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
  network_builder: {
    id: 'network_builder',
    title: 'Network Builder',
    description: 'Invited your first friend',
    icon: '🤝',
    points: 100
  }
};

export class AchievementService {
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
