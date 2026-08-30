import { supabase } from "@/integrations/supabase/client";

export const SESSION_CACHE_KEY = "cached_user_sessions";
export const HOME_ADMIN_KEY = "home_admin_user_id";
export const USER_LIST_CACHE_KEY = "cached_user_list";

type CachedSession = { access_token: string; refresh_token: string };

export interface SwitchableProfile {
  id: string;
  username: string | null;
  full_name?: string | null;
  email: string;
  is_active?: boolean;
}

export const getCachedSessions = (): Record<string, CachedSession> => {
  try {
    const raw = sessionStorage.getItem(SESSION_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const cacheSession = (userId: string, access_token: string, refresh_token: string) => {
  const sessions = getCachedSessions();
  sessions[userId] = { access_token, refresh_token };
  sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(sessions));
};

export const getHomeAdmin = (): string | null => {
  try {
    return sessionStorage.getItem(HOME_ADMIN_KEY);
  } catch {
    return null;
  }
};

export const setHomeAdmin = (userId: string) => {
  try {
    sessionStorage.setItem(HOME_ADMIN_KEY, userId);
  } catch {
    // ignore
  }
};

export const clearHomeAdmin = () => {
  try {
    sessionStorage.removeItem(HOME_ADMIN_KEY);
  } catch {
    // ignore
  }
};

/** Cached list of switchable profiles, captured while an admin session is active. */
export const getCachedUserList = (): SwitchableProfile[] => {
  try {
    const raw = sessionStorage.getItem(USER_LIST_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const cacheUserList = (users: SwitchableProfile[]) => {
  try {
    sessionStorage.setItem(USER_LIST_CACHE_KEY, JSON.stringify(users));
  } catch {
    // ignore
  }
};

export const clearAllCachedSessions = () => {
  sessionStorage.removeItem(SESSION_CACHE_KEY);
  sessionStorage.removeItem(USER_LIST_CACHE_KEY);
  clearHomeAdmin();
};

const applyCachedSession = async (cached: CachedSession) => {
  const { data, error } = await supabase.auth.setSession({
    access_token: cached.access_token,
    refresh_token: cached.refresh_token,
  });
  return { session: data?.session ?? null, error };
};

/**
 * Switch into another user's account without a password prompt.
 * Uses a cached session when available, otherwise temporarily restores the
 * "home admin" session to mint an impersonation token for the target user.
 */
export const switchToUser = async (
  targetUserId: string,
  opts: { redirectTo?: string } = {}
): Promise<{ ok: boolean; error?: string }> => {
  const redirectTo = opts.redirectTo ?? "/";

  // Preserve the current session so we can hop back to it later.
  try {
    const { data: cur } = await supabase.auth.getSession();
    if (cur.session?.user) {
      cacheSession(cur.session.user.id, cur.session.access_token, cur.session.refresh_token);
    }
  } catch {
    // ignore
  }

  const cached = getCachedSessions()[targetUserId];
  if (cached) {
    const { session, error } = await applyCachedSession(cached);
    if (!error && session) {
      cacheSession(targetUserId, session.access_token, session.refresh_token);
      window.location.href = redirectTo;
      return { ok: true };
    }
  }

  // Need an admin session to mint an impersonation token.
  const homeAdminId = getHomeAdmin();
  const adminCached = homeAdminId ? getCachedSessions()[homeAdminId] : null;

  try {
    const { data: cur } = await supabase.auth.getSession();
    const currentId = cur.session?.user?.id ?? null;
    if (currentId !== homeAdminId && adminCached) {
      const { error } = await applyCachedSession(adminCached);
      if (error) return { ok: false, error: "Admin session expired — please sign in again" };
    }

    const { data, error } = await supabase.functions.invoke("admin-users", {
      body: { action: "impersonate", user_id: targetUserId },
    });
    if (error || !data?.token_hash) {
      return { ok: false, error: error?.message || data?.error || "Switch failed" };
    }

    try { await supabase.auth.signOut({ scope: "local" as any }); } catch (_) {}
    await new Promise((r) => setTimeout(r, 50));

    const { data: verifyData, error: verifyErr } = await supabase.auth.verifyOtp({
      token_hash: data.token_hash,
      type: "magiclink",
    });
    if (verifyErr || !verifyData.session) {
      return { ok: false, error: verifyErr?.message || "Switch failed" };
    }
    cacheSession(targetUserId, verifyData.session.access_token, verifyData.session.refresh_token);
    window.location.href = redirectTo;
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Switch failed" };
  }
};

/** Return to the admin account this browser session started from. */
export const switchBackToAdmin = async (redirectTo = "/admin") => {
  const homeAdminId = getHomeAdmin();
  if (!homeAdminId) return { ok: false, error: "No admin session available" };
  const cached = getCachedSessions()[homeAdminId];
  if (!cached) return { ok: false, error: "Admin session expired — please sign in again" };
  const { session, error } = await applyCachedSession(cached);
  if (error || !session) return { ok: false, error: "Admin session expired — please sign in again" };
  cacheSession(homeAdminId, session.access_token, session.refresh_token);
  window.location.href = redirectTo;
  return { ok: true };
};
