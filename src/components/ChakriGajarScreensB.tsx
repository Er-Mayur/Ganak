import { useRef, useState } from "react";
import { Clock, Play, Users, CheckSquare, Square, ChevronDown, ChevronUp, CalendarCheck, Crown, Share2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "./PageHeader";
import { Plus } from "lucide-react";
import { useJapa } from "@/contexts/JapaContext";
import deityImage from "@/assets/deity.jpg";
import html2canvas from "html2canvas";
import { useToast } from "@/hooks/use-toast";
import { Share } from "@capacitor/share";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Capacitor } from "@capacitor/core";
import {
  CgGroup, CgEvent, CgBooking, CgMember, CgScreen, CgEventStats,
  SLOT_LABELS, HOUR_LABELS, HOUR_NEXT_LABELS, memberLabel, isPastSlot, getISTNow,
} from "./ChakriGajarTypes";

// ─── Group Details ─────────────────────────────────────────────────────────────
export const GroupDetailsScreen = ({ group, events, eventStats = {}, members, isAdmin, todayStr, onBack, onNavigate, onSchedule }: {
  group: CgGroup; events: CgEvent[]; eventStats?: Record<string, CgEventStats>; members: CgMember[]; isAdmin: boolean; todayStr: string;
  onBack: () => void; onNavigate: (s: CgScreen, d?: any) => void; onSchedule: () => void;
}) => {
  const [tab, setTab] = useState<"schedule" | "members" | "stats">("schedule");
  const { getText, settings } = useJapa();
  const { toast } = useToast();
  const shareRef = useRef<HTMLDivElement>(null);
  const [sharingEventId, setSharingEventId] = useState<string | null>(null);
  const dateLocale = settings.language === "hi" ? "hi-IN" : "en-IN";
  const tabLabels: Record<typeof tab, string> = {
    schedule: getText("शेड्यूल", "Schedule"),
    members: getText("सदस्य", "Members"),
    stats: getText("आंकड़े", "Stats"),
  };

  const handleShareGroup = async () => {
    const shareTitle = getText("चक्री गजर समूह", "Chakri Gajar Group");
    const shareText = getText(
      `मेरे चक्री गजर समूह में जुड़ें: ${group.name}. कोड: ${group.code}`,
      `Join my Chakri Gajar group: ${group.name}. Code: ${group.code}`
    );

    try {
      if (navigator.share) {
        await navigator.share({ title: shareTitle, text: shareText });
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
        window.alert(getText("शेयर टेक्स्ट कॉपी हो गया।", "Share text copied."));
        return;
      }
      window.prompt(getText("शेयर टेक्स्ट", "Share text"), shareText);
    } catch (error) {
      console.error("Share failed", error);
      window.alert(getText("शेयर नहीं हो पाया।", "Unable to share."));
    }
  };

  const handleShareEvent = async (event: CgEvent, stats: CgEventStats) => {
    if (!shareRef.current) return;
    setSharingEventId(event.id);

    const formattedDate = new Date(event.date).toLocaleDateString(dateLocale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const setShareText = (id: string, value: string) => {
      const el = document.getElementById(id);
      if (el) el.innerText = value;
    };

    setShareText("cg-share-group-name", group.name);
    setShareText("cg-share-group-code", `${getText("कोड:", "Code:")} ${group.code}`);
    setShareText("cg-share-date", `${getText("तारीख:", "Date:")} ${formattedDate}`);
    const formatMala = (jaaps: number) =>
      (jaaps / 108).toLocaleString(dateLocale, { maximumFractionDigits: 2 });
    const myMala = formatMala(stats.myJaaps);
    const groupMala = formatMala(stats.groupJaaps);

    setShareText("cg-share-my-count", `${myMala} ${getText("माला", "Mala")}`);
    setShareText("cg-share-group-total", `${groupMala} ${getText("माला", "Mala")}`);

    const shareTitle = getText("चक्री गजर", "Chakri Gajar");
    const shareText = getText(
      `चक्री गजर | ${group.name} | ${formattedDate} | कोड: ${group.code} | मेरी माला: ${myMala} | समूह माला: ${groupMala}`,
      `Chakri Gajar | ${group.name} | ${formattedDate} | Code: ${group.code} | My Malas: ${myMala} | Group Malas: ${groupMala}`
    );

    try {
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(shareRef.current, {
        backgroundColor: "#1a1a1a",
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });

      if (Capacitor.isNativePlatform()) {
        try {
          const base64Data = canvas.toDataURL("image/png");
          const fileName = `cg-share-${event.date}-${Date.now()}.png`;

          const savedFile = await Filesystem.writeFile({
            path: fileName,
            data: base64Data.split(",")[1],
            directory: Directory.Cache,
          });

          await Share.share({
            title: shareTitle,
            text: shareText,
            files: [savedFile.uri],
          });

          toast({
            title: getText("साझा किया गया", "Shared successfully"),
            description: getText("शेड्यूल साझा किया गया है", "Schedule shared successfully"),
          });
        } catch (err) {
          console.error("Error sharing native:", err);
          toast({
            variant: "destructive",
            title: getText("त्रुटि", "Error"),
            description: getText("साझा करने में विफल", "Failed to share"),
          });
        }
      } else {
        canvas.toBlob(async (blob) => {
          if (!blob) return;

          const file = new File([blob], "cg-share.png", { type: "image/png" });
          const shareData = { files: [file], title: shareTitle, text: shareText };

          if (navigator.canShare && navigator.canShare(shareData)) {
            try {
              await navigator.share(shareData);
              toast({
                title: getText("साझा किया गया", "Shared successfully"),
                description: getText("शेड्यूल साझा किया गया है", "Schedule shared successfully"),
              });
            } catch (err) {
              console.error("Error sharing:", err);
            }
          } else {
            const link = document.createElement("a");
            link.download = "cg-share.png";
            link.href = canvas.toDataURL();
            link.click();

            toast({
              title: getText("छवि डाउनलोड की गई", "Image Downloaded"),
              description: getText("आप अब इसे मैन्युअल रूप से साझा कर सकते हैं", "You can now share it manually"),
            });
          }
        });
      }
    } catch (err) {
      console.error("Error generating image:", err);
      toast({
        variant: "destructive",
        title: getText("त्रुटि", "Error"),
        description: getText("छवि बनाने में विफल", "Failed to generate image"),
      });
    } finally {
      setSharingEventId(null);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto pb-24">
      {/* Hidden Share Template */}
      <div className="fixed left-[-9999px] top-0">
        <div
          ref={shareRef}
          className="w-[400px] bg-gradient-to-b from-zinc-900 to-black p-8 text-white flex flex-col items-center justify-center space-y-6 rounded-xl font-sans"
        >
          <h1 className="text-5xl text-primary mb-2 font-bold">{getText("चक्री गजर", "Chakri Gajar")}</h1>
          <div className="w-64 relative">
            <img
              src={deityImage}
              alt="Deity"
              className="w-full h-auto rounded-lg shadow-2xl border-2 border-primary/20"
              crossOrigin="anonymous"
            />
          </div>
          <div className="text-center space-y-2 w-full bg-white/5 p-4 rounded-lg backdrop-blur-sm">
            <h2 id="cg-share-group-name" className="text-xl text-gray-200 font-semibold">Group</h2>
            <p id="cg-share-group-code" className="text-sm text-gray-300">Code</p>
            <p id="cg-share-date" className="text-sm text-gray-400">Date</p>
          </div>
          <div className="grid grid-cols-2 gap-3 w-full">
            <div className="bg-white/5 p-3 rounded-lg text-center">
              <div className="text-xs text-gray-400">{getText("मेरी माला", "My Malas")}</div>
              <div id="cg-share-my-count" className="text-2xl font-bold text-primary">0</div>
            </div>
            <div className="bg-white/5 p-3 rounded-lg text-center">
              <div className="text-xs text-gray-400">{getText("समूह माला", "Group Malas")}</div>
              <div id="cg-share-group-total" className="text-2xl font-bold text-secondary">0</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-4">{getText("गणक ऐप से साझा", "Shared from Ganak App")}</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="px-2">
          {getText("← वापस", "← Back")}
        </Button>
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
                <Badge variant={isAdmin ? "default" : "secondary"}>
                  {isAdmin ? getText("एडमिन", "Admin") : getText("सदस्य", "Member")}
                </Badge>
              </div>

              {/* CHANGED: Replaced gap-2 with justify-between and added w-full */}
              <div className="flex items-center justify-between w-full text-sm text-muted-foreground mt-0.5">
                <span>
                  {getText("कोड:", "Code:")} <span className="font-bold text-primary tracking-widest">{group.code}</span>
                </span>
                <Button variant="ghost" size="sm" onClick={handleShareGroup} className="h-7 px-2">
                  <Share2 className="mr-1 h-4 w-4" />
                  {getText("शेयर", "Share")}
                </Button>
              </div>

              <p className="text-sm text-secondary mt-0.5">
                {getText(
                  `${Math.floor((group.totalJaap ?? 0) / 108).toLocaleString()} कुल माला`,
                  `${Math.floor((group.totalJaap ?? 0) / 108).toLocaleString()} Total Malas`
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="spiritual-card">
        <CardContent className="p-1 flex gap-1">
          {(["schedule", "members", "stats"] as const).map(t => (
            <Button key={t} variant={tab === t ? "default" : "ghost"} className="flex-1 capitalize" onClick={() => setTab(t)}>
              {tabLabels[t]}
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
                  {isAdmin
                    ? getText("अभी कोई शेड्यूल नहीं है। नया बनाने के लिए + दबाएं।", "No schedules yet. Tap + to create one.")
                    : getText("आगामी शेड्यूल नहीं है।", "No upcoming schedules.")}
                </p>
              </CardContent>
            </Card>
          ) : (
            events.map(ev => {
              const isToday = ev.date === todayStr;  // IST-correct
              const isPast = ev.date < todayStr;
              const stats = eventStats[ev.id];
              const canShare = Boolean(stats?.hasBooking);

              return (
                <div
                  key={ev.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onNavigate("scheduleList", ev)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onNavigate("scheduleList", ev);
                    }
                  }}
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
                        {new Date(ev.date).toLocaleDateString(dateLocale, { day: "numeric", month: "long", year: "numeric" })}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {getText("8 स्लॉट · 24 घंटे", "8 slots · 24 hours")}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isToday
                      ? <Badge className="bg-green-600 text-white">{getText("आज", "Today")}</Badge>
                      : isPast
                        ? <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">{getText("पिछला", "Past")}</Badge>
                        : <Badge variant="outline">{getText("देखें", "View")}</Badge>}
                    {canShare && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (stats) handleShareEvent(ev, stats);
                        }}
                        disabled={sharingEventId === ev.id}
                        className="h-8 w-8"
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
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
              {getText(`सदस्य (${members.length})`, `Members (${members.length})`)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{getText("कोई सदस्य नहीं मिला।", "No members found.")}</p>
            ) : (
              members.map(m => {
                const label = memberLabel(m);
                const roleLabel = m.role === "admin" ? getText("एडमिन", "Admin") : getText("सदस्य", "Member");
                return (
                  <div key={m.user_id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-muted">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">{label[0].toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground text-sm">{label}</div>
                      <div className="text-xs text-muted-foreground">{roleLabel}</div>
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
            [getText("कुल माला", "Total Malas"), Math.floor((group.totalJaap ?? 0) / 108).toLocaleString(), "text-primary"],
            [getText("सदस्य", "Members"), members.length.toString(), "text-secondary"],
            [getText("सत्र", "Sessions"), events.length.toString(), "text-accent"],
            [getText("एडमिन", "Admins"), members.filter(m => m.role === "admin").length.toString(), "text-orange-500"],
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
  const { getText, settings } = useJapa();
  const dateLocale = settings.language === "hi" ? "hi-IN" : "en-IN";
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

  const dateLabel = new Date(event.date).toLocaleDateString(dateLocale, {
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
        <Button variant="ghost" size="sm" onClick={onBack} className="px-2">
          {getText("← वापस", "← Back")}
        </Button>
      </div>

      <PageHeader title={getText("चक्री गजर शेड्यूल", "Chakri Gajar Schedule")} subtitle={dateLabel} />

      {/* Active slot shown only when user has booking now */}
      {activeBooking && (
        <Card className="spiritual-card border-green-400/30 bg-green-50/40 dark:bg-green-950/20">
          <CardContent className="p-5">

            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />

                  <span className="text-sm font-semibold text-green-600">
                    {getText("सक्रिय स्लॉट", "Active Slot")}
                  </span>
                </div>

                <h2 className="text-2xl font-bold">
                  {HOUR_LABELS[currentHour]}
                  {" - "}
                  {HOUR_NEXT_LABELS[currentHour]}
                </h2>

                <p className="text-sm text-muted-foreground mt-1">
                  {getText("आपकी बुकिंग अभी चालू है", "Your booking is currently live")}
                </p>
              </div>

              <Badge className="bg-green-600">
                {getText("चल रहा है", "Running")}
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
              {getText("काउंटर शुरू करें", "Start Counter")}
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
            <Card key={label} className={`spiritual-card transition-all ${isSlotAllPast ? "opacity-50"
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
                        <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30 text-xs py-0 h-5">
                          {getText("पिछला", "Past")}
                        </Badge>
                      )}
                      {isActiveSlot && !isSlotAllPast && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                          {getText("लाइव", "Live")}
                        </span>
                      )}
                      {bookedByMeInSlot && !isActiveSlot && !isSlotAllPast && (
                        <Badge variant="outline" className="text-green-600 border-green-300 text-xs py-0 h-5">
                          {getText("बुक किया", "Booked")}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {getText(`${uniqueUsers} बुकिंग`, `${uniqueUsers} booked`)}
                    </span>
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
                    {getText(
                      "बुक करने के लिए एक या अधिक घंटे चुनें। एक से अधिक घंटे चुन सकते हैं।",
                      "Select one or more hours to book. Multiple hours can be selected."
                    )}
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
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${isPast ? "border-border/30 bg-muted/10 opacity-50"
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
                            {getText(
                              `${memberCount} सदस्य ने बुक किया`,
                              `${memberCount} member${memberCount !== 1 ? "s" : ""} booked`
                            )}
                          </p>
                        </div>

                        {/* Status badge */}
                        {bookedByMe
                          ? <Badge variant="default">{getText("बुक किया", "Booked")}</Badge>
                          : isPast
                            ? <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30 text-xs">{getText("पिछला", "Past")}</Badge>
                            : blockedByOtherGroup
                              ? <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs">{getText("दूसरा समूह", "Other group")}</Badge>
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
                            <span className="text-sm text-muted-foreground">{getText("चयनित", "Selected")}</span>
                            <Badge>{getText(`${selected.length} घंटे`, `${selected.length} hour${selected.length > 1 ? "s" : ""}`)}</Badge>
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
                            {loading ? getText("बुक हो रहा है...", "Booking...") : getText("बुकिंग पुष्टि करें", "Confirm Booking")}
                          </Button>
                        </>
                      )}

                      {/* Start Counter — shown inline when this slot is currently live */}
                      {isActiveSlot && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200 dark:bg-green-950/30 dark:border-green-800">
                          <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-green-700 dark:text-green-400">
                              {getText("आपका स्लॉट अभी चालू है", "Your slot is live now")}
                            </div>
                            <div className="text-xs text-green-600 dark:text-green-500">{HOUR_LABELS[currentHour]}–{HOUR_NEXT_LABELS[currentHour]}</div>
                          </div>
                          <Button size="sm" className="counter-button flex-shrink-0" onClick={onStartCounter}>
                            <Play className="mr-1.5 h-3.5 w-3.5" />
                            {getText("काउंटर शुरू करें", "Start Counter")}
                          </Button>
                        </div>
                      )}

                      {selected.length > 0 && (
                        <p className="text-xs text-muted-foreground text-center">
                          {getText(
                            "एक ही उपयोगकर्ता दूसरे समूह में समान घंटे बुक नहीं कर सकता।",
                            "Same user cannot book overlapping hours in another group."
                          )}
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
