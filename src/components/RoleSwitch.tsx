import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";

interface UserProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string;
}

const RoleSwitch: React.FC = () => {
  const { isAdmin, user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [switchTarget, setSwitchTarget] = useState<UserProfile | null>(null);
  const [password, setPassword] = useState("");
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCurrentProfile();
      fetchUsers();
    }
  }, [user]);

  const fetchCurrentProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, username, full_name, email")
      .eq("id", user.id)
      .single();
    if (data) setCurrentProfile(data);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, full_name, email")
      .eq("is_active", true)
      .order("username");
    if (data) setUsers(data);
  };

  if (!user) return null;

  const isAdminView = location.pathname.startsWith("/admin");

  const getInitial = (profile: UserProfile) => {
    if (profile.username) return profile.username.charAt(0).toUpperCase();
    if (profile.full_name) return profile.full_name.charAt(0).toUpperCase();
    return profile.email.charAt(0).toUpperCase();
  };

  const label = currentProfile ? getInitial(currentProfile) : "U";

  const handleSelectUser = (targetUser: UserProfile) => {
    if (targetUser.id === user.id) return; // already logged in as this user
    setSwitchTarget(targetUser);
    setPassword("");
    setShowMenu(false);
  };

  const handleSwitchConfirm = async () => {
    if (!switchTarget || !password) return;
    setSwitching(true);
    try {
      // Look up the email for the target user
      const emailToUse = switchTarget.email;

      // Sign out current session
      try {
        await supabase.auth.signOut({ scope: "global" as any });
      } catch (_) {}

      await new Promise((r) => setTimeout(r, 100));

      const { error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password,
      });

      if (error) {
        toast("Invalid password");
        // Re-sign in as original user failed, reload to auth
        return;
      }

      setSwitchTarget(null);
      setPassword("");
      window.location.href = "/";
    } catch (err: any) {
      toast(err.message || "Switch failed");
    } finally {
      setSwitching(false);
    }
  };

  return (
    <>
      <Popover open={showMenu} onOpenChange={setShowMenu}>
        <PopoverTrigger asChild>
          <button
            aria-label="User menu"
            className="rounded-full p-0.5 border bg-background hover:bg-accent transition-colors"
          >
            <Avatar className="h-9 w-9">
              <AvatarFallback className="font-semibold">{label}</AvatarFallback>
            </Avatar>
          </button>
        </PopoverTrigger>

        <PopoverContent
          className="w-72 p-3 bg-background border border-border shadow-lg z-50"
          align="end"
          sideOffset={5}
        >
          <div className="space-y-2">
            {/* Current User Info */}
            <div className="pb-2 border-b border-border">
              <div className="text-sm font-medium text-foreground">Logged in as</div>
              <div className="flex items-center gap-2 mt-1">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">{label}</AvatarFallback>
                </Avatar>
                <div className="text-sm text-muted-foreground truncate">
                  {currentProfile?.username || currentProfile?.email || "Unknown"}
                </div>
              </div>
            </div>

            {/* User list for switching */}
            {users.length > 0 && (
              <div className="border-b border-border pb-2">
                <div className="text-xs font-medium text-muted-foreground mb-1">Switch User</div>
                <div className="max-h-52 overflow-y-auto space-y-0.5">
                  {users.map((u) => {
                    const isCurrent = u.id === user?.id;
                    return (
                      <Button
                        key={u.id}
                        variant={isCurrent ? "secondary" : "ghost"}
                        size="sm"
                        className="w-full justify-start text-left p-2 h-auto"
                        onClick={() => handleSelectUser(u)}
                        disabled={isCurrent}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <Avatar className="h-6 w-6 flex-shrink-0">
                            <AvatarFallback className="text-xs">
                              {getInitial(u)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-xs truncate">
                              {u.username || "No username"}
                            </div>
                          </div>
                          {isCurrent && (
                            <div className="text-[10px] text-primary font-medium flex-shrink-0">
                              Active
                            </div>
                          )}
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Admin view toggle - only for admins */}
            {isAdmin && (
              <Button
                variant={isAdminView ? "default" : "outline"}
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  navigate(isAdminView ? "/" : "/admin");
                  setShowMenu(false);
                }}
              >
                {isAdminView ? "Switch to User View" : "Switch to Admin View"}
              </Button>
            )}

            {/* Sign Out */}
            <div className="pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  signOut();
                  setShowMenu(false);
                }}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Password dialog for switching users */}
      <Dialog open={!!switchTarget} onOpenChange={(open) => !open && setSwitchTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Switch to {switchTarget?.username || switchTarget?.email}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSwitchConfirm();
            }}
            className="grid gap-3"
          >
            <div className="grid gap-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoFocus
              />
            </div>
            <Button type="submit" disabled={switching || !password}>
              {switching ? "Switching…" : "Switch User"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RoleSwitch;
