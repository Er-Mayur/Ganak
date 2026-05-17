-- Allow group creators to delete groups and restrict admin role assignment
DROP POLICY IF EXISTS "Group creator can delete cg_groups" ON public.cg_groups;

CREATE POLICY "Group creator can delete cg_groups"
ON public.cg_groups
FOR DELETE
USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can join cg_groups" ON public.cg_members;

CREATE POLICY "Users can join cg_groups"
ON public.cg_members
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND (
    role = 'member'
    OR (
      role = 'admin'
      AND EXISTS (
        SELECT 1
        FROM public.cg_groups g
        WHERE g.id = cg_members.group_id
          AND g.created_by = auth.uid()
      )
    )
  )
);
