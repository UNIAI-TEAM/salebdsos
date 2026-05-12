
INSERT INTO storage.buckets (id, name, public)
VALUES ('card-assets', 'card-assets', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "card-assets public read" ON storage.objects;
CREATE POLICY "card-assets public read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'card-assets');

DROP POLICY IF EXISTS "card-assets tenant insert" ON storage.objects;
CREATE POLICY "card-assets tenant insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'card-assets'
    AND public.is_tenant_member(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "card-assets tenant update" ON storage.objects;
CREATE POLICY "card-assets tenant update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'card-assets'
    AND public.is_tenant_member(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "card-assets tenant delete" ON storage.objects;
CREATE POLICY "card-assets tenant delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'card-assets'
    AND public.is_tenant_member(((storage.foldername(name))[1])::uuid)
  );

CREATE UNIQUE INDEX IF NOT EXISTS cards_slug_unique_idx ON public.cards(slug) WHERE deleted_at IS NULL;
