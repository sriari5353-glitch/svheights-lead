import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import {
  getCachedSessions,
  getCachedUserList,
  cacheUserList,
  getHomeAdmin,
  switchToUser,
  switchBackToAdmin,
  type SwitchableProfile,
} from "@/lib/userSwitch";

const RoleSwitch: React.FC = () => {
  const { isAdmin, user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [users, setUsers] = useState<SwitchableProfile[]>(getCachedUserList());
  const [currentProfile, setCurrentProfile] = useState<SwitchableProfile | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [switching, setSwitching] = useState(false);

  const homeAdminId = getHomeAdmin();
  const canSwitch = isAdmin || Boolean(homeAdminId);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, full_name, email")
        .eq("id", user.id)
        .maybeSingle();
      if (data) setCurrentProfile(data as SwitchableProfile);
    };
    load();
  }, [user]);

  useEffect(() => {
    if (!user || !isAdmin) return;
    const loadUsers = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, full_name, email, is_active")
        .eq("is_active", true)
        .order("username");
      if (data) {
        setUsers(data as SwitchableProfile[]);
        cacheUserList(data as SwitchableProfile[]);
      }
    };
    loadUsers();
  }, [user, isAdmin]);

  if (!user) return null;

  const isAdminView = location.pathname.startsWith("/admin");

  const getInitial = (profile: SwitchableProfile) => {
    if (profile.username) return profile.username.charAt(0).toUpperCase();
    if (profile.full_name) return profile.full_name.charAt(0).toUpperCase();
    return profile.email.charAt(0).toUpperCase();
  };

  const label = currentProfile ? getInitial(currentProfile) : "U";
  const cachedSessions = getCachedSessions();

  const handleSelectUser = async (targetUser: SwitchableProfile) => {
    if (targetUser.id === user.id) return;
    setSwitching(true);
    setShowMenu(false);
    const res = await switchToUser(targetUser.id, { redirectTo: "/" });
    if (!res.ok) {
      toast(res.error || "Switch failed");
      setSwitching(false);
    }
  };

  const handleBackToAdmin = async () => {
    setSwitching(true);
    setShowMenu(false);
    const res = await switchBackToAdmin("/admin");
    if (!res.ok) {
      toast(res.error || "Switch failed");
      setSwitching(false);
    }
  };

  const handleSignOut = () => {
    signOut();
    setShowMenu(false);
  };

  return (
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

          {/* Back to admin when impersonating */}
          {!isAdmin && homeAdminId && homeAdminId !== user.id && (
            <Button
              variant="default"
              size="sm"
              className="w-full justify-start"
              disabled={switching}
              onClick={handleBackToAdmin}
            >
              Back to Admin
            </Button>
          )}

          {/* User list for switching */}
          {canSwitch && users.length > 0 && (
            <div className="border-b border-border pb-2">
              <div className="text-xs font-medium text-muted-foreground mb-1">Switch User</div>
              <div className="max-h-52 overflow-y-auto space-y-0.5">
                {users.map((u) => {
                  const isCurrent = u.id === user.id;
                  const hasCached = !!cachedSessions[u.id];
                  return (
                    <Button
                      key={u.id}
                      variant={isCurrent ? "secondary" : "ghost"}
                      size="sm"
                      className="w-full justify-start text-left p-2 h-auto"
                      onClick={() => handleSelectUser(u)}
                      disabled={isCurrent || switching}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <Avatar className="h-6 w-6 flex-shrink-0">
                          <AvatarFallback className="text-xs">{getInitial(u)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-xs truncate">
                            {u.username || u.email}
                          </div>
                        </div>
                        {isCurrent ? (
                          <div className="text-[10px] text-primary font-medium flex-shrink-0">
                            Active
                          </div>
                        ) : hasCached ? (
                          <div
                            className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0"
                            title="Signed in"
                          />
                        ) : null}
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const target = isAdminView ? "/" : "/admin";
                setShowMenu(false);
                navigate(target);
              }}
            >
              {isAdminView ? "Switch to User View" : "Switch to Admin View"}
            </Button>
          )}

          {/* Sign Out */}
          <div className="pt-2 border-t border-border">
            <Button variant="outline" size="sm" className="w-full" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default RoleSwitch;
