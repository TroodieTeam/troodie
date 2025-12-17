import { supabase } from '@/lib/supabase';
import { CampaignSearchResult } from '@/types/campaign';

export interface CampaignSearchParams {
  searchQuery?: string;
  location?: { lat: number; lng: number };
  radiusMiles?: number;
  minBudget?: number;
  maxBudget?: number;
  cuisineTypes?: string[];
  platforms?: string[];
  sortBy?: 'relevance' | 'budget_desc' | 'deadline_asc' | 'newest' | 'distance';
  limit?: number;
  offset?: number;
}

export interface CampaignSearchResult {
  id: string;
  restaurant_id: string;
  title: string;
  description: string;
  requirements: string[] | null;
  deliverable_requirements: any;
  budget_cents: number;
  start_date: string | null;
  end_date: string;
  status: string;
  max_creators: number;
  selected_creators_count: number;
  campaign_type: string;
  created_at: string;
  restaurant_name: string;
  restaurant_cuisine_types: string[];
  restaurant_address: string;
  restaurant_city: string;
  restaurant_state: string;
  restaurant_cover_photo_url: string;
  distance_meters?: number;
  is_saved: boolean;
  // Computed for compatibility with existing components
  restaurant?: {
    id: string;
    name: string;
    cuisine_types: string[];
    address: string;
    city: string;
    state: string;
    cover_photo_url: string;
  };
}

/**
 * Search campaigns using server-side RPC with advanced filtering
 */
export async function searchCampaigns(params: CampaignSearchParams): Promise<CampaignSearchResult[]> {
  try {
    const {
      searchQuery,
      location,
      radiusMiles,
      minBudget,
      maxBudget,
      cuisineTypes,
      platforms,
      sortBy = 'relevance',
      limit = 20,
      offset = 0
    } = params;

    // Convert miles to meters
    const radiusMeters = radiusMiles ? radiusMiles * 1609.34 : null;

    // Convert budget to cents if provided (assuming UI passes dollars)
    // Actually the UI might pass dollars or cents. 
    // Let's assume the UI passes raw values. If UI passes 500 for $500, we multiply by 100.
    // But to be safe, let's assume the params passed here are already in cents if logical, 
    // OR we standardize on dollars in params and convert here.
    // The RPC expects cents. Let's assume input is in CENTS for consistency with DB.
    
    const { data, error } = await supabase.rpc('search_campaigns_advanced', {
      p_search_query: searchQuery || null,
      p_lat: location?.lat || null,
      p_lng: location?.lng || null,
      p_radius_meters: radiusMeters,
      p_min_budget: minBudget || null,
      p_max_budget: maxBudget || null,
      p_cuisine_types: cuisineTypes || null,
      p_platforms: platforms || null,
      p_sort_by: sortBy,
      p_limit: limit,
      p_offset: offset
    });

    if (error) throw error;

    // Transform result to match UI expectations (nested restaurant object)
    return (data || []).map((item: any) => ({
      ...item,
      restaurant: {
        id: item.restaurant_id,
        name: item.restaurant_name,
        cuisine_types: item.restaurant_cuisine_types,
        address: item.restaurant_address,
        city: item.restaurant_city,
        state: item.restaurant_state,
        cover_photo_url: item.restaurant_cover_photo_url
      }
    }));
  } catch (error) {
    console.error('Error searching campaigns:', error);
    throw error;
  }
}

/**
 * Save a campaign to the user's watchlist
 */
export async function saveCampaign(campaignId: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: creatorProfile } = await supabase
      .from('creator_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!creatorProfile) throw new Error('Creator profile not found');

    const { error } = await supabase
      .from('saved_campaigns')
      .insert({
        creator_id: creatorProfile.id,
        campaign_id: campaignId
      });

    if (error) {
      // Ignore duplicate key errors (already saved)
      if (error.code === '23505') return;
      throw error;
    }
  } catch (error) {
    console.error('Error saving campaign:', error);
    throw error;
  }
}

/**
 * Remove a campaign from the user's watchlist
 */
export async function unsaveCampaign(campaignId: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: creatorProfile } = await supabase
      .from('creator_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!creatorProfile) throw new Error('Creator profile not found');

    const { error } = await supabase
      .from('saved_campaigns')
      .delete()
      .eq('creator_id', creatorProfile.id)
      .eq('campaign_id', campaignId);

    if (error) throw error;
  } catch (error) {
    console.error('Error unsaving campaign:', error);
    throw error;
  }
}

/**
 * Toggle save status
 */
export async function toggleSaveCampaign(campaignId: string, shouldSave: boolean): Promise<void> {
  if (shouldSave) {
    await saveCampaign(campaignId);
  } else {
    await unsaveCampaign(campaignId);
  }
}

/**
 * Get all saved campaigns for the current user
 */
export async function getSavedCampaigns(): Promise<CampaignSearchResult[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: creatorProfile } = await supabase
      .from('creator_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!creatorProfile) throw new Error('Creator profile not found');

    const { data, error } = await supabase
      .from('saved_campaigns')
      .select(`
        campaign_id,
        campaign:campaigns (
          *,
          restaurant:restaurants (*)
        )
      `)
      .eq('creator_id', creatorProfile.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform to match CampaignSearchResult
    return (data || []).map((item: any) => {
      const c = item.campaign;
      return {
        ...c,
        restaurant_name: c.restaurant?.name,
        restaurant_cuisine_types: c.restaurant?.cuisine_types,
        restaurant_address: c.restaurant?.address,
        restaurant_city: c.restaurant?.city,
        restaurant_state: c.restaurant?.state,
        restaurant_cover_photo_url: c.restaurant?.cover_photo_url,
        is_saved: true, // It's in the saved list
        restaurant: c.restaurant // Keep nested object
      };
    });
  } catch (error) {
    console.error('Error fetching saved campaigns:', error);
    throw error;
  }
}

export const campaignSearchService = {
  searchCampaigns,
  saveCampaign,
  unsaveCampaign,
  toggleSaveCampaign,
  getSavedCampaigns
};
