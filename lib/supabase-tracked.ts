/**
 * Supabase client with agent-expo tracking
 *
 * This wraps the Supabase client to track all database operations
 * for AI agent verification. Only active in development mode.
 */

import { supabase } from './supabase';

// Re-export the original supabase client as default
export { supabase };

// Export tracked version for dev mode
let trackedSupabase = supabase;

if (__DEV__) {
  try {
    const { wrapSupabaseClient } = require('@agent-expo/bridge');
    trackedSupabase = wrapSupabaseClient(supabase);
    console.log('[agent-expo] Supabase tracking enabled');
  } catch (e) {
    // agent-expo bridge not installed, use regular client
    console.log('[agent-expo] Bridge not installed, using regular Supabase client');
  }
}

export { trackedSupabase };
