-- Function to check rate limits
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_user_id UUID,
    p_action VARCHAR,
    p_limit INTEGER,
    p_window INTERVAL
) RETURNS BOOLEAN AS $$
DECLARE
    action_count INTEGER;
BEGIN
    -- Create rate_limit_logs table if it doesn't exist
    CREATE TABLE IF NOT EXISTS rate_limit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        action VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    -- Count recent actions
    SELECT COUNT(*) INTO action_count
    FROM rate_limit_logs
    WHERE user_id = p_user_id
    AND action = p_action
    AND created_at > NOW() - p_window;
    
    -- Log the action if under limit
    IF action_count < p_limit THEN
        INSERT INTO rate_limit_logs (user_id, action)
        VALUES (p_user_id, p_action);
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to create notifications
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type VARCHAR,
    p_title VARCHAR,
    p_body TEXT,
    p_data JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (p_user_id, p_type, p_title, p_body, p_data)
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate persona scores based on quiz answers
CREATE OR REPLACE FUNCTION calculate_persona_scores(p_quiz_answers JSONB)
RETURNS TEXT AS $$
DECLARE
    trendsetter_score INTEGER := 0;
    culinary_adventurer_score INTEGER := 0;
    casual_diner_score INTEGER := 0;
    health_conscious_score INTEGER := 0;
    family_focused_score INTEGER := 0;
    final_persona TEXT;
BEGIN
    -- Parse quiz answers and calculate scores
    -- This is a simplified version - you can expand based on your quiz logic
    
    -- Example scoring based on answer patterns
    IF p_quiz_answers->>'dining_frequency' = 'multiple_times_week' THEN
        trendsetter_score := trendsetter_score + 2;
        culinary_adventurer_score := culinary_adventurer_score + 2;
    END IF;
    
    IF p_quiz_answers->>'cuisine_preference' = 'always_new' THEN
        culinary_adventurer_score := culinary_adventurer_score + 3;
        trendsetter_score := trendsetter_score + 1;
    END IF;
    
    IF p_quiz_answers->>'price_sensitivity' = 'not_important' THEN
        trendsetter_score := trendsetter_score + 2;
    END IF;
    
    IF p_quiz_answers->>'dietary_restrictions' = 'many' THEN
        health_conscious_score := health_conscious_score + 3;
    END IF;
    
    IF p_quiz_answers->>'dining_companions' = 'family' THEN
        family_focused_score := family_focused_score + 3;
    END IF;
    
    -- Determine winning persona
    IF trendsetter_score >= ALL(ARRAY[culinary_adventurer_score, casual_diner_score, health_conscious_score, family_focused_score]) THEN
        final_persona := 'trendsetter';
    ELSIF culinary_adventurer_score >= ALL(ARRAY[trendsetter_score, casual_diner_score, health_conscious_score, family_focused_score]) THEN
        final_persona := 'culinary_adventurer';
    ELSIF health_conscious_score >= ALL(ARRAY[trendsetter_score, culinary_adventurer_score, casual_diner_score, family_focused_score]) THEN
        final_persona := 'health_conscious';
    ELSIF family_focused_score >= ALL(ARRAY[trendsetter_score, culinary_adventurer_score, casual_diner_score, health_conscious_score]) THEN
        final_persona := 'family_focused';
    ELSE
        final_persona := 'casual_diner';
    END IF;
    
    RETURN final_persona;
END;
$$ LANGUAGE plpgsql;

-- Function to get user statistics
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    stats JSON;
BEGIN
    SELECT json_build_object(
        'followers_count', COUNT(DISTINCT f1.follower_id),
        'following_count', COUNT(DISTINCT f2.following_id),
        'saves_count', COUNT(DISTINCT rs.id),
        'boards_count', COUNT(DISTINCT b.id),
        'avg_rating', AVG(rs.personal_rating),
        'total_restaurants', COUNT(DISTINCT rs.restaurant_id)
    ) INTO stats
    FROM users u
    LEFT JOIN user_relationships f1 ON u.id = f1.following_id
    LEFT JOIN user_relationships f2 ON u.id = f2.follower_id
    LEFT JOIN restaurant_saves rs ON u.id = rs.user_id
    LEFT JOIN boards b ON u.id = b.user_id
    WHERE u.id = p_user_id
    GROUP BY u.id;
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for like notifications
CREATE OR REPLACE FUNCTION notify_on_like() RETURNS TRIGGER AS $$
DECLARE
    save_owner_id UUID;
    liker_name TEXT;
