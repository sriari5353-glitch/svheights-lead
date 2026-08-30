import { supabase } from "@/integrations/supabase/client";

export const SESSION_CACHE_KEY = "cached_user_sessions";

type CachedSession = { access_token: string; refresh_token: string };

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

export const clearAllCachedSessions = () => {
  sessionStorage.removeItem(SESSION_CACHE_KEY);
};

/**
 * Switch into another user's account without a password prompt.
 * Uses a cached session when available, otherwise the admin-only
 * impersonation flow in the `admin-users` edge function.
 */
export const switchToUser = async (
  targetUserId: string,
  opts: { redirectTo?: string } = {}
): Promise<{ ok: boolean; error?: string }> => {
  const redirectTo = opts.redirectTo ?? "/";

  const cached = getCachedSessions()[targetUserId];
  if (cached) {
    try {
      const { error } = await supabase.auth.setSession({
        access_token: cached.access_token,
        refresh_token: cached.refresh_token,
      });
      if (!error) {
        window.location.href = redirectTo;
        return { ok: true };
      }
    } catch {
      // fall through to impersonation
    }
  }

  try {
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
