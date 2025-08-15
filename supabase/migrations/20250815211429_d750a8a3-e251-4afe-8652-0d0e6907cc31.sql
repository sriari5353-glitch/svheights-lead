
-- Create a table for diary entries
CREATE TABLE public.diary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS) to ensure users can only see their own diary entries
ALTER TABLE public.diary ENABLE ROW LEVEL SECURITY;

-- Create policy that allows users to SELECT their own diary entries
CREATE POLICY "Users can view their own diary entries" 
  ON public.diary 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policy that allows users to INSERT their own diary entries
CREATE POLICY "Users can create their own diary entries" 
  ON public.diary 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create policy that allows users to UPDATE their own diary entries
CREATE POLICY "Users can update their own diary entries" 
  ON public.diary 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create policy that allows users to DELETE their own diary entries
CREATE POLICY "Users can delete their own diary entries" 
  ON public.diary 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Add unique constraint to ensure one diary entry per user
ALTER TABLE public.diary ADD CONSTRAINT diary_user_id_unique UNIQUE (user_id);

-- Add trigger to auto-update the updated_at column
CREATE TRIGGER update_diary_updated_at
  BEFORE UPDATE ON public.diary
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
