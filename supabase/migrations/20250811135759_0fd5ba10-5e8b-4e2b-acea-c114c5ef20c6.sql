-- Add ownership column and user-scoped RLS for CRM tables
-- 1) Add created_by columns where missing
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.whatsapp_history ADD COLUMN IF NOT EXISTS created_by uuid;

-- 2) Ensure updated_at trigger function exists (already provided), create triggers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_leads_updated_at'
  ) THEN
    CREATE TRIGGER trg_update_leads_updated_at
    BEFORE UPDATE ON public.leads
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_reminders_updated_at'
  ) THEN
    CREATE TRIGGER trg_update_reminders_updated_at
    BEFORE UPDATE ON public.reminders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_schedules_updated_at'
  ) THEN
    CREATE TRIGGER trg_update_schedules_updated_at
    BEFORE UPDATE ON public.schedules
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_whatsapp_history_updated_at'
  ) THEN
    CREATE TRIGGER trg_update_whatsapp_history_updated_at
    BEFORE UPDATE ON public.whatsapp_history
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;

-- 3) Enable RLS (if not already) and replace with user-scoped policies
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_history ENABLE ROW LEVEL SECURITY;

-- Drop existing public-allow policies if present to avoid conflicts
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT polname, schemaname, tablename FROM pg_policies 
           WHERE schemaname='public' AND tablename IN ('leads','reminders','schedules','whatsapp_history')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.polname, r.schemaname, r.tablename);
  END LOOP;
END$$;

-- Create user-scoped policies for each table
-- Leads
CREATE POLICY "Users can view their own leads"
ON public.leads FOR SELECT
USING (created_by = auth.uid());

CREATE POLICY "Users can insert their own leads"
ON public.leads FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own leads"
ON public.leads FOR UPDATE
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete their own leads"
ON public.leads FOR DELETE
USING (created_by = auth.uid());

-- Reminders
CREATE POLICY "Users can view their own reminders"
ON public.reminders FOR SELECT
USING (created_by = auth.uid());

CREATE POLICY "Users can insert their own reminders"
ON public.reminders FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own reminders"
ON public.reminders FOR UPDATE
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete their own reminders"
ON public.reminders FOR DELETE
USING (created_by = auth.uid());

-- Schedules
CREATE POLICY "Users can view their own schedules"
ON public.schedules FOR SELECT
USING (created_by = auth.uid());

CREATE POLICY "Users can insert their own schedules"
ON public.schedules FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own schedules"
ON public.schedules FOR UPDATE
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete their own schedules"
ON public.schedules FOR DELETE
USING (created_by = auth.uid());

-- WhatsApp history
CREATE POLICY "Users can view their own whatsapp history"
ON public.whatsapp_history FOR SELECT
USING (created_by = auth.uid());

CREATE POLICY "Users can insert their own whatsapp history"
ON public.whatsapp_history FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own whatsapp history"
ON public.whatsapp_history FOR UPDATE
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete their own whatsapp history"
ON public.whatsapp_history FOR DELETE
USING (created_by = auth.uid());
