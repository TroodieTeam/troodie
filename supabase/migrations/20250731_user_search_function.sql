-- Add search indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_search 
ON users 
USING gin(
  to_tsvector('english', 
    COALESCE(username, '') || ' ' || 
    COALESCE(name, '') || ' ' || 
    COALESCE(bio, '')
  )
);

-- Create search_users function
CREATE OR REPLACE FUNCTION search_users(
  search_query TEXT,
  limit_count INT DEFAULT 20,
  offset_count INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  username VARCHAR,
  name VARCHAR,
  bio TEXT,
  avatar_url TEXT,
  is_verified BOOLEAN,
  followers_count INT,
  saves_count INT,
  location TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.username,
    u.name,
    u.bio,
    u.avatar_url,
    u.is_verified,
    u.followers_count,
    u.saves_count,
    u.location
  FROM users u
  WHERE 
    to_tsvector('english', 
      COALESCE(u.username, '') || ' ' || 
      COALESCE(u.name, '') || ' ' || 
      COALESCE(u.bio, '')
    ) @@ plainto_tsquery('english', search_query)
  ORDER BY 
    u.is_verified DESC,
    u.followers_count DESC,
    ts_rank(
      to_tsvector('english', 
        COALESCE(u.username, '') || ' ' || 
        COALESCE(u.name, '') || ' ' || 
        COALESCE(u.bio, '')
      ),
      plainto_tsquery('english', search_query)
    ) DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION search_users(TEXT, INT, INT) TO authenticated;