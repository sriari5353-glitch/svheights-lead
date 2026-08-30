import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { cacheSession, setHomeAdmin, clearAllCachedSessions } from "@/lib/userSwitch";


interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  rolesLoaded: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const cleanupAuthState = () => {
  try {
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith("supabase.auth.") || key.includes("sb-")) {
        sessionStorage.removeItem(key);
      }
    });
  } catch (_) {
    // ignore
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rolesLoaded, setRolesLoaded] = useState(false);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        cacheSession(s.user.id, s.access_token, s.refresh_token);
        setRolesLoaded(false);
        setTimeout(async () => {
          const { data } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", s.user.id);
          const admin = Boolean(data?.some((r) => r.role === "admin"));
          setIsAdmin(admin);
          if (admin) setHomeAdmin(s.user.id);


          const { data: profile } = await supabase
            .from("profiles")
            .select("is_active")
            .eq("id", s.user.id)
            .maybeSingle();
          if (profile && profile.is_active === false) {
            try { await supabase.auth.signOut({ scope: "global" as any }); } catch (_) {}
            cleanupAuthState();
            setUser(null);
            setSession(null);
            setIsAdmin(false);
          }
          setRolesLoaded(true);
        }, 0);
      } else {
        setIsAdmin(false);
        setRolesLoaded(true);
      }
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
        setLoading(false);
      }
      if (event === "PASSWORD_RECOVERY") {
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (!data.session?.user) setRolesLoaded(true);
      setLoading(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      cleanupAuthState();
      try { await supabase.auth.signOut({ scope: "global" as any }); } catch (_) {}
      window.location.href = "/auth";
    } catch (_) {
      window.location.href = "/auth";
    }
  };

  const value = useMemo(
    () => ({ user, session, loading, isAdmin, rolesLoaded, signOut }),
    [user, session, loading, isAdmin, rolesLoaded]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
