import { useEffect, useState } from "react";

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete();
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  if (!visible) {
    return null; // Completely unmount splash screen
  }

  return (
    <div className="fixed inset-0 bg-gradient-primary flex flex-col items-center justify-center z-50 animate-fade-in">
      {/* Animated Om Symbol */}
      <div className="text-white mb-8 animate-pulse-spiritual">
        <div className="om-symbol text-8xl animate-om-glow">ॐ</div>
      </div>
      
      {/* App Title */}
      <div className="text-center text-white mb-12">
        <h1 className="text-3xl font-bold mb-2">गणक</h1>
      </div>
      
      {/* Subtle loading animation */}
      <div className="flex space-x-2">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></div>
        <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></div>
      </div>
    </div>
  );
};