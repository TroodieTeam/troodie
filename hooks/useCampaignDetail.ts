import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getInvitationsForCampaign, type CampaignInvitation } from '@/services/campaignInvitationService';
import { CampaignApplication, CampaignDeliverable, CampaignDetail, PortfolioContent } from '@/types/campaign';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';

export function useCampaignDetail(id: string | undefined) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [applications, setApplications] = useState<CampaignApplication[]>([]);
  const [content, setContent] = useState<PortfolioContent[]>([]);
  const [deliverables, setDeliverables] = useState<CampaignDeliverable[]>([]);
  const [invitations, setInvitations] = useState<CampaignInvitation[]>([]);
  const [isTestCampaign, setIsTestCampaign] = useState(false);

  const loadCampaignData = useCallback(async () => {
    try {
      if (!user?.id || !id) {
        return;
      }

      // Check if user is admin
      const ADMIN_USER_IDS = [
        'b08d9600-358d-4be9-9552-4607d9f50227',
        '31744191-f7c0-44a4-8673-10b34ccbb87f',
        'a23aaf2a-45b2-4ca7-a3a2-cafb0fc0c599' // kouame@troodieapp.com
      ];
      const isAdmin = ADMIN_USER_IDS.includes(user.id);

      // Load campaign details - admins can see all campaigns, regular users only their own
      let query = supabase
        .from('campaigns')
        .select(`
          *,
          restaurants (
            id,
            name,
            cover_photo_url
          )
        `)
        .eq('id', id);

      if (!isAdmin) {
        query = query.eq('owner_id', user.id);
      }

      const { data: campaignData, error: campaignError } = await query.single();

      if (campaignError) {
        throw campaignError;
      }

      const campaignObj = {
        ...campaignData,
        restaurant: campaignData.restaurants,
      };
      setCampaign(campaignObj);
      
      // Check if this is a test campaign
      const title = campaignData.title || campaignData.name || '';
      setIsTestCampaign(
        title.toLowerCase().includes('test campaign for rating') ||
        title.toLowerCase().includes('cm-16')
      );

      // Load applications
      const { data: applicationsData, error: appsError } = await supabase
        .from('campaign_applications')
        .select(`
          *,
          creator_profiles (
            id,
            display_name,
            avatar_url,
            followers_count,
            specialties
          )
        `)
        .eq('campaign_id', id)
        .order('applied_at', { ascending: false });
      
      // Include rating fields (CM-16)
      const applicationsWithRatings = applicationsData?.map(app => ({
        ...app,
        rating: app.rating || undefined,
        rating_comment: app.rating_comment || undefined,
        rated_at: app.rated_at || undefined,
      })) || [];

      if (appsError) {
        throw appsError;
      }
      
      setApplications(applicationsWithRatings);

      // Load content
      const { data: contentData, error: contentError } = await supabase
        .from('portfolio_items')
        .select(`
          *,
          creator_profiles (
            display_name,
            avatar_url
          )
        `)
        .eq('campaign_id', id)
        .order('posted_at', { ascending: false });

      if (contentError) throw contentError;
      setContent(contentData || []);

      // Load deliverables
      const { data: deliverablesData, error: deliverablesError } = await supabase
        .from('campaign_deliverables')
        .select(`
          *,
          creator_profiles (
            display_name,
            avatar_url
          ),
          campaign_applications!inner (
            id,
            status,
            rating
          )
        `)
        .eq('campaign_id', id)
        .order('submitted_at', { ascending: false });

      if (deliverablesError) throw deliverablesError;
      setDeliverables(deliverablesData || []);

      // Load invitations
      const { data: invitationsData, error: invitationsError } = await getInvitationsForCampaign(id as string);
      if (invitationsError) {
        // Silently handle invitations error
      } else {
        setInvitations(invitationsData || []);
      }

    } catch (error) {
      console.error('Failed to load campaign:', error);
      Alert.alert('Error', 'Failed to load campaign details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, user?.id]);

  useEffect(() => {
    loadCampaignData();
  }, [loadCampaignData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadCampaignData();
  }, [loadCampaignData]);

  return {
    loading,
    refreshing,
    campaign,
    applications,
    content,
    deliverables,
    invitations,
    isTestCampaign,
    handleRefresh,
    setApplications,
    setDeliverables,
    loadCampaignData
  };
}
