/**
 * Creator Onboarding Screen
 * V1 design following v1_component_reference.html
 */

import { CreatorOnboardingV1 } from '@/components/creator/CreatorOnboardingV1';
import { useRouter } from 'expo-router';
import React from 'react';

export default function CreatorOnboardingScreen() {
  const router = useRouter();

  const handleComplete = () => {
    // Navigate back to More tab after successful onboarding
    // Use replace to replace the onboarding screen in the stack
    router.replace('/(tabs)/more');
  };

  const handleCancel = () => {
    // Navigate back to More tab if cancelled
    router.push('/(tabs)/more');
  };

  return (
    <CreatorOnboardingV1
      onComplete={handleComplete}
      onCancel={handleCancel}
    />
  );
}