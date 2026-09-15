ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS cover_mobile_url text,
  ADD COLUMN IF NOT EXISTS gallery_mobile text[] NOT NULL DEFAULT '{}'::text[];