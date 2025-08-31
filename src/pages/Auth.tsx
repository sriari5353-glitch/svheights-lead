import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const setSEO = (title: string, desc: string) => {
  document.title = title;
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute("content", desc);
  const canonical = document.querySelector('link[rel="canonical"]') || document.createElement("link");
  canonical.setAttribute("rel", "canonical");
  canonical.setAttribute("href", window.location.href);
  if (!canonical.parentElement) document.head.appendChild(canonical);
};

const cleanupAuthState = () => {
  try {
    // Remove standard auth tokens and any sb- keys
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("supabase.auth.") || key.includes("sb-")) {
        localStorage.removeItem(key);
      }
    });
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith("supabase.auth.") || key.includes("sb-")) {
        sessionStorage.removeItem(key);
      }
    });
  } catch (_) {
    // ignore
  }
};

const AuthPage: React.FC = () => {
  const { user } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSEO("Sign In | LeadMate CRM", "Sign in with your username and password to access LeadMate CRM.");
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Clean up existing auth state FIRST
      cleanupAuthState();
      
      const id = username.trim();
      if (!id) {
        toast("Enter your username");
        return;
      }
      
      let emailToUse = id;
      if (!emailToUse.includes("@")) {
        const { data, error } = await supabase.rpc("get_email_by_username", { _username: emailToUse });
        if (error) throw error;
        if (!data) {
          toast("Invalid username or password");
          return;
        }
        emailToUse = data as string;
      }
      
      // Force sign out to clear any existing session
      try {
        await supabase.auth.signOut({ scope: "global" as any });
      } catch (_) {
        // Continue even if this fails
      }
      
      // Wait a moment for cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const { error: signInErr } = await supabase.auth.signInWithPassword({ 
        email: emailToUse, 
        password 
      });
      
      if (signInErr) {
        toast(signInErr.message || "Invalid credentials");
        return;
      }
      
      // Force page reload for a clean state
      window.location.href = "/";
      
    } catch (err: any) {
      toast(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchUser = async () => {
    setLoading(true);
    try {
      // Clean up auth state
      cleanupAuthState();
      
      // Force sign out
      try {
        await supabase.auth.signOut({ scope: "global" as any });
      } catch (_) {
        // Continue even if this fails
      }
      
      // Clear form
      setUsername("");
      setPassword("");
      
      // Force page reload
      window.location.href = "/auth";
      
    } catch (err: any) {
      toast("Error switching user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-center">
            {user ? "Switch User" : "Sign in"}
          </CardTitle>
          {user && (
            <div className="text-center text-sm text-muted-foreground">
              Currently signed in as: <strong>{user.email}</strong>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="grid gap-3">
            <div className="grid gap-2">
              <Label>Username</Label>
              <Input 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                placeholder="your-username" 
              />
            </div>
            <div className="grid gap-2">
              <Label>Password</Label>
              <Input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
              />
            </div>
            <Button type="submit" variant="hero" disabled={loading}>
              {loading ? "Signing in…" : user ? "Switch to this user" : "Sign in"}
            </Button>
          </form>
          
          {user && (
            <div className="mt-4 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={handleSwitchUser}
                disabled={loading}
                className="w-full"
              >
                {loading ? "Signing out..." : "Sign out & clear session"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export default AuthPage;
