import { DS } from '@/components/design-system/tokens';
import { CheckCircle } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';

interface CampaignStepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export function CampaignStepIndicator({ currentStep, totalSteps }: CampaignStepIndicatorProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: DS.spacing.lg,
      }}
    >
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
        <View key={step} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: step <= currentStep ? DS.colors.primaryOrange : '#808080',
              borderWidth: step <= currentStep ? 0 : 2,
              borderColor: step <= currentStep ? 'transparent' : '#666666',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {step < currentStep ? (
              <CheckCircle size={20} color="white" />
            ) : (
              <Text
                style={{
                  color: step <= currentStep ? 'white' : '#FFFFFF',
                  fontWeight: '700',
                  fontSize: 14,
                }}
              >
                {step}
              </Text>
            )}
          </View>
          {step < totalSteps && (
            <View
              style={{
                width: 40,
                height: 3,
                backgroundColor: step < currentStep ? DS.colors.primaryOrange : '#808080',
                marginHorizontal: DS.spacing.xs,
                borderRadius: 1,
              }}
            />
          )}
        </View>
      ))}
    </View>
  );
}
