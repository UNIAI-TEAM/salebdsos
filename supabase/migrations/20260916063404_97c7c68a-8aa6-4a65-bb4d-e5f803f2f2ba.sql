CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid,
  type text NOT NULL DEFAULT 'lead_new',
  title text NOT NULL,
  body text,
  link text,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own_or_tenant"
  ON public.notifications FOR SELECT TO authenticated
  USING (
    private.is_tenant_member(tenant_id)
    AND (user_id IS NULL OR user_id = auth.uid())
  );

CREATE POLICY "notifications_update_own_or_tenant"
  ON public.notifications FOR UPDATE TO authenticated
  USING (
    private.is_tenant_member(tenant_id)
    AND (user_id IS NULL OR user_id = auth.uid())
  )
  WITH CHECK (
    private.is_tenant_member(tenant_id)
    AND (user_id IS NULL OR user_id = auth.uid())
  );

CREATE INDEX idx_notifications_user_created ON public.notifications (tenant_id, user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications (tenant_id, is_read) WHERE is_read = false;

CREATE TRIGGER trg_notifications_updated
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;