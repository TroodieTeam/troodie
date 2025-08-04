-- Add quality metrics and tracking fields to restaurant_images
ALTER TABLE restaurant_images
ADD COLUMN IF NOT EXISTS quality_score DECIMAL(3,2) DEFAULT 0.00 CHECK (quality_score >= 0 AND quality_score <= 1),
ADD COLUMN IF NOT EXISTS width INTEGER,
ADD COLUMN IF NOT EXISTS height INTEGER,
ADD COLUMN IF NOT EXISTS aspect_ratio DECIMAL(4,2),
ADD COLUMN IF NOT EXISTS is_auto_selected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS selection_reason TEXT,
ADD COLUMN IF NOT EXISTS last_analyzed_at TIMESTAMPTZ;

-- Add cover photo tracking to restaurants
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS cover_photo_source VARCHAR(50),
ADD COLUMN IF NOT EXISTS cover_photo_updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS auto_cover_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS has_manual_cover BOOLEAN DEFAULT false;

-- Create index for quality-based queries
CREATE INDEX IF NOT EXISTS idx_restaurant_images_quality 
ON restaurant_images(restaurant_id, quality_score DESC, like_count DESC)
WHERE privacy = 'public' AND is_approved = true;

-- Enhanced function to select best cover photo with quality analysis
CREATE OR REPLACE FUNCTION select_best_cover_photo(
  p_restaurant_id UUID
) RETURNS TABLE (
  image_url TEXT,
  quality_score DECIMAL,
  engagement_score DECIMAL,
  recency_score DECIMAL,
  total_score DECIMAL,
  selection_reason TEXT
) AS $$
DECLARE
  v_max_likes INTEGER;
  v_max_views INTEGER;
BEGIN
  -- Get max engagement metrics for normalization
  SELECT 
    COALESCE(MAX(like_count), 1),
    COALESCE(MAX(view_count), 1)
  INTO v_max_likes, v_max_views
  FROM restaurant_images
  WHERE restaurant_id = p_restaurant_id
    AND privacy = 'public'
    AND is_approved = true;

  RETURN QUERY
  WITH scored_images AS (
    SELECT
      ri.image_url,
      COALESCE(ri.quality_score, 0.5) as quality_score,
      -- Engagement score (normalized likes and views)
      CASE 
        WHEN v_max_likes > 0 OR v_max_views > 0 THEN
          (COALESCE(ri.like_count, 0)::DECIMAL / v_max_likes * 0.7) +
          (COALESCE(ri.view_count, 0)::DECIMAL / v_max_views * 0.3)
        ELSE 0.5
      END as engagement_score,
      -- Recency score (exponential decay over 90 days)
      EXP(-EXTRACT(EPOCH FROM (NOW() - ri.uploaded_at)) / (86400 * 30)) as recency_score,
      ri.uploaded_at,
      ri.like_count,
      ri.view_count,
      ri.source
    FROM restaurant_images ri
    WHERE ri.restaurant_id = p_restaurant_id
      AND ri.privacy = 'public'
      AND ri.is_approved = true
      AND ri.image_url IS NOT NULL
  ),
  final_scores AS (
    SELECT
      si.*,
      -- Total score: 40% quality, 40% engagement, 20% recency
      (si.quality_score * 0.4 + si.engagement_score * 0.4 + si.recency_score * 0.2) as total_score,
      -- Selection reason
      CASE
        WHEN si.quality_score >= 0.8 AND si.engagement_score >= 0.7 THEN 'High quality with strong engagement'
        WHEN si.quality_score >= 0.8 THEN 'High quality image'
        WHEN si.engagement_score >= 0.8 THEN 'Popular with users'
        WHEN si.recency_score >= 0.8 THEN 'Recently uploaded'
        WHEN si.source = 'restaurant_upload' THEN 'Restaurant provided'
        ELSE 'Best available option'
      END as selection_reason
    FROM scored_images si
  )
  SELECT
    fs.image_url,
    fs.quality_score,
    fs.engagement_score,
    fs.recency_score,
    fs.total_score,
    fs.selection_reason
  FROM final_scores fs
  ORDER BY fs.total_score DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Intelligent cover photo update function
