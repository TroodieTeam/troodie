-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone VARCHAR(20) UNIQUE,
    username VARCHAR(50) UNIQUE,
    name VARCHAR(100),
    bio TEXT,
    avatar_url TEXT,
    persona VARCHAR(50),
    is_verified BOOLEAN DEFAULT FALSE,
    is_restaurant BOOLEAN DEFAULT FALSE,
    is_creator BOOLEAN DEFAULT FALSE,
    profile_completion INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User relationships
CREATE TABLE user_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(follower_id, following_id)
);

-- Restaurants table
CREATE TABLE restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    google_place_id VARCHAR(255) UNIQUE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(10),
    location GEOGRAPHY(POINT),
    cuisine_types TEXT[],
    price_range VARCHAR(4),
    phone VARCHAR(20),
    website TEXT,
    hours JSONB,
    photos TEXT[],
    cover_photo_url TEXT,
    google_rating DECIMAL(2,1),
    google_reviews_count INTEGER,
    troodie_rating DECIMAL(2,1),
    troodie_reviews_count INTEGER DEFAULT 0,
    features TEXT[],
    dietary_options TEXT[],
    is_verified BOOLEAN DEFAULT FALSE,
    is_claimed BOOLEAN DEFAULT FALSE,
    owner_id UUID REFERENCES users(id),
    data_source VARCHAR(20) CHECK (data_source IN ('seed', 'google', 'user')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_google_sync TIMESTAMPTZ
);

-- Boards table
CREATE TABLE boards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    type VARCHAR(20) CHECK (type IN ('free', 'private', 'paid')),
    category VARCHAR(50),
    location VARCHAR(255),
    tags TEXT[],
    price DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    billing_type VARCHAR(20),
    allow_comments BOOLEAN DEFAULT TRUE,
    allow_saves BOOLEAN DEFAULT TRUE,
    member_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Board collaborators
CREATE TABLE board_collaborators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(board_id, user_id)
);

-- Board restaurants
CREATE TABLE board_restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    added_by UUID REFERENCES users(id),
    order_position INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(board_id, restaurant_id)
);

-- Board subscriptions (for paid boards)
CREATE TABLE board_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    stripe_subscription_id VARCHAR(255),
    status VARCHAR(20),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(board_id, user_id)
);

-- Restaurant saves/posts
CREATE TABLE restaurant_saves (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    personal_rating INTEGER CHECK (personal_rating >= 1 AND personal_rating <= 5),
    visit_date DATE,
    photos TEXT[],
    notes TEXT,
    tags TEXT[],
    would_recommend BOOLEAN,
    price_range VARCHAR(4),
    visit_type VARCHAR(20) CHECK (visit_type IN ('dine_in', 'takeout', 'delivery')),
    privacy VARCHAR(20) CHECK (privacy IN ('public', 'friends', 'private')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Save board associations
CREATE TABLE save_boards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    save_id UUID REFERENCES restaurant_saves(id) ON DELETE CASCADE,
    board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(save_id, board_id)
);

-- Social interactions
CREATE TABLE save_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    save_id UUID REFERENCES restaurant_saves(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    interaction_type VARCHAR(20) CHECK (interaction_type IN ('like', 'save', 'share')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(save_id, user_id, interaction_type)
);

-- Comments
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    save_id UUID REFERENCES restaurant_saves(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Communities
CREATE TABLE communities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    category VARCHAR(50),
    location VARCHAR(255),
    admin_id UUID REFERENCES users(id),
    type VARCHAR(20) CHECK (type IN ('public', 'private', 'paid')),
    price DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    billing_cycle VARCHAR(20),
    member_count INTEGER DEFAULT 0,
    activity_level INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Community members
CREATE TABLE community_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member',
    status VARCHAR(20) DEFAULT 'active',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(community_id, user_id)
);

-- Community posts
CREATE TABLE community_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    images TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Creator campaigns
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurants(id),
    creator_id UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    requirements TEXT[],
    budget DECIMAL(10,2),
    deadline TIMESTAMPTZ,
    status VARCHAR(20) CHECK (status IN ('pending', 'active', 'review', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign deliverables
CREATE TABLE campaign_deliverables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    type VARCHAR(50),
    description TEXT,
    status VARCHAR(20),
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50),
    title VARCHAR(255),
    body TEXT,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User preferences
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    notification_likes BOOLEAN DEFAULT TRUE,
    notification_comments BOOLEAN DEFAULT TRUE,
    notification_follows BOOLEAN DEFAULT TRUE,
    notification_community BOOLEAN DEFAULT TRUE,
    notification_campaigns BOOLEAN DEFAULT TRUE,
    email_notifications BOOLEAN DEFAULT FALSE,
    push_notifications BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User onboarding data
CREATE TABLE user_onboarding (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    quiz_answers JSONB,
    persona VARCHAR(50),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Favorite spots from onboarding
CREATE TABLE favorite_spots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(100),
    icon VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_restaurants_location ON restaurants USING GIST(location);
CREATE INDEX idx_restaurants_city ON restaurants(city);
CREATE INDEX idx_restaurants_cuisine ON restaurants USING GIN(cuisine_types);
CREATE INDEX idx_restaurant_saves_user_id ON restaurant_saves(user_id);
CREATE INDEX idx_restaurant_saves_restaurant_id ON restaurant_saves(restaurant_id);
CREATE INDEX idx_boards_user_id ON boards(user_id);
CREATE INDEX idx_communities_location ON communities(location);
CREATE INDEX idx_notifications_user_id ON notifications(user_id, is_read);
CREATE INDEX idx_user_relationships_follower ON user_relationships(follower_id);
CREATE INDEX idx_user_relationships_following ON user_relationships(following_id);

-- Create views for common queries
-- User stats view
CREATE VIEW user_stats AS
SELECT 
    u.id,
    u.username,
    u.name,
    COUNT(DISTINCT f1.follower_id) as followers_count,
    COUNT(DISTINCT f2.following_id) as following_count,
    COUNT(DISTINCT rs.id) as saves_count,
    COUNT(DISTINCT b.id) as boards_count
FROM users u
LEFT JOIN user_relationships f1 ON u.id = f1.following_id
LEFT JOIN user_relationships f2 ON u.id = f2.follower_id
LEFT JOIN restaurant_saves rs ON u.id = rs.user_id
LEFT JOIN boards b ON u.id = b.user_id
GROUP BY u.id, u.username, u.name;

-- Restaurant popularity view
CREATE VIEW restaurant_popularity AS
SELECT 
    r.id,
    r.name,
    r.city,
    COUNT(DISTINCT rs.id) as total_saves,
    AVG(rs.personal_rating) as avg_rating,
    COUNT(DISTINCT rs.user_id) as unique_savers
FROM restaurants r
LEFT JOIN restaurant_saves rs ON r.id = rs.restaurant_id
GROUP BY r.id, r.name, r.city;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all tables with updated_at column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON restaurants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_boards_updated_at BEFORE UPDATE ON boards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_restaurant_saves_updated_at BEFORE UPDATE ON restaurant_saves
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_communities_updated_at BEFORE UPDATE ON communities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_board_subscriptions_updated_at BEFORE UPDATE ON board_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_community_posts_updated_at BEFORE UPDATE ON community_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();