import { DS } from '@/components/design-system/tokens';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { processDeliverablePayout } from '@/services/payoutService';
import { checkAccountStatus, createStripeAccount, getOnboardingLink } from '@/services/stripeService';
import { useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle, Clock, RefreshCw, XCircle } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Linking, RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View
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

interface PendingDeliverable {
  id: string;
  campaign_id: string;
  campaign_title?: string;
  payment_amount_cents: number;
  payment_status: string;
  status: string;
  submitted_at: string;
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
  const [pendingDeliverables, setPendingDeliverables] = useState<PendingDeliverable[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [pendingEarnings, setPendingEarnings] = useState(0);
  const [connectingAccount, setConnectingAccount] = useState(false);
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const [processingPayout, setProcessingPayout] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const loadData = async () => {
    if (!user?.id) return;

    setLoading(true);
    await Promise.all([checkAccount(), loadTransactions(), loadEarnings(), loadPendingDeliverables()]);
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

  const loadPendingDeliverables = async () => {
    if (!user?.id) return;

    try {
      const { data: creatorProfile } = await supabase
        .from('creator_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!creatorProfile) return;

      // Get deliverables waiting for payout (pending_onboarding or processing)
      const { data: deliverables } = await supabase
        .from('campaign_deliverables')
        .select(`
          id,
          campaign_id,
          payment_amount_cents,
          payment_status,
          status,
          submitted_at,
          campaigns(title)
        `)
        .eq('creator_id', creatorProfile.id)
        .in('payment_status', ['pending_onboarding', 'processing', 'pending'])
        .in('status', ['approved', 'auto_approved'])
        .order('submitted_at', { ascending: false });

      if (deliverables) {
        const formatted = deliverables.map((d) => ({
          id: d.id,
          campaign_id: d.campaign_id,
          campaign_title: (d.campaigns as any)?.title,
          payment_amount_cents: d.payment_amount_cents || 0,
          payment_status: d.payment_status,
          status: d.status,
          submitted_at: d.submitted_at,
        }));
        setPendingDeliverables(formatted);
      }
    } catch (error) {
      console.error('Error loading pending deliverables:', error);
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

      const pendingTransactions = pending?.reduce((sum, t) => sum + (t.creator_amount_cents || t.amount_cents), 0) || 0;
      
      // Get pending deliverables amounts
      const { data: deliverables } = await supabase
        .from('campaign_deliverables')
        .select('payment_amount_cents')
        .eq('creator_id', creatorProfile.id)
        .in('payment_status', ['pending_onboarding', 'processing', 'pending'])
        .in('status', ['approved', 'auto_approved']);

      const pendingDeliverablesAmount = deliverables?.reduce(
        (sum, d) => sum + (d.payment_amount_cents || 0),
        0
      ) || 0;
      
      setPendingEarnings(pendingTransactions + pendingDeliverablesAmount);
    } catch (error) {
      console.error('Error loading earnings:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleManualRefresh = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User information is missing');
      return;
    }

    setRefreshingStatus(true);
    try {
      console.log('[Payments] Manually refreshing account status from Stripe...');
      
      // Ensure we have a valid session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData?.session) {
        Alert.alert('Authentication Error', 'Please sign in again');
        return;
      }

      // Call Edge Function to refresh status from Stripe API
      const { data, error } = await supabase.functions.invoke('stripe-refresh-account-status', {
        body: {
          accountType: 'creator',
        },
      });

      if (error || !data?.success) {
        console.error('[Payments] Refresh failed:', error || data?.error);
        Alert.alert('Refresh Failed', error?.message || data?.error || 'Could not refresh status');
        return;
      }

      console.log('[Payments] Refresh success:', data);
      
      // Update local state
      const wasCompleted = accountStatus.onboardingCompleted;
      setAccountStatus({
        hasAccount: true,
        onboardingCompleted: data.onboardingCompleted || false,
      });

      if (data.onboardingCompleted) {
        // Reload data to get fresh state
        await loadData();
        
        Alert.alert('Success', 'Payment account is now connected! Payouts will process automatically.');
        
        // If onboarding just completed, the webhook should trigger automatic payout retry
        // But we can also manually trigger if webhook is delayed
        if (!wasCompleted) {
          console.log('[Payments] Onboarding completed - webhook should trigger payout retry automatically');
        }
      } else {
        Alert.alert('Info', 'Onboarding still in progress. Please complete it on Stripe.');
      }
    } catch (error) {
      console.error('[Payments] Refresh error:', error);
      Alert.alert('Error', 'Failed to refresh account status');
    } finally {
      setRefreshingStatus(false);
    }
  };

  const handleRetryPayout = async (deliverableId: string) => {
    if (!user?.id) {
      Alert.alert('Error', 'User information is missing');
      return;
    }

    setProcessingPayout(deliverableId);
    try {
      console.log('[Payments] Retrying payout for deliverable:', deliverableId);
      console.log('[Payments] Current account status:', accountStatus);
      
      // First, ensure we have the latest account status
      if (!accountStatus.onboardingCompleted) {
        console.log('[Payments] Account not completed, refreshing status first...');
        await checkAccount();
        
        // Check again after refresh
        const latestStatus = await checkAccountStatus(user.id, 'creator');
        if (!latestStatus.onboardingCompleted) {
          Alert.alert('Account Not Ready', 'Please complete Stripe onboarding first.');
          return;
        }
      }
      
      const result = await processDeliverablePayout(deliverableId);
      
      if (result.success) {
        console.log('[Payments] ✅ Payout processing started:', result);
        Alert.alert(
          'Success', 
          'Payout processing started! The payment will appear in your account once Stripe completes the transfer (usually within 1-2 business days).'
        );
        // Reload data to show updated status
        await loadData();
      } else {
        console.error('[Payments] ❌ Payout retry failed:', result.error);
        Alert.alert('Error', result.error || 'Failed to process payout');
      }
    } catch (error) {
      console.error('[Payments] Error retrying payout:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to retry payout');
    } finally {
      setProcessingPayout(null);
    }
  };

  const handleDirectConnect = async () => {
    if (!user?.id || !user?.email) {
      Alert.alert('Error', 'User information is missing');
      return;
    }

    setConnectingAccount(true);
    try {
      // Check if account exists and get onboarding link
      const statusResult = await checkAccountStatus(user.id, 'creator');
      let link: string | null = null;

      if (statusResult.success && statusResult.accountId) {
        // Account exists, try to get onboarding link from database first
        const linkResult = await getOnboardingLink(statusResult.accountId, user.id, 'creator');
        if (linkResult.success && linkResult.onboardingLink) {
          link = linkResult.onboardingLink;
        } else {
          // No valid link, call Edge Function to refresh (getOnboardingLink handles this now)
          const refreshResult = await getOnboardingLink(statusResult.accountId, user.id, 'creator');
          if (refreshResult.success && refreshResult.onboardingLink) {
            link = refreshResult.onboardingLink;
          }
        }
      }

      if (!link) {
        // Create new account
        console.log('[Payments] Creating new Stripe account...');
        const result = await createStripeAccount(user.id, 'creator', user.email);
        if (result.success && result.onboardingLink) {
          link = result.onboardingLink;
        } else {
          Alert.alert('Error', result.error || 'Failed to create payment account');
          return;
        }
      }

      if (link) {
        console.log('[Payments] Opening Stripe onboarding link...');
        // Open Stripe onboarding link directly
        const canOpen = await Linking.canOpenURL(link);
        if (canOpen) {
          await Linking.openURL(link);
        } else {
          Alert.alert('Error', 'Cannot open Stripe link');
        }
      } else {
        Alert.alert('Error', 'No onboarding link available. Please try again.');
      }
    } catch (error) {
      console.error('[Payments] Error connecting account:', error);
      Alert.alert('Error', 'Failed to connect payment account. Please try again.');
    } finally {
      setConnectingAccount(false);
    }
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
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: DS.spacing.md }}>
              <Clock size={20} color="#92400E" style={{ marginRight: DS.spacing.sm, marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#92400E', fontWeight: '600', marginBottom: 4, fontSize: 15 }}>
                  Payment Account Not Connected
                </Text>
                <Text style={{ color: '#92400E', fontSize: 13, lineHeight: 18 }}>
                  Connect your bank account to receive payments
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleDirectConnect}
              disabled={connectingAccount}
              activeOpacity={0.8}
              style={{
                backgroundColor: '#92400E',
                paddingVertical: DS.spacing.md,
                paddingHorizontal: DS.spacing.lg,
                borderRadius: DS.borderRadius.sm,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                marginBottom: DS.spacing.sm,
              }}
            >
              {connectingAccount ? (
                <>
                  <ActivityIndicator color="white" size="small" style={{ marginRight: DS.spacing.sm }} />
                  <Text style={{ color: 'white', fontWeight: '600', fontSize: 15 }}>
                    Connecting...
                  </Text>
                </>
              ) : (
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 15 }}>
                  Connect Bank Account
                </Text>
              )}
            </TouchableOpacity>
            
