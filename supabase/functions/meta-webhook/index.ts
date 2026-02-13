import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const VERIFY_TOKEN = Deno.env.get("META_WEBHOOK_VERIFY_TOKEN");
  const DEFAULT_USER_ID = Deno.env.get("META_DEFAULT_USER_ID");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Missing Supabase config" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // GET = Meta webhook verification
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("Webhook verified successfully");
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  // POST = incoming lead data
  if (req.method === "POST") {
    try {
      const body = await req.json();
      console.log("Webhook payload:", JSON.stringify(body));

      const entries = body?.entry || [];

      for (const entry of entries) {
        const changes = entry?.changes || [];

        for (const change of changes) {
          if (change.field !== "leadgen" && change.field !== "messages") {
            continue;
          }

          // Handle leadgen (Instant Forms)
          if (change.field === "leadgen") {
            const leadgenData = change.value;
            const leadName = leadgenData?.field_data?.find(
              (f: any) => f.name === "full_name" || f.name === "name"
            )?.values?.[0] || "Meta Lead";
            const leadPhone = leadgenData?.field_data?.find(
              (f: any) => f.name === "phone_number" || f.name === "phone"
            )?.values?.[0] || "";

            if (leadPhone) {
              await upsertLead(supabase, {
                name: leadName,
                phone: leadPhone,
                source: "Social Media",
                sourceDetails: "Meta Lead Ad",
                createdBy: DEFAULT_USER_ID || "",
              });
            }
          }

          // Handle WhatsApp messages
          if (change.field === "messages") {
            const messages = change.value?.messages || [];
            const contacts = change.value?.contacts || [];

            for (const msg of messages) {
              const contact = contacts.find(
                (c: any) => c.wa_id === msg.from
              );
              const name = contact?.profile?.name || "WhatsApp Lead";
              const phone = msg.from || "";

              if (phone) {
                await upsertLead(supabase, {
                  name,
                  phone: phone.startsWith("+") ? phone : `+${phone}`,
                  source: "Social Media",
                  sourceDetails: "WhatsApp",
                  createdBy: DEFAULT_USER_ID || "",
                });
              }
            }
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Webhook error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  }

  return new Response("Method not allowed", { status: 405 });
});

async function upsertLead(
  supabase: any,
  lead: {
    name: string;
    phone: string;
    source: string;
    sourceDetails: string;
    createdBy: string;
  }
) {
  // Check for existing lead by phone
  const { data: existing } = await supabase
    .from("leads")
    .select("id")
    .eq("phone", lead.phone)
    .maybeSingle();

  if (existing) {
    console.log(`Lead already exists for phone ${lead.phone}, skipping`);
    return;
  }

  const { error } = await supabase.from("leads").insert({
    name: lead.name,
    phone: lead.phone,
    source: lead.source,
    source_details: lead.sourceDetails,
    status: "New Lead",
    feedback: "",
    notes: "",
    created_by: lead.createdBy,
    lead_date: new Date().toISOString().split("T")[0],
  });

  if (error) {
    console.error("Insert lead error:", error);
  } else {
    console.log(`New lead created: ${lead.name} (${lead.phone})`);
  }
}
