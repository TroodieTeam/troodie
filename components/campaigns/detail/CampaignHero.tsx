import { DS } from '@/components/design-system/tokens';
import { CampaignDetail } from '@/types/campaign';
import { Clock, DollarSign, Target } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';

interface CampaignHeroProps {
  campaign: CampaignDetail;
}

export const CampaignHero: React.FC<CampaignHeroProps> = ({ campaign }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return DS.colors.success;
      case 'pending': return DS.colors.warning;
      case 'completed': return DS.colors.info;
      case 'cancelled': return DS.colors.error;
      default: return DS.colors.textGray;
    }
  };

  const getTimeLeftText = () => {
    if (!campaign) return '0d';
    if (campaign.status === 'completed') return 'Ended';
    if (campaign.status === 'draft') return 'Not started';
    if (!campaign.end_date) return 'No date';
    
    const now = new Date();
    const endDateStr = campaign.end_date;
    let end: Date;
    
    if (/^\d{4}-\d{2}-\d{2}$/.test(endDateStr)) {
      const [year, month, day] = endDateStr.split('-').map(Number);
      end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    } else {
      end = new Date(endDateStr);
      if (isNaN(end.getTime())) return 'Invalid';
      if (!endDateStr.includes('T') && !endDateStr.includes(' ')) {
        end.setHours(23, 59, 59, 999);
      }
    }
    
    const diffMs = end.getTime() - now.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (days < 0) return 'Ended';
    if (days === 0) {
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      if (hours > 0) return `${hours}h`;
      return 'Ending';
    }
    return `${days}d`;
  };

  return (
    <View style={{
      margin: DS.spacing.lg,
      padding: DS.spacing.lg,
      backgroundColor: DS.colors.surface,
      borderRadius: DS.borderRadius.xl,
      ...DS.shadows.sm,
      borderWidth: 1,
      borderColor: DS.colors.border,
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: DS.spacing.lg }}>
        <View>
          <Text style={{ ...DS.typography.metadata, color: DS.colors.textGray, marginBottom: 4 }}>Status</Text>
          <View style={{
            backgroundColor: `${getStatusColor(campaign.status)}15`,
            paddingHorizontal: DS.spacing.sm,
            paddingVertical: 4,
            borderRadius: DS.borderRadius.full,
            alignSelf: 'flex-start',
          }}>
            <Text style={{ ...DS.typography.caption, color: getStatusColor(campaign.status), fontWeight: '700', textTransform: 'uppercase' }}>
              {campaign.status}
            </Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ ...DS.typography.metadata, color: DS.colors.textGray, marginBottom: 4 }}>Duration</Text>
          <Text style={{ ...DS.typography.caption, fontWeight: '600', color: DS.colors.textDark }}>
            {campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : 'N/A'} - {campaign.end_date ? new Date(campaign.end_date).toLocaleDateString() : 'Ongoing'}
          </Text>
        </View>
      </View>

      <Text style={{ ...DS.typography.body, color: DS.colors.textGray, marginBottom: DS.spacing.lg, lineHeight: 20 }}>
        {campaign.description}
      </Text>

      {/* Metrics */}
      <View style={{ flexDirection: 'row', gap: DS.spacing.xl, borderTopWidth: 1, borderColor: DS.colors.borderLight, paddingTop: DS.spacing.lg }}>
        <View>
          <Text style={{ ...DS.typography.caption, color: DS.colors.textGray, marginBottom: 2 }}>Budget</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <DollarSign size={14} color={DS.colors.textDark} style={{ marginRight: 2 }} />
            <Text style={{ ...DS.typography.body, fontWeight: '600', color: DS.colors.textDark }}>
              {(campaign.spent_amount_cents / 100).toFixed(0)} <Text style={{ color: DS.colors.textLight }}>/ {(campaign.budget_cents / 100).toFixed(0)}</Text>
            </Text>
          </View>
        </View>
        <View>
          <Text style={{ ...DS.typography.caption, color: DS.colors.textGray, marginBottom: 2 }}>Time Left</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Clock size={14} color={DS.colors.textDark} style={{ marginRight: 4 }} />
            <Text style={{ ...DS.typography.body, fontWeight: '600', color: DS.colors.textDark }}>
              {getTimeLeftText()}
            </Text>
          </View>
        </View>
        <View>
          <Text style={{ ...DS.typography.caption, color: DS.colors.textGray, marginBottom: 2 }}>Deliverables</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Target size={14} color={DS.colors.textDark} style={{ marginRight: 4 }} />
            <Text style={{ ...DS.typography.body, fontWeight: '600', color: DS.colors.textDark }}>
              {campaign.delivered_content_count} / {campaign.total_deliverables}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};
