import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_reminders",
  title: "List reminders",
  description: "List the signed-in user's follow-up reminders, newest scheduled first, with the linked lead.",
  inputSchema: {
    upcoming_only: z.boolean().optional().describe("Only return reminders scheduled in the future."),
    limit: z.number().int().min(1).max(100).optional().describe("Max reminders to return (default 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ upcoming_only, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("reminders")
      .select("id, lead_id, datetime, message, notified, created_at, leads(name, phone)")
      .order("datetime", { ascending: true })
      .limit(limit ?? 25);
    if (upcoming_only) query = query.gte("datetime", new Date().toISOString());
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { reminders: data ?? [], count: data?.length ?? 0 },
    };
  },
});
