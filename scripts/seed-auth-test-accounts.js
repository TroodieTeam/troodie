#!/usr/bin/env node

/**
 * Seed script to create test auth users with passwords
 * Uses Supabase Admin API to insert directly into auth.users
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.development' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.development');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const TEST_ACCOUNTS = [
  {
    email: 'admin@troodieapp.com',
    password: 'BypassPassword123',
    role: 'admin',
    accountType: 'business'
  },
  {
    email: 'kouame@troodieapp.com',
    password: 'BypassPassword123',
    role: 'admin',
    accountType: 'business'
  },
  {
    email: 'creator1@troodieapp.com', 
    password: 'BypassPassword123',
    role: 'creator',
    accountType: 'creator'
  },
  {
    email: 'restaurant1@troodieapp.com',
    password: 'BypassPassword123', 
    role: 'restaurant',
    accountType: 'business'
  },
  {
    email: 'multi_role@troodieapp.com',
    password: 'BypassPassword123',
    role: 'creator_business', 
    accountType: 'business'
  }
];

async function createAuthUser(account) {
  try {
    console.log(`Creating auth user: ${account.email}`);
    
    // First check if user already exists
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error(`❌ Failed to list users:`, listError.message);
      return null;
    }
    
    const existingUser = existingUsers.users.find(u => u.email === account.email);
    if (existingUser) {
      console.log(`⚠️  User ${account.email} already exists (ID: ${existingUser.id})`);
      return existingUser;
    }
    
    // Use regular signup flow instead of admin API (works better with test domains)
    const { data, error } = await supabase.auth.signUp({
      email: account.email,
      password: account.password,
      options: {
        data: {
          role: account.role
        }
      }
    });

    if (error) {
      console.error(`❌ Failed to create auth user ${account.email}:`, error.message);
      return null;
    }

    if (!data.user) {
      console.error(`❌ No user returned for ${account.email}`);
      return null;
    }

    // Confirm the user immediately using admin API
    const { error: confirmError } = await supabase.auth.admin.updateUserById(data.user.id, {
      email_confirm: true
    });

    if (confirmError) {
      console.error(`❌ Failed to confirm user ${account.email}:`, confirmError.message);
      return null;
    }

    console.log(`✅ Created and confirmed auth user: ${account.email} (ID: ${data.user.id})`);
    return data.user;
  } catch (error) {
    console.error(`❌ Unexpected error creating ${account.email}:`, error.message);
    return null;
  }
}

async function upsertPublicUser(authUser, account) {
  try {
    console.log(`Upserting public user: ${account.email}`);
    
    // Generate unique username by adding timestamp
    const baseUsername = account.email.split('@')[0];
    const uniqueUsername = `${baseUsername}_${Date.now()}`;
    
    const { data, error } = await supabase
      .from('users')
      .upsert({
        id: authUser.id,
        email: account.email,
        username: uniqueUsername,
        name: account.email.split('@')[0].replace('_', ' '),
        account_type: account.accountType,
        role: account.role === 'admin' ? 'admin' : null,
        is_verified: true,
        profile_completion: 100
      }, {
        onConflict: 'id'
      });

    if (error) {
      console.error(`❌ Failed to upsert public user ${account.email}:`, error.message);
      return false;
    }

    console.log(`✅ Upserted public user: ${account.email} (username: ${uniqueUsername})`);
    return true;
  } catch (error) {
    console.error(`❌ Unexpected error upserting ${account.email}:`, error.message);
    return false;
  }
}

async function createCreatorProfile(authUser, account) {
  if (account.accountType !== 'creator') return true;

  try {
    console.log(`Creating creator profile: ${account.email}`);
    
    const { data, error } = await supabase
      .from('creator_profiles')
      .upsert({
        user_id: authUser.id,
        specialties: ['Restaurant Reviews', 'Food Photography'],
        social_links: { instagram: '@creator1' },
        verification_status: 'verified',
        display_name: account.email.split('@')[0].replace('_', ' '),
        instant_approved: true
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error(`❌ Failed to create creator profile ${account.email}:`, error.message);
      return false;
    }

    console.log(`✅ Created creator profile: ${account.email}`);
    return true;
  } catch (error) {
    console.error(`❌ Unexpected error creating creator profile ${account.email}:`, error.message);
    return false;
  }
}

async function seedTestAccounts() {
  console.log('🌱 Starting test account seeding...\n');

  let successCount = 0;
  let totalCount = TEST_ACCOUNTS.length;

  for (let i = 0; i < TEST_ACCOUNTS.length; i++) {
    const account = TEST_ACCOUNTS[i];
    console.log(`\n--- Processing ${account.email} (${i + 1}/${totalCount}) ---`);
    
    // Add small delay between user creations to avoid rate limits
    if (i > 0) {
      console.log('⏳ Waiting 1 second before next user...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Create auth user
    const authUser = await createAuthUser(account);
    if (!authUser) {
      console.log(`⏭️  Skipping ${account.email} due to auth user creation failure`);
      continue;
    }

    // Upsert public user profile
    const userSuccess = await upsertPublicUser(authUser, account);
    if (!userSuccess) {
      console.log(`⏭️  Skipping ${account.email} due to public user creation failure`);
      continue;
    }

    // Create creator profile if needed
    const creatorSuccess = await createCreatorProfile(authUser, account);
    if (!creatorSuccess) {
      console.log(`⚠️  Creator profile creation failed for ${account.email}, but continuing...`);
    }

    successCount++;
  }

  console.log(`\n🎉 Seeding complete! ${successCount}/${totalCount} accounts created successfully.`);
  
  if (successCount === totalCount) {
    console.log('\n✅ All test accounts are ready to use!');
    console.log('📧 Test emails:');
    TEST_ACCOUNTS.forEach(account => {
      console.log(`   - ${account.email} (password: ${account.password})`);
    });
    console.log('\n🔐 OTP Code for all test accounts: 000000');
  } else {
    console.log('\n⚠️  Some accounts failed to create. Check the errors above.');
  }
}

// Run the seeding
seedTestAccounts().catch(error => {
  console.error('💥 Fatal error during seeding:', error);
  process.exit(1);
});
