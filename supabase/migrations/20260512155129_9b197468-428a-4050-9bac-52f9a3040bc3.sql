
-- digital_cards
CREATE TABLE public.digital_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  owner_user_id uuid,
  slug text NOT NULL UNIQUE,
  display_name text NOT NULL,
  title text,
  company text,
  bio text,
  avatar_url text,
  theme jsonb NOT NULL DEFAULT '{}'::jsonb,
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_published boolean NOT NULL DEFAULT true,
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_digital_cards_tenant ON public.digital_cards(tenant_id);
CREATE INDEX idx_digital_cards_owner ON public.digital_cards(owner_user_id);

-- nfc_short_codes (printed on NFC chip / QR poster)
CREATE TABLE public.nfc_short_codes (
  code text PRIMARY KEY,
  card_id uuid NOT NULL REFERENCES public.digital_cards(id) ON DELETE CASCADE,
  tenant_id uuid,
  source text NOT NULL DEFAULT 'nfc' CHECK (source IN ('nfc','qr','link','social')),
  label text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_short_codes_card ON public.nfc_short_codes(card_id);

-- interaction_events (raw log)
CREATE TABLE public.interaction_events (
  id bigserial PRIMARY KEY,
  card_id uuid NOT NULL REFERENCES public.digital_cards(id) ON DELETE CASCADE,
  tenant_id uuid,
  short_code text,
  source text NOT NULL CHECK (source IN ('nfc','qr','link','social','direct')),
  device_type text,
  browser text,
  os text,
  referrer text,
  country text,
  ip_hash text,
  user_agent text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_events_card_time ON public.interaction_events(card_id, occurred_at DESC);
CREATE INDEX idx_events_tenant_time ON public.interaction_events(tenant_id, occurred_at DESC);
CREATE INDEX idx_events_source ON public.interaction_events(source);

-- analytics_daily (aggregated)
CREATE TABLE public.analytics_daily (
  card_id uuid NOT NULL REFERENCES public.digital_cards(id) ON DELETE CASCADE,
  tenant_id uuid,
  day date NOT NULL,
  source text NOT NULL,
  event_count integer NOT NULL DEFAULT 0,
  unique_visitors integer NOT NULL DEFAULT 0,
  PRIMARY KEY (card_id, day, source)
);
CREATE INDEX idx_analytics_daily_tenant ON public.analytics_daily(tenant_id, day DESC);

-- updated_at trigger fn
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_cards_updated BEFORE UPDATE ON public.digital_cards
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_short_codes_updated BEFORE UPDATE ON public.nfc_short_codes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- aggregation function (rolls events into analytics_daily)
CREATE OR REPLACE FUNCTION public.aggregate_interaction_events_daily(_day date DEFAULT (CURRENT_DATE - 1))
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.analytics_daily (card_id, tenant_id, day, source, event_count, unique_visitors)
  SELECT card_id, tenant_id, _day, source,
         COUNT(*)::int,
         COUNT(DISTINCT ip_hash)::int
  FROM public.interaction_events
  WHERE occurred_at >= _day AND occurred_at < (_day + 1)
  GROUP BY card_id, tenant_id, source
  ON CONFLICT (card_id, day, source) DO UPDATE
    SET event_count = EXCLUDED.event_count,
        unique_visitors = EXCLUDED.unique_visitors,
        tenant_id = EXCLUDED.tenant_id;
END $$;

-- RLS
ALTER TABLE public.digital_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfc_short_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interaction_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_daily ENABLE ROW LEVEL SECURITY;

-- digital_cards: anyone can read published; owners manage their own
CREATE POLICY "public reads published cards" ON public.digital_cards
  FOR SELECT TO anon, authenticated USING (is_published = true);
CREATE POLICY "owner reads own cards" ON public.digital_cards
  FOR SELECT TO authenticated USING (owner_user_id = auth.uid());
CREATE POLICY "owner inserts own cards" ON public.digital_cards
  FOR INSERT TO authenticated WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "owner updates own cards" ON public.digital_cards
  FOR UPDATE TO authenticated USING (owner_user_id = auth.uid());
CREATE POLICY "owner deletes own cards" ON public.digital_cards
  FOR DELETE TO authenticated USING (owner_user_id = auth.uid());

-- nfc_short_codes: public can resolve active codes; owners manage
CREATE POLICY "public resolves active short codes" ON public.nfc_short_codes
  FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "owner manages short codes" ON public.nfc_short_codes
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.digital_cards c WHERE c.id = card_id AND c.owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.digital_cards c WHERE c.id = card_id AND c.owner_user_id = auth.uid()));

-- interaction_events: anyone can insert (tracking pixel); only card owner reads
CREATE POLICY "anyone logs events" ON public.interaction_events
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "owner reads own events" ON public.interaction_events
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.digital_cards c WHERE c.id = card_id AND c.owner_user_id = auth.uid()));

-- analytics_daily: only card owner reads
CREATE POLICY "owner reads own analytics" ON public.analytics_daily
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.digital_cards c WHERE c.id = card_id AND c.owner_user_id = auth.uid()));
