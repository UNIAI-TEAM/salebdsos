CREATE POLICY verification_resend_log_admin_select ON public.verification_resend_log
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('owner'::app_role, 'admin'::app_role)
  ));