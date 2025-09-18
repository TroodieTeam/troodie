import { supabase } from '@/lib/supabase';
import { Alert } from 'react-native';

/**
 * Creator Application Service
 * Handles creator program applications with pending state review
 * Task: PS-005
 */

export interface SubmitCreatorApplicationRequest {
  instagram_handle?: string;
  tiktok_handle?: string;
  youtube_handle?: string;
  twitter_handle?: string;
  follower_count: number;
  content_categories: string[];
  sample_content_urls: string[];
  bio: string;
  location: string;
  preferred_cuisine_types: string[];
  has_business_email: boolean;
  agrees_to_terms: boolean;
}

export interface ApplicationStatusResponse {
  application_id: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at?: string;
  rejection_reason?: string;
  review_notes?: string;
  can_reapply: boolean;
  next_steps: string;
}

// Validation constants
export const CREATOR_REQUIREMENTS = {
  min_followers: 1000,
  min_content_samples: 3,
  max_content_samples: 10,
  required_platforms: 1,
  min_bio_length: 100,
  max_bio_length: 500
};

class CreatorApplicationService {
  /**
   * Submit a new creator application
   */
  async submitCreatorApplication(request: SubmitCreatorApplicationRequest) {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Not authenticated');

      // Validate the application
      const validationErrors = this.validateApplication(request);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join('. '));
      }

      // Check for existing applications
      const { data: existingApp, error: checkError } = await supabase
        .from('creator_applications')
        .select('id, status, reviewed_at')
        .eq('user_id', user.id)
        .in('status', ['pending', 'approved'])
        .single();

      if (existingApp && !checkError) {
        if (existingApp.status === 'pending') {
          throw new Error('You already have a pending creator application');
        }
        if (existingApp.status === 'approved') {
          throw new Error('You are already an approved creator');
        }
      }

      // Check if user was recently rejected (30-day cooldown)
      const { data: recentRejection } = await supabase
        .from('creator_applications')
        .select('reviewed_at')
        .eq('user_id', user.id)
        .eq('status', 'rejected')
        .gte('reviewed_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .single();

      if (recentRejection) {
        throw new Error('You must wait 30 days after rejection before reapplying');
      }

      // Create the application in pending state
      const { data: application, error: appError } = await supabase
        .from('creator_applications')
        .insert({
          user_id: user.id,
          status: 'pending',
          instagram_handle: request.instagram_handle,
          tiktok_handle: request.tiktok_handle,
          youtube_handle: request.youtube_handle,
          twitter_handle: request.twitter_handle,
          follower_count: request.follower_count,
          content_categories: request.content_categories,
          sample_content_urls: request.sample_content_urls,
          bio: request.bio,
          location: request.location,
          preferred_cuisine_types: request.preferred_cuisine_types,
          has_business_email: request.has_business_email,
          submitted_at: new Date().toISOString()
        })
        .select()
        .single();

      if (appError) {
        console.error('Error creating application:', appError);
        throw new Error('Failed to submit application. Please try again.');
      }

      return {
        application_id: application.id,
        status: 'pending' as const,
        submitted_at: application.submitted_at,
        estimated_review_time: '48-72 hours',
        message: 'Your creator application has been submitted! We\'ll review it within 48-72 hours.'
      };
    } catch (error) {
      console.error('CreatorApplicationService.submitApplication error:', error);
      throw error;
    }
  }

  /**
   * Validate creator application
   */
  validateApplication(data: SubmitCreatorApplicationRequest): string[] {
    const errors: string[] = [];

    // Check minimum followers
    if (data.follower_count < CREATOR_REQUIREMENTS.min_followers) {
      errors.push(`Minimum ${CREATOR_REQUIREMENTS.min_followers} followers required`);
    }

    // Check for at least one social platform
    const hasSocialHandle =
      data.instagram_handle ||
      data.tiktok_handle ||
      data.youtube_handle ||
      data.twitter_handle;

    if (!hasSocialHandle) {
      errors.push('At least one social media account required');
    }

    // Check content samples
    if (data.sample_content_urls.length < CREATOR_REQUIREMENTS.min_content_samples) {
      errors.push(`Provide at least ${CREATOR_REQUIREMENTS.min_content_samples} content samples`);
    }

    if (data.sample_content_urls.length > CREATOR_REQUIREMENTS.max_content_samples) {
      errors.push(`Maximum ${CREATOR_REQUIREMENTS.max_content_samples} content samples allowed`);
    }

    // Check bio length
    if (data.bio.length < CREATOR_REQUIREMENTS.min_bio_length) {
      errors.push('Bio too short. Tell us more about yourself');
    }

    if (data.bio.length > CREATOR_REQUIREMENTS.max_bio_length) {
      errors.push('Bio too long. Please keep it concise');
    }

    // Check terms agreement
    if (!data.agrees_to_terms) {
      errors.push('You must agree to the creator terms and conditions');
    }

    return errors;
  }

  /**
   * Get current application status
   */
  async getCreatorApplicationStatus(): Promise<ApplicationStatusResponse | null> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Not authenticated');

      const { data: application, error } = await supabase
        .from('creator_applications')
        .select('*')
        .eq('user_id', user.id)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !application) {
        return null;
      }

      const nextSteps = this.getNextSteps(application.status, application.rejection_reason);
      const daysSinceReview = application.reviewed_at
        ? Math.floor((Date.now() - new Date(application.reviewed_at).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        application_id: application.id,
        status: application.status,
        submitted_at: application.submitted_at,
        reviewed_at: application.reviewed_at,
        rejection_reason: application.rejection_reason,
        review_notes: application.review_notes,
        can_reapply: application.status === 'rejected' && daysSinceReview > 30,
        next_steps: nextSteps
      };
    } catch (error) {
      console.error('CreatorApplicationService.getApplicationStatus error:', error);
      throw error;
    }
  }

  /**
   * Get next steps based on application status
   */
  private getNextSteps(status: string, rejection_reason?: string): string {
    switch (status) {
      case 'pending':
        return 'Your application is being reviewed. Check back in 48-72 hours.';
      case 'approved':
        return 'Congratulations! Visit your creator dashboard to start creating campaigns.';
      case 'rejected':
        if (rejection_reason?.includes('followers')) {
          return 'Grow your following to 1,000+ and reapply in 30 days.';
        }
        if (rejection_reason?.includes('content')) {
          return 'Improve your content quality and reapply in 30 days.';
        }
        if (rejection_reason?.includes('engagement')) {
          return 'Focus on building engagement with your audience and reapply in 30 days.';
        }
        return 'Review the feedback and reapply in 30 days.';
      default:
        return 'Please contact support for assistance.';
    }
  }

  /**
   * Get all applications for the current user
   */
  async getMyApplications() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Not authenticated');

      const { data: applications, error } = await supabase
        .from('creator_applications')
        .select('*')
        .eq('user_id', user.id)
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('Error fetching applications:', error);
        throw new Error('Failed to fetch applications');
      }

      return applications || [];
    } catch (error) {
      console.error('CreatorApplicationService.getMyApplications error:', error);
      throw error;
    }
  }

  /**
   * Check if user can apply for creator program
   */
  async canApplyForCreator(): Promise<{
    canApply: boolean;
    reason?: string;
  }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { canApply: false, reason: 'Not authenticated' };
      }

      // Check if user already has an approved or pending application
      const { data: existingApp } = await supabase
        .from('creator_applications')
        .select('id, status, reviewed_at')
        .eq('user_id', user.id)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .single();

      if (existingApp) {
        if (existingApp.status === 'pending') {
          return { canApply: false, reason: 'You have a pending application' };
        }
        if (existingApp.status === 'approved') {
          return { canApply: false, reason: 'You are already an approved creator' };
        }
        if (existingApp.status === 'rejected' && existingApp.reviewed_at) {
          const daysSinceRejection = Math.floor(
            (Date.now() - new Date(existingApp.reviewed_at).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysSinceRejection < 30) {
            return {
              canApply: false,
              reason: `You can reapply in ${30 - daysSinceRejection} days`
            };
          }
        }
      }

      // Check if user is already a creator
      const { data: userProfile } = await supabase
        .from('users')
        .select('is_creator')
        .eq('id', user.id)
        .single();

      if (userProfile?.is_creator) {
        return { canApply: false, reason: 'You are already a creator' };
      }

      return { canApply: true };
    } catch (error) {
      console.error('CreatorApplicationService.canApplyForCreator error:', error);
      return { canApply: false, reason: 'Error checking application eligibility' };
    }
  }

  /**
   * Get connected social platforms from application
   */
  getConnectedPlatforms(application: any): string[] {
    const platforms: string[] = [];
    if (application.instagram_handle) platforms.push('Instagram');
    if (application.tiktok_handle) platforms.push('TikTok');
    if (application.youtube_handle) platforms.push('YouTube');
    if (application.twitter_handle) platforms.push('Twitter');
    return platforms;
  }

  /**
   * Calculate total followers across platforms
   * Note: This would need actual API integration to get real numbers
   */
  async calculateTotalFollowers(handles: {
    instagram?: string;
    tiktok?: string;
    youtube?: string;
    twitter?: string;
  }): Promise<number> {
    // For now, this returns the submitted follower count
    // In production, this would connect to social media APIs
    return 0;
  }

  /**
   * Withdraw a pending application
   */
  async withdrawApplication(applicationId: string): Promise<void> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('creator_applications')
        .delete()
        .eq('id', applicationId)
        .eq('user_id', user.id)
        .eq('status', 'pending');

      if (error) {
        throw new Error('Failed to withdraw application');
      }
    } catch (error) {
      console.error('CreatorApplicationService.withdrawApplication error:', error);
      throw error;
    }
  }
}

export const creatorApplicationService = new CreatorApplicationService();