import { supabase } from '@/lib/supabase';

/**
 * Service for campaign analytics and budget tracking
 * Task: TMC-005
 */

/**
 * Get comprehensive campaign analytics for platform-managed campaigns
 */
export async function getCampaignAnalytics(startDate?: Date | null, endDate?: Date | null) {
  try {
    // Build query with optional date filter
    let query = supabase
      .from('campaigns')
      .select(`
        *,
        platform_managed_campaigns (*),
        campaign_applications (
          id,
          status,
          proposed_rate_cents,
          creator_id
        )
      `)
      .neq('campaign_source', 'restaurant')
      .order('created_at', { ascending: false });

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString());
    }
    if (endDate) {
      query = query.lte('created_at', endDate.toISOString());
    }

    const { data: campaigns, error: campaignsError } = await query;

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
      roi: data.spent > 0 ? (totalContentPieces / (data.spent / 100)).toFixed(2) : '0',
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
        created_at: campaign.created_at,
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
      'Approved Budget ($)',
      'Actual Spend ($)',
      'Utilization %',
      'Target Creators',
      'Actual Creators',
      'Target Content',
      'Actual Content',
      'Applications',
      'Accepted',
      'Acceptance Rate %',
      'Status',
      'Created Date',
    ];

    const rows = analytics.campaigns.map((c: any) => [
      c.id,
      `"${c.title.replace(/"/g, '""')}"`, // Escape quotes in CSV
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
      new Date(c.created_at).toLocaleDateString(),
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

    return { data: csv, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Get deliverable metrics for platform campaigns
 */
export async function getDeliverableMetrics() {
  try {
    const { data, error } = await supabase
      .from('campaign_applications')
      .select(`
        id,
        status,
        deliverables_submitted,
        submitted_at,
        reviewed_at,
        campaign:campaigns!inner (
          campaign_source
        )
      `)
      .neq('campaign.campaign_source', 'restaurant')
      .not('deliverables_submitted', 'is', null);

    if (error) {
      return { data: null, error };
    }

    // Calculate metrics
    const totalSubmissions = data.length;
    const completed = data.filter(d => d.status === 'completed').length;
    const pending = data.filter(d => d.status === 'pending_review').length;
    const revisionRequested = data.filter(d => d.status === 'revision_requested').length;

    // Calculate average time to approval
    const approvedDeliverables = data.filter(d => d.status === 'completed' && d.reviewed_at);
    let avgTimeToApproval = 0;
    if (approvedDeliverables.length > 0) {
      const totalTime = approvedDeliverables.reduce((sum, d) => {
        const submitted = new Date(d.submitted_at).getTime();
        const reviewed = new Date(d.reviewed_at).getTime();
        return sum + (reviewed - submitted);
      }, 0);
      avgTimeToApproval = totalTime / approvedDeliverables.length / (1000 * 60 * 60); // Convert to hours
    }

    return {
      data: {
        totalSubmissions,
        completed,
        pending,
        revisionRequested,
        approvalRate: totalSubmissions > 0 ? (completed / totalSubmissions) * 100 : 0,
        avgTimeToApprovalHours: avgTimeToApproval,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error };
  }
}
