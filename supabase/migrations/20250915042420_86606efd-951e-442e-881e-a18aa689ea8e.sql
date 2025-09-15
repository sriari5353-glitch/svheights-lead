-- Add rating column to leads table
ALTER TABLE public.leads 
ADD COLUMN rating INTEGER DEFAULT 0 CHECK (rating >= 0 AND rating <= 5);