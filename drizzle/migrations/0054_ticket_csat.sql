ALTER TABLE public.message_tickets
  ADD COLUMN IF NOT EXISTS csat_score smallint,
  ADD COLUMN IF NOT EXISTS csat_comment text,
  ADD COLUMN IF NOT EXISTS csat_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS csat_rated_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_created boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reopened_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.message_tickets ADD CONSTRAINT message_tickets_csat_range CHECK (csat_score IS NULL OR csat_score BETWEEN 1 AND 5);
CREATE UNIQUE INDEX IF NOT EXISTS message_tickets_one_active_per_conv
  ON public.message_tickets (conversation_id) WHERE conversation_id IS NOT NULL AND status IN ('open','assigned');
CREATE INDEX IF NOT EXISTS message_tickets_csat_pending
  ON public.message_tickets (conversation_id, csat_requested_at) WHERE csat_requested_at IS NOT NULL AND csat_rated_at IS NULL;