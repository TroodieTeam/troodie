import { CreatorHeader } from '@/components/creator/CreatorHeader';
import { useAuth } from '@/contexts/AuthContext';
import { deliverableService, type DeliverableWithDetails } from '@/services/deliverableService';
import { supabase } from '@/lib/supabase';
import { Clock, CheckCircle2, XCircle, AlertCircle, FileEdit, DollarSign, Eye, Heart, MessageCircle, Share2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type TabType = 'all' | 'pending' | 'approved' | 'draft';

export default function MyDeliverables() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [deliverables, setDeliverables] = useState<DeliverableWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creatorProfileId, setCreatorProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadCreatorProfile();
    }
  }, [user?.id]);

  useEffect(() => {
    if (creatorProfileId) {
      loadDeliverables();
    }
  }, [creatorProfileId, activeTab]);

  const loadCreatorProfile = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('creator_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setCreatorProfileId(data.id);
    } catch (error) {
      console.error('Error loading creator profile:', error);
    }
  };

  const loadDeliverables = async () => {
    if (!creatorProfileId) return;

    try {
      const data = await deliverableService.getMyDeliverables(creatorProfileId);

      // Filter based on active tab
      let filtered = data;
      switch (activeTab) {
        case 'pending':
          filtered = data.filter(d => d.status === 'pending_review' || d.status === 'revision_requested');
          break;
        case 'approved':
          filtered = data.filter(d => d.status === 'approved' || d.status === 'auto_approved');
          break;
        case 'draft':
          filtered = data.filter(d => d.status === 'draft');
          break;
      }

      setDeliverables(filtered);
    } catch (error) {
      console.error('Error loading deliverables:', error);
      Alert.alert('Error', 'Failed to load deliverables');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDeliverables();
    setRefreshing(false);
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'draft':
        return {
          label: 'Draft',
          color: '#737373',
          bgColor: '#E5E5E5',
          icon: FileEdit,
        };
      case 'pending_review':
        return {
          label: 'Pending Review',
          color: '#F59E0B',
          bgColor: '#FEF3C7',
          icon: Clock,
        };
      case 'approved':
      case 'auto_approved':
        return {
          label: status === 'auto_approved' ? 'Auto-Approved' : 'Approved',
          color: '#10B981',
          bgColor: '#D1FAE5',
          icon: CheckCircle2,
        };
      case 'rejected':
        return {
          label: 'Rejected',
          color: '#EF4444',
          bgColor: '#FEE2E2',
          icon: XCircle,
        };
      case 'revision_requested':
        return {
          label: 'Revision Requested',
          color: '#F59E0B',
          bgColor: '#FEF3C7',
          icon: AlertCircle,
        };
      default:
        return {
          label: 'Unknown',
          color: '#737373',
          bgColor: '#E5E5E5',
          icon: FileEdit,
        };
    }
  };

  const getPaymentStatusInfo = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'pending':
        return { label: 'Payment Pending', color: '#737373' };
      case 'pending_onboarding':
        return { label: 'Setup Stripe', color: '#F59E0B' };
      case 'processing':
        return { label: 'Processing Payment', color: '#3B82F6' };
      case 'completed':
        return { label: 'Paid', color: '#10B981' };
      case 'failed':
        return { label: 'Payment Failed', color: '#EF4444' };
      default:
        return { label: 'Unknown', color: '#737373' };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const renderDeliverableCard = (deliverable: DeliverableWithDetails) => {
    const statusInfo = getStatusInfo(deliverable.status);
    const StatusIcon = statusInfo.icon;
    const paymentInfo = getPaymentStatusInfo(deliverable.payment_status);

    return (
      <TouchableOpacity
        key={deliverable.id}
        style={styles.deliverableCard}
        onPress={() => router.push(`/creator/deliverables/${deliverable.id}`)}
      >
        <View style={styles.cardHeader}>
          <Image
            source={{ uri: deliverable.thumbnail_url || deliverable.content_url }}
            style={styles.thumbnail}
          />
          <View style={styles.cardHeaderInfo}>
            <Text style={styles.restaurantName}>{deliverable.campaign?.restaurant_name}</Text>
            <Text style={styles.campaignName} numberOfLines={1}>{deliverable.campaign?.name}</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
                <StatusIcon size={12} color={statusInfo.color} />
                <Text style={[styles.statusText, { color: statusInfo.color }]}>
                  {statusInfo.label}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Metrics (if approved) */}
        {(deliverable.status === 'approved' || deliverable.status === 'auto_approved') && (
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Eye size={14} color="#737373" />
              <Text style={styles.metricText}>{deliverable.views_count.toLocaleString()}</Text>
            </View>
            <View style={styles.metricItem}>
              <Heart size={14} color="#737373" />
              <Text style={styles.metricText}>{deliverable.likes_count.toLocaleString()}</Text>
            </View>
            <View style={styles.metricItem}>
              <MessageCircle size={14} color="#737373" />
              <Text style={styles.metricText}>{deliverable.comments_count.toLocaleString()}</Text>
            </View>
            <View style={styles.metricItem}>
              <Share2 size={14} color="#737373" />
              <Text style={styles.metricText}>{deliverable.shares_count.toLocaleString()}</Text>
            </View>
          </View>
        )}

        {/* Payment & Submission Info */}
        <View style={styles.cardFooter}>
          <View style={styles.paymentInfo}>
            <DollarSign size={16} color="#10B981" />
            <Text style={styles.paymentAmount}>
              ${((deliverable.payment_amount_cents || 0) / 100).toFixed(0)}
            </Text>
            <Text style={[styles.paymentStatus, { color: paymentInfo.color }]}>
              • {paymentInfo.label}
            </Text>
          </View>
          <Text style={styles.submittedDate}>
            {deliverable.submitted_at
              ? formatDate(deliverable.submitted_at)
              : 'Draft'}
          </Text>
        </View>

        {/* Revision/Rejection Notes */}
        {deliverable.revision_notes && (
          <View style={styles.notesCard}>
            <AlertCircle size={16} color="#F59E0B" />
            <Text style={styles.notesText}>{deliverable.revision_notes}</Text>
          </View>
        )}
        {deliverable.rejection_reason && (
          <View style={[styles.notesCard, styles.rejectionCard]}>
            <XCircle size={16} color="#EF4444" />
            <Text style={styles.notesText}>{deliverable.rejection_reason}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    const emptyMessages: Record<TabType, { title: string; description: string }> = {
      all: {
        title: 'No Deliverables Yet',
        description: 'Submit your first campaign deliverable to get started',
      },
      pending: {
        title: 'No Pending Deliverables',
        description: 'All your deliverables have been reviewed',
      },
      approved: {
        title: 'No Approved Deliverables',
        description: 'Approved deliverables will appear here',
      },
      draft: {
        title: 'No Drafts',
        description: 'Save drafts while working on deliverables',
      },
    };

    const message = emptyMessages[activeTab];

    return (
      <View style={styles.emptyState}>
        <FileEdit size={48} color="#E5E5E5" />
        <Text style={styles.emptyTitle}>{message.title}</Text>
        <Text style={styles.emptyDescription}>{message.description}</Text>
      </View>
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
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <CreatorHeader title="My Deliverables" />

      {/* Tabs */}
      <View style={styles.tabs}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(['all', 'pending', 'approved', 'draft'] as TabType[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFAD27" />
        }
      >
        {deliverables.length > 0 ? (
          <View style={styles.deliverablesList}>
            {deliverables.map(renderDeliverableCard)}
          </View>
        ) : (
          renderEmptyState()
        )}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabs: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  tabActive: {
    backgroundColor: '#FFAD27',
    borderColor: 'rgba(0,0,0,0.1)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#737373',
  },
  tabTextActive: {
    color: '#000000',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  deliverablesList: {
    padding: 16,
  },
  deliverableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    marginRight: 12,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 12,
    color: '#737373',
    marginBottom: 2,
  },
  campaignName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    marginBottom: 12,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    fontSize: 13,
    color: '#737373',
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  paymentStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  submittedDate: {
    fontSize: 12,
    color: '#A3A3A3',
  },
  notesCard: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B30',
  },
  rejectionCard: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF444430',
  },
  notesText: {
    flex: 1,
    fontSize: 13,
    color: '#000000',
    lineHeight: 18,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#737373',
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 40,
  },
});
