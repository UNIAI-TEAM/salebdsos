
-- fix search_path on set_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- revoke public exec on aggregator
REVOKE EXECUTE ON FUNCTION public.aggregate_interaction_events_daily(date) FROM anon, authenticated, public;

-- tighten event insert: card must exist and be published
DROP POLICY "anyone logs events" ON public.interaction_events;
CREATE POLICY "events for published cards only" ON public.interaction_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.digital_cards c
    WHERE c.id = card_id AND c.is_published = true
  ));
