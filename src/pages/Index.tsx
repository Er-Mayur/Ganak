import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useJapa } from "@/contexts/JapaContext";
import { Counter } from "@/components/Counter";
import { EnhancedDashboard } from "@/components/EnhancedDashboard";
import { ChakriGajar } from "@/components/ChakriGajar";
import { Calendar } from "@/components/Calendar";
import { EnhancedSettings } from "@/components/EnhancedSettings";
import { BottomNav } from "@/components/BottomNav";
import { SplashScreen } from "@/components/SplashScreen";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

const Index = () => {
  // Check if splash screen was already shown in this session
  const [showSplash, setShowSplash] = useState(() => {
    const splashShown = sessionStorage.getItem('splashShown');
    return !splashShown;
  });
  const [activeTab, setActiveTab] = useState<"counter" | "dashboard" | "chakri" | "calendar" | "settings">("counter");
  const { user, loading, signOut } = useAuth();
  const { getText } = useJapa();
  const navigate = useNavigate();

  const handleSplashComplete = () => {
    setShowSplash(false);
    sessionStorage.setItem('splashShown', 'true');
  };

  const handleSignOut = async () => {
    const confirmMessage = getText(
      "क्या आप वाकई बाहर निकलना चाहते हैं?",
      "Are you sure you want to sign out?"
    );
    
    if (window.confirm(confirmMessage)) {
      await signOut();
      navigate('/auth');
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-spiritual flex items-center justify-center">
        <div className="mandala-bg fixed inset-0 opacity-5 pointer-events-none" />
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{getText('लोड हो रहा है...', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth page
  }

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  const renderActiveScreen = () => {
    switch (activeTab) {
      case "counter":
        return <Counter />;
      case "dashboard":
        return <EnhancedDashboard />;
      case "chakri":
        return <ChakriGajar />;
      case "calendar":
        return <Calendar />;
      case "settings":
        return <EnhancedSettings />;
      default:
        return <Counter />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-spiritual relative">
      {/* Subtle Om background pattern */}
      <div className="mandala-bg fixed inset-0 opacity-5 pointer-events-none" />
      
      {/* Header with logout button */}
      {activeTab !== 'counter' && (
        <div className="relative z-10 p-4 pt-[calc(1rem+env(safe-area-inset-top))] flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {getText('स्वागत है', 'Welcome')}, {user.user_metadata?.display_name || user.email}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-muted-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {getText('प्रस्थान', 'Sign Out')}
          </Button>
        </div>
      )}
      
      {/* Main Content */}
      <div className={`relative z-10 animate-fade-in ${activeTab !== 'counter' ? 'pb-10' : ''}`}>
        {renderActiveScreen()}
      </div>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;