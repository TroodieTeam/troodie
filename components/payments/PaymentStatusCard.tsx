import { DS } from '@/components/design-system/tokens';
import { AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';

interface PaymentStatusCardProps {
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded' | 'paid' | 'unpaid';
  amountCents?: number;
  paidAt?: string;
}

export default function PaymentStatusCard({
  status,
  amountCents,
  paidAt,
}: PaymentStatusCardProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'succeeded':
      case 'paid':
        return {
          icon: CheckCircle,
          color: DS.colors.success,
          bgColor: '#F0FDF4',
          text: 'Paid',
          description: paidAt ? `Paid on ${new Date(paidAt).toLocaleDateString()}` : 'Payment successful',
        };
      case 'pending':
      case 'processing':
        return {
          icon: Clock,
          color: '#F59E0B',
          bgColor: '#FFFBEB',
          text: 'Processing',
          description: 'Payment is being processed',
        };
      case 'failed':
        return {
          icon: XCircle,
          color: DS.colors.error,
          bgColor: '#FEE2E2',
          text: 'Failed',
          description: 'Payment failed. Please try again',
        };
      case 'refunded':
        return {
          icon: AlertCircle,
          color: '#6B7280',
          bgColor: '#F3F4F6',
          text: 'Refunded',
          description: 'Payment has been refunded',
        };
      default:
        return {
          icon: AlertCircle,
          color: DS.colors.textLight,
          bgColor: DS.colors.background,
          text: 'Unpaid',
          description: 'Payment required to activate campaign',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;
  const amountDollars = amountCents ? (amountCents / 100).toFixed(2) : null;

  return (
    <View
      style={{
        backgroundColor: config.bgColor,
        borderRadius: DS.borderRadius.md,
        padding: DS.spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <Icon size={24} color={config.color} style={{ marginRight: DS.spacing.sm }} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: config.color, fontWeight: '600', fontSize: 14 }}>
          {config.text}
        </Text>
        <Text style={{ color: DS.colors.textLight, fontSize: 12, marginTop: 2 }}>
          {config.description}
        </Text>
      </View>
      {amountDollars && (
        <Text style={{ color: config.color, fontWeight: '700', fontSize: 16 }}>
          ${amountDollars}
        </Text>
      )}
    </View>
  );
}
