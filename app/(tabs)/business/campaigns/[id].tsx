import { DS } from '@/components/design-system/tokens';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getInvitationsForCampaign, withdrawInvitation, type CampaignInvitation } from '@/services/campaignInvitationService';
import { canRateApplication, rateCreator } from '@/services/ratingService';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    ArrowLeft,
    Clock,
    DollarSign,
    Edit,
    ExternalLink,
    Mail,
    Star,
    Target,
    Users,
    X
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Linking,
    Modal,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface CampaignDetail {
  id: string;
  name: string;
  title?: string;
  description: string;
  status: string;
  budget_cents: number;
  spent_amount_cents: number;
  start_date: string;
  end_date: string;
  max_creators: number;
  selected_creators_count: number;
  total_deliverables: number;
  delivered_content_count: number;
  created_at: string;
  restaurant: {
    id: string;
    name: string;
    cover_photo_url: string;
  };
}

interface Application {
  id: string;
  creator_profiles: {
    id: string;
    display_name: string;
    avatar_url: string;
    followers_count: number;
    specialties: string[];
  };
  status: string;
  proposed_rate_cents: number;
  proposed_deliverables: string;
  cover_letter: string;
  applied_at: string;
  reviewed_at?: string;
  reviewer_id?: string;
  rating?: number;
  rating_comment?: string;
  rated_at?: string;
}

interface Content {
  id: string;
  creator_profiles: {
    display_name: string;
    avatar_url: string;
  };
  thumbnail_url: string;
  content_type: string;
  caption: string;
  views: number;
  likes: number;
  posted_at: string;
}

interface Deliverable {
  id: string;
  campaign_application_id: string;
  creator_id: string;
  platform: string;
  platform_post_url: string;
  caption: string;
  status: 'pending_review' | 'approved' | 'rejected' | 'needs_revision' | 'auto_approved' | 'draft' | 'revision_requested' | 'disputed';
  submitted_at: string;
  reviewed_at?: string;
  reviewer_id?: string;
  restaurant_feedback?: string;
  auto_approved: boolean;
  thumbnail_url?: string;
  content_type?: string;
  views_count?: number;
  likes_count?: number;
  comments_count?: number;
  shares_count?: number;
  engagement_rate?: number;
  creator_profiles: {
    display_name: string;
    avatar_url: string;
  };
  campaign_applications?: {
    id: string;
    status: string;
    rating?: number;
  };
}

