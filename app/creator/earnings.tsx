import { CreatorHeader } from '@/components/creator/CreatorHeader';
import { useAuth } from '@/contexts/AuthContext';
import {
    AlertCircle,
    Check,
    ChevronRight,
    Clock,
    CreditCard,
    DollarSign,
    Download,
    Filter,
    X
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type EarningStatus = 'pending' | 'available' | 'processing' | 'paid';

interface Earning {
  id: string;
  campaign_id?: string;
  campaign_name: string;
  restaurant_name: string;
  amount: number;
  status: EarningStatus;
  type: string;
  earned_date: Date;
  paid_date?: Date;
}

interface EarningsSummary {
  lifetime_total: number;
  current_month: number;
  pending_amount: number;
  available_balance: number;
  last_payout_date?: Date;
  next_payout_eligible?: Date;
}

interface Payout {
  id: string;
  amount: number;
  status: string;
  requested_at: Date;
  completed_at?: Date;
}

const MINIMUM_PAYOUT = 25;

export default function Earnings() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [paymentConnected, setPaymentConnected] = useState(false);
  const [dateFilter, setDateFilter] = useState<'all' | '30d' | '90d'>('30d');

  useEffect(() => {
    loadEarningsData();
    checkPaymentMethod();
  }, [user?.id, dateFilter]);

  const loadEarningsData = async () => {
    if (!user?.id) return;
    
    try {
      // Load earnings summary
      const summaryData: EarningsSummary = {
        lifetime_total: 0,
        current_month: 0,
        pending_amount: 0,
        available_balance: 0,
      };

      // Mock earnings data for now since creator_earnings table doesn't exist yet
      const mockEarnings = [
        {
          id: '1',
          campaign_id: null,
          campaigns: { title: 'Barcelona Wine Bar Campaign', restaurants: { name: 'Barcelona Wine Bar' } },
          amount: 100,
          status: 'paid',
          type: 'campaign',
          earned_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          paid_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '2',
          campaign_id: null,
          campaigns: { title: 'Summer Promotion', restaurants: { name: 'The Rustic Table' } },
          amount: 75,
          status: 'available',
          type: 'campaign',
          earned_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '3',
          campaign_id: null,
          campaigns: { title: 'Food Review', restaurants: { name: 'Sakura Sushi' } },
          amount: 50,
          status: 'pending',
          type: 'campaign',
          earned_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];

      // Filter by date if needed
      let earningsData = mockEarnings;

      // Apply date filter to mock data
      if (dateFilter === '30d') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        earningsData = earningsData.filter(e => new Date(e.earned_date) >= thirtyDaysAgo);
      } else if (dateFilter === '90d') {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        earningsData = earningsData.filter(e => new Date(e.earned_date) >= ninetyDaysAgo);
      }

      // Transform and calculate summary
      const transformedEarnings = earningsData?.map(earning => {
        // Update summary
        summaryData.lifetime_total += earning.amount;
        
        const earnedDate = new Date(earning.earned_date);
        const currentMonth = new Date();
        if (earnedDate.getMonth() === currentMonth.getMonth() && 
            earnedDate.getFullYear() === currentMonth.getFullYear()) {
          summaryData.current_month += earning.amount;
        }
        
        if (earning.status === 'pending') {
          summaryData.pending_amount += earning.amount;
        } else if (earning.status === 'available') {
          summaryData.available_balance += earning.amount;
        }

        return {
          id: earning.id,
          campaign_id: earning.campaign_id,
          campaign_name: earning.campaigns?.title || 'Direct Earning',
          restaurant_name: earning.campaigns?.restaurants?.name || 'Troodie',
          amount: earning.amount,
          status: earning.status as EarningStatus,
          type: earning.type,
          earned_date: new Date(earning.earned_date),
          paid_date: earning.paid_date ? new Date(earning.paid_date) : undefined,
        };
      }) || [];

      setEarnings(transformedEarnings);
      setSummary(summaryData);

      // Mock payout history since creator_payouts table doesn't exist yet
      const payoutData = [
        {
          id: '1',
          amount: 225,
          status: 'completed',
          requested_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          completed_at: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];
      const payoutError = null;

      if (!payoutError && payoutData) {
        setPayouts(payoutData.map(p => ({
          id: p.id,
          amount: p.amount,
          status: p.status,
          requested_at: new Date(p.requested_at),
          completed_at: p.completed_at ? new Date(p.completed_at) : undefined,
        })));

        // Update last payout date
        if (payoutData.length > 0 && payoutData[0].completed_at) {
          summaryData.last_payout_date = new Date(payoutData[0].completed_at);
        }
      }

      // Calculate next eligible payout
      if (summaryData.available_balance >= MINIMUM_PAYOUT) {
        summaryData.next_payout_eligible = new Date();
      }

      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentMethod = async () => {
    // Check if Stripe Connect is set up (mock for now)
    setPaymentConnected(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEarningsData();
    setRefreshing(false);
  };

  const requestPayout = async () => {
    if (!user?.id || !summary || summary.available_balance < MINIMUM_PAYOUT) return;

    try {
      // Mock payout request since table doesn't exist yet
      console.log('Payout requested:', summary.available_balance);
      const error = null;

      if (error) throw error;

      Alert.alert(
        'Payout Requested',
        `Your payout of ${formatCurrency(summary.available_balance)} has been initiated. It will be processed within 2-3 business days.`,
        [{ text: 'OK', onPress: () => setShowPayoutModal(false) }]
      );

      loadEarningsData();
    } catch (error) {
      console.error('Error requesting payout:', error);
      Alert.alert('Error', 'Failed to request payout. Please try again.');
    }
  };

  const setupPaymentMethod = () => {
    // Navigate to Stripe Connect onboarding
    Alert.alert(
      'Setup Payments',
      'You will be redirected to Stripe to set up your payment method.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: () => console.log('Navigate to Stripe Connect') },
      ]
    );
  };

  const exportEarnings = () => {
    Alert.alert(
      'Export Earnings',
      'Your earnings report will be downloaded as a CSV file.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Export', onPress: () => console.log('Export earnings') },
      ]
    );
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusColor = (status: EarningStatus) => {
    switch (status) {
      case 'paid':
        return '#10B981';
      case 'available':
        return '#3B82F6';
      case 'processing':
        return '#F59E0B';
      case 'pending':
        return '#737373';
      default:
        return '#737373';
    }
  };

  const getStatusText = (status: EarningStatus) => {
    switch (status) {
      case 'paid':
        return 'Paid';
      case 'available':
        return 'Available';
      case 'processing':
        return 'Processing';
      case 'pending':
        return 'Pending';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <CreatorHeader 
        title="Earnings" 
        rightElement={
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton} onPress={exportEarnings}>
              <Download size={20} color="#737373" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={() => setShowFilterModal(true)}>
              <Filter size={20} color="#737373" />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />
        }
      >
        {/* Summary Cards */}
        <View style={styles.summarySection}>
          <View style={styles.summaryCard}>
            <DollarSign size={24} color="#10B981" />
            <View style={styles.summaryContent}>
              <Text style={styles.summaryLabel}>Available Balance</Text>
              <Text style={styles.summaryValue}>{formatCurrency(summary?.available_balance || 0)}</Text>
              {summary && summary.available_balance >= MINIMUM_PAYOUT && (
                <Text style={styles.summaryHint}>Eligible for payout</Text>
              )}
            </View>
          </View>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryGridItem}>
              <Text style={styles.summaryGridLabel}>This Month</Text>
              <Text style={styles.summaryGridValue}>{formatCurrency(summary?.current_month || 0)}</Text>
            </View>
            <View style={styles.summaryGridItem}>
              <Text style={styles.summaryGridLabel}>Pending</Text>
              <Text style={styles.summaryGridValue}>{formatCurrency(summary?.pending_amount || 0)}</Text>
            </View>
            <View style={styles.summaryGridItem}>
              <Text style={styles.summaryGridLabel}>Lifetime</Text>
              <Text style={styles.summaryGridValue}>{formatCurrency(summary?.lifetime_total || 0)}</Text>
            </View>
          </View>

          {/* Payout Button */}
          {!paymentConnected ? (
            <TouchableOpacity style={styles.setupButton} onPress={setupPaymentMethod}>
              <CreditCard size={20} color="#FFFFFF" />
              <Text style={styles.setupButtonText}>Setup Payment Method</Text>
            </TouchableOpacity>
          ) : summary && summary.available_balance >= MINIMUM_PAYOUT ? (
            <TouchableOpacity style={styles.payoutButton} onPress={() => setShowPayoutModal(true)}>
              <Text style={styles.payoutButtonText}>Request Payout</Text>
              <ChevronRight size={20} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <View style={styles.payoutInfo}>
              <AlertCircle size={16} color="#737373" />
              <Text style={styles.payoutInfoText}>
                Minimum balance of {formatCurrency(MINIMUM_PAYOUT)} required for payout
              </Text>
            </View>
          )}
        </View>

        {/* Earnings History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Earnings History</Text>
          {earnings.length > 0 ? (
            <View style={styles.earningsList}>
              {earnings.map((earning) => (
                <View key={earning.id} style={styles.earningItem}>
                  <View style={styles.earningContent}>
                    <Text style={styles.earningTitle}>{earning.campaign_name}</Text>
                    <Text style={styles.earningSubtitle}>{earning.restaurant_name}</Text>
                    <Text style={styles.earningDate}>
                      {earning.earned_date.toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.earningRight}>
                    <Text style={styles.earningAmount}>{formatCurrency(earning.amount)}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(earning.status)}20` }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(earning.status) }]}>
                        {getStatusText(earning.status)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <DollarSign size={48} color="#E5E5E5" />
              <Text style={styles.emptyTitle}>No Earnings Yet</Text>
              <Text style={styles.emptyDescription}>
                Complete campaigns to start earning
              </Text>
            </View>
          )}
        </View>

        {/* Payout History */}
        {payouts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Payouts</Text>
            <View style={styles.payoutsList}>
              {payouts.map((payout) => (
                <View key={payout.id} style={styles.payoutItem}>
                  <View style={styles.payoutContent}>
                    <Text style={styles.payoutAmount}>{formatCurrency(payout.amount)}</Text>
                    <Text style={styles.payoutDate}>
                      Requested {payout.requested_at.toLocaleDateString()}
                    </Text>
                    {payout.completed_at && (
                      <Text style={styles.payoutCompleted}>
                        Completed {payout.completed_at.toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.statusBadge, { 
                    backgroundColor: payout.status === 'completed' ? '#10B98120' : '#F59E0B20' 
                  }]}>
                    <Text style={[styles.statusText, { 
                      color: payout.status === 'completed' ? '#10B981' : '#F59E0B' 
                    }]}>
                      {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Payout Modal */}
      <Modal
        visible={showPayoutModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPayoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Payout</Text>
              <TouchableOpacity onPress={() => setShowPayoutModal(false)}>
                <X size={24} color="#000000" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <View style={styles.payoutSummary}>
                <Text style={styles.payoutLabel}>Available Balance</Text>
                <Text style={styles.payoutValue}>{formatCurrency(summary?.available_balance || 0)}</Text>
              </View>
              
              <View style={styles.payoutDetails}>
                <View style={styles.payoutDetailItem}>
                  <CreditCard size={20} color="#737373" />
                  <Text style={styles.payoutDetailText}>Bank Account ****1234</Text>
                </View>
                <View style={styles.payoutDetailItem}>
                  <Clock size={20} color="#737373" />
                  <Text style={styles.payoutDetailText}>Processing time: 2-3 business days</Text>
                </View>
              </View>
              
              <TouchableOpacity style={styles.confirmButton} onPress={requestPayout}>
                <Check size={20} color="#FFFFFF" />
                <Text style={styles.confirmButtonText}>Confirm Payout</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowPayoutModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Earnings</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <X size={24} color="#000000" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.filterLabel}>Date Range</Text>
              {(['30d', '90d', 'all'] as const).map((range) => (
                <TouchableOpacity
                  key={range}
                  style={[styles.filterOption, dateFilter === range && styles.filterOptionActive]}
                  onPress={() => {
                    setDateFilter(range);
                    setShowFilterModal(false);
                  }}
                >
                  <Text style={[styles.filterOptionText, dateFilter === range && styles.filterOptionTextActive]}>
                    {range === '30d' ? 'Last 30 Days' : range === '90d' ? 'Last 90 Days' : 'All Time'}
                  </Text>
                  {dateFilter === range && <Check size={20} color="#10B981" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
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
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  headerButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  summarySection: {
    padding: 16,
    paddingTop: 8,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  summaryContent: {
    marginLeft: 12,
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#737373',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '600',
    color: '#10B981',
  },
  summaryHint: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 2,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryGridItem: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  summaryGridLabel: {
    fontSize: 12,
    color: '#737373',
    marginBottom: 4,
  },
  summaryGridValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  setupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  setupButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  payoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  payoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  payoutInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  payoutInfoText: {
    fontSize: 14,
    color: '#737373',
    flex: 1,
  },
  section: {
    padding: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  earningsList: {
    gap: 12,
  },
  earningItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 8,
  },
  earningContent: {
    flex: 1,
  },
  earningTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 2,
  },
  earningSubtitle: {
    fontSize: 14,
    color: '#737373',
    marginBottom: 4,
  },
  earningDate: {
    fontSize: 12,
    color: '#A3A3A3',
  },
  earningRight: {
    alignItems: 'flex-end',
  },
  earningAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
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
  payoutsList: {
    gap: 12,
  },
  payoutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 8,
  },
  payoutContent: {
    flex: 1,
  },
  payoutAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  payoutDate: {
    fontSize: 14,
    color: '#737373',
    marginBottom: 2,
  },
  payoutCompleted: {
    fontSize: 12,
    color: '#10B981',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  modalBody: {
    padding: 16,
  },
  payoutSummary: {
    alignItems: 'center',
    marginBottom: 24,
  },
  payoutLabel: {
    fontSize: 14,
    color: '#737373',
    marginBottom: 8,
  },
  payoutValue: {
    fontSize: 36,
    fontWeight: '600',
    color: '#10B981',
  },
  payoutDetails: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  payoutDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  payoutDetailText: {
    fontSize: 14,
    color: '#737373',
    flex: 1,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 14,
    gap: 8,
    marginBottom: 12,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButton: {
    alignItems: 'center',
    padding: 14,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#737373',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#737373',
    marginBottom: 12,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 8,
  },
  filterOptionActive: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  filterOptionText: {
    fontSize: 16,
    color: '#000000',
  },
  filterOptionTextActive: {
    color: '#10B981',
    fontWeight: '500',
  },
});