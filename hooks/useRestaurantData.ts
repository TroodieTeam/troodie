import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { LoadingState, RestaurantData } from '@/types/campaign';
import { useCallback, useEffect, useState } from 'react';

export function useRestaurantData() {
  const { user } = useAuth();
  const [restaurantData, setRestaurantData] = useState<RestaurantData | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadRestaurantData = useCallback(async () => {
    setLoadingState('loading');
    setErrorMessage(null);

    try {
      if (!user?.id) {
        setLoadingState('error');
        setErrorMessage('Please sign in to create a campaign');
        return;
      }

      // Fetch business profile with restaurant
      const { data: profile, error: profileError } = await supabase
        .from('business_profiles')
        .select(
          `
          id,
          restaurant_id,
          verification_status,
          restaurants (
            id,
            name
          )
        `
        )
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          // No rows returned - no business profile
          setLoadingState('no_profile');
          setErrorMessage('Please complete your business setup to create campaigns');
          return;
        }
        throw profileError;
      }

      if (!profile.restaurant_id || !profile.restaurants) {
        setLoadingState('no_restaurant');
        setErrorMessage('Please claim a restaurant before creating campaigns');
        return;
      }

      if (profile.verification_status !== 'verified') {
        setLoadingState('error');
        setErrorMessage('Your restaurant claim is pending verification');
        return;
      }

      // Successfully loaded
      setRestaurantData({
        id: profile.restaurants.id,
        name: profile.restaurants.name,
      });
      setLoadingState('loaded');
    } catch (error: any) {
      console.error('Failed to load restaurant data:', error);
      setLoadingState('error');
      setErrorMessage('Failed to load restaurant data. Please try again.');
    }
  }, [user?.id]);

  useEffect(() => {
    loadRestaurantData();
  }, [loadRestaurantData]);

  return {
    restaurantData,
    loadingState,
    errorMessage,
    loadRestaurantData,
  };
}
