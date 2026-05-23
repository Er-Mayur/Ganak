-- Avoid recursive RLS on cg_members by using a SECURITY DEFINER helper
CREATE OR REPLACE FUNCTION public.cg_user_in_group(viewer uuid, target_group uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cg_members m
    WHERE m.user_id = viewer
      AND m.group_id = target_group
  );
$$ SET search_path = public;

DROP POLICY IF EXISTS "Group members can view cg_members" ON public.cg_members;
DROP POLICY IF EXISTS "Users can view their memberships" ON public.cg_members;

CREATE POLICY "Group members can view cg_members"
ON public.cg_members
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    auth.uid() = user_id
    OR public.cg_user_in_group(auth.uid(), cg_members.group_id)
    OR EXISTS (
      SELECT 1
      FROM public.cg_groups g
      WHERE g.id = cg_members.group_id
        AND g.created_by = auth.uid()
    )
  )
);
