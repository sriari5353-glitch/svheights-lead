-- Add contact_id column to diary table to link diary entries to contacts
ALTER TABLE public.diary 
ADD COLUMN contact_id uuid REFERENCES public.leads(id);