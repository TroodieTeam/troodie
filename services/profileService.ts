import { supabase } from '@/lib/supabase';
import { Share } from 'react-native';
import { achievementService } from './achievementService';

export interface Profile {
  id: string;
  phone?: string;
  username?: string;
  name?: string;
  bio?: string;
  avatar_url?: string;
  profile_image_url?: string; // Add this property
  persona?: string;
  is_verified?: boolean;
  is_restaurant?: boolean;
  is_creator?: boolean;
  profile_completion?: number;
  created_at?: string;
  updated_at?: string;
  // These will come from the user_stats view or joins
  followers_count?: number;
  following_count?: number;
  saves_count?: number;
  boards_count?: number;
  reviews_count?: number; // Add this property
  // Additional fields we might use later
  email?: string;
  location?: string;
}

class ProfileService {
  async ensureUserExists(userId: string): Promise<void> {
    try {
      // Check if user exists in users table
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (!existingUser) {
        // Get user email from auth
        const { data: { user } } = await supabase.auth.getUser();
        
        // Create user record
        const { error } = await supabase
          .from('users')
          .insert({
            id: userId,
            email: user?.email,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (error && error.code !== '23505') { // 23505 is unique violation, which is ok
          console.error('Error creating user record:', error);
        }
      }
    } catch (error) {
      console.error('Error in ensureUserExists:', error);
    }
  }

  async getProfile(userId: string): Promise<Profile | null> {
    try {
      // Ensure user exists first
      await this.ensureUserExists(userId);

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle(); // Use maybeSingle instead of single to handle no rows

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
      // First, check if the user exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking user existence:', checkError);
        throw checkError;
      }

      let data;
      let error;

      if (existingUser) {
        // User exists, update
        const result = await supabase
          .from('users')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
          .select()
          .single();
        
        data = result.data;
        error = result.error;
      } else {
        // User doesn't exist, insert with upsert
        const result = await supabase
          .from('users')
          .upsert({
            id: userId,
            ...updates,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        data = result.data;
        error = result.error;
      }

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
      // Starting profile image upload
      
      // Ensure user exists first
      await this.ensureUserExists(userId);
      
      // Generate unique filename with more randomness
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substr(2, 9);
      const fileName = `${userId}/profile-${timestamp}-${randomId}.jpg`;
      // Generated filename
      
      // Read the image as blob
      const response = await fetch(imageUri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} - ${response.statusText}`);
      }
      const blob = await response.blob();
      // Image blob created
      
      if (blob.size === 0) {
        throw new Error('Image blob is empty - invalid image data');
      }

      // Test storage bucket access first
      // Testing storage bucket access
      const { data: bucketData, error: bucketError } = await supabase.storage
        .from('avatars')
        .list('', { limit: 1 });
      
      if (bucketError) {
        console.error('Storage bucket access error:', bucketError);
        throw new Error(`Storage bucket not accessible: ${bucketError.message}`);
      }
      
      // Storage bucket accessible, proceeding with upload

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true // Use upsert to overwrite existing files
        });

      if (error) {
        console.error('Error uploading image to storage:', error);
        throw error;
      }

      // Image uploaded successfully to storage

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Public URL generated

      // Test if the URL is accessible
      try {
        const urlResponse = await fetch(publicUrl);
        // URL accessibility test completed
      } catch (urlError) {
        console.warn('URL accessibility test failed:', urlError);
      }

      // Update profile with new image URL
      const updatedProfile = await this.updateProfile(userId, {
        avatar_url: publicUrl
      });

      if (!updatedProfile) {
        throw new Error('Failed to update profile with image URL');
      }

      // Profile updated with image URL

      // Unlock achievement for adding profile image
      try {
        await achievementService.unlockAchievement(userId, 'profile_image_added');
        // Achievement unlocked: profile_image_added
      } catch (achievementError) {
        console.warn('Achievement unlock failed:', achievementError);
      }

      return publicUrl;
    } catch (error) {
      console.error('Error in uploadProfileImage:', error);
      throw error;
    }
  }

  // Debug function to test storage access
  async testStorageAccess(): Promise<void> {
    try {
      // Testing storage access
      
      // Test bucket listing
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      // Available buckets checked
      
      if (bucketError) {
        console.error('Bucket listing error:', bucketError);
      }
      
      // Test avatars bucket specifically
      const { data: avatarsList, error: avatarsError } = await supabase.storage
        .from('avatars')
        .list('', { limit: 5 });
      
      // Avatars bucket contents checked
      
      if (avatarsError) {
        console.error('Avatars bucket error:', avatarsError);
      }
      
    } catch (error) {
      console.error('Storage access test failed:', error);
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
        .maybeSingle();

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

  // Email preferences removed - no longer needed

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
        .maybeSingle();

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