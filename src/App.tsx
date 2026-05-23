import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { JapaProvider } from "@/contexts/JapaContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { App as CapApp } from "@capacitor/app";
import { supabase } from "@/integrations/supabase/client";

const queryClient = new QueryClient();

const DeepLinkHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;
      if (url.includes("access_token") || url.includes("refresh_token")) {
        // Prevent processing the same link multiple times (e.g. from cached launch url)
        const storageKey = `consumed_url_${url}`;
        if (localStorage.getItem(storageKey)) {
          return;
        }
        localStorage.setItem(storageKey, "true");

        try {
          // Normalize url scheme for standard URL parsing
          const normalized = url.replace(/^[a-zA-Z0-9]+:\/\//, "https://");
          const urlObj = new URL(normalized);
          const hash = urlObj.hash.substring(1);
          const params = new URLSearchParams(hash);
          
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");
          
          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            
            if (!error) {
              navigate(`/auth#${hash}`);
            }
          }
        } catch (e) {
          console.error("Deep link handling error:", e);
        }
      }
    };

    const listener = CapApp.addListener("appUrlOpen", handleDeepLink);

    // Handle cold launch deep links
    CapApp.getLaunchUrl().then((launchUrl) => {
      if (launchUrl) {
        handleDeepLink({ url: launchUrl.url });
      }
    });

    return () => {
      listener.then((l) => l.remove());
    };
  }, [navigate]);

  return null;
};

const App = () => {
  useEffect(() => {
    const blockEvent = (event: Event) => {
      event.preventDefault();
    };

    document.addEventListener("copy", blockEvent);
    document.addEventListener("cut", blockEvent);
    document.addEventListener("paste", blockEvent);
    document.addEventListener("contextmenu", blockEvent);
    document.addEventListener("dragstart", blockEvent);

    return () => {
      document.removeEventListener("copy", blockEvent);
      document.removeEventListener("cut", blockEvent);
      document.removeEventListener("paste", blockEvent);
      document.removeEventListener("contextmenu", blockEvent);
      document.removeEventListener("dragstart", blockEvent);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <JapaProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <DeepLinkHandler />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </JapaProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
