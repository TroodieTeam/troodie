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
    const REVIEW_PASSWORD = 'ReviewPass000000'

    // Set password for the review account
    const { data: user, error } = await supabaseAdmin.auth.admin.updateUserById(
      REVIEW_USER_UUID,
      {
        password: REVIEW_PASSWORD,
        email_confirm: true,
        user_metadata: {
          has_password: true,
          password_set_at: new Date().toISOString()
        }
      }
    )

    if (error) {
      console.error('Error setting password:', error)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to set password' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Password set successfully for review account',
        email: 'kouamendri1@gmail.com',
        password: REVIEW_PASSWORD
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