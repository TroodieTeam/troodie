/**
 * useCreatorProfileId Hook
 * Task: CM-3 - Fix Campaign Application creator_id Lookup
 *
 * This hook provides the creator_profiles.id for the current user.
 * Many operations (campaign applications, portfolio items, etc.)
 * require the creator_profiles.id instead of the users.id.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface UseCreatorProfileIdResult {
  profileId: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to get the current user's creator profile ID.
 *
 * Use this hook when you need to perform operations that require
 * the creator_profiles.id instead of the users.id.
 *
 * Example usage:
 * ```
 * const { profileId, loading, error } = useCreatorProfileId();
 *
 * if (loading) return <Loading />;
 * if (error || !profileId) return <CompleteProfilePrompt />;
 *
 * // Use profileId for operations
 * await supabase.from('campaign_applications').insert({
 *   creator_id: profileId, // NOT user.id!
 *   ...
 * });
 * ```
 */
export function useCreatorProfileId(): UseCreatorProfileIdResult {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfileId = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError('Not authenticated');
        setProfileId(null);
        return;
      }

      // Get creator profile
      const { data: profile, error: profileError } = await supabase
        .from('creator_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        // PGRST116 means no rows returned - user doesn't have a creator profile
        if (profileError.code === 'PGRST116') {
          setError('Creator profile not found. Please complete creator onboarding.');
        } else {
          setError(profileError.message);
        }
        setProfileId(null);
        return;
      }

      setProfileId(profile.id);
      setError(null);
    } catch (err: any) {
      console.error('[useCreatorProfileId] Error:', err);
      setError(err.message || 'Failed to fetch creator profile');
      setProfileId(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileId();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchProfileId();
      } else {
        setProfileId(null);
        setError('Not authenticated');
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    profileId,
    loading,
    error,
    refetch: fetchProfileId,
  };
}

/**
 * Hook to get creator profile details (not just ID).
 *
 * Use when you need more than just the profile ID.
 */
export interface CreatorProfile {
  id: string;
  user_id: string;
  display_name: string;
  bio?: string;
  location?: string;
  food_specialties?: string[];
  verification_status?: string;
  portfolio_uploaded?: boolean;
  followers_count?: number;
  content_count?: number;
}

interface UseCreatorProfileResult {
  profile: CreatorProfile | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCreatorProfile(): UseCreatorProfileResult {
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError('Not authenticated');
        setProfile(null);
        return;
      }

      const { data, error: profileError } = await supabase
        .from('creator_profiles')
        .select(
          `
          id,
          user_id,
          display_name,
          bio,
          location,
          food_specialties,
          verification_status,
          portfolio_uploaded,
          followers_count,
          content_count
        `
        )
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          setError('Creator profile not found');
        } else {
          setError(profileError.message);
        }
        setProfile(null);
        return;
      }

      setProfile(data);
      setError(null);
    } catch (err: any) {
      console.error('[useCreatorProfile] Error:', err);
      setError(err.message || 'Failed to fetch creator profile');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchProfile();
      } else {
        setProfile(null);
        setError('Not authenticated');
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    profile,
    loading,
    error,
    refetch: fetchProfile,
  };
}

export default useCreatorProfileId;
