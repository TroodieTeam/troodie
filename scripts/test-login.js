#!/usr/bin/env node
// Quick sanity check: attempts to sign in test users and prints session emails.
require('dotenv').config({ path: '.env.development' })
const { createClient } = require('@supabase/supabase-js')

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const password = process.env.EXPO_PUBLIC_TEST_AUTH_PASSWORD || 'BypassPassword123'

if (!url || !anon) {
  console.error('Missing Supabase URL or anon key')
  process.exit(1)
}

const supabase = createClient(url, anon)

const TEST_EMAILS = [
  'admin@troodieapp.com',
  'creator1@troodieapp.com',
  'restaurant1@troodieapp.com',
  'multi_role@troodieapp.com',
]

async function run() {
  for (const email of TEST_EMAILS) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      console.log(`❌ ${email}: ${error.message}`)
      continue
    }
    console.log(`✅ ${data.user?.email} session: ${!!data.session}`)
    await supabase.auth.signOut()
  }
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})


