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

    console.log(`Webhook verification: mode=${mode}, token_match=${token === VERIFY_TOKEN}`);

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Webhook verified successfully');
      return new Response(challenge, { status: 200 });
    }
    console.error('Webhook verification failed');
    return new Response('Verification failed', { status: 403 });
  }

  // Handle webhook events (POST request from Meta)
  if (req.method === 'POST') {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    let body: any;
    try {
      body = await req.json();
    } catch (e) {
      console.error('Failed to parse request body:', e);
      return new Response('Invalid JSON', { status: 400 });
    }

    console.log('Received webhook payload:', JSON.stringify(body).substring(0, 500));

    if (body.object === 'page') {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'leadgen') {
            const { leadgen_id, page_id } = change.value;
            console.log(`Processing leadgen_id: ${leadgen_id}`);

            try {
              // Fetch lead data from Meta Graph API
              const leadResponse = await fetch(
                `https://graph.facebook.com/v18.0/${leadgen_id}?access_token=${META_ACCESS_TOKEN}`
              );
              const leadData = await leadResponse.json();

              if (leadData.error) {
                console.error('Meta API error:', leadData.error);
                continue;
              }

              if (!leadData.field_data) {
                console.error('No field_data in lead response:', leadData);
                continue;
              }

              // Extract fields from Meta lead form
              const fields: Record<string, string> = {};
              for (const field of leadData.field_data) {
                fields[field.name.toLowerCase()] = field.values?.[0] || '';
              }

              console.log('Lead fields:', JSON.stringify(fields));

              // Build name from available fields
              let name = '';
              if (fields['full_name']) {
                name = fields['full_name'];
              } else if (fields['first_name'] || fields['last_name']) {
                name = `${fields['first_name'] || ''} ${fields['last_name'] || ''}`.trim();
              } else {
                name = 'Meta Lead';
              }

              // Extract phone number
              const rawPhone = fields['phone_number'] || fields['phone'] || fields['mobile'] || '';

              if (!rawPhone) {
                console.warn(`No phone number for lead ${leadgen_id}, skipping`);
                continue;
              }

              // Normalize phone number
              let normalizedPhone = rawPhone.replace(/[\s\-\(\)]/g, '');
              if (!normalizedPhone.startsWith('+')) {
                const digits = normalizedPhone.replace(/\D/g, '');
                if (digits.length === 10) {
                  normalizedPhone = '+91' + digits; // Default India country code
                } else {
                  normalizedPhone = '+' + digits;
                }
              }

              // Deduplicate by phone number
              const { data: existing } = await supabase
                .from('leads')
                .select('id, name, phone')
                .eq('phone', normalizedPhone)
                .maybeSingle();

              if (existing) {
                console.log(`Duplicate lead skipped - phone: ${normalizedPhone}, existing id: ${existing.id}`);
                continue;
              }

              // Insert new lead using service role (bypasses RLS)
              const { data: newLead, error: insertError } = await supabase.from('leads').insert({
                name,
                phone: normalizedPhone,
                source: 'Meta Ads',
                source_details: `Lead Form - Page ${page_id}`,
                status: 'New Lead',
                notes: '',
                feedback: '',
                rating: 0,
                created_by: DEFAULT_USER_ID,
                lead_date: new Date().toISOString().split('T')[0],
              }).select().single();

              if (insertError) {
                console.error('Failed to insert lead:', insertError);
              } else {
                console.log(`✅ New lead created: ${name} (${normalizedPhone}) - id: ${newLead.id}`);
              }
            } catch (err) {
              console.error(`Error processing leadgen_id ${leadgen_id}:`, err);
            }
          }
        }
      }
    }

    // Always return 200 to Meta to acknowledge receipt
    return new Response('OK', { status: 200 });
  }

  return new Response('Method not allowed', { status: 405 });
});
