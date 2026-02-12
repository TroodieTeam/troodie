-- Step 7: Pre-configure Stripe accounts (skip onboarding in E2E)

INSERT INTO public.stripe_accounts (
  user_id,
  stripe_account_id,
  account_type,
  onboarding_completed,
  stripe_account_status,
  created_at,
  updated_at
)
VALUES
  (
    'cfd8cdb5-a227-42bd-8040-cd4fb965b58e'::uuid,
    'acct_test_biz_deliv_' || EXTRACT(EPOCH FROM NOW())::bigint,
    'business',
    true,
    'enabled',
    NOW(),
    NOW()
  ),
  (
    '348be0b5-eef5-41be-8728-84c4d09d2bf2'::uuid,
    'acct_test_cr1_deliv_' || EXTRACT(EPOCH FROM NOW())::bigint,
    'creator',
    true,
    'enabled',
    NOW(),
    NOW()
  )
ON CONFLICT (user_id, account_type) DO UPDATE SET
  onboarding_completed = EXCLUDED.onboarding_completed,
  stripe_account_status = EXCLUDED.stripe_account_status,
  updated_at = NOW();

-- If creator_profiles has these columns, update them; otherwise remove them
UPDATE public.creator_profiles
SET
  stripe_account_id = 'acct_test_cr1_deliv_' || EXTRACT(EPOCH FROM NOW())::bigint,
  stripe_onboarding_completed = true,
  updated_at = NOW()
WHERE user_id = '348be0b5-eef5-41be-8728-84c4d09d2bf2'::uuid;