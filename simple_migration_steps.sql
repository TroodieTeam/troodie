-- SIMPLE MIGRATION STEPS
-- Run these one at a time in Supabase SQL Editor
-- Each step is safe and can be run independently

-- STEP 1: Add missing columns to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS owner_id uuid,
ADD COLUMN IF NOT EXISTS name character varying,
ADD COLUMN IF NOT EXISTS campaign_type character varying DEFAULT 'general',
ADD COLUMN IF NOT EXISTS budget_cents integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS spent_amount_cents integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS start_date date,
ADD COLUMN IF NOT EXISTS end_date date,
ADD COLUMN IF NOT EXISTS max_creators integer DEFAULT 5,
ADD COLUMN IF NOT EXISTS selected_creators_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_deliverables integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivered_content_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS deliverables_submitted integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS deliverables_pending integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS deliverables_approved integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS campaign_source character varying DEFAULT 'restaurant',
ADD COLUMN IF NOT EXISTS is_subsidized boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS subsidy_amount_cents integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS deliverable_requirements jsonb DEFAULT '{}';

-- STEP 2: Add missing columns to campaign_deliverables table
ALTER TABLE public.campaign_deliverables 
ADD COLUMN IF NOT EXISTS campaign_application_id uuid,
ADD COLUMN IF NOT EXISTS creator_id uuid,
ADD COLUMN IF NOT EXISTS restaurant_id uuid,
ADD COLUMN IF NOT EXISTS campaign_id uuid,
ADD COLUMN IF NOT EXISTS content_type character varying,
ADD COLUMN IF NOT EXISTS content_url text,
ADD COLUMN IF NOT EXISTS thumbnail_url text,
ADD COLUMN IF NOT EXISTS caption text,
ADD COLUMN IF NOT EXISTS social_platform character varying,
ADD COLUMN IF NOT EXISTS platform_post_url text,
ADD COLUMN IF NOT EXISTS views_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS likes_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS comments_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS shares_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS engagement_rate numeric,
ADD COLUMN IF NOT EXISTS status character varying DEFAULT 'pending_review',
ADD COLUMN IF NOT EXISTS submitted_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS reviewer_id uuid,
ADD COLUMN IF NOT EXISTS auto_approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS review_notes text,
ADD COLUMN IF NOT EXISTS rejection_reason text,
ADD COLUMN IF NOT EXISTS revision_notes text,
ADD COLUMN IF NOT EXISTS payment_status character varying DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_amount_cents integer,
ADD COLUMN IF NOT EXISTS payment_transaction_id text,
ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS payment_error text,
ADD COLUMN IF NOT EXISTS payment_retry_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_payment_retry_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS dispute_status character varying DEFAULT 'none',
ADD COLUMN IF NOT EXISTS dispute_reason text,
ADD COLUMN IF NOT EXISTS dispute_filed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS dispute_resolved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- STEP 3: Create missing tables (in dependency order)
CREATE TABLE IF NOT EXISTS public.creator_profiles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE,
  bio text,
  specialties text[] DEFAULT '{}',
  social_links jsonb DEFAULT '{}',
  verification_status character varying DEFAULT 'pending',
  metrics jsonb DEFAULT '{}',
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  display_name character varying,
  location character varying,
  food_specialties text[] DEFAULT '{}',
  portfolio_uploaded boolean DEFAULT false,
  instant_approved boolean DEFAULT true,
  avatar_url text,
  followers_count integer DEFAULT 0,
  content_count integer DEFAULT 0,
  account_status character varying DEFAULT 'active',
  stripe_account_id character varying,
  stripe_onboarding_completed boolean DEFAULT false,
  stripe_onboarded_at timestamp with time zone,
  CONSTRAINT creator_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT creator_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

CREATE TABLE IF NOT EXISTS public.business_profiles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE,
  restaurant_id uuid NOT NULL,
  verification_status character varying DEFAULT 'pending',
  claimed_at timestamp without time zone DEFAULT now(),
  management_permissions text[] DEFAULT '{}',
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  business_email character varying,
  business_role character varying,
  verification_method character varying,
  CONSTRAINT business_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT business_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT business_profiles_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id)
);

