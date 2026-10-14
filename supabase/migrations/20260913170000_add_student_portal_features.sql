-- Add profile completion percentage and other student-specific fields
DO $$
BEGIN
  -- Add columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'languages'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN languages text[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'preferred_roles'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN preferred_roles text[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'preferred_locations'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN preferred_locations text[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'work_mode_preference'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN work_mode_preference text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'expected_salary_min'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN expected_salary_min numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'expected_salary_max'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN expected_salary_max numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'employment_preference'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN employment_preference text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'profile_completion_percent'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN profile_completion_percent integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'profile_visibility'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN profile_visibility text DEFAULT 'public';
  END IF;

  -- Add company-specific fields for recruiters
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'company_logo'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN company_logo text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'company_founded'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN company_founded text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'company_culture'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN company_culture text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'company_benefits'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN company_benefits text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'company_tech_stack'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN company_tech_stack text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'company_social_links'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN company_social_links text;
  END IF;
END $$;

-- Add resume-specific fields if resumes table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'resumes') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'resumes' AND column_name = 'ats_score'
    ) THEN
      ALTER TABLE public.resumes ADD COLUMN ats_score numeric;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'resumes' AND column_name = 'formatting_score'
    ) THEN
      ALTER TABLE public.resumes ADD COLUMN formatting_score numeric;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'resumes' AND column_name = 'skills_coverage_score'
    ) THEN
      ALTER TABLE public.resumes ADD COLUMN skills_coverage_score numeric;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'resumes' AND column_name = 'keyword_relevance_score'
    ) THEN
      ALTER TABLE public.resumes ADD COLUMN keyword_relevance_score numeric;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'resumes' AND column_name = 'readability_score'
    ) THEN
      ALTER TABLE public.resumes ADD COLUMN readability_score numeric;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'resumes' AND column_name = 'completeness_score'
    ) THEN
      ALTER TABLE public.resumes ADD COLUMN completeness_score numeric;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'resumes' AND column_name = 'health_score'
    ) THEN
      ALTER TABLE public.resumes ADD COLUMN health_score numeric;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'resumes' AND column_name = 'analysis_data'
    ) THEN
      ALTER TABLE public.resumes ADD COLUMN analysis_data jsonb;
    END IF;
  END IF;
END $$;

-- Create saved jobs table
CREATE TABLE IF NOT EXISTS public.saved_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, job_id)
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  category text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  link text,
  action_link text,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_jobs TO authenticated;
GRANT ALL ON public.saved_jobs TO service_role;
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saved_jobs_select_own" ON public.saved_jobs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "saved_jobs_insert_own" ON public.saved_jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "saved_jobs_delete_own" ON public.saved_jobs FOR DELETE TO authenticated USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notifications_insert_own" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notifications_delete_own" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_id ON public.saved_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_job_id ON public.saved_jobs(job_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);

-- Add interview-related fields to applications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'applications' AND column_name = 'interview_scheduled_at'
  ) THEN
    ALTER TABLE public.applications ADD COLUMN interview_scheduled_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'applications' AND column_name = 'interview_date'
  ) THEN
    ALTER TABLE public.applications ADD COLUMN interview_date text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'applications' AND column_name = 'interview_time'
  ) THEN
    ALTER TABLE public.applications ADD COLUMN interview_time text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'applications' AND column_name = 'interview_type'
  ) THEN
    ALTER TABLE public.applications ADD COLUMN interview_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'applications' AND column_name = 'interview_link'
  ) THEN
    ALTER TABLE public.applications ADD COLUMN interview_link text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'applications' AND column_name = 'interview_notes'
  ) THEN
    ALTER TABLE public.applications ADD COLUMN interview_notes text;
  END IF;
END $$;

-- Add job-specific fields for recruiters
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'department'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN department text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'education_degree'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN education_degree text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'education_field'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN education_field text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'education_qualification'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN education_qualification text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'application_deadline'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN application_deadline timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'max_applications'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN max_applications integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'hiring_stages'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN hiring_stages text;
  END IF;
END $$;

-- Add detailed score breakdown to applications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'applications' AND column_name = 'skill_score'
  ) THEN
    ALTER TABLE public.applications ADD COLUMN skill_score numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'applications' AND column_name = 'experience_score'
  ) THEN
    ALTER TABLE public.applications ADD COLUMN experience_score numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'applications' AND column_name = 'education_score'
  ) THEN
    ALTER TABLE public.applications ADD COLUMN education_score numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'applications' AND column_name = 'project_score'
  ) THEN
    ALTER TABLE public.applications ADD COLUMN project_score numeric;
  END IF;
END $$;

-- Create recruiter notes table for better note management
CREATE TABLE IF NOT EXISTS public.recruiter_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  note text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recruiter_notes TO authenticated;
GRANT ALL ON public.recruiter_notes TO service_role;
ALTER TABLE public.recruiter_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recruiter_notes_select_own" ON public.recruiter_notes FOR SELECT TO authenticated USING (auth.uid() = recruiter_id);
CREATE POLICY "recruiter_notes_insert_own" ON public.recruiter_notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = recruiter_id);
CREATE POLICY "recruiter_notes_update_own" ON public.recruiter_notes FOR UPDATE TO authenticated USING (auth.uid() = recruiter_id) WITH CHECK (auth.uid() = recruiter_id);
CREATE POLICY "recruiter_notes_delete_own" ON public.recruiter_notes FOR DELETE TO authenticated USING (auth.uid() = recruiter_id);

CREATE INDEX IF NOT EXISTS idx_recruiter_notes_recruiter_id ON public.recruiter_notes(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_recruiter_notes_application_id ON public.recruiter_notes(application_id);

-- Add recruiter-specific preference fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'notification_preferences'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN notification_preferences jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'hiring_preferences'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN hiring_preferences jsonb;
  END IF;
END $$;
