import { Home, BarChart3, Settings, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useJapa } from "@/contexts/JapaContext";

interface BottomNavProps {
  activeTab: "counter" | "dashboard" | "chakri" | "calendar" | "settings";
  onTabChange: (tab: "counter" | "dashboard" | "chakri" | "calendar" | "settings") => void;
  hasActiveSlot?: boolean;
}

export const BottomNav = ({ activeTab, onTabChange, hasActiveSlot }: BottomNavProps) => {
  const { getText, settings } = useJapa();
  
  const navItems = [
    {
      id: "counter" as const,
      label: getText("काउंटर", "Counter"),
      shortLabel: getText("काउंट", "Count"),
      icon: Home,
    },
    {
      id: "dashboard" as const,
      label: getText("डैशबोर्ड", "Dashboard"),
      shortLabel: getText("डैश", "Dash"),
      icon: BarChart3,
    },
    {
      id: "chakri" as const,
      label: getText("चक्री गजर", "Chakri Gajar"),
      shortLabel: getText("चक्र", "Chakri"),
      icon: Users,
    },
    {
      id: "calendar" as const,
      label: getText("कैलेंडर", "Calendar"),
      shortLabel: getText("कैल", "Cal"),
      icon: Calendar,
    },
    {
      id: "settings" as const,
      label: getText("सेटिंग्स", "Settings"),
      shortLabel: getText("सेट", "Set"),
      icon: Settings,
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-2 z-50">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const displayLabel = settings.language === 'both' ? item.shortLabel : item.label;
          
          return (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              onClick={() => onTabChange(item.id)}
              className={`relative flex flex-col items-center space-y-1 h-auto py-2 px-2 sm:px-4 rounded-xl transition-all duration-200 min-w-0 ${
                isActive 
                  ? "bg-primary/10 text-primary border border-primary/20" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <div className="relative">
                <Icon className={`h-5 w-5 ${isActive ? "text-primary" : ""}`} />
                {/* Green dot: only on Chakri tab when user has an active slot right now */}
                {item.id === "chakri" && hasActiveSlot && (
                  <span className="absolute -top-1 -right-1.5 h-2.5 w-2.5 rounded-full bg-green-500 border border-background animate-pulse" />
                )}
              </div>
              <span className={`text-xs font-medium truncate max-w-16 ${isActive ? "text-primary" : ""}`}>
                {displayLabel}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};