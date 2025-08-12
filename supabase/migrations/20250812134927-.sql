-- Admin override policies for leads and backfill created_by for existing rows

-- 1) Add admin RLS policies
create policy if not exists "Admins can view all leads"
  on public.leads
  for select
  using (public.has_role(auth.uid(), 'admin'));

create policy if not exists "Admins can update any lead"
  on public.leads
  for update
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy if not exists "Admins can delete any lead"
  on public.leads
  for delete
  using (public.has_role(auth.uid(), 'admin'));

-- 2) Backfill created_by for orphaned records to the admin user (by email)
-- Note: This assumes the admin email configured in handle_new_user() is present
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