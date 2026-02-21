
CREATE TABLE public.data_transfer_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('import', 'export')),
  file_name TEXT,
  record_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'success',
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.data_transfer_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transfer history" ON public.data_transfer_history FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert their own transfer history" ON public.data_transfer_history FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete their own transfer history" ON public.data_transfer_history FOR DELETE USING (user_id = auth.uid());
