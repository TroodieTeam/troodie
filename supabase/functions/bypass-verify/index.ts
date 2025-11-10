import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, token, user_id } = await req.json()

    console.log('[bypass-verify] Request for email:', email, 'user_id:', user_id)

    // Validate bypass account
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[bypass-verify] Missing environment variables')
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

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Check if user exists in public.users
    const { data: publicUser, error: publicUserError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('id', user_id)
      .single()

    if (publicUserError || !publicUser) {
      console.error('[bypass-verify] User not found in public.users:', publicUserError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Account not found in database'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      )
    }

    console.log('[bypass-verify] Found user in public.users:', publicUser.id)

    // Try to find existing auth user
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
    let authUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase())

    // If auth user doesn't exist, try to create one
    if (!authUser) {
      console.log('[bypass-verify] No auth user found, attempting to create...')

      const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
        email: email.toLowerCase(),
        email_confirm: true,
        app_metadata: {
          provider: 'email',
          providers: ['email']
        },
        user_metadata: {
          bypass_account: true
        }
      })

      if (signUpError) {
        console.error('[bypass-verify] Failed to create auth user:', signUpError.message)

        // If we can't create an auth user, we cannot proceed
        // The database has restrictions that prevent user creation
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Cannot create authentication account due to database restrictions. Please contact support.',
            details: signUpError.message
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        )
      }

      authUser = signUpData.user
      console.log('[bypass-verify] Created auth user successfully:', authUser.id)
    }

    // Generate a proper session using admin API
    console.log('[bypass-verify] Generating session for auth user:', authUser.id)

    // Use admin.generateLink to get tokens
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email.toLowerCase()
    })

    if (linkError) {
      console.error('[bypass-verify] Failed to generate link:', linkError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to generate session tokens'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    // Extract tokens from the generated link
    const { properties } = linkData

    console.log('[bypass-verify] Session generated successfully')

    return new Response(
      JSON.stringify({
        success: true,
        access_token: properties.access_token,
        refresh_token: properties.refresh_token,
        user_id: authUser.id,
        email: authUser.email,
        method: 'admin_generate_link',
        message: 'Bypass account authenticated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('[bypass-verify] Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
