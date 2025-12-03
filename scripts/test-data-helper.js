#!/usr/bin/env node

/**
 * Test Data Helper Script
 * 
 * Utility to query test data IDs from the test data JSON files.
 * Helps generate SQL queries for test setup scenarios.
 * 
 * Usage:
 *   node scripts/test-data-helper.js users
 *   node scripts/test-data-helper.js restaurants
 *   node scripts/test-data-helper.js creator-profiles
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data', 'test-data', 'dev');

function loadTestData(type) {
  const fileMap = {
    'users': 'users.json',
    'restaurants': 'restaurants.json',
    'creator-profiles': 'creator_profiles.json',
    'campaigns': 'campaigns.json',
    'applications': 'campaign_applications.json',
    'deliverables': 'deliverables.json',
    'posts': 'posts.json',
  };

  const filename = fileMap[type];
  if (!filename) {
    console.error(`Unknown data type: ${type}`);
    console.error(`Available types: ${Object.keys(fileMap).join(', ')}`);
    process.exit(1);
  }

  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) {
    console.error(`File not found: ${filepath}`);
    process.exit(1);
  }

  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

function printUserInfo(data) {
  console.log('\n📋 Test Users:');
  console.log('─'.repeat(60));
  data.users.forEach(user => {
    console.log(`\n${user.account_type.toUpperCase()}:`);
    console.log(`  Email: ${user.email}`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Purpose: ${user.purpose}`);
  });
}

function printRestaurantInfo(data) {
  console.log('\n🍽️  Test Restaurants:');
  console.log('─'.repeat(60));
  data.restaurants.forEach((restaurant, idx) => {
    console.log(`\n${idx + 1}. ${restaurant.name}`);
    console.log(`   Status: ${restaurant.status}`);
    console.log(`   Purpose: ${restaurant.purpose}`);
    if (restaurant.claimed_by) {
      console.log(`   Claimed by: ${restaurant.claimed_by}`);
    }
  });
  
  if (data.query_to_find_ids) {
    console.log('\n📝 SQL Queries:');
    Object.entries(data.query_to_find_ids).forEach(([name, query]) => {
      console.log(`\n${name}:`);
      console.log(query);
    });
  }
}

function printCreatorProfileInfo(data) {
  console.log('\n👤 Creator Profiles:');
  console.log('─'.repeat(60));
  data.profiles.forEach(profile => {
    console.log(`\nUser: ${profile.user_email}`);
    console.log(`  User ID: ${profile.user_id}`);
    console.log(`  Purpose: ${profile.purpose}`);
    if (profile.query_to_find_id) {
      console.log(`\n  Query to find profile ID:`);
      console.log(`  ${profile.query_to_find_id}`);
    }
  });
}

function printGenericInfo(data, type) {
  console.log(`\n📦 ${type}:`);
  console.log('─'.repeat(60));
  if (data.description) {
    console.log(`\n${data.description}`);
  }
  
  const items = data[Object.keys(data).find(k => Array.isArray(data[k]))];
  if (items && items.length > 0) {
    items.forEach((item, idx) => {
      console.log(`\n${idx + 1}. ${item.purpose || 'Item'}`);
      if (item.query_to_find_id) {
        console.log(`   Query: ${item.query_to_find_id.substring(0, 80)}...`);
      }
    });
  }
  
  // Print queries if available
  const queries = Object.entries(data).filter(([k, v]) => k.includes('query'));
  if (queries.length > 0) {
    console.log('\n📝 SQL Queries:');
    queries.forEach(([name, query]) => {
      console.log(`\n${name}:`);
      console.log(query);
    });
  }
}

function main() {
  const type = process.argv[2];
  
  if (!type) {
    console.log('Usage: node scripts/test-data-helper.js <type>');
    console.log('\nAvailable types:');
    console.log('  - users');
    console.log('  - restaurants');
    console.log('  - creator-profiles');
    console.log('  - campaigns');
    console.log('  - applications');
    console.log('  - deliverables');
    console.log('  - posts');
    process.exit(1);
  }

  try {
    const data = loadTestData(type);
    
    switch (type) {
      case 'users':
        printUserInfo(data);
        break;
      case 'restaurants':
        printRestaurantInfo(data);
        break;
      case 'creator-profiles':
        printCreatorProfileInfo(data);
        break;
      default:
        printGenericInfo(data, type);
    }
    
    console.log('\n');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();

