# Troodie-Managed Campaigns: Budget Tracking & Analytics

- Epic: TMC (Troodie-Managed Campaigns)
- Priority: Medium
- Estimate: 2 days
- Status: 🟡 Needs Review
- Assignee: -
- Dependencies: TMC-001 (Database Schema), TMC-002 (System Account), TMC-003 (Admin UI)

## Overview
Build a React Native admin dashboard for tracking budget usage, spend analytics, ROI metrics, and performance monitoring for all Troodie-managed campaigns. Enable platform administrators to make data-driven decisions about campaign investments, budget allocation, and partnership ROI.

## Business Value
- Enables transparent budget tracking across all platform campaigns
- Provides ROI visibility for marketing/growth spend decisions
- Identifies highest-performing campaign types and budget sources
- Supports financial planning and forecasting
- Helps optimize creator payment rates and campaign structures
- Critical for demonstrating platform value to leadership/investors

## Acceptance Criteria (Gherkin)
```gherkin
Feature: Budget Tracking & Analytics Dashboard
  As a platform administrator
  I want to track budgets and analyze campaign performance
  So that I can optimize spend and demonstrate ROI

  Scenario: View budget overview dashboard
    Given I am logged in as an admin
    When I navigate to the budget tracking dashboard
    Then I see total approved budget across all campaigns
    And I see total actual spend to date
    And I see remaining budget available
    And I see budget utilization percentage
    And I see spend breakdown by budget source (marketing, growth, etc.)

  Scenario: View campaign performance metrics
    Given I am on the analytics dashboard
    When I view campaign metrics
    Then I see total creators reached
    And I see total content pieces created
    And I see cost per creator
    And I see cost per content piece
    And I see engagement metrics (views, likes, shares)

  Scenario: Filter analytics by date range
    Given I am viewing analytics
    When I select a custom date range
    Then all metrics update to show only campaigns in that range
    And I see historical trend comparisons
    And I can export data for the selected period

  Scenario: Compare budget sources
    Given I am on the budget comparison view
    When I view budget source breakdown
    Then I see spend by source (marketing, growth, partnerships, etc.)
    And I see ROI metrics for each source
    And I see which sources drive most creator applications
    And I can identify highest-performing budget allocations

  Scenario: Track individual campaign performance
    Given multiple platform campaigns exist
    When I view the campaign list
    Then I see each campaign's budget vs actual spend
    And I see application acceptance rates
    And I see content completion rates
    And I can identify underperforming campaigns

  Scenario: Monitor real-time spend
    Given campaigns are actively accepting applications
    When creators apply and get accepted
    Then actual_spend_cents updates automatically
    And I see real-time budget utilization
    And I get alerts when campaigns approach budget limits
    And I can pause campaigns if needed

  Scenario: Export financial reports
    Given I need to report to leadership
    When I click "Export Report"
    Then I can download CSV with all campaign financials
    And Report includes budget, spend, ROI, and engagement metrics
    And Report is formatted for accounting/finance review
```

## Technical Implementation

