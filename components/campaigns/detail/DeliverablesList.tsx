import { DS } from '@/components/design-system/tokens';
import { CampaignDeliverable } from '@/types/campaign';
import { FileText } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import { DeliverableCard } from './DeliverableCard';

interface DeliverablesListProps {
  deliverables: CampaignDeliverable[];
  onStatusChange: (deliverableId: string, status: string, feedback?: string) => void;
  onRateCreator: (applicationId: string) => void;
}

export const DeliverablesList: React.FC<DeliverablesListProps> = ({ deliverables, onStatusChange, onRateCreator }) => {
  return (
    <View style={{ gap: DS.spacing.md }}>
      {deliverables.length === 0 ? (
        <View style={{ alignItems: 'center', padding: DS.spacing.xxl }}>
          <FileText size={48} color={DS.colors.textLight} />
          <Text style={{ ...DS.typography.h3, marginTop: DS.spacing.md, color: DS.colors.textGray }}>No Deliverables Yet</Text>
        </View>
      ) : (
        deliverables.map((deliverable) => (
          <DeliverableCard 
            key={deliverable.id} 
            deliverable={deliverable} 
            onStatusChange={(status, feedback) => onStatusChange(deliverable.id, status, feedback)}
            onRateCreator={onRateCreator}
          />
        ))
      )}
    </View>
  );
};
