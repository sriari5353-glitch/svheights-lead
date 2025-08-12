-- Admin override policies for leads and backfill created_by for existing rows

-- 1) Add admin RLS policies conditionally
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'leads' AND policyname = 'Admins can view all leads'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Admins can view all leads"
      ON public.leads
      FOR SELECT
      USING (public.has_role(auth.uid(), 'admin'))
    $$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'leads' AND policyname = 'Admins can update any lead'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Admins can update any lead"
      ON public.leads
      FOR UPDATE
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'))
    $$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'leads' AND policyname = 'Admins can delete any lead'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Admins can delete any lead"
      ON public.leads
      FOR DELETE
      USING (public.has_role(auth.uid(), 'admin'))
    $$;
  END IF;
END $$;

-- 2) Backfill created_by for orphaned records to the admin user (by email)
DO $$
DECLARE
  admin_id uuid;
BEGIN
  SELECT id INTO admin_id
  FROM auth.users
  WHERE lower(email) = lower('sriari5353@gmail.com')
  LIMIT 1;

  IF admin_id IS NOT NULL THEN
    UPDATE public.leads SET created_by = admin_id WHERE created_by IS NULL;
    UPDATE public.reminders SET created_by = admin_id WHERE created_by IS NULL;
    UPDATE public.whatsapp_history SET created_by = admin_id WHERE created_by IS NULL;
    UPDATE public.schedules SET created_by = admin_id WHERE created_by IS NULL;
  END IF;
END $$;