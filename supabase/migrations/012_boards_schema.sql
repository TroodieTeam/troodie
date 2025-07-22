-- Migration: Create boards system
-- Description: Sets up boards, board_restaurants, and board_members tables
-- Author: Claude
-- Date: 2025-01-22

-- Create boards table
CREATE TABLE IF NOT EXISTS boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  type VARCHAR(20) DEFAULT 'free' CHECK (type IN ('free', 'private', 'paid')),
  cover_image_url TEXT,
  category VARCHAR(50),
  location VARCHAR(100),
  is_private BOOLEAN DEFAULT false,
  allow_comments BOOLEAN DEFAULT true,
  allow_saves BOOLEAN DEFAULT true,
  price DECIMAL(10,2),
  restaurant_count INTEGER DEFAULT 0,
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create board_restaurants table
CREATE TABLE IF NOT EXISTS board_restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE NOT NULL,
  restaurant_id VARCHAR(255) NOT NULL,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  visit_date DATE,
  position INTEGER DEFAULT 0,
  UNIQUE(board_id, restaurant_id)
);

-- Create board_members table for private boards
CREATE TABLE IF NOT EXISTS board_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(board_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_boards_user_id ON boards(user_id);
CREATE INDEX idx_boards_type ON boards(type);
CREATE INDEX idx_boards_is_private ON boards(is_private);
CREATE INDEX idx_board_restaurants_board_id ON board_restaurants(board_id);
CREATE INDEX idx_board_restaurants_restaurant_id ON board_restaurants(restaurant_id);
CREATE INDEX idx_board_members_board_id ON board_members(board_id);
CREATE INDEX idx_board_members_user_id ON board_members(user_id);

-- Create updated_at trigger for boards
CREATE OR REPLACE FUNCTION update_boards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_boards_updated_at
BEFORE UPDATE ON boards
FOR EACH ROW
EXECUTE FUNCTION update_boards_updated_at();

-- Create function to update restaurant count
CREATE OR REPLACE FUNCTION update_board_restaurant_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE boards 
    SET restaurant_count = restaurant_count + 1
    WHERE id = NEW.board_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE boards 
    SET restaurant_count = restaurant_count - 1
    WHERE id = OLD.board_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_board_restaurant_count_trigger
AFTER INSERT OR DELETE ON board_restaurants
FOR EACH ROW
EXECUTE FUNCTION update_board_restaurant_count();

-- Create function to update member count
CREATE OR REPLACE FUNCTION update_board_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE boards 
    SET member_count = member_count + 1
    WHERE id = NEW.board_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE boards 
    SET member_count = member_count - 1
    WHERE id = OLD.board_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_board_member_count_trigger
AFTER INSERT OR DELETE ON board_members
FOR EACH ROW
EXECUTE FUNCTION update_board_member_count();

-- Row Level Security Policies

-- Enable RLS on all tables
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_members ENABLE ROW LEVEL SECURITY;

-- Boards policies
CREATE POLICY "Users can view public boards" ON boards
  FOR SELECT
  USING (is_private = false OR user_id = auth.uid());

CREATE POLICY "Users can view private boards they own or are members of" ON boards
  FOR SELECT
  USING (
    is_private = true AND (
      user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM board_members
        WHERE board_members.board_id = boards.id
        AND board_members.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create boards" ON boards
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own boards" ON boards
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own boards" ON boards
  FOR DELETE
  USING (user_id = auth.uid());

-- Board restaurants policies
CREATE POLICY "Users can view restaurants in public boards" ON board_restaurants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM boards
      WHERE boards.id = board_restaurants.board_id
      AND (boards.is_private = false OR boards.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can add restaurants to their own boards" ON board_restaurants
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM boards
      WHERE boards.id = board_restaurants.board_id
      AND boards.user_id = auth.uid()
    )
  );

CREATE POLICY "Board owners can update restaurants in their boards" ON board_restaurants
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM boards
      WHERE boards.id = board_restaurants.board_id
      AND boards.user_id = auth.uid()
    )
  );

CREATE POLICY "Board owners can remove restaurants from their boards" ON board_restaurants
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM boards
      WHERE boards.id = board_restaurants.board_id
      AND boards.user_id = auth.uid()
    )
  );

-- Board members policies
CREATE POLICY "Users can view members of boards they belong to" ON board_members
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM board_members bm
      WHERE bm.board_id = board_members.board_id
      AND bm.user_id = auth.uid()
    )
  );

CREATE POLICY "Board owners can add members" ON board_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM boards
      WHERE boards.id = board_members.board_id
      AND boards.user_id = auth.uid()
    )
  );

CREATE POLICY "Board owners can remove members" ON board_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM boards
      WHERE boards.id = board_members.board_id
      AND boards.user_id = auth.uid()
    )
  );

-- Create default board for users
CREATE OR REPLACE FUNCTION create_default_board()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO boards (user_id, title, description, type, is_private)
  VALUES (
    NEW.id,
    'My Saved Restaurants',
    'Your default collection of saved restaurants',
    'free',
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create default board when a new user is created
CREATE TRIGGER create_default_board_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_default_board();