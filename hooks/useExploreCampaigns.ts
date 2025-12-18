import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ExploreCampaign } from '@/types/exploreCampaign';
import { useEffect, useState } from 'react';

export function useExploreCampaigns() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<ExploreCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaigns = async () => {
    try {
      setError(null);
      
      // Get creator profile ID to filter applications
      let creatorProfileId: string | null = null;
      if (user?.id) {
        const { data: creatorProfile } = await supabase
          .from('creator_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();
        creatorProfileId = creatorProfile?.id || null;
      }

      const { data, error: fetchError } = await supabase
        .from('campaigns')
        .select(`
          *,
          restaurant:restaurants(
            id,
            name,
            cuisine_types,
            address,
            city,
            state,
            cover_photo_url
          ),
          applications:campaign_applications(
            id,
            status,
            creator_id
          )
        `)
        .eq('status', 'active')
        .gte('end_date', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Normalize requirements field and filter applications for current user
      const normalizedData = (data || []).map((campaign: any) => {
        // Filter applications to only show current user's applications
        const userApplications = campaign.applications?.filter(
          (app: any) => app.creator_id === creatorProfileId
        ) || [];

        return {
          ...campaign,
          requirements: Array.isArray(campaign.requirements) 
            ? campaign.requirements 
            : (campaign.requirements ? [campaign.requirements] : null),
          applications: userApplications,
        };
      });

      setCampaigns(normalizedData);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      setError('Failed to load campaigns');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refresh = () => {
    setRefreshing(true);
    fetchCampaigns();
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  return {
    campaigns,
    loading,
    refreshing,
    error,
    refresh,
  };
}