export default function CampaignDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [content, setContent] = useState<Content[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [invitations, setInvitations] = useState<CampaignInvitation[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'applications' | 'content' | 'deliverables' | 'invitations'>('overview');
  
  // Rating modal state (CM-16)
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [ratingComment, setRatingComment] = useState<string>('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [isTestCampaign, setIsTestCampaign] = useState(false);

  useEffect(() => {
    if (id) {
      loadCampaignData();
    }
  }, [id]);

  const loadCampaignData = async () => {
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
      console.log('[CampaignDetails] Loading applications for campaign:', id);
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
        console.error('[CampaignDetails] Applications load error:', appsError);
        throw appsError;
      }
      
      console.log('[CampaignDetails] Applications loaded from database:', applicationsData);
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
        console.error('[CampaignDetails] Invitations load error:', invitationsError);
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
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadCampaignData();
  };

  const handleDeliverableStatusChange = async (deliverableId: string, status: string, feedback?: string) => {
    try {
      const { error } = await supabase
        .from('campaign_deliverables')
        .update({
          status,
          reviewed_at: new Date().toISOString(),
          reviewer_id: user?.id,
          restaurant_feedback: feedback,
        })
        .eq('id', deliverableId);

      if (error) throw error;

      // Update local state
      setDeliverables(prev => prev.map(d => 
        d.id === deliverableId 
          ? { ...d, status: status as any, reviewed_at: new Date().toISOString(), reviewer_id: user?.id, restaurant_feedback: feedback }
          : d
      ));

      Alert.alert('Success', `Deliverable ${status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'marked for revision'}`);
    } catch (error) {
      console.error('Failed to update deliverable status:', error);
      Alert.alert('Error', 'Failed to update deliverable status');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      
      Alert.alert('Success', `Campaign ${newStatus}`);
      loadCampaignData();
    } catch (error) {
      Alert.alert('Error', 'Failed to update campaign status');
    }
  };

  const handleApplicationAction = async (applicationId: string, action: 'accepted' | 'rejected') => {
    try {
      console.log('[CampaignDetails] handleApplicationAction called');
      console.log('[CampaignDetails] Application ID:', applicationId);
      console.log('[CampaignDetails] Action:', action);
      console.log('[CampaignDetails] User ID:', user?.id);
      
      const { error } = await supabase
        .from('campaign_applications')
        .update({ 
          status: action,
          reviewed_at: new Date().toISOString(),
          reviewer_id: user?.id
        })
        .eq('id', applicationId);

      if (error) {
        console.error('[CampaignDetails] Database update error:', error);
        throw error;
      }
      
      console.log('[CampaignDetails] Database update successful');
      
      // Update the local applications state immediately for better UX
      setApplications(prev => {
        console.log('[CampaignDetails] Previous applications:', prev);
        const updated = prev.map(app => 
          app.id === applicationId 
            ? { ...app, status: action, reviewed_at: new Date().toISOString(), reviewer_id: user?.id }
            : app
        );
        console.log('[CampaignDetails] Updated applications:', updated);
        return updated;
      });
      
      Alert.alert('Success', `Application ${action}`);
      
      // Refresh campaign data to update counts
      console.log('[CampaignDetails] Refreshing campaign data...');
      loadCampaignData();
    } catch (error) {
      console.error('[CampaignDetails] handleApplicationAction error:', error);
      Alert.alert('Error', 'Failed to update application');
    }
  };

  // Rating handlers (CM-16)
  const handleOpenRatingModal = async (applicationId: string) => {
    const { canRate, alreadyRated, error } = await canRateApplication(applicationId);
    if (!canRate) {
      if (alreadyRated) {
        Alert.alert('Already Rated', 'You have already rated this creator for this campaign.');
      } else {
        Alert.alert(
          'Cannot Rate', 
          error || 'You can only rate creators after their application is accepted and at least one deliverable has been approved.'
        );
      }
      return;
    }
    setSelectedApplicationId(applicationId);
    setRating(5);
    setRatingComment('');
    setRatingModalVisible(true);
  };

  const handleSubmitRating = async () => {
    if (!selectedApplicationId) return;
    
    setSubmittingRating(true);
    try {
      const result = await rateCreator({
        applicationId: selectedApplicationId,
        rating,
        comment: ratingComment || undefined,
      });

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to submit rating');
        return;
      }

      Alert.alert('Success', 'Rating submitted successfully');
      setRatingModalVisible(false);
      setSelectedApplicationId(null);
      setRating(5);
      setRatingComment('');
      
      // Refresh applications to show updated rating
      loadCampaignData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleWithdrawInvitation = async (invitationId: string) => {
    Alert.alert(
      'Withdraw Invitation',
      'Are you sure you want to withdraw this invitation? The creator will no longer be able to accept it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data, error } = await withdrawInvitation(invitationId);
              if (error) {
                Alert.alert('Error', error.message || 'Failed to withdraw invitation');
                return;
              }
              Alert.alert('Success', 'Invitation withdrawn successfully');
              loadCampaignData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to withdraw invitation');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'completed': return '#3B82F6';
      case 'cancelled': return '#EF4444';
      default: return DS.colors.textLight;
    }
  };

  const getDaysRemaining = () => {
    if (!campaign) return 0;
    const end = new Date(campaign.end_date);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: DS.colors.background }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={DS.colors.primaryOrange} />
        </View>
      </SafeAreaView>
    );
  }

  if (!campaign) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: DS.colors.background }}>
        <View style={{ padding: DS.spacing.md }}>
          <Text>Campaign not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: DS.colors.background }}>
      {/* Test Campaign Banner */}
      {isTestCampaign && (
      <View style={{
          backgroundColor: DS.colors.warning + '15',
          borderLeftWidth: 4,
          borderLeftColor: DS.colors.warning,
          padding: DS.spacing.md,
          marginHorizontal: DS.spacing.lg,
          marginTop: DS.spacing.md,
          borderRadius: DS.borderRadius.sm,
          flexDirection: 'row',
          alignItems: 'center',
        }}>
          <Star size={20} color={DS.colors.warning} fill={DS.colors.warning} />
          <View style={{ flex: 1, marginLeft: DS.spacing.sm }}>
            <Text style={{
              ...DS.typography.body,
              fontWeight: '600',
              color: DS.colors.warning,
              marginBottom: DS.spacing.xs,
            }}>
              Test Campaign for Rating Flow
            </Text>
            <Text style={{
              ...DS.typography.metadata,
              color: DS.colors.textGray,
            }}>
              Use this campaign to test the creator rating system. Look for accepted applications in the Applications tab.
            </Text>
          </View>
        </View>
      )}

      {/* Header */}
      <View style={{
        backgroundColor: DS.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: DS.colors.borderLight,
        paddingTop: DS.spacing.md,
        paddingBottom: DS.spacing.md,
        paddingHorizontal: DS.spacing.lg,
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={{
              width: DS.layout.buttonHeight.medium,
              height: DS.layout.buttonHeight.medium,
              borderRadius: DS.borderRadius.full,
              backgroundColor: DS.colors.surfaceLight,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowLeft size={DS.layout.iconSize.md} color={DS.colors.textDark} />
          </TouchableOpacity>
          
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{
              ...DS.typography.h2,
              color: DS.colors.textDark,
            }}>Campaign Details</Text>
          </View>
          
          <TouchableOpacity 
            onPress={() => router.push(`/business/campaigns/${id}/edit`)}
            style={{
              width: DS.layout.buttonHeight.medium,
              height: DS.layout.buttonHeight.medium,
              borderRadius: DS.borderRadius.full,
              backgroundColor: DS.colors.surfaceLight,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Edit size={DS.layout.iconSize.sm} color={DS.colors.primaryOrange} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        style={{ flex: 1 }}
      >
        {/* Hero Card */}
        <View style={{
          backgroundColor: DS.colors.surface,
          marginHorizontal: DS.spacing.lg,
          marginTop: DS.spacing.md,
          borderRadius: DS.borderRadius.lg,
          borderWidth: 1,
          borderColor: DS.colors.borderLight,
          ...DS.shadows.sm,
        }}>
          <View style={{ padding: DS.spacing.lg }}>
            {/* Title and Status */}
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              marginBottom: DS.spacing.md 
            }}>
              <Text style={{
                ...DS.typography.h3,
                color: DS.colors.textDark,
                flex: 1,
                marginRight: DS.spacing.sm,
              }}>{campaign.title || campaign.name}</Text>
              
              <View style={{
                backgroundColor: getStatusColor(campaign.status) + '15',
                paddingHorizontal: DS.spacing.sm,
                paddingVertical: DS.spacing.xs,
                borderRadius: DS.borderRadius.sm,
              }}>
                <Text style={{
                  ...DS.typography.caption,
                  fontWeight: '600',
                  color: getStatusColor(campaign.status),
                  textTransform: 'uppercase',
                }}>{campaign.status}</Text>
              </View>
            </View>

            {/* Key Metrics Grid */}
            <View style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: DS.spacing.md,
            }}>
              <View style={{
                flexDirection: 'row',
              alignItems: 'center',
                flex: 1,
                minWidth: '30%',
            }}>
                <View style={{
                  width: 32,
                  height: 32,
                  borderRadius: DS.borderRadius.sm,
                  backgroundColor: DS.colors.surfaceLight,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: DS.spacing.sm,
                }}>
                  <DollarSign size={DS.layout.iconSize.sm} color={DS.colors.primaryOrange} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    ...DS.typography.metadata,
                    color: DS.colors.textGray,
                  }}>
                    Budget
                  </Text>
                  <Text style={{
                    ...DS.typography.body,
                    fontWeight: '600',
                    color: DS.colors.textDark,
                  }}>
                  ${(campaign.spent_amount_cents / 100).toFixed(0)}/${(campaign.budget_cents / 100).toFixed(0)}
                </Text>
                </View>
              </View>
              
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                flex: 1,
                minWidth: '30%',
              }}>
                <View style={{
                  width: 32,
                  height: 32,
                  borderRadius: DS.borderRadius.sm,
                  backgroundColor: DS.colors.surfaceLight,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: DS.spacing.sm,
                }}>
                  <Users size={DS.layout.iconSize.sm} color={DS.colors.primaryOrange} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    ...DS.typography.metadata,
                    color: DS.colors.textGray,
                  }}>
                    Creators
                  </Text>
                  <Text style={{
                    ...DS.typography.body,
                    fontWeight: '600',
                    color: DS.colors.textDark,
                  }}>
                  {campaign.selected_creators_count}/{campaign.max_creators}
                </Text>
                </View>
              </View>
              
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                flex: 1,
                minWidth: '30%',
              }}>
                <View style={{
                  width: 32,
                  height: 32,
                  borderRadius: DS.borderRadius.sm,
                  backgroundColor: DS.colors.surfaceLight,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: DS.spacing.sm,
                }}>
                  <Clock size={DS.layout.iconSize.sm} color={DS.colors.primaryOrange} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    ...DS.typography.metadata,
                    color: DS.colors.textGray,
                  }}>
                    Time Left
                  </Text>
                  <Text style={{
                    ...DS.typography.body,
                    fontWeight: '600',
                    color: DS.colors.textDark,
                  }}>
                    {getDaysRemaining()}d
                </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Tab Navigation */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={{
            marginHorizontal: DS.spacing.lg,
            marginTop: DS.spacing.md,
          }}
          contentContainerStyle={{
            borderBottomWidth: 1,
            borderBottomColor: DS.colors.borderLight,
          }}
        >
          {['overview', 'applications', 'invitations', 'content', 'deliverables'].map((tab) => {
            const pendingCount = 
              tab === 'applications' ? applications.filter(a => a.status === 'pending').length :
              tab === 'invitations' ? invitations.filter(i => i.status === 'pending').length :
              tab === 'deliverables' ? deliverables.filter(d => d.status === 'pending_review').length : 0;
            
            return (
            <TouchableOpacity
              key={tab}
              style={{
                  paddingHorizontal: DS.spacing.md,
                  paddingVertical: DS.spacing.md,
                alignItems: 'center',
                borderBottomWidth: 2,
                  borderBottomColor: activeTab === tab ? DS.colors.primaryOrange : 'transparent',
                minWidth: 100,
              }}
              onPress={() => setActiveTab(tab as any)}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{
                    ...DS.typography.button,
                fontWeight: activeTab === tab ? '600' : '500',
                    color: activeTab === tab ? DS.colors.textDark : DS.colors.textGray,
                textTransform: 'capitalize',
              }}>
                {tab}
              </Text>
                  {pendingCount > 0 && (
                    <View style={{
                      backgroundColor: tab === 'applications' ? DS.colors.error : DS.colors.warning,
                      borderRadius: DS.borderRadius.full,
                      paddingHorizontal: DS.spacing.xs,
                      paddingVertical: 2,
                      marginLeft: DS.spacing.xs,
                      minWidth: 20,
                      alignItems: 'center',
                    }}>
                      <Text style={{
                        ...DS.typography.caption,
                        fontWeight: '700',
                        color: 'white',
                      }}>
                        {pendingCount}
                      </Text>
                    </View>
                  )}
                </View>
            </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <View style={{ paddingHorizontal: DS.spacing.lg, paddingTop: DS.spacing.md }}>
            {/* Quick Actions */}
            {campaign.status === 'active' && (
              <View style={{ 
                flexDirection: 'row', 
                gap: DS.spacing.sm, 
                marginBottom: DS.spacing.lg 
              }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: DS.colors.warning,
                    padding: DS.spacing.md,
                    borderRadius: DS.borderRadius.sm,
                    alignItems: 'center',
                  }}
                  onPress={() => handleStatusChange('pending')}
                >
                  <Text style={{ 
                    color: 'white', 
                    ...DS.typography.button,
                  }}>Pause</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: DS.colors.error,
                    padding: DS.spacing.md,
                    borderRadius: DS.borderRadius.sm,
                    alignItems: 'center',
                  }}
                  onPress={() => {
                    Alert.alert(
                      'End Campaign',
                      'Are you sure you want to end this campaign?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'End', style: 'destructive', onPress: () => handleStatusChange('completed') }
                      ]
                    );
                  }}
                >
                  <Text style={{ 
                    color: 'white', 
                    ...DS.typography.button,
                  }}>End</Text>
                </TouchableOpacity>
              </View>
            )}

            {campaign.status === 'pending' && (
              <TouchableOpacity
                style={{
                  backgroundColor: DS.colors.success,
                  padding: DS.spacing.md,
                  borderRadius: DS.borderRadius.sm,
                  alignItems: 'center',
                  marginBottom: DS.spacing.lg,
                }}
                onPress={() => handleStatusChange('active')}
              >
                <Text style={{ 
                  color: 'white', 
                  ...DS.typography.button,
                }}>Resume Campaign</Text>
              </TouchableOpacity>
            )}

            {/* Campaign Info Card */}
            <View style={{
              backgroundColor: DS.colors.surface,
              padding: DS.spacing.lg,
              borderRadius: DS.borderRadius.md,
              borderWidth: 1,
              borderColor: DS.colors.borderLight,
              marginBottom: DS.spacing.md,
              ...DS.shadows.sm,
            }}>
              <Text style={{ 
                ...DS.typography.body,
                color: DS.colors.textGray, 
                marginBottom: DS.spacing.md,
                lineHeight: 20,
              }}>{campaign.description}</Text>
              
              <View style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-between',
                paddingTop: DS.spacing.md,
                borderTopWidth: 1,
                borderTopColor: DS.colors.borderLight,
              }}>
                <Text style={{ 
                  ...DS.typography.metadata,
                  color: DS.colors.textGray,
                }}>
                  {new Date(campaign.start_date).toLocaleDateString()} - {new Date(campaign.end_date).toLocaleDateString()}
                </Text>
                <Text style={{ 
                  ...DS.typography.metadata,
                  color: DS.colors.textGray,
                }}>{campaign.restaurant?.name}</Text>
              </View>
            </View>

            {/* Progress Card */}
            <View style={{
              backgroundColor: DS.colors.surface,
              padding: DS.spacing.lg,
              borderRadius: DS.borderRadius.md,
              borderWidth: 1,
              borderColor: DS.colors.borderLight,
              ...DS.shadows.sm,
            }}>
              <View style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                marginBottom: DS.spacing.sm 
              }}>
                <Text style={{ 
                  ...DS.typography.metadata,
                  color: DS.colors.textGray,
                }}>Budget Used</Text>
                <Text style={{ 
                  ...DS.typography.metadata,
                  fontWeight: '600',
                  color: DS.colors.textDark,
                }}>
                  {Math.round((campaign.spent_amount_cents / campaign.budget_cents) * 100)}%
                </Text>
              </View>
              <View style={{
                height: 6,
                backgroundColor: DS.colors.surfaceLight,
                borderRadius: DS.borderRadius.xs,
                marginBottom: DS.spacing.md,
              }}>
                <View style={{
                  height: 6,
                  backgroundColor: DS.colors.primaryOrange,
                  borderRadius: DS.borderRadius.xs,
                  width: `${Math.min((campaign.spent_amount_cents / campaign.budget_cents) * 100, 100)}%`,
                }} />
              </View>
              
              {campaign.total_deliverables > 0 && (
                <>
                  <View style={{ 
                    flexDirection: 'row', 
                    justifyContent: 'space-between',
                    marginTop: DS.spacing.sm,
                  }}>
                    <Text style={{ 
                      ...DS.typography.metadata,
                      color: DS.colors.textGray,
                    }}>Deliverables</Text>
                    <Text style={{ 
                      ...DS.typography.metadata,
                      fontWeight: '600',
                      color: DS.colors.textDark,
                    }}>
                  {campaign.delivered_content_count}/{campaign.total_deliverables}
                </Text>
              </View>
              <View style={{
                    height: 6,
                    backgroundColor: DS.colors.surfaceLight,
                    borderRadius: DS.borderRadius.xs,
                    marginTop: DS.spacing.sm,
              }}>
                <View style={{
                      height: 6,
                      backgroundColor: DS.colors.success,
                      borderRadius: DS.borderRadius.xs,
                      width: `${Math.min((campaign.delivered_content_count / campaign.total_deliverables) * 100, 100)}%`,
                }} />
              </View>
                </>
              )}
            </View>

          </View>
        )}

        {activeTab === 'applications' && (
          <View style={{ paddingHorizontal: DS.spacing.lg, paddingTop: DS.spacing.md }}>
            {applications.length === 0 ? (
              <View style={{
                backgroundColor: DS.colors.surface,
                padding: DS.spacing.xxl,
                borderRadius: DS.borderRadius.md,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: DS.colors.borderLight,
                ...DS.shadows.sm,
              }}>
                <Users size={DS.layout.iconSize.xl} color={DS.colors.textGray} />
                <Text style={{
                  ...DS.typography.h3,
                  color: DS.colors.textDark,
                  marginTop: DS.spacing.md,
                  marginBottom: DS.spacing.xs,
                }}>No Applications Yet</Text>
                <Text style={{
                  ...DS.typography.body,
                  color: DS.colors.textGray,
                  textAlign: 'center',
                }}>Creators will apply once your campaign is active</Text>
              </View>
            ) : (
              applications.map((application) => (
                <View
                  key={application.id}
                  style={{
                    backgroundColor: DS.colors.surface,
                    padding: DS.spacing.md,
                    borderRadius: DS.borderRadius.md,
                    marginBottom: DS.spacing.sm,
                    borderWidth: 1,
                    borderColor: DS.colors.borderLight,
                    ...DS.shadows.sm,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Image
                      source={{ uri: application.creator_profiles.avatar_url || 'https://via.placeholder.com/50' }}
                      style={{
                        width: DS.layout.avatarSize.md,
                        height: DS.layout.avatarSize.md,
                        borderRadius: DS.borderRadius.full,
                        marginRight: DS.spacing.md,
                        backgroundColor: DS.colors.surfaceLight,
                      }}
                    />
                    <View style={{ flex: 1 }}>
                      <View style={{ 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        marginBottom: DS.spacing.xs 
                      }}>
                        <Text style={{ 
                          ...DS.typography.body,
                          fontWeight: '600', 
                          color: DS.colors.textDark,
                        }}>
                          {application.creator_profiles.display_name}
                        </Text>
                        <View style={{
                          backgroundColor: (application.status === 'accepted' ? DS.colors.success : 
                                         application.status === 'rejected' ? DS.colors.error : DS.colors.warning) + '15',
                          paddingHorizontal: DS.spacing.sm,
                          paddingVertical: DS.spacing.xs,
                          borderRadius: DS.borderRadius.sm,
                        }}>
                          <Text style={{ 
                            ...DS.typography.caption,
                            fontWeight: '600', 
                            color: application.status === 'accepted' ? DS.colors.success : 
                                   application.status === 'rejected' ? DS.colors.error : DS.colors.warning,
                            textTransform: 'uppercase',
                          }}>
                            {application.status}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ 
                        ...DS.typography.metadata,
                        color: DS.colors.textGray, 
                        marginBottom: DS.spacing.xs,
                      }}>
                        {application.creator_profiles.followers_count.toLocaleString()} followers • ${(application.proposed_rate_cents / 100).toFixed(0)}
                      </Text>
                      
                      {application.status === 'pending' && (
                        <View style={{ 
                          flexDirection: 'row', 
                          gap: DS.spacing.sm,
                          marginTop: DS.spacing.sm,
                        }}>
                          <TouchableOpacity
                            style={{
                              flex: 1,
                              backgroundColor: DS.colors.success,
                              padding: DS.spacing.sm,
                              borderRadius: DS.borderRadius.sm,
                              alignItems: 'center',
                            }}
                            onPress={() => handleApplicationAction(application.id, 'accepted')}
                          >
                            <Text style={{ 
                              color: 'white', 
                              ...DS.typography.button,
                            }}>Accept</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{
                              flex: 1,
                              backgroundColor: DS.colors.error,
                              padding: DS.spacing.sm,
                              borderRadius: DS.borderRadius.sm,
                              alignItems: 'center',
                            }}
                            onPress={() => handleApplicationAction(application.id, 'rejected')}
                          >
                            <Text style={{ 
                              color: 'white', 
                              ...DS.typography.button,
                            }}>Reject</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      
                      {application.status === 'accepted' && (
                        <View style={{ marginTop: DS.spacing.sm }}>
                          {application.rating ? (
                            <View style={{ 
                              flexDirection: 'row', 
                              alignItems: 'center', 
                              gap: DS.spacing.xs,
                              backgroundColor: DS.colors.surfaceLight,
                              padding: DS.spacing.sm,
                              borderRadius: DS.borderRadius.sm,
                            }}>
                              <Star size={DS.layout.iconSize.sm} color={DS.colors.primaryOrange} fill={DS.colors.primaryOrange} />
                              <Text style={{ 
                                ...DS.typography.metadata,
                                color: DS.colors.textDark, 
                                fontWeight: '600',
                              }}>
                                Rated {application.rating}/5
                              </Text>
                              {application.rating_comment && (
                                <Text style={{ 
                                  ...DS.typography.caption,
                                  color: DS.colors.textGray, 
                                  marginLeft: DS.spacing.sm, 
                                  flex: 1 
                                }} numberOfLines={1}>
                                  "{application.rating_comment}"
                                </Text>
                              )}
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={{
                                backgroundColor: DS.colors.primaryOrange,
                                padding: DS.spacing.sm,
                                borderRadius: DS.borderRadius.sm,
                                alignItems: 'center',
                                flexDirection: 'row',
                                justifyContent: 'center',
                                gap: DS.spacing.xs,
                              }}
                              onPress={() => handleOpenRatingModal(application.id)}
                            >
                              <Star size={DS.layout.iconSize.sm} color="white" fill="white" />
                              <Text style={{ 
                                color: 'white', 
                                ...DS.typography.button,
                              }}>Rate Creator</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'content' && (
          <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
            {content.length === 0 ? (
              <View style={{
                backgroundColor: '#FFFFFF',
                padding: 24,
                borderRadius: 8,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#E8E8E8',
              }}>
                <Target size={32} color="#8C8C8C" />
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#262626',
                  marginTop: 12,
                  marginBottom: 4,
                }}>No Content Yet</Text>
                <Text style={{
                  fontSize: 13,
                  color: '#8C8C8C',
                  textAlign: 'center',
                }}>Content will appear here as creators deliver</Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {content.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={{
                      width: '48%',
                    }}
                  >
                    <View style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 8,
                      overflow: 'hidden',
                      borderWidth: 1,
                      borderColor: '#E8E8E8',
                    }}>
                      <Image
                        source={{ uri: item.thumbnail_url }}
                        style={{
                          width: '100%',
                          height: 100,
                          backgroundColor: '#F7F7F7',
                        }}
                      />
                      <View style={{ padding: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <Image
                            source={{ uri: item.creator_profiles.avatar_url || 'https://via.placeholder.com/16' }}
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: 8,
                              marginRight: 4,
                            }}
                          />
                          <Text style={{ fontSize: 11, color: '#262626', flex: 1, fontWeight: '500' }} numberOfLines={1}>
                            {item.creator_profiles.display_name}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 10, color: '#8C8C8C' }}>
                          {item.views} views • {item.likes} likes
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {activeTab === 'invitations' && (
          <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
            {invitations.length === 0 ? (
              <View style={{
                backgroundColor: '#FFFFFF',
                padding: 24,
                borderRadius: 8,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#E8E8E8',
              }}>
                <Mail size={32} color="#8C8C8C" />
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#262626',
                  marginTop: 12,
                  marginBottom: 4,
                }}>No Invitations Yet</Text>
                <Text style={{
                  fontSize: 13,
                  color: '#8C8C8C',
                  textAlign: 'center',
                  marginBottom: 16,
                }}>Invite creators from the Browse Creators screen</Text>
                <TouchableOpacity
                  style={{
                    backgroundColor: '#FFAD27',
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 8,
                  }}
                  onPress={() => router.push('/business/creators/browse')}
                >
                  <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>Browse Creators</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {invitations.map((invitation) => (
                  <View
                    key={invitation.id}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: '#E8E8E8',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.05,
                      shadowRadius: 8,
                      elevation: 2,
                      padding: 16,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                      <Image
                        source={{ uri: invitation.creator?.avatar_url || 'https://via.placeholder.com/50' }}
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 24,
                          marginRight: 12,
                          backgroundColor: '#F7F7F7',
                        }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          fontSize: 16,
                          fontWeight: '600',
                          color: '#262626',
                          marginBottom: 2,
                        }}>
                          {invitation.creator?.display_name || 'Unknown Creator'}
                        </Text>
                        {invitation.creator?.username && (
                          <Text style={{
                            fontSize: 13,
                            color: '#8C8C8C',
                          }}>
                            @{invitation.creator.username}
                          </Text>
                        )}
                      </View>
                      <View style={{
                        backgroundColor: invitation.status === 'accepted' ? '#10B981' :
                                       invitation.status === 'declined' ? '#DC2626' :
                                       invitation.status === 'withdrawn' ? '#6B7280' :
                                       invitation.status === 'expired' ? '#F59E0B' : '#F59E0B',
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 6,
                      }}>
                        <Text style={{
                          color: 'white',
                          fontSize: 11,
                          fontWeight: '600',
                          textTransform: 'uppercase',
                        }}>
                          {invitation.status}
                        </Text>
                      </View>
                    </View>

                    {invitation.message && (
                      <View style={{
                        backgroundColor: '#F7F7F7',
                        padding: 12,
                        borderRadius: 8,
                        marginBottom: 12,
                      }}>
                        <Text style={{
                          fontSize: 13,
                          color: '#262626',
                          lineHeight: 18,
                        }}>
                          {invitation.message}
                        </Text>
                      </View>
                    )}

                    <View style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 12,
                    }}>
                      <Text style={{
                        fontSize: 12,
                        color: '#8C8C8C',
                      }}>
                        Sent {new Date(invitation.invited_at).toLocaleDateString()}
                      </Text>
                      {invitation.status === 'pending' && invitation.expires_at && (
                        <Text style={{
                          fontSize: 12,
                          color: '#F59E0B',
                          fontWeight: '500',
                        }}>
                          Expires {new Date(invitation.expires_at).toLocaleDateString()}
                        </Text>
                      )}
                      {invitation.responded_at && (
                        <Text style={{
                          fontSize: 12,
                          color: '#8C8C8C',
                        }}>
                          Responded {new Date(invitation.responded_at).toLocaleDateString()}
                        </Text>
                      )}
                    </View>

                    {invitation.status === 'pending' && (
                      <TouchableOpacity
                        style={{
                          backgroundColor: '#DC2626',
                          padding: 10,
                          borderRadius: 8,
                          alignItems: 'center',
                        }}
                        onPress={() => handleWithdrawInvitation(invitation.id)}
                      >
                        <Text style={{
                          color: 'white',
                          fontWeight: '600',
                          fontSize: 14,
                        }}>
                          Withdraw Invitation
                        </Text>
                      </TouchableOpacity>
                    )}

                    {invitation.status === 'accepted' && (
                      <View style={{
                        backgroundColor: '#F0FDF4',
                        padding: 10,
                        borderRadius: 8,
                        alignItems: 'center',
                      }}>
                        <Text style={{
                          color: '#10B981',
                          fontWeight: '600',
                          fontSize: 13,
                        }}>
                          ✓ Creator accepted this invitation
                        </Text>
                      </View>
                    )}

                    {invitation.status === 'declined' && (
                      <View style={{
                        backgroundColor: '#FEF2F2',
                        padding: 10,
                        borderRadius: 8,
                        alignItems: 'center',
                      }}>
                        <Text style={{
                          color: '#DC2626',
                          fontWeight: '600',
                          fontSize: 13,
                        }}>
                          Creator declined this invitation
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {activeTab === 'deliverables' && (
          <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
            {deliverables.length === 0 ? (
              <View style={{
                backgroundColor: '#FFFFFF',
                padding: 24,
                borderRadius: 8,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#E8E8E8',
              }}>
                <Target size={32} color="#8C8C8C" />
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#262626',
                  marginTop: 12,
                  marginBottom: 4,
                }}>No Deliverables Yet</Text>
                <Text style={{
                  fontSize: 13,
                  color: '#8C8C8C',
                  textAlign: 'center',
                }}>Deliverables will appear here as creators submit content</Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {deliverables.map((deliverable) => (
                  <DeliverableCard 
                    key={deliverable.id} 
                    deliverable={deliverable} 
                    onStatusChange={(status, feedback) => handleDeliverableStatusChange(deliverable.id, status, feedback)}
                    onRateCreator={handleOpenRatingModal}
                  />
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Rating Modal (CM-16) */}
      <Modal
        visible={ratingModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRatingModalVisible(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}>
          <View style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: 24,
            width: '100%',
            maxWidth: 400,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#262626' }}>Rate Creator</Text>
              <TouchableOpacity onPress={() => setRatingModalVisible(false)}>
                <X size={24} color="#8C8C8C" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 14, color: '#8C8C8C', marginBottom: 16 }}>
              How would you rate this creator's performance?
            </Text>

            {/* Star Rating */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  style={{ padding: 4 }}
                >
                  <Star
                    size={40}
                    color="#FFAD27"
                    fill={star <= rating ? '#FFAD27' : 'transparent'}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ fontSize: 14, color: '#262626', textAlign: 'center', marginBottom: 16, fontWeight: '600' }}>
              {rating} {rating === 1 ? 'star' : 'stars'}
            </Text>

            {/* Comment Input */}
            <Text style={{ fontSize: 14, color: '#262626', marginBottom: 8, fontWeight: '500' }}>
              Optional Feedback
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#E8E8E8',
                borderRadius: 8,
                padding: 12,
                minHeight: 100,
                textAlignVertical: 'top',
                fontSize: 14,
                color: '#262626',
              }}
              placeholder="Share your experience..."
              placeholderTextColor="#8C8C8C"
              value={ratingComment}
              onChangeText={setRatingComment}
              multiline
              maxLength={500}
            />

            {/* Submit Button */}
            <TouchableOpacity
              style={{
                backgroundColor: '#FFAD27',
                padding: 14,
                borderRadius: 8,
                alignItems: 'center',
                marginTop: 20,
                opacity: submittingRating ? 0.6 : 1,
              }}
              onPress={handleSubmitRating}
              disabled={submittingRating}
            >
              {submittingRating ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>Submit Rating</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const DeliverableCard = ({ 
  deliverable, 
  onStatusChange,
  onRateCreator
}: { 
  deliverable: Deliverable; 
  onStatusChange: (status: string, feedback?: string) => void;
  onRateCreator?: (applicationId: string) => void;
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [canRate, setCanRate] = useState(false);
  const [checkingRating, setCheckingRating] = useState(false);
  
  useEffect(() => {
    // Check if rating is available for approved deliverables
    if (deliverable.status === 'approved' || deliverable.status === 'auto_approved') {
      if (deliverable.campaign_applications?.id) {
        setCheckingRating(true);
        canRateApplication(deliverable.campaign_applications.id)
          .then(({ canRate: canRateResult }) => {
            setCanRate(canRateResult);
            setCheckingRating(false);
          })
          .catch(() => setCheckingRating(false));
      }
    }
  }, [deliverable.status, deliverable.campaign_applications?.id]);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_review': return DS.colors.warning;
      case 'approved': 
      case 'auto_approved': return DS.colors.success;
      case 'rejected': return DS.colors.error;
      case 'revision_requested':
      case 'needs_revision': return '#8B5CF6';
      case 'disputed': return DS.colors.error;
      default: return DS.colors.textGray;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending_review': return 'Pending Review';
      case 'approved': return 'Approved';
      case 'auto_approved': return 'Auto Approved';
      case 'rejected': return 'Rejected';
      case 'revision_requested':
      case 'needs_revision': return 'Needs Revision';
      case 'disputed': return 'Disputed';
      default: return 'Unknown';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending_review': return '⏳';
      case 'approved': 
      case 'auto_approved': return '✓';
      case 'rejected': return '✗';
      case 'revision_requested':
      case 'needs_revision': return '↻';
      case 'disputed': return '⚠';
      default: return '•';
    }
  };

  const getContentTypeIcon = (type?: string) => {
    switch (type?.toLowerCase()) {
      case 'photo': return '📷';
      case 'video': return '🎥';
      case 'reel': return '🎬';
      case 'story': return '📱';
      case 'post': return '📝';
      default: return '📄';
    }
  };

  const getTimeRemaining = () => {
    if (deliverable.status !== 'pending_review') return null;
    
    const submittedAt = new Date(deliverable.submitted_at);
    const deadline = new Date(submittedAt.getTime() + 72 * 60 * 60 * 1000); // 72 hours
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Overdue';
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  const timeRemaining = getTimeRemaining();
  const isApproved = deliverable.status === 'approved' || deliverable.status === 'auto_approved';
  const hasMetrics = deliverable.views_count !== undefined || deliverable.likes_count !== undefined;

  return (
    <View style={{
      backgroundColor: DS.colors.surface,
      borderRadius: DS.borderRadius.lg,
      borderWidth: 1,
      borderColor: DS.colors.border,
      ...DS.shadows.sm,
      overflow: 'hidden',
    }}>
      {/* Thumbnail Preview */}
      {deliverable.thumbnail_url && (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={async () => {
            try {
              const url = deliverable.platform_post_url;
              if (!url) {
                Alert.alert('Error', 'No post URL available');
                return;
              }
              const canOpen = await Linking.canOpenURL(url);
              if (!canOpen) {
                Alert.alert('Error', 'Cannot open this URL');
                return;
              }
              await Linking.openURL(url);
            } catch (error) {
              console.error('Error opening URL:', error);
              Alert.alert('Error', 'Failed to open the post URL');
            }
          }}
        >
          <Image
            source={{ uri: deliverable.thumbnail_url }}
            style={{
              width: '100%',
              height: 200,
              backgroundColor: DS.colors.surfaceLight,
            }}
            resizeMode="cover"
          />
          {/* Overlay with content type */}
      <View style={{
            position: 'absolute',
            top: DS.spacing.sm,
            right: DS.spacing.sm,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            paddingHorizontal: DS.spacing.sm,
            paddingVertical: DS.spacing.xs,
            borderRadius: DS.borderRadius.xs,
        flexDirection: 'row',
        alignItems: 'center',
          }}>
            <Text style={{ fontSize: 12, marginRight: 4 }}>{getContentTypeIcon(deliverable.content_type)}</Text>
            <Text style={{
              ...DS.typography.caption,
              color: DS.colors.textWhite,
              textTransform: 'uppercase',
            }}>
              {deliverable.content_type || 'Post'}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Header Section */}
      <View style={{
        padding: DS.spacing.lg,
        paddingBottom: DS.spacing.md,
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: DS.spacing.sm,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Image
              source={{ uri: deliverable.creator_profiles.avatar_url || 'https://via.placeholder.com/32' }}
              style={{
                width: DS.layout.avatarSize.sm,
                height: DS.layout.avatarSize.sm,
                borderRadius: DS.layout.avatarSize.sm / 2,
                marginRight: DS.spacing.sm,
                backgroundColor: DS.colors.surfaceLight,
              }}
            />
            <View style={{ flex: 1 }}>
            <Text style={{
                ...DS.typography.h3,
                color: DS.colors.textDark,
                marginBottom: 2,
            }}>
              {deliverable.creator_profiles.display_name}
            </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{
                  ...DS.typography.metadata,
                  color: DS.colors.textGray,
              textTransform: 'uppercase',
                  marginRight: DS.spacing.xs,
            }}>
                  {deliverable.platform || 'Social'}
            </Text>
                {deliverable.submitted_at && (
                  <>
                    <Text style={{ ...DS.typography.metadata, color: DS.colors.textLight }}>•</Text>
                    <Text style={{
                      ...DS.typography.metadata,
                      color: DS.colors.textGray,
                      marginLeft: DS.spacing.xs,
                    }}>
                      {new Date(deliverable.submitted_at).toLocaleDateString()}
                    </Text>
                  </>
                )}
              </View>
            </View>
          </View>
          
          {/* Status Badge */}
            <View style={{
            backgroundColor: `${getStatusColor(deliverable.status)}15`,
            paddingHorizontal: DS.spacing.sm,
            paddingVertical: DS.spacing.xs,
            borderRadius: DS.borderRadius.sm,
            borderWidth: 1,
            borderColor: `${getStatusColor(deliverable.status)}30`,
            }}>
              <Text style={{
              ...DS.typography.caption,
                fontWeight: '600',
              color: getStatusColor(deliverable.status),
              }}>
              {`${getStatusIcon(deliverable.status)} ${getStatusText(deliverable.status)}`}
              </Text>
            </View>
        </View>
        
        {/* Time Remaining Alert */}
        {timeRemaining && (
        <View style={{
            backgroundColor: timeRemaining === 'Overdue' ? `${DS.colors.error}15` : `${DS.colors.warning}15`,
            paddingHorizontal: DS.spacing.sm,
            paddingVertical: DS.spacing.xs,
            borderRadius: DS.borderRadius.xs,
            marginTop: DS.spacing.xs,
            flexDirection: 'row',
            alignItems: 'center',
        }}>
          <Text style={{
              ...DS.typography.caption,
            fontWeight: '600',
              color: timeRemaining === 'Overdue' ? DS.colors.error : DS.colors.warning,
          }}>
              {timeRemaining === 'Overdue' ? '⚠️ Overdue for Review' : `⏰ ${timeRemaining} to review`}
          </Text>
        </View>
        )}

        {/* Engagement Metrics */}
        {hasMetrics && (deliverable.views_count || deliverable.likes_count || deliverable.comments_count) && (
          <View style={{
            flexDirection: 'row',
            marginTop: DS.spacing.md,
            paddingTop: DS.spacing.md,
            borderTopWidth: 1,
            borderTopColor: DS.colors.borderLight,
            gap: DS.spacing.md,
          }}>
            {deliverable.views_count !== undefined && deliverable.views_count > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ ...DS.typography.metadata, color: DS.colors.textGray, marginRight: 4 }}>👁</Text>
                <Text style={{ ...DS.typography.metadata, color: DS.colors.textDark, fontWeight: '600' }}>
                  {deliverable.views_count.toLocaleString()}
                </Text>
              </View>
            )}
            {deliverable.likes_count !== undefined && deliverable.likes_count > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ ...DS.typography.metadata, color: DS.colors.textGray, marginRight: 4 }}>❤️</Text>
                <Text style={{ ...DS.typography.metadata, color: DS.colors.textDark, fontWeight: '600' }}>
                  {deliverable.likes_count.toLocaleString()}
                </Text>
              </View>
            )}
            {deliverable.comments_count !== undefined && deliverable.comments_count > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ ...DS.typography.metadata, color: DS.colors.textGray, marginRight: 4 }}>💬</Text>
                <Text style={{ ...DS.typography.metadata, color: DS.colors.textDark, fontWeight: '600' }}>
                  {deliverable.comments_count.toLocaleString()}
                </Text>
              </View>
            )}
            {deliverable.engagement_rate !== undefined && deliverable.engagement_rate > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 'auto' }}>
                <Text style={{ ...DS.typography.metadata, color: DS.colors.textGray, marginRight: 4 }}>📊</Text>
                <Text style={{ ...DS.typography.metadata, color: DS.colors.success, fontWeight: '600' }}>
                  {deliverable.engagement_rate.toFixed(1)}%
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Collapsible Details */}
      {showDetails && (
        <View style={{
          paddingHorizontal: DS.spacing.lg,
          paddingBottom: DS.spacing.md,
          borderTopWidth: 1,
          borderTopColor: DS.colors.borderLight,
          backgroundColor: DS.colors.surfaceLight,
        }}>
          {/* Caption */}
          {deliverable.caption && (
            <View style={{ marginBottom: DS.spacing.md }}>
            <Text style={{
                ...DS.typography.body,
                color: DS.colors.textDark,
                lineHeight: 20,
            }}>
              {deliverable.caption}
            </Text>
            </View>
          )}
          
          {/* View Post Button */}
          {deliverable.platform_post_url && (
          <TouchableOpacity
            style={{
                backgroundColor: DS.colors.surface,
                padding: DS.spacing.md,
                borderRadius: DS.borderRadius.md,
              borderWidth: 1,
                borderColor: DS.colors.border,
                marginBottom: DS.spacing.md,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
                ...DS.shadows.sm,
            }}
            onPress={async () => {
              try {
                const url = deliverable.platform_post_url;
                if (!url) {
                  Alert.alert('Error', 'No post URL available');
                  return;
                }
                const canOpen = await Linking.canOpenURL(url);
                if (!canOpen) {
                  Alert.alert('Error', 'Cannot open this URL');
                  return;
                }
                await Linking.openURL(url);
              } catch (error) {
                console.error('Error opening URL:', error);
                Alert.alert('Error', 'Failed to open the post URL');
              }
            }}
          >
              <ExternalLink size={DS.layout.iconSize.sm} color={DS.colors.primaryOrange} style={{ marginRight: DS.spacing.xs }} />
            <Text style={{
                ...DS.typography.button,
                color: DS.colors.primaryOrange,
            }}>
                View Post on {deliverable.platform || 'Platform'}
            </Text>
          </TouchableOpacity>
          )}

          {/* Review Info */}
          {deliverable.reviewed_at && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: DS.spacing.sm,
            }}>
              <Text style={{
                ...DS.typography.metadata,
                color: DS.colors.textGray,
              }}>
                Reviewed {new Date(deliverable.reviewed_at).toLocaleDateString()}
                {deliverable.auto_approved && ' (Auto-approved)'}
              </Text>
            </View>
          )}

          {/* Feedback */}
          {deliverable.restaurant_feedback && (
            <View style={{
              backgroundColor: `${DS.colors.info}10`,
              padding: DS.spacing.md,
              borderRadius: DS.borderRadius.md,
              borderLeftWidth: 3,
              borderLeftColor: DS.colors.info,
            }}>
              <Text style={{
                ...DS.typography.caption,
                fontWeight: '600',
                color: DS.colors.info,
                marginBottom: DS.spacing.xs,
                textTransform: 'uppercase',
              }}>
                Your Feedback:
              </Text>
              <Text style={{
                ...DS.typography.body,
                color: DS.colors.textDark,
              }}>
                {deliverable.restaurant_feedback}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Rate Creator CTA for Approved Deliverables */}
      {isApproved && canRate && deliverable.campaign_applications?.id && (
        <View style={{
          paddingHorizontal: DS.spacing.lg,
          paddingVertical: DS.spacing.md,
          backgroundColor: `${DS.colors.success}10`,
          borderTopWidth: 1,
          borderTopColor: DS.colors.borderLight,
        }}>
          <TouchableOpacity
            style={{
              backgroundColor: DS.colors.primaryOrange,
              paddingVertical: DS.spacing.md,
              paddingHorizontal: DS.spacing.lg,
              borderRadius: DS.borderRadius.md,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              ...DS.shadows.sm,
            }}
            onPress={() => onRateCreator?.(deliverable.campaign_applications!.id)}
          >
            <Star size={DS.layout.iconSize.sm} color={DS.colors.textWhite} fill={DS.colors.textWhite} style={{ marginRight: DS.spacing.xs }} />
            <Text style={{
              ...DS.typography.button,
              color: DS.colors.textWhite,
            }}>
              Rate Creator
            </Text>
          </TouchableOpacity>
          <Text style={{
            ...DS.typography.caption,
            color: DS.colors.textGray,
            textAlign: 'center',
            marginTop: DS.spacing.xs,
          }}>
            All deliverables approved - ready to rate
          </Text>
        </View>
      )}

      {/* Already Rated Indicator */}
      {isApproved && deliverable.campaign_applications?.rating && (
        <View style={{
          paddingHorizontal: DS.spacing.lg,
          paddingVertical: DS.spacing.md,
          backgroundColor: `${DS.colors.success}10`,
          borderTopWidth: 1,
          borderTopColor: DS.colors.borderLight,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Star size={DS.layout.iconSize.sm} color={DS.colors.success} fill={DS.colors.success} style={{ marginRight: DS.spacing.xs }} />
          <Text style={{
            ...DS.typography.body,
            color: DS.colors.success,
            fontWeight: '600',
          }}>
            Rated {deliverable.campaign_applications.rating}/5
          </Text>
        </View>
      )}

      {/* Actions - Always Visible for Pending */}
      {deliverable.status === 'pending_review' && (
        <View style={{
          flexDirection: 'row',
          paddingHorizontal: DS.spacing.lg,
          paddingBottom: DS.spacing.lg,
          paddingTop: DS.spacing.md,
          gap: DS.spacing.sm,
          borderTopWidth: 1,
          borderTopColor: DS.colors.borderLight,
        }}>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: DS.colors.success,
              paddingVertical: DS.spacing.md,
              borderRadius: DS.borderRadius.md,
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: DS.layout.buttonHeight.medium,
              ...DS.shadows.sm,
            }}
            onPress={() => onStatusChange('approved')}
          >
            <Text style={{
              ...DS.typography.button,
              color: DS.colors.textWhite,
            }}>
              ✓ Approve
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: '#8B5CF6',
              paddingVertical: DS.spacing.md,
              borderRadius: DS.borderRadius.md,
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: DS.layout.buttonHeight.medium,
              ...DS.shadows.sm,
            }}
            onPress={() => {
              Alert.prompt(
                'Request Revision',
                'What changes would you like the creator to make?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Send', onPress: (feedback?: string) => onStatusChange('revision_requested', feedback || '') }
                ]
              );
            }}
          >
            <Text style={{
              ...DS.typography.button,
              color: DS.colors.textWhite,
            }}>
              ↻ Revision
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: DS.colors.error,
              paddingVertical: DS.spacing.md,
              borderRadius: DS.borderRadius.md,
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: DS.layout.buttonHeight.medium,
              ...DS.shadows.sm,
            }}
            onPress={() => {
              Alert.prompt(
                'Reject Deliverable',
                'Please provide feedback for the rejection:',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Reject', onPress: (feedback?: string) => onStatusChange('rejected', feedback || '') }
                ]
              );
            }}
          >
            <Text style={{
              ...DS.typography.button,
              color: DS.colors.textWhite,
            }}>
              ✗ Reject
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Toggle Details Button */}
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: DS.spacing.md,
          borderTopWidth: 1,
          borderTopColor: DS.colors.borderLight,
          backgroundColor: DS.colors.surfaceLight,
        }}
        onPress={() => setShowDetails(!showDetails)}
        activeOpacity={0.7}
      >
        <Text style={{
          ...DS.typography.metadata,
          color: DS.colors.textGray,
          fontWeight: '600',
          marginRight: DS.spacing.xs,
        }}>
          {showDetails ? 'Hide Details' : 'Show Details'}
        </Text>
        <Text style={{
          ...DS.typography.metadata,
          color: DS.colors.textGray,
          transform: [{ rotate: showDetails ? '180deg' : '0deg' }],
        }}>
          ▼
        </Text>
      </TouchableOpacity>
    </View>
  );
};