import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "update_lead",
  title: "Update lead",
  description: "Update status, feedback, rating, or notes on one of the signed-in user's leads.",
  inputSchema: {
    id: z.string().uuid().describe("The lead id to update."),
    status: z.string().optional().describe("New status, e.g. 'Prospect', 'Hot Lead', 'Closed', 'Lost'."),
    feedback: z.string().optional().describe("Feedback value, e.g. 'Prospect', 'Follow-up', 'Visited', 'Rejected'."),
    rating: z.number().int().min(0).max(5).optional().describe("Star rating 0-5."),
    notes: z.string().optional().describe("Replaces the notes field for this lead."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ id, status, feedback, rating, notes }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const patch: Record<string, unknown> = {};
    if (status !== undefined) patch.status = status;
    if (feedback !== undefined) patch.feedback = feedback;
    if (rating !== undefined) patch.rating = rating;
    if (notes !== undefined) patch.notes = notes;
    if (Object.keys(patch).length === 0) {
      return { content: [{ type: "text", text: "Nothing to update: provide at least one field." }], isError: true };
    }
    patch.updated_at = new Date().toISOString();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase.from("leads").update(patch).eq("id", id).select().maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Lead not found" }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { lead: data } };
  },
});
