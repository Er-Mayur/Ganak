-- Create Chakri Gajar tables
CREATE TABLE public.cg_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.cg_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.cg_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

CREATE TABLE public.cg_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.cg_groups(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, date)
);

CREATE TABLE public.cg_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.cg_events(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.cg_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23),
  jaaps INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date, hour)
);

-- Enable RLS
ALTER TABLE public.cg_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cg_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cg_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cg_bookings ENABLE ROW LEVEL SECURITY;

-- cg_groups policies
CREATE POLICY "Authenticated users can view cg_groups"
ON public.cg_groups
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create cg_groups"
ON public.cg_groups
FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group creator can update cg_groups"
ON public.cg_groups
FOR UPDATE
USING (auth.uid() = created_by);

-- cg_members policies
CREATE POLICY "Group members can view cg_members"
ON public.cg_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.cg_members m
    WHERE m.group_id = cg_members.group_id
      AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Users can join cg_groups"
ON public.cg_members
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- cg_events policies
CREATE POLICY "Group members can view cg_events"
ON public.cg_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.cg_members m
    WHERE m.group_id = cg_events.group_id
      AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Group admins can create cg_events"
ON public.cg_events
FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND
  EXISTS (
    SELECT 1 FROM public.cg_members m
    WHERE m.group_id = cg_events.group_id
      AND m.user_id = auth.uid()
      AND m.role = 'admin'
  )
);

CREATE POLICY "Group admins can update cg_events"
ON public.cg_events
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.cg_members m
    WHERE m.group_id = cg_events.group_id
      AND m.user_id = auth.uid()
      AND m.role = 'admin'
  )
);

-- cg_bookings policies
CREATE POLICY "Group members can view cg_bookings"
ON public.cg_bookings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.cg_members m
    WHERE m.group_id = cg_bookings.group_id
      AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own cg_bookings"
ON public.cg_bookings
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.cg_members m
    WHERE m.group_id = cg_bookings.group_id
      AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own cg_bookings"
ON public.cg_bookings
FOR UPDATE
USING (auth.uid() = user_id);

-- Triggers to update updated_at
DROP TRIGGER IF EXISTS update_cg_groups_updated_at ON public.cg_groups;
CREATE TRIGGER update_cg_groups_updated_at
  BEFORE UPDATE ON public.cg_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_cg_events_updated_at ON public.cg_events;
CREATE TRIGGER update_cg_events_updated_at
  BEFORE UPDATE ON public.cg_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_cg_bookings_updated_at ON public.cg_bookings;
CREATE TRIGGER update_cg_bookings_updated_at
  BEFORE UPDATE ON public.cg_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
