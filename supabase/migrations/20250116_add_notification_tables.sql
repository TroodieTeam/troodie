-- Add notification tables for status change notifications
-- Task: PS-009

-- Create notification_emails table for email queue
CREATE TABLE IF NOT EXISTS public.notification_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email VARCHAR NOT NULL,
  to_name VARCHAR,
  subject VARCHAR NOT NULL,
  template VARCHAR NOT NULL,
  template_data JSONB,
  status VARCHAR NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create push_tokens table for push notifications
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token VARCHAR NOT NULL,
  platform VARCHAR NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, token)
);

-- Create notifications table if not exists (for in-app notifications)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  related_id UUID,
  related_type VARCHAR,
  priority INTEGER DEFAULT 1,
  is_read BOOLEAN DEFAULT false,
  is_actioned BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notification_emails_status ON public.notification_emails(status);
CREATE INDEX IF NOT EXISTS idx_notification_emails_created_at ON public.notification_emails(created_at);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON public.push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON public.push_tokens(is_active);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_related ON public.notifications(related_id, related_type);

-- Create view for unread notification counts
CREATE OR REPLACE VIEW public.notification_counts AS
SELECT
  user_id,
  COUNT(*) FILTER (WHERE is_read = false) AS unread_count,
  COUNT(*) AS total_count,
  MAX(created_at) AS latest_notification_at
FROM public.notifications
GROUP BY user_id;

-- Create function to auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_notification_emails_updated_at
  BEFORE UPDATE ON public.notification_emails
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_push_tokens_updated_at
  BEFORE UPDATE ON public.push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to clean up old notifications
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  -- Delete read notifications older than 30 days
  DELETE FROM public.notifications
  WHERE is_read = true
    AND read_at < NOW() - INTERVAL '30 days';

  -- Delete expired notifications
  DELETE FROM public.notifications
  WHERE expires_at IS NOT NULL
    AND expires_at < NOW();

  -- Delete old failed emails
  DELETE FROM public.notification_emails
  WHERE status = 'failed'
    AND created_at < NOW() - INTERVAL '7 days';

  -- Delete old sent emails
  DELETE FROM public.notification_emails
  WHERE status = 'sent'
    AND sent_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE public.notification_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for push_tokens
CREATE POLICY "Users can view their own push tokens"
  ON public.push_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own push tokens"
  ON public.push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own push tokens"
  ON public.push_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push tokens"
  ON public.push_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for notification_emails (admin only)
CREATE POLICY "Only admins can view notification emails"
  ON public.notification_emails FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND (account_type = 'admin' OR is_verified = true)
    )
  );

-- Grant permissions
GRANT SELECT ON public.notification_counts TO authenticated;
GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.push_tokens TO authenticated;
GRANT SELECT ON public.notification_emails TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.notification_emails IS 'Queue for email notifications to be sent';
COMMENT ON TABLE public.push_tokens IS 'User push notification tokens for mobile/web';
COMMENT ON TABLE public.notifications IS 'In-app notifications for users';
COMMENT ON VIEW public.notification_counts IS 'Real-time unread notification counts per user';
COMMENT ON FUNCTION public.cleanup_old_notifications IS 'Maintenance function to clean up old notification data';