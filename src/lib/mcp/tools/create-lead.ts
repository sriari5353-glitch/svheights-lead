import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

function normalizePhone(raw: string): string {
  const cleaned = raw.replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  const digits = cleaned.replace(/\D/g, "");
  return digits.length === 10 ? `+91${digits}` : `+${digits}`;
}

export default defineTool({
  name: "create_lead",
  title: "Create lead",
  description: "Create a new CRM lead for the signed-in user. Phone numbers must be unique within the account.",
  inputSchema: {
    name: z.string().trim().min(1).describe("Lead's full name."),
    phone: z.string().trim().min(6).describe("Phone number; 10-digit numbers are treated as Indian (+91)."),
    source: z.string().optional().describe("Lead source, e.g. 'Walk-in', 'Referral', 'Social Media', 'Other'."),
    source_details: z.string().optional().describe("Extra detail about where the lead came from."),
    status: z.string().optional().describe("Initial status (default 'New Lead')."),
    notes: z.string().optional().describe("Initial notes for the lead."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ name, phone, source, source_details, status, notes }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("leads")
      .insert({
        name,
        phone: normalizePhone(phone),
        source: source ?? "Other",
        source_details: source_details ?? null,
        status: status ?? "New Lead",
        notes: notes ?? "",
        feedback: "",
        rating: 0,
        created_by: ctx.getUserId(),
        lead_date: new Date().toISOString().split("T")[0],
      })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { lead: data } };
  },
});
