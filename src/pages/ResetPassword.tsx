import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [canReset, setCanReset] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Set New Password | LeadMate CRM";
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setCanReset(true);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setCanReset(true);
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  const validatePassword = (pwd: string) => /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(pwd);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast(error.message || "Failed to update password");
        return;
      }
      toast("Password updated. Please login again.");
      window.location.href = "/auth";
    } catch (err: any) {
      toast(err.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle>Set a new password</CardTitle>
        </CardHeader>
        <CardContent>
          {!canReset ? (
            <p className="text-sm text-muted-foreground">Verifying reset link…</p>
          ) : (
            <form onSubmit={onSubmit} className="grid gap-3">
              <div className="grid gap-2">
                <Label>New Password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 chars, letters & numbers" />
              </div>
              <div className="grid gap-2">
                <Label>Confirm Password</Label>
                <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              <Button type="submit" variant="hero" disabled={loading}>
                {loading ? "Updating…" : "Update password"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export default ResetPassword;
