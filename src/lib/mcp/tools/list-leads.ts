import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

const LEAD_FIELDS = "id, name, phone, source, source_details, status, feedback, rating, notes, lead_date, created_at, updated_at";

export default defineTool({
  name: "list_leads",
  title: "List leads",
  description: "List the signed-in user's CRM leads, optionally filtered by status or a name/phone search term.",
  inputSchema: {
    status: z.string().optional().describe("Filter by status, e.g. 'New Lead', 'Prospect', 'Negotiation', 'Hot Lead', 'Closed', 'Lost'."),
    search: z.string().optional().describe("Match part of a lead name or phone number."),
    limit: z.number().int().min(1).max(100).optional().describe("Max leads to return (default 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("leads")
      .select(LEAD_FIELDS)
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);
    if (status) query = query.eq("status", status);
    if (search) query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { leads: data ?? [], count: data?.length ?? 0 },
    };
  },
});
