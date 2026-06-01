DROP INDEX IF EXISTS public.leads_phone_unique;
CREATE UNIQUE INDEX leads_phone_per_user_unique ON public.leads (created_by, phone);