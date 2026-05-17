import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useJapa } from "@/contexts/JapaContext";
import { format } from "date-fns";
import { Users, CalendarCheck, Clock, PlusCircle } from "lucide-react";

interface CgGroup {
  id: string;
  name: string;
  code: string;
  created_by: string;
  role: string;
}

interface CgEvent {
  id: string;
  group_id: string;
  date: string;
}

interface CgBooking {
  id: string;
  event_id: string;
  group_id: string;
  user_id: string;
  date: string;
  hour: number;
  jaaps: number;
}

const SLOT_LABELS = [
  "00:00-03:00",
  "03:00-06:00",
  "06:00-09:00",
  "09:00-12:00",
  "12:00-15:00",
  "15:00-18:00",
  "18:00-21:00",
  "21:00-24:00",
];

const SLOT_HOURS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [9, 10, 11],
  [12, 13, 14],
  [15, 16, 17],
  [18, 19, 20],
  [21, 22, 23],
];

const generateCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

export const ChakriGajar = () => {
  const { user } = useAuth();
  const { getText, incrementJaaps } = useJapa();
  const [groups, setGroups] = useState<CgGroup[]>([]);
  const [events, setEvents] = useState<CgEvent[]>([]);
  const [bookings, setBookings] = useState<CgBooking[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [newGroupName, setNewGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [counterMessage, setCounterMessage] = useState("");

  const selectedGroup = groups.find((group) => group.id === selectedGroupId);
  const selectedEvent = events.find((event) => event.id === selectedEventId);

  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const currentHour = now.getHours();

  const activeBooking = useMemo(() => {
    return bookings.find((booking) => booking.date === todayStr && booking.hour === currentHour && booking.user_id === user?.id);
  }, [bookings, todayStr, currentHour, user]);

  const isAdmin = useMemo(() => {
    return selectedGroup?.role === "admin";
  }, [selectedGroup]);

  const loadGroups = async (forceResetSelection = false, preferredGroupId?: string) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("cg_members")
      .select("role, cg_groups(id, name, code, created_by)")
      .eq("user_id", user.id);

    if (error) {
      console.error("Failed to load groups", error);
      setCounterMessage(error.message || getText("समूह लोड नहीं हुए", "Failed to load groups"));
      return;
    }

    let mapped = (data || []).map((row: any) => ({
      id: row.cg_groups.id,
      name: row.cg_groups.name,
      code: row.cg_groups.code,
      created_by: row.cg_groups.created_by,
      role: row.role,
    }));

    const { data: ownedGroups, error: ownedError } = await supabase
      .from("cg_groups")
      .select("id, name, code, created_by")
      .eq("created_by", user.id);

    if (!ownedError && ownedGroups) {
      const existingIds = new Set(mapped.map((group) => group.id));
      const missing = ownedGroups.filter((group) => !existingIds.has(group.id));
      if (missing.length > 0) {
        const { error: fixError } = await supabase
          .from("cg_members")
          .upsert(
            missing.map((group) => ({
              group_id: group.id,
              user_id: user.id,
              role: "admin",
            })),
            { onConflict: "group_id,user_id", ignoreDuplicates: true }
          );

        if (fixError) {
          console.error("Failed to repair group membership", fixError);
          setCounterMessage(
            getText(
              "समूह बना लेकिन सदस्यता नहीं मिली",
              "Group created, but membership missing"
            )
          );
        } else {
          mapped = [
            ...mapped,
            ...missing.map((group) => ({
              id: group.id,
              name: group.name,
              code: group.code,
              created_by: group.created_by,
              role: "admin",
            })),
          ];
        }
      }
    }

    setGroups(mapped);

    const hasSelected = mapped.some((group) => group.id === selectedGroupId);
    let nextSelected = selectedGroupId;
    if (forceResetSelection || !hasSelected) {
      if (preferredGroupId && mapped.some((group) => group.id === preferredGroupId)) {
        nextSelected = preferredGroupId;
      } else if (mapped.length > 0) {
        nextSelected = mapped[0].id;
      } else {
        nextSelected = "";
      }
    }

    if (nextSelected !== selectedGroupId) {
      setSelectedGroupId(nextSelected);
    }
  };

  const loadEvents = async (groupId: string) => {
    if (!groupId) {
      setEvents([]);
      return;
    }
    const { data, error } = await supabase
      .from("cg_events")
      .select("id, group_id, date")
      .eq("group_id", groupId)
      .order("date", { ascending: true });

    if (error) {
      console.error("Failed to load events", error);
      return;
    }

    setEvents(data || []);
    if (!selectedEventId && data && data.length > 0) {
      setSelectedEventId(data[0].id);
    }
  };

  const loadBookings = async (eventId: string) => {
    if (!eventId) {
      setBookings([]);
      return;
    }
    const { data, error } = await supabase
      .from("cg_bookings")
      .select("id, event_id, group_id, user_id, date, hour, jaaps")
      .eq("event_id", eventId)
      .order("hour", { ascending: true });

    if (error) {
      console.error("Failed to load bookings", error);
      return;
    }

    setBookings(data || []);
  };

  useEffect(() => {
    loadGroups();
  }, [user]);

  useEffect(() => {
    setSelectedEventId("");
    setBookings([]);
    if (selectedGroupId) {
      loadEvents(selectedGroupId);
    } else {
      setEvents([]);
    }
  }, [selectedGroupId]);

  useEffect(() => {
    if (selectedEventId) {
      loadBookings(selectedEventId);
    }
  }, [selectedEventId]);

  const handleCreateGroup = async () => {
    if (!user) {
      setCounterMessage(getText("पहले लॉगिन करें", "Please sign in first"));
      return;
    }
    if (!newGroupName.trim()) {
      setCounterMessage(getText("समूह का नाम लिखें", "Enter a group name"));
      return;
    }
    setLoading(true);
    setCounterMessage("");

    try {
      let createdGroup: { id: string; name: string; code: string; created_by: string } | null = null;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const code = generateCode();
        const { data, error } = await supabase
          .from("cg_groups")
          .insert({ name: newGroupName.trim(), code, created_by: user.id })
          .select("id, name, code, created_by")
          .maybeSingle();

        if (error) {
          if (error.code === "23505" && attempt < 2) {
            continue;
          }
          console.error("Failed to create group", error);
          setCounterMessage(
            error.message || getText("समूह नहीं बन पाया", "Unable to create group")
          );
          return;
        }

        createdGroup = data ?? null;
        break;
      }

      if (!createdGroup) {
        setCounterMessage(getText("समूह नहीं बन पाया", "Unable to create group"));
        return;
      }

      const { error: memberError } = await supabase
        .from("cg_members")
        .upsert(
          { group_id: createdGroup.id, user_id: user.id, role: "admin" },
          { onConflict: "group_id,user_id", ignoreDuplicates: true }
        );

      if (memberError) {
        console.error("Failed to add admin membership", memberError);
        setCounterMessage(
          memberError.message ||
            getText(
              "समूह बना, लेकिन सदस्यता नहीं बनी",
              "Group created, but membership failed"
            )
        );
        return;
      }

      setNewGroupName("");
      await loadGroups(true, createdGroup.id);
    } catch (error) {
      console.error("Unexpected create group error", error);
      setCounterMessage(getText("समूह नहीं बन पाया", "Unable to create group"));
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!user || !joinCode.trim()) return;
    setLoading(true);
    setCounterMessage("");

    try {
      const { data, error } = await supabase
        .from("cg_groups")
        .select("id")
        .eq("code", joinCode.trim())
        .maybeSingle();

      if (error || !data) {
        console.error("Invalid join code", error);
        setCounterMessage(getText("गलत कोड", "Invalid code"));
        return;
      }

      const { error: joinError } = await supabase
        .from("cg_members")
        .upsert(
          { group_id: data.id, user_id: user.id, role: "member" },
          { onConflict: "group_id,user_id", ignoreDuplicates: true }
        );

      if (joinError) {
        console.error("Failed to join group", joinError);
        setCounterMessage(joinError.message || getText("जुड़ नहीं पाए", "Unable to join"));
        return;
      }

      setJoinCode("");
      await loadGroups(true, data.id);
    } catch (error) {
      console.error("Unexpected join group error", error);
      setCounterMessage(getText("जुड़ नहीं पाए", "Unable to join"));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!user || !selectedGroupId) return;
    const confirmDelete = window.confirm(
      getText(
        "क्या आप यह समूह हटाना चाहते हैं? सभी शेड्यूल और बुकिंग हट जाएंगे।",
        "Delete this group? All schedules and bookings will be removed."
      )
    );

    if (!confirmDelete) return;

    setLoading(true);
    const { error } = await supabase
      .from("cg_groups")
      .delete()
      .eq("id", selectedGroupId);

    if (error) {
      console.error("Failed to delete group", error);
      setLoading(false);
      return;
    }

    setSelectedGroupId("");
    setSelectedEventId("");
    setEvents([]);
    setBookings([]);
    await loadGroups(true);
    setLoading(false);
  };

  const handleCreateEvent = async () => {
    if (!user || !selectedGroupId || !eventDate) return;
    if (eventDate < todayStr) {
      setCounterMessage(getText("पिछली तारीख की अनुमति नहीं है", "Cannot schedule in the past"));
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("cg_events")
      .insert({
        group_id: selectedGroupId,
        date: eventDate,
        created_by: user.id,
      })
      .select("id, group_id, date")
      .maybeSingle();

    if (error || !data) {
      console.error("Failed to create event", error);
      setLoading(false);
      return;
    }

    await loadEvents(selectedGroupId);
    setSelectedEventId(data.id);
    setLoading(false);
  };

  const handleBookHour = async (hour: number) => {
    if (!user || !selectedEvent || !selectedGroupId) return;

    const { data: overlap } = await supabase
      .from("cg_bookings")
      .select("id")
      .eq("user_id", user.id)
      .eq("date", selectedEvent.date)
      .eq("hour", hour)
      .maybeSingle();

    if (overlap) {
      setCounterMessage(getText("इस समय स्लॉट में पहले से बुकिंग है", "You already booked this hour"));
      return;
    }

    const { error } = await supabase
      .from("cg_bookings")
      .insert({
        event_id: selectedEvent.id,
        group_id: selectedGroupId,
        user_id: user.id,
        date: selectedEvent.date,
        hour,
      });

    if (error) {
      console.error("Failed to book slot", error);
      return;
    }

    await loadBookings(selectedEvent.id);
  };

  const handleCount = async () => {
    if (!activeBooking) return;
    incrementJaaps();
    const nextJaaps = activeBooking.jaaps + 1;

    setBookings((prev) =>
      prev.map((booking) =>
        booking.id === activeBooking.id ? { ...booking, jaaps: nextJaaps } : booking
      )
    );

    const { error } = await supabase
      .from("cg_bookings")
      .update({ jaaps: nextJaaps })
      .eq("id", activeBooking.id);

    if (error) {
      console.error("Failed to update booking count", error);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto pb-24">
      <PageHeader
        title={getText("चक्री गजर", "Chakri Gajar")}
        subtitle={getText("समूह साधना और स्लॉट बुकिंग", "Group chanting and slot booking")}
      />

      {counterMessage && (
        <Card className="spiritual-card">
          <CardContent className="p-4 text-sm text-secondary">
            {counterMessage}
          </CardContent>
        </Card>
      )}

      {activeBooking && (
        <Card className="spiritual-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5 text-primary" />
              {getText("अभी आपका स्लॉट चल रहा है", "Your slot is live")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl font-bold text-primary">
              {activeBooking.jaaps}
            </div>
            <Button onClick={handleCount}>
              {getText("गिनती बढ़ाएं", "Add Count")}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="spiritual-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5 text-primary" />
            {getText("समूह", "Groups")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{getText("नया समूह", "New Group")}</Label>
            <div className="flex gap-2">
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder={getText("समूह का नाम", "Group name")}
              />
              <Button onClick={handleCreateGroup} disabled={loading}>
                <PlusCircle className="mr-2 h-4 w-4" />
                {getText("बनाएं", "Create")}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{getText("कोड से जुड़ें", "Join with code")}</Label>
            <div className="flex gap-2">
              <Input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder={getText("कोड दर्ज करें", "Enter code")}
              />
              <Button onClick={handleJoinGroup} disabled={loading}>
                {getText("जुड़ें", "Join")}
              </Button>
            </div>
          </div>

          {groups.length > 0 && (
            <div className="space-y-2">
              <Label>{getText("समूह चुनें", "Select group")}</Label>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder={getText("समूह", "Group")} />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name} ({group.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedGroup && (
            <div className="flex items-center justify-between rounded-lg border border-border/60 p-2 text-xs">
              <div className="text-muted-foreground">
                {getText("आपकी भूमिका", "Your role")}: {isAdmin ? getText("एडमिन", "Admin") : getText("सदस्य", "Member")}
              </div>
              {isAdmin && (
                <Button variant="destructive" size="sm" onClick={handleDeleteGroup} disabled={loading}>
                  {getText("समूह हटाएं", "Delete group")}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedGroup && (
        <Card className="spiritual-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CalendarCheck className="mr-2 h-5 w-5 text-secondary" />
              {getText("चक्रि गजर शेड्यूल", "Schedule")}
            </CardTitle>
            {selectedGroup && (
              <div className="text-xs text-muted-foreground">
                {selectedGroup.name} ({selectedGroup.code})
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {isAdmin ? (
              <div className="space-y-2">
                <Label>{getText("तारीख चुनें", "Select date")}</Label>
                <Input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  min={todayStr}
                />
                <Button onClick={handleCreateEvent} disabled={loading}>
                  {getText("शेड्यूल बनाएं", "Create schedule")}
                </Button>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                {getText("केवल एडमिन नया शेड्यूल बना सकता है", "Only admins can create schedules")}
              </div>
            )}

            {events.length > 0 && (
              <div className="space-y-2">
                <Label>{getText("दिन चुनें", "Select day")}</Label>
                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                  <SelectTrigger>
                    <SelectValue placeholder={getText("दिन", "Day")} />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.date}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedEvent && (
        <Card className="spiritual-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5 text-primary" />
              {getText("स्लॉट बुकिंग", "Slot Booking")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {SLOT_LABELS.map((label, index) => (
              <div key={label} className="space-y-2">
                <div className="font-medium text-sm text-foreground">{getText(`स्लॉट ${index + 1}`, `Slot ${index + 1}`)}: {label}</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {SLOT_HOURS[index].map((hour) => {
                    const booking = bookings.find((item) => item.hour === hour);
                    const hourLabel = `${String(hour).padStart(2, "0")}:00 - ${String(hour + 1).padStart(2, "0")}:00`;
                    return (
                      <div key={hour} className="rounded-lg border border-border p-2 text-xs">
                        <div className="font-medium">{hourLabel}</div>
                        {booking ? (
                          <div className="text-muted-foreground">
                            {getText("बुक किया गया", "Booked")}
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            className="mt-2 w-full"
                            onClick={() => handleBookHour(hour)}
                          >
                            {getText("बुक करें", "Book")}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="text-xs text-muted-foreground">
              {getText("समय IST (GMT+5:30) के अनुसार है", "Times are in IST (GMT+5:30)")}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
