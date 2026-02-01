/**
 * Payment Required Modal
 *
 * TRO-137: Shown when restaurant tries to post a campaign but subscription
 * has lapsed (past_due, canceled, or trial ended without subscription).
 */

import { DS } from '@/components/design-system/tokens';
import { getCustomerPortalUrl } from '@/services/subscriptionService';
import { AlertCircle, CreditCard, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface PaymentRequiredModalProps {
  visible: boolean;
  onClose: () => void;
  restaurantClaimId: string;
  status: 'past_due' | 'canceled' | 'unpaid' | 'none';
}

export function PaymentRequiredModal({
  visible,
  onClose,
  restaurantClaimId,
  status,
}: PaymentRequiredModalProps) {
  const [loading, setLoading] = useState(false);

  const getStatusMessage = () => {
    switch (status) {
      case 'past_due':
        return {
          title: 'Payment Failed',
          message: 'Your subscription payment failed. Please update your payment method to continue posting campaigns.',
          buttonText: 'Update Payment Method',
        };
      case 'canceled':
        return {
          title: 'Subscription Canceled',
          message: 'Your subscription has been canceled. Resubscribe to continue posting campaigns.',
          buttonText: 'Resubscribe',
        };
      case 'unpaid':
        return {
          title: 'Payment Required',
          message: 'Your account has unpaid invoices. Please resolve them to continue posting campaigns.',
          buttonText: 'Resolve Payment',
        };
      default:
        return {
          title: 'Subscription Required',
          message: 'A subscription is required to post campaigns. Subscribe to get started.',
          buttonText: 'Subscribe Now',
        };
    }
  };

  const { title, message, buttonText } = getStatusMessage();

  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      const { url, error } = await getCustomerPortalUrl(restaurantClaimId);
      if (url) {
        await Linking.openURL(url);
        onClose();
      } else {
        console.error('[PaymentRequiredModal] Error getting portal URL:', error);
      }
    } catch (error) {
      console.error('[PaymentRequiredModal] Exception:', error);
    } finally {
      setLoading(false);
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
              backgroundColor: '#FEE2E2',
              padding: 24,
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: '#DC2626',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <AlertCircle size={32} color="white" />
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
              {title}
            </Text>
            <Text
              style={{
                fontSize: 15,
                color: DS.colors.textLight,
                textAlign: 'center',
                lineHeight: 22,
              }}
            >
              {message}
            </Text>
          </View>

          {/* Actions */}
          <View style={{ padding: 24 }}>
            {/* Price Reminder */}
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
              <CreditCard size={20} color={DS.colors.primary} />
              <Text
                style={{
                  fontSize: 14,
                  color: DS.colors.text,
                  marginLeft: 12,
                  flex: 1,
                }}
              >
                $49/month for unlimited campaign posting
              </Text>
            </View>

            {/* Primary Action Button */}
            <TouchableOpacity
              onPress={handleManageSubscription}
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
                  {buttonText}
                </Text>
              )}
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              onPress={onClose}
              style={{
                paddingVertical: 14,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  color: DS.colors.textLight,
                }}
              >
                Maybe Later
              </Text>
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

export default PaymentRequiredModal;
