# Supabase Database Migrations

## How to Apply Migrations

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste each migration file in order
4. Execute the SQL

## Migration Files

### 20240121_invite_system.sql
Creates tables for the invite/referral system:
- `user_referrals` - Stores referral codes
- `user_invite_shares` - Tracks when users share invites
- `user_referral_conversions` - Tracks successful referrals

### 20240121_achievement_system.sql
Creates tables for the achievement system:
- `user_achievements` - Stores unlocked achievements
- `user_events` - Tracks user events for analytics

## Important Notes

- These tables have Row Level Security (RLS) enabled
- Users can only access their own data
- Make sure to run these migrations before using the invite/achievement features