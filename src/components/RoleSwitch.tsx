import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const RoleSwitch: React.FC = () => {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const isAdminView = location.pathname.startsWith("/admin");
  const label = isAdmin && isAdminView ? "A" : "U";

  const onClick = () => {
    if (!isAdmin) return; // normal users cannot switch
    navigate(isAdminView ? "/" : "/admin");
  };

  return (
    <button
      onClick={onClick}
      aria-label={isAdmin ? (isAdminView ? "Switch to User view" : "Switch to Admin view") : "User view"}
      aria-disabled={!isAdmin}
      className="rounded-full p-0.5 border bg-background hover:bg-accent transition-colors disabled:opacity-60"
      disabled={!isAdmin}
    >
      <Avatar className="h-9 w-9">
        <AvatarFallback className="font-semibold">{label}</AvatarFallback>
      </Avatar>
    </button>
  );
};

export default RoleSwitch;
