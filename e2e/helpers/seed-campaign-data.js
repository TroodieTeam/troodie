#!/usr/bin/env node

/**
 * Seed campaign test data for E2E tests.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY) to bypass RLS.
 * Uses test-* bypass accounts (NOT prod-* accounts).
 *
 * Usage:
 *   node e2e/helpers/seed-campaign-data.js
 *
 * Bypass account convention:
 *   test-*@bypass.com  → E2E / automated testing (safe to reset/modify)
 *   prod-*@bypass.com  → App Store review / manual QA (do not touch)
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.development' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  || process.env.SUPABASE_SERVICE_KEY
  || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or service key. Check .env.development');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ── Test account IDs (from Supabase auth) ──────────────────────────
const TEST_ACCOUNTS = {
  business: {
    email: 'test-business1@bypass.com',
    authId: '8e7df4ee-e180-427b-ad8d-e6ffcf41a03a',
  },
  creator1: {
    email: 'test-creator1@bypass.com',
    authId: '4a797077-116e-4a3a-bc43-a71ae18963d8',
    creatorProfileId: '07a00972-ac68-4a53-824c-d8fdd42d20b2',
  },
  creator3: {
    email: 'test-creator3@bypass.com',
    authId: 'e50f6c6f-9487-4ff2-acd0-3542fdd46dd1',
    creatorProfileId: 'd2bad45c-48c4-4e9f-9d6e-6d371a8248cf',
  },
};

const BYPASS_PASSWORD = '000000';

async function seed() {
  console.log('🌱 Seeding campaign E2E test data...\n');
  console.log('Using test-* accounts (not prod-*).\n');

  // 1. Set passwords for all test accounts
  console.log('1. Setting bypass passwords...');
  for (const [role, acct] of Object.entries(TEST_ACCOUNTS)) {
    const { error } = await supabase.auth.admin.updateUserById(acct.authId, {
      password: BYPASS_PASSWORD,
    });
    console.log(`   ${acct.email}: ${error ? error.message : 'ok'}`);
  }

  // 2. Ensure account types are correct in users table
  console.log('\n2. Setting account types...');
  const { error: bizTypeErr } = await supabase
    .from('users')
    .update({ account_type: 'business' })
    .eq('id', TEST_ACCOUNTS.business.authId);
  console.log(`   ${TEST_ACCOUNTS.business.email} → business: ${bizTypeErr ? bizTypeErr.message : 'ok'}`);

  const { error: cr1TypeErr } = await supabase
    .from('users')
    .update({ account_type: 'creator' })
    .eq('id', TEST_ACCOUNTS.creator1.authId);
  console.log(`   ${TEST_ACCOUNTS.creator1.email} → creator: ${cr1TypeErr ? cr1TypeErr.message : 'ok'}`);

  const { error: cr3TypeErr } = await supabase
    .from('users')
    .update({ account_type: 'creator' })
    .eq('id', TEST_ACCOUNTS.creator3.authId);
  console.log(`   ${TEST_ACCOUNTS.creator3.email} → creator: ${cr3TypeErr ? cr3TypeErr.message : 'ok'}`);

  // 2b. Ensure creator_profiles exist for creator accounts
  console.log('\n2b. Ensuring creator profiles...');
  for (const [role, acct] of Object.entries(TEST_ACCOUNTS)) {
    if (!acct.creatorProfileId) continue;
    const { data: existingProfile } = await supabase
      .from('creator_profiles')
      .select('id')
      .eq('id', acct.creatorProfileId)
      .single();
    if (!existingProfile) {
      const { error } = await supabase.from('creator_profiles').insert({
        id: acct.creatorProfileId,
        user_id: acct.authId,
        display_name: role === 'creator1' ? 'Test Creator 1' : 'Test Creator 3',
        bio: 'E2E test creator profile',
        verification_status: 'verified',
      });
      console.log(`   ${acct.email} profile: ${error ? error.message : 'created'}`);
    } else {
      console.log(`   ${acct.email} profile: exists`);
    }
  }

  // 3. Find the business's active campaign
  console.log('\n3. Checking campaigns...');
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, title, status, restaurant_id')
    .eq('owner_id', TEST_ACCOUNTS.business.authId)
    .eq('status', 'active');

  let campaign = campaigns?.[0];
  if (!campaign) {
    // Create one
    const { data: restaurants } = await supabase.from('restaurants').select('id').limit(1);
    const { data: newCampaign, error } = await supabase
      .from('campaigns')
      .insert({
        owner_id: TEST_ACCOUNTS.business.authId,
        restaurant_id: restaurants?.[0]?.id,
        title: 'Test Campaign',
        name: 'Test Campaign',
        description: 'E2E test campaign for automated testing.',
        budget_cents: 15000,
        campaign_type: 'paid',
        status: 'active',
        total_deliverables: 3,
        max_creators: 5,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();
    if (error) {
      console.error('   Campaign create failed:', error.message);
      process.exit(1);
    }
    campaign = newCampaign;
    console.log(`   Created: ${campaign.title} (${campaign.id})`);
  } else {
    console.log(`   Existing: ${campaign.title} (${campaign.id})`);
  }

  // 4. Ensure accepted application for test-creator1
  console.log('\n4. Ensuring applications...');
  const creator = TEST_ACCOUNTS.creator1;
  const { data: existingApp } = await supabase
    .from('campaign_applications')
    .select('id, status')
    .eq('campaign_id', campaign.id)
    .eq('creator_id', creator.creatorProfileId)
    .single();

  let application;
  if (existingApp) {
    if (existingApp.status !== 'accepted') {
      await supabase
        .from('campaign_applications')
        .update({ status: 'accepted', reviewed_at: new Date().toISOString() })
        .eq('id', existingApp.id);
      console.log(`   ${creator.email}: updated to accepted (${existingApp.id})`);
    } else {
      console.log(`   ${creator.email}: already accepted (${existingApp.id})`);
    }
    application = existingApp;
  } else {
    const { data: newApp, error } = await supabase
      .from('campaign_applications')
      .insert({
        campaign_id: campaign.id,
        creator_id: creator.creatorProfileId,
        status: 'accepted',
        proposed_rate_cents: 15000,
        cover_letter: 'E2E test application',
        proposed_deliverables: '1 Reel + 1 TikTok',
        reviewed_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) {
      console.error(`   Application failed: ${error.message}`);
      process.exit(1);
    }
    application = newApp;
    console.log(`   ${creator.email}: created accepted (${application.id})`);
  }

  // 5. Ensure deliverables exist
  console.log('\n5. Ensuring deliverables...');
  const { data: existingDels } = await supabase
    .from('campaign_deliverables')
    .select('id')
    .eq('campaign_application_id', application.id);

  if (existingDels?.length >= 2) {
    console.log(`   Already has ${existingDels.length} deliverables, skipping.`);
  } else {
    const deliverables = [
      { platform: 'instagram', type: 'reel', url: 'https://instagram.com/reel/E2E_TEST' },
      { platform: 'tiktok', type: 'video', url: 'https://tiktok.com/@test/E2E_TEST' },
    ];
    for (const d of deliverables) {
      const { error } = await supabase.from('campaign_deliverables').insert({
        campaign_application_id: application.id,
        campaign_id: campaign.id,
        creator_id: creator.creatorProfileId,
        restaurant_id: campaign.restaurant_id,
        content_type: d.type,
        social_platform: d.platform,
        status: 'pending_review',
        content_url: d.url,
        caption: 'E2E test content',
        submitted_at: new Date().toISOString(),
      });
      console.log(`   ${d.platform}/${d.type}: ${error ? error.message : 'ok'}`);
    }
  }

  console.log('\n✅ E2E test data ready!');
  console.log('\nAccounts (password: 000000):');
  console.log(`  Business: ${TEST_ACCOUNTS.business.email}`);
  console.log(`  Creator:  ${TEST_ACCOUNTS.creator1.email}`);
  console.log(`  Campaign: ${campaign.title} (${campaign.id})`);
}

seed().catch((err) => {
  console.error('\n❌ Fatal:', err.message);
  process.exit(1);
});
