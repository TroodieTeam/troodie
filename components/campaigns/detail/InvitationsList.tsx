import { DS } from '@/components/design-system/tokens';
import { CampaignInvitation } from '@/services/campaignInvitationService';
import { useRouter } from 'expo-router';
import { Mail, X } from 'lucide-react-native';
import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';

interface InvitationsListProps {
  invitations: CampaignInvitation[];
  onWithdraw: (invitationId: string) => void;
}

export const InvitationsList: React.FC<InvitationsListProps> = ({ invitations, onWithdraw }) => {
  const router = useRouter();

  return (
    <View style={{ gap: DS.spacing.md }}>
      {invitations.length === 0 ? (
        <View style={{ alignItems: 'center', padding: DS.spacing.xxl }}>
          <Mail size={48} color={DS.colors.textLight} />
          <Text style={{ ...DS.typography.h3, marginTop: DS.spacing.md, color: DS.colors.textGray }}>No Invitations Sent</Text>
          <TouchableOpacity onPress={() => router.push('/business/creators/browse')} style={{ marginTop: DS.spacing.md }}>
            <Text style={{ ...DS.typography.button, color: DS.colors.primaryOrange }}>Browse Creators</Text>
          </TouchableOpacity>
        </View>
      ) : (
        invitations.map((invitation) => (
          <View key={invitation.id} style={{
            backgroundColor: DS.colors.surface,
            borderRadius: DS.borderRadius.lg,
            padding: DS.spacing.lg,
            borderWidth: 1,
            borderColor: DS.colors.border,
            ...DS.shadows.sm
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: DS.spacing.md }}>
              <Image 
                source={{ uri: invitation.creator?.avatar_url }} 
                style={{ width: 40, height: 40, borderRadius: DS.borderRadius.full, marginRight: DS.spacing.md, backgroundColor: DS.colors.surfaceLight }} 
              />
              <View style={{ flex: 1 }}>
                <Text style={{ ...DS.typography.h3 }}>{invitation.creator?.display_name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: invitation.status === 'pending' ? DS.colors.warning : DS.colors.textGray, marginRight: 6 }} />
                  <Text style={{ ...DS.typography.caption, color: DS.colors.textGray, textTransform: 'uppercase' }}>{invitation.status}</Text>
                </View>
              </View>
              {invitation.status === 'pending' && (
                <TouchableOpacity 
                  onPress={() => onWithdraw(invitation.id)}
                  style={{ padding: DS.spacing.xs }}
                >
                  <X size={20} color={DS.colors.textGray} />
                </TouchableOpacity>
              )}
            </View>
            <Text style={{ ...DS.typography.caption, color: DS.colors.textLight }}>
              Sent {new Date(invitation.invited_at).toLocaleDateString()}
            </Text>
          </View>
        ))
      )}
    </View>
  );
};
