import { supabase } from '@/lib/supabase';
import { Alert } from 'react-native';

export interface BlockedUser {
  blocker_id: string;
  blocked_id: string;
  reason?: string;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  target_type: 'post' | 'comment' | 'user' | 'board' | 'community';
  target_id: string;
  reason: string;
  description?: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  created_at: string;
}

class ModerationService {
  /**
   * Block a user
   */
  async blockUser(userId: string, reason?: string): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        Alert.alert('Error', 'You must be signed in to block users');
        return false;
      }

      const { data, error } = await supabase.functions.invoke('block-user', {
        body: { userId, reason }
      });

      if (error) {
        console.error('Supabase error blocking user:', error);
        throw error;
      }

      // Check if the response indicates an error
      if (data?.error) {
        console.error('Block user API error:', data.error);
        if (data.error.includes('already blocked')) {
          Alert.alert('Already Blocked', 'This user is already blocked');
        } else if (data.error.includes('cannot block yourself')) {
          Alert.alert('Error', 'You cannot block yourself');
        } else if (data.error.includes('User not found')) {
          Alert.alert('Error', 'User not found');
        } else {
          Alert.alert('Error', data.error || 'Failed to block user. Please try again.');
        }
        return false;
      }

      return true;
    } catch (error: any) {
      console.error('Block user error:', error);
      console.error('Error details:', JSON.stringify(error));
      
      const errorMessage = error?.message || error?.error || 'Unknown error';
      
      if (errorMessage.includes('already blocked')) {
        Alert.alert('Already Blocked', 'This user is already blocked');
      } else if (errorMessage.includes('cannot block yourself')) {
        Alert.alert('Error', 'You cannot block yourself');
      } else if (errorMessage.includes('FunctionsHttpError')) {
        Alert.alert('Error', 'Network error. Please check your connection and try again.');
      } else {
        Alert.alert('Error', 'Failed to block user. Please try again.');
      }
      
      return false;
    }
  }

  /**
   * Unblock a user
   */
  async unblockUser(userId: string): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        Alert.alert('Error', 'You must be signed in to unblock users');
        return false;
      }

      const { data, error } = await supabase.functions.invoke('unblock-user', {
        body: { userId }
      });

      if (error) {
        console.error('Supabase error unblocking user:', error);
        throw error;
      }

      // Check if the response indicates an error
      if (data?.error) {
        console.error('Unblock user API error:', data.error);
        Alert.alert('Error', data.error || 'Failed to unblock user. Please try again.');
        return false;
      }

      return true;
    } catch (error: any) {
      console.error('Unblock user error:', error);
      console.error('Error details:', JSON.stringify(error));
      Alert.alert('Error', 'Failed to unblock user. Please try again.');
      return false;
    }
  }

  /**
   * Check if a user is blocked
   */
  async isUserBlocked(userId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return false;

      const { data, error } = await supabase
        .from('blocked_users')
        .select('blocker_id')
        .eq('blocker_id', user.id)
        .eq('blocked_id', userId)
        .single();

      return !!data;
    } catch (error) {
      console.error('Check blocked status error:', error);
      return false;
    }
  }

  /**
   * Get list of blocked users
   */
  async getBlockedUsers(): Promise<string[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return [];

      const { data, error } = await supabase
        .from('blocked_users')
        .select('blocked_id')
        .eq('blocker_id', user.id);

      if (error) throw error;

      return data?.map(item => item.blocked_id) || [];
    } catch (error) {
      console.error('Get blocked users error:', error);
      return [];
    }
  }

  /**
   * Submit a report
   */
  async submitReport(
    targetType: 'post' | 'comment' | 'user' | 'board' | 'community',
    targetId: string,
    reason: string,
    description?: string
  ): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        Alert.alert('Error', 'You must be signed in to report content');
        return false;
      }

      const { data, error } = await supabase.functions.invoke('submit-report', {
        body: {
          targetType,
          targetId,
          reason,
          description
        }
      });

      if (error) {
        console.error('Supabase error submitting report:', error);
        throw error;
      }
      
      // Check if the response indicates an error
      if (data?.error) {
        console.error('Submit report API error:', data.error);
        if (data.error.includes('already reported')) {
          Alert.alert(
            'Already Reported',
            'You have already reported this content. Our team is reviewing it.'
          );
        } else {
          Alert.alert('Error', data.error || 'Failed to submit report. Please try again.');
        }
        return false;
      }

      Alert.alert(
        'Report Submitted',
        'Thank you for your report. We will review it and take appropriate action.'
      );

      return true;
    } catch (error: any) {
      console.error('Submit report error:', error);
      console.error('Error details:', JSON.stringify(error));
      
      const errorMessage = error?.message || error?.error || 'Unknown error';
      
      if (errorMessage.includes('already reported')) {
        Alert.alert(
          'Already Reported',
          'You have already reported this content. Our team is reviewing it.'
        );
      } else if (errorMessage.includes('FunctionsHttpError')) {
        Alert.alert('Error', 'Network error. Please check your connection and try again.');
      } else {
        Alert.alert('Error', 'Failed to submit report. Please try again.');
      }
      
      return false;
    }
  }

  /**
   * Get user's submitted reports
   */
  async getMyReports(): Promise<Report[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return [];

      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('reporter_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Get reports error:', error);
      return [];
    }
  }

  /**
   * Filter out blocked users from an array of items
   */
  async filterBlockedContent<T extends { user_id?: string | null }>(
    items: T[]
  ): Promise<T[]> {
    try {
      const blockedUsers = await this.getBlockedUsers();
      
      if (blockedUsers.length === 0) return items;

      return items.filter(item => 
        !item.user_id || !blockedUsers.includes(item.user_id)
      );
    } catch (error) {
      console.error('Filter blocked content error:', error);
      return items;
    }
  }
}

export const moderationService = new ModerationService();