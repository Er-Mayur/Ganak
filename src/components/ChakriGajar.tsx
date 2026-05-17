import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useJapa } from "@/contexts/JapaContext";

import { CgGroup, CgEvent, CgBooking, CgMember, CgScreen, generateCode, getISTNow, toDateStr, isPastSlot } from "./ChakriGajarTypes";
import { HomeScreen, CreateGroupScreen } from "./ChakriGajarScreensA";
import { GroupDetailsScreen, ScheduleListScreen } from "./ChakriGajarScreensB";
import { CgCounterScreen, CgCalendarScreen, CgDatePickerModal, ScheduleSummaryScreen } from "./ChakriGajarScreensD";

export const ChakriGajar = ({ onActiveSlotChange }: { onActiveSlotChange?: (active: boolean) => void }) => {
  const { user } = useAuth();
  const { incrementJaaps } = useJapa();

  const [screen, setScreen] = useState<CgScreen>("home");
  const [selectedCalDate, setSelectedCalDate] = useState<string>("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [groups, setGroups] = useState<CgGroup[]>([]);
  const [events, setEvents] = useState<CgEvent[]>([]);
  const [bookings, setBookings] = useState<CgBooking[]>([]);
  const [members, setMembers] = useState<CgMember[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<CgGroup | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CgEvent | null>(null);
  const [selectedHours, setSelectedHours] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  // Whether the current user has any active slot RIGHT NOW (current hour booked today)
  const [activeSlotNow, setActiveSlotNow] = useState(false);
  // Hours this user has booked in OTHER groups on the same date (cross-group overlap prevention)
  const [globalBlockedHours, setGlobalBlockedHours] = useState<Set<number>>(new Set());
  // Track which screen invoked the counter so back works correctly
  const [counterOrigin, setCounterOrigin] = useState<CgScreen>("scheduleList");

  // Always use IST for all time comparisons (UTC+5:30 = Asia/Kolkata)
  const now = getISTNow();
  const todayStr = toDateStr(now);
  const currentHour = now.getHours();

  const activeBooking = useMemo(() =>
    bookings.find(b => b.date === todayStr && b.hour === currentHour && b.user_id === user?.id),
    [bookings, todayStr, currentHour, user]
  );

  const isAdmin = selectedGroup?.role === "admin";

  // ── Data Loaders ───────────────────────────────────────────────────────────
  const loadGroups = async (preferredId?: string) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("cg_members")
      .select("role, cg_groups(id, name, code, created_by)")
      .eq("user_id", user.id);
    if (error) return;

    const mapped: CgGroup[] = (data || []).map((row: any) => ({
      id: row.cg_groups.id, name: row.cg_groups.name, code: row.cg_groups.code,
      created_by: row.cg_groups.created_by, role: row.role, totalJaap: 0,
    }));

    // Always compute fresh IST date inside the function — avoids stale closure from midnight rollover
    const freshNow = getISTNow();
    const freshTodayStr = toDateStr(freshNow);
    const freshHour = freshNow.getHours();

    // Fetch today's events for all groups in one query
    const groupIds = mapped.map(g => g.id);
    if (groupIds.length > 0) {
      const { data: todayEvents } = await supabase
        .from("cg_events")
        .select("id, group_id, date")
        .in("group_id", groupIds)
        .eq("date", freshTodayStr);
      const todayMap = new Map((todayEvents || []).map(e => [e.group_id, e]));
      mapped.forEach(g => {
        const ev = todayMap.get(g.id);
        if (ev) { g.todayEventId = ev.id; g.todayEventDate = ev.date; }
      });
    }

    setGroups(mapped);
    if (preferredId) {
      const g = mapped.find(g => g.id === preferredId);
      if (g) { setSelectedGroup(g); loadMembers(g.id); }
    } else if (mapped.length > 0 && !selectedGroup) {
      setSelectedGroup(mapped[0]);
      loadMembers(mapped[0].id);
    }

    // Check if the user has an active booking RIGHT NOW (IST) — drives BottomNav green dot
    // This runs on every loadGroups call (mount + every goHome) so the dot stays accurate
    const { data: activeNow } = await supabase
      .from("cg_bookings")
      .select("id")
      .eq("user_id", user.id)
      .eq("date", freshTodayStr)
      .eq("hour", freshHour)
      .limit(1);
    const isActive = (activeNow?.length ?? 0) > 0;
    setActiveSlotNow(isActive);
    onActiveSlotChange?.(isActive);
  };

  const loadEvents = async (groupId: string) => {
    if (!groupId) { setEvents([]); return; }
    const { data } = await supabase.from("cg_events")
      .select("id, group_id, date").eq("group_id", groupId).order("date", { ascending: true });
    setEvents(data || []);
  };

  const loadBookings = async (eventId: string, date?: string) => {
    if (!eventId) { setBookings([]); return; }
    const { data } = await supabase.from("cg_bookings")
      .select("id, event_id, group_id, user_id, date, hour, jaaps")
      .eq("event_id", eventId).order("hour", { ascending: true });
    const fetched = data || [];
    setBookings(fetched);
    // Check if user has an active slot RIGHT NOW in these bookings
    const isActive = fetched.some(b => b.user_id === user?.id && b.date === todayStr && b.hour === currentHour);
    setActiveSlotNow(isActive);
    onActiveSlotChange?.(isActive);
    // Also refresh cross-group blocked hours for the event date
    if (date) loadGlobalBlockedHours(date, eventId);
  };

  /** Fetch hours the current user has booked on `date` in groups OTHER than the current event's group. */
  const loadGlobalBlockedHours = async (date: string, currentEventId: string) => {
    if (!user) return;
    const { data } = await supabase
      .from("cg_bookings")
      .select("hour, event_id")
      .eq("user_id", user.id)
      .eq("date", date)
      .neq("event_id", currentEventId);
    setGlobalBlockedHours(new Set((data || []).map(b => b.hour)));
  };

  const loadMembers = async (groupId: string) => {
    if (!groupId) { setMembers([]); return; }
    const { data } = await supabase.from("cg_members").select("user_id, role").eq("group_id", groupId);
    if (!data || data.length === 0) { setMembers([]); return; }
    const userIds = data.map(m => m.user_id);
    const { data: profiles } = await supabase.from("profiles").select("user_id, display_name").in("user_id", userIds);
    const profileMap = new Map((profiles || []).map(p => [p.user_id, p.display_name]));
    setMembers(data.map(m => ({ user_id: m.user_id, role: m.role, display_name: profileMap.get(m.user_id) ?? null })));
  };

  useEffect(() => { loadGroups(); }, [user]);
  useEffect(() => { if (selectedGroup) { loadEvents(selectedGroup.id); loadMembers(selectedGroup.id); } }, [selectedGroup]);
  useEffect(() => { if (selectedEvent) loadBookings(selectedEvent.id, selectedEvent.date); }, [selectedEvent]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleCreateGroup = async (name: string, code: string, _desc: string) => {
    if (!user || !name.trim()) return;
    setLoading(true);
    const { data, error } = await supabase.from("cg_groups")
      .insert({ name: name.trim(), code, created_by: user.id })
      .select("id, name, code, created_by").maybeSingle();
    if (!error && data) {
      await supabase.from("cg_members")
        .upsert({ group_id: data.id, user_id: user.id, role: "admin" }, { onConflict: "group_id,user_id", ignoreDuplicates: true });
      await loadGroups(data.id);
      setScreen("home");
    }
    setLoading(false);
  };

  const handleJoinGroup = async (code: string) => {
    if (!user || !code.trim()) return;
    setLoading(true);
    const { data } = await supabase.from("cg_groups").select("id").eq("code", code.trim()).maybeSingle();
    if (data) {
      await supabase.from("cg_members")
        .upsert({ group_id: data.id, user_id: user.id, role: "member" }, { onConflict: "group_id,user_id", ignoreDuplicates: true });
      await loadGroups(data.id);
      setScreen("home");
    }
    setLoading(false);
  };

  // Opens the date picker modal — actual creation happens in handleCreateEventWithDate
  const handleCreateEvent = () => {
    if (!user || !selectedGroup) return;
    setShowDatePicker(true);
  };

  const handleCreateEventWithDate = async (date: string) => {
    setShowDatePicker(false);
    if (!user || !selectedGroup) return;

    // Block past dates (IST) — calendar already prevents it, but double-check
    const freshToday = toDateStr(getISTNow());
    if (date < freshToday) return;

    setLoading(true);
    const { data } = await supabase.from("cg_events")
      .insert({ group_id: selectedGroup.id, date, created_by: user.id })
      .select("id, group_id, date").maybeSingle();
    if (data) { setSelectedEvent(data); await loadEvents(selectedGroup.id); }
    setLoading(false);
  };

  const handleBookHours = async (hours: number[]) => {
    if (!user || !selectedEvent || !selectedGroup) return;
    setLoading(true);

    // Guard 1: skip hours already booked in THIS event by this user
    const sameEventBooked = new Set(
      bookings.filter(b => b.user_id === user.id).map(b => b.hour)
    );

    // Guard 2: refresh cross-group blocks for this date, then filter
    const { data: crossData } = await supabase
      .from("cg_bookings")
      .select("hour")
      .eq("user_id", user.id)
      .eq("date", selectedEvent.date)
      .neq("event_id", selectedEvent.id);
    const crossGroupBlocked = new Set((crossData || []).map(b => b.hour));
    setGlobalBlockedHours(crossGroupBlocked);

    // Guard 3: skip past hours (IST)
    const istNow = getISTNow();

    // Only insert hours not blocked anywhere and not in the past
    const newHours = hours.filter(h =>
      !sameEventBooked.has(h) &&
      !crossGroupBlocked.has(h) &&
      !isPastSlot(selectedEvent.date, h, istNow)
    );

    for (const hour of newHours) {
      const { error } = await supabase.from("cg_bookings").insert({
        event_id: selectedEvent.id,
        group_id: selectedGroup.id,
        user_id: user.id,
        date: selectedEvent.date,
        hour,
      });
      if (error && error.code !== "23505") {
        console.error("Booking insert error:", error.message);
      }
    }

    await loadBookings(selectedEvent.id, selectedEvent.date);
    setSelectedHours(hours);
    setLoading(false);
  };



  // Navigate directly to today's schedule for a group (triggered from Home green dot)
  const handleGoToToday = (group: CgGroup) => {
    if (!group.todayEventId || !group.todayEventDate) return;

    // Guard: validate event date is STILL today in IST (may have changed since last loadGroups)
    const freshToday = toDateStr(getISTNow());
    if (group.todayEventDate !== freshToday) {
      // Date has rolled over — refresh groups silently and abort (dot will disappear)
      loadGroups();
      return;
    }

    const ev: CgEvent = { id: group.todayEventId, group_id: group.id, date: group.todayEventDate };
    setSelectedGroup(group);
    setSelectedEvent(ev);
    loadBookings(ev.id, ev.date);
    loadMembers(group.id);
    setScreen("scheduleList");
  };


  // ── Navigation ─────────────────────────────────────────────────────────────
  const navigate = (s: CgScreen, data?: any) => {
    if (s === "groupDetails" && data) {
      setSelectedGroup(data);
      loadEvents(data.id);
      loadMembers(data.id);
    }
    if (s === "scheduleList" && data) {
      setSelectedEvent(data);
      loadBookings(data.id, data.date);
    }
    setScreen(s);
  };

  // goHome always refreshes group list so todayEventId is up-to-date
  const goHome = () => { loadGroups(); setScreen("home"); };

  // ── Render ─────────────────────────────────────────────────────────────────
  switch (screen) {
    case "home":
      return <HomeScreen groups={groups} onNavigate={navigate} onNewGroup={() => setScreen("createGroup")} onGoToToday={handleGoToToday} />;

    case "createGroup":
      return <CreateGroupScreen onBack={goHome} onCreate={handleCreateGroup} onJoin={handleJoinGroup} loading={loading} />;

    case "groupDetails":
      return selectedGroup ? (
        <>
          <GroupDetailsScreen
            group={selectedGroup} events={events} members={members} isAdmin={isAdmin}
            todayStr={todayStr}
            onBack={goHome} onNavigate={navigate} onSchedule={handleCreateEvent}
          />
          {showDatePicker && (
            <CgDatePickerModal
              scheduledDates={events.map(e => e.date)}
              onSelect={handleCreateEventWithDate}
              onClose={() => setShowDatePicker(false)}
            />
          )}
        </>
      ) : null;

    case "scheduleList":
      return selectedEvent ? (
        <ScheduleListScreen
          event={selectedEvent}
          bookings={bookings}
          members={members}
          userId={user?.id ?? ""}
          currentHour={currentHour}
          todayStr={todayStr}
          loading={loading}
          blockedHours={globalBlockedHours}
          onBack={() => navigate("groupDetails", selectedGroup)}
          onBook={handleBookHours}
          onStartCounter={() => {
            // Ensure selectedHours is set so counter knows which hour is active
            setSelectedHours([currentHour]);
            setCounterOrigin("scheduleList");
            setScreen("cgCounter");
          }}
        />
      ) : null;

    case "cgCounter":
      return activeBooking ? (
        <CgCounterScreen
          onBack={() => setScreen(counterOrigin)}
          bookingId={activeBooking.id}
          eventId={activeBooking.event_id}
          initialCount={activeBooking.jaaps ?? 0}
        />
      ) : (
        // No active booking — go back
        <div className="p-6 text-center text-muted-foreground">
          <p>No active booking for this hour.</p>
          <button onClick={() => setScreen(counterOrigin)} className="mt-4 underline text-sm">Go back</button>
        </div>
      );

    case "cgCalendar":
      return (
        <CgCalendarScreen
          scheduledDates={events.map(e => e.date)}
          completedDates={[]}
          onDateSelect={(d) => { setSelectedCalDate(d); setScreen("scheduleSummary"); }}
          onBack={goHome}
        />
      );

    case "scheduleSummary": {
      const calEvent = events.find(e => e.date === selectedCalDate) ?? selectedEvent ?? null;
      return (
        <ScheduleSummaryScreen
          group={selectedGroup}
          event={calEvent}
          bookings={bookings}
          onBack={() => setScreen("cgCalendar")}
          onViewFull={() => { if (calEvent) navigate("scheduleList", calEvent); }}
        />
      );
    }

    default:
      return <HomeScreen groups={groups} onNavigate={navigate} onNewGroup={() => setScreen("createGroup")} onGoToToday={handleGoToToday} />;
  }
};