CREATE TABLE IF NOT EXISTS public.campaign_applications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  campaign_id uuid,
  creator_id uuid,
  proposed_rate_cents integer,
  proposed_deliverables text,
  cover_letter text,
  status character varying DEFAULT 'pending',
  applied_at timestamp with time zone DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewer_id uuid,
  deliverables_submitted integer DEFAULT 0,
  deliverables_approved integer DEFAULT 0,
  total_earned_cents integer DEFAULT 0,
  all_deliverables_submitted boolean DEFAULT false,
  restaurant_review_deadline timestamp with time zone,
  auto_approved boolean DEFAULT false,
  CONSTRAINT campaign_applications_pkey PRIMARY KEY (id),
  CONSTRAINT campaign_applications_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id),
  CONSTRAINT campaign_applications_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.creator_profiles(id),
  CONSTRAINT campaign_applications_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES auth.users(id)
);

-- STEP 4: Add foreign key constraints (drop first to avoid conflicts)
DO $$ 
BEGIN
    -- Drop existing constraints if they exist
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'campaigns_owner_id_fkey') THEN
        ALTER TABLE public.campaigns DROP CONSTRAINT campaigns_owner_id_fkey;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'campaign_deliverables_campaign_application_id_fkey') THEN
        ALTER TABLE public.campaign_deliverables DROP CONSTRAINT campaign_deliverables_campaign_application_id_fkey;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'campaign_deliverables_creator_id_fkey') THEN
        ALTER TABLE public.campaign_deliverables DROP CONSTRAINT campaign_deliverables_creator_id_fkey;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'campaign_deliverables_restaurant_id_fkey') THEN
        ALTER TABLE public.campaign_deliverables DROP CONSTRAINT campaign_deliverables_restaurant_id_fkey;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'campaign_deliverables_campaign_id_fkey') THEN
        ALTER TABLE public.campaign_deliverables DROP CONSTRAINT campaign_deliverables_campaign_id_fkey;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'campaign_deliverables_reviewer_id_fkey') THEN
        ALTER TABLE public.campaign_deliverables DROP CONSTRAINT campaign_deliverables_reviewer_id_fkey;
    END IF;
END $$;

-- Add the foreign key constraints
ALTER TABLE public.campaigns 
ADD CONSTRAINT campaigns_owner_id_fkey 
FOREIGN KEY (owner_id) REFERENCES auth.users(id);

ALTER TABLE public.campaign_deliverables 
ADD CONSTRAINT campaign_deliverables_campaign_application_id_fkey 
FOREIGN KEY (campaign_application_id) REFERENCES public.campaign_applications(id) ON DELETE CASCADE;

ALTER TABLE public.campaign_deliverables 
ADD CONSTRAINT campaign_deliverables_creator_id_fkey 
FOREIGN KEY (creator_id) REFERENCES public.creator_profiles(id);

ALTER TABLE public.campaign_deliverables 
ADD CONSTRAINT campaign_deliverables_restaurant_id_fkey 
FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id);

ALTER TABLE public.campaign_deliverables 
ADD CONSTRAINT campaign_deliverables_campaign_id_fkey 
FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);

ALTER TABLE public.campaign_deliverables 
ADD CONSTRAINT campaign_deliverables_reviewer_id_fkey 
FOREIGN KEY (reviewer_id) REFERENCES auth.users(id);

