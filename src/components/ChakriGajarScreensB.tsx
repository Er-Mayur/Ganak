import { useState } from "react";
import { Clock, Play, Users, CheckSquare, Square, ChevronDown, ChevronUp, CalendarCheck, Crown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "./PageHeader";
import { Plus } from "lucide-react";
import {
  CgGroup, CgEvent, CgBooking, CgMember, CgScreen,
  SLOT_LABELS, HOUR_LABELS, HOUR_NEXT_LABELS, memberLabel, isPastSlot, getISTNow,
} from "./ChakriGajarTypes";

// ─── Group Details ─────────────────────────────────────────────────────────────
export const GroupDetailsScreen = ({ group, events, members, isAdmin, todayStr, onBack, onNavigate, onSchedule }: {
  group: CgGroup; events: CgEvent[]; members: CgMember[]; isAdmin: boolean; todayStr: string;
  onBack: () => void; onNavigate: (s: CgScreen, d?: any) => void; onSchedule: () => void;
}) => {
  const [tab, setTab] = useState<"schedule" | "members" | "stats">("schedule");

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto pb-24">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="px-2">&#8592; Back</Button>
      </div>

      <Card className="spiritual-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Users className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-foreground">{group.name}</h2>
                <Badge variant={isAdmin ? "default" : "secondary"}>{isAdmin ? "Admin" : "Member"}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Code: <span className="font-bold text-primary tracking-widest">{group.code}</span>
              </p>
              <p className="text-sm text-secondary mt-0.5">{(group.totalJaap ?? 0).toLocaleString()} Total Jaaps</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="spiritual-card">
        <CardContent className="p-1 flex gap-1">
          {(["schedule", "members", "stats"] as const).map(t => (
            <Button key={t} variant={tab === t ? "default" : "ghost"} className="flex-1 capitalize" onClick={() => setTab(t)}>
              {t}
            </Button>
          ))}
        </CardContent>
      </Card>

      {tab === "schedule" && (
        <div className="space-y-3">
          {events.length === 0 ? (
            <Card className="spiritual-card">
              <CardContent className="p-6 text-center">
                <CalendarCheck className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {isAdmin ? "No schedules yet. Tap + to create one." : "No upcoming schedules."}
                </p>
              </CardContent>
            </Card>
          ) : (
            events.map(ev => {
              const isToday = ev.date === todayStr;  // IST-correct
              const isPast  = ev.date < todayStr;

              return (
                <button
                  key={ev.id}
                  onClick={() => onNavigate("scheduleList", ev)}
                  className={`w-full flex items-center justify-between p-4 rounded-lg border border-border/60 bg-card hover:bg-muted/30 transition-colors text-left ${isPast ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <CalendarCheck className="h-5 w-5 text-primary" />
                      </div>
                      {isToday && (
                        <>
                          <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-green-400 animate-ping" />
                          <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-green-500" />
                        </>
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">
                        {new Date(ev.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">8 slots · 24 hours</div>
                    </div>
                  </div>
                  {isToday
                    ? <Badge className="bg-green-600 text-white">Today</Badge>
                    : isPast
                      ? <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">Past</Badge>
                      : <Badge variant="outline">View</Badge>}
                </button>
              );
            })
          )}
        </div>
      )}


      {tab === "members" && (
        <Card className="spiritual-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-base">
              <Users className="mr-2 h-4 w-4 text-primary" />
              Members ({members.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No members found.</p>
            ) : (
              members.map(m => {
                const label = memberLabel(m);
                return (
                  <div key={m.user_id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-muted">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">{label[0].toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground text-sm">{label}</div>
                      <div className="text-xs text-muted-foreground capitalize">{m.role}</div>
                    </div>
                    {m.role === "admin" && <Crown className="h-4 w-4 text-secondary flex-shrink-0" />}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      )}

      {tab === "stats" && (
        <div className="grid grid-cols-2 gap-4">
          {[
            ["Total Jaaps", (group.totalJaap ?? 0).toLocaleString(), "text-primary"],
            ["Members", members.length.toString(), "text-secondary"],
            ["Sessions", events.length.toString(), "text-accent"],
            ["Admins", members.filter(m => m.role === "admin").length.toString(), "text-orange-500"],
          ].map(([label, val, cls]) => (
            <Card key={label as string} className="spiritual-card">
              <CardContent className="p-4 text-center">
                <div className={`text-2xl font-bold mb-1 ${cls}`}>{val}</div>
                <div className="text-sm text-muted-foreground">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isAdmin && (
        <Button className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-40 counter-button" size="icon" onClick={onSchedule}>
          <Plus className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
};

// ─── Schedule List with inline booking ────────────────────────────────────────
export const ScheduleListScreen = ({ event, bookings, members, userId, currentHour, todayStr, loading, blockedHours = new Set(), onBack, onBook, onStartCounter }: {
  event: CgEvent;
  bookings: CgBooking[];
  members: CgMember[];
  userId: string;
  currentHour: number;
  todayStr: string;
  loading: boolean;
  blockedHours?: Set<number>;
  onBack: () => void;
  onBook: (hours: number[]) => Promise<void>;
  onStartCounter: () => void;
}) => {
  const istNow = getISTNow(); // single snapshot for all past-hour checks this render
  const [expanded, setExpanded] = useState<number | null>(null);
  const [selected, setSelected] = useState<number[]>([]);


  const toggle = (i: number) => {
    if (expanded === i) {
      setExpanded(null);
      setSelected([]);
    } else {
      setExpanded(i);
      setSelected([]);
    }
  };

  const toggleHour = (hour: number) =>
    setSelected(prev => prev.includes(hour) ? prev.filter(h => h !== hour) : [...prev, hour]);

  const dateLabel = new Date(event.date).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });

  // Derive user's active booking — use todayStr (IST) not UTC new Date().toISOString()
  // At 00:25 IST, UTC is still the previous day; toISOString() would give yesterday's date
  const activeBooking = event.date === todayStr
    ? bookings.find(b => b.user_id === userId && b.hour === currentHour)
    : undefined;
  const activeSlotIdx = activeBooking !== undefined
    ? Math.floor(currentHour / 3)
    : -1;

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto pb-24">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="px-2">&#8592; Back</Button>
      </div>

      <PageHeader title="Chakri Gajar Schedule" subtitle={dateLabel} />

      {/* Active slot shown only when user has booking now */}
      {activeBooking && (
        <Card className="spiritual-card border-green-400/30 bg-green-50/40 dark:bg-green-950/20">
          <CardContent className="p-5">

            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />

                  <span className="text-sm font-semibold text-green-600">
                    Active Slot
                  </span>
                </div>

                <h2 className="text-2xl font-bold">
                  {HOUR_LABELS[currentHour]}
                  {" - "}
                  {HOUR_NEXT_LABELS[currentHour]}
                </h2>

                <p className="text-sm text-muted-foreground mt-1">
                  Your booking is currently live
                </p>
              </div>

              <Badge className="bg-green-600">
                Running
              </Badge>
            </div>


            {/* participants */}
            <div className="flex flex-wrap gap-2 mb-4">

              {members
                .filter(m =>
                  bookings.some(
                    b =>
                      b.hour === currentHour &&
                      b.user_id === m.user_id
                  )
                )
                .map(m => {

                  const label = memberLabel(m);

                  return (
                    <div
                      key={m.user_id}
                      className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted"
                    >
                      <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">

                        <span className="text-xs font-bold">
                          {label[0]}
                        </span>

                      </div>

                      <span className="text-sm">
                        {label}
                      </span>
                    </div>
                  );
                })}
            </div>


            <Button
              size="lg"
              className="w-full counter-button"
              onClick={onStartCounter}
            >
              <Play className="mr-2 h-5 w-5" />
              Start Counter
            </Button>

          </CardContent>
        </Card>
      )}

      {/* slot list */}
      <div className="space-y-3">
        {SLOT_LABELS.map((label, i) => {
          const startHour = i * 3;
          const slotBookings = bookings.filter(b => b.hour >= startHour && b.hour < startHour + 3);
          const uniqueUsers = new Set(slotBookings.map(b => b.user_id)).size;
          const pct = Math.min((uniqueUsers / 6) * 100, 100);
          const isExp = expanded === i;
          const hours = [startHour, startHour + 1, startHour + 2];

          // Is any hour in this slot booked by the current user?
          const bookedByMeInSlot = slotBookings.some(b => b.user_id === userId);
          // Is this the slot that is currently live for this user?
          const isActiveSlot = activeSlotIdx === i;
          // Are ALL hours in this slot in the past?
          const isSlotAllPast = hours.every(h => isPastSlot(event.date, h, istNow));

          return (
            <Card key={label} className={`spiritual-card transition-all ${
              isSlotAllPast ? "opacity-50"
              : isActiveSlot ? "ring-2 ring-green-400/70"
              : isExp ? "ring-1 ring-primary/40" : ""
            }`}>
              {/* Slot header — click to expand (disabled if all past) */}
              <button
                className="w-full flex items-center gap-3 p-4 text-left disabled:cursor-not-allowed"
                onClick={() => !isSlotAllPast && toggle(i)}
                disabled={isSlotAllPast}
              >
                {/* Slot number badge with status dot */}
                <div className="relative flex-shrink-0">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">S{i + 1}</span>
                  </div>
                  {/* Green dot: pulsing if active now, static if booked */}
                  {isActiveSlot && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 border-2 border-background animate-pulse" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground text-sm">{label}</span>
                      {isSlotAllPast && (
                        <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30 text-xs py-0 h-5">Past</Badge>
                      )}
                      {isActiveSlot && !isSlotAllPast && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                          Live
                        </span>
                      )}
                      {bookedByMeInSlot && !isActiveSlot && !isSlotAllPast && (
                        <Badge variant="outline" className="text-green-600 border-green-300 text-xs py-0 h-5">Booked</Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{uniqueUsers} booked</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
                {!isSlotAllPast && (isExp
                  ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />)}
              </button>

              {/* Inline expanded booking UI */}
              {isExp && (
                <CardContent className="border-t border-border/40 pt-3 pb-4 space-y-2">
                  <p className="text-xs text-muted-foreground mb-3">
                    Select one or more hours to book. Multiple hours can be selected.
                  </p>

                  {hours.map(hour => {
                    const hBookings = bookings.filter(b => b.hour === hour);
                    const bookedByMe = hBookings.some(b => b.user_id === userId);
                    const blockedByOtherGroup = !bookedByMe && blockedHours.has(hour);
                    const isPast = isPastSlot(event.date, hour, istNow);
                    const memberCount = new Set(hBookings.map(b => b.user_id)).size;
                    const isSel = selected.includes(hour);
                    const isUnavailable = bookedByMe || blockedByOtherGroup || isPast;

                    return (
                      <div
                        key={hour}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                          isPast ? "border-border/30 bg-muted/10 opacity-50"
                          : isSel ? "border-primary/50 bg-primary/5"
                          : bookedByMe ? "border-border bg-muted/20"
                          : blockedByOtherGroup ? "border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-800/40"
                          : "border-border/60 bg-background"
                        }`}
                      >
                        {/* Checkbox */}
                        <button
                          onClick={() => !isUnavailable && toggleHour(hour)}
                          disabled={isUnavailable}
                          className="flex-shrink-0 disabled:cursor-default"
                        >
                          {isSel || bookedByMe
                            ? <CheckSquare className="h-5 w-5 text-primary" />
                            : blockedByOtherGroup
                              ? <Square className="h-5 w-5 text-orange-400" />
                              : isPast
                                ? <Square className="h-5 w-5 text-muted-foreground/40" />
                                : <Square className="h-5 w-5 text-muted-foreground" />}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm font-medium text-foreground">
                              {HOUR_LABELS[hour]}–{HOUR_NEXT_LABELS[hour]}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {memberCount} member{memberCount !== 1 ? "s" : ""} booked
                          </p>
                        </div>

                        {/* Status badge */}
                        {bookedByMe
                          ? <Badge variant="default">Booked</Badge>
                          : isPast
                            ? <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30 text-xs">Past</Badge>
                            : blockedByOtherGroup
                              ? <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs">Other group</Badge>
                              : memberCount === 0
                                ? <Badge variant="outline" className="text-green-600 border-green-300">Available</Badge>
                                : null}

                        {/* Avatars */}
                        {hBookings.length > 0 && (
                          <div className="flex -space-x-1">
                            {hBookings.slice(0, 3).map((b, bi) => (
                              <div key={b.id} className="h-6 w-6 rounded-full bg-primary/20 border border-background flex items-center justify-center">
                                <span className="text-xs font-bold text-primary">
                                  {b.user_id === userId ? "M" : String(bi + 1)}
                                </span>
                              </div>
                            ))}
                            {hBookings.length > 3 && (
                              <div className="h-6 w-6 rounded-full bg-muted border border-background flex items-center justify-center">
                                <span className="text-xs text-muted-foreground">+{hBookings.length - 3}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Confirm + Start Counter — only when hours are selected or slot is live */}
                  {(selected.length > 0 || isActiveSlot) && (
                    <div className="pt-3 space-y-2">
                      {selected.length > 0 && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Selected</span>
                            <Badge>{selected.length} hour{selected.length > 1 ? "s" : ""}</Badge>
                          </div>
                          <Button
                            className="w-full counter-button"
                            disabled={loading}
                            onClick={async () => {
                              await onBook(selected);
                              setSelected([]);
                              setExpanded(null);
                            }}
                          >
                            {loading ? "Booking..." : "Confirm Booking"}
                          </Button>
                        </>
                      )}

                      {/* Start Counter — shown inline when this slot is currently live */}
                      {isActiveSlot && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200 dark:bg-green-950/30 dark:border-green-800">
                          <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-green-700 dark:text-green-400">Your slot is live now</div>
                            <div className="text-xs text-green-600 dark:text-green-500">{HOUR_LABELS[currentHour]}–{HOUR_NEXT_LABELS[currentHour]}</div>
                          </div>
                          <Button size="sm" className="counter-button flex-shrink-0" onClick={onStartCounter}>
                            <Play className="mr-1.5 h-3.5 w-3.5" />
                            Start Counter
                          </Button>
                        </div>
                      )}

                      {selected.length > 0 && (
                        <p className="text-xs text-muted-foreground text-center">
                          Same user cannot book overlapping hours in another group.
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

// // ─── Active Slot Screen ────────────────────────────────────────────────────────
// export const ActiveSlotScreen = ({ date, hour, bookings, members, onBack, onStartCounter }: {
//   date: string; hour: number; bookings: CgBooking[]; members: CgMember[];
//   onBack: () => void; onStartCounter: () => void;
// }) => {
//   const dateLabel = new Date(date).toLocaleDateString("en-IN", {
//     day: "numeric", month: "long", year: "numeric",
//   });
//   const hourBookings = bookings.filter(b => b.hour === hour);
//   const participantIds = new Set(hourBookings.map(b => b.user_id));
//   const participants = members.filter(m => participantIds.has(m.user_id));

//   return (
//     <div className="p-6 space-y-6 max-w-2xl mx-auto pb-24">
//       <div className="flex items-center gap-3">
//         <Button variant="ghost" size="sm" onClick={onBack} className="px-2">&#8592; Back</Button>
//       </div>
//       <PageHeader title="Your Active Slot" subtitle={dateLabel} />

//       <Card className="spiritual-card">
//         <CardContent className="p-6 text-center space-y-4">
//           <div className="text-3xl font-bold text-foreground">
//             {HOUR_LABELS[hour]}–{HOUR_NEXT_LABELS[hour]}
//           </div>
//           <div className="flex items-center justify-center gap-2">
//             <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
//             <span className="text-sm font-semibold text-green-600">Active</span>
//           </div>
//           <Button className="w-full counter-button" size="lg" onClick={onStartCounter}>
//             <Play className="mr-2 h-5 w-5" />
//             Start Counter
//           </Button>
//         </CardContent>
//       </Card>

//       <Card className="spiritual-card">
//         <CardHeader className="pb-3">
//           <CardTitle className="flex items-center text-base">
//             <Users className="mr-2 h-4 w-4 text-primary" />
//             Participants ({participants.length})
//           </CardTitle>
//         </CardHeader>
//         <CardContent>
//           {participants.length === 0 ? (
//             <p className="text-sm text-muted-foreground">No other participants yet.</p>
//           ) : (
//             <div className="flex flex-wrap gap-2">
//               {participants.map(m => {
//                 const label = memberLabel(m);
//                 return (
//                   <div key={m.user_id} className="flex items-center gap-2 bg-muted/40 rounded-full px-3 py-1.5">
//                     <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
//                       <span className="text-xs font-bold text-primary">{label[0].toUpperCase()}</span>
//                     </div>
//                     <span className="text-sm font-medium text-foreground">{label}</span>
//                     {m.role === "admin" && <Badge variant="secondary" className="text-xs px-1.5 py-0">Admin</Badge>}
//                   </div>
//                 );
//               })}
//             </div>
//           )}
//         </CardContent>
//       </Card>
//     </div>
//   );
// };
