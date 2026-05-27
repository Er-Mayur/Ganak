import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, startOfMonth, endOfMonth, isSameMonth, isSameDay, addMonths, subMonths, isAfter, startOfDay } from "date-fns";
import { useJapa, JapaSessionData } from "@/contexts/JapaContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LotusIcon } from "./LotusIcon";
import { PageHeader } from "./PageHeader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CgEvent {
  id: string;
  group_id: string;
  date: string;
  cg_groups?: {
    name: string | null;
  };
}

interface CgBooking {
  id: string;
  event_id: string;
  group_id: string;
  user_id: string;
  date: string;
  hour: number;
  jaaps: number;
  cg_groups?: {
    name: string | null;
  };
}

export const Calendar = () => {
  const { history, loading, getText, todayJaaps, todayMalas, updateSession } = useJapa();
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editMalas, setEditMalas] = useState("");
  const longPressTimerRef = useRef<number | null>(null);
  const [cgEvents, setCgEvents] = useState<CgEvent[]>([]);
  const [cgBookings, setCgBookings] = useState<CgBooking[]>([]);
  const [cgProfiles, setCgProfiles] = useState<Record<string, string>>({});
  const [cgBookingsLoading, setCgBookingsLoading] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedMembers, setExpandedMembers] = useState<Record<string, boolean>>({});

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
  };

  const getDayData = (date: Date): JapaSessionData | null => {
    const dateStr = format(date, 'yyyy-MM-dd');
    if (isSameDay(date, new Date())) {
      return {
        date: dateStr,
        jaaps: todayJaaps,
        malas: todayMalas
      };
    }
    return history.find(h => h.date === dateStr) || null;
  };

  const openEditDialog = (date: Date) => {
    if (isAfter(startOfDay(date), startOfDay(new Date()))) {
      return;
    }
    const data = getDayData(date);
    setSelectedDate(date);
    setEditMalas(data ? data.malas.toString() : "0");
    setIsDialogOpen(true);
  };

  const clearLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const startLongPress = (date: Date) => {
    clearLongPress();
    longPressTimerRef.current = window.setTimeout(() => {
      openEditDialog(date);
    }, 500);
  };

  const handleSave = async () => {
    const malas = parseInt(editMalas);
    if (!isNaN(malas) && malas >= 0) {
      await updateSession(selectedDate, malas);
      setIsDialogOpen(false);
    }
  };

  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");

  const cgEventDates = useMemo(() => {
    return new Set(cgEvents.map((event) => event.date));
  }, [cgEvents]);

  const cgEventsByDate = useMemo(() => {
    return cgEvents.reduce((acc, event) => {
      if (!acc[event.date]) {
        acc[event.date] = [];
      }
      acc[event.date].push(event);
      return acc;
    }, {} as Record<string, CgEvent[]>);
  }, [cgEvents]);

  const cgBookingsByGroup = useMemo(() => {
    return cgBookings.reduce((acc, booking) => {
      if (!acc[booking.group_id]) {
        acc[booking.group_id] = [];
      }
      acc[booking.group_id].push(booking);
      return acc;
    }, {} as Record<string, CgBooking[]>);
  }, [cgBookings]);

  const loadCgEventsForMonth = useCallback(async (focusDate: Date) => {
    if (!user) return;
    const startDateStr = format(startOfMonth(focusDate), "yyyy-MM-dd");
    const endDateStr = format(endOfMonth(focusDate), "yyyy-MM-dd");

    // cg_events has no FK to cg_groups in generated types (Relationships:[])
    // so we cannot use cg_groups(name) in the select — fetch separately
    const { data, error } = await supabase
      .from("cg_events")
      .select("id, group_id, date")
      .gte("date", startDateStr)
      .lte("date", endDateStr)
      .order("date", { ascending: true });

    if (error) {
      console.error("Failed to load Chakri Gajar events", error);
      return;
    }

    const events = data || [];

    // Fetch group names in a separate query and merge
    const groupIds = [...new Set(events.map(e => e.group_id))];
    let groupNameMap: Record<string, string> = {};
    if (groupIds.length > 0) {
      const { data: groupData } = await supabase
        .from("cg_groups")
        .select("id, name")
        .in("id", groupIds);
      (groupData || []).forEach(g => { groupNameMap[g.id] = g.name; });
    }

    setCgEvents(events.map(e => ({
      ...e,
      cg_groups: groupNameMap[e.group_id] ? { name: groupNameMap[e.group_id] } : undefined,
    })));
  }, [user]);

  const loadCgBookingsForDate = useCallback(async (dateStr: string) => {
    if (!user) return;
    setCgBookingsLoading(true);

    // Do NOT join cg_groups here — cg_bookings may not have a direct FK to cg_groups.
    // Group names are already available from cgEvents which joins cg_groups correctly.
    const { data, error } = await supabase
      .from("cg_bookings")
      .select("id, event_id, group_id, user_id, date, hour, jaaps")
      .eq("date", dateStr)
      .order("hour", { ascending: true });

    if (error) {
      console.error("Failed to load Chakri Gajar bookings", error);
      setCgBookings([]);
      setCgProfiles({});
      setCgBookingsLoading(false);
      return;
    }

    const bookings = (data || []) as CgBooking[];
    setCgBookings(bookings);

    const userIds = Array.from(new Set(bookings.map((b) => b.user_id)));
    if (userIds.length === 0) {
      setCgProfiles({});
      setCgBookingsLoading(false);
      return;
    }

    // Profiles query may be blocked by RLS — treat failure as non-fatal
    const { data: profileData } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", userIds);

    const profileMap: Record<string, string> = {};
    (profileData || []).forEach((profile) => {
      if (profile.display_name) {
        profileMap[profile.user_id] = profile.display_name;
      }
    });
    setCgProfiles(profileMap);
    setCgBookingsLoading(false);
  }, [user]);


  const formatHourRange = (hour: number) => {
    const start = `${String(hour).padStart(2, "0")}:00`;
    const end = `${String(hour + 1).padStart(2, "0")}:00`;
    return `${start}-${end}`;
  };

  // Generate calendar days
  const monthStart = startOfMonth(currentDate);
  const startDate = new Date(monthStart);
  startDate.setDate(startDate.getDate() - monthStart.getDay());

  const calendarDays = [];
  for (let i = 0; i < 42; i++) {
    const day = new Date(startDate);
    day.setDate(startDate.getDate() + i);
    calendarDays.push(day);
  }

  const selectedDayData = getDayData(selectedDate);
  const selectedCgEvents = cgEventsByDate[selectedDateStr] || [];

  useEffect(() => {
    if (!user) { setCgEvents([]); return; }
    loadCgEventsForMonth(currentDate);
  }, [user, currentDate, loadCgEventsForMonth]);

  useEffect(() => {
    if (!user) { setCgBookings([]); setCgProfiles({}); return; }
    loadCgBookingsForDate(selectedDateStr);
  }, [user, selectedDateStr, loadCgBookingsForDate]);

  useEffect(() => {
    setExpandedGroups({});
    setExpandedMembers({});
  }, [selectedDateStr]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto pb-24">
      {/* Header */}
      <PageHeader 
        title={getText('कैलेंडर', 'Calendar')} 
        subtitle={getText('आपकी दैनिक माला यात्रा', 'Your Daily Mala Journey')} 
      />

      {/* Calendar Card */}
      <Card className="spiritual-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateMonth('prev')}
              className="rounded-full"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <CardTitle className="text-lg">
              {format(currentDate, 'MMMM yyyy')}
            </CardTitle>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateMonth('next')}
              className="rounded-full"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {[
              getText('रवि', 'Sun'), 
              getText('सोम', 'Mon'), 
              getText('मंगल', 'Tue'), 
              getText('बुध', 'Wed'), 
              getText('गुरु', 'Thu'), 
              getText('शुक्र', 'Fri'), 
              getText('शनि', 'Sat')
            ].map((day) => (
              <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const dayStr = format(day, "yyyy-MM-dd");
              return (
              <div 
                key={dayStr}
                className={`
                  relative h-16 flex flex-col items-center justify-center cursor-pointer rounded-lg transition-all duration-200
                  ${!isSameMonth(day, currentDate) ? 'text-muted-foreground/50' : 'text-foreground'}
                  ${isSameDay(day, selectedDate) ? 'bg-primary text-primary-foreground shadow-md' : 'hover:bg-primary/10'}
                `}
                onClick={() => setSelectedDate(day)}
                onMouseDown={() => startLongPress(day)}
                onMouseUp={clearLongPress}
                onMouseLeave={clearLongPress}
                onTouchStart={() => startLongPress(day)}
                onTouchEnd={clearLongPress}
                onTouchCancel={clearLongPress}
              >
                {cgEventDates.has(dayStr) && (
                  <span
                    className={`absolute top-1 right-1 h-1.5 w-1.5 rounded-full ${
                      isSameDay(day, selectedDate) ? "bg-primary-foreground" : "bg-secondary"
                    }`}
                  />
                )}
                {/* Lotus Icon for 16+ Malas */}
                {isSameMonth(day, currentDate) && getDayData(day) && getDayData(day)!.malas >= 16 && (
                  <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${isSameDay(day, selectedDate) ? 'opacity-80' : 'opacity-40'}`}>
                    <LotusIcon className={`w-8 h-8 sm:w-10 sm:h-10 ${isSameDay(day, selectedDate) ? 'text-pink-700 fill-pink-400' : 'text-pink-500 fill-pink-200'}`} />
                  </div>
                )}

                <span className="text-sm font-medium relative z-10">
                  {format(day, 'd')}
                </span>
                
                {/* Japa count below date */}
                {isSameMonth(day, currentDate) && getDayData(day) && (
                  <div className={`flex flex-col items-center mt-0.5 sm:mt-1 relative z-10 leading-none ${isSameDay(day, selectedDate) ? 'text-primary-foreground' : 'text-orange-600'}`}>
                    <span className="text-[10px] sm:text-xs font-medium">{getDayData(day)!.malas}</span>
                    <span className="text-[8px] sm:text-xs font-medium">{getText('माला', 'mala')}</span>
                  </div>
                )}
              </div>
            );
            })}
          </div>
          <div className="mt-2 text-center text-xs text-muted-foreground">
            {getText("एडिट करने के लिए लंबा दबाएं", "Long press to edit")}
          </div>
        </CardContent>
      </Card>

      {/* Selected Day Details */}
      <Card className="spiritual-card">
        <CardHeader>
          <CardTitle className="text-lg">
            {format(selectedDate, 'dd MMMM yyyy')} {getText('का विवरण', 'Details')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary mb-1">
                {selectedDayData ? selectedDayData.jaaps : 0}
              </div>
              <div className="text-sm text-muted-foreground">{getText('जाप', 'Jaaps')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-secondary mb-1">
                {selectedDayData ? selectedDayData.malas : 0}
              </div>
              <div className="text-sm text-muted-foreground">{getText('माला', 'Mala')}</div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-border">
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-2">{getText('दैनिक प्रगति', 'Daily Progress')}</div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(((selectedDayData ? selectedDayData.malas : 0) / 16) * 100, 100)}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {Math.round(((selectedDayData ? selectedDayData.malas : 0) / 16) * 100)}% {getText('लक्ष्य पूरा', 'Goal Complete')}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <div className="text-sm font-medium mb-3">
              {getText("चक्री गजर", "Chakri Gajar")}
            </div>
            {cgBookingsLoading ? (
              <div className="text-xs text-muted-foreground">
                {getText("लोड हो रहा है...", "Loading...")}
              </div>
            ) : selectedCgEvents.length === 0 ? (
              <div className="text-xs text-muted-foreground">
                {getText("इस दिन कोई शेड्यूल नहीं है", "No schedule for this day")}
              </div>
            ) : (
              <div className="space-y-3">
                {selectedCgEvents.map((event) => {
                  const groupName = event.cg_groups?.name || getText("समूह", "Group");
                  const groupBookings = cgBookingsByGroup[event.group_id] || [];
                  const bookingsByUser = groupBookings.reduce((acc, booking) => {
                    if (!acc[booking.user_id]) {
                      acc[booking.user_id] = [];
                    }
                    acc[booking.user_id].push(booking);
                    return acc;
                  }, {} as Record<string, CgBooking[]>);
                  const userIds = Object.keys(bookingsByUser);
                  const isExpanded = Boolean(expandedGroups[event.id]);
                  return (
                    <div key={event.id} className="rounded-lg border border-border/60">
                      <button
                        type="button"
                        onClick={() => setExpandedGroups(prev => ({ ...prev, [event.id]: !prev[event.id] }))}
                        className="w-full flex items-center justify-between p-3 text-left"
                        aria-expanded={isExpanded}
                      >
                        <span className="text-sm font-semibold">{groupName}</span>
                        <ChevronRight
                          className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`}
                        />
                      </button>
                      {isExpanded && (
                        <div className="px-3 pb-3 space-y-2">
                          {userIds.length === 0 ? (
                            <div className="text-xs text-muted-foreground">
                              {getText("अभी कोई बुकिंग नहीं", "No bookings yet")}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {userIds.map((userId) => {
                                const memberName = cgProfiles[userId] || `User·${String(userId).slice(-6)}`;
                                const memberKey = `${event.id}:${userId}`;
                                const memberBookings = bookingsByUser[userId];
                                const isMemberExpanded = Boolean(expandedMembers[memberKey]);
                                return (
                                  <div key={memberKey} className="rounded-md border border-border/40">
                                    <button
                                      type="button"
                                      onClick={() => setExpandedMembers(prev => ({ ...prev, [memberKey]: !prev[memberKey] }))}
                                      className="w-full flex items-center justify-between px-3 py-2 text-left"
                                      aria-expanded={isMemberExpanded}
                                    >
                                      <span className="text-sm font-medium">{memberName}</span>
                                      <ChevronRight
                                        className={`h-4 w-4 text-muted-foreground transition-transform ${isMemberExpanded ? "rotate-90" : ""}`}
                                      />
                                    </button>
                                    {isMemberExpanded && (
                                      <div className="px-3 pb-2 space-y-1">
                                        {memberBookings.map((booking) => (
                                          <div key={booking.id} className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground">{formatHourRange(booking.hour)}</span>
                                            <span className="text-primary">{booking.jaaps}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{getText('माला संपादित करें', 'Edit Mala Count')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="malas" className="text-right">
                {getText('माला', 'Mala')}
              </Label>
              <Input
                id="malas"
                type="number"
                value={editMalas}
                onChange={(e) => setEditMalas(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleSave}>{getText('सहेजें', 'Save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};