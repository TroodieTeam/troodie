import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';

interface RejectionActionsProps {
  submissionId: string;
  type: 'restaurant_claim' | 'creator_application';
  canResubmit?: boolean;
  onRefresh?: () => void;
}

export default function RejectionActions({
  submissionId,
  type,
  canResubmit = true,
  onRefresh
}: RejectionActionsProps) {
  const handleResubmit = () => {
    Alert.alert(
      'Resubmit Application',
      'Are you ready to resubmit your application? Make sure you have addressed the rejection reasons.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Resubmission',
          onPress: () => {
            if (type === 'restaurant_claim') {
              router.push('/business/claim');
            } else {
              router.push('/creator/onboarding');
            }
          }
        }
      ]
    );
  };

  const handleContactSupport = () => {
    router.push('/support');
  };

  if (!canResubmit) {
    return (
      <View style={styles.container}>
        <Text style={styles.infoText}>
          Unfortunately, resubmission is not allowed for this application.
        </Text>
        <TouchableOpacity
          style={styles.supportButton}
          onPress={handleContactSupport}
        >
          <Text style={styles.supportButtonText}>Contact Support</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Ready to try again?</Text>
        <Text style={styles.infoText}>
          Please review the rejection reason above and make necessary changes before resubmitting.
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.resubmitButton}
          onPress={handleResubmit}
        >
          <Text style={styles.resubmitButtonText}>Resubmit Application</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.supportButton}
          onPress={handleContactSupport}
        >
          <Text style={styles.supportButtonText}>Contact Support</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  infoCard: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  actions: {
    gap: 12,
  },
  resubmitButton: {
    backgroundColor: '#FFAD27',
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
  },
  resubmitButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  supportButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  supportButtonText: {
    color: '#666',
    fontSize: 14,
  },
});