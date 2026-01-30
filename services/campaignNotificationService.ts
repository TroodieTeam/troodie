import { supabase } from '@/lib/supabase';
import { notificationService } from './notificationService';

/**
 * Get creators in the same city as a restaurant
 * Note: Creator profiles have a free-form 'location' field like "Charlotte, NC"
 * We need to match this against restaurant's structured city field
 */
async function getCreatorsInCity(
    city: string,
    state?: string
): Promise<string[]> {
    try {
        // Use the database function that handles location matching
        const { data: creators, error } = await supabase
            .rpc('get_creators_in_city', {
                p_city: city,
                p_state: state || null
            });

        if (error) {
            console.error('Error fetching creators by location:', error);
            return [];
        }

        // Return array of creator user IDs
        return (creators || []).map((c: any) => c.user_id).filter(Boolean);
    } catch (error) {
        console.error('Error in getCreatorsInCity:', error);
        return [];
    }
}
/**
 * Notify creators about a new campaign opportunity
 */
export async function notifyCreatorsOfNewCampaign(
    campaignId: string
): Promise<{ success: boolean; notifiedCount: number; error?: Error }> {
    console.log('🔔 [CAMPAIGN NOTIFICATIONS] Starting notification process for campaign:', campaignId);

    try {
        // Get campaign details with restaurant information
        console.log('📊 [CAMPAIGN NOTIFICATIONS] Fetching campaign details...');
        const { data: campaign, error: campaignError } = await supabase
            .from('campaigns')
            .select(`
        id,
        title,
        budget_cents,
        campaign_source,
        status,
        restaurants (
          id,
          name,
          city,
          state
        )
      `)
            .eq('id', campaignId)
            .single();
        if (campaignError || !campaign) {
            console.error('❌ [CAMPAIGN NOTIFICATIONS] Error fetching campaign:', campaignError);
            return { success: false, notifiedCount: 0, error: campaignError };
        }

        console.log('✅ [CAMPAIGN NOTIFICATIONS] Campaign loaded:', {
            title: campaign.title,
            source: campaign.campaign_source,
            status: campaign.status
        });

        // Only notify for restaurant-created campaigns that are active
        if (campaign.campaign_source !== 'restaurant' || campaign.status !== 'active') {
            console.log('⏭️  [CAMPAIGN NOTIFICATIONS] Skipping - not an active restaurant campaign');
            return { success: true, notifiedCount: 0 };
        }
        // Get restaurant details
        // Supabase returns relationships as arrays, get the first item
        const restaurant = Array.isArray(campaign.restaurants)
            ? campaign.restaurants[0]
            : campaign.restaurants;

        if (!restaurant || !restaurant.city) {
            console.log('❌ [CAMPAIGN NOTIFICATIONS] No restaurant location data available');
            return { success: true, notifiedCount: 0 };
        }

        console.log('🏪 [CAMPAIGN NOTIFICATIONS] Restaurant:', {
            name: restaurant.name,
            city: restaurant.city,
            state: restaurant.state
        });

        // Get creators in the same city
        console.log(`🔍 [CAMPAIGN NOTIFICATIONS] Searching for creators in ${restaurant.city}, ${restaurant.state}...`);
        const creatorIds = await getCreatorsInCity(
            restaurant.city,
            restaurant.state
        );
        if (creatorIds.length === 0) {
            console.log(`ℹ️  [CAMPAIGN NOTIFICATIONS] No creators found in ${restaurant.city}`);
            return { success: true, notifiedCount: 0 };
        }

        console.log(`✅ [CAMPAIGN NOTIFICATIONS] Found ${creatorIds.length} creators in ${restaurant.city}`);
        // Send notification to each creator
        let notifiedCount = 0;
        const notificationPromises = creatorIds.map(async (creatorId, index) => {
            try {
                console.log(`📤 [CAMPAIGN NOTIFICATIONS] Sending notification ${index + 1}/${creatorIds.length} to creator: ${creatorId}`);

                // Create in-app notification
                await notificationService.createCampaignOpportunityNotification(
                    creatorId,
                    campaign.id,
                    campaign.title,
                    restaurant.id,
                    restaurant.name,
                    restaurant.city,
                    campaign.budget_cents,
                    undefined, // proposed_rate_cents
                    undefined, // end_date
                    undefined  // primary_photo_url
                );

                // Send push notification
                try {
                    console.log(`🔔 [CAMPAIGN NOTIFICATIONS] Sending push notification to creator: ${creatorId}`);
                    await notificationService.sendPushNotification(creatorId, {
                        title: 'New Campaign Opportunity Posted',
                        body: `New campaign opportunity at ${restaurant.name}`,
                        data: {
                            type: 'campaign_opportunity',
                            campaignId: campaign.id,
                            restaurantId: restaurant.id,
                        },
                    });
                    console.log(`✅ [CAMPAIGN NOTIFICATIONS] Push notification sent to creator ${creatorId}`);
                } catch (pushError) {
                    console.error(`⚠️  [CAMPAIGN NOTIFICATIONS] Push notification failed for ${creatorId}, but in-app notification succeeded:`, pushError);
                }

                notifiedCount++;
                console.log(`✅ [CAMPAIGN NOTIFICATIONS] Notification sent successfully to creator ${creatorId}`);
            } catch (error) {
                console.error(`❌ [CAMPAIGN NOTIFICATIONS] Failed to notify creator ${creatorId}:`, error);
            }
        });
        // Wait for all notifications to be sent
        console.log('⏳ [CAMPAIGN NOTIFICATIONS] Waiting for all notifications to complete...');
        await Promise.allSettled(notificationPromises);

        console.log(`🎉 [CAMPAIGN NOTIFICATIONS] COMPLETE! Successfully notified ${notifiedCount}/${creatorIds.length} creators`);
        return { success: true, notifiedCount };
    } catch (error) {
        console.error('❌ [CAMPAIGN NOTIFICATIONS] Fatal error:', error);
        return { success: false, notifiedCount: 0, error: error as Error };
    }
}
/**
 * Check if a creator should be notified based on their preferences
 * TODO: Implement when notification preferences are added
 */
export async function shouldNotifyCreator(
    creatorId: string,
    campaignData: any
): Promise<boolean> {
    // For now, always return true
    // In the future, check:
    // - User's notification preferences for campaign_opportunities
    // - Minimum budget preferences
    // - Category/cuisine preferences
    return true;
}