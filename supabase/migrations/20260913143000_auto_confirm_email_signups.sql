-- Allow email/password accounts to sign in immediately without waiting
-- for a confirmation message that often never arrives in local development.
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

UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email_confirmed_at IS NULL AND email IS NOT NULL;
