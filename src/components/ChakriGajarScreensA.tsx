import { useState } from "react";
import { ChevronRight, Plus, Copy, Upload, Users, CalendarClock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "./PageHeader";
import { Badge } from "@/components/ui/badge";
import { CgGroup, CgScreen, generateCode } from "./ChakriGajarTypes";

// ─── Home Screen ─────────────────────────────────────────────────────────────
export const HomeScreen = ({ groups, onNavigate, onNewGroup, onGoToToday }: {
  groups: CgGroup[];
  onNavigate: (s: CgScreen, d?: any) => void;
  onNewGroup: () => void;
  onGoToToday: (group: CgGroup) => void;
}) => (
  <div className="p-6 space-y-6 max-w-2xl mx-auto pb-24">
    <PageHeader
      title="Chakri Gajar"
      subtitle="चक्री गजर — Group chanting and slot booking"
    />

    <Card className="spiritual-card">
      <CardHeader>
        <CardTitle className="text-lg">About Chakri Gajar</CardTitle>
        <CardDescription>
          Chakri Gajar enables continuous group chanting. Members book time slots so the mantra
          never stops across 24 hours — like a spiritual relay.
        </CardDescription>
      </CardHeader>
    </Card>

    <Card className="spiritual-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-lg">
            <Users className="mr-2 h-5 w-5 text-primary" />
            My Groups
          </CardTitle>
          <Badge variant="secondary">{groups.length} joined</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No groups yet. Create or join one to get started.
          </p>
        ) : (
          groups.map(g => (
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
                    Code: <span className="font-bold text-primary tracking-widest">{g.code}</span>
                  </div>
                  <div className="text-xs text-secondary mt-0.5">
                    {(g.totalJaap ?? 0).toLocaleString()} total jaaps
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
                  <span className="text-xs font-semibold text-green-700 flex-1">Today's Chakri Gajar — Tap to view schedule</span>
                  <ChevronRight className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                </button>
              )}
            </div>
          ))
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

// ─── Create Group Screen ──────────────────────────────────────────────────────
export const CreateGroupScreen = ({ onBack, onCreate, onJoin, loading }: {
  onBack: () => void;
  onCreate: (name: string, code: string, desc: string) => Promise<void>;
  onJoin: (code: string) => Promise<void>;
  loading: boolean;
}) => {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [code] = useState(generateCode);
  const [joinCode, setJoinCode] = useState("");
  const [mode, setMode] = useState<"create" | "join">("create");

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto pb-24">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="px-2">
          &#8592; Back
        </Button>
      </div>

      <PageHeader
        title={mode === "create" ? "Create Group" : "Join Group"}
        subtitle="Chakri Gajar group management"
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
              {m === "create" ? "Create New" : "Join Existing"}
            </Button>
          ))}
        </CardContent>
      </Card>

      {mode === "create" ? (
        <>
          <Card className="spiritual-card">
            <CardHeader>
              <CardTitle className="flex items-center text-base">
                <Upload className="mr-2 h-4 w-4 text-primary" />
                Group Image
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-muted/20 transition-colors">
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Click to upload group image</p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
              </div>
            </CardContent>
          </Card>

          <Card className="spiritual-card">
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="group-name">Group Name *</Label>
                <Input
                  id="group-name"
                  placeholder="e.g. Ram Bhakti Mandal"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="group-code">Group Code (auto-generated)</Label>
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
                <p className="text-xs text-muted-foreground">Share this code to invite members.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="group-desc">Description</Label>
                <textarea
                  id="group-desc"
                  className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="What is this group about?"
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Button
            className="w-full counter-button"
            size="lg"
            disabled={loading || !name.trim()}
            onClick={() => onCreate(name, code, desc)}
          >
            Create Group
          </Button>
        </>
      ) : (
        <Card className="spiritual-card">
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="join-code">Enter Group Code</Label>
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
              {loading ? "Joining..." : "Join Group"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
