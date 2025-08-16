import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { targetType, targetId, reason, description } = await req.json();

    // Validate input
    const validTargetTypes = ['post', 'comment', 'user', 'board', 'community'];
    const validReasons = [
      'spam', 'harassment', 'hate_speech', 'violence', 
      'sexual_content', 'false_information', 'intellectual_property',
      'self_harm', 'illegal_activity', 'other'
    ];

    if (!targetType || !validTargetTypes.includes(targetType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid target type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!targetId) {
      return new Response(
        JSON.stringify({ error: 'Target ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!reason || !validReasons.includes(reason)) {
      return new Response(
        JSON.stringify({ error: 'Invalid reason' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has already reported this content
    const { data: existingReport } = await supabase
      .from('reports')
      .select('id')
      .eq('reporter_id', user.id)
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .single();

    if (existingReport) {
      return new Response(
        JSON.stringify({ 
          error: 'You have already reported this content',
          reportId: existingReport.id 
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the target exists based on type
    let targetExists = false;
    
    switch (targetType) {
      case 'post':
        const { data: post } = await supabase
          .from('posts')
          .select('id')
          .eq('id', targetId)
          .single();
        targetExists = !!post;
        break;
        
      case 'comment':
        const { data: comment } = await supabase
          .from('post_comments')
          .select('id')
          .eq('id', targetId)
          .single();
        targetExists = !!comment;
        break;
        
      case 'user':
        const { data: targetUser } = await supabase
          .from('users')
          .select('id')
          .eq('id', targetId)
          .single();
        targetExists = !!targetUser;
        break;
        
      case 'board':
        const { data: board } = await supabase
          .from('boards')
          .select('id')
          .eq('id', targetId)
          .single();
        targetExists = !!board;
        break;
        
      case 'community':
        const { data: community } = await supabase
          .from('communities')
          .select('id')
          .eq('id', targetId)
          .single();
        targetExists = !!community;
        break;
    }

    if (!targetExists) {
      return new Response(
        JSON.stringify({ error: 'Target content not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create the report
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .insert({
        reporter_id: user.id,
        target_type: targetType,
        target_id: targetId,
        reason: reason,
        description: description || null,
        status: 'pending'
      })
      .select()
      .single();

    if (reportError) {
      console.error('Error creating report:', reportError);
      return new Response(
        JSON.stringify({ error: 'Failed to submit report' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the report for monitoring
    console.log(`Report created: ${report.id} by user ${user.id} for ${targetType} ${targetId}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Report submitted successfully',
        reportId: report.id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Submit report error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});