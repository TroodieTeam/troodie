import { DS } from '@/components/design-system/tokens';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

export type TabType = 'overview' | 'applications' | 'content' | 'deliverables' | 'invitations';

interface TabNavigationProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  counts: {
    applications: number;
    invitations: number;
    deliverables: number;
  };
}

export const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, setActiveTab, counts }) => {
  return (
    <View style={{ marginBottom: DS.spacing.lg }}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: DS.spacing.lg, gap: DS.spacing.sm }}
      >
        {['overview', 'applications', 'invitations', 'deliverables'].map((tab) => {
          const isActive = activeTab === tab;
          const pendingCount = 
            tab === 'applications' ? counts.applications :
            tab === 'invitations' ? counts.invitations :
            tab === 'deliverables' ? counts.deliverables : 0;
          
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab as TabType)}
              style={{
                paddingHorizontal: DS.spacing.lg,
                paddingVertical: DS.spacing.sm,
                borderRadius: DS.borderRadius.full,
                backgroundColor: isActive ? DS.colors.textDark : DS.colors.surface,
                borderWidth: 1,
                borderColor: isActive ? DS.colors.textDark : DS.colors.border,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Text style={{
                ...DS.typography.button,
                color: isActive ? DS.colors.textWhite : DS.colors.textDark,
                fontSize: 13,
                textTransform: 'capitalize',
              }}>
                {tab}
              </Text>
              {pendingCount > 0 && (
                <View style={{
                  backgroundColor: isActive ? DS.colors.textWhite : DS.colors.error,
                  borderRadius: DS.borderRadius.full,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  marginLeft: 6,
                }}>
                  <Text style={{
                    fontSize: 10,
                    fontWeight: '700',
                    color: isActive ? DS.colors.textDark : 'white',
                  }}>
                    {pendingCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};
