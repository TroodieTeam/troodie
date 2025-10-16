import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BYPASS_ACCOUNTS = [
  { email: 'consumer1@bypass.com', name: 'Test Consumer One', username: 'test_consumer_1', account_type: 'consumer' },
  { email: 'consumer2@bypass.com', name: 'Test Consumer Two', username: 'test_consumer_2', account_type: 'consumer' },
  { email: 'consumer3@bypass.com', name: 'Test Consumer Three', username: 'test_consumer_3', account_type: 'consumer' },
  { email: 'creator1@bypass.com', name: 'Test Creator One', username: 'test_creator_1', account_type: 'creator' },
  { email: 'creator2@bypass.com', name: 'Test Creator Two', username: 'test_creator_2', account_type: 'creator' },
  { email: 'business1@bypass.com', name: 'Test Business One', username: 'test_business_1', account_type: 'business' },
  { email: 'business2@bypass.com', name: 'Test Business Two', username: 'test_business_2', account_type: 'business' },
  { email: 'multi_role@bypass.com', name: 'Test Multi Role', username: 'test_multi_role', account_type: 'business' },
]

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const results = {
      created: [] as string[],
      existing: [] as string[],
      errors: [] as { email: string; error: string }[]
    }

    for (const account of BYPASS_ACCOUNTS) {
      try {
        console.log(`[setup-bypass] Processing: ${account.email}`)

        // Check if auth user exists
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
        const existingAuthUser = users.find(u => u.email === account.email)

        let userId: string

        if (existingAuthUser) {
          console.log(`[setup-bypass] Auth user exists: ${account.email}`)
          userId = existingAuthUser.id
          results.existing.push(account.email)
        } else {
          // Create auth user
          console.log(`[setup-bypass] Creating auth user: ${account.email}`)

          const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: account.email,
            email_confirm: true,
            user_metadata: {
              name: account.name,
              username: account.username
            }
          })

          if (authError) {
            console.error(`[setup-bypass] Error creating auth user:`, authError)
            results.errors.push({ email: account.email, error: authError.message })
            continue
          }

          userId = authData.user.id
          console.log(`[setup-bypass] Created auth user: ${account.email} (${userId})`)
          results.created.push(account.email)
        }

        // Check if profile exists
        const { data: existingProfile } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('email', account.email)
          .single()

        if (!existingProfile) {
          // Create profile
          const { error: profileError } = await supabaseAdmin
            .from('users')
            .insert({
              id: userId,
              email: account.email,
              name: account.name,
              username: account.username,
              account_type: account.account_type,
              account_status: 'active',
              is_verified: true,
              profile_completion: 100,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })

          if (profileError) {
            console.error(`[setup-bypass] Error creating profile:`, profileError)
            results.errors.push({ email: account.email, error: `Profile: ${profileError.message}` })
          } else {
            console.log(`[setup-bypass] Created profile: ${account.email}`)
          }
        } else {
          console.log(`[setup-bypass] Profile exists: ${account.email}`)
        }

      } catch (err) {
        console.error(`[setup-bypass] Error processing ${account.email}:`, err)
        results.errors.push({ email: account.email, error: err.message })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results: results,
        summary: {
          total: BYPASS_ACCOUNTS.length,
          created: results.created.length,
          existing: results.existing.length,
          errors: results.errors.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('[setup-bypass] Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