-- STEP 5: Add indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_owner_id ON public.campaigns(owner_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_end_date ON public.campaigns(end_date);
CREATE INDEX IF NOT EXISTS idx_campaign_applications_campaign_id ON public.campaign_applications(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_applications_creator_id ON public.campaign_applications(creator_id);
CREATE INDEX IF NOT EXISTS idx_campaign_applications_status ON public.campaign_applications(status);
CREATE INDEX IF NOT EXISTS idx_campaign_deliverables_campaign_id ON public.campaign_deliverables(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_deliverables_creator_id ON public.campaign_deliverables(creator_id);
CREATE INDEX IF NOT EXISTS idx_campaign_deliverables_status ON public.campaign_deliverables(status);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_user_id ON public.creator_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_business_profiles_user_id ON public.business_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_business_profiles_restaurant_id ON public.business_profiles(restaurant_id);

-- STEP 6: Enable RLS and add policies
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for business_profiles
DROP POLICY IF EXISTS "Users can view their own business profile" ON public.business_profiles;
CREATE POLICY "Users can view their own business profile" ON public.business_profiles
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own business profile" ON public.business_profiles;
CREATE POLICY "Users can insert their own business profile" ON public.business_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own business profile" ON public.business_profiles;
CREATE POLICY "Users can update their own business profile" ON public.business_profiles
  FOR UPDATE USING (user_id = auth.uid());

-- RLS policies for campaign_applications
DROP POLICY IF EXISTS "Creators can view their own applications" ON public.campaign_applications;
CREATE POLICY "Creators can view their own applications" ON public.campaign_applications
  FOR SELECT USING (
    creator_id IN (SELECT id FROM public.creator_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Business owners can view applications to their campaigns" ON public.campaign_applications;
CREATE POLICY "Business owners can view applications to their campaigns" ON public.campaign_applications
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM public.campaigns WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Creators can insert their own applications" ON public.campaign_applications;
CREATE POLICY "Creators can insert their own applications" ON public.campaign_applications
  FOR INSERT WITH CHECK (
    creator_id IN (SELECT id FROM public.creator_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Business owners can update applications to their campaigns" ON public.campaign_applications;
CREATE POLICY "Business owners can update applications to their campaigns" ON public.campaign_applications
  FOR UPDATE USING (
    campaign_id IN (
      SELECT id FROM public.campaigns WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can update campaign applications" ON public.campaign_applications;
CREATE POLICY "Admins can update campaign applications" ON public.campaign_applications
  FOR UPDATE USING (
    auth.uid() IN (
      'a23aaf2a-45b2-4ca7-a3a2-cafb0fc0c599' -- kouame@troodieapp.com
    )
  );

-- RLS policies for creator_profiles
DROP POLICY IF EXISTS "Users can view their own creator profile" ON public.creator_profiles;
CREATE POLICY "Users can view their own creator profile" ON public.creator_profiles
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own creator profile" ON public.creator_profiles;
CREATE POLICY "Users can insert their own creator profile" ON public.creator_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own creator profile" ON public.creator_profiles;
CREATE POLICY "Users can update their own creator profile" ON public.creator_profiles
  FOR UPDATE USING (user_id = auth.uid());

-- RLS policies for campaign_deliverables
DROP POLICY IF EXISTS "Creators can view their own deliverables" ON public.campaign_deliverables;
CREATE POLICY "Creators can view their own deliverables" ON public.campaign_deliverables
  FOR SELECT USING (
    creator_id IN (SELECT id FROM public.creator_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Business owners can view deliverables for their campaigns" ON public.campaign_deliverables;
CREATE POLICY "Business owners can view deliverables for their campaigns" ON public.campaign_deliverables
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM public.campaigns WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Creators can insert their own deliverables" ON public.campaign_deliverables;
CREATE POLICY "Creators can insert their own deliverables" ON public.campaign_deliverables
  FOR INSERT WITH CHECK (
    creator_id IN (SELECT id FROM public.creator_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Business owners can update deliverables for their campaigns" ON public.campaign_deliverables;
CREATE POLICY "Business owners can update deliverables for their campaigns" ON public.campaign_deliverables
  FOR UPDATE USING (
    campaign_id IN (
      SELECT id FROM public.campaigns WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can update campaign deliverables" ON public.campaign_deliverables;
CREATE POLICY "Admins can update campaign deliverables" ON public.campaign_deliverables
  FOR UPDATE USING (
    auth.uid() IN (
      'a23aaf2a-45b2-4ca7-a3a2-cafb0fc0c599' -- kouame@troodieapp.com
    )
  );

DROP POLICY IF EXISTS "Admins can view campaign deliverables" ON public.campaign_deliverables;
CREATE POLICY "Admins can view campaign deliverables" ON public.campaign_deliverables
  FOR SELECT USING (
    auth.uid() IN (
      'a23aaf2a-45b2-4ca7-a3a2-cafb0fc0c599' -- kouame@troodieapp.com
    )
  );

-- STEP 7: Create view
CREATE OR REPLACE VIEW public.pending_deliverables_summary AS
SELECT 
  c.id as campaign_id,
  c.title as campaign_title,
  c.owner_id,
  COUNT(cd.id) as pending_deliverables_count
FROM public.campaigns c
LEFT JOIN public.campaign_deliverables cd ON c.id = cd.campaign_id 
  AND cd.status IN ('pending_review', 'revision_requested')
GROUP BY c.id, c.title, c.owner_id;

-- Grant permissions
GRANT SELECT ON public.pending_deliverables_summary TO authenticated;
GRANT SELECT ON public.pending_deliverables_summary TO anon;