BEGIN
    -- Don't notify for self-likes
    SELECT user_id INTO save_owner_id FROM restaurant_saves WHERE id = NEW.save_id;
    
    IF NEW.user_id != save_owner_id AND NEW.interaction_type = 'like' THEN
        SELECT name INTO liker_name FROM users WHERE id = NEW.user_id;
        
        PERFORM create_notification(
            save_owner_id,
            'like',
            'New Like',
            COALESCE(liker_name, 'Someone') || ' liked your save',
            jsonb_build_object('save_id', NEW.save_id, 'user_id', NEW.user_id)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for like notifications
CREATE TRIGGER trigger_like_notification
AFTER INSERT ON save_interactions
FOR EACH ROW
WHEN (NEW.interaction_type = 'like')
EXECUTE FUNCTION notify_on_like();

-- Trigger function for comment notifications
CREATE OR REPLACE FUNCTION notify_on_comment() RETURNS TRIGGER AS $$
DECLARE
    save_owner_id UUID;
    commenter_name TEXT;
BEGIN
    -- Don't notify for self-comments
    SELECT user_id INTO save_owner_id FROM restaurant_saves WHERE id = NEW.save_id;
    
    IF NEW.user_id != save_owner_id THEN
        SELECT name INTO commenter_name FROM users WHERE id = NEW.user_id;
        
        PERFORM create_notification(
            save_owner_id,
            'comment',
            'New Comment',
            COALESCE(commenter_name, 'Someone') || ' commented on your save',
            jsonb_build_object('save_id', NEW.save_id, 'comment_id', NEW.id, 'user_id', NEW.user_id)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for comment notifications
CREATE TRIGGER trigger_comment_notification
AFTER INSERT ON comments
FOR EACH ROW
EXECUTE FUNCTION notify_on_comment();

-- Trigger function for follow notifications
CREATE OR REPLACE FUNCTION notify_on_follow() RETURNS TRIGGER AS $$
DECLARE
    follower_name TEXT;
BEGIN
    SELECT name INTO follower_name FROM users WHERE id = NEW.follower_id;
    
    PERFORM create_notification(
        NEW.following_id,
        'follow',
        'New Follower',
        COALESCE(follower_name, 'Someone') || ' started following you',
        jsonb_build_object('follower_id', NEW.follower_id)
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for follow notifications
CREATE TRIGGER trigger_follow_notification
AFTER INSERT ON user_relationships
FOR EACH ROW
EXECUTE FUNCTION notify_on_follow();

-- Function to get trending restaurants
CREATE OR REPLACE FUNCTION get_trending_restaurants(
    p_city VARCHAR DEFAULT NULL,
    p_limit INTEGER DEFAULT 10
) RETURNS TABLE(
    restaurant_id UUID,
    restaurant_name VARCHAR,
    city VARCHAR,
    saves_last_week BIGINT,
    avg_rating NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.name,
        r.city,
        COUNT(DISTINCT rs.user_id) as saves_last_week,
        AVG(rs.personal_rating) as avg_rating
    FROM restaurants r
    JOIN restaurant_saves rs ON r.id = rs.restaurant_id
    WHERE rs.created_at > NOW() - INTERVAL '7 days'
    AND (p_city IS NULL OR r.city = p_city)
    GROUP BY r.id, r.name, r.city
    ORDER BY saves_last_week DESC, avg_rating DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get restaurant recommendations based on persona
CREATE OR REPLACE FUNCTION get_persona_recommendations(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20
) RETURNS TABLE(
    restaurant_id UUID,
    restaurant_name VARCHAR,
    match_score NUMERIC
) AS $$
DECLARE
    user_persona VARCHAR;
BEGIN
    -- Get user persona
    SELECT persona INTO user_persona FROM users WHERE id = p_user_id;
    
    -- Return recommendations based on persona
    RETURN QUERY
    SELECT 
        r.id,
        r.name,
        CASE 
            WHEN user_persona = 'trendsetter' THEN
                (r.google_rating * 0.3 + 
                 COALESCE((SELECT AVG(personal_rating) FROM restaurant_saves WHERE restaurant_id = r.id AND created_at > NOW() - INTERVAL '30 days'), 0) * 0.7)
            WHEN user_persona = 'culinary_adventurer' THEN
                (CASE WHEN array_length(r.cuisine_types, 1) > 1 THEN 5 ELSE 3 END)
            WHEN user_persona = 'health_conscious' THEN
                (CASE WHEN 'healthy' = ANY(r.dietary_options) THEN 5 ELSE 2 END)
            WHEN user_persona = 'family_focused' THEN
                (CASE WHEN 'family_friendly' = ANY(r.features) THEN 5 ELSE 2 END)
            ELSE 
                COALESCE(r.google_rating, 3.5)
        END as match_score
    FROM restaurants r
    WHERE NOT EXISTS (
        SELECT 1 FROM restaurant_saves 
        WHERE restaurant_id = r.id 
        AND user_id = p_user_id
    )
    ORDER BY match_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications
    WHERE created_at < NOW() - INTERVAL '30 days'
    AND is_read = TRUE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Enable Realtime for required tables
ALTER PUBLICATION supabase_realtime ADD TABLE restaurant_saves;
ALTER PUBLICATION supabase_realtime ADD TABLE save_interactions;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE community_posts;