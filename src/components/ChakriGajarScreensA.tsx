import { useState } from "react";
import { ChevronRight, Plus, Copy, Upload, Users, CalendarClock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "./PageHeader";
import { Badge } from "@/components/ui/badge";
import { CgGroup, CgScreen, generateCode } from "./ChakriGajarTypes";
import { useJapa } from "@/contexts/JapaContext";

// ─── Home Screen ─────────────────────────────────────────────────────────────
export const HomeScreen = ({ groups, onNavigate, onNewGroup, onGoToToday }: {
  groups: CgGroup[];
  onNavigate: (s: CgScreen, d?: any) => void;
  onNewGroup: () => void;
  onGoToToday: (group: CgGroup) => void;
}) => {
  const { getText } = useJapa();

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto pb-24">
      <PageHeader
        title={getText("चक्री गजर", "Chakri Gajar")}
        subtitle={getText("समूह साधना और स्लॉट बुकिंग", "Group chanting and slot booking")}
      />

      <Card className="spiritual-card">
        <CardHeader>
          <CardTitle className="text-lg">{getText("चक्री गजर परिचय", "About Chakri Gajar")}</CardTitle>
          <CardDescription>
            {getText(
              "चक्री गजर में समूह लगातार साधना करता है। सदस्य समय स्लॉट बुक करते हैं ताकि 24 घंटे मंत्र जप चलता रहे — एक आध्यात्मिक रिले की तरह।",
              "Chakri Gajar enables continuous group chanting. Members book time slots so the mantra never stops across 24 hours — like a spiritual relay."
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="spiritual-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-lg">
              <Users className="mr-2 h-5 w-5 text-primary" />
              {getText("मेरे समूह", "My Groups")}
            </CardTitle>
            <Badge variant="secondary">{getText(`${groups.length} जुड़े`, `${groups.length} joined`)}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {getText(
                "अब तक कोई समूह नहीं है। शुरू करने के लिए समूह बनाएं या जुड़ें।",
                "No groups yet. Create or join one to get started."
              )}
            </p>
          ) : (
            groups.map(g => {
              return (
                <div key={g.id} className="rounded-lg border border-border/60 bg-background overflow-hidden">
                  <button
                    onClick={() => onNavigate("groupDetails", g)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-muted/40 transition-colors text-left"
                  >
                    {/* Avatar with green dot if today's event exists */}
                    <div className="relative flex-shrink-0">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      {g.todayEventId && (
                        <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background animate-pulse" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-foreground">{g.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {getText("कोड:", "Code:")} <span className="font-bold text-primary tracking-widest">{g.code}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </button>

                  {/* Today's schedule shortcut — shown when group has an event today */}
                  {g.todayEventId && (
                    <button
                      onClick={() => onGoToToday(g)}
                      className="w-full flex items-center gap-2 px-3 py-2 bg-green-50 border-t border-green-100 hover:bg-green-100 transition-colors text-left"
                    >
                      <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                      <CalendarClock className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                      <span className="text-xs font-semibold text-green-700 flex-1">
                        {getText("आज का चक्री गजर — शेड्यूल देखने के लिए टैप करें", "Today's Chakri Gajar — Tap to view schedule")}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

    {/* FAB */}
      <Button
        onClick={onNewGroup}
        className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-40 counter-button"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
};

// ─── Create Group Screen ──────────────────────────────────────────────────────
export const CreateGroupScreen = ({ onBack, onCreate, onJoin, loading }: {
  onBack: () => void;
  onCreate: (name: string, code: string, desc: string) => Promise<void>;
  onJoin: (code: string) => Promise<void>;
  loading: boolean;
}) => {
  const { getText } = useJapa();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [code] = useState(generateCode);
  const [joinCode, setJoinCode] = useState("");
  const [mode, setMode] = useState<"create" | "join">("create");

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto pb-24">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="px-2">
          {getText("← वापस", "← Back")}
        </Button>
      </div>

      <PageHeader
        title={mode === "create" ? getText("समूह बनाएं", "Create Group") : getText("समूह से जुड़ें", "Join Group")}
        subtitle={getText("चक्री गजर समूह प्रबंधन", "Chakri Gajar group management")}
      />

      {/* Mode Toggle */}
      <Card className="spiritual-card">
        <CardContent className="p-2 flex gap-1">
          {(["create", "join"] as const).map(m => (
            <Button
              key={m}
              variant={mode === m ? "default" : "ghost"}
              className="flex-1"
              onClick={() => setMode(m)}
            >
              {m === "create" ? getText("नया बनाएं", "Create New") : getText("मौजूदा से जुड़ें", "Join Existing")}
            </Button>
          ))}
        </CardContent>
      </Card>

      {mode === "create" ? (
        <>
          
          <Card className="spiritual-card">
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="group-name">{getText("समूह का नाम *", "Group Name *")}</Label>
                <Input
                  id="group-name"
                  placeholder={getText("उदा. राम भक्ति मंडल", "e.g. Ram Bhakti Mandal")}
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="group-code">{getText("समूह कोड (स्वचालित)", "Group Code (auto-generated)")}</Label>
                <div className="relative">
                  <Input
                    id="group-code"
                    value={code}
                    readOnly
                    className="pr-10 tracking-widest font-bold bg-muted/30"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => navigator.clipboard?.writeText(code)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {getText("सदस्यों को जोड़ने के लिए यह कोड साझा करें।", "Share this code to invite members.")}
                </p>
              </div>
            </CardContent>
          </Card>

          <Button
            className="w-full counter-button"
            size="lg"
            disabled={loading || !name.trim()}
            onClick={() => onCreate(name, code, desc)}
          >
            {getText("समूह बनाएं", "Create Group")}
          </Button>
        </>
      ) : (
        <Card className="spiritual-card">
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="join-code">{getText("समूह कोड दर्ज करें", "Enter Group Code")}</Label>
              <Input
                id="join-code"
                placeholder="XXXXXX"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="tracking-widest font-bold text-lg text-center"
              />
            </div>
            <Button
              className="w-full counter-button"
              size="lg"
              disabled={loading || joinCode.length < 6}
              onClick={() => onJoin(joinCode)}
            >
              {loading ? getText("जुड़ रहे हैं...", "Joining...") : getText("समूह से जुड़ें", "Join Group")}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
