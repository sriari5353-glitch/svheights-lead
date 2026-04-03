import React, { useEffect, useState } from "react";
import RoleSwitch from "@/components/RoleSwitch";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const AppHeader: React.FC = () => {
  const { user, viewingUserId, isAdmin } = useAuth();
  const [brandName, setBrandName] = useState<string | null>(null);
  const [viewingName, setViewingName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const targetId = isAdmin && viewingUserId ? viewingUserId : user.id;
    supabase
      .from("profiles")
      .select("brand_name, username")
      .eq("id", targetId)
      .single()
      .then(({ data }) => {
        if (data?.brand_name) setBrandName(data.brand_name);
        else setBrandName(null);
        if (isAdmin && viewingUserId && viewingUserId !== user.id) {
          setViewingName(data?.username || "User");
        } else {
          setViewingName(null);
        }
      });
  }, [user, viewingUserId, isAdmin]);

  return (
    <header className="h-12 flex items-center justify-between px-4 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground truncate">
        {brandName || ""}
        {viewingName && (
          <span className="text-xs font-normal text-muted-foreground ml-1">
            (viewing {viewingName})
          </span>
        )}
      </div>
      <RoleSwitch />
    </header>
  );
};

export default AppHeader;
