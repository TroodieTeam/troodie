/**
 * Subscription Trial Modal
 *
 * TRO-137: Shown after restaurant posts their first campaign.
 * Displays trial information and prompts to subscribe.
 */

import { DS } from '@/components/design-system/tokens';
import { createSubscription, dismissSubscriptionReminder } from '@/services/subscriptionService';
import { Calendar, CreditCard, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface SubscriptionTrialModalProps {
  visible: boolean;
  onClose: () => void;
  restaurantClaimId: string;
  trialEndDate?: string;
  onSubscribeSuccess?: () => void;
}

export function SubscriptionTrialModal({
  visible,
  onClose,
  restaurantClaimId,
  trialEndDate,
  onSubscribeSuccess,
}: SubscriptionTrialModalProps) {
  const [loading, setLoading] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'in 14 days';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const result = await createSubscription(restaurantClaimId);
      if (result.success) {
        onSubscribeSuccess?.();
        onClose();
      } else {
        // Show error - in a real app would use toast or alert
        console.error('[SubscriptionTrialModal] Subscribe failed:', result.error);
      }
    } catch (error) {
      console.error('[SubscriptionTrialModal] Exception:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemindLater = async () => {
    setDismissing(true);
    try {
      await dismissSubscriptionReminder(restaurantClaimId);
      onClose();
    } catch (error) {
      console.error('[SubscriptionTrialModal] Error dismissing:', error);
    } finally {
      setDismissing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}
      >
        <View
          style={{
            backgroundColor: 'white',
            borderRadius: 16,
            width: '100%',
            maxWidth: 400,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <View
            style={{
              backgroundColor: '#FFFBEB',
              padding: 24,
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: DS.colors.primary,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <CreditCard size={32} color="white" />
            </View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: '700',
                color: DS.colors.text,
                textAlign: 'center',
                marginBottom: 8,
              }}
            >
              Campaign Posted!
            </Text>
            <Text
              style={{
                fontSize: 15,
                color: DS.colors.textLight,
                textAlign: 'center',
                lineHeight: 22,
              }}
            >
              {"You're on a 14-day free trial."}{'\n'}
              {"After that, it's $49/month to keep posting."}
            </Text>
          </View>

          {/* Trial Info */}
          <View style={{ padding: 24 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: DS.colors.background,
                padding: 16,
                borderRadius: 12,
                marginBottom: 20,
              }}
            >
              <Calendar size={20} color={DS.colors.primary} />
              <Text
                style={{
                  fontSize: 14,
                  color: DS.colors.text,
                  marginLeft: 12,
                  flex: 1,
                }}
              >
                Trial ends {formatDate(trialEndDate)}
              </Text>
            </View>

            {/* Subscribe Button */}
            <TouchableOpacity
              onPress={handleSubscribe}
              disabled={loading}
              style={{
                backgroundColor: DS.colors.primary,
                paddingVertical: 16,
                borderRadius: 12,
                alignItems: 'center',
                marginBottom: 12,
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: 'white',
                  }}
                >
                  Subscribe Now
                </Text>
              )}
            </TouchableOpacity>

            {/* Remind Later Button */}
            <TouchableOpacity
              onPress={handleRemindLater}
              disabled={dismissing}
              style={{
                paddingVertical: 14,
                alignItems: 'center',
              }}
            >
              {dismissing ? (
                <ActivityIndicator size="small" color={DS.colors.textLight} />
              ) : (
                <Text
                  style={{
                    fontSize: 14,
                    color: DS.colors.textLight,
                  }}
                >
                  Remind me in 12 days
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Close Button */}
          <TouchableOpacity
            onPress={onClose}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              padding: 8,
            }}
          >
            <X size={24} color={DS.colors.textLight} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default SubscriptionTrialModal;
