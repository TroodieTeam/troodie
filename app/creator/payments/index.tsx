import { DS } from '@/components/design-system/tokens';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { checkAccountStatus } from '@/services/stripeService';
import { useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle, Clock, DollarSign, XCircle } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface PayoutTransaction {
  id: string;
  amount_cents: number;
  status: string;
  created_at: string;
  completed_at: string | null;
  campaign_id: string;
  campaign_title?: string;
}

export default function CreatorPaymentsDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accountStatus, setAccountStatus] = useState<{
    hasAccount: boolean;
    onboardingCompleted: boolean;
  }>({
    hasAccount: false,
    onboardingCompleted: false,
  });
  const [transactions, setTransactions] = useState<PayoutTransaction[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [pendingEarnings, setPendingEarnings] = useState(0);

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const loadData = async () => {
    if (!user?.id) return;

    setLoading(true);
    await Promise.all([checkAccount(), loadTransactions(), loadEarnings()]);
    setLoading(false);
  };

  const checkAccount = async () => {
    if (!user?.id) return;

    try {
      const result = await checkAccountStatus(user.id, 'creator');
      setAccountStatus({
        hasAccount: result.success && !!result.accountId,
        onboardingCompleted: result.onboardingCompleted || false,
      });
    } catch (error) {
      console.error('Error checking account status:', error);
    }
  };

  const loadTransactions = async () => {
    if (!user?.id) return;

    try {
      // Get creator profile ID
      const { data: creatorProfile } = await supabase
        .from('creator_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!creatorProfile) return;

      // Get payment transactions
      const { data: paymentData } = await supabase
        .from('payment_transactions')
        .select(`
          id,
          amount_cents,
          creator_amount_cents,
          status,
          created_at,
          completed_at,
          campaign_id,
          campaigns(title)
        `)
        .eq('creator_id', creatorProfile.id)
        .eq('transaction_type', 'payout')
        .order('created_at', { ascending: false })
        .limit(50);

      if (paymentData) {
        const formatted = paymentData.map((t) => ({
          id: t.id,
          amount_cents: t.creator_amount_cents || t.amount_cents,
          status: t.status,
          created_at: t.created_at,
          completed_at: t.completed_at,
          campaign_id: t.campaign_id,
          campaign_title: (t.campaigns as any)?.title,
        }));
        setTransactions(formatted);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const loadEarnings = async () => {
    if (!user?.id) return;

    try {
      const { data: creatorProfile } = await supabase
        .from('creator_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!creatorProfile) return;

      // Calculate total earnings (completed payouts)
      const { data: completed } = await supabase
        .from('payment_transactions')
        .select('creator_amount_cents, amount_cents')
        .eq('creator_id', creatorProfile.id)
        .eq('transaction_type', 'payout')
        .eq('status', 'completed');

      const total = completed?.reduce((sum, t) => sum + (t.creator_amount_cents || t.amount_cents), 0) || 0;
      setTotalEarnings(total);

      // Calculate pending earnings (processing payouts)
      const { data: pending } = await supabase
        .from('payment_transactions')
        .select('creator_amount_cents, amount_cents')
        .eq('creator_id', creatorProfile.id)
        .eq('transaction_type', 'payout')
        .eq('status', 'processing');

      const pendingTotal = pending?.reduce((sum, t) => sum + (t.creator_amount_cents || t.amount_cents), 0) || 0;
      setPendingEarnings(pendingTotal);
    } catch (error) {
      console.error('Error loading earnings:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return CheckCircle;
      case 'processing':
        return Clock;
      case 'failed':
        return XCircle;
      default:
        return Clock;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return DS.colors.success;
      case 'processing':
        return '#F59E0B';
      case 'failed':
        return DS.colors.error;
      default:
        return DS.colors.textLight;
    }
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: DS.colors.background }}>
      <View style={{ padding: DS.spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: DS.spacing.lg }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: DS.spacing.md }}>
            <ArrowLeft size={24} color={DS.colors.text} />
          </TouchableOpacity>
          <Text style={{ fontSize: 24, fontWeight: '700', color: DS.colors.text }}>
            Payments
          </Text>
        </View>

        {!accountStatus.onboardingCompleted && (
          <View
            style={{
              backgroundColor: '#FEF3C7',
              padding: DS.spacing.md,
              borderRadius: DS.borderRadius.md,
              marginBottom: DS.spacing.lg,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Clock size={20} color="#92400E" style={{ marginRight: DS.spacing.sm }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#92400E', fontWeight: '600', marginBottom: 4 }}>
                Payment Account Not Connected
              </Text>
              <Text style={{ color: '#92400E', fontSize: 12 }}>
                Connect your bank account to receive payments
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/creator/payments/onboarding')}
              style={{
                backgroundColor: '#92400E',
                paddingHorizontal: DS.spacing.md,
                paddingVertical: DS.spacing.sm,
                borderRadius: DS.borderRadius.sm,
              }}
            >
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 12 }}>Connect</Text>
            </TouchableOpacity>
          </View>
        )}

        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Earnings Summary */}
          <View
            style={{
              backgroundColor: DS.colors.backgroundWhite,
              borderRadius: DS.borderRadius.lg,
              padding: DS.spacing.lg,
              marginBottom: DS.spacing.lg,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: DS.spacing.md }}>
              <DollarSign size={24} color={DS.colors.primary} style={{ marginRight: DS.spacing.sm }} />
              <Text style={{ fontSize: 18, fontWeight: '700', color: DS.colors.text }}>
                Earnings Summary
              </Text>
            </View>

            <View style={{ marginBottom: DS.spacing.md }}>
              <Text style={{ fontSize: 12, color: DS.colors.textLight, marginBottom: DS.spacing.xs }}>
                Total Earned
              </Text>
              <Text style={{ fontSize: 32, fontWeight: '700', color: DS.colors.text }}>
                ${(totalEarnings / 100).toFixed(2)}
              </Text>
            </View>

            {pendingEarnings > 0 && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#FFFBEB',
                  padding: DS.spacing.sm,
                  borderRadius: DS.borderRadius.sm,
                }}
              >
                <Clock size={16} color="#F59E0B" style={{ marginRight: DS.spacing.xs }} />
                <Text style={{ fontSize: 12, color: '#92400E' }}>
                  ${(pendingEarnings / 100).toFixed(2)} pending
                </Text>
              </View>
            )}
          </View>

          {/* Payment History */}
          <View style={{ marginBottom: DS.spacing.lg }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: DS.colors.text,
                marginBottom: DS.spacing.md,
              }}
            >
              Payment History
            </Text>

            {transactions.length === 0 ? (
              <View
                style={{
                  backgroundColor: DS.colors.backgroundWhite,
                  padding: DS.spacing.xl,
                  borderRadius: DS.borderRadius.md,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: DS.colors.textLight, textAlign: 'center' }}>
                  No payments yet. Complete campaigns to start earning!
                </Text>
              </View>
            ) : (
              transactions.map((transaction) => {
                const StatusIcon = getStatusIcon(transaction.status);
                const statusColor = getStatusColor(transaction.status);

                return (
                  <View
                    key={transaction.id}
                    style={{
                      backgroundColor: DS.colors.backgroundWhite,
                      borderRadius: DS.borderRadius.md,
                      padding: DS.spacing.md,
                      marginBottom: DS.spacing.sm,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: `${statusColor}20`,
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: DS.spacing.md,
                      }}
                    >
                      <StatusIcon size={20} color={statusColor} />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: DS.colors.text }}>
                        {transaction.campaign_title || 'Campaign Payment'}
                      </Text>
                      <Text style={{ fontSize: 12, color: DS.colors.textLight, marginTop: 2 }}>
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: DS.colors.text }}>
                        ${(transaction.amount_cents / 100).toFixed(2)}
                      </Text>
                      <Text style={{ fontSize: 11, color: statusColor, marginTop: 2 }}>
                        {transaction.status}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
