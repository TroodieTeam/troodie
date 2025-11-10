import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Star,
  Users,
  Calendar,
  DollarSign,
} from 'lucide-react-native';
import { DS } from '@/components/design-system/tokens';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

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
  { key: 'all', label: 'All', count: 0 },
  { key: 'pending', label: 'Pending', count: 0 },
  { key: 'accepted', label: 'Accepted', count: 0 },
  { key: 'rejected', label: 'Rejected', count: 0 },
  { key: 'completed', label: 'Completed', count: 0 },
];

export default function ApplicationsList() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
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
      // Mock data since we don't have application tables yet
      const mockApplications: Application[] = [
        {
          id: '1',
          campaign_id: 'camp-1',
          campaign_title: 'Summer Menu Launch',
          creator: {
            id: 'creator-1',
            name: 'Sarah Johnson',
            username: '@foodie_sarah',
            avatar_url: 'https://via.placeholder.com/60',
            rating: 4.9,
            follower_count: 12500,
            completed_campaigns: 15,
          },
          status: 'pending',
          applied_at: '2024-01-15T10:30:00Z',
          proposal: 'I would love to showcase your summer menu! I specialize in bright, colorful food photography that would perfectly highlight your seasonal dishes. My audience loves discovering new restaurants and I have a great track record with similar campaigns.',
          proposed_rate: 350,
          estimated_reach: 8500,
          portfolio_samples: [
            'https://via.placeholder.com/150',
            'https://via.placeholder.com/150',
            'https://via.placeholder.com/150',
          ],
          urgency: 'high',
        },
        {
          id: '2',
          campaign_id: 'camp-1',
          campaign_title: 'Summer Menu Launch',
          creator: {
            id: 'creator-2',
            name: 'Mike Chen',
            username: '@tastemaker_mike',
            avatar_url: 'https://via.placeholder.com/60',
            rating: 4.7,
            follower_count: 8900,
            completed_campaigns: 22,
          },
          status: 'accepted',
          applied_at: '2024-01-14T14:20:00Z',
          proposal: 'Your restaurant looks amazing! I create detailed video reviews that really capture the dining experience. I can create both short-form content for social and longer reviews for my YouTube channel.',
          proposed_rate: 500,
          estimated_reach: 12000,
          portfolio_samples: [
            'https://via.placeholder.com/150',
            'https://via.placeholder.com/150',
          ],
          urgency: 'medium',
        },
        {
          id: '3',
          campaign_id: 'camp-2',
          campaign_title: 'Weekend Brunch Special',
          creator: {
            id: 'creator-3',
            name: 'Emma Rodriguez',
            username: '@chicago_eats',
            avatar_url: 'https://via.placeholder.com/60',
            rating: 4.8,
            follower_count: 15700,
            completed_campaigns: 8,
          },
          status: 'completed',
          applied_at: '2024-01-10T09:15:00Z',
          proposal: 'Brunch content performs so well with my audience! I can create Instagram posts and stories showing the full brunch experience, from ambiance to each dish.',
          proposed_rate: 275,
          estimated_reach: 9200,
          portfolio_samples: [
            'https://via.placeholder.com/150',
            'https://via.placeholder.com/150',
            'https://via.placeholder.com/150',
            'https://via.placeholder.com/150',
          ],
          urgency: 'low',
        },
        {
          id: '4',
          campaign_id: 'camp-3',
          campaign_title: 'Happy Hour Promotion',
          creator: {
            id: 'creator-4',
            name: 'David Park',
            username: '@drinks_with_david',
            avatar_url: 'https://via.placeholder.com/60',
            rating: 4.6,
            follower_count: 6800,
            completed_campaigns: 12,
          },
          status: 'rejected',
          applied_at: '2024-01-12T16:45:00Z',
          proposal: 'I love creating cocktail and happy hour content! My followers are always looking for great spots for after-work drinks.',
          proposed_rate: 200,
          estimated_reach: 4500,
          portfolio_samples: [
            'https://via.placeholder.com/150',
            'https://via.placeholder.com/150',
          ],
          urgency: 'medium',
        },
      ];

      setApplications(mockApplications);
    } catch (error) {
      console.error('Failed to load applications:', error);
      Alert.alert('Error', 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...applications];

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(app => app.status === selectedStatus);
    }

    // Sort by urgency and date
    filtered.sort((a, b) => {
      // First by urgency
      const urgencyOrder = { high: 3, medium: 2, low: 1 };
      const urgencyDiff = urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
      if (urgencyDiff !== 0) return urgencyDiff;
      
      // Then by date (newest first)
      return new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime();
    });

    setFilteredApplications(filtered);
  };

  const calculateStatusCounts = () => {
    const counts = applications.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    counts.all = applications.length;
    setStatusCounts(counts);
  };

  const handleApplicationAction = async (applicationId: string, action: 'accept' | 'reject') => {
    try {
      const application = applications.find(app => app.id === applicationId);
      if (!application) return;

      Alert.alert(
        `${action === 'accept' ? 'Accept' : 'Reject'} Application`,
        `Are you sure you want to ${action} ${application.creator.name}'s application?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: action === 'accept' ? 'Accept' : 'Reject',
            style: action === 'reject' ? 'destructive' : 'default',
            onPress: async () => {
              // Update the application status
              const updatedApplications = applications.map(app =>
                app.id === applicationId
                  ? { ...app, status: action === 'accept' ? 'accepted' as const : 'rejected' as const }
                  : app
              );
              setApplications(updatedApplications);
              
              Alert.alert(
                'Success',
                `Application ${action === 'accept' ? 'accepted' : 'rejected'} successfully`
              );
            },
          },
        ]
      );
    } catch (error) {
      console.error('Failed to update application:', error);
      Alert.alert('Error', 'Failed to update application');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'accepted': return '#10B981';
      case 'rejected': return '#EF4444';
      case 'completed': return '#8B5CF6';
      default: return DS.colors.textLight;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock size={16} color="#F59E0B" />;
      case 'accepted': return <CheckCircle size={16} color="#10B981" />;
      case 'rejected': return <XCircle size={16} color="#EF4444" />;
      case 'completed': return <Star size={16} color="#8B5CF6" fill="#8B5CF6" />;
      default: return <Clock size={16} color={DS.colors.textLight} />;
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return DS.colors.textLight;
    }
  };

  const renderApplication = ({ item: application }: { item: Application }) => (
    <TouchableOpacity
      onPress={() => router.push(`/business/applications/${application.id}`)}
      style={{
        backgroundColor: DS.colors.backgroundWhite,
        marginHorizontal: DS.spacing.md,
        marginBottom: DS.spacing.md,
        borderRadius: DS.borderRadius.md,
        padding: DS.spacing.md,
        borderLeftWidth: 4,
        borderLeftColor: getUrgencyColor(application.urgency),
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: DS.spacing.sm }}>
        <Text style={{
          fontSize: 14,
          fontWeight: '600',
          color: DS.colors.primary,
          flex: 1,
        }}>{application.campaign_title}</Text>
        
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {getStatusIcon(application.status)}
          <Text style={{
            fontSize: 12,
            color: getStatusColor(application.status),
            marginLeft: 4,
            textTransform: 'capitalize',
          }}>{application.status}</Text>
        </View>
      </View>

      {/* Creator Info */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: DS.spacing.sm }}>
        <Image
          source={{ uri: application.creator.avatar_url }}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: DS.colors.border,
          }}
        />
        
        <View style={{ flex: 1, marginLeft: DS.spacing.sm }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: DS.colors.text }}>
            {application.creator.name}
          </Text>
          <Text style={{ fontSize: 12, color: DS.colors.textLight }}>
            {application.creator.username}
          </Text>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Star size={12} color="#FFB800" fill="#FFB800" />
            <Text style={{ fontSize: 12, fontWeight: '500', color: DS.colors.text, marginLeft: 2 }}>
              {application.creator.rating}
            </Text>
          </View>
          <Text style={{ fontSize: 10, color: DS.colors.textLight }}>
            {application.creator.follower_count.toLocaleString()} followers
          </Text>
        </View>
      </View>

      {/* Proposal Preview */}
      <Text style={{
        fontSize: 12,
        color: DS.colors.text,
        lineHeight: 16,
        marginBottom: DS.spacing.sm,
      }} numberOfLines={2}>
        {application.proposal}
      </Text>

      {/* Stats */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: DS.spacing.sm,
        borderTopWidth: 1,
        borderTopColor: DS.colors.border,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <DollarSign size={14} color={DS.colors.textLight} />
          <Text style={{ fontSize: 12, color: DS.colors.text, marginLeft: 2 }}>
            ${application.proposed_rate}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Users size={14} color={DS.colors.textLight} />
          <Text style={{ fontSize: 12, color: DS.colors.text, marginLeft: 2 }}>
            {application.estimated_reach.toLocaleString()} reach
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Calendar size={14} color={DS.colors.textLight} />
          <Text style={{ fontSize: 12, color: DS.colors.text, marginLeft: 2 }}>
            {new Date(application.applied_at).toLocaleDateString()}
          </Text>
        </View>
      </View>

      {/* Action Buttons for Pending Applications */}
      {application.status === 'pending' && (
        <View style={{
          flexDirection: 'row',
          marginTop: DS.spacing.sm,
          gap: DS.spacing.sm,
        }}>
          <TouchableOpacity
            onPress={() => handleApplicationAction(application.id, 'reject')}
            style={{
              flex: 1,
              backgroundColor: '#FEE2E2',
              padding: DS.spacing.sm,
              borderRadius: DS.borderRadius.sm,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '600' }}>Reject</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleApplicationAction(application.id, 'accept')}
            style={{
              flex: 1,
              backgroundColor: DS.colors.primary,
              padding: DS.spacing.sm,
              borderRadius: DS.borderRadius.sm,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>Accept</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: DS.colors.background }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={DS.colors.primary} />
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
        }}>Applications</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Status Filter Tabs */}
      <View style={{
        backgroundColor: DS.colors.backgroundWhite,
        borderBottomWidth: 1,
        borderBottomColor: DS.colors.border,
      }}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: DS.spacing.md }}
        >
          {STATUS_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              onPress={() => setSelectedStatus(filter.key)}
              style={{
                paddingHorizontal: DS.spacing.md,
                paddingVertical: DS.spacing.sm,
                marginRight: DS.spacing.sm,
                borderBottomWidth: 2,
                borderBottomColor: selectedStatus === filter.key ? DS.colors.primary : 'transparent',
              }}
            >
              <Text style={{
                fontSize: 14,
                fontWeight: selectedStatus === filter.key ? '600' : '400',
                color: selectedStatus === filter.key ? DS.colors.primary : DS.colors.text,
              }}>
                {filter.label} ({statusCounts[filter.key] || 0})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Applications List */}
      <FlatList
        data={filteredApplications}
        keyExtractor={(item) => item.id}
        renderItem={renderApplication}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: DS.spacing.sm }}
        ListEmptyComponent={
          <View style={{ padding: DS.spacing.xl, alignItems: 'center' }}>
            <Eye size={48} color={DS.colors.textLight} />
            <Text style={{
              fontSize: 16,
              fontWeight: '500',
              color: DS.colors.text,
              textAlign: 'center',
              marginTop: DS.spacing.sm,
            }}>No applications found</Text>
            <Text style={{
              fontSize: 14,
              color: DS.colors.textLight,
              textAlign: 'center',
              marginTop: DS.spacing.xs,
            }}>
              {selectedStatus === 'all' 
                ? 'Create a campaign to start receiving applications'
                : `No ${selectedStatus} applications at the moment`
              }
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}