import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { campaignApplicationService } from '@/services/campaignApplicationService';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Camera, Check, DollarSign, Image as ImageIcon, Target, User, Video } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ApplyToCampaignScreen() {
  const { campaignId } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [campaign, setCampaign] = useState<any>(null);
  const [creatorProfile, setCreatorProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');

  useEffect(() => {
    fetchData();
  }, [campaignId]);

  const fetchData = async () => {
    try {
      if (!user || !campaignId) return;

      // Fetch Campaign Details
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select(`
          *,
          restaurant:restaurants(*)
        `)
        .eq('id', campaignId)
        .single();

      if (campaignError) throw campaignError;
      setCampaign(campaignData);

      // Fetch Creator Profile
      const { data: profileData, error: profileError } = await supabase
        .from('creator_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;
      setCreatorProfile(profileData);

    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load application details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!campaign || !creatorProfile) return;

    setSubmitting(true);
    try {
      const result = await campaignApplicationService.applyToCampaign({
        campaignId: campaign.id,
        proposedRateCents: campaign.budget_cents, // Fixed budget
        proposedDeliverables: JSON.stringify(campaign.deliverable_requirements), // Fixed requirements
        coverLetter: coverLetter.trim()
      });

      if (result.success) {
        Alert.alert(
          'Application Submitted! 🎉',
          'The restaurant will review your profile. Good luck!',
          [{ text: 'OK', onPress: () => router.push('/creator/campaigns') }]
        );
      } else {
        Alert.alert('Application Failed', result.error || 'Something went wrong.');
      }
    } catch (error) {
      console.error('Application error:', error);
      Alert.alert('Error', 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  const getDeliverableIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('reel') || t.includes('video') || t.includes('tiktok')) return <Video size={20} color="#F59E0B" />;
    if (t.includes('story')) return <Camera size={20} color="#EC4899" />;
    return <ImageIcon size={20} color="#3B82F6" />;
  };

  const parseDeliverables = () => {
    if (!campaign?.deliverable_requirements) return [];
    try {
      const reqs = typeof campaign.deliverable_requirements === 'string'
        ? JSON.parse(campaign.deliverable_requirements)
        : campaign.deliverable_requirements;
      return reqs.deliverables || [];
    } catch {
      return [];
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  if (!campaign) return null;

  const deliverables = parseDeliverables();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review & Apply</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          
          {/* Campaign Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Campaign Summary</Text>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                {campaign.restaurant?.cover_photo_url ? (
                  <Image source={{ uri: campaign.restaurant.cover_photo_url }} style={styles.restaurantImage} />
                ) : (
                  <View style={styles.restaurantPlaceholder} />
                )}
                <View style={styles.cardHeaderText}>
                  <Text style={styles.cardTitle}>{campaign.title}</Text>
                  <Text style={styles.cardSubtitle}>{campaign.restaurant?.name}</Text>
                </View>
              </View>
              <View style={styles.cardStats}>
                <View style={styles.statPill}>
                  <DollarSign size={14} color="#10B981" />
                  <Text style={styles.statText}>${(campaign.budget_cents / 100).toFixed(0)}</Text>
                </View>
                <View style={styles.statPill}>
                  <Target size={14} color="#F59E0B" />
                  <Text style={styles.statText}>{deliverables.length} Deliverables</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Profile Preview */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Profile Preview</Text>
            <View style={styles.profileCard}>
              <View style={styles.profileHeader}>
                {creatorProfile?.avatar_url ? (
                  <Image source={{ uri: creatorProfile.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <User size={24} color="#FFF" />
                  </View>
                )}
                <View>
                  <Text style={styles.profileName}>{creatorProfile?.display_name || 'Creator'}</Text>
                  <Text style={styles.profileStats}>
                    {((creatorProfile?.total_followers || 0) / 1000).toFixed(1)}k Followers • {creatorProfile?.troodie_engagement_rate || 0}% Eng.
                  </Text>
                </View>
              </View>
              <Text style={styles.profileHint}>This is how the brand will see you.</Text>
            </View>
          </View>

          {/* Deliverables Checklist */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Deliverables Checklist</Text>
            <View style={styles.checklist}>
              {deliverables.length > 0 ? (
                deliverables.map((item: any, idx: number) => (
                  <View key={idx} style={styles.checklistItem}>
                    <View style={styles.iconBox}>
                      {getDeliverableIcon(item.type || '')}
                    </View>
                    <View style={styles.checklistItemContent}>
                      <Text style={styles.checklistItemTitle}>
                        {item.quantity || 1}x {item.type}
                      </Text>
                      {item.description && (
                        <Text style={styles.checklistItemDesc}>{item.description}</Text>
                      )}
                    </View>
                    <View style={styles.checkbox}>
                      <Check size={16} color="#FFF" />
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No specific deliverables listed.</Text>
              )}
            </View>
          </View>

          {/* Cover Letter */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cover Letter (Optional)</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Why are you a good fit for this campaign?"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={coverLetter}
              onChangeText={setCoverLetter}
              placeholderTextColor="#999"
            />
            <Text style={styles.charCount}>{coverLetter.length}/500</Text>
          </View>

          {/* Contract Summary */}
          <View style={styles.contractBox}>
            <Text style={styles.contractTitle}>Contract Summary</Text>
            <Text style={styles.contractText}>
              By applying, you agree to complete the <Text style={{fontWeight: '700'}}>{deliverables.length} deliverables</Text> by <Text style={{fontWeight: '700'}}>{new Date(campaign.end_date).toLocaleDateString()}</Text> in exchange for <Text style={{fontWeight: '700'}}>${(campaign.budget_cents / 100).toFixed(2)}</Text>.
            </Text>
          </View>

        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.submitButton, submitting && styles.disabledButton]} 
            onPress={handleApply}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitButtonText}>Confirm & Apply</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  restaurantImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  restaurantPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  cardHeaderText: {
    marginLeft: 12,
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  cardStats: {
    flexDirection: 'row',
    gap: 8,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  profileCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  profileStats: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  profileHint: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  checklist: {
    gap: 12,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checklistItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  checklistItemTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
  },
  checklistItemDesc: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textArea: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    minHeight: 120,
    color: '#000',
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
  contractBox: {
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 20,
  },
  contractTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
  },
  contractText: {
    fontSize: 14,
    color: '#1E3A8A',
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  submitButton: {
    backgroundColor: '#262626',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  emptyText: {
    color: '#666',
    fontStyle: 'italic',
  }
});
