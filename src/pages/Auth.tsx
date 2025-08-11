import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [loginUserId, setLoginUserId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSEO("Sign In | LeadMate CRM", "Login or create an account to access LeadMate CRM.");
  }, []);

  const validatePassword = (pwd: string) => /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(pwd);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let emailToUse = loginUserId.trim();
      if (!emailToUse.includes("@")) {
        const { data, error } = await supabase.rpc("get_email_by_username", { _username: emailToUse });
        if (error) throw error;
        if (!data) {
          toast("Invalid user ID or password");
          return;
        }
        emailToUse = data as string;
      }
      // Cleanup before login
      try { await supabase.auth.signOut({ scope: "global" as any }); } catch (_) {}
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: emailToUse, password: loginPassword });
      if (signInErr) {
        toast(signInErr.message || "Invalid credentials");
        return;
      }
      window.location.href = "/";
    } catch (err: any) {
      toast(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !userId.trim()) {
      toast("All fields are required");
      return;
    }
    if (!validatePassword(password)) {
      toast("Password must be 8+ chars with letters and numbers");
      return;
    }
    if (password !== confirm) {
      toast("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      // Ensure username is unique
      const { data: existing, error: rpcErr } = await supabase.rpc("get_email_by_username", { _username: userId.trim() });
      if (rpcErr) throw rpcErr;
      if (existing) {
        toast("User ID already taken");
        return;
      }
      const redirectUrl = `${window.location.origin}/`;
      const { error: signUpErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim(), username: userId.trim() },
          emailRedirectTo: redirectUrl,
        },
      });
      if (signUpErr) {
        toast(signUpErr.message || "Sign up failed");
        return;
      }
      toast("Sign up successful. Check your email to verify.");
    } catch (err: any) {
      toast(err.message || "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-center">Access LeadMate CRM</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-4">
              <form onSubmit={handleLogin} className="grid gap-3">
                <div className="grid gap-2">
                  <Label>User ID or Email</Label>
                  <Input value={loginUserId} onChange={(e) => setLoginUserId(e.target.value)} placeholder="your-userid or you@example.com" />
                </div>
                <div className="grid gap-2">
                  <Label>Password</Label>
                  <Input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
                </div>
                <div className="flex items-center justify-between pt-1 text-sm">
                  <a href="/auth/forgot" className="text-[hsl(var(--primary))]">Forgot password?</a>
                </div>
                <Button type="submit" variant="hero" disabled={loading}>
                  {loading ? "Please wait…" : "Login"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-4">
              <form onSubmit={handleSignUp} className="grid gap-3">
                <div className="grid gap-2">
                  <Label>Full Name</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>User ID (unique)</Label>
                  <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="choose a unique ID" />
                </div>
                <div className="grid gap-2">
                  <Label>Password</Label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 chars, letters & numbers" />
                </div>
                <div className="grid gap-2">
                  <Label>Confirm Password</Label>
                  <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                </div>
                <Button type="submit" variant="hero" disabled={loading}>
                  {loading ? "Creating account…" : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </main>
  );
};

export default AuthPage;
