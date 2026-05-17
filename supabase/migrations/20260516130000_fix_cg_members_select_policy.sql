-- Fix recursive RLS on cg_members and allow creators to see group members
DROP POLICY IF EXISTS "Group members can view cg_members" ON public.cg_members;
DROP POLICY IF EXISTS "Users can view their memberships" ON public.cg_members;

CREATE POLICY "Users can view their memberships"
ON public.cg_members
FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.cg_groups g
    WHERE g.id = cg_members.group_id
      AND g.created_by = auth.uid()
  )
);
