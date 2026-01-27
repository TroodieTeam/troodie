import { useAuth } from '@/contexts/AuthContext';
import { useRestaurant } from '@/contexts/RestaurantContext'; // ✅ ADDED
import { supabase } from '@/lib/supabase';
import { LoadingState, RestaurantData } from '@/types/campaign';
import { useCallback, useEffect, useState } from 'react';
export function useRestaurantData() {
  const { user } = useAuth();
  const { currentRestaurant } = useRestaurant();  // ✅ ADDED
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

      // ✅ ADDED: Check if restaurant is selected from context
      if (!currentRestaurant) {
        setLoadingState('no_restaurant');
        setErrorMessage('Please select a restaurant or claim one to create campaigns');
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
        .eq('restaurant_id', currentRestaurant.restaurant_id)  // ✅ CHANGED: from user_id to restaurant_id
        .maybeSingle();  // ✅ CHANGED: from .single() to .maybeSingle()
      if (profileError) {
        if (profileError.code === 'PGRST116') {
          // No rows returned - no business profile
          setLoadingState('no_profile');
          setErrorMessage('Please complete your business setup to create campaigns');
          return;
        }
        throw profileError;
      }
      if (!profile?.restaurant_id || !profile?.restaurants) {
        setLoadingState('no_restaurant');
        setErrorMessage('Please claim a restaurant before creating campaigns');
        return;
      }
      if (profile.verification_status !== 'verified') {
        setLoadingState('error');
        setErrorMessage('Your restaurant claim is pending verification');
        return;
      }
      // ✅ CHANGED: Use restaurant data from context instead of query
      setRestaurantData({
        id: currentRestaurant.restaurant_id,
        name: currentRestaurant.restaurant_name,
      });
      setLoadingState('loaded');
    } catch (error: any) {
      console.error('Failed to load restaurant data:', error);
      setLoadingState('error');
      setErrorMessage('Failed to load restaurant data. Please try again.');
    }
  }, [user?.id, currentRestaurant]);  // ✅ CHANGED: Added currentRestaurant to dependencies
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