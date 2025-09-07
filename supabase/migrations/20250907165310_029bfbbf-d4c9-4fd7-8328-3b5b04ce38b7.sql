-- Migrate existing notes from leads table to lead_notes table
INSERT INTO public.lead_notes (lead_id, user_id, content, created_at, updated_at)
SELECT 
  id as lead_id,
  created_by as user_id,
  notes as content,
  updated_at as created_at,
  updated_at as updated_at
FROM public.leads 
WHERE notes IS NOT NULL 
AND notes != '' 
AND created_by IS NOT NULL
ON CONFLICT DO NOTHING;