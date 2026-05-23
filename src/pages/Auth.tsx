import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, User } from "lucide-react";

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isRecovery, setIsRecovery] = useState(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const searchParams = new URLSearchParams(window.location.search);
    const type = hashParams.get("type") || searchParams.get("type");
    const hasAccessToken = hashParams.get("access_token") || searchParams.get("access_token");
    return type === "recovery" || !!hasAccessToken;
  });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: ""
  });
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    displayName: ""
  });
  const { signIn, signUp, resetPassword, updatePassword, user, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  useEffect(() => {
    const hashParams = new URLSearchParams(location.hash.replace(/^#/, ""));
    const searchParams = new URLSearchParams(location.search);
    const type = hashParams.get("type") || searchParams.get("type");
    const hasAccessToken = hashParams.get("access_token") || searchParams.get("access_token");
    const isRecoveryLink = type === "recovery" || !!hasAccessToken;

    if (isRecoveryLink) {
      setIsRecovery(true);
    }
  }, [location.hash, location.search]);

  // Redirect already-authenticated users away from auth page
  // Exception: password recovery flow — user may be logged in via the recovery token
  useEffect(() => {
    if (!loading && user && !isRecovery) {
      navigate("/", { replace: true });
    }
  }, [user, loading, isRecovery, navigate]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Show spinner while auth state is loading to prevent form flash before redirect
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-spiritual flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      toast({
        title: "ईमेल आवश्यक है / Email Required",
        description: "कृपया अपना ईमेल दर्ज करें / Please enter your email",
        variant: "destructive",
      });
      return;
    }

    setIsResetting(true);
    const { error } = await resetPassword(formData.email);

    if (error) {
      toast({
        title: "रीसेट में त्रुटि / Reset Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "रीसेट लिंक भेजा गया / Reset Link Sent",
        description: "कृपया अपना ईमेल जांचें / Please check your email",
      });
    }

    setIsResetting(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordData.newPassword || passwordData.newPassword.length < 6) {
      toast({
        title: "पासवर्ड छोटा है / Password too short",
        description: "कम से कम 6 अक्षर होने चाहिए / Must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "पासवर्ड मेल नहीं खाते / Passwords do not match",
        description: "कृपया फिर से जांचें / Please check again",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingPassword(true);
    const { error } = await updatePassword(passwordData.newPassword);

    if (error) {
      toast({
        title: "अपडेट में त्रुटि / Update Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "पासवर्ड अपडेट हो गया / Password Updated",
        description: "अब आप लॉगिन कर सकते हैं / You can log in now",
      });
      setPasswordData({ newPassword: "", confirmPassword: "" });
      setIsRecovery(false);
      window.location.hash = "";
      navigate("/", { replace: true });
    }

    setIsUpdatingPassword(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(formData.email, formData.password);
    
    if (error) {
      toast({
        title: "प्रवेश में त्रुटि / Login Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "स्वागत है / Welcome!",
        description: "सफलतापूर्वक प्रवेश हो गया / Successfully logged in",
      });
      navigate("/");
    }
    
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signUp(formData.email, formData.password, formData.displayName);
    
    if (error) {
      toast({
        title: "पंजीकरण में त्रुटि / Registration Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "पंजीकरण सफल / Registration Successful!",
        description: "कृपया अपना ईमेल जांचें / Please check your email to verify your account",
      });
      navigate("/");
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-spiritual flex items-center justify-center p-4">
      {/* Om background pattern */}
      <div className="mandala-bg fixed inset-0 opacity-5 pointer-events-none" />
      
      <Card className="w-full max-w-md relative z-10 bg-background/95 backdrop-blur-sm border-primary/20">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-4xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent om-symbol">
            गणक
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isRecovery ? (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="text-center text-sm text-muted-foreground">
                पासवर्ड रीसेट करें / Reset your password
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">नया पासवर्ड / New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="new-password"
                    name="newPassword"
                    type="password"
                    placeholder="••••••••"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    className="pl-10"
                    minLength={6}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">पासवर्ड पुष्टि / Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    className="pl-10"
                    minLength={6}
                    required
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isUpdatingPassword}
              >
                {isUpdatingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                पासवर्ड अपडेट करें / Update Password
              </Button>
              <Button
                type="button"
                variant="link"
                onClick={() => {
                  setIsRecovery(false);
                  window.history.replaceState({}, document.title, "/auth");
                }}
                className="w-full text-sm text-muted-foreground"
              >
                लॉगिन पर वापस जाएं / Back to login
              </Button>
            </form>
          ) : (
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">प्रवेश / Login</TabsTrigger>
                <TabsTrigger value="signup">पंजीकरण / Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">ईमेल / Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signin-email"
                        name="email"
                        type="email"
                        placeholder="your.email@example.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">पासवर्ड / Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signin-password"
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    onClick={handleForgotPassword}
                    className="px-0 text-sm text-muted-foreground"
                    disabled={isResetting}
                  >
                    {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    पासवर्ड भूल गए? / Forgot password?
                  </Button>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    प्रवेश / Sign In
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">नाम / Display Name (Optional)</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-name"
                        name="displayName"
                        type="text"
                        placeholder="Your Name"
                        value={formData.displayName}
                        onChange={handleInputChange}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">ईमेल / Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        name="email"
                        type="email"
                        placeholder="your.email@example.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">पासवर्ड / Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="pl-10"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    पंजीकरण / Sign Up
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;