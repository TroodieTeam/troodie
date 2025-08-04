import { supabase } from '@/lib/supabase';

export async function seedCommunities() {
  try {
    
    // Check if communities already exist
    const { data: existingCommunities, error: checkError } = await supabase
      .from('communities')
      .select('id')
      .limit(1);
    
    if (checkError) {
      console.error('Error checking communities:', checkError);
      return false;
    }
    
    if (existingCommunities && existingCommunities.length > 0) {
      return true;
    }
    
    
    // Featured communities
    const featuredCommunities = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Charlotte Foodies',
        description: 'The ultimate community for Charlotte food enthusiasts. Share your favorite spots, discover hidden gems, and connect with fellow food lovers!',
        cover_image_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800',
        category: 'Local',
        location: 'Charlotte',
        type: 'public',
        member_count: 1250,
        activity_level: 95,
        is_active: true,
        is_featured: true,
        trending_score: 85.5,
        tags: ['charlotte', 'local-eats', 'foodie'],
        cuisines: ['American', 'Southern', 'International'],
        post_count: 320
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Best Brunch Spots',
        description: 'Weekend brunch lovers unite! Share your favorite brunch experiences, from bottomless mimosas to perfect eggs benedict.',
        cover_image_url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800',
        category: 'Cuisine',
        type: 'public',
        member_count: 890,
        activity_level: 88,
        is_active: true,
        is_featured: true,
        trending_score: 78.2,
        tags: ['brunch', 'weekend', 'breakfast'],
        cuisines: ['American', 'French', 'Cafe'],
        post_count: 245
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        name: 'Vegan & Plant-Based',
        description: 'Discover amazing plant-based dining options. From vegan comfort food to raw cuisine, share your meat-free finds!',
        cover_image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
        category: 'Dietary',
        type: 'public',
        member_count: 675,
        activity_level: 82,
        is_active: true,
        is_featured: true,
        trending_score: 72.8,
        tags: ['vegan', 'plant-based', 'healthy'],
        cuisines: ['Vegan', 'Vegetarian', 'Health Food'],
        post_count: 189
      }
    ];
    
    // Trending communities
    const trendingCommunities = [
      {
        id: '44444444-4444-4444-4444-444444444444',
        name: 'Taco Tuesday Crew',
        description: 'Every day is taco day! Share your favorite taco spots, from authentic street tacos to gourmet fusion.',
        cover_image_url: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800',
        category: 'Cuisine',
        type: 'public',
        member_count: 456,
        activity_level: 75,
        is_active: true,
        trending_score: 68.5,
        tags: ['tacos', 'mexican', 'tuesday'],
        cuisines: ['Mexican', 'Tex-Mex', 'Latin'],
        post_count: 156
      },
      {
        id: '55555555-5555-5555-5555-555555555555',
        name: 'Pizza Paradise',
        description: 'For the love of pizza! Share your favorite slices, from NY style to Neapolitan, deep dish to thin crust.',
        cover_image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800',
        category: 'Cuisine',
        type: 'public',
        member_count: 523,
        activity_level: 70,
        is_active: true,
        trending_score: 65.2,
        tags: ['pizza', 'italian', 'cheese'],
        cuisines: ['Italian', 'Pizza'],
        post_count: 178
      },
      {
        id: '66666666-6666-6666-6666-666666666666',
        name: 'Craft Beer & Bites',
        description: 'Pairing great food with amazing craft beers. Share your favorite breweries and the best bar bites!',
        cover_image_url: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=800',
        category: 'Beverage',
        type: 'public',
        member_count: 389,
        activity_level: 68,
        is_active: true,
        trending_score: 62.1,
        tags: ['beer', 'craft-beer', 'breweries'],
        cuisines: ['American', 'Bar Food', 'Gastropub'],
        post_count: 134
      },
      {
        id: '77777777-7777-7777-7777-777777777777',
        name: 'Date Night Dining',
        description: 'Romantic restaurants and special occasion spots. Share your favorite places for memorable dining experiences.',
        cover_image_url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
        category: 'Experience',
        type: 'public',
        member_count: 412,
        activity_level: 65,
        is_active: true,
        trending_score: 58.7,
        tags: ['date-night', 'romantic', 'fine-dining'],
        cuisines: ['French', 'Italian', 'Steakhouse'],
        post_count: 98
      },
      {
        id: '88888888-8888-8888-8888-888888888888',
        name: 'South End Eats',
        description: 'Exploring all the amazing food options in Charlotte\'s South End. From food halls to fine dining!',
        cover_image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
        category: 'Local',
        location: 'Charlotte',
        type: 'public',
        member_count: 345,
        activity_level: 72,
        is_active: true,
        trending_score: 64.3,
        tags: ['south-end', 'charlotte', 'neighborhood'],
        cuisines: ['American', 'International', 'Modern'],
        post_count: 112
      }
    ];
    
    // Regular communities for recommendations
    const regularCommunities = [
      {
        id: '99999999-9999-9999-9999-999999999999',
        name: 'Budget Bites',
        description: 'Great food doesn\'t have to break the bank! Share affordable dining options and deals.',
        cover_image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
        category: 'Budget',
        type: 'public',
        member_count: 267,
        activity_level: 55,
        is_active: true,
        tags: ['budget', 'deals', 'affordable'],
        cuisines: ['Fast Food', 'Casual', 'Street Food'],
        post_count: 89
      },
      {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        name: 'Sushi Society',
        description: 'For sushi lovers and enthusiasts. Share your favorite rolls, omakase experiences, and hidden gems.',
        cover_image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800',
        category: 'Cuisine',
        type: 'public',
        member_count: 298,
        activity_level: 60,
        is_active: true,
        tags: ['sushi', 'japanese', 'seafood'],
        cuisines: ['Japanese', 'Sushi'],
        post_count: 76
      },
      {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        name: 'Coffee & Cafes',
        description: 'Your daily dose of caffeine culture. Share cozy cafes, specialty roasters, and the perfect cup.',
        cover_image_url: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800',
        category: 'Beverage',
        type: 'public',
        member_count: 423,
        activity_level: 78,
        is_active: true,
        tags: ['coffee', 'cafe', 'espresso'],
        cuisines: ['Cafe', 'Bakery', 'Coffee Shop'],
        post_count: 145
      },
      {
        id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        name: 'BBQ Nation',
        description: 'Celebrating all things barbecue! From Carolina style to Texas brisket, share your smoky favorites.',
        cover_image_url: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=800',
        category: 'Cuisine',
        type: 'public',
        member_count: 356,
        activity_level: 62,
        is_active: true,
        tags: ['bbq', 'barbecue', 'smoked'],
        cuisines: ['BBQ', 'Southern', 'American'],
        post_count: 103
      }
    ];
    
    // Insert all communities
    const allCommunities = [...featuredCommunities, ...trendingCommunities, ...regularCommunities];
    
    const { error: insertError } = await supabase
      .from('communities')
      .insert(allCommunities);
    
    if (insertError) {
      console.error('Error inserting communities:', insertError);
      return false;
    }
    
    
    // Add some community activity for trending
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const activities = trendingCommunities.map(community => ({
        community_id: community.id,
        user_id: user.id,
        activity_type: 'visit',
        created_at: new Date().toISOString()
      }));
      
      await supabase
        .from('community_activity')
        .insert(activities);
    }
    
    return true;
  } catch (error) {
    console.error('Error in seedCommunities:', error);
    return false;
  }
}

// Function to clear all communities (for testing)
export async function clearCommunities() {
  try {
    const { error } = await supabase
      .from('communities')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (error) {
      console.error('Error clearing communities:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in clearCommunities:', error);
    return false;
  }
}