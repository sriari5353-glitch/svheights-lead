-- Create tables for CRM persistence
-- Use simple TEXT types for flexibility with the current app unions
-- and keep things minimal as requested

-- Enable pgcrypto for gen_random_uuid if not already
create extension if not exists pgcrypto;

-- Generic function to update updated_at
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Leads table
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  source text not null,
  source_details text,
  status text not null,
  notes text not null default '',
  feedback text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists leads_phone_unique on public.leads(phone);

create trigger trg_leads_updated_at
before update on public.leads
for each row
execute function public.update_updated_at_column();

-- Reminders table
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  datetime timestamptz not null,
  message text not null,
  notified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reminders_lead_id_idx on public.reminders(lead_id);

create trigger trg_reminders_updated_at
before update on public.reminders
for each row
execute function public.update_updated_at_column();

-- WhatsApp history
create table if not exists public.whatsapp_history (
  id uuid primary key default gen_random_uuid(),
  date timestamptz not null,
  message text not null,
  lead_ids uuid[] not null,
  status text not null,
  count int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_whatsapp_history_updated_at
before update on public.whatsapp_history
for each row
execute function public.update_updated_at_column();

-- Schedules for WhatsApp
create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  datetime timestamptz not null,
  message text not null,
  lead_ids uuid[] not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_schedules_updated_at
before update on public.schedules
for each row
execute function public.update_updated_at_column();

-- Realtime configuration
alter table public.leads replica identity full;
alter table public.reminders replica identity full;
alter table public.whatsapp_history replica identity full;
alter table public.schedules replica identity full;

-- Add tables to realtime publication
-- (if publication exists this will just add them)
alter publication supabase_realtime add table public.leads;
alter publication supabase_realtime add table public.reminders;
alter publication supabase_realtime add table public.whatsapp_history;
alter publication supabase_realtime add table public.schedules;

-- RLS: since the app has no auth yet and must work across devices,
-- create permissive policies for now (public dataset).
-- We ENABLE RLS and then allow anon access explicitly.

alter table public.leads enable row level security;
alter table public.reminders enable row level security;
alter table public.whatsapp_history enable row level security;
alter table public.schedules enable row level security;

-- Allow anyone (anon) full access; this is temporary until auth is added
create policy "Public can read leads" on public.leads for select to anon using (true);
create policy "Public can insert leads" on public.leads for insert to anon with check (true);
create policy "Public can update leads" on public.leads for update to anon using (true) with check (true);
create policy "Public can delete leads" on public.leads for delete to anon using (true);

create policy "Public can read reminders" on public.reminders for select to anon using (true);
create policy "Public can insert reminders" on public.reminders for insert to anon with check (true);
create policy "Public can update reminders" on public.reminders for update to anon using (true) with check (true);
create policy "Public can delete reminders" on public.reminders for delete to anon using (true);

create policy "Public can read whatsapp_history" on public.whatsapp_history for select to anon using (true);
create policy "Public can insert whatsapp_history" on public.whatsapp_history for insert to anon with check (true);
create policy "Public can update whatsapp_history" on public.whatsapp_history for update to anon using (true) with check (true);
create policy "Public can delete whatsapp_history" on public.whatsapp_history for delete to anon using (true);

create policy "Public can read schedules" on public.schedules for select to anon using (true);
create policy "Public can insert schedules" on public.schedules for insert to anon with check (true);
create policy "Public can update schedules" on public.schedules for update to anon using (true) with check (true);
create policy "Public can delete schedules" on public.schedules for delete to anon using (true);
