import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Users,
  Target,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  Pause,
  Play,
  Trash2,
  Plus,
  ChevronRight,
} from 'lucide-react-native';
import { DS } from '@/components/design-system/tokens';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface CampaignDetail {
  id: string;
  name: string;
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

export default function CampaignDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [content, setContent] = useState<Content[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'applications' | 'content'>('overview');

  useEffect(() => {
    if (id) {
      loadCampaignData();
    }
  }, [id]);

  const loadCampaignData = async () => {
    try {
      if (!user?.id || !id) return;

      // Load campaign details
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select(`
          *,
          restaurants (
            id,
            name,
            cover_photo_url
          )
        `)
        .eq('id', id)
        .eq('owner_id', user.id)
        .single();

      if (campaignError) throw campaignError;

      setCampaign({
        ...campaignData,
        restaurant: campaignData.restaurants,
      });

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

      if (appsError) throw appsError;
      setApplications(applicationsData || []);

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
      const { error } = await supabase
        .from('campaign_applications')
        .update({ 
          status: action,
          reviewed_at: new Date().toISOString(),
          reviewer_id: user?.id
        })
        .eq('id', applicationId);

      if (error) throw error;
      
      Alert.alert('Success', `Application ${action}`);
      loadCampaignData();
    } catch (error) {
      Alert.alert('Error', 'Failed to update application');
    }
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
          <ActivityIndicator size="large" color={DS.colors.primary} />
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
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: DS.spacing.md,
        backgroundColor: DS.colors.backgroundWhite,
        borderBottomWidth: 1,
        borderBottomColor: DS.colors.border,
      }}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={DS.colors.text} />
        </TouchableOpacity>
        <Text style={{
          fontSize: 17,
          fontWeight: '600',
          color: DS.colors.text,
          flex: 1,
          textAlign: 'center',
        }}>Campaign Details</Text>
        <TouchableOpacity onPress={() => router.push(`/business/campaigns/edit/${id}`)}>
          <Edit size={20} color={DS.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Campaign Header */}
        <View style={{
          backgroundColor: DS.colors.backgroundWhite,
          padding: DS.spacing.md,
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            marginBottom: DS.spacing.md,
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 20,
                fontWeight: '700',
                color: DS.colors.text,
                marginBottom: DS.spacing.xs,
              }}>{campaign.name}</Text>
              <View style={{
                backgroundColor: getStatusColor(campaign.status),
                paddingHorizontal: DS.spacing.xs,
                paddingVertical: 4,
                borderRadius: DS.borderRadius.xs,
                alignSelf: 'flex-start',
              }}>
                <Text style={{
                  color: 'white',
                  fontSize: 10,
                  fontWeight: '600',
                  textTransform: 'uppercase',
                }}>{campaign.status}</Text>
              </View>
            </View>
          </View>

          <Text style={{
            fontSize: 14,
            color: DS.colors.textLight,
            lineHeight: 20,
            marginBottom: DS.spacing.md,
          }}>{campaign.description}</Text>

          {/* Quick Stats */}
          <View style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            marginTop: DS.spacing.sm,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: DS.spacing.md, marginBottom: DS.spacing.xs }}>
              <DollarSign size={16} color={DS.colors.textLight} />
              <Text style={{ marginLeft: 4, fontSize: 14, color: DS.colors.text }}>
                ${(campaign.spent_amount_cents / 100).toFixed(0)} / ${(campaign.budget_cents / 100).toFixed(0)}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: DS.spacing.md, marginBottom: DS.spacing.xs }}>
              <Users size={16} color={DS.colors.textLight} />
              <Text style={{ marginLeft: 4, fontSize: 14, color: DS.colors.text }}>
                {campaign.selected_creators_count} / {campaign.max_creators} creators
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: DS.spacing.xs }}>
              <Clock size={16} color={DS.colors.textLight} />
              <Text style={{ marginLeft: 4, fontSize: 14, color: DS.colors.text }}>
                {getDaysRemaining()} days left
              </Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={{
          flexDirection: 'row',
          backgroundColor: DS.colors.backgroundWhite,
          borderBottomWidth: 1,
          borderBottomColor: DS.colors.border,
        }}>
          {['overview', 'applications', 'content'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={{
                flex: 1,
                paddingVertical: DS.spacing.sm,
                alignItems: 'center',
                borderBottomWidth: 2,
                borderBottomColor: activeTab === tab ? DS.colors.primary : 'transparent',
              }}
              onPress={() => setActiveTab(tab as any)}
            >
              <Text style={{
                fontSize: 14,
                fontWeight: activeTab === tab ? '600' : '400',
                color: activeTab === tab ? DS.colors.primary : DS.colors.textLight,
                textTransform: 'capitalize',
              }}>
                {tab}
                {tab === 'applications' && applications.filter(a => a.status === 'pending').length > 0 && (
                  <Text style={{ color: '#DC2626' }}> ({applications.filter(a => a.status === 'pending').length})</Text>
                )}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <View style={{ padding: DS.spacing.md }}>
            {/* Metrics Cards */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: DS.spacing.md }}>
              <View style={{
                flex: 1,
                minWidth: '45%',
                backgroundColor: DS.colors.backgroundWhite,
                padding: DS.spacing.md,
                borderRadius: DS.borderRadius.md,
                marginRight: DS.spacing.sm,
                marginBottom: DS.spacing.sm,
              }}>
                <Text style={{ fontSize: 12, color: DS.colors.textLight, marginBottom: 4 }}>Budget Used</Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: DS.colors.text }}>
                  {Math.round((campaign.spent_amount_cents / campaign.budget_cents) * 100)}%
                </Text>
                <View style={{
                  height: 4,
                  backgroundColor: DS.colors.border,
                  borderRadius: 2,
                  marginTop: DS.spacing.xs,
                }}>
                  <View style={{
                    height: 4,
                    backgroundColor: DS.colors.primary,
                    borderRadius: 2,
                    width: `${(campaign.spent_amount_cents / campaign.budget_cents) * 100}%`,
                  }} />
                </View>
              </View>

              <View style={{
                flex: 1,
                minWidth: '45%',
                backgroundColor: DS.colors.backgroundWhite,
                padding: DS.spacing.md,
                borderRadius: DS.borderRadius.md,
                marginBottom: DS.spacing.sm,
              }}>
                <Text style={{ fontSize: 12, color: DS.colors.textLight, marginBottom: 4 }}>Deliverables</Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: DS.colors.text }}>
                  {campaign.delivered_content_count} / {campaign.total_deliverables}
                </Text>
                <View style={{
                  height: 4,
                  backgroundColor: DS.colors.border,
                  borderRadius: 2,
                  marginTop: DS.spacing.xs,
                }}>
                  <View style={{
                    height: 4,
                    backgroundColor: '#10B981',
                    borderRadius: 2,
                    width: `${(campaign.delivered_content_count / (campaign.total_deliverables || 1)) * 100}%`,
                  }} />
                </View>
              </View>
            </View>

            {/* Campaign Details */}
            <View style={{
              backgroundColor: DS.colors.backgroundWhite,
              padding: DS.spacing.md,
              borderRadius: DS.borderRadius.md,
              marginBottom: DS.spacing.md,
            }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: DS.colors.text, marginBottom: DS.spacing.md }}>
                Campaign Details
              </Text>
              
              <View style={{ marginBottom: DS.spacing.sm }}>
                <Text style={{ fontSize: 12, color: DS.colors.textLight, marginBottom: 4 }}>Duration</Text>
                <Text style={{ fontSize: 14, color: DS.colors.text }}>
                  {new Date(campaign.start_date).toLocaleDateString()} - {new Date(campaign.end_date).toLocaleDateString()}
                </Text>
              </View>

              <View style={{ marginBottom: DS.spacing.sm }}>
                <Text style={{ fontSize: 12, color: DS.colors.textLight, marginBottom: 4 }}>Restaurant</Text>
                <Text style={{ fontSize: 14, color: DS.colors.text }}>{campaign.restaurant?.name}</Text>
              </View>

              <View>
                <Text style={{ fontSize: 12, color: DS.colors.textLight, marginBottom: 4 }}>Created</Text>
                <Text style={{ fontSize: 14, color: DS.colors.text }}>
                  {new Date(campaign.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>

            {/* Actions */}
            {campaign.status === 'active' && (
              <View style={{ marginBottom: DS.spacing.md }}>
                <TouchableOpacity
                  style={{
                    backgroundColor: '#F59E0B',
                    padding: DS.spacing.md,
                    borderRadius: DS.borderRadius.sm,
                    alignItems: 'center',
                    marginBottom: DS.spacing.sm,
                  }}
                  onPress={() => handleStatusChange('pending')}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Pause size={20} color="white" />
                    <Text style={{ color: 'white', fontWeight: '600', marginLeft: DS.spacing.xs }}>
                      Pause Campaign
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    backgroundColor: '#DC2626',
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
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <XCircle size={20} color="white" />
                    <Text style={{ color: 'white', fontWeight: '600', marginLeft: DS.spacing.xs }}>
                      End Campaign
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {campaign.status === 'pending' && (
              <TouchableOpacity
                style={{
                  backgroundColor: '#10B981',
                  padding: DS.spacing.md,
                  borderRadius: DS.borderRadius.sm,
                  alignItems: 'center',
                  marginBottom: DS.spacing.md,
                }}
                onPress={() => handleStatusChange('active')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Play size={20} color="white" />
                  <Text style={{ color: 'white', fontWeight: '600', marginLeft: DS.spacing.xs }}>
                    Resume Campaign
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        )}

        {activeTab === 'applications' && (
          <View style={{ padding: DS.spacing.md }}>
            {applications.length === 0 ? (
              <View style={{
                backgroundColor: DS.colors.backgroundWhite,
                padding: DS.spacing.xl,
                borderRadius: DS.borderRadius.md,
                alignItems: 'center',
              }}>
                <Users size={48} color={DS.colors.textLight} />
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: DS.colors.text,
                  marginTop: DS.spacing.md,
                }}>No Applications Yet</Text>
                <Text style={{
                  fontSize: 14,
                  color: DS.colors.textLight,
                  textAlign: 'center',
                  marginTop: DS.spacing.xs,
                }}>Creators will apply once your campaign is active</Text>
              </View>
            ) : (
              applications.map((application) => (
                <View
                  key={application.id}
                  style={{
                    backgroundColor: DS.colors.backgroundWhite,
                    padding: DS.spacing.md,
                    borderRadius: DS.borderRadius.md,
                    marginBottom: DS.spacing.sm,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                    <Image
                      source={{ uri: application.creator_profiles.avatar_url || 'https://via.placeholder.com/50' }}
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: 25,
                        marginRight: DS.spacing.sm,
                      }}
                    />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: DS.colors.text }}>
                          {application.creator_profiles.display_name}
                        </Text>
                        <View style={{
                          backgroundColor: application.status === 'accepted' ? '#10B981' : 
                                         application.status === 'rejected' ? '#DC2626' : '#F59E0B',
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 4,
                          marginLeft: DS.spacing.xs,
                        }}>
                          <Text style={{ color: 'white', fontSize: 10, fontWeight: '600', textTransform: 'uppercase' }}>
                            {application.status}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 12, color: DS.colors.textLight, marginBottom: DS.spacing.xs }}>
                        {application.creator_profiles.followers_count.toLocaleString()} followers
                      </Text>
                      <Text style={{ fontSize: 14, color: DS.colors.text, marginBottom: DS.spacing.xs }}>
                        ${(application.proposed_rate_cents / 100).toFixed(0)} • {application.proposed_deliverables}
                      </Text>
                      <Text style={{ fontSize: 13, color: DS.colors.textLight, fontStyle: 'italic' }}>
                        "{application.cover_letter}"
                      </Text>
                      
                      {application.status === 'pending' && (
                        <View style={{ flexDirection: 'row', marginTop: DS.spacing.sm }}>
                          <TouchableOpacity
                            style={{
                              flex: 1,
                              backgroundColor: '#10B981',
                              padding: DS.spacing.xs,
                              borderRadius: DS.borderRadius.xs,
                              alignItems: 'center',
                              marginRight: DS.spacing.xs,
                            }}
                            onPress={() => handleApplicationAction(application.id, 'accepted')}
                          >
                            <Text style={{ color: 'white', fontWeight: '600', fontSize: 12 }}>Accept</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{
                              flex: 1,
                              backgroundColor: '#DC2626',
                              padding: DS.spacing.xs,
                              borderRadius: DS.borderRadius.xs,
                              alignItems: 'center',
                            }}
                            onPress={() => handleApplicationAction(application.id, 'rejected')}
                          >
                            <Text style={{ color: 'white', fontWeight: '600', fontSize: 12 }}>Reject</Text>
                          </TouchableOpacity>
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
          <View style={{ padding: DS.spacing.md }}>
            {content.length === 0 ? (
              <View style={{
                backgroundColor: DS.colors.backgroundWhite,
                padding: DS.spacing.xl,
                borderRadius: DS.borderRadius.md,
                alignItems: 'center',
              }}>
                <Target size={48} color={DS.colors.textLight} />
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: DS.colors.text,
                  marginTop: DS.spacing.md,
                }}>No Content Yet</Text>
                <Text style={{
                  fontSize: 14,
                  color: DS.colors.textLight,
                  textAlign: 'center',
                  marginTop: DS.spacing.xs,
                }}>Content will appear here as creators deliver</Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -DS.spacing.xs }}>
                {content.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={{
                      width: '50%',
                      padding: DS.spacing.xs,
                    }}
                  >
                    <View style={{
                      backgroundColor: DS.colors.backgroundWhite,
                      borderRadius: DS.borderRadius.sm,
                      overflow: 'hidden',
                    }}>
                      <Image
                        source={{ uri: item.thumbnail_url }}
                        style={{
                          width: '100%',
                          height: 150,
                          backgroundColor: DS.colors.border,
                        }}
                      />
                      <View style={{ padding: DS.spacing.sm }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <Image
                            source={{ uri: item.creator_profiles.avatar_url || 'https://via.placeholder.com/20' }}
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 10,
                              marginRight: 4,
                            }}
                          />
                          <Text style={{ fontSize: 12, color: DS.colors.text, flex: 1 }} numberOfLines={1}>
                            {item.creator_profiles.display_name}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 10, color: DS.colors.textLight }}>
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
      </ScrollView>
    </SafeAreaView>
  );
}