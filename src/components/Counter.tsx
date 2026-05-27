import { useCallback, useRef, useEffect, useState } from "react";
import { useJapa } from "@/contexts/JapaContext";
import deityImage from "@/assets/deity.jpg";
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { PageHeader } from "./PageHeader";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit3, Minus, MoreVertical, RotateCcw } from "lucide-react";

interface CounterProps {
  onJaapCountChange?: (count: number) => void;
}

export const Counter = ({ onJaapCountChange }: CounterProps) => {
  const { todayJaaps, incrementJaaps, setJaaps, settings, getText } = useJapa();
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isSetDialogOpen, setIsSetDialogOpen] = useState(false);
  const [setCountValue, setSetCountValue] = useState("");

  // Initialize Web Audio API for sound
  useEffect(() => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audio = new Audio();
    
    // Create a simple beep sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    gainNode.gain.value = 0.1;
    
    audioRef.current = audio;
    
    return () => {
      audioContext.close();
    };
  }, []);

  const handleJaap = useCallback(async () => {
    incrementJaaps();
    
    // Play sound if enabled
    if (settings.soundEnabled && audioRef.current && audioRef.current.play) {
      try {
        audioRef.current.play();
      } catch (error) {
        console.error('Failed to play sound:', error);
      }
    }
    
    // Vibrate if enabled
    if (settings.hapticsEnabled) {
      try {
        let style = ImpactStyle.Medium;
        if (settings.vibrationPattern === 'soft') style = ImpactStyle.Light;
        else if (settings.vibrationPattern === 'strong') style = ImpactStyle.Heavy;
        
        await Haptics.impact({ style });
      } catch (e) {
        // Fallback to navigator.vibrate if Capacitor Haptics fails or on web
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          let duration = 50;
          if (settings.vibrationPattern === 'soft') duration = 20;
          else if (settings.vibrationPattern === 'strong') duration = 80;
          navigator.vibrate(duration);
        }
      }
    }

    if (onJaapCountChange) {
      onJaapCountChange(todayJaaps + 1);
    }
  }, [incrementJaaps, settings.soundEnabled, settings.hapticsEnabled, onJaapCountChange, todayJaaps]);

  const handleReduce = () => {
    const confirmMessage = getText(
      "क्या आप गिनती 1 कम करना चाहते हैं?",
      "Reduce count by 1?"
    );
    if (!window.confirm(confirmMessage)) return;
    setJaaps(Math.max(0, todayJaaps - 1));
  };

  const handleReset = () => {
    const confirmMessage = getText(
      "क्या आप गिनती रीसेट करना चाहते हैं?",
      "Reset count?"
    );
    if (!window.confirm(confirmMessage)) return;
    setJaaps(0);
  };

  const handleOpenSetDialog = () => {
    setSetCountValue(todayJaaps.toString());
    setIsSetDialogOpen(true);
  };

  const handleSaveSet = () => {
    const parsed = parseInt(setCountValue, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      window.alert(getText("कृपया मान्य संख्या दर्ज करें", "Please enter a valid number"));
      return;
    }

    const confirmMessage = getText(
      `क्या आप गिनती ${parsed} पर सेट करना चाहते हैं?`,
      `Set count to ${parsed}?`
    );
    if (!window.confirm(confirmMessage)) return;

    setJaaps(parsed);
    setIsSetDialogOpen(false);
  };

  return (
    <div 
      className="relative flex flex-col items-center justify-center min-h-screen p-4 cursor-pointer select-none pb-24"
      onClick={handleJaap}
    >
      <div className="absolute top-4 right-4 z-20" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => e.stopPropagation()}
              aria-label={getText("काउंटर मेनू", "Counter menu")}
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onSelect={(e) => {
              e.preventDefault();
              handleReduce();
            }}>
              <Minus className="mr-2 h-4 w-4" />
              {getText("गिनती घटाएं", "Reduce Count")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={(e) => {
              e.preventDefault();
              handleOpenSetDialog();
            }}>
              <Edit3 className="mr-2 h-4 w-4" />
              {getText("गिनती सेट करें", "Set Count")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={(e) => {
              e.preventDefault();
              handleReset();
            }}>
              <RotateCcw className="mr-2 h-4 w-4" />
              {getText("गिनती रीसेट करें", "Reset Count")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {/* Header */}
      <PageHeader 
        title={""} 
        subtitle={""} 
      />
      {/* Deity Image */}
      <div className="relative w-full max-w-md mb-8">
        <img 
          src={deityImage} 
          alt="Deity" 
          className="w-full h-auto max-h-[60vh] object-contain rounded-lg shadow-2xl"
        />
      </div>
      
      {/* Jaap Count Display */}
      <div className="text-center">
        <div className="text-8xl font-bold text-primary animate-pulse-spiritual">
          {todayJaaps}
        </div>
      </div>

      <Dialog open={isSetDialogOpen} onOpenChange={setIsSetDialogOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>{getText("गिनती सेट करें", "Set Count")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="set-count-input">{getText("गिनती (जाप)", "Count (Jaaps)")}</Label>
            <Input
              id="set-count-input"
              type="number"
              min="0"
              value={setCountValue}
              onChange={(e) => setSetCountValue(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsSetDialogOpen(false)}
            >
              {getText("रद्द करें", "Cancel")}
            </Button>
            <Button type="button" onClick={handleSaveSet}>
              {getText("सहेजें", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
