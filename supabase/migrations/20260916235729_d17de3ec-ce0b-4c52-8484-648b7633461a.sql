ALTER TABLE public.interaction_events DROP CONSTRAINT IF EXISTS interaction_events_source_check;
ALTER TABLE public.interaction_events ADD CONSTRAINT interaction_events_source_check
  CHECK (source = ANY (ARRAY['nfc'::text,'qr'::text,'link'::text,'social'::text,'direct'::text,'lockscreen'::text,'project_click'::text,'qr_card_lead'::text]));