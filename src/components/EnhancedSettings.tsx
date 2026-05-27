import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Volume2,
  Palette,
  Target,
  Mail
} from "lucide-react";
import { useJapa, AppSettings } from "@/contexts/JapaContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "./PageHeader";
import { ChevronRight } from "lucide-react";

export const EnhancedSettings = () => {
  const { settings, updateSettings, getText } = useJapa();
  const { user, resetPassword } = useAuth();
  const { toast } = useToast();
  const [resetEmail, setResetEmail] = useState(user?.email || "");
  const [isResetting, setIsResetting] = useState(false);

  const [contactExpanded, setContactExpanded] = useState(false);
  useEffect(() => {
    setResetEmail(user?.email || "");
  }, [user]);

  const handleSettingChange = (key: keyof AppSettings, value: any) => {
    updateSettings({ [key]: value });
  };

  const handleResetPassword = async () => {
    if (!resetEmail) {
      toast({
        title: getText("ईमेल आवश्यक है", "Email Required"),
        description: getText("कृपया अपना ईमेल दर्ज करें", "Please enter your email"),
        variant: "destructive",
      });
      return;
    }

    setIsResetting(true);
    const { error } = await resetPassword(resetEmail);

    if (error) {
      toast({
        title: getText("रीसेट में त्रुटि", "Reset Error"),
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: getText("रीसेट लिंक भेजा गया", "Reset Link Sent"),
        description: getText("कृपया अपना ईमेल जांचें", "Please check your email"),
      });
    }

    setIsResetting(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto pb-24">
      {/* Header */}
      <PageHeader
        title={getText("उन्नत सेटिंग्स", "Advanced Settings")}
        subtitle={getText("अपने आध्यात्मिक अभ्यास को अनुकूलित करें", "Customize your spiritual practice")}
      />

      {/* Targets Settings */}
      <Card className="spiritual-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="mr-2 h-5 w-5 text-primary" />
            {getText("लक्ष्य निर्धारण", "Goal Setting")}
          </CardTitle>
          <CardDescription>
            {getText("अपना दैनिक लक्ष्य सेट करें", "Set your daily goal")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="daily-target">{getText("दैनिक लक्ष्य (माला में)", "Daily Goal (in mala)")}</Label>
            <Input
              id="daily-target"
              type="number"
              min="1"
              value={settings.dailyTarget}
              onChange={(e) => {
                const value = e.target.value;
                handleSettingChange("dailyTarget", value);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Haptic Feedback Settings */}
      <Card className="spiritual-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Volume2 className="mr-2 h-5 w-5 text-secondary" />
            {getText("हैप्टिक फीडबैक", "Haptic Feedback")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{getText("हैप्टिक फीडबैक", "Haptic Feedback")}</Label>
              <div className="text-sm text-muted-foreground">
                {getText("स्पर्श कंपन", "Touch vibration")}
              </div>
            </div>
            <Switch
              checked={settings.hapticsEnabled}
              onCheckedChange={(value) => handleSettingChange("hapticsEnabled", value)}
            />
          </div>

          {settings.hapticsEnabled && (
            <div className="space-y-2">
              <Label>{getText("कंपन की तीव्रता", "Vibration Intensity")}</Label>
              <Select
                value={settings.vibrationPattern}
                onValueChange={(value: "soft" | "medium" | "strong") => handleSettingChange("vibrationPattern", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="soft">{getText("मृदु", "Soft")}</SelectItem>
                  <SelectItem value="medium">{getText("मध्यम", "Medium")}</SelectItem>
                  <SelectItem value="strong">{getText("तीव्र", "Strong")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card className="spiritual-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Palette className="mr-2 h-5 w-5 text-orange-500" />
            {getText("भाषा", "Language")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{getText("भाषा प्राथमिकता", "Language Preference")}</Label>
            <Select
              value={settings.language}
              onValueChange={(value: "hi" | "en" | "both") => handleSettingChange("language", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hi">हिंदी</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Account */}
      <Card className="spiritual-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Mail className="mr-2 h-5 w-5 text-primary" />
            {getText("खाता", "Account")}
          </CardTitle>
          <CardDescription>
            {getText("पासवर्ड रीसेट करें", "Reset your password")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-email">{getText("ईमेल", "Email")}</Label>
            <Input
              id="reset-email"
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={true}

            />
          </div>
          <Button onClick={handleResetPassword} disabled={isResetting}>
            {getText("रीसेट लिंक भेजें", "Send Reset Link")}
          </Button>
          <div className="text-xs text-muted-foreground">
            {getText("रीसेट लिंक आपके ईमेल पर भेजा जाएगा", "A reset link will be sent to your email")}
          </div>
        </CardContent>
      </Card>

      {/* Contact Us */}
      <Card className="spiritual-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Mail className="mr-2 h-5 w-5 text-secondary" />
            {getText("संपर्क करें", "Contact Us")}
          </CardTitle>

          <CardDescription>
            {getText(
              "हमें आपसे सुनना अच्छा लगेगा",
              "We would love to hear from you"
            )}
          </CardDescription>
        </CardHeader>

        <CardContent>

          <button
            type="button"
            onClick={() => setContactExpanded(!contactExpanded)}
            className="w-full flex items-center justify-between p-2 text-left rounded-lg"
          >
            <span className="font-medium">
              {getText("सामान्य सहायता", "General Support")}
            </span>

            <ChevronRight
              className={`h-4 w-4 transition-transform ${contactExpanded ? "rotate-90" : ""
                }`}
            />
          </button>


          {contactExpanded && (
            <div className="mt-4 space-y-2 text-sm pl-2">

              <div className="text-muted-foreground">
                {getText("ईमेल", "Email")}:
                <a
                  href="mailto:ambadnyatanay@gmail.com"
                  className="ml-2 text-primary hover:underline"
                >
                  ambadnyatanay@gmail.com
                </a>
              </div>

              <div className="text-muted-foreground">
                Tanay Sinh Mahajan<br></br>
                Shivajinagar Upasana Kendra<br></br>
                Pune
              </div>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
};