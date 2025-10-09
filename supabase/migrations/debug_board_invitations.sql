-- Debug: Check board invitations for this specific case
-- Run this in Supabase SQL Editor to see what's in the table

SELECT
  id,
  board_id,
  inviter_id,
  invitee_id,
  invite_email,
  status,
  created_at,
  expires_at
FROM board_invitations
WHERE board_id = '587cae0b-6957-480a-b7cd-0452636298d6'
ORDER BY created_at DESC;

-- Also check if there are ANY invitations for the user
SELECT
  id,
  board_id,
  inviter_id,
  invitee_id,
  invite_email,
  status,
  created_at,
  expires_at
FROM board_invitations
WHERE invitee_id = 'a377b2e8-830c-4c06-8494-44254ceb3b91'
ORDER BY created_at DESC;

-- Check all invitations (to see the structure)
SELECT
  id,
  board_id,
  inviter_id,
  invitee_id,
  invite_email,
  status,
  created_at,
  expires_at
FROM board_invitations
ORDER BY created_at DESC
LIMIT 10;
