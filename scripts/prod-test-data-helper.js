#!/usr/bin/env node

/**
 * Production Test Data Helper Script
 * 
 * Utility to query production test data IDs from the database.
 * Helps generate SQL queries for production test scenarios.
 * 
 * Usage:
 *   node scripts/prod-test-data-helper.js users
 *   node scripts/prod-test-data-helper.js restaurants
 *   node scripts/prod-test-data-helper.js creator-profiles
 * 
 * Note: This script outputs SQL queries that should be run in Supabase SQL Editor
 *       against the production database.
 */

const DATA_TYPES = {
  'users': {
    description: 'Production test users (@bypass.com domain)',
    query: `
-- Check which auth users are missing from public.users
SELECT 
  au.id,
  au.email,
  au.created_at as auth_created_at,
  CASE WHEN pu.id IS NOT NULL THEN '✅ In public.users' ELSE '❌ MISSING from public.users' END as sync_status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email LIKE '%@bypass.com' OR au.email LIKE '%@troodie.test'
ORDER BY au.email;
    `.trim()
  },
  'sync-users': {
    description: 'Sync missing auth users to public.users table',
    query: `
-- Insert missing users into public.users
INSERT INTO public.users (id, email, created_at, updated_at, account_type)
SELECT 
  au.id,
  au.email,
  COALESCE(au.created_at, NOW()),
  COALESCE(au.updated_at, NOW()),
  CASE
    WHEN au.email LIKE '%consumer%@bypass.com' OR au.email LIKE '%consumer%@troodie.test' THEN 'consumer'
    WHEN au.email LIKE '%creator%@bypass.com' OR au.email LIKE '%creator%@troodie.test' THEN 'creator'
    WHEN au.email LIKE '%business%@bypass.com' OR au.email LIKE '%business%@troodie.test' THEN 'business'
    ELSE 'consumer'
  END as account_type
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
  AND (au.email LIKE '%@bypass.com' OR au.email LIKE '%@troodie.test')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  account_type = EXCLUDED.account_type,
  updated_at = NOW();
    `.trim()
  },
  'restaurants': {
    description: 'Restaurants claimed by production test users',
    query: `
-- Get restaurants claimed by test users
SELECT 
  r.id,
  r.name,
  r.city,
  r.state,
  u.email as claimed_by_email,
  u.id as claimed_by_user_id,
  rc.status as claim_status,
  r.is_test_restaurant
FROM restaurants r
JOIN restaurant_claims rc ON rc.restaurant_id = r.id
JOIN users u ON rc.user_id = u.id
WHERE u.is_test_account = true
  AND rc.status = 'verified'
ORDER BY r.name;
    `.trim()
  },
  'creator-profiles': {
    description: 'Creator profiles for production test users',
    query: `
-- Get creator profiles for test users
SELECT 
  cp.id as profile_id,
  cp.user_id,
  u.email,
  cp.display_name,
  cp.bio,
  cp.location,
  cp.availability_status,
  cp.open_to_collabs,
  cp.created_at
FROM creator_profiles cp
JOIN users u ON cp.user_id = u.id
WHERE u.is_test_account = true
ORDER BY u.email;
    `.trim()
  },
  'campaigns': {
    description: 'Campaigns created by production test business users',
    query: `
-- Get campaigns created by test business users
SELECT 
  c.id,
  c.title,
  c.status,
  c.restaurant_id,
  r.name as restaurant_name,
  u.email as owner_email,
  c.created_at,
  c.is_test_campaign
FROM campaigns c
JOIN users u ON c.owner_id = u.id
LEFT JOIN restaurants r ON c.restaurant_id = r.id
WHERE u.is_test_account = true
ORDER BY c.created_at DESC;
    `.trim()
  },
  'applications': {
    description: 'Campaign applications from test creators',
    query: `
-- Get campaign applications from test creators
SELECT 
  ca.id,
  ca.campaign_id,
  c.title as campaign_title,
  ca.creator_id,
  cp.display_name as creator_name,
  u.email as creator_email,
  ca.status,
  ca.created_at
FROM campaign_applications ca
JOIN campaigns c ON ca.campaign_id = c.id
JOIN creator_profiles cp ON ca.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
WHERE u.is_test_account = true
ORDER BY ca.created_at DESC;
    `.trim()
  },
  'deliverables': {
    description: 'Deliverables submitted by test creators',
    query: `
-- Get deliverables submitted by test creators
SELECT 
  cd.id,
  cd.campaign_id,
  c.title as campaign_title,
  cd.creator_id,
  cp.display_name as creator_name,
  u.email as creator_email,
  cd.status,
  cd.deliverable_index,
  cd.submitted_at,
  cd.auto_approved_at
FROM campaign_deliverables cd
JOIN campaigns c ON cd.campaign_id = c.id
JOIN creator_profiles cp ON cd.creator_id = cp.id
JOIN users u ON cp.user_id = u.id
WHERE u.is_test_account = true
ORDER BY cd.submitted_at DESC;
    `.trim()
  },
  'posts': {
    description: 'Posts created by test users',
    query: `
-- Get posts created by test users
SELECT 
  p.id,
  p.user_id,
  u.email,
  p.restaurant_id,
  r.name as restaurant_name,
  p.content,
  p.created_at,
  (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) as like_count,
  (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count
FROM posts p
JOIN users u ON p.user_id = u.id
LEFT JOIN restaurants r ON p.restaurant_id = r.id
WHERE u.is_test_account = true
ORDER BY p.created_at DESC
LIMIT 50;
    `.trim()
  }
};

function printUsage() {
  console.log('Usage: node scripts/prod-test-data-helper.js <type>');
  console.log('\nAvailable types:');
  Object.keys(DATA_TYPES).forEach(type => {
    console.log(`  - ${type}`);
  });
  console.log('\nNote: This script outputs SQL queries to run in Supabase SQL Editor.');
  console.log('      Test users are identified by @bypass.com email domain.');
}

function main() {
  const type = process.argv[2];
  
  if (!type) {
    printUsage();
    process.exit(1);
  }

  const dataType = DATA_TYPES[type];
  if (!dataType) {
    console.error(`\n❌ Unknown data type: ${type}`);
    printUsage();
    process.exit(1);
  }

  console.log(`\n📋 ${dataType.description}`);
  console.log('─'.repeat(70));
  console.log('\n📝 SQL Query:\n');
  console.log(dataType.query);
  console.log('\n');
  console.log('💡 Copy and paste this query into Supabase SQL Editor to view results.\n');
}

main();
