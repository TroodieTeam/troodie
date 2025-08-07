// Debug script to check community posts
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client (replace with your actual values)
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'your-project-url';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugCommunityPosts() {
  console.log('🔍 Debugging community posts...\n');

  try {
    // 1. Check post_communities table
    console.log('1. Checking post_communities table:');
    const { data: postCommunities, error: pcError } = await supabase
      .from('post_communities')
      .select(`
        id,
        post_id,
        community_id,
        added_by,
        added_at,
        posts!inner(id, caption, user_id),
        communities!inner(id, name)
      `)
      .order('added_at', { ascending: false })
      .limit(10);

    if (pcError) {
      console.error('❌ Error fetching post_communities:', pcError);
    } else {
      console.log(`📊 Found ${postCommunities?.length || 0} post-community relationships`);
      postCommunities?.forEach(pc => {
        console.log(`  - Post "${pc.posts.caption?.substring(0, 50) || 'No caption'}" → Community "${pc.communities.name}"`);
      });
    }
    console.log('');

    // 2. Check recent posts
    console.log('2. Checking recent posts:');
    const { data: recentPosts, error: postsError } = await supabase
      .from('posts')
      .select('id, caption, user_id, post_type, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (postsError) {
      console.error('❌ Error fetching recent posts:', postsError);
    } else {
      console.log(`📝 Found ${recentPosts?.length || 0} recent posts:`);
      recentPosts?.forEach(post => {
        console.log(`  - ${post.id}: "${post.caption?.substring(0, 50) || 'No caption'}" (${post.post_type})`);
      });
    }
    console.log('');

    // 3. Check communities
    console.log('3. Checking communities:');
    const { data: communities, error: communitiesError } = await supabase
      .from('communities')
      .select('id, name, member_count')
      .order('created_at', { ascending: false })
      .limit(5);

    if (communitiesError) {
      console.error('❌ Error fetching communities:', communitiesError);
    } else {
      console.log(`🏘️ Found ${communities?.length || 0} communities:`);
      communities?.forEach(community => {
        console.log(`  - ${community.name} (${community.member_count} members)`);
      });
    }
    console.log('');

    // 4. Test community posts query
    if (communities && communities.length > 0) {
      const communityId = communities[0].id;
      console.log(`4. Testing community posts query for "${communities[0].name}":`)
      
      const { data: communityPosts, error: cpError } = await supabase
        .from('post_communities')
        .select(`
          post_id,
          added_at,
          posts!inner(
            id,
            caption,
            user_id,
            post_type,
            created_at
          )
        `)
        .eq('community_id', communityId)
        .order('added_at', { ascending: false });

      if (cpError) {
        console.error('❌ Error fetching community posts:', cpError);
      } else {
        console.log(`📊 Found ${communityPosts?.length || 0} posts in this community`);
        communityPosts?.forEach(cp => {
          console.log(`  - "${cp.posts.caption?.substring(0, 50) || 'No caption'}" (${cp.posts.post_type})`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Debug script error:', error);
  }
}

// Run the debug script
debugCommunityPosts().then(() => {
  console.log('✅ Debug complete');
}).catch(error => {
  console.error('❌ Debug script failed:', error);
});