import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, token } = await req.json()

    console.log('[bypass-auth] Request for email:', email)

    // Only allow bypass for @bypass.com emails
    if (!email?.toLowerCase().endsWith('@bypass.com') && email?.toLowerCase() !== 'review@troodieapp.com') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid email. Bypass auth only works for @bypass.com accounts.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    // Verify OTP token
    if (token !== '000000') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid OTP code. Use 000000 for bypass accounts.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    // Create Supabase admin client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[bypass-auth] Missing environment variables')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Server configuration error'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Find the user in public.users to get their ID
    const { data: publicUser, error: publicUserError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .single()

    if (publicUserError || !publicUser) {
      console.error('[bypass-auth] User not found in public.users:', publicUserError)
      return new Response(
        JSON.stringify({
          success: false,
          error: `Account not found in database. Please run: node scripts/seed-test-accounts.js`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      )
    }

    console.log('[bypass-auth] Found user in public.users:', publicUser.id)

    // Try to find auth user
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    let authUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase())

    // If auth user doesn't exist, create it NOW with the same UUID
    if (!authUser) {
      console.log('[bypass-auth] Auth user not found, creating it...')

      const { data: createdAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email.toLowerCase(),
        email_confirm: true,
        user_metadata: {
          created_by: 'bypass-auth-function'
        },
        // Use the same ID as the public.users record
        user_id: publicUser.id
      })

      if (createError) {
        console.error('[bypass-auth] Failed to create auth user:', createError)
        return new Response(
          JSON.stringify({
            success: false,
            error: `Failed to create auth account: ${createError.message}`
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        )
      }

      authUser = createdAuthUser.user
      console.log('[bypass-auth] Created auth user:', authUser.id)
    } else {
      console.log('[bypass-auth] Found existing auth user:', authUser.id)
    }

    // Generate a magic link token that can be used to sign in
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email.toLowerCase(),
      options: {
        redirectTo: undefined,
      }
    })

    if (linkError) {
      console.error('[bypass-auth] Error generating magic link:', linkError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to generate authentication token'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    console.log('[bypass-auth] Generated magic link successfully')

    // Extract the token from the generated link
    // The link format is: {SITE_URL}/auth/confirm?token=TOKEN&type=magiclink
    const tokenMatch = linkData.properties.action_link.match(/token=([^&]+)/)
    const authToken = tokenMatch ? tokenMatch[1] : null

    if (!authToken) {
      console.error('[bypass-auth] Failed to extract token from link')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to extract authentication token'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    // Return the token and user info
    // The client will use verifyOtp with this token to create a session
    return new Response(
      JSON.stringify({
        success: true,
        token: authToken,
        user_id: authUser.id,
        email: authUser.email,
        hashed_token: linkData.properties.hashed_token,
        message: 'Bypass auth token generated successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('[bypass-auth] Edge function error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
