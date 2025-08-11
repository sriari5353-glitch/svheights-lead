import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Forgot Password | LeadMate CRM";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Reset your LeadMate CRM password via email.");
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast("Enter your email");
      return;
    }
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/auth/reset`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (error) {
        toast(error.message || "Failed to send reset email");
        return;
      }
      toast("Check your inbox for the reset link");
    } catch (err: any) {
      toast(err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-3">
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <Button type="submit" variant="hero" disabled={loading}>
              {loading ? "Sending…" : "Send reset link"}
            </Button>
            <a href="/auth" className="text-sm text-[hsl(var(--primary))] text-center">Back to login</a>
          </form>
        </CardContent>
      </Card>
    </main>
  );
};

export default ForgotPassword;
