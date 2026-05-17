import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Target, Share2, BarChart2 } from "lucide-react";
import { format } from "date-fns";
import { useJapa } from "@/contexts/JapaContext";
import { PageHeader } from "./PageHeader";
import deityImage from "@/assets/deity.jpg";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

export const EnhancedDashboard = () => {
  const { stats, getText } = useJapa();
  const { toast } = useToast();
  const shareRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);

  const todayProgressPercentage = Math.min((stats.todayMalas / (stats.todayTarget || 1)) * 100, 100);

  const handleShare = async (type: 'today' | 'month' | 'year', count: number, label: string) => {
    if (!shareRef.current) return;
    setSharing(true);
    
    // Update share content based on type
    const shareTitle = document.getElementById('share-title');
    const shareCount = document.getElementById('share-count');
    if (shareTitle) shareTitle.innerText = label;
    if (shareCount) shareCount.innerText = `${count} ${getText("माला", "Mala")}`;

    try {
      // Wait for render
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(shareRef.current, {
        backgroundColor: '#1a1a1a', // Dark background
        scale: 2, // Higher quality
        useCORS: true, // Enable CORS for images
        allowTaint: true,
      });

      if (Capacitor.isNativePlatform()) {
        try {
          const base64Data = canvas.toDataURL('image/png');
          const fileName = `mala-stats-${Date.now()}.png`;
          
          // Write file to cache
          const savedFile = await Filesystem.writeFile({
            path: fileName,
            data: base64Data.split(',')[1], // Remove the data:image/png;base64, prefix
            directory: Directory.Cache
          });

          // Share the file
          await Share.share({
            title: 'My Mala Stats',
            text: `${label}: ${count} ${getText("माला", "Mala")}`,
            files: [savedFile.uri],
          });
          
          toast({
            title: getText("साझा किया गया", "Shared successfully"),
            description: getText("आपके आंकड़े साझा किए गए हैं", "Your stats have been shared"),
          });
        } catch (err) {
          console.error('Error sharing native:', err);
          toast({
            variant: "destructive",
            title: getText("त्रुटि", "Error"),
            description: getText("साझा करने में विफल", "Failed to share"),
          });
        }
      } else {
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          
          const file = new File([blob], 'mala-stats.png', { type: 'image/png' });
          const shareData = {
            files: [file],
            title: 'My Mala Stats',
          };
          
          if (navigator.canShare && navigator.canShare(shareData)) {
            try {
              await navigator.share(shareData);
              toast({
                title: getText("साझा किया गया", "Shared successfully"),
                description: getText("आपके आंकड़े साझा किए गए हैं", "Your stats have been shared"),
              });
            } catch (err) {
              console.error('Error sharing:', err);
            }
          } else {
            // Fallback to download
            const link = document.createElement('a');
            link.download = 'mala-stats.png';
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
      console.error('Error generating image:', err);
      toast({
        variant: "destructive",
        title: getText("त्रुटि", "Error"),
        description: getText("छवि बनाने में विफल", "Failed to generate image"),
      });
    } finally {
      setSharing(false);
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
          <h1 className="text-6xl text-primary mb-4 font-bold">गणक</h1>
          <div className="w-64 relative">
            <img 
              src={deityImage} 
              alt="Deity" 
              className="w-full h-auto rounded-lg shadow-2xl border-2 border-primary/20"
              crossOrigin="anonymous"
            />
          </div>
          <div className="text-center space-y-2 w-full bg-white/5 p-4 rounded-lg backdrop-blur-sm mt-6">
            <h2 id="share-title" className="text-xl text-gray-400 font-medium">Stats</h2>
            <p id="share-count" className="text-3xl font-bold text-primary">0 Mala</p>
          </div>
          <div className="text-xs text-gray-500 mt-4">Shared from Ganak App</div>
        </div>
      </div>

      {/* Header */}
      <PageHeader 
        title={getText("डैशबोर्ड", "Dashboard")} 
        subtitle={getText("आपकी आध्यात्मिक यात्रा का सिंहावलोकन", "Overview of your spiritual journey")} 
      />

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="spiritual-card">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-primary mb-1">{stats.totalJaaps}</div>
            <div className="text-sm text-muted-foreground">{getText("कुल जाप", "Total Jaaps")}</div>
          </CardContent>
        </Card>
        
        <Card className="spiritual-card">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-secondary mb-1">{stats.totalMalas}</div>
            <div className="text-sm text-muted-foreground">{getText("कुल माला", "Total Malas")}</div>
          </CardContent>
        </Card>
        
        <Card className="spiritual-card">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-accent mb-1">{stats.currentStreak}</div>
            <div className="text-sm text-muted-foreground">{getText("वर्तमान श्रृंखला", "Current Streak")}</div>
          </CardContent>
        </Card>
        
        <Card className="spiritual-card">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-orange-500 mb-1">{stats.averageMalasPerDay}</div>
            <div className="text-sm text-muted-foreground">{getText("दैनिक औसत", "Daily Average")}</div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Cards */}
      <div className="space-y-4">
        {/* Daily Progress */}
        <Card className="spiritual-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-lg">
                <Target className="mr-2 h-5 w-5 text-primary" />
                {getText("आज का लक्ष्य", "Today's Goal")}
              </CardTitle>
              <Badge variant={todayProgressPercentage >= 100 ? "default" : "secondary"}>
                {Math.round(todayProgressPercentage)}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{stats.todayMalas} / {stats.todayTarget} {getText("माला", "mala")}</span>
                <span className="text-muted-foreground">
                  {format(new Date(), 'dd MMM')}
                </span>
              </div>
              <Progress value={todayProgressPercentage} className="h-3" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats & Sharing Section */}
      <Card className="spiritual-card">
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <BarChart2 className="mr-2 h-5 w-5 text-primary" />
            {getText("आंकड़े", "Stats")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Today's Stats */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-muted">
            <div>
              <div className="text-sm font-medium">
                {getText(`आज (${format(new Date(), 'dd MMM')})`, `Today (${format(new Date(), 'dd MMM')})`)}
              </div>
              <div className="text-2xl font-bold text-primary">
                {stats.todayMalas} {getText("माला", "Mala")}
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => handleShare(
                'today', 
                stats.todayMalas, 
                getText(`आज की माला (${format(new Date(), 'dd MMM')})`, `Today's Mala (${format(new Date(), 'dd MMM')})`)
              )}
            >
              <Share2 className="h-5 w-5 text-muted-foreground hover:text-primary" />
            </Button>
          </div>

          {/* Monthly Stats */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-muted">
            <div>
              <div className="text-sm font-medium">
                {getText(`मासिक (${format(new Date(), 'MMMM')})`, `Monthly (${format(new Date(), 'MMMM')})`)}
              </div>
              <div className="text-2xl font-bold text-secondary">
                {stats.monthlyMalas} {getText("माला", "Mala")}
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => handleShare(
                'month', 
                stats.monthlyMalas, 
                getText(`मासिक माला (${format(new Date(), 'MMMM')})`, `Monthly Mala (${format(new Date(), 'MMMM')})`)
              )}
            >
              <Share2 className="h-5 w-5 text-muted-foreground hover:text-primary" />
            </Button>
          </div>

          {/* Annual Stats */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-muted">
            <div>
              <div className="text-sm font-medium">
                {getText(`वार्षिक (${format(new Date(), 'yyyy')})`, `Annual (${format(new Date(), 'yyyy')})`)}
              </div>
              <div className="text-2xl font-bold text-accent">
                {stats.yearlyMalas} {getText("माला", "Mala")}
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => handleShare(
                'year', 
                stats.yearlyMalas, 
                getText(`वार्षिक माला (${format(new Date(), 'yyyy')})`, `Annual Mala (${format(new Date(), 'yyyy')})`)
              )}
            >
              <Share2 className="h-5 w-5 text-muted-foreground hover:text-primary" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};