
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";

const TempAdminReset: React.FC = () => {
  const [email, setEmail] = useState("sriari5353@gmail.com");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const resetPassword = async () => {
    if (!newPassword.trim()) {
      toast("Enter a new password");
      return;
    }
    
    setLoading(true);
    try {
      // First, let's try to get the user by email to find their ID
      const response = await fetch(`https://xdbpsekyyifjrvarqwqj.supabase.co/functions/v1/admin-users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkYnBzZWt5eWlmanJ2YXJxd3FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3MTY5MDYsImV4cCI6MjA3MDI5MjkwNn0.6fPkXgZ5QxsIRP5PAryye8YocF9LTP9OgTd_UAp1qqM`
        },
        body: JSON.stringify({ action: "list" })
      });

      const data = await response.json();
      
      if (data.error) {
        toast(`Error: ${data.error}`);
        return;
      }

      // Find the user by email
      const user = data.users?.find((u: any) => u.email === email);
      if (!user) {
        toast("User not found");
        return;
      }

      // Now reset the password
      const resetResponse = await fetch(`https://xdbpsekyyifjrvarqwqj.supabase.co/functions/v1/admin-users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkYnBzZWt5eWlmanJ2YXJxd3FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3MTY5MDYsImV4cCI6MjA3MDI5MjkwNn0.6fPkXgZ5QxsIRP5PAryye8YocF9LTP9OgTd_UAp1qqM`
        },
        body: JSON.stringify({ 
          action: "reset_password", 
          user_id: user.id, 
          password: newPassword 
        })
      });

      const resetData = await resetResponse.json();
      
      if (resetData.error) {
        toast(`Error: ${resetData.error}`);
        return;
      }

      toast("Password reset successfully! You can now log in.");
      setNewPassword("");
      
      // Redirect to login after success
      setTimeout(() => {
        window.location.href = "/auth";
      }, 2000);

    } catch (err: any) {
      toast(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-red-600">⚠️ Emergency Admin Access</CardTitle>
          <p className="text-sm text-muted-foreground text-center">
            This is a temporary password reset tool. Remove this page after regaining access.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label>Admin Email</Label>
              <Input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                disabled
              />
            </div>
            <div className="grid gap-2">
              <Label>New Password</Label>
              <Input 
                type="password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                placeholder="Enter new password"
              />
            </div>
            <Button 
              onClick={resetPassword} 
              disabled={loading} 
              variant="destructive"
            >
              {loading ? "Resetting..." : "Reset Admin Password"}
            </Button>
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-xs text-yellow-800">
                <strong>Security Notice:</strong> This page should be removed immediately after regaining access.
                It bypasses normal security checks and should not remain in production.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
};

export default TempAdminReset;
