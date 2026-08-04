import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listLeadsTool from "./tools/list-leads";
import createLeadTool from "./tools/create-lead";
import updateLeadTool from "./tools/update-lead";
import listRemindersTool from "./tools/list-reminders";
import createReminderTool from "./tools/create-reminder";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "svheights-lead",
  title: "svheights-lead",
  version: "0.1.0",
  instructions:
    "Tools for the svheights-lead CRM. Use `list_leads` to read leads (filter by status or search by name/phone), `create_lead` to add one, `update_lead` to change status, feedback, rating or notes, and `list_reminders` / `create_reminder` for follow-ups. All data is scoped to the signed-in user's account.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listLeadsTool, createLeadTool, updateLeadTool, listRemindersTool, createReminderTool],
});
