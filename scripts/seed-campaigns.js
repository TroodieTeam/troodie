const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.development' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Realistic campaign data with real restaurant vibes
const campaigns = [
  {
    title: "Spring Menu Launch - Content Creation",
    description: "We're launching our new spring menu featuring locally-sourced ingredients and need stunning visual content. Looking for creators to capture our seasonal dishes, cocktails, and the vibrant atmosphere. Must showcase farm-to-table story.",
    requirements: [
      "Minimum 10K followers on Instagram/TikTok",
      "Experience with food photography/videography",
      "Create 3 Reels and 5 static posts",
      "Highlight seasonal ingredients story",
      "Available for 2 visits in March"
    ],
    budget_cents: 150000, // $1,500
    campaign_type: "seasonal_launch",
    max_creators: 3,
    selected_creators_count: 1,
    restaurant_name: "The Garden Table",
    cuisine: "Farm-to-Table American",
    city: "Portland",
    image_url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80"
  },
  {
    title: "Weekend Brunch Experience",
    description: "Capture our legendary weekend brunch scene! We need content creators to showcase our bottomless mimosa brunch, signature eggs benedict variations, and lively weekend atmosphere. Perfect for lifestyle and food creators.",
    requirements: [
      "5K+ engaged followers",
      "Weekend availability",
      "Create Instagram Stories series",
      "1 TikTok showing brunch preparation",
      "Tag location and use campaign hashtag"
    ],
    budget_cents: 75000, // $750
    campaign_type: "brunch_promo",
    max_creators: 5,
    selected_creators_count: 2,
    restaurant_name: "Sunny Side Café",
    cuisine: "Brunch & Breakfast",
    city: "Austin",
    image_url: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&q=80"
  },
  {
    title: "Taco Tuesday Takeover",
    description: "Join our Taco Tuesday celebration! We're looking for creators to showcase our authentic street tacos, craft margaritas, and vibrant atmosphere. Must capture the energy of our Tuesday night crowd and highlight our taco varieties.",
    requirements: [
      "3K+ followers minimum",
      "Available Tuesday evenings",
      "Create engaging Reels/TikToks",
      "Showcase at least 3 taco varieties",
      "Include margarita pairings"
    ],
    budget_cents: 50000, // $500
    campaign_type: "weekly_special",
    max_creators: 8,
    selected_creators_count: 5,
    restaurant_name: "La Calle Tacos",
    cuisine: "Mexican Street Food",
    city: "Los Angeles",
    image_url: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&q=80"
  },
  {
    title: "Michelin Star Experience Documentation",
    description: "Document an exclusive dining experience at our Michelin-starred restaurant. Looking for sophisticated content creators who can capture the artistry of fine dining, from amuse-bouche to dessert. Black-tie dress code required.",
    requirements: [
      "50K+ followers with luxury lifestyle audience",
      "Professional photography equipment",
      "Experience with fine dining content",
      "Create long-form YouTube video or IG series",
      "Available for 3-hour dinner service"
    ],
    budget_cents: 500000, // $5,000
    campaign_type: "luxury_dining",
    max_creators: 2,
    selected_creators_count: 0,
    restaurant_name: "Le Bernardin NYC",
    cuisine: "French Fine Dining",
    city: "New York",
    image_url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80"
  },
  {
    title: "Sushi Making Masterclass",
    description: "Join our head chef for an exclusive sushi-making masterclass and omakase experience. Create educational content showing traditional techniques, knife skills, and the art of sushi preparation.",
    requirements: [
      "15K+ followers interested in Japanese culture",
      "Ability to create educational content",
      "4-hour time commitment",
      "Create tutorial-style content",
      "Professional video equipment preferred"
    ],
    budget_cents: 200000, // $2,000
    campaign_type: "educational",
    max_creators: 4,
    selected_creators_count: 1,
    restaurant_name: "Nobu Downtown",
    cuisine: "Japanese Sushi",
    city: "Miami",
    image_url: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800&q=80"
  },
  {
    title: "Pizza & Craft Beer Pairing Night",
    description: "Showcase our artisanal pizza and craft beer pairings! We're hosting a special tasting event for creators to experience our wood-fired pizzas paired with local craft beers. Great for food and beverage enthusiasts.",
    requirements: [
      "8K+ followers",
      "21+ years old",
      "Create content for both food and drinks",
      "Available Thursday evening",
      "Include beer tasting notes"
    ],
    budget_cents: 100000, // $1,000
    campaign_type: "event_coverage",
    max_creators: 6,
    selected_creators_count: 3,
    restaurant_name: "Brick Oven Brewhouse",
    cuisine: "Pizza & Brewery",
    city: "Denver",
    image_url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80"
  },
  {
    title: "Vegan Restaurant Grand Opening",
    description: "Be part of our grand opening celebration! We're launching the city's first 100% plant-based fine dining restaurant. Looking for creators passionate about sustainability, health, and innovative vegan cuisine.",
    requirements: [
      "Interest in vegan/sustainable lifestyle",
      "10K+ health-conscious followers",
      "Create opening week content series",
      "Highlight sustainability practices",
      "Available for soft opening event"
    ],
    budget_cents: 125000, // $1,250
    campaign_type: "grand_opening",
    max_creators: 10,
    selected_creators_count: 4,
    restaurant_name: "Planted Kitchen",
    cuisine: "Upscale Vegan",
    city: "San Francisco",
    image_url: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80"
  },
  {
    title: "BBQ Pitmaster Challenge",
    description: "Join our weekend BBQ challenge! Document the smoking process, meat preparation, and the ultimate BBQ feast. We need creators who can capture the authentic Texas BBQ experience from pit to plate.",
    requirements: [
      "5K+ followers",
      "Available for full-day shoot",
      "Create behind-the-scenes content",
      "Showcase different meat cuts",
      "Include pitmaster interview"
    ],
    budget_cents: 80000, // $800
    campaign_type: "behind_scenes",
    max_creators: 4,
    selected_creators_count: 2,
    restaurant_name: "Smokey Joe's BBQ",
    cuisine: "Texas BBQ",
    city: "Houston",
    image_url: "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=800&q=80"
  },
  {
    title: "Cocktail Hour Stories",
    description: "Create stunning content during our golden hour cocktail service. Focus on our signature cocktails, rooftop views, and sophisticated ambiance. Perfect for lifestyle and nightlife content creators.",
    requirements: [
      "21+ years old",
      "7K+ followers",
      "Golden hour availability (5-7 PM)",
      "Create cocktail preparation videos",
      "Capture rooftop ambiance"
    ],
    budget_cents: 90000, // $900
    campaign_type: "drinks_feature",
    max_creators: 5,
    selected_creators_count: 1,
    restaurant_name: "Sky Lounge",
    cuisine: "Cocktail Bar",
    city: "Chicago",
    image_url: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&q=80"
  },
  {
    title: "Dim Sum Sunday Special",
    description: "Showcase our traditional dim sum service! We need creators to capture the variety of dumplings, the tea ceremony, and the authentic Cantonese dining experience. Family-friendly content encouraged.",
    requirements: [
      "Experience with Asian cuisine content",
      "Sunday morning availability",
      "Create educational content about dim sum",
      "Family-friendly content welcome",
      "Minimum 3 posts required"
    ],
    budget_cents: 60000, // $600
    campaign_type: "cultural_cuisine",
    max_creators: 7,
    selected_creators_count: 4,
    restaurant_name: "Golden Dragon",
    cuisine: "Cantonese Dim Sum",
    city: "San Francisco",
    image_url: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&q=80"
  },
  {
    title: "Late Night Ramen Pop-Up",
    description: "Document our exclusive late-night ramen pop-up! We're bringing authentic Tokyo-style ramen to the city. Need creators who can capture the late-night food scene and authentic Japanese flavors.",
    requirements: [
      "Available 9 PM - midnight",
      "Experience with low-light photography",
      "Create atmospheric content",
      "Show ramen-making process",
      "Engage with late-night food community"
    ],
    budget_cents: 70000, // $700
    campaign_type: "popup_event",
    max_creators: 6,
    selected_creators_count: 3,
    restaurant_name: "Midnight Ramen Co.",
    cuisine: "Japanese Ramen",
    city: "Seattle",
    image_url: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&q=80"
  },
  {
    title: "Wine & Cheese Pairing Evening",
    description: "Join our sommelier for an exclusive wine and cheese pairing experience. Create sophisticated content showcasing our curated selection of wines, artisanal cheeses, and elegant ambiance.",
    requirements: [
      "21+ years old",
      "Knowledge of wine appreciated",
      "15K+ followers with foodie audience",
      "Create educational pairing content",
      "Professional photography skills"
    ],
    budget_cents: 175000, // $1,750
    campaign_type: "wine_tasting",
    max_creators: 3,
    selected_creators_count: 1,
    restaurant_name: "Vino & Fromage",
    cuisine: "Wine Bar",
    city: "Napa Valley",
    image_url: "https://images.unsplash.com/photo-1528823872057-9c018a7a7553?w=800&q=80"
  },
  {
    title: "Street Food Festival Coverage",
    description: "Cover our street food festival booth! We're serving up authentic Thai street food. Need energetic creators to capture the festival atmosphere, our signature dishes, and customer reactions.",
    requirements: [
      "High energy content style",
      "Weekend availability",
      "Create live content/stories",
      "Interact with festival goers",
      "Showcase multiple dishes"
    ],
    budget_cents: 45000, // $450
    campaign_type: "festival",
    max_creators: 12,
    selected_creators_count: 8,
    restaurant_name: "Bangkok Bites",
    cuisine: "Thai Street Food",
    city: "Phoenix",
    image_url: "https://images.unsplash.com/photo-1559847844-5315695dadae?w=800&q=80"
  },
  {
    title: "Seafood Boil Experience",
    description: "Get messy with our signature seafood boils! We need creators to showcase our Cajun-style seafood boils, complete with crab, shrimp, crawfish, and all the fixings. Fun, casual content encouraged.",
    requirements: [
      "Comfortable with messy eating content",
      "5K+ engaged followers",
      "Create fun, engaging videos",
      "Show the full boil experience",
      "Include customer testimonials"
    ],
    budget_cents: 65000, // $650
    campaign_type: "casual_dining",
    max_creators: 8,
    selected_creators_count: 5,
    restaurant_name: "The Crab Shack",
    cuisine: "Cajun Seafood",
    city: "New Orleans",
    image_url: "https://images.unsplash.com/photo-1625398407796-82650a8c135f?w=800&q=80"
  },
  {
    title: "Dessert Tasting Menu Launch",
    description: "Sweet tooth creators wanted! We're launching a 7-course dessert tasting menu. Need creators to capture the artistry, flavors, and indulgent experience of our pastry chef's creations.",
    requirements: [
      "Strong photography skills for desserts",
      "10K+ followers",
      "Create mouth-watering content",
      "Detail each course",
      "2-hour tasting experience"
    ],
    budget_cents: 110000, // $1,100
    campaign_type: "dessert_feature",
    max_creators: 4,
    selected_creators_count: 2,
    restaurant_name: "Sugar Rush Patisserie",
    cuisine: "French Pastry",
    city: "Boston",
    image_url: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&q=80"
  }
];

