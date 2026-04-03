import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const VERIFY_TOKEN = Deno.env.get('META_WEBHOOK_VERIFY_TOKEN');
  const META_ACCESS_TOKEN = Deno.env.get('META_ACCESS_TOKEN');
  const DEFAULT_USER_ID = Deno.env.get('META_DEFAULT_USER_ID');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  // Handle webhook verification (GET request from Meta)
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    console.log(`[Platinum City] Webhook verification: mode=${mode}, token_match=${token === VERIFY_TOKEN}`);

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[Platinum City] Webhook verified successfully');
      return new Response(challenge, { status: 200 });
    }
    console.error('[Platinum City] Webhook verification failed');
    return new Response('Verification failed', { status: 403 });
  }

  // Handle webhook events (POST request from Meta)
  if (req.method === 'POST') {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    let body: any;
    try {
      body = await req.json();
    } catch (e) {
      console.error('[Platinum City] Failed to parse request body:', e);
      return new Response('Invalid JSON', { status: 400 });
    }

    console.log('[Platinum City] Received webhook payload:', JSON.stringify(body).substring(0, 500));

    if (body.object === 'page' || body.object === 'whatsapp_business_account') {
      for (const entry of body.entry || []) {
        // Handle leadgen from page
        for (const change of entry.changes || []) {
          if (change.field === 'leadgen') {
            const { leadgen_id, page_id } = change.value;
            console.log(`[Platinum City] Processing leadgen_id: ${leadgen_id}`);

            try {
              const leadResponse = await fetch(
                `https://graph.facebook.com/v18.0/${leadgen_id}?access_token=${META_ACCESS_TOKEN}`
              );
              const leadData = await leadResponse.json();

              if (leadData.error) {
                console.error('[Platinum City] Meta API error:', leadData.error);
                continue;
              }

              if (!leadData.field_data) {
                console.error('[Platinum City] No field_data in lead response:', leadData);
                continue;
              }

              const fields: Record<string, string> = {};
              for (const field of leadData.field_data) {
                fields[field.name.toLowerCase()] = field.values?.[0] || '';
              }

              console.log('[Platinum City] Lead fields:', JSON.stringify(fields));

              let name = '';
              if (fields['full_name']) {
                name = fields['full_name'];
              } else if (fields['first_name'] || fields['last_name']) {
                name = `${fields['first_name'] || ''} ${fields['last_name'] || ''}`.trim();
              } else {
                name = 'Platinum City Lead';
              }

              const rawPhone = fields['phone_number'] || fields['phone'] || fields['mobile'] || '';

              if (!rawPhone) {
                console.warn(`[Platinum City] No phone number for lead ${leadgen_id}, skipping`);
                continue;
              }

              let normalizedPhone = rawPhone.replace(/[\s\-\(\)]/g, '');
              if (!normalizedPhone.startsWith('+')) {
                const digits = normalizedPhone.replace(/\D/g, '');
                if (digits.length === 10) {
                  normalizedPhone = '+91' + digits;
                } else {
                  normalizedPhone = '+' + digits;
                }
              }

              const { data: existing } = await supabase
                .from('leads')
                .select('id, name, phone')
                .eq('phone', normalizedPhone)
                .maybeSingle();

              if (existing) {
                console.log(`[Platinum City] Duplicate lead skipped - phone: ${normalizedPhone}, existing id: ${existing.id}`);
                continue;
              }

              const { data: newLead, error: insertError } = await supabase.from('leads').insert({
                name,
                phone: normalizedPhone,
                source: 'Meta Ads',
                source_details: `Platinum City - Page ${page_id}`,
                status: 'New Lead',
                notes: '',
                feedback: '',
                rating: 0,
                created_by: DEFAULT_USER_ID,
                lead_date: new Date().toISOString().split('T')[0],
              }).select().single();

              if (insertError) {
                console.error('[Platinum City] Failed to insert lead:', insertError);
              } else {
                console.log(`[Platinum City] ✅ New lead created: ${name} (${normalizedPhone}) - id: ${newLead.id}`);
              }
            } catch (err) {
              console.error(`[Platinum City] Error processing leadgen_id ${leadgen_id}:`, err);
            }
          }
        }

        // Handle WhatsApp messages
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.field === 'messages' && change.value?.messages) {
              for (const message of change.value.messages) {
                const from = message.from;
                const text = message.text?.body || message.type || '';
                const contactName = change.value.contacts?.[0]?.profile?.name || 'WhatsApp Lead';

                console.log(`[Platinum City] WhatsApp message from ${from}: ${text}`);

                let normalizedPhone = from;
                if (!normalizedPhone.startsWith('+')) {
                  normalizedPhone = '+' + normalizedPhone;
                }

                const { data: existing } = await supabase
                  .from('leads')
                  .select('id, name, phone')
                  .eq('phone', normalizedPhone)
                  .maybeSingle();

                if (existing) {
                  console.log(`[Platinum City] Existing lead found for WhatsApp message: ${existing.id}`);
                  continue;
                }

                const { data: newLead, error: insertError } = await supabase.from('leads').insert({
                  name: contactName,
                  phone: normalizedPhone,
                  source: 'WhatsApp',
                  source_details: `Platinum City - Inbound WhatsApp`,
                  status: 'New Lead',
                  notes: `First message: ${text}`,
                  feedback: '',
                  rating: 0,
                  created_by: DEFAULT_USER_ID,
                  lead_date: new Date().toISOString().split('T')[0],
                }).select().single();

                if (insertError) {
                  console.error('[Platinum City] Failed to insert WhatsApp lead:', insertError);
                } else {
                  console.log(`[Platinum City] ✅ New WhatsApp lead: ${contactName} (${normalizedPhone}) - id: ${newLead.id}`);
                }
              }
            }
          }
        }
      }
    }

    return new Response('OK', { status: 200 });
  }

  return new Response('Method not allowed', { status: 405 });
});
