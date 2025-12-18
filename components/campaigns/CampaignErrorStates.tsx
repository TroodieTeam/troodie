import { DS } from '@/components/design-system/tokens';
import { LoadingState } from '@/types/campaign';
import { Target, X } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface CampaignErrorStatesProps {
  loadingState: LoadingState;
  errorMessage: string | null;
  onRetry: () => void;
  onGoBack: () => void;
  onCompleteSetup: () => void;
  onClaimRestaurant: () => void;
}

export function CampaignErrorStates({
  loadingState,
  errorMessage,
  onRetry,
  onGoBack,
  onCompleteSetup,
  onClaimRestaurant,
}: CampaignErrorStatesProps) {
  if (loadingState === 'no_profile') {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: DS.colors.background,
          justifyContent: 'center',
          alignItems: 'center',
          padding: DS.spacing.lg,
        }}
      >
        <Target size={48} color={DS.colors.warning || '#F59E0B'} />
        <Text
          style={{
            fontSize: 20,
            fontWeight: '600',
            color: DS.colors.textDark,
            marginTop: DS.spacing.md,
            marginBottom: DS.spacing.sm,
          }}
        >
          Business Setup Required
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: DS.colors.textLight,
            textAlign: 'center',
            marginBottom: DS.spacing.lg,
          }}
        >
          {errorMessage}
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: DS.colors.primaryOrange,
            paddingHorizontal: DS.spacing.lg,
            paddingVertical: DS.spacing.sm,
            borderRadius: DS.borderRadius.md,
            marginBottom: DS.spacing.sm,
          }}
          onPress={onCompleteSetup}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>Complete Setup</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onGoBack}>
          <Text style={{ color: DS.colors.textLight, marginTop: DS.spacing.sm }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (loadingState === 'no_restaurant') {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: DS.colors.background,
          justifyContent: 'center',
          alignItems: 'center',
          padding: DS.spacing.lg,
        }}
      >
        <Target size={48} color={DS.colors.warning || '#F59E0B'} />
        <Text
          style={{
            fontSize: 20,
            fontWeight: '600',
            color: DS.colors.textDark,
            marginTop: DS.spacing.md,
            marginBottom: DS.spacing.sm,
          }}
        >
          No Restaurant Linked
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: DS.colors.textLight,
            textAlign: 'center',
            marginBottom: DS.spacing.lg,
          }}
        >
          {errorMessage}
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: DS.colors.primaryOrange,
            paddingHorizontal: DS.spacing.lg,
            paddingVertical: DS.spacing.sm,
            borderRadius: DS.borderRadius.md,
            marginBottom: DS.spacing.sm,
          }}
          onPress={onClaimRestaurant}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>Claim Restaurant</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onGoBack}>
          <Text style={{ color: DS.colors.textLight, marginTop: DS.spacing.sm }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (loadingState === 'error') {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: DS.colors.background,
          justifyContent: 'center',
          alignItems: 'center',
          padding: DS.spacing.lg,
        }}
      >
        <X size={48} color={DS.colors.error || '#EF4444'} />
        <Text
          style={{
            fontSize: 20,
            fontWeight: '600',
            color: DS.colors.textDark,
            marginTop: DS.spacing.md,
            marginBottom: DS.spacing.sm,
          }}
        >
          Something Went Wrong
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: DS.colors.textLight,
            textAlign: 'center',
            marginBottom: DS.spacing.lg,
          }}
        >
          {errorMessage}
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: DS.colors.primaryOrange,
            paddingHorizontal: DS.spacing.lg,
            paddingVertical: DS.spacing.sm,
            borderRadius: DS.borderRadius.md,
            marginBottom: DS.spacing.sm,
          }}
          onPress={onRetry}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onGoBack}>
          <Text style={{ color: DS.colors.textLight, marginTop: DS.spacing.sm }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return null;
}
