-- Create SECURITY DEFINER helper to check shared group membership
-- This avoids recursive RLS checks when evaluating profile visibility.

CREATE OR REPLACE FUNCTION public.cg_users_share_group(viewer uuid, target uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.cg_members m1
    JOIN public.cg_members m2 ON m1.group_id = m2.group_id
    WHERE m1.user_id = viewer
      AND m2.user_id = target
  );
END;
$$ SET search_path = public;

-- Replace profile SELECT policy to use the helper function (safer with RLS)
DROP POLICY IF EXISTS "Group members can view profiles" ON public.profiles;

CREATE POLICY "Group members can view profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    auth.uid() = profiles.user_id
    OR public.cg_users_share_group(auth.uid(), profiles.user_id)
  )
);
