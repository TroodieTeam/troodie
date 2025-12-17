import { DS } from '@/components/design-system/tokens';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import {
    ArrowLeft,
    Calendar,
    CheckCircle,
    Clock,
    Eye,
    XCircle
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Application {
  id: string;
  campaign_id: string;
  campaign_title: string;
  creator: {
    id: string;
    name: string;
    username: string;
    avatar_url: string;
    rating: number;
    follower_count: number;
    completed_campaigns: number;
  };
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  applied_at: string;
  proposal: string;
  proposed_rate: number;
  estimated_reach: number;
  portfolio_samples: string[];
  urgency: 'low' | 'medium' | 'high';
}

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'rejected', label: 'Rejected' },
];

export default function ApplicationsList() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadApplications();
  }, []);

  useEffect(() => {
    applyFilters();
    calculateStatusCounts();
  }, [applications, selectedStatus]);

  const loadApplications = async () => {
    try {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('campaign_applications')
        .select(`
          *,
          campaigns!inner (
            id,
            title,
            name,
            owner_id
          ),
          creator_profiles!inner (
            id,
            display_name,
            username,
            avatar_url,
            followers_count
          )
        `)
        .eq('campaigns.owner_id', user.id)
        .order('applied_at', { ascending: false });

      if (error) throw error;

      const mappedApplications: Application[] = data.map((app: any) => ({
        id: app.id,
        campaign_id: app.campaign_id,
        campaign_title: app.campaigns.title || app.campaigns.name,
        creator: {
          id: app.creator_profiles.id,
          name: app.creator_profiles.display_name,
          username: app.creator_profiles.username || '',
          avatar_url: app.creator_profiles.avatar_url,
          rating: 0, // Not in query yet
          follower_count: app.creator_profiles.followers_count || 0,
          completed_campaigns: 0, // Not in query yet
        },
        status: app.status,
        applied_at: app.applied_at,
        proposal: app.cover_letter || '',
        proposed_rate: app.proposed_rate_cents ? app.proposed_rate_cents / 100 : 0,
        estimated_reach: 0, // Not available
        portfolio_samples: [],
        urgency: 'medium',
      }));

      setApplications(mappedApplications);
    } catch (error) {
      console.error('Failed to load applications:', error);
      Alert.alert('Error', 'Failed to load applications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadApplications();
  };

  const applyFilters = () => {
    let filtered = [...applications];
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(app => app.status === selectedStatus);
    }
    setFilteredApplications(filtered);
  };

  const calculateStatusCounts = () => {
    const counts: Record<string, number> = { all: applications.length };
    applications.forEach(app => {
      counts[app.status] = (counts[app.status] || 0) + 1;
    });
    setStatusCounts(counts);
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

      setApplications(prev => prev.map(app => 
        app.id === applicationId ? { ...app, status: action } : app
      ));
      
      Alert.alert('Success', `Application ${action}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update application');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return DS.colors.warning;
      case 'accepted': return DS.colors.success;
      case 'rejected': return DS.colors.error;
      default: return DS.colors.textLight;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock size={16} color={DS.colors.warning} />;
      case 'accepted': return <CheckCircle size={16} color={DS.colors.success} />;
      case 'rejected': return <XCircle size={16} color={DS.colors.error} />;
      default: return <Clock size={16} color={DS.colors.textLight} />;
    }
  };

  const renderApplication = ({ item: application }: { item: Application }) => (
    <TouchableOpacity
      onPress={() => router.push(`/business/campaigns/${application.campaign_id}`)}
      style={{
        backgroundColor: DS.colors.surface,
        marginHorizontal: DS.spacing.lg,
        marginBottom: DS.spacing.md,
        borderRadius: DS.borderRadius.lg,
        padding: DS.spacing.lg,
        borderWidth: 1,
        borderColor: DS.colors.border,
        ...DS.shadows.sm,
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: DS.spacing.md }}>
        <Text style={{ ...DS.typography.h3, color: DS.colors.primaryOrange, flex: 1 }} numberOfLines={1}>
          {application.campaign_title}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: `${getStatusColor(application.status)}15`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: DS.borderRadius.full }}>
          {getStatusIcon(application.status)}
          <Text style={{ ...DS.typography.caption, color: getStatusColor(application.status), marginLeft: 4, fontWeight: '700', textTransform: 'uppercase' }}>
            {application.status}
          </Text>
        </View>
      </View>

      {/* Creator Info */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: DS.spacing.md }}>
        <Image
          source={{ uri: application.creator.avatar_url || 'https://via.placeholder.com/40' }}
          style={{ width: 48, height: 48, borderRadius: DS.borderRadius.full, backgroundColor: DS.colors.surfaceLight, marginRight: DS.spacing.md }}
        />
        <View style={{ flex: 1 }}>
          <Text style={{ ...DS.typography.body, fontWeight: '600', color: DS.colors.textDark }}>
            {application.creator.name}
          </Text>
          <Text style={{ ...DS.typography.caption, color: DS.colors.textGray }}>
            {application.creator.follower_count.toLocaleString()} followers
          </Text>
        </View>
      </View>

      {/* Proposal */}
      {application.proposal ? (
        <View style={{ backgroundColor: DS.colors.surfaceLight, padding: DS.spacing.md, borderRadius: DS.borderRadius.md, marginBottom: DS.spacing.md }}>
          <Text style={{ ...DS.typography.body, color: DS.colors.textDark, fontStyle: 'italic' }} numberOfLines={3}>
            "{application.proposal}"
          </Text>
        </View>
      ) : null}

      {/* Stats Row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderColor: DS.colors.borderLight, paddingTop: DS.spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Calendar size={14} color={DS.colors.textGray} style={{ marginRight: 4 }} />
          <Text style={{ ...DS.typography.caption, color: DS.colors.textGray }}>
            {new Date(application.applied_at).toLocaleDateString()}
          </Text>
        </View>
        {application.status === 'pending' && (
          <View style={{ flexDirection: 'row', gap: DS.spacing.sm }}>
            <TouchableOpacity 
              onPress={() => handleApplicationAction(application.id, 'rejected')}
              style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: DS.borderRadius.md }}
            >
              <Text style={{ ...DS.typography.caption, color: DS.colors.error, fontWeight: '600' }}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => handleApplicationAction(application.id, 'accepted')}
              style={{ backgroundColor: DS.colors.primaryOrange, paddingHorizontal: 12, paddingVertical: 6, borderRadius: DS.borderRadius.md }}
            >
              <Text style={{ ...DS.typography.caption, color: 'white', fontWeight: '600' }}>Accept</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: DS.colors.background }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={DS.colors.primaryOrange} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: DS.colors.background }}>
      {/* Header */}
      <View style={{ padding: DS.spacing.lg, backgroundColor: DS.colors.surface, borderBottomWidth: 1, borderBottomColor: DS.colors.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: DS.spacing.md }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: DS.spacing.md }}>
            <ArrowLeft size={24} color={DS.colors.textDark} />
          </TouchableOpacity>
          <Text style={{ ...DS.typography.h2, color: DS.colors.textDark }}>Applications</Text>
        </View>
        
        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: DS.spacing.sm }}>
          {STATUS_FILTERS.map((filter) => {
            const isActive = selectedStatus === filter.key;
            return (
              <TouchableOpacity
                key={filter.key}
                onPress={() => setSelectedStatus(filter.key)}
                style={{
                  paddingHorizontal: DS.spacing.lg,
                  paddingVertical: DS.spacing.sm,
                  borderRadius: DS.borderRadius.full,
                  backgroundColor: isActive ? DS.colors.textDark : DS.colors.surface,
                  borderWidth: 1,
                  borderColor: isActive ? DS.colors.textDark : DS.colors.border,
                }}
              >
                <Text style={{ ...DS.typography.button, fontSize: 13, color: isActive ? 'white' : DS.colors.textDark }}>
                  {filter.label} ({statusCounts[filter.key] || 0})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filteredApplications}
        keyExtractor={(item) => item.id}
        renderItem={renderApplication}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={DS.colors.primaryOrange} />}
        contentContainerStyle={{ paddingVertical: DS.spacing.lg }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: DS.spacing.xxl }}>
            <Eye size={48} color={DS.colors.textLight} />
            <Text style={{ ...DS.typography.h3, color: DS.colors.textGray, marginTop: DS.spacing.md }}>No applications found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
