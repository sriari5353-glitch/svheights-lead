-- Add policy to allow service role to insert leads (for webhook)
CREATE POLICY "Service role can insert leads" 
ON public.leads 
FOR INSERT 
TO service_role
WITH CHECK (true);

-- Add policy to allow service role to update leads (for duplicate phone handling)
CREATE POLICY "Service role can update leads" 
ON public.leads 
FOR UPDATE 
TO service_role
USING (true)
WITH CHECK (true);