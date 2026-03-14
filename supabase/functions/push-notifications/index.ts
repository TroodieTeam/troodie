import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Expo Push API constants
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const EXPO_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts'
const BATCH_SIZE = 100

interface WebhookPayload {
    type: 'INSERT'
    table: string
    record: NotificationRecord
    schema: string
    old_record: null
}

interface NotificationRecord {
    id: string
    user_id: string
    type: string
    title: string
    message: string
    data: Record<string, unknown> | null
    related_id: string | null
    related_type: string | null
    is_read: boolean
    priority: number
    created_at: string
}

interface ExpoPushMessage {
    to: string
    title: string
    body: string
    data?: Record<string, unknown>
    sound?: string
    badge?: number
    priority?: 'default' | 'normal' | 'high'
    channelId?: string
}

interface ExpoPushTicket {
    id?: string
    status: 'ok' | 'error'
    message?: string
    details?: {
        error?: string
    }
}

interface ExpoPushReceipt {
    status: 'ok' | 'error'
    message?: string
    details?: {
        error?: string
    }
}

/**
 * Fetch with retry for 5xx responses from Expo Push API.
 */
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 2): Promise<Response> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const response = await fetch(url, options)
        if (response.ok || attempt === maxRetries || response.status < 500) {
            return response
        }
        console.warn(`[PushNotifications] Expo API returned ${response.status}, retrying (${attempt + 1}/${maxRetries})...`)
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
    }
    // Should never reach here, but just in case
    return fetch(url, options)
}

/**
 * Validate an Expo push token format.
 * Valid formats: ExponentPushToken[...] or ExpoPushToken[...]
 */
function isExpoPushToken(token: string): boolean {
    return /^Expo(nent)?PushToken\[.+\]$/.test(token)
}

/**
 * Map notification priority (1-3) to Expo push priority.
 */
function mapPriority(priority: number): 'default' | 'normal' | 'high' {
    if (priority >= 3) return 'high'
    if (priority >= 2) return 'normal'
    return 'default'
}

/**
 * Map notification type to preference category.
 * Used for both Android channel IDs and user preference lookups.
 */
function getPreferenceCategory(type: string): string {
    const campaignTypes = [
        'campaign_opportunity', 'campaign_application_submitted', 'application_approved',
        'application_rejected', 'campaign_deadline_approaching', 'deliverables_submitted',
        'payment_received', 'new_campaign_posted', 'campaign_invite', 'revision_requested',
    ]
    if (campaignTypes.includes(type)) return 'campaigns'

    const engagementTypes = ['friend_post_restaurant', 'weekly_recap']
    if (engagementTypes.includes(type)) return 'engagement'

    const socialTypes = ['post_liked', 'post_commented', 'follow', 'new_follower', 'mentioned_in_post', 'mentioned_in_comment']
    if (socialTypes.includes(type)) return 'social'

    if (type === 'board_invite') return 'boards'
    if (type === 'restaurant_mention') return 'restaurants'
    if (type === 'system') return 'system'

    return 'system'
}

/**
 * Map notification type to Android channel ID for notification grouping.
 */
function getChannelId(type: string): string {
    const category = getPreferenceCategory(type)
    if (category === 'campaigns' || category === 'engagement' || category === 'social') {
        return category
    }
    return 'default'
}

/**
 * Check if push notifications are enabled for a user's notification category.
 * Returns true if no preference row exists (default to enabled).
 */
async function isPushEnabledForUser(
    userId: string,
    notificationType: string,
    supabase: ReturnType<typeof createClient>
): Promise<boolean> {
    const category = getPreferenceCategory(notificationType)

    const { data, error } = await supabase
        .from('notification_preferences')
        .select('push_enabled')
        .eq('user_id', userId)
        .eq('category', category)
        .single()

    if (error || !data) {
        // No preference row found — default to push enabled
        return true
    }

    return data.push_enabled
}

/**
 * Split an array into chunks of a given size.
 */
function chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size))
    }
    return chunks
}

/**
 * Send push messages to Expo Push API and return tickets.
 */
async function sendToExpoPush(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
    const allTickets: ExpoPushTicket[] = []
    const batches = chunk(messages, BATCH_SIZE)

    for (const batch of batches) {
        const response = await fetchWithRetry(EXPO_PUSH_URL, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(batch),
        })

        if (!response.ok) {
            console.error('[PushNotifications] Expo API error:', response.status, await response.text())
            continue
        }

        const result = await response.json()
        if (result.data) {
            allTickets.push(...result.data)
        }
    }

    return allTickets
}

/**
 * Check receipts for previously sent tickets and deactivate bad tokens.
 */
async function processReceipts(
    ticketIds: string[],
    ticketToTokenMap: Map<string, string>,
    supabase: ReturnType<typeof createClient>
): Promise<void> {
    if (ticketIds.length === 0) return

    const response = await fetchWithRetry(EXPO_RECEIPTS_URL, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: ticketIds }),
    })

    if (!response.ok) {
        console.error('[PushNotifications] Receipt API error:', response.status)
        return
    }

    const result = await response.json()
    const receipts: Record<string, ExpoPushReceipt> = result.data || {}

    const tokensToDeactivate: string[] = []

    for (const [ticketId, receipt] of Object.entries(receipts)) {
        if (receipt.status === 'error' && receipt.details?.error === 'DeviceNotRegistered') {
            const token = ticketToTokenMap.get(ticketId)
            if (token) {
                tokensToDeactivate.push(token)
                console.log('[PushNotifications] Token unregistered, will deactivate:', token.substring(0, 20) + '...')
            }
        }
    }

    if (tokensToDeactivate.length > 0) {
        await deactivateTokens(tokensToDeactivate, supabase)
    }
}

