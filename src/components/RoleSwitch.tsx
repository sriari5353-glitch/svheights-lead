import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface UserProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string;
}

const RoleSwitch: React.FC = () => {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

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
  
  // Get the first letter of username, full_name, or email
  const getInitial = (profile: UserProfile) => {
    if (profile.username) return profile.username.charAt(0).toUpperCase();
    if (profile.full_name) return profile.full_name.charAt(0).toUpperCase();
    return profile.email.charAt(0).toUpperCase();
  };

  const label = currentProfile ? getInitial(currentProfile) : "U";

  const handleSwitchUser = async (targetUser: UserProfile) => {
    // Navigate to auth page with user switching
    navigate("/auth");
    setShowUserMenu(false);
  };

  const onClick = () => {
    // Show user menu for everyone, not just admins
    setShowUserMenu(!showUserMenu);
  };

  return (
    <Popover open={showUserMenu} onOpenChange={setShowUserMenu}>
      <PopoverTrigger asChild>
        <button
          onClick={onClick}
          aria-label="Switch user or view"
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
            <div className="text-sm font-medium text-foreground">Current User</div>
            <div className="flex items-center gap-2 mt-1">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">{label}</AvatarFallback>
              </Avatar>
              <div className="text-sm text-muted-foreground">
                {currentProfile?.username || currentProfile?.email || 'Unknown'}
              </div>
            </div>
          </div>

          {/* Admin View Toggle */}
          {isAdmin && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-foreground">Admin Controls</div>
              <Button
                variant={isAdminView ? "default" : "outline"}
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  navigate(isAdminView ? "/" : "/admin");
                  setShowUserMenu(false);
                }}
              >
                {isAdminView ? "Switch to User View" : "Switch to Admin View"}
              </Button>
            </div>
          )}
          
          {/* User Switching */}
          <div className="space-y-1">
            <div className="text-xs font-medium text-foreground">Switch User</div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {users.map((userProfile) => (
                <Button
                  key={userProfile.id}
                  variant={userProfile.id === user?.id ? "secondary" : "ghost"}
                  size="sm"
                  className="w-full justify-start text-left p-2 h-auto"
                  onClick={() => handleSwitchUser(userProfile)}
                >
                  <div className="flex items-center gap-3 w-full">
                    <Avatar className="h-7 w-7 flex-shrink-0">
                      <AvatarFallback className="text-xs">
                        {getInitial(userProfile)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {userProfile.username || 'No username'}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {userProfile.full_name || userProfile.email}
                      </div>
                    </div>
                    {userProfile.id === user?.id && (
                      <div className="text-xs text-primary font-medium flex-shrink-0">
                        Current
                      </div>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Sign Out */}
          <div className="pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                navigate("/auth");
                setShowUserMenu(false);
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
