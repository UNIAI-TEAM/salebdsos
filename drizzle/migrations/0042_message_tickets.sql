-- Ticket tin nhắn: giao việc chăm sóc từ hội thoại, có SLA và người phụ trách
CREATE TABLE public.message_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  code text NOT NULL DEFAULT ('TK-' || to_char(now(), 'YYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 5)),
  title text NOT NULL,
  source text,
  kind text NOT NULL DEFAULT 'Chăm sóc khách hàng',
  priority text NOT NULL DEFAULT 'normal',
  assignee_user_id uuid,
  due_at timestamptz,
  status text NOT NULL DEFAULT 'open',
  created_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX message_tickets_tenant_code ON public.message_tickets (tenant_id, code);
CREATE INDEX message_tickets_tenant_status ON public.message_tickets (tenant_id, status);

COMMENT ON TABLE public.message_tickets IS 'Ticket giao việc từ hội thoại: priority = low|normal|high|urgent, status = open|assigned|resolved|cancelled';

GRANT SELECT, INSERT, UPDATE ON public.message_tickets TO authenticated;
GRANT ALL ON public.message_tickets TO service_role;

ALTER TABLE public.message_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read tickets"
  ON public.message_tickets FOR SELECT TO authenticated
  USING (private.is_tenant_member(tenant_id));

CREATE POLICY "Members create tickets"
  ON public.message_tickets FOR INSERT TO authenticated
  WITH CHECK (private.is_tenant_member(tenant_id));

CREATE POLICY "Managers, assignee or creator update tickets"
  ON public.message_tickets FOR UPDATE TO authenticated
  USING (
    private.has_tenant_role_in(tenant_id, ARRAY['owner','admin','manager']::public.app_role[])
    OR assignee_user_id = auth.uid()
    OR created_by = auth.uid()
  )
  WITH CHECK (
    private.has_tenant_role_in(tenant_id, ARRAY['owner','admin','manager']::public.app_role[])
    OR assignee_user_id = auth.uid()
    OR created_by = auth.uid()
  );

CREATE TRIGGER set_message_tickets_updated_at BEFORE UPDATE ON public.message_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();