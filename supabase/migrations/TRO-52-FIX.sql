CREATE TABLE IF NOT EXISTS restaurant_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    created_at TIMES
TAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, restaurant_id)
);
 
CREATE INDEX IF NOT EXISTS idx_restaurant_favorites_user_id ON restaurant_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_favorites_restaurant_id ON restaurant_favorites(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_favorites_created_at ON restaurant_favorites(created_at DESC);
 
ALTER TABLE restaurant_favorites ENABLE ROW LEVEL SECURITY;
 
CREATE POLICY "Users can view all favorites" ON restaurant_favorites FOR SELECT USING (true);
CREATE POLICY "Users can insert their own favorites" ON restaurant_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own favorites" ON restaurant_favorites FOR DELETE USING (auth.uid() = user_id);
 
GRANT SELECT, INSERT, DELETE ON restaurant_favorites TO authenticated;
GRANT SELECT ON restaurant_favorites TO anon;