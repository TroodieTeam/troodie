-- ============================================================================
-- Fix: Community Member & Post Counts (Clean Sweep & Repair)
-- ============================================================================

-- 1. SCHEMA: Ensure columns exist
ALTER TABLE "public"."communities" 
ADD COLUMN IF NOT EXISTS "member_count" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "post_count" INTEGER DEFAULT 0;

-- 2. CLEANUP: Remove ALL duplicate/conflicting triggers
DROP TRIGGER IF EXISTS "on_member_change" ON public.community_members;
DROP TRIGGER IF EXISTS "update_community_member_count" ON public.community_members;
DROP TRIGGER IF EXISTS "update_community_member_count_trigger" ON public.community_members;
DROP TRIGGER IF EXISTS "tr_community_members_count" ON public.community_members;

DROP TRIGGER IF EXISTS "on_post_change" ON public.posts;
DROP TRIGGER IF EXISTS "on_post_community_change" ON public.post_communities;
DROP TRIGGER IF EXISTS "update_community_post_count" ON public.post_communities;
DROP TRIGGER IF EXISTS "update_community_post_count_trigger" ON public.post_communities;

-- 3. LOGIC: Create/Replace the Counting Functions
CREATE OR REPLACE FUNCTION public.update_community_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.communities SET member_count = member_count + 1 WHERE id = NEW.community_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.communities SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.community_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_community_post_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.communities SET post_count = post_count + 1 WHERE id = NEW.community_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.communities SET post_count = GREATEST(post_count - 1, 0) WHERE id = OLD.community_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. TRIGGERS: Re-attach the Single Source of Truth
CREATE TRIGGER on_member_change
AFTER INSERT OR DELETE ON public.community_members
FOR EACH ROW EXECUTE FUNCTION public.update_community_member_count();

CREATE TRIGGER on_post_community_change
AFTER INSERT OR DELETE ON public.post_communities
FOR EACH ROW EXECUTE FUNCTION public.update_community_post_count();

-- 5. DATA REPAIR: Force-recalculate everything
-- This fixes "Ghost Data" and filters out broken links to deleted posts
UPDATE public.communities c
SET 
  member_count = (
    SELECT count(*) 
    FROM public.community_members cm 
    WHERE cm.community_id = c.id AND cm.status = 'active'
  ),
  post_count = (
    SELECT count(*) 
    FROM public.post_communities pc 
    JOIN public.posts p ON p.id = pc.post_id -- JOIN ensures we only count Valid posts
    WHERE pc.community_id = c.id
  );