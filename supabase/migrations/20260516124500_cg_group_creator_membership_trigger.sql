-- Auto-add group creator as admin member
CREATE OR REPLACE FUNCTION public.handle_cg_group_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.cg_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin')
  ON CONFLICT (group_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_cg_group_created ON public.cg_groups;
CREATE TRIGGER on_cg_group_created
  AFTER INSERT ON public.cg_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_cg_group_created();
