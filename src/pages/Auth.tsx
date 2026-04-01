import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith("supabase.auth.") || key.includes("sb-")) {
        sessionStorage.removeItem(key);
      }
    });
  } catch (_) {
    // ignore
  }
};

interface UserProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string;
}

const AuthPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    setSEO("Sign In | LeadMate CRM", "Sign in with your username and password to access LeadMate CRM.");
    // Only fetch all users if current user is admin
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    // Double-check admin status before fetching
    if (!isAdmin) {
      return;
    }
    
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, email")
        .eq("is_active", true)
        .order("username");
      
      if (error) {
        console.error("Error fetching users:", error);
        return;
      }
      
      setUsers(data || []);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleUserSelect = (selectedUserId: string) => {
    const selectedUser = users.find(u => u.id === selectedUserId);
    if (selectedUser) {
      setUsername(selectedUser.username || selectedUser.email);
    }
  };

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
            {/* User Selection Dropdown - Only show for admins */}
            {isAdmin && users.length > 0 && (
              <div className="grid gap-2">
                <Label>Quick User Selection</Label>
                <Select onValueChange={handleUserSelect} disabled={loadingUsers}>
                  <SelectTrigger className="bg-background border border-input">
                    <SelectValue placeholder={loadingUsers ? "Loading users..." : "Select a user to auto-fill"} />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-input z-50 shadow-lg">
                    {users.map((user) => (
                      <SelectItem 
                        key={user.id} 
                        value={user.id}
                        className="bg-background hover:bg-muted cursor-pointer"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {user.username || user.email}
                          </span>
                          {user.full_name && (
                            <span className="text-sm text-muted-foreground">
                              {user.full_name}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Manual Username Input */}
            <div className="grid gap-2">
              <Label>Username</Label>
              <Input 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                placeholder="your-username or email" 
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
