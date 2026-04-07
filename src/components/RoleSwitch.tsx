import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

interface UserProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string;
}

const RoleSwitch: React.FC = () => {
  const { isAdmin, user, viewingUserId, setViewingUserId, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [viewingProfile, setViewingProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (user) {
      fetchCurrentProfile();
      if (isAdmin) fetchUsers();
    }
  }, [user, isAdmin]);

  // When viewingUserId changes, find the profile
  useEffect(() => {
    if (viewingUserId && users.length > 0) {
      const p = users.find((u) => u.id === viewingUserId);
      setViewingProfile(p || null);
    } else {
      setViewingProfile(null);
    }
  }, [viewingUserId, users]);

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

  const displayProfile = viewingProfile || currentProfile;
  const label = displayProfile ? getInitial(displayProfile) : "U";

  const handleSelectUser = (targetUser: UserProfile) => {
    if (targetUser.id === user.id) {
      setViewingUserId(null);
    } else {
      setViewingUserId(targetUser.id);
    }
    setShowUserDialog(false);
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
          {/* Current / Viewing User Info */}
          <div className="pb-2 border-b border-border">
            <div className="text-sm font-medium text-foreground">
              {viewingProfile ? "Viewing as" : "Logged in as"}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">{label}</AvatarFallback>
              </Avatar>
              <div className="text-sm text-muted-foreground truncate">
                {displayProfile?.username || displayProfile?.email || "Unknown"}
              </div>
            </div>
            {viewingProfile && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-1 text-xs"
                onClick={() => {
                  setViewingUserId(null);
                  setShowMenu(false);
                }}
              >
                Back to my data
              </Button>
            )}
          </div>

          {/* Admin: inline user list for quick switching */}
          {isAdmin && users.length > 0 && (
            <div className="border-b border-border pb-2">
              <div className="text-xs font-medium text-muted-foreground mb-1">Switch User</div>
              <div className="max-h-52 overflow-y-auto space-y-0.5">
                {users.map((u) => {
                  const isViewing =
                    (viewingUserId && u.id === viewingUserId) ||
                    (!viewingUserId && u.id === user?.id);
                  return (
                    <Button
                      key={u.id}
                      variant={isViewing ? "secondary" : "ghost"}
                      size="sm"
                      className="w-full justify-start text-left p-2 h-auto"
                      onClick={() => handleSelectUser(u)}
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
                        {isViewing && (
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

          {/* Admin view toggle */}
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
  );
};

export default RoleSwitch;
