/**
 * Hook to get business profile data
 */

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

export interface BusinessProfile {
  id: string;
  user_id: string;
  restaurant_id: string | null;
  verified: boolean;
  restaurant?: {
    id: string;
    name: string;
    address?: string;
    city?: string;
    state?: string;
  } | null;
}

export function useBusinessProfile() {
  const { user } = useAuth();
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadBusinessProfile();
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  const loadBusinessProfile = async () => {
    try {
      if (!user?.id) {
        console.log('[useBusinessProfile] No user ID, skipping load');
        setLoading(false);
        return;
      }

      console.log('[useBusinessProfile] Loading profile for user:', user.id);
      const { data, error: profileError } = await supabase
        .from('business_profiles')
        .select(`
          id,
          user_id,
          restaurant_id,
          verification_status,
          restaurants (
            id,
            name,
            address,
            city,
            state
          )
        `)
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.log('[useBusinessProfile] Query error:', {
          code: profileError.code,
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint,
          userId: user.id,
        });
        if (profileError.code === 'PGRST116') {
          // No business profile found
          console.log('[useBusinessProfile] No business profile found for user:', user.id);
          setBusinessProfile(null);
        } else {
          setError(profileError.message);
        }
      } else if (data) {
        console.log('[useBusinessProfile] Profile loaded:', {
          id: data.id,
          user_id: data.user_id,
          restaurant_id: data.restaurant_id,
          verification_status: data.verification_status,
        });
        setBusinessProfile({
          id: data.id,
          user_id: data.user_id,
          restaurant_id: data.restaurant_id,
          verified: data.verification_status === 'verified',
          restaurant: data.restaurants as any,
        });
      } else {
        console.log('[useBusinessProfile] No data returned (but no error)');
        setBusinessProfile(null);
      }
    } catch (err: any) {
      console.error('Error loading business profile:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    businessProfile,
    loading,
    error,
    refetch: loadBusinessProfile,
  };
}