            {/* Manual refresh button - show if account exists but not completed */}
            {accountStatus.hasAccount && (
              <TouchableOpacity
                onPress={handleManualRefresh}
                disabled={refreshingStatus}
                activeOpacity={0.8}
                style={{
                  backgroundColor: 'transparent',
                  borderWidth: 1,
                  borderColor: '#92400E',
                  paddingVertical: DS.spacing.sm,
                  paddingHorizontal: DS.spacing.lg,
                  borderRadius: DS.borderRadius.sm,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                }}
              >
                {refreshingStatus ? (
                  <>
                    <ActivityIndicator color="#92400E" size="small" style={{ marginRight: DS.spacing.sm }} />
                    <Text style={{ color: '#92400E', fontWeight: '600', fontSize: 14 }}>
                      Refreshing...
                    </Text>
                  </>
                ) : (
                  <Text style={{ color: '#92400E', fontWeight: '600', fontSize: 14 }}>
                    Refresh Status
                  </Text>
                )}
              </TouchableOpacity>
            )}
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
            <Text style={{ fontSize: 18, fontWeight: '700', color: DS.colors.text, marginBottom: DS.spacing.md }}>
              Earnings Summary
            </Text>

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

          {/* Pending Payments (Waiting for Payout) */}
          {pendingDeliverables.length > 0 && (
            <View style={{ marginBottom: DS.spacing.lg }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '700',
                  color: DS.colors.text,
                  marginBottom: DS.spacing.md,
                }}
              >
                Pending Payments
              </Text>

              {pendingDeliverables.map((deliverable) => {
                const isPendingOnboarding = deliverable.payment_status === 'pending_onboarding';
                const canRetry = accountStatus.onboardingCompleted && isPendingOnboarding;

                return (
                  <View
                    key={deliverable.id}
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
                        backgroundColor: isPendingOnboarding ? '#FEF3C720' : '#3B82F620',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: DS.spacing.md,
                      }}
                    >
                      {isPendingOnboarding ? (
                        <Clock size={20} color="#F59E0B" />
                      ) : (
                        <RefreshCw size={20} color="#3B82F6" />
                      )}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: DS.colors.text }}>
                        {deliverable.campaign_title || 'Campaign Payment'}
                      </Text>
                      <Text style={{ fontSize: 12, color: DS.colors.textLight, marginTop: 2 }}>
                        {new Date(deliverable.submitted_at).toLocaleDateString()}
                      </Text>
                      {isPendingOnboarding && !accountStatus.onboardingCompleted && (
                        <Text style={{ fontSize: 11, color: '#F59E0B', marginTop: 4 }}>
                          Complete Stripe setup to receive payment
                        </Text>
                      )}
                    </View>

                    <View style={{ alignItems: 'flex-end', marginRight: DS.spacing.sm }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: DS.colors.text }}>
                        ${((deliverable.payment_amount_cents || 0) / 100).toFixed(2)}
                      </Text>
                      <Text style={{ fontSize: 11, color: isPendingOnboarding ? '#F59E0B' : '#3B82F6', marginTop: 2 }}>
                        {isPendingOnboarding ? 'Waiting' : 'Processing'}
                      </Text>
                    </View>

                    {canRetry && (
                      <TouchableOpacity
                        onPress={() => handleRetryPayout(deliverable.id)}
                        disabled={processingPayout === deliverable.id}
                        style={{
                          padding: DS.spacing.sm,
                          borderRadius: DS.borderRadius.sm,
                          backgroundColor: DS.colors.primaryOrange,
                        }}
                      >
                        {processingPayout === deliverable.id ? (
                          <ActivityIndicator color="white" size="small" />
                        ) : (
                          <RefreshCw size={16} color="white" />
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          )}

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

            {transactions.length === 0 && pendingDeliverables.length === 0 ? (
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
