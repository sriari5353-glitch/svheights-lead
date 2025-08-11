import React from "react";
import RoleSwitch from "@/components/RoleSwitch";

const AppHeader: React.FC = () => {
  return (
    <header className="h-12 flex items-center justify-end px-4 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <RoleSwitch />
    </header>
  );
};

export default AppHeader;
