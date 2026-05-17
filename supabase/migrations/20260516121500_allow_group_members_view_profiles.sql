-- Allow Chakri Gajar group members to see each other's display names
DROP POLICY IF EXISTS "Group members can view profiles" ON public.profiles;

CREATE POLICY "Group members can view profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.cg_members AS self
    JOIN public.cg_members AS peer
      ON peer.group_id = self.group_id
    WHERE self.user_id = auth.uid()
      AND peer.user_id = profiles.user_id
  )
);
