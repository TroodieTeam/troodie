-- Add network progress fields to users table
ALTER TABLE public.users 
ADD COLUMN has_created_board boolean DEFAULT false,
ADD COLUMN has_created_post boolean DEFAULT false,
ADD COLUMN has_joined_community boolean DEFAULT false,
ADD COLUMN network_progress integer DEFAULT 0;

-- Create index for network progress queries
CREATE INDEX idx_users_network_progress ON users (network_progress);

-- Create function to update network progress
CREATE OR REPLACE FUNCTION update_network_progress(user_id UUID, action_type TEXT)
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET 
    network_progress = network_progress + 1,
    has_created_board = CASE WHEN action_type = 'board' THEN true ELSE has_created_board END,
    has_created_post = CASE WHEN action_type = 'post' THEN true ELSE has_created_post END,
    has_joined_community = CASE WHEN action_type = 'community' THEN true ELSE has_joined_community END
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql; 