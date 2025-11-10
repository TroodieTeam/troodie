import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { designTokens } from '@/constants/designTokens';
import { ChevronDown, DollarSign, Users, FileText, TrendingUp } from 'lucide-react-native';

interface BudgetTrackingFormProps {
  value: {
    budgetSource: string;
    approvedBudgetCents: number;
    costCenter: string;
    targetCreators: number;
    targetContentPieces: number;
    targetReach: number;
  };
  onChange: (value: any) => void;
}

const BUDGET_SOURCES = [
  { value: 'marketing', label: 'Marketing Budget' },
  { value: 'growth', label: 'Growth Budget' },
  { value: 'partnerships', label: 'Partnerships Budget' },
  { value: 'product', label: 'Product Budget' },
  { value: 'content', label: 'Content Budget' },
  { value: 'retention', label: 'Retention Budget' },
];

export default function BudgetTrackingForm({ value, onChange }: BudgetTrackingFormProps) {
  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Budget Source */}
      <View style={styles.section}>
        <Text style={styles.label}>Budget Source</Text>
        <TouchableOpacity style={styles.dropdown}>
          <View style={styles.dropdownContent}>
            <View style={styles.iconContainer}>
              <DollarSign size={20} color={designTokens.colors.textDark} />
            </View>
            <Text style={styles.dropdownText}>
              {BUDGET_SOURCES.find((s) => s.value === value.budgetSource)?.label ||
                'Select budget source'}
            </Text>
          </View>
          <ChevronDown size={16} color={designTokens.colors.primaryOrange} />
        </TouchableOpacity>
        <Text style={styles.hint}>
          Which department budget will fund this campaign
        </Text>
      </View>

      {/* Approved Budget */}
      <View style={styles.section}>
        <Text style={styles.label}>Approved Budget</Text>
        <View style={styles.inputWithIcon}>
          <Text style={styles.currencySymbol}>$</Text>
          <TextInput
            style={styles.currencyInput}
            value={(value.approvedBudgetCents / 100).toString()}
            onChangeText={(text) => {
              const amount = parseFloat(text) || 0;
              onChange({ ...value, approvedBudgetCents: Math.round(amount * 100) });
            }}
            placeholder="0.00"
            placeholderTextColor={designTokens.colors.textLight}
            keyboardType="decimal-pad"
          />
        </View>
        <View style={styles.budgetInfo}>
          <Text style={styles.budgetInfoLabel}>Total budget in cents:</Text>
          <Text style={styles.budgetInfoValue}>{value.approvedBudgetCents}</Text>
        </View>
      </View>

      {/* Cost Center */}
      <View style={styles.section}>
        <Text style={styles.label}>Cost Center (Optional)</Text>
        <TextInput
          style={styles.input}
          value={value.costCenter}
          onChangeText={(costCenter) => onChange({ ...value, costCenter })}
          placeholder="e.g., CC-2025-Q1-001"
          placeholderTextColor={designTokens.colors.textLight}
        />
        <Text style={styles.hint}>
          Internal cost center code for accounting
        </Text>
      </View>

      {/* Target Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Target Metrics</Text>
        <Text style={styles.sectionSubtitle}>
          Set goals for this campaign (optional but recommended)
        </Text>

        <View style={styles.metricsGrid}>
          {/* Target Creators */}
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <View style={[styles.metricIcon, { backgroundColor: '#DBEAFE' }]}>
                <Users size={18} color="#1E40AF" />
              </View>
              <Text style={styles.metricLabel}>Creators</Text>
            </View>
            <TextInput
              style={styles.metricInput}
              value={value.targetCreators.toString()}
              onChangeText={(text) => {
                const num = parseInt(text) || 0;
                onChange({ ...value, targetCreators: num });
              }}
              placeholder="10"
              placeholderTextColor={designTokens.colors.textLight}
              keyboardType="number-pad"
            />
          </View>

          {/* Target Content Pieces */}
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <View style={[styles.metricIcon, { backgroundColor: '#FCE7F3' }]}>
                <FileText size={18} color="#BE185D" />
              </View>
              <Text style={styles.metricLabel}>Content</Text>
            </View>
            <TextInput
              style={styles.metricInput}
              value={value.targetContentPieces.toString()}
              onChangeText={(text) => {
                const num = parseInt(text) || 0;
                onChange({ ...value, targetContentPieces: num });
              }}
              placeholder="20"
              placeholderTextColor={designTokens.colors.textLight}
              keyboardType="number-pad"
            />
          </View>

          {/* Target Reach */}
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <View style={[styles.metricIcon, { backgroundColor: '#D1FAE5' }]}>
                <TrendingUp size={18} color="#047857" />
              </View>
              <Text style={styles.metricLabel}>Reach</Text>
            </View>
            <TextInput
              style={styles.metricInput}
              value={value.targetReach.toString()}
              onChangeText={(text) => {
                const num = parseInt(text) || 0;
                onChange({ ...value, targetReach: num });
              }}
              placeholder="100000"
              placeholderTextColor={designTokens.colors.textLight}
              keyboardType="number-pad"
            />
          </View>
        </View>
      </View>

      {/* Budget Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Budget Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Approved Budget:</Text>
          <Text style={styles.summaryValue}>
            {formatCurrency(value.approvedBudgetCents)}
          </Text>
        </View>
        {value.targetCreators > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Cost per Creator:</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(value.approvedBudgetCents / value.targetCreators)}
            </Text>
          </View>
        )}
        {value.targetContentPieces > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Cost per Content Piece:</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(value.approvedBudgetCents / value.targetContentPieces)}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.colors.textDark,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: designTokens.colors.textMedium,
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    color: designTokens.colors.textMedium,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.md,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    height: 48,
    paddingHorizontal: 12,
    fontSize: 14,
    color: designTokens.colors.textDark,
  },
  dropdown: {
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.md,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    height: 48,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFAF2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  dropdownText: {
    fontSize: 14,
    color: designTokens.colors.textDark,
  },
  hint: {
    fontSize: 12,
    color: designTokens.colors.textLight,
    marginTop: 6,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.md,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    height: 48,
    paddingLeft: 12,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.colors.textDark,
    marginRight: 4,
  },
  currencyInput: {
    flex: 1,
    fontSize: 14,
    color: designTokens.colors.textDark,
    paddingRight: 12,
  },
  budgetInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  budgetInfoLabel: {
    fontSize: 11,
    color: designTokens.colors.textLight,
  },
  budgetInfoValue: {
    fontSize: 11,
    fontWeight: '600',
    color: designTokens.colors.textMedium,
  },
  metricsGrid: {
    gap: 12,
  },
  metricCard: {
    backgroundColor: designTokens.colors.white,
    borderRadius: designTokens.borderRadius.md,
    borderWidth: 1,
    borderColor: designTokens.colors.borderLight,
    padding: 16,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors.textDark,
  },
  metricInput: {
    backgroundColor: designTokens.colors.backgroundLight,
    borderRadius: 8,
    height: 40,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.colors.textDark,
  },
  summaryCard: {
    backgroundColor: '#FFFAF2',
    borderRadius: designTokens.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 173, 39, 0.3)',
    padding: 16,
    marginTop: 8,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors.textDark,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: designTokens.colors.textMedium,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors.textDark,
  },
});
