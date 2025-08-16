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
    
    // Only allow bypass for the specific review account
    if (email !== 'kouamendri1@gmail.com' || token !== '000000') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid credentials' 
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

    // The UUID for kouamendri1@gmail.com account
    const REVIEW_USER_UUID = '175b77a2-4a54-4239-b0ce-9d1351bbb6d0'

    // Verify the user exists using the admin auth API
    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.admin.getUserById(
      REVIEW_USER_UUID
    )

    if (authError || !authUser) {
      console.error('Auth user not found:', authError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Review account not found' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      )
    }

    // Update user metadata to track the bypass
    await supabaseAdmin.auth.admin.updateUserById(
      REVIEW_USER_UUID,
      {
        email_confirm: true,
        user_metadata: {
          ...authUser.user_metadata,
          review_bypass_used: true,
          last_bypass_login: new Date().toISOString()
        }
      }
    )

    // Simply return success - the client will handle the actual authentication
    // We've verified the user exists and the bypass code is correct
    return new Response(
      JSON.stringify({ 
        success: true,
        verified: true,
        user_id: REVIEW_USER_UUID,
        email: 'kouamendri1@gmail.com',
        message: 'Bypass verified successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})