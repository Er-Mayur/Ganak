-- Allow group admins to update/delete cg_groups safely (no recursive RLS)
CREATE OR REPLACE FUNCTION public.cg_user_is_admin(viewer uuid, target_group uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cg_members m
    WHERE m.user_id = viewer
      AND m.group_id = target_group
      AND m.role = 'admin'
  );
$$ SET search_path = public;

DROP POLICY IF EXISTS "Group creator can update cg_groups" ON public.cg_groups;
CREATE POLICY "Group admins can update cg_groups"
ON public.cg_groups
FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND (
    auth.uid() = created_by
    OR public.cg_user_is_admin(auth.uid(), cg_groups.id)
  )
);

DROP POLICY IF EXISTS "Group creator can delete cg_groups" ON public.cg_groups;
CREATE POLICY "Group admins can delete cg_groups"
ON public.cg_groups
FOR DELETE
USING (
  auth.uid() IS NOT NULL
  AND (
    auth.uid() = created_by
    OR public.cg_user_is_admin(auth.uid(), cg_groups.id)
  )
);
