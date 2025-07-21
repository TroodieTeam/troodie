import { supabase } from '@/lib/supabase';
import { Share } from 'react-native';
import { AchievementService } from './achievementService';

export class InviteService {
  async generateInviteLink(userId: string) {
    if (!userId) {
      throw new Error('User ID is required to generate invite link');
    }
    
    // Generate a unique referral code
    const userPart = userId.length >= 6 ? userId.slice(0, 6) : userId;
    const referralCode = `${userPart}${Date.now().toString(36)}`;
    
    // Store the referral code (skip if table doesn't exist)
    try {
      const { error } = await supabase
        .from('user_referrals')
        .insert({
          user_id: userId,
          referral_code: referralCode,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.warn('Could not store referral code in database:', error);
        // Continue anyway - the invite link will still work
      }
    } catch (dbError) {
      console.warn('Database table may not exist yet:', dbError);
      // Continue anyway - the invite link will still work
    }

    return `https://troodie.app/invite/${referralCode}`;
  }

  async shareInvite(userId: string) {
    if (!userId) {
      throw new Error('User ID is required to share invite');
    }

    try {
      const inviteLink = await this.generateInviteLink(userId);
      
      const shareOptions = {
        message: `Join me on Troodie to discover the best food spots! 🍽️\n\n${inviteLink}`,
        title: 'Join Troodie'
      };

      const result = await Share.share(shareOptions);
      if (result.action === Share.sharedAction) {
        // Track successful share (skip if table doesn't exist)
        try {
          await supabase
            .from('user_invite_shares')
            .insert({
              user_id: userId,
              shared_at: new Date().toISOString()
            });
        } catch (trackError) {
          console.warn('Could not track invite share:', trackError);
          // Continue anyway - the share was successful
        }
      }
      return result;
    } catch (error) {
      console.error('Error in shareInvite:', error);
      throw error;
    }
  }

  async trackInviteAccepted(referralCode: string, newUserId: string) {
    const { data: referral } = await supabase
      .from('user_referrals')
      .select('user_id')
      .eq('referral_code', referralCode)
      .single();

    if (referral) {
      await supabase
        .from('user_referral_conversions')
        .insert({
          referrer_id: referral.user_id,
          referred_user_id: newUserId,
          converted_at: new Date().toISOString()
        });

      // Check if this is their first successful invite
      const { count } = await supabase
        .from('user_referral_conversions')
        .select('id', { count: 'exact' })
        .eq('referrer_id', referral.user_id);

      if (count === 1) {
        const achievementService = new AchievementService();
        await achievementService.unlockAchievement(referral.user_id, 'network_builder');
      }
    }
  }
} 