/**
 * Mark tokens as inactive in the push_tokens table.
 */
async function deactivateTokens(
    tokens: string[],
    supabase: ReturnType<typeof createClient>
): Promise<void> {
    const { error } = await supabase
        .from('push_tokens')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .in('token', tokens)

    if (error) {
        console.error('[PushNotifications] Error deactivating tokens:', error)
    } else {
        console.log(`[PushNotifications] Deactivated ${tokens.length} token(s)`)
    }
}

// ============================================================================
// Main Handler
// ============================================================================

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    console.log('[PushNotifications] Function invoked')

    // Validate webhook secret
    const webhookSecret = Deno.env.get('WEBHOOK_SECRET')
    if (webhookSecret) {
        const providedSecret = req.headers.get('x-webhook-secret')
        if (providedSecret !== webhookSecret) {
            console.error('[PushNotifications] Invalid webhook secret')
            return new Response(
                JSON.stringify({ success: false, error: 'Unauthorized' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
            )
        }
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Parse webhook payload
        const payload: WebhookPayload = await req.json()

        if (payload.type !== 'INSERT') {
            console.log('[PushNotifications] Ignoring non-INSERT event:', payload.type)
            return new Response(
                JSON.stringify({ success: true, message: 'Ignored non-INSERT event' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const notification = payload.record
        console.log('[PushNotifications] Processing notification:', {
            id: notification.id,
            type: notification.type,
            userId: notification.user_id,
        })

        // Check user preference for this notification category
        const pushEnabled = await isPushEnabledForUser(notification.user_id, notification.type, supabase)
        if (!pushEnabled) {
            const category = getPreferenceCategory(notification.type)
            console.log(`[PushNotifications] Push disabled for user ${notification.user_id}, category: ${category}`)
            return new Response(
                JSON.stringify({ success: true, message: `Push disabled for category: ${category}` }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Fetch active push tokens for the user
        const { data: tokens, error: tokenError } = await supabase
            .from('push_tokens')
            .select('token')
            .eq('user_id', notification.user_id)
            .eq('is_active', true)

        if (tokenError) {
            console.error('[PushNotifications] Error fetching tokens:', tokenError)
            return new Response(
                JSON.stringify({ success: false, error: 'Failed to fetch push tokens' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            )
        }

        if (!tokens || tokens.length === 0) {
            console.log('[PushNotifications] No active push tokens for user:', notification.user_id)
            return new Response(
                JSON.stringify({ success: true, message: 'No active tokens' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Filter to valid Expo push tokens
        const validTokens = tokens
            .map(t => t.token)
            .filter(isExpoPushToken)

        if (validTokens.length === 0) {
            console.log('[PushNotifications] No valid Expo push tokens found')
            return new Response(
                JSON.stringify({ success: true, message: 'No valid Expo tokens' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log(`[PushNotifications] Sending to ${validTokens.length} token(s)`)

        // Build push messages
        const messages: ExpoPushMessage[] = validTokens.map(token => ({
            to: token,
            title: notification.title,
            body: notification.message,
            data: {
                notificationId: notification.id,
                type: notification.type,
                relatedId: notification.related_id,
                relatedType: notification.related_type,
                ...(notification.data || {}),
            },
            sound: 'default',
            priority: mapPriority(notification.priority),
            channelId: getChannelId(notification.type),
        }))

        // Send to Expo Push API
        const tickets = await sendToExpoPush(messages)

        // Track ticket-to-token mapping for receipt processing
        const ticketIds: string[] = []
        const ticketToTokenMap = new Map<string, string>()
        const immediateDeactivations: string[] = []

        tickets.forEach((ticket, index) => {
            const token = validTokens[index]

            if (ticket.status === 'ok' && ticket.id) {
                ticketIds.push(ticket.id)
                ticketToTokenMap.set(ticket.id, token)
            } else if (ticket.status === 'error') {
                console.error('[PushNotifications] Ticket error:', ticket.message, ticket.details)
                // Immediately deactivate tokens that are not registered
                if (ticket.details?.error === 'DeviceNotRegistered') {
                    immediateDeactivations.push(token)
                }
            }
        })

        // Deactivate any tokens that immediately failed
        if (immediateDeactivations.length > 0) {
            await deactivateTokens(immediateDeactivations, supabase)
        }

        // Process receipts (Expo recommends waiting ~15s, but we check what's available now)
        // In production, a separate cron could handle delayed receipt checking
        if (ticketIds.length > 0) {
            // Wait briefly for receipts to be available
            await new Promise(resolve => setTimeout(resolve, 2000))
            await processReceipts(ticketIds, ticketToTokenMap, supabase)
        }

        const sent = tickets.filter(t => t.status === 'ok').length
        const failed = tickets.filter(t => t.status === 'error').length

        console.log(`[PushNotifications] Complete: ${sent} sent, ${failed} failed`)

        return new Response(
            JSON.stringify({
                success: true,
                sent,
                failed,
                deactivated: immediateDeactivations.length,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error: unknown) {
        console.error('[PushNotifications] Error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        return new Response(
            JSON.stringify({ success: false, error: errorMessage }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
