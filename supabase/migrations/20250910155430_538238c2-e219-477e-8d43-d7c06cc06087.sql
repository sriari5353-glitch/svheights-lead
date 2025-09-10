-- Add contact_id column to notes table to link notes to contacts
ALTER TABLE public.notes 
ADD COLUMN contact_id uuid REFERENCES public.leads(id) ON DELETE SET NULL;