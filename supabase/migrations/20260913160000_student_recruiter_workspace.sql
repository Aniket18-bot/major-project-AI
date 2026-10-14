ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS education jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS achievements jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS certificates jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS projects jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.resumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  file_path text,
  source text NOT NULL DEFAULT 'generated',
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS resume_id uuid REFERENCES public.resumes(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.resumes TO authenticated;
GRANT ALL ON public.resumes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;

ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "resumes_select_relevant" ON public.resumes FOR SELECT TO authenticated
  USING (
    auth.uid() = student_id
    OR EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      WHERE a.student_id = resumes.student_id AND j.recruiter_id = auth.uid()
    )
  );
CREATE POLICY "resumes_insert_own" ON public.resumes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id);
CREATE POLICY "resumes_update_own" ON public.resumes FOR UPDATE TO authenticated
  USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);
CREATE POLICY "resumes_delete_own" ON public.resumes FOR DELETE TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "chat_select_own" ON public.chat_messages FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "chat_insert_own" ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER resumes_updated_at BEFORE UPDATE ON public.resumes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "resume_files_select_own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'resumes' AND split_part(name, '/', 1) = auth.uid()::text);
CREATE POLICY "resume_files_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'resumes' AND split_part(name, '/', 1) = auth.uid()::text);
CREATE POLICY "resume_files_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'resumes' AND split_part(name, '/', 1) = auth.uid()::text);