### Analytics Dashboard Screen (React Native)
Create: `app/admin/campaign-analytics.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, DollarSign, TrendingUp, Users, FileText, Download } from 'lucide-react-native';
import { getCampaignAnalytics, exportCampaignReport } from '@/services/analyticsService';
import BudgetOverviewCard from '@/components/admin/BudgetOverviewCard';
import BudgetSourceBreakdown from '@/components/admin/BudgetSourceBreakdown';
import CampaignPerformanceList from '@/components/admin/CampaignPerformanceList';
import DateRangeSelector from '@/components/admin/DateRangeSelector';

/**
 * Admin dashboard for tracking Troodie-managed campaign budgets and analytics
 */
export default function CampaignAnalyticsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [dateRange, setDateRange] = useState({ start: null, end: null });

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    const { data, error } = await getCampaignAnalytics(dateRange.start, dateRange.end);
    if (data) setAnalytics(data);
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  const handleExport = async () => {
    const { data, error } = await exportCampaignReport(dateRange.start, dateRange.end);
    if (data) {
      // Handle export (share CSV file)
      // Implementation depends on expo-sharing or other sharing method
      console.log('Export data:', data);
    }
  };

  if (loading && !analytics) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Campaign Analytics</Text>
        <TouchableOpacity onPress={handleExport} style={styles.exportButton}>
          <Download size={20} color="#FF6B35" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Date Range Selector */}
        <DateRangeSelector
          startDate={dateRange.start}
          endDate={dateRange.end}
          onChange={(start, end) => setDateRange({ start, end })}
        />

        {/* Budget Overview */}
        <BudgetOverviewCard
          totalApproved={analytics?.totalApprovedBudget || 0}
          totalSpent={analytics?.totalActualSpend || 0}
          remaining={analytics?.remainingBudget || 0}
          utilizationPercent={analytics?.budgetUtilization || 0}
        />

        {/* Key Metrics Grid */}
        <View style={styles.metricsGrid}>
          <MetricCard
            icon={Users}
            label="Total Creators"
            value={analytics?.totalCreators || 0}
            subtitle={`Target: ${analytics?.targetCreators || 0}`}
            color="#10B981"
          />
          <MetricCard
            icon={FileText}
            label="Content Pieces"
            value={analytics?.totalContentPieces || 0}
            subtitle={`Target: ${analytics?.targetContentPieces || 0}`}
            color="#8B5CF6"
          />
          <MetricCard
            icon={DollarSign}
            label="Cost per Creator"
            value={`$${analytics?.costPerCreator?.toFixed(0) || 0}`}
            subtitle="Average"
            color="#FF6B35"
          />
          <MetricCard
            icon={TrendingUp}
            label="Acceptance Rate"
            value={`${analytics?.acceptanceRate?.toFixed(0) || 0}%`}
            subtitle="Applications"
            color="#3B82F6"
          />
        </View>

        {/* Budget Source Breakdown */}
        <BudgetSourceBreakdown sources={analytics?.budgetSources || []} />

        {/* Campaign Performance List */}
        <CampaignPerformanceList campaigns={analytics?.campaigns || []} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper component for metric cards
function MetricCard({
  icon: Icon,
  label,
  value,
  subtitle,
  color,
}: {
  icon: any;
  label: string;
  value: string | number;
  subtitle: string;
  color: string;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIconContainer, { backgroundColor: `${color}15` }]}>
        <Icon size={20} color={color} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricSubtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  exportButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  metricIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 2,
  },
  metricSubtitle: {
    fontSize: 11,
    color: '#9CA3AF',
  },
});
```

### Budget Overview Component
Create: `components/admin/BudgetOverviewCard.tsx`

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DollarSign, TrendingUp, AlertCircle } from 'lucide-react-native';

interface BudgetOverviewCardProps {
  totalApproved: number;
  totalSpent: number;
  remaining: number;
  utilizationPercent: number;
}

export default function BudgetOverviewCard({
  totalApproved,
  totalSpent,
  remaining,
  utilizationPercent,
}: BudgetOverviewCardProps) {
  const isHighUtilization = utilizationPercent >= 80;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Budget Overview</Text>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View
          style={[
            styles.progressBar,
            {
              width: `${Math.min(utilizationPercent, 100)}%`,
              backgroundColor: isHighUtilization ? '#EF4444' : '#10B981',
            },
          ]}
        />
      </View>

      <View style={styles.utilizationRow}>
        <Text style={styles.utilizationText}>
          {utilizationPercent.toFixed(1)}% Utilized
        </Text>
        {isHighUtilization && (
          <View style={styles.warningBadge}>
            <AlertCircle size={14} color="#DC2626" />
            <Text style={styles.warningText}>High Utilization</Text>
          </View>
        )}
      </View>

      {/* Budget Details */}
      <View style={styles.detailsGrid}>
        <View style={styles.detailItem}>
          <DollarSign size={20} color="#6B7280" />
          <Text style={styles.detailLabel}>Approved Budget</Text>
          <Text style={styles.detailValue}>${(totalApproved / 100).toLocaleString()}</Text>
        </View>

        <View style={styles.detailItem}>
          <TrendingUp size={20} color="#10B981" />
          <Text style={styles.detailLabel}>Actual Spend</Text>
          <Text style={[styles.detailValue, { color: '#10B981' }]}>
            ${(totalSpent / 100).toLocaleString()}
          </Text>
        </View>

        <View style={styles.detailItem}>
          <DollarSign size={20} color="#FF6B35" />
          <Text style={styles.detailLabel}>Remaining</Text>
          <Text style={[styles.detailValue, { color: '#FF6B35' }]}>
            ${(remaining / 100).toLocaleString()}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  utilizationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  utilizationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  warningText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626',
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 4,
    textAlign: 'center',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
});
```

### Analytics Service
Create: `services/analyticsService.ts`

```typescript
import { supabase } from '@/lib/supabase';

