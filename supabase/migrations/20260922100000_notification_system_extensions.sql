-- ========================================
-- NOTIFICATION SYSTEM EXTENSIONS
-- ========================================

-- Add priority and related entity fields to notifications table
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'important' CHECK (priority IN ('critical', 'important', 'low')),
ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'student' CHECK (user_type IN ('student', 'recruiter')),
ADD COLUMN IF NOT EXISTS related_entity_type TEXT,
ADD COLUMN IF NOT EXISTS related_entity_id UUID,
ADD COLUMN IF NOT EXISTS action_url TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT true,
  in_app_enabled BOOLEAN DEFAULT true,
  job_recommendations BOOLEAN DEFAULT true,
  application_updates BOOLEAN DEFAULT true,
  assessment_updates BOOLEAN DEFAULT true,
  interview_updates BOOLEAN DEFAULT true,
  career_updates BOOLEAN DEFAULT true,
  recruiter_application_updates BOOLEAN DEFAULT true,
  recruiter_ai_updates BOOLEAN DEFAULT true,
  recruiter_assessment_updates BOOLEAN DEFAULT true,
  recruiter_interview_updates BOOLEAN DEFAULT true,
  recruiter_job_deadline_updates BOOLEAN DEFAULT true,
  system_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create email logs table
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient TEXT NOT NULL,
  template TEXT NOT NULL,
  subject TEXT NOT NULL,
  related_entity_type TEXT,
  related_entity_id UUID,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'retrying')),
  sent_at TIMESTAMPTZ,
  failure_reason TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON public.notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_user_type ON public.notifications(user_type);
CREATE INDEX IF NOT EXISTS idx_notifications_related_entity ON public.notifications(related_entity_type, related_entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_action_url ON public.notifications(action_url);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON public.email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_template ON public.email_logs(template);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "notification_preferences_select_own" ON public.notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_insert_own" ON public.notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_update_own" ON public.notification_preferences;

-- Create policies
CREATE POLICY "notification_preferences_select_own" ON public.notification_preferences FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notification_preferences_insert_own" ON public.notification_preferences FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notification_preferences_update_own" ON public.notification_preferences FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_logs TO authenticated;
GRANT ALL ON public.email_logs TO service_role;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "email_logs_select_own" ON public.email_logs;
DROP POLICY IF EXISTS "email_logs_insert_service" ON public.email_logs;
DROP POLICY IF EXISTS "email_logs_update_service" ON public.email_logs;

-- Create policies
CREATE POLICY "email_logs_select_own" ON public.email_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "email_logs_insert_service" ON public.email_logs FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "email_logs_update_service" ON public.email_logs FOR UPDATE TO service_role WITH CHECK (true);

-- Update existing notifications policies to allow service role to insert for cross-user notifications
DROP POLICY IF EXISTS "notifications_insert_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_service" ON public.notifications;

CREATE POLICY "notifications_insert_own" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notifications_insert_service" ON public.notifications FOR INSERT TO service_role WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON public.notification_preferences;

-- Trigger for notification_preferences
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
