import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InviteRequest {
    restaurantId: string
    restaurantName: string
    inviterName: string
    inviteeEmail: string
    invitationToken: string
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        const { restaurantId, restaurantName, inviterName, inviteeEmail, invitationToken }: InviteRequest = await req.json()

        console.log('[SendTeamInvite] Sending invite to:', inviteeEmail)

        // Build the invitation links
        const mobileLink = `troodie://invite/${invitationToken}`
        // Use the mobile deep link for redirect - Supabase will redirect to this after auth
        const webLink = `troodie://invite/${invitationToken}`

        // Check if user already exists
        const { data: existingUsers } = await supabase.auth.admin.listUsers()
        const userExists = existingUsers?.users?.some(
            (u) => u.email?.toLowerCase() === inviteeEmail.toLowerCase()
        )

        if (userExists) {
            // User already exists - send OTP email
            console.log('[SendTeamInvite] User exists, sending OTP email')

            // Call Supabase's signInWithOtp to send OTP email
            const { error: otpError } = await supabase.auth.signInWithOtp({
                email: inviteeEmail,
                options: {
                    shouldCreateUser: false,
                },
            })

            if (otpError) {
                console.error('[SendTeamInvite] OTP error:', otpError)
                return new Response(
                    JSON.stringify({ success: false, error: otpError.message }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                )
            }

            console.log('[SendTeamInvite] OTP email sent to existing user')

            return new Response(
                JSON.stringify({
                    success: true,
                    method: 'otp',
                    message: 'OTP email sent to existing user.',
                    mobileLink: mobileLink,
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // User doesn't exist - invite them
        console.log('[SendTeamInvite] New user, sending invite email')

        const { error: sendError } = await supabase.auth.admin.inviteUserByEmail(inviteeEmail, {
            redirectTo: webLink,
            data: {
                team_invitation: true,
                restaurant_id: restaurantId,
                restaurant_name: restaurantName,
                invitation_token: invitationToken,
                inviter_name: inviterName,
            },
        })

        if (sendError) {
            console.error('[SendTeamInvite] Send email error:', sendError)
            return new Response(
                JSON.stringify({ success: false, error: sendError.message }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        console.log('[SendTeamInvite] Invitation email sent successfully')

        return new Response(
            JSON.stringify({ success: true, method: 'invite', mobileLink }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('[SendTeamInvite] Error:', error)
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
