-- Sale trong sàn được ghi nhận điểm chạm cho dự án thuộc sàn của mình (VD: gửi QR qua email)
CREATE POLICY touch_insert_tenant ON public.project_touchpoints
FOR INSERT TO authenticated
WITH CHECK (
  tenant_id IN (
    SELECT user_roles.tenant_id FROM public.user_roles WHERE user_roles.user_id = auth.uid()
  )
);

GRANT INSERT ON public.project_touchpoints TO authenticated;