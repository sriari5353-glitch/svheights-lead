// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://xdbpsekyyifjrvarqwqj.supabase.co";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
// Public anon key (safe to embed)
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkYnBzZWt5eWlmanJ2YXJxd3FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3MTY5MDYsImV4cCI6MjA3MDI5MjkwNn0.6fPkXgZ5QxsIRP5PAryye8YocF9LTP9OgTd_UAp1qqM";

function json(body: any, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json", ...corsHeaders },
    ...init,
  });
}

const AUTO_ADMIN_EMAIL = "sriari5353@gmail.com";

async function ensureProfileAndRoles(supabaseAdmin: any, authUser: any) {
  const userId = authUser?.id;
  if (!userId) return;

  const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (profileCheckError) throw profileCheckError;

  if (!existingProfile) {
    const rawUsername = authUser?.user_metadata?.username;
    const rawFullName = authUser?.user_metadata?.full_name;
    const normalizedEmail = String(authUser?.email || "").trim();

    const { error: insertProfileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: userId,
        username: rawUsername ? String(rawUsername).trim() : null,
        full_name: rawFullName ? String(rawFullName).trim() : null,
        email: normalizedEmail || `${userId}@leadmate.app`,
      });

    if (insertProfileError) throw insertProfileError;
  }

  const { error: userRoleError } = await supabaseAdmin
    .from("user_roles")
    .upsert(
      { user_id: userId, role: "user" },
      { onConflict: "user_id,role", ignoreDuplicates: true }
    );

  if (userRoleError) throw userRoleError;

  if (String(authUser?.email || "").toLowerCase() === AUTO_ADMIN_EMAIL) {
    const { error: adminRoleError } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: userId, role: "admin" },
        { onConflict: "user_id,role", ignoreDuplicates: true }
      );

    if (adminRoleError) throw adminRoleError;
  }
}

async function syncProfilesFromAuth(supabaseAdmin: any) {
  const perPage = 100;
  let page = 1;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const authUsers = data?.users || [];
    for (const authUser of authUsers) {
      await ensureProfileAndRoles(supabaseAdmin, authUser);
    }

    if (authUsers.length < perPage) break;
    page += 1;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUserClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userRes } = await supabaseUserClient.auth.getUser();
    const user = userRes?.user;
    if (!user) return json({ error: "Unauthorized" }, { status: 401 });

    const { data: roles, error: rolesErr } = await supabaseUserClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    if (rolesErr) return json({ error: rolesErr.message }, { status: 500 });
    const isAdmin = Boolean(roles?.some((r: any) => r.role === "admin"));
    if (!isAdmin) return json({ error: "Forbidden" }, { status: 403 });

    if (!SERVICE_ROLE_KEY) {
      return json({ error: "Service role key not configured" }, { status: 500 });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { action, ...payload } = await req.json().catch(() => ({ action: "list" }));

    if (action === "list") {
      await syncProfilesFromAuth(supabaseAdmin);
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("id, username, full_name, email, created_at, is_active")
        .order("created_at", { ascending: false });
      if (error) return json({ error: error.message }, { status: 500 });
      return json({ users: data });
    }

    if (action === "create") {
      const username = String(payload.username || "").trim();
      const password = String(payload.password || "").trim();
      const providedEmail = String(payload.email || "").trim();

      if (!username || !password) {
        return json({ error: "username and password required" }, { status: 400 });
      }

      if (providedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(providedEmail)) {
        return json({ error: "Invalid email format" }, { status: 400 });
      }

      const { data: existing, error: existErr } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("username", username)
        .maybeSingle();
      if (existErr) return json({ error: existErr.message }, { status: 500 });
      if (existing) return json({ error: "Username already exists" }, { status: 400 });

      let email = providedEmail;
      if (!email) {
        const sanitized = username.toLowerCase().replace(/[^a-z0-9]/g, "") || "user";
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        email = `${sanitized}${randomSuffix}@leadmate.app`;
      }

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { username },
      });
      if (error) return json({ error: error.message }, { status: 500 });

      if (data?.user) {
        await ensureProfileAndRoles(supabaseAdmin, data.user);
      }

      return json({ ok: true, user_id: data.user?.id });
    }

    if (action === "reset_password") {
      const user_id = String(payload.user_id || "").trim();
      const password = String(payload.password || "").trim();
      if (!user_id || !password) return json({ error: "user_id and password required" }, { status: 400 });
      const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, { password });
      if (error) return json({ error: error.message }, { status: 500 });
      return json({ ok: true });
    }

    if (action === "delete") {
      const user_id = String(payload.user_id || "").trim();
      if (!user_id) return json({ error: "user_id required" }, { status: 400 });
      const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id);
      if (error) return json({ error: error.message }, { status: 500 });
      return json({ ok: true });
    }

    if (action === "deactivate" || action === "activate") {
      const user_id = String(payload.user_id || "").trim();
      if (!user_id) return json({ error: "user_id required" }, { status: 400 });
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ is_active: action === "activate" })
        .eq("id", user_id);
      if (error) return json({ error: error.message }, { status: 500 });
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    return json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
});
