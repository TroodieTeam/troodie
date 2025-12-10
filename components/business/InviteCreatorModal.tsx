/**
 * Invite Creator Modal Component
 * 
 * Allows businesses to invite creators to specific campaigns
 */

import { DS } from '@/components/design-system/tokens';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { createInvitation } from '@/services/campaignInvitationService';
import { Calendar, DollarSign, Send, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Campaign {
  id: string;
  title: string;
  budget_cents: number;
  end_date: string;
}

interface InviteCreatorModalProps {
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function InviteCreatorModal({
  creatorId,
  creatorName,
  creatorAvatar,
  visible,
  onClose,
  onSuccess,
}: InviteCreatorModalProps) {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);

  useEffect(() => {
    if (visible) {
      loadActiveCampaigns();
    } else {
      // Reset form when modal closes
      setSelectedCampaignId('');
      setMessage('');
    }
  }, [visible]);

  const loadActiveCampaigns = async () => {
    if (!user?.id) return;

    try {
      setLoadingCampaigns(true);
      
      // Get business's active campaigns
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, title, budget_cents, end_date')
        .eq('owner_id', user.id)
        .eq('status', 'active')
        .gte('end_date', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCampaigns(data || []);
    } catch (error) {
      console.error('Error loading campaigns:', error);
      Alert.alert('Error', 'Failed to load campaigns');
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const handleSendInvitation = async () => {
    if (!selectedCampaignId) {
      Alert.alert('Error', 'Please select a campaign');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await createInvitation({
        campaign_id: selectedCampaignId,
        creator_id: creatorId,
        message: message.trim() || undefined,
      });

      if (error) {
        setLoading(false); // Reset loading state
        
        // Check for duplicate invitation errors
        if (error.message.includes('already been invited') || 
            error.message.includes('already exists') ||
            error.message.includes('duplicate')) {
          Alert.alert(
            'Already Invited',
            'This creator has already been invited to this campaign. Please select a different campaign or wait for their response.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Error', error.message || 'Failed to send invitation');
        }
        // Don't close modal on error - allow user to try again or select different campaign
        return;
      }

      Alert.alert(
        'Invitation Sent!',
        `Your invitation has been sent to ${creatorName}. They will receive a notification.`,
        [
          {
            text: 'OK',
            onPress: () => {
              onSuccess?.();
              onClose();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      Alert.alert('Error', 'Failed to send invitation. Please try again.');
      // Don't close modal on error - allow user to try again
      setLoading(false);
    }
  };

  const formatBudget = (cents: number) => {
    return `$${(cents / 100).toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.overlayTouchable} 
          activeOpacity={1} 
          onPress={onClose}
        />
        <SafeAreaView edges={['bottom']} style={styles.safeArea} pointerEvents="box-none">
          <View style={styles.modal} onStartShouldSetResponder={() => true}>
            {/* Drag Handle */}
            <View style={styles.dragHandle} />
            
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Invite Creator to Campaign</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color={DS.colors.textDark} />
              </TouchableOpacity>
            </View>

            {/* Creator Info */}
            <View style={styles.creatorInfo}>
              <Text style={styles.creatorName}>{creatorName}</Text>
              <Text style={styles.creatorSubtext}>Select a campaign to invite them to</Text>
            </View>

            <ScrollView 
              style={styles.content} 
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Campaign Selector */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Select Campaign *</Text>
                {loadingCampaigns ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={DS.colors.primaryOrange} />
                    <Text style={styles.loadingText}>Loading campaigns...</Text>
                  </View>
                ) : campaigns.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No active campaigns</Text>
                    <Text style={styles.emptySubtext}>
                      Create a campaign first to invite creators
                    </Text>
                  </View>
                ) : (
                  <View style={styles.campaignList}>
                    {campaigns.map((campaign) => (
                      <TouchableOpacity
                        key={campaign.id}
                        style={[
                          styles.campaignCard,
                          selectedCampaignId === campaign.id && styles.campaignCardSelected,
                        ]}
                        onPress={() => setSelectedCampaignId(campaign.id)}
                      >
                        <View style={styles.campaignCardContent}>
                          <Text style={styles.campaignTitle}>{campaign.title}</Text>
                          <View style={styles.campaignMeta}>
                            <View style={styles.campaignMetaItem}>
                              <DollarSign size={14} color={DS.colors.textLight} />
                              <Text style={styles.campaignMetaText}>
                                {formatBudget(campaign.budget_cents)}
                              </Text>
                            </View>
                            <View style={styles.campaignMetaItem}>
                              <Calendar size={14} color={DS.colors.textLight} />
                              <Text style={styles.campaignMetaText}>
                                {formatDate(campaign.end_date)}
                              </Text>
                            </View>
                          </View>
                        </View>
                        {selectedCampaignId === campaign.id && (
                          <View style={styles.checkmark}>
                            <View style={styles.checkmarkInner} />
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Message (Optional) */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Message (Optional)</Text>
                <Text style={styles.sectionDescription}>
                  Add a personal message to your invitation
                </Text>
                <TextInput
                  style={styles.messageInput}
                  placeholder="e.g., We'd love to work with you on this campaign..."
                  placeholderTextColor={DS.colors.textLight}
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                />
                <Text style={styles.charCount}>{message.length}/500</Text>
              </View>
            </ScrollView>

            {/* Footer - Always visible */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.cancelButton, loading && styles.buttonDisabled]}
                onPress={onClose}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!selectedCampaignId || loading) && styles.buttonDisabled,
                ]}
                onPress={handleSendInvitation}
                disabled={!selectedCampaignId || loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Send size={18} color="#FFFFFF" />
                    <Text style={styles.sendButtonText}>Send Invitation</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: DS.colors.overlay,
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    maxHeight: '90%',
    width: '100%',
  },
  modal: {
    backgroundColor: DS.colors.surface,
    borderTopLeftRadius: DS.borderRadius.xl,
    borderTopRightRadius: DS.borderRadius.xl,
    height: '100%',
    flexDirection: 'column',
    ...DS.shadows.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: DS.spacing.lg,
    paddingTop: DS.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: DS.colors.border,
    backgroundColor: DS.colors.surface,
  },
  title: {
    ...DS.typography.h2,
    color: DS.colors.textDark,
    flex: 1,
    marginRight: DS.spacing.md,
  },
  closeButton: {
    padding: DS.spacing.xs,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: DS.colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: DS.spacing.sm,
    marginBottom: DS.spacing.xs,
  },
  creatorInfo: {
    padding: DS.spacing.lg,
    paddingVertical: DS.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: DS.colors.borderLight,
    backgroundColor: DS.colors.surfaceLight,
  },
  creatorName: {
    ...DS.typography.h3,
    color: DS.colors.textDark,
    marginBottom: DS.spacing.xs,
  },
  creatorSubtext: {
    ...DS.typography.body,
    color: DS.colors.textGray,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: DS.spacing.lg,
    paddingBottom: DS.spacing.sm,
  },
  section: {
    marginBottom: DS.spacing.xxl,
  },
  sectionTitle: {
    ...DS.typography.h3,
    color: DS.colors.textDark,
    marginBottom: DS.spacing.xs,
  },
  sectionDescription: {
    ...DS.typography.metadata,
    color: DS.colors.textGray,
    marginBottom: DS.spacing.md,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: DS.spacing.sm,
    ...DS.typography.body,
    color: DS.colors.textGray,
  },
  emptyState: {
    padding: DS.spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    ...DS.typography.h3,
    color: DS.colors.textDark,
    marginBottom: DS.spacing.xs,
  },
  emptySubtext: {
    ...DS.typography.body,
    color: DS.colors.textGray,
    textAlign: 'center',
  },
  campaignList: {
    gap: 12,
  },
  campaignCard: {
    borderWidth: 2,
    borderColor: DS.colors.border,
    borderRadius: DS.borderRadius.lg,
    padding: DS.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS.colors.surface,
    ...DS.shadows.sm,
    marginBottom: DS.spacing.sm,
  },
  campaignCardSelected: {
    borderColor: DS.colors.primaryOrange,
    backgroundColor: DS.colors.primaryOrange + '15',
    ...DS.shadows.md,
  },
  campaignCardContent: {
    flex: 1,
  },
  campaignTitle: {
    ...DS.typography.h3,
    color: DS.colors.textDark,
    marginBottom: DS.spacing.sm,
  },
  campaignMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  campaignMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  campaignMetaText: {
    ...DS.typography.metadata,
    color: DS.colors.textGray,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: DS.colors.primaryOrange,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: DS.spacing.md,
    backgroundColor: DS.colors.primaryOrange + '20',
  },
  checkmarkInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: DS.colors.primaryOrange,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: DS.colors.border,
    borderRadius: DS.borderRadius.lg,
    padding: DS.spacing.md,
    ...DS.typography.body,
    color: DS.colors.textDark,
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: DS.colors.surface,
  },
  charCount: {
    ...DS.typography.caption,
    color: DS.colors.textGray,
    textAlign: 'right',
    marginTop: DS.spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    padding: DS.spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? DS.spacing.lg : DS.spacing.lg,
    gap: DS.spacing.md,
    borderTopWidth: 1,
    borderTopColor: DS.colors.border,
    backgroundColor: DS.colors.surface,
    ...DS.shadows.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: DS.spacing.md,
    borderRadius: DS.borderRadius.lg,
    borderWidth: 1,
    borderColor: DS.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DS.colors.surface,
  },
  cancelButtonText: {
    ...DS.typography.button,
    color: DS.colors.textDark,
  },
  sendButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: DS.spacing.md,
    borderRadius: DS.borderRadius.lg,
    backgroundColor: DS.colors.primaryOrange,
    alignItems: 'center',
    justifyContent: 'center',
    gap: DS.spacing.sm,
    ...DS.shadows.sm,
  },
  sendButtonText: {
    ...DS.typography.button,
    color: DS.colors.textWhite,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