CREATE OR REPLACE FUNCTION update_restaurant_cover_photo_intelligent(
  p_restaurant_id UUID,
  p_force_update BOOLEAN DEFAULT false
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_cover TEXT;
  v_has_manual_cover BOOLEAN;
  v_auto_enabled BOOLEAN;
  v_best_photo RECORD;
  v_should_update BOOLEAN := false;
BEGIN
  -- Get current restaurant cover photo status
  SELECT 
    cover_photo_url,
    COALESCE(has_manual_cover, false),
    COALESCE(auto_cover_enabled, true)
  INTO v_current_cover, v_has_manual_cover, v_auto_enabled
  FROM restaurants
  WHERE id = p_restaurant_id;

  -- Skip if auto-cover is disabled or has manual cover (unless forced)
  IF NOT v_auto_enabled OR (v_has_manual_cover AND NOT p_force_update) THEN
    RETURN false;
  END IF;

  -- Get best photo candidate
  SELECT * INTO v_best_photo
  FROM select_best_cover_photo(p_restaurant_id);

  -- Determine if we should update
  IF v_best_photo.image_url IS NOT NULL THEN
    -- Update if: no current cover, current is default, or force update
    v_should_update := v_current_cover IS NULL 
      OR v_current_cover LIKE '%placeholder%'
      OR v_current_cover LIKE '%default%'
      OR p_force_update;
    
    -- Also update if new photo is significantly better (30% improvement)
    IF NOT v_should_update AND v_best_photo.total_score > 0.7 THEN
      v_should_update := true;
    END IF;
  END IF;

  -- Perform update if needed
  IF v_should_update AND v_best_photo.image_url IS NOT NULL THEN
    UPDATE restaurants
    SET 
      cover_photo_url = v_best_photo.image_url,
      cover_photo_source = 'auto_selected',
      cover_photo_updated_at = NOW(),
      updated_at = NOW()
    WHERE id = p_restaurant_id;

    -- Mark the selected image
    UPDATE restaurant_images
    SET 
      is_cover_photo = true,
      is_auto_selected = true,
      selection_reason = v_best_photo.selection_reason
    WHERE restaurant_id = p_restaurant_id
      AND image_url = v_best_photo.image_url;

    -- Unmark previous auto-selected covers
    UPDATE restaurant_images
    SET is_cover_photo = false
    WHERE restaurant_id = p_restaurant_id
      AND image_url != v_best_photo.image_url
      AND is_auto_selected = true;

    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Function to analyze and score image quality (called from application)
CREATE OR REPLACE FUNCTION update_image_quality_metrics(
  p_image_id UUID,
  p_quality_score DECIMAL,
  p_width INTEGER,
  p_height INTEGER,
  p_aspect_ratio DECIMAL
) RETURNS VOID AS $$
BEGIN
  UPDATE restaurant_images
  SET 
    quality_score = p_quality_score,
    width = p_width,
    height = p_height,
    aspect_ratio = p_aspect_ratio,
    last_analyzed_at = NOW()
  WHERE id = p_image_id;
END;
$$ LANGUAGE plpgsql;

-- Batch process restaurants without covers
CREATE OR REPLACE FUNCTION batch_update_restaurant_covers(
  p_limit INTEGER DEFAULT 100
) RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER := 0;
  v_restaurant RECORD;
BEGIN
  -- Find restaurants needing cover updates
  FOR v_restaurant IN
    SELECT r.id
    FROM restaurants r
    WHERE (
      r.cover_photo_url IS NULL 
      OR r.cover_photo_url LIKE '%placeholder%'
      OR r.cover_photo_url LIKE '%default%'
    )
    AND r.auto_cover_enabled = true
    AND EXISTS (
      SELECT 1 FROM restaurant_images ri
      WHERE ri.restaurant_id = r.id
        AND ri.privacy = 'public'
        AND ri.is_approved = true
    )
    LIMIT p_limit
  LOOP
    IF update_restaurant_cover_photo_intelligent(v_restaurant.id) THEN
      v_updated_count := v_updated_count + 1;
    END IF;
  END LOOP;

  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update cover when new high-quality image is added
CREATE OR REPLACE FUNCTION trigger_check_new_cover_candidate()
RETURNS TRIGGER AS $$
DECLARE
  v_restaurant RECORD;
BEGIN
  -- Only process public, approved images with good quality
  IF NEW.privacy = 'public' 
    AND NEW.is_approved = true 
    AND COALESCE(NEW.quality_score, 0) >= 0.7 THEN
    
    -- Get restaurant info
    SELECT auto_cover_enabled, has_manual_cover
    INTO v_restaurant
    FROM restaurants
    WHERE id = NEW.restaurant_id;
    
    -- Update if auto-cover is enabled and no manual cover
    IF v_restaurant.auto_cover_enabled AND NOT v_restaurant.has_manual_cover THEN
      PERFORM update_restaurant_cover_photo_intelligent(NEW.restaurant_id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace the trigger
DROP TRIGGER IF EXISTS trigger_new_cover_candidate ON restaurant_images;
CREATE TRIGGER trigger_new_cover_candidate
  AFTER INSERT OR UPDATE ON restaurant_images
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_new_cover_candidate();

-- Add RLS policy for quality metrics update
CREATE POLICY "System can update image quality metrics" ON restaurant_images
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION select_best_cover_photo TO authenticated;
GRANT EXECUTE ON FUNCTION update_restaurant_cover_photo_intelligent TO authenticated;
GRANT EXECUTE ON FUNCTION update_image_quality_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION batch_update_restaurant_covers TO service_role;