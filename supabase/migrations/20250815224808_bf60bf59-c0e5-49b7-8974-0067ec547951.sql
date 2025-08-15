
-- Create a table for contact notes with calendar dates
CREATE TABLE public.contact_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  contact_id TEXT NOT NULL,
  date DATE NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, contact_id, date)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.contact_notes ENABLE ROW LEVEL SECURITY;

-- Create policies for contact notes
CREATE POLICY "Users can view their own contact notes" 
  ON public.contact_notes 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own contact notes" 
  ON public.contact_notes 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contact notes" 
  ON public.contact_notes 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contact notes" 
  ON public.contact_notes 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Add trigger to automatically update the updated_at column
CREATE TRIGGER update_contact_notes_updated_at
  BEFORE UPDATE ON public.contact_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
