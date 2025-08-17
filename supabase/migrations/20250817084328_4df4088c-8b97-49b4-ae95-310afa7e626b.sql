
-- Enable replica identity FULL for all CRM tables to capture complete row data during updates
ALTER TABLE public.leads REPLICA IDENTITY FULL;
ALTER TABLE public.reminders REPLICA IDENTITY FULL;
ALTER TABLE public.whatsapp_history REPLICA IDENTITY FULL;
ALTER TABLE public.schedules REPLICA IDENTITY FULL;
ALTER TABLE public.contact_notes REPLICA IDENTITY FULL;
ALTER TABLE public.daily_notes REPLICA IDENTITY FULL;

-- Add all CRM tables to the supabase_realtime publication for real-time functionality
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reminders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.schedules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_notes;
