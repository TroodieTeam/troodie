import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Star,
  DollarSign,
  Calendar,
  Clock,
} from 'lucide-react-native';
import { DS } from '@/components/design-system/tokens';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface ApplicationDetail {
  id: string;
  campaign_id: string;
  campaign: {
    id: string;
    title: string;
    name: string;
    description: string;
    budget_cents: number;
    end_date: string;
  };
  creator: {
    id: string;
    display_name: string;
    avatar_url: string;
    followers_count: number;
    specialties: string[];
  };
  status: string;
  applied_at: string;
  cover_letter: string;
  proposed_rate_cents: number;
  proposed_deliverables: string;
  rating?: number;
  rating_comment?: string;
  rated_at?: string;
  total_deliverables: number;
  approved_deliverables: number;
  all_deliverables_approved: boolean;
}

export default function ApplicationDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<ApplicationDetail | null>(null);

  useEffect(() => {
    loadApplicationDetail();
  }, [id]);

  const loadApplicationDetail = async () => {
    try {
      if (!id) return;

      const { data: appData, error: appError } = await supabase
        .from('campaign_applications')
        .select(`
          *,
          creator_profiles (
            id,
            display_name,
            avatar_url,
            followers_count,
            specialties
          ),
          campaigns (
            id,
            title,
            name,
            description,
            budget_cents,
            end_date
          )
        `)
        .eq('id', id as string)
        .single();

      if (appError) throw appError;

      // Load deliverable counts
      const { data: deliverables } = await supabase
        .from('campaign_deliverables')
        .select('id, status')
        .eq('campaign_application_id', id as string);

      const total = deliverables?.length ?? 0;
      const approved = deliverables?.filter(
        d => d.status === 'approved' || d.status === 'auto_approved'
      ).length ?? 0;

      setApplication({
        ...appData,
        campaign: appData.campaigns,
        creator: appData.creator_profiles,
        total_deliverables: total,
        approved_deliverables: approved,
        all_deliverables_approved: total > 0 && approved === total,
      });
    } catch (error) {
      console.error('Failed to load application detail:', error);
      Alert.alert('Error', 'Failed to load application details');
    } finally {
      setLoading(false);
    }
  };

  const handleApplicationAction = async (action: 'accept' | 'reject') => {
    if (!application) return;

    const newStatus = action === 'accept' ? 'accepted' : 'rejected';
    Alert.alert(
      `${action === 'accept' ? 'Accept' : 'Reject'} Application`,
      `Are you sure you want to ${action} ${application.creator.display_name}'s application?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'accept' ? 'Accept' : 'Reject',
          style: action === 'reject' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('campaign_applications')
                .update({ status: newStatus, reviewed_at: new Date().toISOString() })
                .eq('id', application.id);

              if (error) throw error;

              setApplication({ ...application, status: newStatus });
              Alert.alert(
                'Success',
                `Application ${action === 'accept' ? 'accepted' : 'rejected'} successfully`,
                [{ text: 'OK', onPress: () => router.back() }]
              );
            } catch (error) {
              console.error('Failed to update application:', error);
              Alert.alert('Error', 'Failed to update application');
            }
          },
        },
      ]
    );
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending': return { color: '#D97706', bg: '#FEF3C7', label: 'Pending' };
      case 'accepted': return { color: '#16A34A', bg: '#DCFCE7', label: 'Accepted' };
      case 'rejected': return { color: '#DC2626', bg: '#FEE2E2', label: 'Rejected' };
      default: return { color: DS.colors.textGray, bg: '#F3F4F6', label: status };
    }
  };

  const statusConfig = application ? getStatusConfig(application.status) : null;

  if (loading || !application) {
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
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: DS.spacing.md,
        backgroundColor: DS.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: DS.colors.border,
      }}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={DS.colors.textDark} />
        </TouchableOpacity>
        <Text style={{ ...DS.typography.h3, color: DS.colors.textDark }}>Application Details</Text>
        {statusConfig && (
          <View style={{ backgroundColor: statusConfig.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: DS.borderRadius.full }}>
            <Text style={{ ...DS.typography.caption, fontWeight: '700', color: statusConfig.color, textTransform: 'uppercase' }}>
              {statusConfig.label}
            </Text>
          </View>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Campaign Info */}
        <View style={{
          backgroundColor: DS.colors.surface,
          margin: DS.spacing.md,
          padding: DS.spacing.md,
          borderRadius: DS.borderRadius.md,
          borderWidth: 1,
          borderColor: DS.colors.border,
        }}>
          <Text style={{ ...DS.typography.h3, color: DS.colors.textDark, marginBottom: DS.spacing.xs }}>
            {application.campaign.title || application.campaign.name}
          </Text>
          <Text style={{ ...DS.typography.body, color: DS.colors.textGray, marginBottom: DS.spacing.sm }}>
            {application.campaign.description}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <DollarSign size={14} color={DS.colors.textGray} />
              <Text style={{ ...DS.typography.caption, color: DS.colors.textGray, marginLeft: 2 }}>
                ${((application.campaign.budget_cents || 0) / 100).toFixed(0)} budget
              </Text>
            </View>
            {application.campaign.end_date && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Calendar size={14} color={DS.colors.textGray} />
                <Text style={{ ...DS.typography.caption, color: DS.colors.textGray, marginLeft: 2 }}>
                  Due {new Date(application.campaign.end_date).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Creator Profile */}
        <View style={{
          backgroundColor: DS.colors.surface,
          marginHorizontal: DS.spacing.md,
          marginBottom: DS.spacing.md,
          padding: DS.spacing.md,
          borderRadius: DS.borderRadius.md,
          borderWidth: 1,
          borderColor: DS.colors.border,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: DS.spacing.sm }}>
            <Image
              source={{ uri: application.creator.avatar_url }}
              style={{ width: 48, height: 48, borderRadius: DS.borderRadius.full, backgroundColor: DS.colors.surfaceLight, marginRight: DS.spacing.md }}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ ...DS.typography.h3, color: DS.colors.textDark }}>
                {application.creator.display_name}
              </Text>
              <Text style={{ ...DS.typography.body, color: DS.colors.textGray }}>
                {application.creator.followers_count?.toLocaleString() ?? 0} followers
              </Text>
            </View>
          </View>

          {application.creator.specialties?.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: DS.spacing.xs }}>
              {application.creator.specialties.map((s: string, i: number) => (
                <View key={i} style={{ backgroundColor: DS.colors.surfaceLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: DS.borderRadius.full }}>
                  <Text style={{ ...DS.typography.caption, color: DS.colors.textGray }}>{s}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Cover Letter */}
        {application.cover_letter ? (
          <View style={{
            backgroundColor: DS.colors.surface,
            marginHorizontal: DS.spacing.md,
            marginBottom: DS.spacing.md,
            padding: DS.spacing.md,
            borderRadius: DS.borderRadius.md,
            borderWidth: 1,
            borderColor: DS.colors.border,
          }}>
            <Text style={{ ...DS.typography.h3, color: DS.colors.textDark, marginBottom: DS.spacing.sm }}>Cover Letter</Text>
            <Text style={{ ...DS.typography.body, color: DS.colors.textDark, lineHeight: 20 }}>
              {application.cover_letter}
            </Text>
          </View>
        ) : null}

        {/* Proposed Rate */}
        {application.proposed_rate_cents ? (
          <View style={{
            backgroundColor: DS.colors.surface,
            marginHorizontal: DS.spacing.md,
            marginBottom: DS.spacing.md,
            padding: DS.spacing.md,
            borderRadius: DS.borderRadius.md,
            borderWidth: 1,
            borderColor: DS.colors.border,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <DollarSign size={16} color={DS.colors.primaryOrange} />
              <Text style={{ ...DS.typography.h3, color: DS.colors.textDark, marginLeft: 4 }}>
                ${(application.proposed_rate_cents / 100).toFixed(0)}
              </Text>
              <Text style={{ ...DS.typography.caption, color: DS.colors.textGray, marginLeft: 4 }}>
                proposed rate
              </Text>
            </View>
          </View>
        ) : null}

        {/* Deliverable Progress (for accepted applications) */}
        {application.status === 'accepted' && (
          <View style={{
            backgroundColor: DS.colors.surface,
            marginHorizontal: DS.spacing.md,
            marginBottom: DS.spacing.md,
            padding: DS.spacing.md,
            borderRadius: DS.borderRadius.md,
            borderWidth: 1,
            borderColor: DS.colors.border,
          }}>
            <Text style={{ ...DS.typography.h3, color: DS.colors.textDark, marginBottom: DS.spacing.sm }}>
              Deliverable Progress
            </Text>

            {application.total_deliverables === 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: DS.spacing.sm, backgroundColor: '#F3F4F6', borderRadius: DS.borderRadius.md }}>
                <Clock size={14} color={DS.colors.textGray} style={{ marginRight: 6 }} />
                <Text style={{ ...DS.typography.body, color: DS.colors.textGray }}>Awaiting Content</Text>
              </View>
            ) : (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: DS.spacing.sm }}>
                  <View style={{ flex: 1, height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
                    <View style={{
                      width: `${(application.approved_deliverables / application.total_deliverables) * 100}%`,
                      height: '100%',
                      backgroundColor: application.all_deliverables_approved ? '#16A34A' : DS.colors.primaryOrange,
                      borderRadius: 4,
                    }} />
                  </View>
                  <Text style={{ ...DS.typography.caption, color: DS.colors.textGray, marginLeft: DS.spacing.sm }}>
                    {application.approved_deliverables}/{application.total_deliverables}
                  </Text>
                </View>

                <Text style={{ ...DS.typography.caption, color: DS.colors.textGray }}>
                  {application.all_deliverables_approved
                    ? 'All deliverables approved'
                    : `${application.approved_deliverables} of ${application.total_deliverables} deliverables approved`}
                </Text>
              </>
            )}
          </View>
        )}

        {/* Rate Creator (only when all deliverables approved) */}
        {application.status === 'accepted' && !application.rating && application.all_deliverables_approved && (
          <View style={{ marginHorizontal: DS.spacing.md, marginBottom: DS.spacing.md }}>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                padding: DS.spacing.md,
                backgroundColor: '#FFF7ED',
                borderRadius: DS.borderRadius.md,
                borderWidth: 1,
                borderColor: '#FFEDD5',
              }}
              onPress={() => router.back()}
            >
              <Star size={18} color={DS.colors.primaryOrange} fill={DS.colors.primaryOrange} style={{ marginRight: 8 }} />
              <Text style={{ ...DS.typography.button, color: DS.colors.primaryOrange }}>Rate Creator</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Rating (if already rated) */}
        {application.rating ? (
          <View style={{
            backgroundColor: DS.colors.surface,
            marginHorizontal: DS.spacing.md,
            marginBottom: DS.spacing.md,
            padding: DS.spacing.md,
            borderRadius: DS.borderRadius.md,
            borderWidth: 1,
            borderColor: DS.colors.border,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Star size={16} color={DS.colors.primaryOrange} fill={DS.colors.primaryOrange} style={{ marginRight: 6 }} />
              <Text style={{ ...DS.typography.body, fontWeight: '600', color: DS.colors.textDark }}>
                Rated {application.rating}/5
              </Text>
            </View>
            {application.rating_comment ? (
              <Text style={{ ...DS.typography.body, color: DS.colors.textGray, marginTop: DS.spacing.xs }}>
                {application.rating_comment}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Applied date */}
        <View style={{ paddingHorizontal: DS.spacing.md, marginBottom: DS.spacing.md }}>
          <Text style={{ ...DS.typography.caption, color: DS.colors.textGray }}>
            Applied {new Date(application.applied_at).toLocaleDateString()}
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Action Buttons */}
      {application.status === 'pending' && (
        <View style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: DS.colors.surface,
          borderTopWidth: 1,
          borderTopColor: DS.colors.border,
          padding: DS.spacing.md,
          flexDirection: 'row',
          gap: DS.spacing.sm,
        }}>
          <TouchableOpacity
            onPress={() => handleApplicationAction('reject')}
            style={{
              flex: 1,
              backgroundColor: '#FEE2E2',
              padding: DS.spacing.md,
              borderRadius: DS.borderRadius.md,
              alignItems: 'center',
            }}
          >
            <Text style={{ ...DS.typography.button, color: '#DC2626' }}>Reject</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleApplicationAction('accept')}
            style={{
              flex: 1,
              backgroundColor: DS.colors.success,
              padding: DS.spacing.md,
              borderRadius: DS.borderRadius.md,
              alignItems: 'center',
            }}
          >
            <Text style={{ ...DS.typography.button, color: 'white' }}>Accept</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
