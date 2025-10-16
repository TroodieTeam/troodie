import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
} from 'react-native';
import { designTokens } from '@/constants/designTokens';
import { ChevronDown, Building2, Calendar, DollarSign, FileCheck } from 'lucide-react-native';

interface PartnershipDetailsFormProps {
  value: {
    partnerRestaurantId: string | null;
    partnerRestaurantName: string;
    partnershipAgreementSigned: boolean;
    partnershipStartDate: Date | null;
    partnershipEndDate: Date | null;
    subsidyAmountCents: number;
  };
  onChange: (value: any) => void;
}

export default function PartnershipDetailsForm({
  value,
  onChange,
}: PartnershipDetailsFormProps) {
  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <View style={styles.infoBannerIcon}>
          <Building2 size={18} color={designTokens.colors.primaryOrange} />
        </View>
        <View style={styles.infoBannerContent}>
          <Text style={styles.infoBannerTitle}>Partnership Campaign</Text>
          <Text style={styles.infoBannerText}>
            This campaign will appear as a regular restaurant campaign. Creators won't see
            Troodie branding or subsidy information.
          </Text>
        </View>
      </View>

      {/* Partner Restaurant */}
      <View style={styles.section}>
        <Text style={styles.label}>Partner Restaurant</Text>
        <TouchableOpacity style={styles.restaurantSelector}>
          <View style={styles.selectorContent}>
            <View style={styles.iconContainer}>
              <Building2 size={20} color={designTokens.colors.textDark} />
            </View>
            <View style={styles.selectorText}>
              <Text style={styles.selectorTitle}>
                {value.partnerRestaurantName || 'Select restaurant'}
              </Text>
              {value.partnerRestaurantId && (
                <Text style={styles.selectorSubtitle}>ID: {value.partnerRestaurantId}</Text>
              )}
            </View>
          </View>
          <ChevronDown size={16} color={designTokens.colors.primaryOrange} />
        </TouchableOpacity>
        <Text style={styles.hint}>
          The restaurant this partnership campaign is associated with
        </Text>
      </View>

      {/* Partnership Agreement */}
      <View style={styles.section}>
        <View style={styles.agreementCard}>
          <View style={styles.agreementHeader}>
            <View style={styles.agreementIconContainer}>
              <FileCheck size={20} color={designTokens.colors.success} />
            </View>
            <Text style={styles.agreementTitle}>Partnership Agreement</Text>
          </View>
          <Text style={styles.agreementText}>
            Confirm that you have a signed partnership agreement with this restaurant before
            publishing the campaign.
          </Text>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Agreement signed</Text>
            <Switch
              value={value.partnershipAgreementSigned}
              onValueChange={(partnershipAgreementSigned) =>
                onChange({ ...value, partnershipAgreementSigned })
              }
              trackColor={{
                false: designTokens.colors.borderLight,
                true: designTokens.colors.primaryOrange,
              }}
              thumbColor={designTokens.colors.white}
            />
          </View>
        </View>
      </View>

      {/* Partnership Duration */}
      <View style={styles.section}>
        <Text style={styles.label}>Partnership Duration</Text>
        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <View style={styles.dateFieldHeader}>
              <Calendar size={14} color={designTokens.colors.textMedium} />
              <Text style={styles.dateLabel}>Start Date</Text>
            </View>
            <TouchableOpacity style={styles.dateButton}>
              <Text style={styles.dateButtonText}>
                {value.partnershipStartDate
                  ? value.partnershipStartDate.toLocaleDateString()
                  : 'Select'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dateField}>
            <View style={styles.dateFieldHeader}>
              <Calendar size={14} color={designTokens.colors.textMedium} />
              <Text style={styles.dateLabel}>End Date</Text>
            </View>
            <TouchableOpacity style={styles.dateButton}>
              <Text style={styles.dateButtonText}>
                {value.partnershipEndDate
                  ? value.partnershipEndDate.toLocaleDateString()
                  : 'Select'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.hint}>
          How long this partnership agreement is active
        </Text>
      </View>

      {/* Subsidy Amount */}
      <View style={styles.section}>
        <Text style={styles.label}>Troodie Subsidy Amount</Text>
        <View style={styles.inputWithIcon}>
          <View style={styles.inputIconContainer}>
            <DollarSign size={18} color={designTokens.colors.textMedium} />
          </View>
          <TextInput
            style={styles.subsidyInput}
            value={(value.subsidyAmountCents / 100).toString()}
            onChangeText={(text) => {
              const amount = parseFloat(text) || 0;
              onChange({ ...value, subsidyAmountCents: Math.round(amount * 100) });
            }}
            placeholder="0.00"
            placeholderTextColor={designTokens.colors.textLight}
            keyboardType="decimal-pad"
          />
        </View>
        <View style={styles.subsidyInfo}>
          <Text style={styles.subsidyInfoText}>
            This is the amount Troodie is subsidizing per creator. The restaurant may also
            contribute additional funds.
          </Text>
          <View style={styles.subsidyBreakdown}>
            <View style={styles.subsidyRow}>
              <Text style={styles.subsidyLabel}>Troodie subsidy (per creator):</Text>
              <Text style={styles.subsidyValue}>
                {formatCurrency(value.subsidyAmountCents)}
              </Text>
            </View>
            <View style={styles.subsidyRow}>
              <Text style={styles.subsidyLabel}>Internal tracking only:</Text>
              <Text style={[styles.subsidyValue, { fontSize: 11 }]}>
                {value.subsidyAmountCents} cents
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Privacy Notice */}
      <View style={styles.privacyNotice}>
        <Text style={styles.privacyTitle}>🔒 Privacy Notice</Text>
        <Text style={styles.privacyText}>
          Partnership details and subsidy amounts are only visible to admins. Creators will see
          this as a standard restaurant campaign.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  infoBanner: {
    backgroundColor: '#FFFAF2',
    borderRadius: designTokens.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 173, 39, 0.3)',
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  infoBannerIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: designTokens.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  infoBannerContent: {
    flex: 1,
  },
  infoBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors.textDark,
    marginBottom: 4,
  },
  infoBannerText: {
    fontSize: 12,
    color: designTokens.colors.textMedium,
    lineHeight: 18,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    color: designTokens.colors.textMedium,
    marginBottom: 8,
    fontWeight: '500',
  },
  restaurantSelector: {
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.md,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFFAF2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  selectorText: {
    flex: 1,
  },
  selectorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors.textDark,
  },
  selectorSubtitle: {
    fontSize: 11,
    color: designTokens.colors.textLight,
    marginTop: 2,
  },
  hint: {
    fontSize: 12,
    color: designTokens.colors.textLight,
    marginTop: 6,
  },
  agreementCard: {
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.md,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    padding: 16,
  },
  agreementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  agreementIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  agreementTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors.textDark,
  },
  agreementText: {
    fontSize: 13,
    color: designTokens.colors.textMedium,
    lineHeight: 19,
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: designTokens.colors.textDark,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateField: {
    flex: 1,
  },
  dateFieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  dateLabel: {
    fontSize: 11,
    color: designTokens.colors.textMedium,
    fontWeight: '500',
  },
  dateButton: {
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.md,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    height: 44,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  dateButtonText: {
    fontSize: 13,
    color: designTokens.colors.textMedium,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.md,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    height: 48,
  },
  inputIconContainer: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subsidyInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.colors.textDark,
    paddingRight: 12,
  },
  subsidyInfo: {
    marginTop: 12,
  },
  subsidyInfoText: {
    fontSize: 12,
    color: designTokens.colors.textMedium,
    lineHeight: 18,
    marginBottom: 12,
  },
  subsidyBreakdown: {
    backgroundColor: designTokens.colors.backgroundLight,
    borderRadius: 8,
    padding: 12,
  },
  subsidyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  subsidyLabel: {
    fontSize: 12,
    color: designTokens.colors.textMedium,
  },
  subsidyValue: {
    fontSize: 13,
    fontWeight: '600',
    color: designTokens.colors.textDark,
  },
  privacyNotice: {
    backgroundColor: '#F0F9FF',
    borderRadius: designTokens.borderRadius.md,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 16,
    marginTop: 8,
  },
  privacyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: designTokens.colors.textDark,
    marginBottom: 6,
  },
  privacyText: {
    fontSize: 12,
    color: designTokens.colors.textMedium,
    lineHeight: 18,
  },
});
