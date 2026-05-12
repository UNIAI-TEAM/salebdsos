CREATE TABLE public.chat_leads (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  phone text,
  role text,
  interest text,
  notes text,
  conversation jsonb,
  source text default 'landing_chatbot',
  created_at timestamptz not null default now()
);

ALTER TABLE public.chat_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert chat leads"
ON public.chat_leads FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can read chat leads"
ON public.chat_leads FOR SELECT TO authenticated
USING (true);