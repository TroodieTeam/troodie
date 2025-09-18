import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface Submission {
  id: string;
  type: 'restaurant_claim' | 'creator_application';
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at?: string;
  rejection_reason?: string;
  can_resubmit?: boolean;
  details: any;
}

export default function MySubmissionsScreen() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const fetchSubmissions = async () => {
    if (!user) {
      router.replace('/login');
      return;
    }

    try {
      // Fetch restaurant claims
      const { data: claims } = await supabase
        .from('restaurant_claims')
        .select(`
          *,
          restaurant:restaurants(name, address, cuisine_type)
        `)
        .eq('user_id', user.id)
        .order('submitted_at', { ascending: false });

      // Fetch creator applications
      const { data: applications } = await supabase
        .from('creator_applications')
        .select('*')
        .eq('user_id', user.id)
        .order('submitted_at', { ascending: false });

      // Combine and format submissions
      const allSubmissions = [
        ...(claims || []).map(claim => ({
          id: claim.id,
          type: 'restaurant_claim' as const,
          status: claim.status,
          submitted_at: claim.submitted_at,
          reviewed_at: claim.reviewed_at,
          rejection_reason: claim.rejection_reason,
          can_resubmit: claim.can_resubmit,
          details: {
            restaurant_name: claim.restaurant?.name,
            restaurant_address: claim.restaurant?.address,
            ownership_proof_type: claim.ownership_proof_type,
            business_email: claim.email
          }
        })),
        ...(applications || []).map(app => ({
          id: app.id,
          type: 'creator_application' as const,
          status: app.status,
          submitted_at: app.submitted_at,
          reviewed_at: app.reviewed_at,
          rejection_reason: app.rejection_reason,
          can_resubmit: app.can_resubmit,
          details: {
            follower_count: app.follower_count,
            platforms: [
              app.instagram_handle && 'Instagram',
              app.tiktok_handle && 'TikTok',
              app.youtube_handle && 'YouTube',
              app.twitter_handle && 'Twitter'
            ].filter(Boolean),
            bio: app.bio
          }
        }))
      ].sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());

      setSubmissions(allSubmissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      Alert.alert('Error', 'Failed to fetch submissions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSubmissions();
  };

  const handleResubmit = (submission: Submission) => {
    Alert.alert(
      'Resubmit Application',
      'Are you ready to resubmit your application? Make sure you have addressed the rejection reasons.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Resubmission',
          onPress: () => {
            if (submission.type === 'restaurant_claim') {
              router.push('/business/claim');
            } else {
              router.push('/creator/onboarding');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return { bg: '#FFFAF2', text: '#FFAD27', icon: 'time-outline' };
      case 'approved':
        return { bg: '#E5F5E5', text: '#4CAF50', icon: 'checkmark-circle' };
      case 'rejected':
        return { bg: '#FFE5E5', text: '#f44336', icon: 'close-circle' };
      default:
        return { bg: '#f0f0f0', text: '#666', icon: 'help-circle' };
    }
  };

  const renderSubmission = (submission: Submission) => {
    const isExpanded = expandedItem === submission.id;
    const statusStyle = getStatusColor(submission.status);

    return (
      <TouchableOpacity
        key={submission.id}
        style={styles.card}
        onPress={() => setExpandedItem(isExpanded ? null : submission.id)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Ionicons name={statusStyle.icon as any} size={14} color={statusStyle.text} />
              <Text style={[styles.statusText, { color: statusStyle.text }]}>
                {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
              </Text>
            </View>
            <Text style={styles.dateText}>
              {formatDistanceToNow(new Date(submission.submitted_at), { addSuffix: true })}
            </Text>
          </View>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#666"
          />
        </View>

        <Text style={styles.title}>
          {submission.type === 'restaurant_claim'
            ? `Restaurant: ${submission.details.restaurant_name}`
            : 'Creator Application'}
        </Text>

        {/* Status Message */}
        {submission.status === 'pending' && (
          <View style={styles.statusMessage}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.statusMessageText}>
              Your submission is being reviewed. This typically takes 24-48 hours.
            </Text>
          </View>
        )}

        {submission.status === 'approved' && (
          <View style={styles.statusMessage}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={[styles.statusMessageText, { color: '#4CAF50' }]}>
              Approved! {submission.type === 'restaurant_claim'
                ? 'You can now manage your restaurant.'
                : 'You now have access to creator features.'}
            </Text>
          </View>
        )}

        {submission.status === 'rejected' && (
          <>
            <View style={styles.statusMessage}>
              <Ionicons name="close-circle" size={16} color="#f44336" />
              <Text style={[styles.statusMessageText, { color: '#f44336' }]}>
                Your submission was not approved.
              </Text>
            </View>
            {submission.rejection_reason && (
              <View style={styles.rejectionReason}>
                <Text style={styles.rejectionLabel}>Reason:</Text>
                <Text style={styles.rejectionText}>{submission.rejection_reason}</Text>
              </View>
            )}
          </>
        )}

        {/* Expanded Details */}
        {isExpanded && (
          <View style={styles.expandedContent}>
            <Text style={styles.detailsTitle}>Submission Details</Text>
            {submission.type === 'restaurant_claim' ? (
              <>
                <Text style={styles.detailText}>
                  Restaurant: {submission.details.restaurant_name}
                </Text>
                <Text style={styles.detailText}>
                  Address: {submission.details.restaurant_address}
                </Text>
                <Text style={styles.detailText}>
                  Proof Type: {submission.details.ownership_proof_type}
                </Text>
                <Text style={styles.detailText}>
                  Business Email: {submission.details.business_email}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.detailText}>
                  Followers: {submission.details.follower_count?.toLocaleString() || 'N/A'}
                </Text>
                <Text style={styles.detailText}>
                  Platforms: {submission.details.platforms?.join(', ') || 'N/A'}
                </Text>
              </>
            )}

            {submission.status === 'rejected' && submission.can_resubmit && (
              <TouchableOpacity
                style={styles.resubmitButton}
                onPress={() => handleResubmit(submission)}
              >
                <Text style={styles.resubmitButtonText}>Resubmit Application</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFAD27" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>My Submissions</Text>
          <Text style={styles.headerSubtitle}>
            Track your claims and applications
          </Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#FFAD27']}
            tintColor="#FFAD27"
          />
        }
      >
        {submissions.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="document-outline" size={64} color="#ccc" />
            </View>
            <Text style={styles.emptyTitle}>No submissions yet</Text>
            <Text style={styles.emptyDescription}>
              You haven't submitted any claims or applications
            </Text>
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() => router.push('/(tabs)/more')}
            >
              <Text style={styles.exploreButtonText}>Explore Opportunities</Text>
            </TouchableOpacity>
          </View>
        ) : (
          submissions.map(renderSubmission)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  exploreButton: {
    backgroundColor: '#FFAD27',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  exploreButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12,
    color: '#666',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  statusMessage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  statusMessageText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    lineHeight: 20,
  },
  rejectionReason: {
    backgroundColor: '#FFE5E5',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  rejectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f44336',
    marginBottom: 4,
  },
  rejectionText: {
    fontSize: 14,
    color: '#d32f2f',
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  resubmitButton: {
    backgroundColor: '#FFAD27',
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 16,
  },
  resubmitButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});