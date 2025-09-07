-- Create table for tracking individual lead notes with timestamps
CREATE TABLE public.lead_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own lead notes" 
ON public.lead_notes 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own lead notes" 
ON public.lead_notes 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own lead notes" 
ON public.lead_notes 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own lead notes" 
ON public.lead_notes 
FOR DELETE 
USING (user_id = auth.uid());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_lead_notes_updated_at
BEFORE UPDATE ON public.lead_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_lead_notes_lead_id_created_at ON public.lead_notes(lead_id, created_at DESC);
CREATE INDEX idx_lead_notes_user_id ON public.lead_notes(user_id);