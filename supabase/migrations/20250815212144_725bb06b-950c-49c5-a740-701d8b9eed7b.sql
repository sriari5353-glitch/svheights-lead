
-- Remove the unique constraint on diary to allow multiple entries per user
ALTER TABLE public.diary DROP CONSTRAINT IF EXISTS diary_user_id_unique;

-- Add a date column to diary table for date-based entries
ALTER TABLE public.diary ADD COLUMN IF NOT EXISTS date DATE NOT NULL DEFAULT CURRENT_DATE;

-- Create a unique constraint on user_id and date to ensure one diary entry per user per date
ALTER TABLE public.diary ADD CONSTRAINT diary_user_date_unique UNIQUE (user_id, date);

-- Create a table for daily notes
CREATE TABLE IF NOT EXISTS public.daily_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  date DATE NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add unique constraint to ensure one daily note per user per date
ALTER TABLE public.daily_notes ADD CONSTRAINT daily_notes_user_date_unique UNIQUE (user_id, date);

-- Add Row Level Security (RLS) to daily_notes
ALTER TABLE public.daily_notes ENABLE ROW LEVEL SECURITY;

-- Create policies for daily_notes
CREATE POLICY "Users can view their own daily notes" 
  ON public.daily_notes 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own daily notes" 
  ON public.daily_notes 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily notes" 
  ON public.daily_notes 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily notes" 
  ON public.daily_notes 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Add trigger to auto-update the updated_at column for daily_notes
CREATE TRIGGER update_daily_notes_updated_at
  BEFORE UPDATE ON public.daily_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
