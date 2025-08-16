import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Extract JWT token from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseServiceRoleKey || !supabaseAnonKey) {
      console.error('Supabase configuration missing');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // First, verify the user token using a client with the user's token
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    // Get the current user from the token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      console.error('User authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const userId = user.id;

    // Now use the admin client to delete the user data
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Start transaction to delete all user data
    console.log(`Starting account deletion for user: ${userId}`);

    // Delete or anonymize user data from all related tables
    // The order matters due to foreign key constraints

    // 1. Delete push tokens
    const { error: pushTokensError } = await supabaseAdmin
      .from('push_tokens')
      .delete()
      .eq('user_id', userId);
    
    if (pushTokensError) {
      console.error('Error deleting push tokens:', pushTokensError);
    }

    // 2. Delete notification preferences
    const { error: notifPrefsError } = await supabaseAdmin
      .from('notification_preferences')
      .delete()
      .eq('user_id', userId);
    
    if (notifPrefsError) {
      console.error('Error deleting notification preferences:', notifPrefsError);
    }

    // 3. Delete notifications
    const { error: notificationsError } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('user_id', userId);
    
    if (notificationsError) {
      console.error('Error deleting notifications:', notificationsError);
    }

    // 4. Delete blocked users and reports
    const { error: blockedUsersError } = await supabaseAdmin
      .from('blocked_users')
      .delete()
      .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
    
    if (blockedUsersError) {
      console.error('Error deleting blocked users:', blockedUsersError);
    }

    const { error: reportsError } = await supabaseAdmin
      .from('reports')
      .delete()
      .eq('reporter_id', userId);
    
    if (reportsError) {
      console.error('Error deleting reports:', reportsError);
    }

    // 5. Delete user relationships (followers/following)
    const { error: relationshipsError } = await supabaseAdmin
      .from('user_relationships')
      .delete()
      .or(`follower_id.eq.${userId},following_id.eq.${userId}`);
    
    if (relationshipsError) {
      console.error('Error deleting user relationships:', relationshipsError);
    }

    // 6. Delete post interactions (likes, comments, saves)
    const { error: postLikesError } = await supabaseAdmin
      .from('post_likes')
      .delete()
      .eq('user_id', userId);
    
    if (postLikesError) {
      console.error('Error deleting post likes:', postLikesError);
    }

    const { error: postCommentsError } = await supabaseAdmin
      .from('post_comments')
      .delete()
      .eq('user_id', userId);
    
    if (postCommentsError) {
      console.error('Error deleting post comments:', postCommentsError);
    }

    const { error: postSavesError } = await supabaseAdmin
      .from('post_saves')
      .delete()
      .eq('user_id', userId);
    
    if (postSavesError) {
      console.error('Error deleting post saves:', postSavesError);
    }

    // 7. Delete restaurant saves
    const { error: restaurantSavesError } = await supabaseAdmin
      .from('restaurant_saves')
      .delete()
      .eq('user_id', userId);
    
    if (restaurantSavesError) {
      console.error('Error deleting restaurant saves:', restaurantSavesError);
    }

    // 8. Delete community memberships
    const { error: communityMembersError } = await supabaseAdmin
      .from('community_members')
      .delete()
      .eq('user_id', userId);
    
    if (communityMembersError) {
      console.error('Error deleting community memberships:', communityMembersError);
    }

    // 9. Delete community posts
    const { error: communityPostsError } = await supabaseAdmin
      .from('community_posts')
      .delete()
      .eq('user_id', userId);
    
    if (communityPostsError) {
      console.error('Error deleting community posts:', communityPostsError);
    }

    // 10. Delete share analytics
    const { error: shareAnalyticsError } = await supabaseAdmin
      .from('share_analytics')
      .delete()
      .eq('user_id', userId);
    
    if (shareAnalyticsError) {
      console.error('Error deleting share analytics:', shareAnalyticsError);
    }

    // 11. Anonymize posts (keep for data integrity but remove user association)
    const { error: postsError } = await supabaseAdmin
      .from('posts')
      .update({ 
        user_id: null,
        caption: '[Deleted User]',
        privacy: 'private'
      })
      .eq('user_id', userId);
    
    if (postsError) {
      console.error('Error anonymizing posts:', postsError);
    }

    // 12. Delete boards
    const { error: boardsError } = await supabaseAdmin
      .from('boards')
      .delete()
      .eq('user_id', userId);
    
    if (boardsError) {
      console.error('Error deleting boards:', boardsError);
    }

    // 13. Update any restaurants owned by this user
    const { error: restaurantsError } = await supabaseAdmin
      .from('restaurants')
      .update({ 
        owner_id: null,
        is_claimed: false
      })
      .eq('owner_id', userId);
    
    if (restaurantsError) {
      console.error('Error updating restaurant ownership:', restaurantsError);
    }

    // 14. Delete restaurant images uploaded by user
    const { error: restaurantImagesError } = await supabaseAdmin
      .from('restaurant_images')
      .delete()
      .eq('user_id', userId);
    
    if (restaurantImagesError) {
      console.error('Error deleting restaurant images:', restaurantImagesError);
    }

    // 15. Delete user profile from users table
    const { error: userProfileError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);
    
    if (userProfileError) {
      console.error('Error deleting user profile:', userProfileError);
    }

    // 16. Finally, delete the auth user using Admin API
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (authError) {
      console.error('Error deleting auth user:', authError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to delete authentication account',
          details: authError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Successfully deleted account for user: ${userId}`);

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Account and all associated data have been permanently deleted'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Account deletion error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'An unexpected error occurred',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});