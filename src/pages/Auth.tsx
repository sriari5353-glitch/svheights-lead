import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

const setSEO = (title: string, desc: string) => {
  document.title = title;
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute("content", desc);
  const canonical = document.querySelector('link[rel="canonical"]') || document.createElement("link");
  canonical.setAttribute("rel", "canonical");
  canonical.setAttribute("href", window.location.href);
  if (!canonical.parentElement) document.head.appendChild(canonical);
};

const AuthPage: React.FC = () => {
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
      try {
        await supabase.auth.signOut({ scope: "global" as any });
      } catch (_) {}
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: emailToUse, password });
      if (signInErr) {
        toast(signInErr.message || "Invalid credentials");
        return;
      }
      // Check role and redirect accordingly
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id;
      if (uid) {
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid);
        const isAdmin = Boolean(roles?.some((r: any) => r.role === "admin"));
        window.location.href = isAdmin ? "/admin" : "/";
      } else {
        window.location.href = "/";
      }
    } catch (err: any) {
      toast(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-center">Sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="grid gap-3">
            <div className="grid gap-2">
              <Label>Username</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="your-username" />
            </div>
            <div className="grid gap-2">
              <Label>Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" variant="hero" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
};

export default AuthPage;
