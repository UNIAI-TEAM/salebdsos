-- =============================================================================
-- Notification outbox + helpful indexes (safe to run anywhere — Supabase or vanilla).
-- This is platform-neutral SQL; apply via deploy/scripts/migrate.sh when on-prem,
-- or via the Supabase migration tool when on Lovable Cloud.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.notification_outbox (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL,
  channel         text NOT NULL CHECK (channel IN ('email','sms','zalo')),
  to_address      text NOT NULL,
  subject         text,
  body            text NOT NULL,
  template_id     text,
  template_data   jsonb,
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','sending','sent','failed')),
  provider        text,
  provider_msg_id text,
  error           text,
  attempts        int NOT NULL DEFAULT 0,
  scheduled_at    timestamptz NOT NULL DEFAULT now(),
  sent_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notification_outbox_pending_idx
  ON public.notification_outbox (status, scheduled_at)
  WHERE status IN ('pending','sending');

ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;