/**
 * Service for campaign analytics and budget tracking
 */

/**
 * Get comprehensive campaign analytics for platform-managed campaigns
 */
export async function getCampaignAnalytics(startDate?: Date | null, endDate?: Date | null) {
  try {
    // Build date filter
    let dateFilter = '';
    if (startDate) {
      dateFilter = `created_at.gte.${startDate.toISOString()}`;
    }
    if (endDate) {
      dateFilter += dateFilter ? `,created_at.lte.${endDate.toISOString()}` : `created_at.lte.${endDate.toISOString()}`;
    }

    // Get all platform campaigns with related data
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select(`
        *,
        platform_managed_campaigns (*),
        campaign_applications (
          id,
          status,
          proposed_rate_cents
        )
      `)
      .neq('campaign_source', 'restaurant')
      .order('created_at', { ascending: false });

    if (campaignsError) {
      return { data: null, error: campaignsError };
    }

    // Calculate aggregate metrics
    let totalApprovedBudget = 0;
    let totalActualSpend = 0;
    let totalCreators = 0;
    let targetCreators = 0;
    let totalContentPieces = 0;
    let targetContentPieces = 0;
    let totalApplications = 0;
    let totalAccepted = 0;

    const budgetSourceMap: Record<string, { approved: number; spent: number; campaigns: number }> = {};

    campaigns.forEach((campaign: any) => {
      const platformCampaign = campaign.platform_managed_campaigns?.[0];
      if (!platformCampaign) return;

      // Budget totals
      totalApprovedBudget += platformCampaign.approved_budget_cents;
      totalActualSpend += platformCampaign.actual_spend_cents;

      // Target metrics
      targetCreators += platformCampaign.target_creators || 0;
      targetContentPieces += platformCampaign.target_content_pieces || 0;

      // Actual metrics
      totalCreators += platformCampaign.actual_creators || 0;
      totalContentPieces += platformCampaign.actual_content_pieces || 0;

      // Application metrics
      const applications = campaign.campaign_applications || [];
      totalApplications += applications.length;
      totalAccepted += applications.filter((app: any) => app.status === 'accepted').length;

      // Budget source breakdown
      const source = platformCampaign.budget_source;
      if (!budgetSourceMap[source]) {
        budgetSourceMap[source] = { approved: 0, spent: 0, campaigns: 0 };
      }
      budgetSourceMap[source].approved += platformCampaign.approved_budget_cents;
      budgetSourceMap[source].spent += platformCampaign.actual_spend_cents;
      budgetSourceMap[source].campaigns += 1;
    });

    // Calculate derived metrics
    const remainingBudget = totalApprovedBudget - totalActualSpend;
    const budgetUtilization = totalApprovedBudget > 0 ? (totalActualSpend / totalApprovedBudget) * 100 : 0;
    const costPerCreator = totalCreators > 0 ? totalActualSpend / totalCreators : 0;
    const costPerContentPiece = totalContentPieces > 0 ? totalActualSpend / totalContentPieces : 0;
    const acceptanceRate = totalApplications > 0 ? (totalAccepted / totalApplications) * 100 : 0;

    // Format budget sources
    const budgetSources = Object.entries(budgetSourceMap).map(([source, data]) => ({
      source,
      approvedBudget: data.approved,
      actualSpend: data.spent,
      remaining: data.approved - data.spent,
      utilization: data.approved > 0 ? (data.spent / data.approved) * 100 : 0,
      campaignCount: data.campaigns,
      roi: data.spent > 0 ? (totalContentPieces / (data.spent / 100)).toFixed(2) : 0,
    }));

    // Format campaign list with performance metrics
    const campaignPerformance = campaigns.map((campaign: any) => {
      const platformCampaign = campaign.platform_managed_campaigns?.[0];
      const applications = campaign.campaign_applications || [];
      const accepted = applications.filter((app: any) => app.status === 'accepted').length;

      return {
        id: campaign.id,
        title: campaign.title,
        campaignSource: campaign.campaign_source,
        budgetSource: platformCampaign?.budget_source,
        approvedBudget: platformCampaign?.approved_budget_cents || 0,
        actualSpend: platformCampaign?.actual_spend_cents || 0,
        utilization: platformCampaign?.approved_budget_cents > 0
          ? ((platformCampaign?.actual_spend_cents || 0) / platformCampaign.approved_budget_cents) * 100
          : 0,
        targetCreators: platformCampaign?.target_creators || 0,
        actualCreators: platformCampaign?.actual_creators || 0,
        targetContentPieces: platformCampaign?.target_content_pieces || 0,
        actualContentPieces: platformCampaign?.actual_content_pieces || 0,
        applicationsCount: applications.length,
        acceptedCount: accepted,
        acceptanceRate: applications.length > 0 ? (accepted / applications.length) * 100 : 0,
        status: campaign.status,
      };
    });

    return {
      data: {
        totalApprovedBudget,
        totalActualSpend,
        remainingBudget,
        budgetUtilization,
        totalCreators,
        targetCreators,
        totalContentPieces,
        targetContentPieces,
        costPerCreator,
        costPerContentPiece,
        totalApplications,
        totalAccepted,
        acceptanceRate,
        budgetSources,
        campaigns: campaignPerformance,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Export campaign report as CSV data
 */
export async function exportCampaignReport(startDate?: Date | null, endDate?: Date | null) {
  try {
    const { data: analytics, error } = await getCampaignAnalytics(startDate, endDate);
    if (error || !analytics) {
      return { data: null, error: error || 'Failed to load analytics' };
    }

    // Format as CSV
    const headers = [
      'Campaign ID',
      'Title',
      'Source',
      'Budget Source',
      'Approved Budget',
      'Actual Spend',
      'Utilization %',
      'Target Creators',
      'Actual Creators',
      'Target Content',
      'Actual Content',
      'Applications',
      'Accepted',
      'Acceptance Rate %',
      'Status',
    ];

    const rows = analytics.campaigns.map((c: any) => [
      c.id,
      c.title,
      c.campaignSource,
      c.budgetSource,
      (c.approvedBudget / 100).toFixed(2),
      (c.actualSpend / 100).toFixed(2),
      c.utilization.toFixed(2),
      c.targetCreators,
      c.actualCreators,
      c.targetContentPieces,
      c.actualContentPieces,
      c.applicationsCount,
      c.acceptedCount,
      c.acceptanceRate.toFixed(2),
      c.status,
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

    return { data: csv, error: null };
  } catch (error) {
    return { data: null, error };
  }
}
```

## Definition of Done
- [ ] Analytics dashboard screen created (React Native)
- [ ] Budget overview card component implemented
- [ ] Key metrics grid displays cost per creator, acceptance rate, etc.
- [ ] Budget source breakdown component created
- [ ] Campaign performance list component created
- [ ] Date range selector component implemented
- [ ] Analytics service functions fetch and aggregate data correctly
- [ ] Export report function generates CSV data
- [ ] Real-time updates work when campaign applications change
- [ ] High budget utilization warnings display
- [ ] All calculations are accurate (budget, spend, ROI, etc.)
- [ ] React Native components used throughout (View, Text, ScrollView, etc.)
- [ ] Manual testing confirms accurate analytics across date ranges
- [ ] Performance is acceptable with 50+ campaigns

## Notes
- **React Native**: All UI code uses React Native components (View, Text, ScrollView, TouchableOpacity, SafeAreaView, RefreshControl)
- **Real-time Updates**: Leverage database triggers from TMC-001 to keep metrics current
- **Export Functionality**: CSV export for financial reporting and external analysis
- **Budget Alerts**: Visual warnings when campaigns approach 80% budget utilization
- **ROI Calculation**: Focus on content pieces per dollar spent as primary metric
- **Date Filtering**: Allow custom date ranges for historical analysis
- **Reference**: TROODIE_MANAGED_CAMPAIGNS_STRATEGY.md section "Success Metrics & KPIs"
- **Related Tasks**: TMC-001 (Database Schema with triggers), TMC-003 (Admin UI), TMC-006 (Deliverables)
- **Future Enhancement**: Add charts/graphs using react-native-chart-kit, predictive budget forecasting, automated budget alerts via push notifications
