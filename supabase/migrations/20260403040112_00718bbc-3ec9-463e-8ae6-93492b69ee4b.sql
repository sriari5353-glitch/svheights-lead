
-- Admin can view all reminders
CREATE POLICY "Admins can view all reminders"
ON public.reminders FOR SELECT
TO public
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all whatsapp_history
CREATE POLICY "Admins can view all whatsapp history"
ON public.whatsapp_history FOR SELECT
TO public
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all schedules
CREATE POLICY "Admins can view all schedules"
ON public.schedules FOR SELECT
TO public
USING (public.has_role(auth.uid(), 'admin'));
