-- Restore policy allowing group members and group creators to view cg_members
-- Drops the restrictive policy introduced earlier and creates a permissive SELECT policy
-- that allows group members (and group creators) to list members of their groups.

DROP POLICY IF EXISTS "Users can view their memberships" ON public.cg_members;
DROP POLICY IF EXISTS "Group members can view cg_members" ON public.cg_members;

CREATE POLICY "Group members can view cg_members"
ON public.cg_members
FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.cg_members m
    WHERE m.group_id = cg_members.group_id
      AND m.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.cg_groups g
    WHERE g.id = cg_members.group_id
      AND g.created_by = auth.uid()
  )
);
