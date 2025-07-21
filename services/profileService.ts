import { supabase } from '@/lib/supabase';
import { Share } from 'react-native';
import { achievementService } from './achievementService';

export interface Profile {
  id: string;
  email?: string;
  persona?: string;
  username?: string;
  name?: string;
  bio?: string;
  avatar_url?: string;
  profile_image_url?: string;
  email_preferences?: {
    marketing: boolean;
    social: boolean;
    notifications: boolean;
  };
  location?: string;
  website?: string;
  instagram_handle?: string;
  profile_completion?: number;
  saves_count?: number;
  reviews_count?: number;
  followers_count?: number;
  following_count?: number;
  is_verified?: boolean;
  is_restaurant?: boolean;
  is_creator?: boolean;
  created_at?: string;
  updated_at?: string;
}

class ProfileService {
  async getProfile(userId: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getProfile:', error);
      return null;
    }
  }

  async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating profile:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in updateProfile:', error);
      throw error;
    }
  }

  async uploadProfileImage(userId: string, imageUri: string): Promise<string> {
    try {
      // Generate unique filename
      const fileName = `${userId}/profile-${Date.now()}.jpg`;
      
      // Read the image as blob
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) {
        console.error('Error uploading image:', error);
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new image URL
      await this.updateProfile(userId, {
        profile_image_url: publicUrl
      });

      // Unlock achievement for adding profile image
      try {
        await achievementService.unlockAchievement(userId, 'profile_image_added');
      } catch (achievementError) {
        console.warn('Achievement unlock failed:', achievementError);
      }

      return publicUrl;
    } catch (error) {
      console.error('Error in uploadProfileImage:', error);
      throw error;
    }
  }

  async setUsername(userId: string, username: string): Promise<Profile | null> {
    try {
      // Check if username is already taken
      const { data: existing, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('username', username.toLowerCase())
        .neq('id', userId)
        .single();

      if (existing) {
        throw new Error('Username already taken');
      }

      // Update profile with username
      const profile = await this.updateProfile(userId, { 
        username: username.toLowerCase() 
      });

      // Unlock achievement for setting username
      try {
        await achievementService.unlockAchievement(userId, 'username_set');
      } catch (achievementError) {
        console.warn('Achievement unlock failed:', achievementError);
      }

      return profile;
    } catch (error) {
      console.error('Error in setUsername:', error);
      throw error;
    }
  }

  async setBio(userId: string, bio: string): Promise<Profile | null> {
    try {
      const profile = await this.updateProfile(userId, { bio });

      // Unlock achievement for adding bio
      if (bio && bio.trim().length > 0) {
        try {
          await achievementService.unlockAchievement(userId, 'bio_added');
        } catch (achievementError) {
          console.warn('Achievement unlock failed:', achievementError);
        }
      }

      return profile;
    } catch (error) {
      console.error('Error in setBio:', error);
      throw error;
    }
  }

  async setPersona(userId: string, persona: string): Promise<Profile | null> {
    try {
      return await this.updateProfile(userId, { persona });
    } catch (error) {
      console.error('Error in setPersona:', error);
      throw error;
    }
  }

  async updateEmailPreferences(
    userId: string, 
    preferences: Partial<Profile['email_preferences']>
  ): Promise<Profile | null> {
    try {
      const currentProfile = await this.getProfile(userId);
      const currentPreferences = currentProfile?.email_preferences || {
        marketing: true,
        social: true,
        notifications: true
      };

      return await this.updateProfile(userId, {
        email_preferences: {
          ...currentPreferences,
          ...preferences
        }
      });
    } catch (error) {
      console.error('Error in updateEmailPreferences:', error);
      throw error;
    }
  }

  async shareProfile(username: string): Promise<void> {
    try {
      const shareUrl = `https://troodie.app/u/${username}`;
      const message = `Check out my food adventures on Troodie! @${username}`;

      await Share.share({
        message,
        url: shareUrl,
        title: 'Share Profile'
      });
    } catch (error) {
      console.error('Error sharing profile:', error);
      // Don't throw - sharing can be cancelled by user
    }
  }

  async checkUsernameAvailability(username: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('username', username.toLowerCase())
        .single();

      // If we get data, username is taken
      // If we get error (no rows), username is available
      return !data;
    } catch (error) {
      // Error likely means no matching username found
      return true;
    }
  }

  async incrementSavesCount(userId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('increment_saves_count', {
        user_id: userId
      });

      if (error) {
        console.error('Error incrementing saves count:', error);
      }
    } catch (error) {
      console.error('Error in incrementSavesCount:', error);
    }
  }

  async incrementReviewsCount(userId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('increment_reviews_count', {
        user_id: userId
      });

      if (error) {
        console.error('Error incrementing reviews count:', error);
      }
    } catch (error) {
      console.error('Error in incrementReviewsCount:', error);
    }
  }
}

export const profileService = new ProfileService();