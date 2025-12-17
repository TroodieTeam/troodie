import { DS } from '@/components/design-system/tokens';
import { CampaignDeliverable } from '@/types/campaign';
import * as Linking from 'expo-linking';
import { AlertCircle, Check, ChevronDown, ChevronUp, Clock, Edit, ExternalLink, Star, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Image, Text, TouchableOpacity, View } from 'react-native';

interface DeliverableCardProps {
  deliverable: CampaignDeliverable;
  onStatusChange: (status: string, feedback?: string) => void;
  onRateCreator?: (applicationId: string) => void;
}

export const DeliverableCard: React.FC<DeliverableCardProps> = ({ 
  deliverable, 
  onStatusChange,
  onRateCreator
}) => {
  const [expanded, setExpanded] = useState(false);
  const isPending = deliverable.status === 'pending_review';
  const isApproved = deliverable.status === 'approved' || deliverable.status === 'auto_approved';

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending_review': return { color: '#D97706', bg: '#FEF3C7', label: 'Pending Review', icon: Clock };
      case 'approved': 
      case 'auto_approved': return { color: '#16A34A', bg: '#DCFCE7', label: 'Approved', icon: Check };
      case 'rejected': return { color: '#DC2626', bg: '#FEE2E2', label: 'Rejected', icon: X };
      case 'revision_requested': return { color: '#7C3AED', bg: '#F3E8FF', label: 'Revision Requested', icon: Edit };
      default: return { color: DS.colors.textGray, bg: '#F3F4F6', label: status, icon: AlertCircle };
    }
  };

  const statusConfig = getStatusConfig(deliverable.status);
  const StatusIcon = statusConfig.icon;

  return (
    <View style={{
      backgroundColor: DS.colors.surface,
      borderRadius: DS.borderRadius.lg,
      borderWidth: 1,
      borderColor: DS.colors.border,
      overflow: 'hidden',
      ...DS.shadows.sm
    }}>
      {/* Header */}
      <View style={{ padding: DS.spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: DS.spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Image 
              source={{ uri: deliverable.creator_profiles.avatar_url }} 
              style={{ width: 40, height: 40, borderRadius: DS.borderRadius.full, marginRight: DS.spacing.md, backgroundColor: DS.colors.surfaceLight }} 
            />
            <View>
              <Text style={{ ...DS.typography.body, fontWeight: '600', color: DS.colors.textDark }}>{deliverable.creator_profiles.display_name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ ...DS.typography.caption, color: DS.colors.textGray, textTransform: 'capitalize' }}>
                  {deliverable.platform} • {new Date(deliverable.submitted_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={{
            backgroundColor: statusConfig.bg,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: DS.borderRadius.full,
            flexDirection: 'row',
            alignItems: 'center'
          }}>
            <StatusIcon size={12} color={statusConfig.color} style={{ marginRight: 4 }} />
            <Text style={{ ...DS.typography.caption, fontWeight: '700', color: statusConfig.color }}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        {deliverable.thumbnail_url && (
          <TouchableOpacity 
            onPress={() => Linking.openURL(deliverable.platform_post_url)}
            activeOpacity={0.9}
            style={{ borderRadius: DS.borderRadius.md, overflow: 'hidden', marginBottom: DS.spacing.md, height: 200, backgroundColor: DS.colors.surfaceLight }}
          >
            <Image 
              source={{ uri: deliverable.thumbnail_url }} 
              style={{ width: '100%', height: '100%' }} 
              resizeMode="cover" 
            />
            <View style={{ position: 'absolute', bottom: DS.spacing.sm, right: DS.spacing.sm, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: DS.borderRadius.sm, flexDirection: 'row', alignItems: 'center' }}>
              <ExternalLink size={12} color="white" style={{ marginRight: 4 }} />
              <Text style={{ ...DS.typography.caption, color: 'white' }}>View Post</Text>
            </View>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          onPress={() => setExpanded(!expanded)}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: DS.spacing.xs }}
        >
          <Text style={{ ...DS.typography.caption, color: DS.colors.textGray, marginRight: 4 }}>
            {expanded ? 'Show Less' : 'Show Details'}
          </Text>
          {expanded ? <ChevronUp size={16} color={DS.colors.textGray} /> : <ChevronDown size={16} color={DS.colors.textGray} />}
        </TouchableOpacity>
      </View>

      {expanded && (
        <View style={{ borderTopWidth: 1, borderColor: DS.colors.borderLight, padding: DS.spacing.md, backgroundColor: DS.colors.surfaceLight }}>
          {deliverable.caption && (
            <View style={{ marginBottom: DS.spacing.md }}>
              <Text style={{ ...DS.typography.caption, color: DS.colors.textGray, marginBottom: 4 }}>Caption</Text>
              <Text style={{ ...DS.typography.body, color: DS.colors.textDark }}>{deliverable.caption}</Text>
            </View>
          )}
          
          {(deliverable.views_count || deliverable.likes_count) && (
            <View style={{ flexDirection: 'row', gap: DS.spacing.lg }}>
              <View>
                <Text style={{ ...DS.typography.caption, color: DS.colors.textGray }}>Views</Text>
                <Text style={{ ...DS.typography.body, fontWeight: '600' }}>{deliverable.views_count?.toLocaleString() || '-'}</Text>
              </View>
              <View>
                <Text style={{ ...DS.typography.caption, color: DS.colors.textGray }}>Likes</Text>
                <Text style={{ ...DS.typography.body, fontWeight: '600' }}>{deliverable.likes_count?.toLocaleString() || '-'}</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Actions */}
      {isPending && (
        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: DS.colors.borderLight }}>
          <TouchableOpacity 
            style={{ flex: 1, padding: DS.spacing.md, alignItems: 'center', borderRightWidth: 1, borderColor: DS.colors.borderLight }}
            onPress={() => {
              Alert.prompt('Reject', 'Reason for rejection:', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reject', onPress: (text?: string) => onStatusChange('rejected', text) }
              ]);
            }}
          >
            <Text style={{ ...DS.typography.button, color: DS.colors.error }}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={{ flex: 1, padding: DS.spacing.md, alignItems: 'center', backgroundColor: '#F0FDF4' }}
            onPress={() => onStatusChange('approved')}
          >
            <Text style={{ ...DS.typography.button, color: '#16A34A' }}>Approve</Text>
          </TouchableOpacity>
        </View>
      )}

      {isApproved && !deliverable.campaign_applications?.rating && (
        <View style={{ borderTopWidth: 1, borderColor: DS.colors.borderLight, padding: DS.spacing.md }}>
          <TouchableOpacity 
            style={{ backgroundColor: DS.colors.primaryOrange, padding: DS.spacing.sm, borderRadius: DS.borderRadius.md, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
            onPress={() => onRateCreator?.(deliverable.campaign_application_id)}
          >
            <Star size={16} color="white" fill="white" style={{ marginRight: 8 }} />
            <Text style={{ ...DS.typography.button, color: 'white' }}>Rate Creator</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};
