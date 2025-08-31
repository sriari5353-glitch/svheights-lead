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
    if (isAdmin) {
      // If admin, show user menu for switching
      setShowUserMenu(!showUserMenu);
    } else {
      // Regular users just navigate to auth
      navigate("/auth");
    }
  };

  return (
    <Popover open={showUserMenu} onOpenChange={setShowUserMenu}>
      <PopoverTrigger asChild>
        <button
          onClick={onClick}
          aria-label={isAdmin ? "Switch user or view" : "Switch user"}
          className="rounded-full p-0.5 border bg-background hover:bg-accent transition-colors"
        >
          <Avatar className="h-9 w-9">
            <AvatarFallback className="font-semibold">{label}</AvatarFallback>
          </Avatar>
        </button>
      </PopoverTrigger>
      
      {isAdmin && (
        <PopoverContent className="w-64 p-2" align="end">
          <div className="space-y-1">
            {isAdminView && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  navigate("/");
                  setShowUserMenu(false);
                }}
              >
                Switch to User View
              </Button>
            )}
            
            {!isAdminView && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  navigate("/admin");
                  setShowUserMenu(false);
                }}
              >
                Switch to Admin View
              </Button>
            )}
            
            <div className="border-t pt-1 mt-1">
              <div className="text-xs text-muted-foreground px-2 py-1">Switch User:</div>
              {users.map((userProfile) => (
                <Button
                  key={userProfile.id}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => handleSwitchUser(userProfile)}
                >
                  <Avatar className="h-5 w-5 mr-2">
                    <AvatarFallback className="text-xs">
                      {getInitial(userProfile)}
                    </AvatarFallback>
                  </Avatar>
                  {userProfile.username || userProfile.email}
                  {userProfile.id === user?.id && (
                    <span className="ml-auto text-xs text-primary">current</span>
                  )}
                </Button>
              ))}
            </div>
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
};

export default RoleSwitch;
