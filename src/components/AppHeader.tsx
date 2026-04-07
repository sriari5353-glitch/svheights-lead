import React, { useEffect, useState } from "react";
import RoleSwitch from "@/components/RoleSwitch";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const AppHeader: React.FC = () => {
  const { user } = useAuth();
  const [brandName, setBrandName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("brand_name")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        setBrandName(data?.brand_name || null);
      });
  }, [user]);

  return (
    <header className="h-12 flex items-center justify-between px-4 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground truncate">
        {brandName || ""}
      </div>
      <RoleSwitch />
    </header>
  );
};

export default AppHeader;
