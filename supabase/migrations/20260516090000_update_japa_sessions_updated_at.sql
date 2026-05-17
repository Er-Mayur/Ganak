-- Allow client-provided updated_at for japa_sessions
CREATE OR REPLACE FUNCTION public.update_japa_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.updated_at IS NULL THEN
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_japa_sessions_updated_at ON public.japa_sessions;
CREATE TRIGGER update_japa_sessions_updated_at
  BEFORE UPDATE ON public.japa_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_japa_sessions_updated_at();
