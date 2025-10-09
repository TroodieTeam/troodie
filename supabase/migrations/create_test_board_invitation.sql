-- Create a test board invitation
-- Replace the UUIDs with your actual values if needed

-- First, let's see what boards and users exist
SELECT 'Boards:' as type, id, title, user_id as owner_id FROM boards LIMIT 5;
SELECT 'Users:' as type, id, name, email FROM users LIMIT 5;

-- Create a test invitation
-- Board ID: 587cae0b-6957-480a-b7cd-0452636298d6
-- Invitee ID: a377b2e8-830c-4c06-8494-44254ceb3b91
-- You'll need to replace the inviter_id with the actual board owner's ID

INSERT INTO board_invitations (
  id,
  board_id,
  inviter_id,
  invitee_id,
  status,
  expires_at
)
VALUES (
  '592e38d6-978d-4a2d-bdca-faa612881111',
  '587cae0b-6957-480a-b7cd-0452636298d6',
  (SELECT user_id FROM boards WHERE id = '587cae0b-6957-480a-b7cd-0452636298d6'), -- Get the board owner as inviter
  'a377b2e8-830c-4c06-8494-44254ceb3b91',
  'pending',
  NOW() + INTERVAL '7 days'
)
ON CONFLICT (id) DO UPDATE
SET status = 'pending', -- Reset to pending if it was already accepted/declined
    expires_at = NOW() + INTERVAL '7 days';

-- Verify the invitation was created
SELECT * FROM board_invitations WHERE id = '592e38d6-978d-4a2d-bdca-faa612881111';
