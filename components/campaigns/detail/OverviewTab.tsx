import { DS } from '@/components/design-system/tokens';
import { CampaignApplication, CampaignDeliverable, CampaignDetail } from '@/types/campaign';
import { Users } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from 'react-native';

interface OverviewTabProps {
  campaign: CampaignDetail;
  applications: CampaignApplication[];
  deliverables: CampaignDeliverable[];
  processingPayment: boolean;
  onStatusChange: (status: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ 
  campaign, 
  applications, 
  deliverables, 
  processingPayment, 
  onStatusChange 
}) => {
  return (
    <View>
      {/* Quick Actions for Active/Pending */}
      {campaign.status === 'active' && (
        <View style={{ flexDirection: 'row', gap: DS.spacing.md, marginBottom: DS.spacing.lg }}>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: '#FEF3C7',
              paddingVertical: DS.spacing.md,
              borderRadius: DS.borderRadius.lg,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#FCD34D',
            }}
            onPress={() => onStatusChange('pending')}
          >
            <Text style={{ ...DS.typography.button, color: '#D97706' }}>Pause</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: '#FEE2E2',
              paddingVertical: DS.spacing.md,
              borderRadius: DS.borderRadius.lg,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#FECACA',
            }}
            onPress={() => {
              Alert.alert(
                'End Campaign',
                'Are you sure you want to end this campaign?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'End', style: 'destructive', onPress: () => onStatusChange('completed') }
                ]
              );
            }}
          >
            <Text style={{ ...DS.typography.button, color: '#DC2626' }}>End</Text>
          </TouchableOpacity>
        </View>
      )}

      {campaign.status === 'pending' && (
        <View style={{ marginBottom: DS.spacing.lg }}>
          <TouchableOpacity
            style={{
              backgroundColor: processingPayment ? DS.colors.surfaceLight : DS.colors.primaryOrange,
              paddingVertical: DS.spacing.md,
              borderRadius: DS.borderRadius.lg,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              shadowColor: DS.colors.primaryOrange,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
            onPress={() => onStatusChange('active')}
            disabled={processingPayment}
          >
            {processingPayment ? (
              <>
                <ActivityIndicator size="small" color={DS.colors.textGray} style={{ marginRight: DS.spacing.sm }} />
                <Text style={{ ...DS.typography.button, color: DS.colors.textGray }}>Processing...</Text>
              </>
            ) : (
              <Text style={{ ...DS.typography.button, color: 'white' }}>Resume Campaign</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Stats Overview */}
      <View style={{ flexDirection: 'row', gap: DS.spacing.md, marginBottom: DS.spacing.lg }}>
        <View style={{ flex: 1, backgroundColor: DS.colors.surface, padding: DS.spacing.lg, borderRadius: DS.borderRadius.lg, borderWidth: 1, borderColor: DS.colors.border }}>
          <Text style={{ ...DS.typography.h2, color: DS.colors.textDark, marginBottom: 4 }}>
            {applications.length}
          </Text>
          <Text style={{ ...DS.typography.caption, color: DS.colors.textGray }}>Applications</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: DS.colors.surface, padding: DS.spacing.lg, borderRadius: DS.borderRadius.lg, borderWidth: 1, borderColor: DS.colors.border }}>
          <Text style={{ ...DS.typography.h2, color: DS.colors.textDark, marginBottom: 4 }}>
            {deliverables.filter(d => d.status === 'approved').length}
          </Text>
          <Text style={{ ...DS.typography.caption, color: DS.colors.textGray }}>Approved</Text>
        </View>
      </View>
      
      <Text style={{ ...DS.typography.h3, color: DS.colors.textDark, marginBottom: DS.spacing.md }}>Recent Activity</Text>
      {deliverables.length === 0 && applications.length === 0 ? (
        <View style={{ padding: DS.spacing.xl, alignItems: 'center', backgroundColor: DS.colors.surface, borderRadius: DS.borderRadius.lg }}>
          <ActivityIndicator size="small" color={DS.colors.textGray} style={{ marginBottom: DS.spacing.sm }} />
          <Text style={{ ...DS.typography.body, color: DS.colors.textGray }}>No activity yet</Text>
        </View>
      ) : (
        <View style={{ gap: DS.spacing.sm }}>
          {/* Just showing a simplified list of recent items for overview */}
          {applications.slice(0, 3).map(app => (
            <View key={app.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: DS.colors.surface, padding: DS.spacing.md, borderRadius: DS.borderRadius.md, borderWidth: 1, borderColor: DS.colors.borderLight }}>
              <Users size={16} color={DS.colors.primaryOrange} style={{ marginRight: DS.spacing.md }} />
              <View style={{ flex: 1 }}>
                <Text style={{ ...DS.typography.body, fontWeight: '600' }}>New Application</Text>
                <Text style={{ ...DS.typography.caption, color: DS.colors.textGray }}>{app.creator_profiles.display_name}</Text>
              </View>
              <Text style={{ ...DS.typography.caption, color: DS.colors.textLight }}>
                {new Date(app.applied_at).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};
