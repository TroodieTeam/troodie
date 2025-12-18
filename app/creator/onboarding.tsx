/**
 * Creator Onboarding Screen
 * V1 design following v1_component_reference.html
 */

import { BetaAccessGate } from '@/components/BetaAccessGate';
import { CreatorOnboardingV1 } from '@/components/creator/CreatorOnboardingV1';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';

export default function CreatorOnboardingScreen() {
  const router = useRouter();
  const [showBetaGate, setShowBetaGate] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  const handleComplete = () => {
    // Navigate back to More tab after successful onboarding
    // Use replace to replace the onboarding screen in the stack
    router.replace('/(tabs)/more');
  };

  const handleCancel = () => {
    // Navigate back to More tab if cancelled
    router.back();
  };

  const handleBetaAccessGranted = () => {
    setHasAccess(true);
    setShowBetaGate(false);
  };

  const handleBetaAccessClose = () => {
    // If user closes beta gate without access, go back
    router.back();
  };

  if (!hasAccess) {
    return (
      <BetaAccessGate
        visible={showBetaGate}
        onClose={handleBetaAccessClose}
        onSuccess={handleBetaAccessGranted}
        title="Become a Creator"
        description="Earn money by sharing your food discoveries and collaborating with restaurants"
        message="This feature is currently in beta. Please reach out to team@troodieapp.com to be onboarded."
      />
    );
  }

  return (
    <CreatorOnboardingV1
      onComplete={handleComplete}
      onCancel={handleCancel}
    />
  );
}