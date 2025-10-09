/**
 * Creator Onboarding Screen
 * V1 design following v1_component_reference.html
 */

import React, { useState } from 'react';
import { CreatorOnboardingV1 } from '@/components/creator/CreatorOnboardingV1';
import { BetaAccessGate } from '@/components/BetaAccessGate';
import { useRouter } from 'expo-router';

export default function CreatorOnboardingScreen() {
  const router = useRouter();
  const [showBetaGate, setShowBetaGate] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  const handleComplete = () => {
    // Navigate back to More tab after successful onboarding
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
        message="This feature is currently in beta. Please reach out to taylor@troodieapp.com to be onboarded."
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