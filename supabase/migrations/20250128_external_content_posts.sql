-- Migration: Add External Content Support to Posts
-- Description: Add support for external content (TikTok, Instagram, articles, etc.) in posts
-- Author: Claude
-- Date: 2025-01-28

-- Add external content fields to posts table
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS content_type character varying DEFAULT 'original'::character varying 
  CHECK (content_type::text = ANY (ARRAY['original'::character varying, 'external'::character varying]::text[])),
ADD COLUMN IF NOT EXISTS external_source character varying,
ADD COLUMN IF NOT EXISTS external_url text,
ADD COLUMN IF NOT EXISTS external_title text,
ADD COLUMN IF NOT EXISTS external_description text,
ADD COLUMN IF NOT EXISTS external_thumbnail text,
ADD COLUMN IF NOT EXISTS external_author text;

-- Create external content sources table for reference
CREATE TABLE IF NOT EXISTS public.external_content_sources (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  domain character varying,
  icon_url text,
  is_supported boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT external_content_sources_pkey PRIMARY KEY (id),
  CONSTRAINT external_content_sources_name_unique UNIQUE (name)
);

-- Insert common external sources
INSERT INTO public.external_content_sources (name, domain, icon_url) VALUES
  ('TikTok', 'tiktok.com', 'https://example.com/tiktok-icon.png'),
  ('Instagram', 'instagram.com', 'https://example.com/instagram-icon.png'),
  ('YouTube', 'youtube.com', 'https://example.com/youtube-icon.png'),
  ('Twitter', 'twitter.com', 'https://example.com/twitter-icon.png'),
  ('Article', NULL, 'https://example.com/article-icon.png'),
  ('Other', NULL, 'https://example.com/link-icon.png')
ON CONFLICT (name) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_content_type ON public.posts(content_type);
CREATE INDEX IF NOT EXISTS idx_posts_external_source ON public.posts(external_source);
CREATE INDEX IF NOT EXISTS idx_posts_external_url ON public.posts(external_url);

-- Add RLS policies for external content sources (read-only for all users)
ALTER TABLE public.external_content_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "External content sources are viewable by everyone" ON public.external_content_sources;
CREATE POLICY "External content sources are viewable by everyone" 
ON public.external_content_sources FOR SELECT 
USING (true);

-- Grant permissions
GRANT SELECT ON public.external_content_sources TO anon, authenticated;

-- Log completion
DO $$
BEGIN
  RAISE LOG 'External content support added to posts table successfully';
END $$; 