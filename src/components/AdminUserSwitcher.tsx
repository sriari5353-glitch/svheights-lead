import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/context/AuthContext";
import { getCachedSessions, switchToUser, cacheUserList, setHomeAdmin } from "@/lib/userSwitch";

interface SwitchableUser {
  id: string;
  username: string | null;
  full_name?: string | null;
  email: string;
  is_active?: boolean;
}

const initial = (u: SwitchableUser) =>
  (u.username || u.full_name || u.email || "U").charAt(0).toUpperCase();

const AdminUserSwitcher: React.FC<{ users: SwitchableUser[] }> = ({ users }) => {
  const { user, isAdmin } = useAuth();
  const [switching, setSwitching] = useState<string | null>(null);
  const cached = getCachedSessions();

  const active = users.filter((u) => u.is_active !== false);

  useEffect(() => {
    if (isAdmin && user) setHomeAdmin(user.id);
    if (active.length) cacheUserList(active);
  }, [isAdmin, user, users]);

  const handleSwitch = async (target: SwitchableUser) => {
    if (target.id === user?.id) return;
    setSwitching(target.id);
    const res = await switchToUser(target.id, { redirectTo: "/" });
    if (!res.ok) {
      toast(res.error || "Switch failed");
      setSwitching(null);
    }
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>Switch User</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((u) => {
            const isCurrent = u.id === user?.id;
            return (
              <Button
                key={u.id}
                variant={isCurrent ? "secondary" : "outline"}
                className="justify-start h-auto p-3"
                disabled={isCurrent || switching !== null}
                onClick={() => handleSwitch(u)}
              >
                <div className="flex items-center gap-2 w-full">
                  <Avatar className="h-7 w-7 flex-shrink-0">
                    <AvatarFallback className="text-xs">{initial(u)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-sm font-medium truncate">{u.username || u.email}</div>
                    <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                  </div>
                  {isCurrent ? (
                    <span className="text-[10px] text-primary font-medium">Active</span>
                  ) : switching === u.id ? (
                    <span className="text-[10px] text-muted-foreground">Switching…</span>
                  ) : cached[u.id] ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Signed in" />
                  ) : null}
                </div>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminUserSwitcher;
