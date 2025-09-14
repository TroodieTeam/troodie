/**
 * Creator Onboarding Screen
 * V1 design following v1_component_reference.html
 */

import React from 'react';
import { CreatorOnboardingV1 } from '@/components/creator/CreatorOnboardingV1';
import { useRouter } from 'expo-router';

export default function CreatorOnboardingScreen() {
  const router = useRouter();

  const handleComplete = () => {
    // Navigate back to More tab after successful onboarding
    router.replace('/(tabs)/more');
  };

  const handleCancel = () => {
    // Navigate back to More tab if cancelled
    router.back();
  };

  return (
    <CreatorOnboardingV1
      onComplete={handleComplete}
      onCancel={handleCancel}
    />
  );
}