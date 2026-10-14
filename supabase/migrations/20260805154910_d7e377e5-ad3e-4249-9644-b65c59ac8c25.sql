CREATE TYPE public.app_role AS ENUM ('student', 'recruiter');
CREATE TYPE public.application_status AS ENUM ('applied','under_review','shortlisted','interview','on_hold','selected','rejected');
CREATE TYPE public.job_status AS ENUM ('open','closed');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  role public.app_role NOT NULL DEFAULT 'student',
  headline text,
  phone text,
  location text,
  about text,
  avatar_url text,
  linkedin_url text,
  github_url text,
  portfolio_url text,
  skills text[] NOT NULL DEFAULT '{}',
  years_experience numeric,
  company_name text,
  company_website text,
  company_industry text,
  company_size text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _role public.app_role;
BEGIN
  _role := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role',''), 'student')::public.app_role;
  INSERT INTO public.profiles (id, email, full_name, role, company_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), _role, NEW.raw_user_meta_data->>'company_name')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
  UPDATE auth.users
  SET email_confirmed_at = COALESCE(email_confirmed_at, now())
  WHERE id = NEW.id AND email_confirmed_at IS NULL;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  company_name text NOT NULL,
  location text,
  work_mode text,
  employment_type text,
  min_experience numeric NOT NULL DEFAULT 0,
  salary_min numeric,
  salary_max numeric,
  description text NOT NULL,
  responsibilities text,
  required_skills text[] NOT NULL DEFAULT '{}',
  preferred_skills text[] NOT NULL DEFAULT '{}',
  status public.job_status NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jobs_select_authenticated" ON public.jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "jobs_insert_own" ON public.jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = recruiter_id AND public.has_role(auth.uid(), 'recruiter'));
CREATE POLICY "jobs_update_own" ON public.jobs FOR UPDATE TO authenticated USING (auth.uid() = recruiter_id) WITH CHECK (auth.uid() = recruiter_id);
CREATE POLICY "jobs_delete_own" ON public.jobs FOR DELETE TO authenticated USING (auth.uid() = recruiter_id);
CREATE TRIGGER jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.application_status NOT NULL DEFAULT 'applied',
  stage text NOT NULL DEFAULT 'Application received',
  match_score numeric,
  matched_skills text[] NOT NULL DEFAULT '{}',
  missing_skills text[] NOT NULL DEFAULT '{}',
  explanation text,
  recruiter_note text,
  cover_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.owns_job(_job_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.jobs WHERE id = _job_id AND recruiter_id = _user_id)
$$;

CREATE POLICY "applications_select_student" ON public.applications FOR SELECT TO authenticated USING (auth.uid() = student_id);
CREATE POLICY "applications_select_recruiter" ON public.applications FOR SELECT TO authenticated USING (public.owns_job(job_id, auth.uid()));
CREATE POLICY "applications_insert_student" ON public.applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);
CREATE POLICY "applications_update_recruiter" ON public.applications FOR UPDATE TO authenticated USING (public.owns_job(job_id, auth.uid())) WITH CHECK (public.owns_job(job_id, auth.uid()));
CREATE POLICY "applications_delete_student" ON public.applications FOR DELETE TO authenticated USING (auth.uid() = student_id);
CREATE TRIGGER applications_updated_at BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX applications_job_idx ON public.applications(job_id);
CREATE INDEX applications_student_idx ON public.applications(student_id);
CREATE INDEX jobs_recruiter_idx ON public.jobs(recruiter_id);