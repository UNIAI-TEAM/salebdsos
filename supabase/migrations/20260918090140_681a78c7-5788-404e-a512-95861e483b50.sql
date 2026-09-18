-- 1) Hội thoại gộp theo khách
CREATE TYPE public.conv_channel AS ENUM ('web_chat','zalo','call','sms','email','note');
CREATE TYPE public.conv_direction AS ENUM ('in','out');

CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  card_id uuid REFERENCES public.cards(id) ON DELETE SET NULL,
  owner_user_id uuid,
  channel public.conv_channel NOT NULL DEFAULT 'web_chat',
  contact_name text,
  contact_phone text,
  contact_zalo_id text,
  visitor_key text,
  status text NOT NULL DEFAULT 'open',
  unread_count integer NOT NULL DEFAULT 0,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_message_preview text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX conversations_visitor_key_idx ON public.conversations(tenant_id, visitor_key) WHERE visitor_key IS NOT NULL;
CREATE UNIQUE INDEX conversations_zalo_idx ON public.conversations(tenant_id, contact_zalo_id) WHERE contact_zalo_id IS NOT NULL;
CREATE INDEX conversations_tenant_last_idx ON public.conversations(tenant_id, last_message_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members manage conversations" ON public.conversations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.tenant_id = conversations.tenant_id AND ur.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.tenant_id = conversations.tenant_id AND ur.user_id = auth.uid()));
CREATE TRIGGER trg_conversations_updated BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  channel public.conv_channel NOT NULL DEFAULT 'web_chat',
  direction public.conv_direction NOT NULL,
  body text,
  attachment_url text,
  sender_user_id uuid,
  sender_name text,
  external_id text,
  delivery_status text NOT NULL DEFAULT 'sent',
  error_message text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX conversation_messages_conv_idx ON public.conversation_messages(conversation_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_messages TO authenticated;
GRANT ALL ON public.conversation_messages TO service_role;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members manage messages" ON public.conversation_messages FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.tenant_id = conversation_messages.tenant_id AND ur.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.tenant_id = conversation_messages.tenant_id AND ur.user_id = auth.uid()));

-- 2) Cuộc gọi có ghi âm
CREATE TABLE public.call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  agent_user_id uuid,
  provider text NOT NULL DEFAULT 'manual',
  external_call_id text,
  direction public.conv_direction NOT NULL DEFAULT 'out',
  phone text,
  status text NOT NULL DEFAULT 'initiated',
  outcome text,
  duration_seconds integer NOT NULL DEFAULT 0,
  recording_url text,
  transcript text,
  notes text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX call_logs_tenant_idx ON public.call_logs(tenant_id, started_at DESC);
CREATE UNIQUE INDEX call_logs_external_idx ON public.call_logs(provider, external_call_id) WHERE external_call_id IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.call_logs TO authenticated;
GRANT ALL ON public.call_logs TO service_role;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members manage call logs" ON public.call_logs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.tenant_id = call_logs.tenant_id AND ur.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.tenant_id = call_logs.tenant_id AND ur.user_id = auth.uid()));
CREATE TRIGGER trg_call_logs_updated BEFORE UPDATE ON public.call_logs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();