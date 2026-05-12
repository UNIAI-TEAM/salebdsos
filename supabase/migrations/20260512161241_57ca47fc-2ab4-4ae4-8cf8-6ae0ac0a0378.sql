
-- Extend projects table with the missing real-estate fields
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS property_type text,
  ADD COLUMN IF NOT EXISTS sales_policy text,
  ADD COLUMN IF NOT EXISTS unit_highlights jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS brochure_url text,
  ADD COLUMN IF NOT EXISTS brochure_name text,
  ADD COLUMN IF NOT EXISTS cta_phone text,
  ADD COLUMN IF NOT EXISTS cta_form_enabled boolean NOT NULL DEFAULT true;

-- Junction: many-to-many cards <-> projects
CREATE TABLE IF NOT EXISTS public.card_projects (
  tenant_id uuid NOT NULL,
  card_id uuid NOT NULL,
  project_id uuid NOT NULL,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (card_id, project_id)
);
CREATE INDEX IF NOT EXISTS idx_card_projects_tenant ON public.card_projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_card_projects_project ON public.card_projects(project_id);

ALTER TABLE public.card_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "card_projects_select" ON public.card_projects
  FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY "card_projects_insert" ON public.card_projects
  FOR INSERT TO authenticated
  WITH CHECK (public.has_tenant_role_in(tenant_id, ARRAY['owner','admin','manager','agent']::app_role[]));
CREATE POLICY "card_projects_delete" ON public.card_projects
  FOR DELETE TO authenticated
  USING (public.has_tenant_role_in(tenant_id, ARRAY['owner','admin','manager','agent']::app_role[]));

-- Public read of published projects (so /c/:slug visitors can see attached projects)
CREATE POLICY "projects_public_read" ON public.projects
  FOR SELECT TO anon, authenticated
  USING (
    deleted_at IS NULL AND EXISTS (
      SELECT 1 FROM public.card_projects cp
      JOIN public.cards c ON c.id = cp.card_id
      WHERE cp.project_id = projects.id AND c.is_published = true
    )
  );

CREATE POLICY "card_projects_public_read" ON public.card_projects
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.cards c WHERE c.id = card_projects.card_id AND c.is_published = true));

-- Storage bucket for project gallery + brochures
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-assets', 'project-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "project-assets read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'project-assets');
CREATE POLICY "project-assets write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-assets'
    AND public.is_tenant_member(((storage.foldername(name))[1])::uuid)
  );
CREATE POLICY "project-assets update" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'project-assets'
    AND public.is_tenant_member(((storage.foldername(name))[1])::uuid)
  );
CREATE POLICY "project-assets delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'project-assets'
    AND public.has_tenant_role_in(((storage.foldername(name))[1])::uuid, ARRAY['owner','admin','manager']::app_role[])
  );
