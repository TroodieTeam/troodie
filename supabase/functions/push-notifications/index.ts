import { createClient } from 'npm:@supabase/supabase-js@2'
import { Expo } from 'npm:expo-server-sdk@3.10.0'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationRecord {
    id: string
    user_id: string
    type: string
    title: string
    message: string
    data: any
    created_at: string
}

interface WebhookPayload {
    type: 'INSERT' | 'UPDATE' | 'DELETE'
    table: string
    record: NotificationRecord
    schema: string
    old_record: null | NotificationRecord
}

Deno.serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // 1. Parse the webhook payload
        const payload: WebhookPayload = await req.json()
        console.log('🔔 [PushNotification] Received webhook payload:', payload.type)

        if (payload.type !== 'INSERT') {
            return new Response(JSON.stringify({ message: 'Not an INSERT event' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const notification = payload.record

        // 2. Filter for campaign_opportunity (redundant if webhook filter exists, but safe)
        if (notification.type !== 'campaign_opportunity') {
            console.log(`ℹ️ [PushNotification] Skipping type: ${notification.type}`)
            return new Response(JSON.stringify({ message: 'Skipped non-campaign type' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        console.log(`Processing notification ${notification.id} for user ${notification.user_id}`)

        // 3. Get user's active push tokens
        const { data: tokens, error: tokenError } = await supabase
            .from('push_tokens')
            .select('token')
            .eq('user_id', notification.user_id)
            .eq('is_active', true)

        if (tokenError) {
            console.error('Error fetching tokens:', tokenError)
            throw new Error('Failed to fetch push tokens')
        }

        if (!tokens || tokens.length === 0) {
            console.log('No active push tokens found for user')
            return new Response(JSON.stringify({ message: 'No active tokens' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // 4. Construct Push Messages
        const expo = new Expo()
        const messages = []

        for (const t of tokens) {
            if (!Expo.isExpoPushToken(t.token)) {
                console.error(`Push token ${t.token} is not a valid Expo push token`)
                continue
            }

            messages.push({
                to: t.token,
                sound: 'default',
                title: notification.title,
                body: notification.message,
                data: notification.data,
                badge: 1, // You might want to increment this from DB if tracking unread counts
            })
        }

        if (messages.length === 0) {
            return new Response(JSON.stringify({ message: 'No valid tokens' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // 5. Send Notifications (Batched)
        const chunks = expo.chunkPushNotifications(messages)
        const tickets = []

        for (const chunk of chunks) {
            try {
                const ticketChunk = await expo.sendPushNotificationsAsync(chunk)
                tickets.push(...ticketChunk)
                console.log('Sent chunk:', ticketChunk)
            } catch (error) {
                console.error('Error sending chunk:', error)
            }
        }

        // 6. Handle receipts/errors if needed (Optional: Logic to remove invalid tokens)
        // For brevity, we just log success here.

        return new Response(
            JSON.stringify({
                success: true,
                count: messages.length,
                message: `Sent ${messages.length} push notifications`
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Error processing push notification:', error)
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
