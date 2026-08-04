import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_reminder",
  title: "Create reminder",
  description: "Schedule a follow-up reminder for one of the signed-in user's leads.",
  inputSchema: {
    lead_id: z.string().uuid().describe("The lead the reminder belongs to."),
    datetime: z.string().describe("When the reminder is due, as an ISO 8601 timestamp."),
    message: z.string().trim().min(1).describe("Reminder text."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ lead_id, datetime, message }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const when = new Date(datetime);
    if (Number.isNaN(when.getTime())) {
      return { content: [{ type: "text", text: "Invalid datetime: expected an ISO 8601 timestamp." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("reminders")
      .insert({ lead_id, datetime: when.toISOString(), message, notified: false, created_by: ctx.getUserId() })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { reminder: data } };
  },
});