async function seedCampaigns() {
  console.log('🚀 Starting campaign seed...');

  try {
    // First, get some restaurants to associate with campaigns
    const { data: restaurants, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, name, cuisine_types, city, state')
      .limit(15);

    if (restaurantError) {
      console.error('Error fetching restaurants:', restaurantError);
      // Continue anyway with mock restaurant data
    }

    // Get a user to be the campaign owner (use first business account)
    const { data: businessUsers, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('account_type', 'business')
      .limit(1);

    const ownerId = businessUsers?.[0]?.id || null;

    if (!ownerId) {
      console.log('⚠️  No business users found, using null owner_id');
    }

    // Create campaigns
    const campaignPromises = campaigns.map(async (campaign, index) => {
      const restaurant = restaurants?.[index];

      // Calculate dates
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 7)); // Start within next week

      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + Math.floor(Math.random() * 21) + 7); // Run for 1-4 weeks

      const campaignData = {
        restaurant_id: restaurant?.id || `mock-restaurant-${index}`,
        owner_id: ownerId,
        title: campaign.title,
        description: campaign.description,
        requirements: campaign.requirements,
        budget_cents: campaign.budget_cents,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        status: 'active',
        campaign_type: campaign.campaign_type,
        max_creators: campaign.max_creators,
        selected_creators_count: campaign.selected_creators_count,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // If no real restaurant, create a mock entry
      if (!restaurant) {
        // First create a mock restaurant
        const { data: newRestaurant, error: createError } = await supabase
          .from('restaurants')
          .insert({
            name: campaign.restaurant_name,
            cuisine_types: [campaign.cuisine],
            city: campaign.city,
            state: 'CA',
            price_range: '$$',
            is_claimed: true,
            owner_id: ownerId,
            data_source: 'seed',
            cover_photo_url: campaign.image_url,
            address: `123 ${campaign.restaurant_name} Street`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (!createError && newRestaurant) {
          campaignData.restaurant_id = newRestaurant.id;
          console.log(`✅ Created restaurant: ${campaign.restaurant_name}`);
        }
      }

      const { data, error } = await supabase
        .from('campaigns')
        .insert(campaignData)
        .select()
        .single();

      if (error) {
        console.error(`❌ Error creating campaign "${campaign.title}":`, error.message);
      } else {
        console.log(`✅ Created campaign: ${campaign.title}`);
      }

      return data;
    });

    await Promise.all(campaignPromises);

    console.log('✨ Campaign seeding complete!');
    console.log('📊 Total campaigns created:', campaigns.length);

  } catch (error) {
    console.error('Fatal error:', error);
  }
}

// Run the seed
seedCampaigns().then(() => {
  console.log('Done!');
  process.exit(0);
}).catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});