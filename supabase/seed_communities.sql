-- Seed data for communities to enable discovery features

-- Insert featured communities
INSERT INTO communities (id, name, description, cover_image_url, category, location, type, member_count, activity_level, is_active, is_featured, trending_score, tags, cuisines, post_count)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Charlotte Foodies', 'The ultimate community for Charlotte food enthusiasts. Share your favorite spots, discover hidden gems, and connect with fellow food lovers!', 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800', 'Local', 'Charlotte', 'public', 1250, 95, true, true, 85.5, ARRAY['charlotte', 'local-eats', 'foodie'], ARRAY['American', 'Southern', 'International'], 320),
  ('22222222-2222-2222-2222-222222222222', 'Best Brunch Spots', 'Weekend brunch lovers unite! Share your favorite brunch experiences, from bottomless mimosas to perfect eggs benedict.', 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800', 'Cuisine', null, 'public', 890, 88, true, true, 78.2, ARRAY['brunch', 'weekend', 'breakfast'], ARRAY['American', 'French', 'Cafe'], 245),
  ('33333333-3333-3333-3333-333333333333', 'Vegan & Plant-Based', 'Discover amazing plant-based dining options. From vegan comfort food to raw cuisine, share your meat-free finds!', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800', 'Dietary', null, 'public', 675, 82, true, true, 72.8, ARRAY['vegan', 'plant-based', 'healthy'], ARRAY['Vegan', 'Vegetarian', 'Health Food'], 189);

-- Insert trending communities
INSERT INTO communities (id, name, description, cover_image_url, category, location, type, member_count, activity_level, is_active, trending_score, tags, cuisines, post_count)
VALUES
  ('44444444-4444-4444-4444-444444444444', 'Taco Tuesday Crew', 'Every day is taco day! Share your favorite taco spots, from authentic street tacos to gourmet fusion.', 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800', 'Cuisine', null, 'public', 456, 75, true, 68.5, ARRAY['tacos', 'mexican', 'tuesday'], ARRAY['Mexican', 'Tex-Mex', 'Latin'], 156),
  ('55555555-5555-5555-5555-555555555555', 'Pizza Paradise', 'For the love of pizza! Share your favorite slices, from NY style to Neapolitan, deep dish to thin crust.', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800', 'Cuisine', null, 'public', 523, 70, true, 65.2, ARRAY['pizza', 'italian', 'cheese'], ARRAY['Italian', 'Pizza'], 178),
  ('66666666-6666-6666-6666-666666666666', 'Craft Beer & Bites', 'Pairing great food with amazing craft beers. Share your favorite breweries and the best bar bites!', 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=800', 'Beverage', null, 'public', 389, 68, true, 62.1, ARRAY['beer', 'craft-beer', 'breweries'], ARRAY['American', 'Bar Food', 'Gastropub'], 134),
  ('77777777-7777-7777-7777-777777777777', 'Date Night Dining', 'Romantic restaurants and special occasion spots. Share your favorite places for memorable dining experiences.', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800', 'Experience', null, 'public', 412, 65, true, 58.7, ARRAY['date-night', 'romantic', 'fine-dining'], ARRAY['French', 'Italian', 'Steakhouse'], 98),
  ('88888888-8888-8888-8888-888888888888', 'South End Eats', 'Exploring all the amazing food options in Charlotte''s South End. From food halls to fine dining!', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800', 'Local', 'Charlotte', 'public', 345, 72, true, 64.3, ARRAY['south-end', 'charlotte', 'neighborhood'], ARRAY['American', 'International', 'Modern'], 112);

-- Insert some regular communities for recommendations
INSERT INTO communities (id, name, description, cover_image_url, category, location, type, member_count, activity_level, is_active, tags, cuisines, post_count)
VALUES
  ('99999999-9999-9999-9999-999999999999', 'Budget Bites', 'Great food doesn''t have to break the bank! Share affordable dining options and deals.', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800', 'Budget', null, 'public', 267, 55, true, ARRAY['budget', 'deals', 'affordable'], ARRAY['Fast Food', 'Casual', 'Street Food'], 89),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Sushi Society', 'For sushi lovers and enthusiasts. Share your favorite rolls, omakase experiences, and hidden gems.', 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800', 'Cuisine', null, 'public', 298, 60, true, ARRAY['sushi', 'japanese', 'seafood'], ARRAY['Japanese', 'Sushi'], 76),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Coffee & Cafes', 'Your daily dose of caffeine culture. Share cozy cafes, specialty roasters, and the perfect cup.', 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800', 'Beverage', null, 'public', 423, 78, true, ARRAY['coffee', 'cafe', 'espresso'], ARRAY['Cafe', 'Bakery', 'Coffee Shop'], 145),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'BBQ Nation', 'Celebrating all things barbecue! From Carolina style to Texas brisket, share your smoky favorites.', 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=800', 'Cuisine', null, 'public', 356, 62, true, ARRAY['bbq', 'barbecue', 'smoked'], ARRAY['BBQ', 'Southern', 'American'], 103);

-- Add some community members for the featured communities
INSERT INTO community_members (community_id, user_id, role, status, joined_at)
SELECT 
  c.id,
  u.id,
  'member',
  'active',
  NOW() - INTERVAL '30 days' * RANDOM()
FROM communities c
CROSS JOIN (SELECT id FROM users LIMIT 10) u
WHERE c.is_featured = true
ON CONFLICT DO NOTHING;

-- Update member counts based on actual members
UPDATE communities c
SET member_count = (
  SELECT COUNT(*) 
  FROM community_members cm 
  WHERE cm.community_id = c.id AND cm.status = 'active'
)
WHERE EXISTS (
  SELECT 1 FROM community_members cm WHERE cm.community_id = c.id
);

-- Add some recent activity for trending communities
INSERT INTO community_activity (community_id, user_id, activity_type, created_at)
SELECT 
  c.id,
  u.id,
  CASE (RANDOM() * 3)::INT
    WHEN 0 THEN 'post'
    WHEN 1 THEN 'join'
    ELSE 'visit'
  END,
  NOW() - INTERVAL '1 day' * (RANDOM() * 7)
FROM communities c
CROSS JOIN (SELECT id FROM users LIMIT 5) u
WHERE c.trending_score > 60
ON CONFLICT DO NOTHING;